use personal_dashboard_lib::appearance::{
    AccentColor, AppearanceApplication, AppearancePersistence,
};
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
