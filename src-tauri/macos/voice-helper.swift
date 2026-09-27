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
    let reasonCode: String?
    let locales: [VoiceLocale]?
    let text: String?

    static func capabilities(_ locales: [VoiceLocale]) -> VoiceResponse {
        VoiceResponse(ok: true, available: true, reasonCode: nil, locales: locales, text: nil)
    }

    static func unavailable(_ reasonCode: String) -> VoiceResponse {
        VoiceResponse(ok: true, available: false, reasonCode: reasonCode, locales: [], text: nil)
    }

    static func transcription(_ text: String) -> VoiceResponse {
        VoiceResponse(ok: true, available: nil, reasonCode: nil, locales: nil, text: text)
    }

    static func failure(_ reasonCode: String) -> VoiceResponse {
        VoiceResponse(ok: false, available: nil, reasonCode: reasonCode, locales: nil, text: nil)
    }
}

@main
private struct VoiceHelper {
    static func main() async {
        let arguments = Array(CommandLine.arguments.dropFirst())
        let response: VoiceResponse

        if arguments == ["capabilities"] {
            response = await capabilities()
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
        guard #available(macOS 26.0, *) else {
            return .unavailable("requires_macos_26")
        }
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

    private static func transcribe(path: String, localeIdentifier: String) async -> VoiceResponse {
        guard #available(macOS 26.0, *) else {
            return .failure("requires_macos_26")
        }
        guard SpeechTranscriber.isAvailable else {
            return .failure("speech_unavailable")
        }

        let url = URL(fileURLWithPath: path)
        defer { try? FileManager.default.removeItem(at: url) }

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
}
