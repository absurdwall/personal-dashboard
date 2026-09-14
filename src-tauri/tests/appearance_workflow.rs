use personal_dashboard_lib::appearance::{
    AccentColor, AppearanceApplication, AppearanceImageLibrary, AppearancePersistence,
    BackgroundImageState, SelectedBackgroundImage,
};
use personal_dashboard_lib::interface_language::InterfaceLanguage;
use std::collections::{HashMap, VecDeque};
use std::sync::{Arc, Mutex};

#[derive(Clone, Default)]
struct MemoryAppearancePreferences {
    document: Arc<Mutex<Option<Vec<u8>>>>,
}

impl AppearancePersistence for MemoryAppearancePreferences {
    fn load(&self) -> Result<Option<Vec<u8>>, String> {
        Ok(self.document.lock().unwrap().clone())
    }

    fn save(&self, document: &[u8]) -> Result<(), String> {
        *self.document.lock().unwrap() = Some(document.to_vec());
        Ok(())
    }
}

#[derive(Clone, Default)]
struct MemoryImageLibrary {
    selections: Arc<Mutex<VecDeque<Result<Option<SelectedBackgroundImage>, String>>>>,
    owned: Arc<Mutex<HashMap<String, Vec<u8>>>>,
    remove_error: Arc<Mutex<Option<String>>>,
}

impl AppearanceImageLibrary for MemoryImageLibrary {
    fn select_image(
        &self,
        _interface_language: InterfaceLanguage,
    ) -> Result<Option<SelectedBackgroundImage>, String> {
        self.selections
            .lock()
            .unwrap()
            .pop_front()
            .unwrap_or(Ok(None))
    }

    fn load_owned(&self, file_name: &str) -> Result<Option<Vec<u8>>, String> {
        Ok(self.owned.lock().unwrap().get(file_name).cloned())
    }

    fn image_is_decodable(&self, bytes: &[u8]) -> bool {
        bytes == sample_png() || bytes.starts_with(include_bytes!("fixtures/background-sample.jpg"))
    }

    fn save_owned(&self, file_name: &str, document: &[u8]) -> Result<(), String> {
        self.owned
            .lock()
            .unwrap()
            .insert(file_name.to_owned(), document.to_vec());
        Ok(())
    }

    fn remove_owned(&self, file_name: &str) -> Result<(), String> {
        if let Some(error) = self.remove_error.lock().unwrap().clone() {
            return Err(error);
        }
        self.owned.lock().unwrap().remove(file_name);
        Ok(())
    }
}

fn sample_png() -> Vec<u8> {
    vec![
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44,
        0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x04, 0x00, 0x00, 0x00, 0xb5,
        0x1c, 0x0c, 0x02, 0x00, 0x00, 0x00, 0x0b, 0x49, 0x44, 0x41, 0x54, 0x78, 0xda, 0x63, 0x64,
        0xf8, 0x0f, 0x00, 0x01, 0x05, 0x01, 0x01, 0x27, 0x18, 0xe3, 0x66, 0x00, 0x00, 0x00, 0x00,
        0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
    ]
}

fn corrupted_png_with_intact_boundaries() -> Vec<u8> {
    let mut bytes = sample_png();
    bytes[46] ^= 0xff;
    bytes
}

#[test]
fn imported_background_uses_an_owned_copy_after_the_selected_source_is_gone() {
    let preferences = MemoryAppearancePreferences::default();
    let images = MemoryImageLibrary::default();
    images
        .selections
        .lock()
        .unwrap()
        .push_back(Ok(Some(SelectedBackgroundImage {
            bytes: sample_png(),
        })));
    let first_launch =
        AppearanceApplication::with_image_library(preferences.clone(), images.clone());

    let selected = first_launch
        .select_background_image(InterfaceLanguage::En)
        .expect("a valid selected image should be imported");
    images.selections.lock().unwrap().clear();
    let relaunched = AppearanceApplication::with_image_library(preferences, images);
    let loaded = relaunched
        .load()
        .expect("the app-owned image should survive relaunch");

    assert!(selected.changed);
    assert_eq!(
        selected.preferences.background_image_state,
        BackgroundImageState::Ready
    );
    assert_eq!(loaded.background_image_state, BackgroundImageState::Ready);
    assert!(loaded
        .background_image_url
        .as_deref()
        .is_some_and(|url| url.starts_with("data:image/png;base64,")));
}

#[test]
fn cancelling_or_rejecting_a_new_image_keeps_the_confirmed_background() {
    let preferences = MemoryAppearancePreferences::default();
    let images = MemoryImageLibrary::default();
    images.selections.lock().unwrap().extend([
        Ok(Some(SelectedBackgroundImage {
            bytes: sample_png(),
        })),
        Ok(None),
        Ok(Some(SelectedBackgroundImage {
            bytes: corrupted_png_with_intact_boundaries(),
        })),
    ]);
    let application = AppearanceApplication::with_image_library(preferences, images.clone());
    let imported = application
        .select_background_image(InterfaceLanguage::Zh)
        .unwrap();

    let cancelled = application
        .select_background_image(InterfaceLanguage::Zh)
        .unwrap();
    let rejected = application.select_background_image(InterfaceLanguage::Zh);
    let retained = application.load().unwrap();

    assert!(imported.changed);
    assert!(!cancelled.changed);
    assert_eq!(cancelled.preferences, imported.preferences);
    assert!(rejected.is_err());
    assert_eq!(retained, imported.preferences);
    assert_eq!(images.owned.lock().unwrap().len(), 1);
}

#[test]
fn a_damaged_owned_image_is_recoverable_and_removal_never_changes_the_source() {
    let preferences = MemoryAppearancePreferences::default();
    let images = MemoryImageLibrary::default();
    let original = sample_png();
    images
        .selections
        .lock()
        .unwrap()
        .push_back(Ok(Some(SelectedBackgroundImage {
            bytes: original.clone(),
        })));
    let application =
        AppearanceApplication::with_image_library(preferences.clone(), images.clone());
    application
        .select_background_image(InterfaceLanguage::En)
        .unwrap();
    let owned_name = images.owned.lock().unwrap().keys().next().unwrap().clone();
    images
        .owned
        .lock()
        .unwrap()
        .insert(owned_name, b"damaged".to_vec());

    let damaged = AppearanceApplication::with_image_library(preferences, images.clone())
        .load()
        .unwrap();
    let removed = application.remove_background_image().unwrap();

    assert_eq!(
        damaged.background_image_state,
        BackgroundImageState::Unavailable
    );
    assert_eq!(damaged.background_image_url, None);
    assert_eq!(removed.background_image_state, BackgroundImageState::None);
    assert!(images.owned.lock().unwrap().is_empty());
    assert_eq!(original, sample_png());
}

#[test]
fn an_untrusted_background_reference_never_targets_a_file_outside_app_owned_storage() {
    let preferences = MemoryAppearancePreferences::default();
    preferences
        .save(
            br#"{
  "schemaVersion": 1,
  "accentColor": "forest",
  "backgroundImage": {
    "fileName": "../user-source.png",
    "mediaType": "image/png"
  }
}"#,
        )
        .unwrap();
    let images = MemoryImageLibrary::default();
    images
        .owned
        .lock()
        .unwrap()
        .insert("../user-source.png".into(), sample_png());
    let application = AppearanceApplication::with_image_library(preferences, images.clone());

    let unavailable = application.load().unwrap();
    let removed = application.remove_background_image().unwrap();

    assert_eq!(
        unavailable.background_image_state,
        BackgroundImageState::Unavailable
    );
    assert_eq!(removed.background_image_state, BackgroundImageState::None);
    assert!(images
        .owned
        .lock()
        .unwrap()
        .contains_key("../user-source.png"));
}

#[test]
fn failed_app_owned_cleanup_stays_reachable_and_retries_on_relaunch() {
    let preferences = MemoryAppearancePreferences::default();
    let images = MemoryImageLibrary::default();
    images
        .selections
        .lock()
        .unwrap()
        .push_back(Ok(Some(SelectedBackgroundImage {
            bytes: sample_png(),
        })));
    let application =
        AppearanceApplication::with_image_library(preferences.clone(), images.clone());
    application
        .select_background_image(InterfaceLanguage::En)
        .unwrap();
    *images.remove_error.lock().unwrap() = Some("synthetic cleanup failure".into());

    let removed = application.remove_background_image().unwrap();

    assert_eq!(removed.background_image_state, BackgroundImageState::None);
    assert_eq!(
        removed.cleanup_warning.as_deref(),
        Some("synthetic cleanup failure")
    );
    assert_eq!(images.owned.lock().unwrap().len(), 1);
    assert!(String::from_utf8(preferences.load().unwrap().unwrap())
        .unwrap()
        .contains("pendingBackgroundCleanup"));

    *images.remove_error.lock().unwrap() = None;
    let relaunched = AppearanceApplication::with_image_library(preferences.clone(), images.clone())
        .load()
        .unwrap();

    assert_eq!(relaunched.cleanup_warning, None);
    assert!(images.owned.lock().unwrap().is_empty());
    assert!(String::from_utf8(preferences.load().unwrap().unwrap())
        .unwrap()
        .contains("\"pendingBackgroundCleanup\": []"));
}

#[test]
fn reimporting_pending_content_never_deletes_the_newly_active_copy() {
    let preferences = MemoryAppearancePreferences::default();
    let images = MemoryImageLibrary::default();
    images.selections.lock().unwrap().extend([
        Ok(Some(SelectedBackgroundImage {
            bytes: sample_png(),
        })),
        Ok(Some(SelectedBackgroundImage {
            bytes: sample_png(),
        })),
    ]);
    let application =
        AppearanceApplication::with_image_library(preferences.clone(), images.clone());
    application
        .select_background_image(InterfaceLanguage::En)
        .unwrap();
    *images.remove_error.lock().unwrap() = Some("synthetic cleanup failure".into());
    application.remove_background_image().unwrap();
    *images.remove_error.lock().unwrap() = None;

    let reimported = application
        .select_background_image(InterfaceLanguage::En)
        .unwrap();
    let relaunched = AppearanceApplication::with_image_library(preferences.clone(), images.clone())
        .load()
        .unwrap();

    assert_eq!(
        reimported.preferences.background_image_state,
        BackgroundImageState::Ready
    );
    assert_eq!(
        relaunched.background_image_state,
        BackgroundImageState::Ready
    );
    assert_eq!(images.owned.lock().unwrap().len(), 1);
    assert!(String::from_utf8(preferences.load().unwrap().unwrap())
        .unwrap()
        .contains("\"pendingBackgroundCleanup\": []"));
}

#[test]
fn restoring_defaults_clears_color_and_owned_image_without_touching_other_preferences() {
    let preferences = MemoryAppearancePreferences::default();
    let images = MemoryImageLibrary::default();
    let vault_record = Arc::new(Mutex::new(b"user-owned daily record".to_vec()));
    let language_preference = Arc::new(Mutex::new(InterfaceLanguage::En));
    images
        .selections
        .lock()
        .unwrap()
        .push_back(Ok(Some(SelectedBackgroundImage {
            bytes: sample_png(),
        })));
    let application =
        AppearanceApplication::with_image_library(preferences.clone(), images.clone());
    application.set_accent_color(AccentColor::Lilac).unwrap();
    application
        .select_background_image(InterfaceLanguage::En)
        .unwrap();

    let restored = application.restore_defaults().unwrap();

    assert_eq!(
        restored,
        personal_dashboard_lib::appearance::AppearancePreferences::default()
    );
    assert!(images.owned.lock().unwrap().is_empty());
    assert_eq!(&*vault_record.lock().unwrap(), b"user-owned daily record");
    assert_eq!(*language_preference.lock().unwrap(), InterfaceLanguage::En);
}

#[test]
fn selected_accent_color_survives_application_restart() {
    let preferences = MemoryAppearancePreferences::default();
    let first_launch = AppearanceApplication::new(preferences.clone());

    let changed = first_launch
        .set_accent_color(AccentColor::Blue)
        .expect("accent color should save");
    let relaunched = AppearanceApplication::new(preferences);

    assert_eq!(changed.accent_color, AccentColor::Blue);
    assert_eq!(
        relaunched.load().expect("saved preferences should load"),
        changed
    );
}

#[test]
fn restoring_default_appearance_does_not_touch_vault_owned_state() {
    let preferences = MemoryAppearancePreferences::default();
    let vault_record = Arc::new(Mutex::new(b"user-owned daily record".to_vec()));
    let application = AppearanceApplication::new(preferences.clone());
    application
        .set_accent_color(AccentColor::Clay)
        .expect("accent color should save");

    let restored = application
        .restore_defaults()
        .expect("default appearance should save");

    assert_eq!(restored.accent_color, AccentColor::Forest);
    assert_eq!(
        AppearanceApplication::new(preferences).load().unwrap(),
        restored
    );
    assert_eq!(&*vault_record.lock().unwrap(), b"user-owned daily record");
}

#[test]
fn jpeg_with_trailing_bytes_imports_and_survives_relaunch() {
    let preferences = MemoryAppearancePreferences::default();
    let images = MemoryImageLibrary::default();
    let mut bytes = include_bytes!("fixtures/background-sample.jpg").to_vec();
    bytes.extend_from_slice(b"\r\n");
    images.selections.lock().unwrap().push_back(Ok(Some(SelectedBackgroundImage { bytes })));
    let app = AppearanceApplication::with_image_library(preferences.clone(), images.clone());
    let selected = app.select_background_image(InterfaceLanguage::En)
        .expect("decodable JPEG with trailing bytes should import");
    assert_eq!(selected.preferences.background_image_state, BackgroundImageState::Ready);
    let loaded = AppearanceApplication::with_image_library(preferences, images).load().unwrap();
    assert_eq!(loaded.background_image_state, BackgroundImageState::Ready);
    assert!(loaded.background_image_url.unwrap().starts_with("data:image/jpeg;base64,"));
}
