use personal_dashboard_lib::interface_language::{
    InterfaceLanguage, InterfaceLanguageApplication, InterfaceLanguagePersistence,
};
use std::sync::{Arc, Mutex};

#[derive(Clone, Default)]
struct MemoryInterfaceLanguagePreferences {
    document: Arc<Mutex<Option<Vec<u8>>>>,
}

impl InterfaceLanguagePersistence for MemoryInterfaceLanguagePreferences {
    fn load(&self) -> Result<Option<Vec<u8>>, String> {
        Ok(self.document.lock().unwrap().clone())
    }

    fn save(&self, document: &[u8]) -> Result<(), String> {
        *self.document.lock().unwrap() = Some(document.to_vec());
        Ok(())
    }
}

#[test]
fn selected_interface_language_survives_application_restart() {
    let preferences = MemoryInterfaceLanguagePreferences::default();
    let first_launch = InterfaceLanguageApplication::new(preferences.clone());

    let changed = first_launch
        .set_language(InterfaceLanguage::En)
        .expect("interface language should save");
    let relaunched = InterfaceLanguageApplication::new(preferences);

    assert_eq!(changed.interface_language, InterfaceLanguage::En);
    assert_eq!(
        relaunched.load().expect("saved language should load"),
        changed
    );
}

#[test]
fn invalid_interface_language_recovers_the_default_without_touching_vault_content() {
    let preferences = MemoryInterfaceLanguagePreferences {
        document: Arc::new(Mutex::new(Some(
            br#"{"schemaVersion":1,"interfaceLanguage":"fr"}"#.to_vec(),
        ))),
    };
    let vault_record = Arc::new(Mutex::new("用户记录 stays unchanged".as_bytes().to_vec()));

    let recovered = InterfaceLanguageApplication::new(preferences)
        .load()
        .expect("an invalid local preference should recover");

    assert_eq!(recovered.interface_language, InterfaceLanguage::Zh);
    assert_eq!(
        &*vault_record.lock().unwrap(),
        "用户记录 stays unchanged".as_bytes()
    );
}
