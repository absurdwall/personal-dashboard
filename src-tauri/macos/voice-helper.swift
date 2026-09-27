import AVFAudio
import Darwin
import Foundation
import Speech

private struct VoiceLocale: Encodable {
    let id: String
    let displayName: String
}

private struct VoiceResponse: Encodable {
    let ok: Bool
    let available: Bool?
    let authorized: Bool?
    let reasonCode: String?
    let locales: [VoiceLocale]?
    let text: String?

    static func capabilities(_ locales: [VoiceLocale]) -> VoiceResponse {
        VoiceResponse(ok: true, available: true, authorized: nil, reasonCode: nil, locales: locales, text: nil)
    }

    static func unavailable(_ reasonCode: String) -> VoiceResponse {
        VoiceResponse(ok: true, available: false, authorized: nil, reasonCode: reasonCode, locales: [], text: nil)
    }

    static func authorization(_ authorized: Bool) -> VoiceResponse {
        VoiceResponse(ok: true, available: nil, authorized: authorized, reasonCode: nil, locales: nil, text: nil)
    }

    static func transcription(_ text: String) -> VoiceResponse {
        VoiceResponse(ok: true, available: nil, authorized: nil, reasonCode: nil, locales: nil, text: text)
    }

    static func failure(_ reasonCode: String) -> VoiceResponse {
        VoiceResponse(ok: false, available: nil, authorized: nil, reasonCode: reasonCode, locales: nil, text: nil)
    }
}

@main
private struct VoiceHelper {
    static func main() async {
        let arguments = Array(CommandLine.arguments.dropFirst())
        let response: VoiceResponse

        if arguments == ["capabilities"] {
            response = await capabilities()
        } else if arguments == ["authorize"] {
            response = .authorization(await requestSpeechAuthorization())
        } else if arguments.count == 3, arguments[0] == "transcribe" {
            response = await transcribe(path: arguments[1], localeIdentifier: arguments[2])
        } else {
            response = .failure("invalid_request")
        }

        do {
            let encoder = JSONEncoder()
            encoder.outputFormatting = [.sortedKeys]
            var data = try encoder.encode(response)
            data.append(0x0a)
            FileHandle.standardOutput.write(data)
            exit(response.ok ? 0 : 1)
        } catch {
            FileHandle.standardError.write(Data("voice response encoding failed\n".utf8))
            exit(2)
        }
    }

    private static func capabilities() async -> VoiceResponse {
        if #available(macOS 26.0, *) {
            guard SpeechTranscriber.isAvailable else {
                return .unavailable("speech_unavailable")
            }

            let installedLocales = await SpeechTranscriber.installedLocales
            let locales = installedLocales.map { (locale: Locale) -> VoiceLocale in
                    let identifier = locale.identifier(.bcp47)
                    return VoiceLocale(
                        id: identifier,
                        displayName: Locale.current.localizedString(forIdentifier: identifier) ?? identifier
                    )
                }
                .sorted { $0.id.localizedStandardCompare($1.id) == .orderedAscending }

            guard !locales.isEmpty else {
                return .unavailable("no_installed_model")
            }
            return .capabilities(locales)
        }

        let locales = onDeviceRecognitionLocales()
        guard !locales.isEmpty else {
            return .unavailable("no_installed_model")
        }
        return .capabilities(locales)
    }

    private static func transcribe(path: String, localeIdentifier: String) async -> VoiceResponse {
        let url = URL(fileURLWithPath: path)
        defer { try? FileManager.default.removeItem(at: url) }

        if #available(macOS 26.0, *) {
            return await transcribeWithSpeechAnalyzer(url: url, localeIdentifier: localeIdentifier)
        }
        return await transcribeWithSystemRecognizer(url: url, localeIdentifier: localeIdentifier)
    }

    @available(macOS 26.0, *)
    private static func transcribeWithSpeechAnalyzer(
        url: URL,
        localeIdentifier: String
    ) async -> VoiceResponse {
        guard SpeechTranscriber.isAvailable else {
            return .failure("speech_unavailable")
        }

        let installedLocales = await SpeechTranscriber.installedLocales
        guard let locale = installedLocales.first(where: {
            $0.identifier(.bcp47).caseInsensitiveCompare(localeIdentifier) == .orderedSame
        }) else {
            return .failure("locale_not_installed")
        }

        do {
            let audioFile = try AVAudioFile(forReading: url)
            // Keep the captured audio only for the recognition process lifetime.
            try? FileManager.default.removeItem(at: url)

            let transcriber = SpeechTranscriber(locale: locale, preset: .transcription)
            async let transcript = try await transcriber.results.reduce("") { partial, result in
                partial + String(result.text.characters)
            }

            let analyzer = SpeechAnalyzer(modules: [transcriber])
            if let lastSample = try await analyzer.analyzeSequence(from: audioFile) {
                try await analyzer.finalizeAndFinish(through: lastSample)
            } else {
                await analyzer.cancelAndFinishNow()
            }

            let text = try await transcript
            return .transcription(text)
        } catch {
            return .failure("recognition_failed")
        }
    }

    private static func onDeviceRecognitionLocales() -> [VoiceLocale] {
        SFSpeechRecognizer.supportedLocales()
            .compactMap { locale -> VoiceLocale? in
                guard let recognizer = SFSpeechRecognizer(locale: locale),
                      recognizer.supportsOnDeviceRecognition else {
                    return nil
                }
                let identifier = locale.identifier
                return VoiceLocale(
                    id: identifier,
                    displayName: Locale.current.localizedString(forIdentifier: identifier) ?? identifier
                )
            }
            .sorted { $0.id.localizedStandardCompare($1.id) == .orderedAscending }
    }

    private static func requestSpeechAuthorization() async -> Bool {
        if #available(macOS 26.0, *) {
            return true
        }
        switch SFSpeechRecognizer.authorizationStatus() {
        case .authorized:
            return true
        case .notDetermined:
            return await withCheckedContinuation { continuation in
                SFSpeechRecognizer.requestAuthorization { status in
                    continuation.resume(returning: status == .authorized)
                }
            }
        case .denied, .restricted:
            return false
        @unknown default:
            return false
        }
    }

    private static func transcribeWithSystemRecognizer(
        url: URL,
        localeIdentifier: String
    ) async -> VoiceResponse {
        guard SFSpeechRecognizer.authorizationStatus() == .authorized else {
            return .failure("speech_authorization_required")
        }
        guard let locale = SFSpeechRecognizer.supportedLocales().first(where: {
            $0.identifier.caseInsensitiveCompare(localeIdentifier) == .orderedSame
        }), let recognizer = SFSpeechRecognizer(locale: locale) else {
            return .failure("locale_not_installed")
        }
        guard recognizer.supportsOnDeviceRecognition else {
            return .failure("on_device_recognition_unavailable")
        }
        guard recognizer.isAvailable else {
            return .failure("speech_unavailable")
        }

        let request = SFSpeechURLRecognitionRequest(url: url)
        request.requiresOnDeviceRecognition = true
        request.shouldReportPartialResults = false
        request.taskHint = .dictation
        var task: SFSpeechRecognitionTask?
        var completed = false
        let response = await withCheckedContinuation { continuation in
            task = recognizer.recognitionTask(with: request) { result, error in
                if error != nil {
                    guard !completed else { return }
                    completed = true
                    continuation.resume(returning: VoiceResponse.failure("recognition_failed"))
                } else if let result, result.isFinal {
                    guard !completed else { return }
                    completed = true
                    continuation.resume(returning: VoiceResponse.transcription(result.bestTranscription.formattedString))
                }
            }
        }
        withExtendedLifetime(task) {}
        return response
    }
}
