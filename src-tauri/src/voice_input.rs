use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::fs::{self, OpenOptions};
use std::io::Write;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Arc;

const MAX_AUDIO_BYTES: usize = 12_000_000;
const MAX_TRANSCRIPTION_CHARACTERS: usize = 12_000;
static TEMP_FILE_SEQUENCE: AtomicU64 = AtomicU64::new(1);

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VoiceLocaleView {
    pub id: String,
    pub display_name: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VoiceInputCapabilitiesView {
    pub available: bool,
    pub reason_code: Option<String>,
    pub locales: Vec<VoiceLocaleView>,
}

impl VoiceInputCapabilitiesView {
    fn unavailable(reason_code: impl Into<String>) -> Self {
        Self {
            available: false,
            reason_code: Some(reason_code.into()),
            locales: Vec::new(),
        }
    }
}

pub trait VoiceRecognitionRuntime: Send + Sync {
    fn capabilities(&self) -> Result<VoiceInputCapabilitiesView, String>;
    fn authorize(&self) -> Result<bool, String> {
        Ok(true)
    }
    fn transcribe(&self, audio_file: &Path, locale: &str) -> Result<String, String>;
}

#[derive(Clone)]
pub struct VoiceInputApplication {
    runtime: Arc<dyn VoiceRecognitionRuntime>,
}

impl VoiceInputApplication {
    pub fn new_local(helper_path: Option<PathBuf>) -> Self {
        Self {
            runtime: Arc::new(LocalSpeechRuntime { helper_path }),
        }
    }

    pub fn with_runtime(runtime: Arc<dyn VoiceRecognitionRuntime>) -> Self {
        Self { runtime }
    }

    pub fn capabilities(&self) -> VoiceInputCapabilitiesView {
        match self.runtime.capabilities() {
            Ok(capabilities) => capabilities,
            Err(_) => VoiceInputCapabilitiesView::unavailable("runtime_unavailable"),
        }
    }

    pub fn authorize(&self) -> Result<bool, String> {
        self.runtime.authorize()
    }

    pub fn transcribe(
        &self,
        audio: &[u8],
        mime_type: &str,
        locale: &str,
    ) -> Result<String, String> {
        if audio.is_empty() {
            return Err("empty_audio".into());
        }
        if audio.len() > MAX_AUDIO_BYTES {
            return Err("audio_too_large".into());
        }
        if !mime_type.to_ascii_lowercase().starts_with("audio/mp4") {
            return Err("unsupported_audio_format".into());
        }
        if !valid_locale_identifier(locale) {
            return Err("invalid_locale".into());
        }

        let capabilities = self
            .runtime
            .capabilities()
            .map_err(|_| "runtime_unavailable".to_string())?;
        if !capabilities.available {
            return Err(capabilities
                .reason_code
                .unwrap_or_else(|| "runtime_unavailable".into()));
        }
        if !capabilities
            .locales
            .iter()
            .any(|installed| installed.id == locale)
        {
            return Err("locale_not_installed".into());
        }

        let audio_file = TemporaryAudioFile::write(audio)?;
        let transcription = self.runtime.transcribe(audio_file.path(), locale)?;
        let transcription = transcription.trim();
        if transcription.is_empty() {
            return Err("empty_transcription".into());
        }
        if transcription.chars().count() > MAX_TRANSCRIPTION_CHARACTERS {
            return Err("transcription_too_large".into());
        }
        Ok(transcription.to_owned())
    }
}

struct TemporaryAudioFile {
    path: PathBuf,
}

impl TemporaryAudioFile {
    fn write(audio: &[u8]) -> Result<Self, String> {
        let directory = std::env::temp_dir();
        for _ in 0..8 {
            let sequence = TEMP_FILE_SEQUENCE.fetch_add(1, Ordering::Relaxed);
            let path = directory.join(format!(
                "personal-dashboard-voice-{}-{sequence}.m4a",
                std::process::id()
            ));
            let mut options = OpenOptions::new();
            options.write(true).create_new(true);
            #[cfg(unix)]
            {
                use std::os::unix::fs::OpenOptionsExt;
                options.mode(0o600);
            }
            match options.open(&path) {
                Ok(mut file) => {
                    if let Err(error) = file.write_all(audio) {
                        drop(file);
                        let _ = fs::remove_file(&path);
                        return Err(format!("audio_write_failed: {error}"));
                    }
                    return Ok(Self { path });
                }
                Err(error) if error.kind() == std::io::ErrorKind::AlreadyExists => continue,
                Err(error) => return Err(format!("audio_write_failed: {error}")),
            }
        }
        Err("audio_write_failed: could not allocate a temporary file".into())
    }

    fn path(&self) -> &Path {
        &self.path
    }
}

impl Drop for TemporaryAudioFile {
    fn drop(&mut self) {
        let _ = fs::remove_file(&self.path);
    }
}

fn valid_locale_identifier(locale: &str) -> bool {
    !locale.is_empty()
        && locale
            .chars()
            .all(|character| character.is_ascii_alphanumeric() || character == '-')
}

struct LocalSpeechRuntime {
    helper_path: Option<PathBuf>,
}

impl LocalSpeechRuntime {
    fn invoke(&self, args: &[&str]) -> Result<Value, String> {
        let helper_path = self
            .helper_path
            .as_ref()
            .filter(|path| path.is_file())
            .ok_or_else(|| "voice_helper_unavailable".to_string())?;
        let output = Command::new(helper_path)
            .args(args)
            .output()
            .map_err(|_| "voice_helper_unavailable".to_string())?;
        if !output.status.success() {
            return Err("voice_helper_failed".into());
        }
        serde_json::from_slice(&output.stdout).map_err(|_| "voice_helper_invalid_response".into())
    }
}

impl VoiceRecognitionRuntime for LocalSpeechRuntime {
    fn capabilities(&self) -> Result<VoiceInputCapabilitiesView, String> {
        let response = self.invoke(&["capabilities"])?;
        serde_json::from_value(response).map_err(|_| "voice_helper_invalid_response".into())
    }

    fn authorize(&self) -> Result<bool, String> {
        let response = self.invoke(&["authorize"])?;
        response
            .get("authorized")
            .and_then(Value::as_bool)
            .ok_or_else(|| "voice_helper_invalid_response".into())
    }

    fn transcribe(&self, audio_file: &Path, locale: &str) -> Result<String, String> {
        let audio_path = audio_file
            .to_str()
            .ok_or_else(|| "invalid_audio_path".to_string())?;
        let response = self.invoke(&["transcribe", audio_path, locale])?;
        response
            .get("text")
            .and_then(Value::as_str)
            .map(str::to_owned)
            .ok_or_else(|| {
                response
                    .get("reasonCode")
                    .and_then(Value::as_str)
                    .unwrap_or("transcription_failed")
                    .to_string()
            })
    }
}

#[cfg(test)]
mod tests {
    use super::{
        VoiceInputApplication, VoiceInputCapabilitiesView, VoiceLocaleView,
        VoiceRecognitionRuntime, MAX_AUDIO_BYTES,
    };
    use std::fs;
    use std::path::Path;
    use std::sync::{Arc, Mutex};

    struct FakeSpeechRuntime {
        capabilities: VoiceInputCapabilitiesView,
        observed_audio: Mutex<Vec<u8>>,
        observed_locale: Mutex<Option<String>>,
        fail_transcription: bool,
    }

    impl FakeSpeechRuntime {
        fn installed() -> Self {
            Self {
                capabilities: VoiceInputCapabilitiesView {
                    available: true,
                    reason_code: None,
                    locales: vec![VoiceLocaleView {
                        id: "en-US".into(),
                        display_name: "English (United States)".into(),
                    }],
                },
                observed_audio: Mutex::new(Vec::new()),
                observed_locale: Mutex::new(None),
                fail_transcription: false,
            }
        }

        fn with_failure() -> Self {
            Self {
                fail_transcription: true,
                ..Self::installed()
            }
        }
    }

    impl VoiceRecognitionRuntime for FakeSpeechRuntime {
        fn capabilities(&self) -> Result<VoiceInputCapabilitiesView, String> {
            Ok(self.capabilities.clone())
        }

        fn transcribe(&self, audio_file: &Path, locale: &str) -> Result<String, String> {
            *self.observed_audio.lock().unwrap() = fs::read(audio_file).unwrap();
            *self.observed_locale.lock().unwrap() = Some(locale.into());
            if self.fail_transcription {
                Err("synthetic_recognition_failure".into())
            } else {
                Ok("  synthetic recognized words  ".into())
            }
        }
    }

    fn application(runtime: FakeSpeechRuntime) -> VoiceInputApplication {
        VoiceInputApplication::with_runtime(Arc::new(runtime))
    }

    #[test]
    fn transcription_uses_an_installed_locale_and_removes_the_temporary_recording() {
        let runtime = Arc::new(FakeSpeechRuntime::installed());
        let application = VoiceInputApplication::with_runtime(runtime.clone());
        let transcription = application
            .transcribe(
                b"synthetic audio bytes",
                "audio/mp4; codecs=mp4a.40.2",
                "en-US",
            )
            .unwrap();

        assert_eq!(transcription, "synthetic recognized words");
        assert_eq!(
            runtime.observed_audio.lock().unwrap().as_slice(),
            b"synthetic audio bytes"
        );
        assert_eq!(
            runtime.observed_locale.lock().unwrap().as_deref(),
            Some("en-US")
        );
    }

    #[test]
    fn uninstalled_locales_are_rejected_before_audio_is_written_or_recognized() {
        let runtime = Arc::new(FakeSpeechRuntime::installed());
        let application = VoiceInputApplication::with_runtime(runtime.clone());
        let error = application
            .transcribe(b"synthetic audio bytes", "audio/mp4", "zh-CN")
            .unwrap_err();

        assert_eq!(error, "locale_not_installed");
        assert!(runtime.observed_audio.lock().unwrap().is_empty());
        assert_eq!(runtime.observed_locale.lock().unwrap().as_deref(), None);
    }

    #[test]
    fn unsupported_audio_and_invalid_locale_are_rejected_without_a_runtime_call() {
        let runtime = Arc::new(FakeSpeechRuntime::installed());
        let application = VoiceInputApplication::with_runtime(runtime.clone());

        assert_eq!(
            application
                .transcribe(b"synthetic audio bytes", "audio/webm", "en-US")
                .unwrap_err(),
            "unsupported_audio_format"
        );
        assert_eq!(
            application
                .transcribe(b"synthetic audio bytes", "audio/mp4", "../../en-US")
                .unwrap_err(),
            "invalid_locale"
        );
        assert!(runtime.observed_audio.lock().unwrap().is_empty());
    }

    #[test]
    fn empty_and_oversized_recordings_are_rejected() {
        let application = application(FakeSpeechRuntime::installed());
        assert_eq!(
            application
                .transcribe(&[], "audio/mp4", "en-US")
                .unwrap_err(),
            "empty_audio"
        );
        assert_eq!(
            application
                .transcribe(&vec![0; MAX_AUDIO_BYTES + 1], "audio/mp4", "en-US")
                .unwrap_err(),
            "audio_too_large"
        );
    }

    #[test]
    fn recognition_failure_removes_the_temporary_recording() {
        let runtime = Arc::new(FakeSpeechRuntime::with_failure());
        let application = VoiceInputApplication::with_runtime(runtime.clone());
        let before = voice_file_names();

        assert_eq!(
            application
                .transcribe(b"synthetic audio bytes", "audio/mp4", "en-US")
                .unwrap_err(),
            "synthetic_recognition_failure"
        );
        assert_eq!(voice_file_names(), before);
    }

    fn voice_file_names() -> Vec<String> {
        let prefix = format!("personal-dashboard-voice-{}-", std::process::id());
        fs::read_dir(std::env::temp_dir())
            .unwrap()
            .filter_map(Result::ok)
            .filter_map(|entry| {
                let file_name = entry.file_name().to_string_lossy().into_owned();
                file_name.starts_with(&prefix).then_some(file_name)
            })
            .collect()
    }

    #[test]
    fn capability_errors_are_reported_as_unavailable_without_leaking_helper_details() {
        struct BrokenRuntime;
        impl VoiceRecognitionRuntime for BrokenRuntime {
            fn capabilities(&self) -> Result<VoiceInputCapabilitiesView, String> {
                Err("private helper path must not be shown".into())
            }

            fn transcribe(&self, _audio_file: &Path, _locale: &str) -> Result<String, String> {
                unreachable!()
            }
        }

        let application = VoiceInputApplication::with_runtime(Arc::new(BrokenRuntime));
        let capabilities = application.capabilities();
        assert!(!capabilities.available);
        assert_eq!(
            capabilities.reason_code.as_deref(),
            Some("runtime_unavailable")
        );
        assert!(capabilities.locales.is_empty());
    }
}
