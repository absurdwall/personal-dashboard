use crate::interface_language::InterfaceLanguage;
use serde::{Deserialize, Serialize};

const APPEARANCE_SCHEMA_VERSION: u32 = 1;
pub(crate) const MAX_BACKGROUND_IMAGE_BYTES: usize = 20 * 1024 * 1024;

#[derive(Debug, Clone, Copy, Default, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "kebab-case")]
pub enum AccentColor {
    #[default]
    Forest,
    Blue,
    Clay,
    Lilac,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AppearancePreferences {
    pub accent_color: AccentColor,
    pub background_image_state: BackgroundImageState,
    pub background_image_url: Option<String>,
    pub cleanup_warning: Option<String>,
}

impl Default for AppearancePreferences {
    fn default() -> Self {
        Self {
            accent_color: AccentColor::Forest,
            background_image_state: BackgroundImageState::None,
            background_image_url: None,
            cleanup_warning: None,
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum BackgroundImageState {
    None,
    Ready,
    Unavailable,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AppearanceSelectionResult {
    pub preferences: AppearancePreferences,
    pub changed: bool,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SelectedBackgroundImage {
    pub bytes: Vec<u8>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct OwnedBackgroundImage {
    file_name: String,
    media_type: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct AppearanceDocument {
    schema_version: u32,
    accent_color: AccentColor,
    #[serde(default)]
    background_image: Option<OwnedBackgroundImage>,
    #[serde(default)]
    pending_background_cleanup: Vec<String>,
}

pub trait AppearancePersistence {
    fn load(&self) -> Result<Option<Vec<u8>>, String>;
    fn save(&self, document: &[u8]) -> Result<(), String>;
}

pub trait AppearanceImageLibrary {
    fn select_image(
        &self,
        interface_language: InterfaceLanguage,
    ) -> Result<Option<SelectedBackgroundImage>, String>;
    fn load_owned(&self, file_name: &str) -> Result<Option<Vec<u8>>, String>;
    fn image_is_decodable(&self, bytes: &[u8]) -> bool;
    fn save_owned(&self, file_name: &str, document: &[u8]) -> Result<(), String>;
    fn remove_owned(&self, file_name: &str) -> Result<(), String>;
}

pub struct NoAppearanceImageLibrary;

impl AppearanceImageLibrary for NoAppearanceImageLibrary {
    fn select_image(
        &self,
        _interface_language: InterfaceLanguage,
    ) -> Result<Option<SelectedBackgroundImage>, String> {
        Err("Background image selection is unavailable.".into())
    }

    fn load_owned(&self, _file_name: &str) -> Result<Option<Vec<u8>>, String> {
        Ok(None)
    }

    fn image_is_decodable(&self, _bytes: &[u8]) -> bool {
        false
    }

    fn save_owned(&self, _file_name: &str, _document: &[u8]) -> Result<(), String> {
        Err("Background image storage is unavailable.".into())
    }

    fn remove_owned(&self, _file_name: &str) -> Result<(), String> {
        Ok(())
    }
}

pub struct AppearanceApplication<P, I = NoAppearanceImageLibrary> {
    persistence: P,
    image_library: I,
}

impl<P> AppearanceApplication<P, NoAppearanceImageLibrary>
where
    P: AppearancePersistence,
{
    pub fn new(persistence: P) -> Self {
        Self {
            persistence,
            image_library: NoAppearanceImageLibrary,
        }
    }
}

impl<P, I> AppearanceApplication<P, I>
where
    P: AppearancePersistence,
    I: AppearanceImageLibrary,
{
    pub fn with_image_library(persistence: P, image_library: I) -> Self {
        Self {
            persistence,
            image_library,
        }
    }

    pub fn load(&self) -> Result<AppearancePreferences, String> {
        let mut document = self.load_document()?;
        let cleanup_warning = self.retry_pending_cleanup(&mut document);
        self.project(&document, cleanup_warning)
    }

    pub fn set_accent_color(
        &self,
        accent_color: AccentColor,
    ) -> Result<AppearancePreferences, String> {
        let mut document = self.load_document()?;
        document.accent_color = accent_color;
        self.commit_with_cleanup(&mut document)
    }

    pub fn restore_defaults(&self) -> Result<AppearancePreferences, String> {
        let mut document = self.load_document()?;
        let previous = document.background_image.take();
        document.accent_color = AccentColor::Forest;
        self.queue_previous_cleanup(&mut document, previous.as_ref(), None);
        self.commit_with_cleanup(&mut document)
    }

    pub fn select_background_image(
        &self,
        interface_language: InterfaceLanguage,
    ) -> Result<AppearanceSelectionResult, String> {
        let Some(selected) = self.image_library.select_image(interface_language)? else {
            return Ok(AppearanceSelectionResult {
                preferences: self.load()?,
                changed: false,
            });
        };
        let image = validated_image(&selected.bytes)?;
        if !self.image_library.image_is_decodable(&selected.bytes) {
            return Err("The selected background image could not be decoded.".into());
        }
        let file_name = owned_file_name(&selected.bytes, image.extension);
        let mut document = self.load_document()?;
        self.image_library
            .save_owned(&file_name, &selected.bytes)
            .map_err(|error| format!("Could not import the background image: {error}"))?;
        let previous = document.background_image.replace(OwnedBackgroundImage {
            file_name: file_name.clone(),
            media_type: image.media_type.into(),
        });
        self.queue_previous_cleanup(&mut document, previous.as_ref(), Some(&file_name));
        document
            .pending_background_cleanup
            .retain(|pending| pending != &file_name);
        if let Err(error) = self.save(&document) {
            if previous.as_ref().map(|item| item.file_name.as_str()) != Some(file_name.as_str()) {
                let _ = self.image_library.remove_owned(&file_name);
            }
            return Err(error);
        }
        let cleanup_warning = self.retry_pending_cleanup(&mut document);
        Ok(AppearanceSelectionResult {
            preferences: self.project(&document, cleanup_warning)?,
            changed: true,
        })
    }

    pub fn remove_background_image(&self) -> Result<AppearancePreferences, String> {
        let mut document = self.load_document()?;
        let previous = document.background_image.take();
        self.queue_previous_cleanup(&mut document, previous.as_ref(), None);
        self.commit_with_cleanup(&mut document)
    }

    fn load_document(&self) -> Result<AppearanceDocument, String> {
        let Some(document) = self.persistence.load()? else {
            return Ok(AppearanceDocument::default());
        };
        let document: AppearanceDocument = serde_json::from_slice(&document)
            .map_err(|error| format!("The local appearance preference is invalid: {error}"))?;
        if document.schema_version != APPEARANCE_SCHEMA_VERSION {
            return Err(
                "The local appearance preference uses an unsupported schema version.".into(),
            );
        }
        Ok(document)
    }

    fn project(
        &self,
        document: &AppearanceDocument,
        cleanup_warning: Option<String>,
    ) -> Result<AppearancePreferences, String> {
        let Some(background) = &document.background_image else {
            return Ok(AppearancePreferences {
                accent_color: document.accent_color,
                background_image_state: BackgroundImageState::None,
                background_image_url: None,
                cleanup_warning,
            });
        };
        if !owned_background_file_name_is_safe(&background.file_name) {
            return Ok(AppearancePreferences {
                accent_color: document.accent_color,
                background_image_state: BackgroundImageState::Unavailable,
                background_image_url: None,
                cleanup_warning,
            });
        }
        let bytes = match self.image_library.load_owned(&background.file_name) {
            Ok(Some(bytes)) => bytes,
            Ok(None) | Err(_) => {
                return Ok(AppearancePreferences {
                    accent_color: document.accent_color,
                    background_image_state: BackgroundImageState::Unavailable,
                    background_image_url: None,
                    cleanup_warning,
                })
            }
        };
        let Ok(image) = validated_image(&bytes) else {
            return Ok(AppearancePreferences {
                accent_color: document.accent_color,
                background_image_state: BackgroundImageState::Unavailable,
                background_image_url: None,
                cleanup_warning,
            });
        };
        if image.media_type != background.media_type {
            return Ok(AppearancePreferences {
                accent_color: document.accent_color,
                background_image_state: BackgroundImageState::Unavailable,
                background_image_url: None,
                cleanup_warning,
            });
        }
        if !self.image_library.image_is_decodable(&bytes) {
            return Ok(AppearancePreferences {
                accent_color: document.accent_color,
                background_image_state: BackgroundImageState::Unavailable,
                background_image_url: None,
                cleanup_warning,
            });
        }
        Ok(AppearancePreferences {
            accent_color: document.accent_color,
            background_image_state: BackgroundImageState::Ready,
            background_image_url: Some(format!(
                "data:{};base64,{}",
                image.media_type,
                base64(&bytes)
            )),
            cleanup_warning,
        })
    }

    fn queue_previous_cleanup(
        &self,
        document: &mut AppearanceDocument,
        previous: Option<&OwnedBackgroundImage>,
        retained: Option<&str>,
    ) {
        if let Some(previous) = previous.filter(|item| {
            Some(item.file_name.as_str()) != retained
                && owned_background_file_name_is_safe(&item.file_name)
        }) {
            if !document
                .pending_background_cleanup
                .contains(&previous.file_name)
            {
                document
                    .pending_background_cleanup
                    .push(previous.file_name.clone());
            }
        }
    }

    fn commit_with_cleanup(
        &self,
        document: &mut AppearanceDocument,
    ) -> Result<AppearancePreferences, String> {
        self.save(document)?;
        let cleanup_warning = self.retry_pending_cleanup(document);
        self.project(document, cleanup_warning)
    }

    fn retry_pending_cleanup(&self, document: &mut AppearanceDocument) -> Option<String> {
        let previous_pending = document.pending_background_cleanup.clone();
        let active_file_name = document
            .background_image
            .as_ref()
            .map(|image| image.file_name.as_str());
        let mut remaining = Vec::new();
        let mut warnings = Vec::new();
        for file_name in previous_pending.iter().filter(|file_name| {
            owned_background_file_name_is_safe(file_name)
                && Some(file_name.as_str()) != active_file_name
        }) {
            if let Err(error) = self.image_library.remove_owned(file_name) {
                remaining.push(file_name.clone());
                warnings.push(error);
            }
        }
        document.pending_background_cleanup = remaining;
        if document.pending_background_cleanup != previous_pending {
            if let Err(error) = self.save(document) {
                warnings.push(format!(
                    "Could not update the pending background-image cleanup record: {error}"
                ));
            }
        }
        (!warnings.is_empty()).then(|| warnings.join(" "))
    }

    fn save(&self, preferences: &AppearanceDocument) -> Result<(), String> {
        let document = serde_json::to_vec_pretty(preferences).map_err(|error| {
            format!("Could not encode the local appearance preference: {error}")
        })?;
        self.persistence.save(&document)
    }
}

impl Default for AppearanceDocument {
    fn default() -> Self {
        Self {
            schema_version: APPEARANCE_SCHEMA_VERSION,
            accent_color: AccentColor::Forest,
            background_image: None,
            pending_background_cleanup: Vec::new(),
        }
    }
}

struct ValidatedImage {
    media_type: &'static str,
    extension: &'static str,
}

fn validated_image(bytes: &[u8]) -> Result<ValidatedImage, String> {
    if bytes.is_empty() || bytes.len() > MAX_BACKGROUND_IMAGE_BYTES {
        return Err("The selected background image is empty or larger than 20 MB.".into());
    }
    if bytes.starts_with(b"\x89PNG\r\n\x1a\n") && bytes.ends_with(b"IEND\xaeB\x60\x82") {
        return Ok(ValidatedImage {
            media_type: "image/png",
            extension: "png",
        });
    }
    if bytes.starts_with(&[0xff, 0xd8, 0xff]) && bytes.ends_with(&[0xff, 0xd9]) {
        return Ok(ValidatedImage {
            media_type: "image/jpeg",
            extension: "jpg",
        });
    }
    if (bytes.starts_with(b"GIF87a") || bytes.starts_with(b"GIF89a")) && bytes.ends_with(&[0x3b]) {
        return Ok(ValidatedImage {
            media_type: "image/gif",
            extension: "gif",
        });
    }
    if bytes.len() >= 12 && bytes.starts_with(b"RIFF") && &bytes[8..12] == b"WEBP" {
        return Ok(ValidatedImage {
            media_type: "image/webp",
            extension: "webp",
        });
    }
    Err("The selected background image is not a supported PNG, JPEG, GIF, or WebP file.".into())
}

fn owned_file_name(bytes: &[u8], extension: &str) -> String {
    let hash = bytes.iter().fold(0xcbf29ce484222325u64, |hash, byte| {
        (hash ^ u64::from(*byte)).wrapping_mul(0x100000001b3)
    });
    format!("background-{hash:016x}.{extension}")
}

pub(crate) fn owned_background_file_name_is_safe(file_name: &str) -> bool {
    let Some((hash, extension)) = file_name
        .strip_prefix("background-")
        .and_then(|name| name.rsplit_once('.'))
    else {
        return false;
    };
    hash.len() == 16
        && hash.bytes().all(|byte| byte.is_ascii_hexdigit())
        && matches!(extension, "png" | "jpg" | "gif" | "webp")
}

fn base64(bytes: &[u8]) -> String {
    const ALPHABET: &[u8; 64] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let mut encoded = String::with_capacity(bytes.len().div_ceil(3) * 4);
    for chunk in bytes.chunks(3) {
        let first = chunk[0];
        let second = *chunk.get(1).unwrap_or(&0);
        let third = *chunk.get(2).unwrap_or(&0);
        encoded.push(ALPHABET[(first >> 2) as usize] as char);
        encoded.push(ALPHABET[(((first & 0x03) << 4) | (second >> 4)) as usize] as char);
        encoded.push(if chunk.len() > 1 {
            ALPHABET[(((second & 0x0f) << 2) | (third >> 6)) as usize] as char
        } else {
            '='
        });
        encoded.push(if chunk.len() > 2 {
            ALPHABET[(third & 0x3f) as usize] as char
        } else {
            '='
        });
    }
    encoded
}
