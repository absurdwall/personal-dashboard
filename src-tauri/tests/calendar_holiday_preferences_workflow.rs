use personal_dashboard_lib::calendar_holidays::{
    CalendarHolidayPreferences, CalendarHolidayPreferencesApplication,
    CalendarHolidayPreferencesPersistence,
};
use std::sync::{Arc, Mutex};

#[derive(Clone, Default)]
struct MemoryCalendarHolidayPreferences {
    document: Arc<Mutex<Option<Vec<u8>>>>,
}

impl CalendarHolidayPreferencesPersistence for MemoryCalendarHolidayPreferences {
    fn load(&self) -> Result<Option<Vec<u8>>, String> {
        Ok(self.document.lock().unwrap().clone())
    }

    fn save(&self, document: &[u8]) -> Result<(), String> {
        *self.document.lock().unwrap() = Some(document.to_vec());
        Ok(())
    }
}

#[test]
fn holiday_visibility_defaults_on_and_survives_application_restart() {
    let persistence = MemoryCalendarHolidayPreferences::default();
    let first_launch = CalendarHolidayPreferencesApplication::new(persistence.clone());
    let defaults = first_launch.load().expect("defaults should load");
    assert_eq!(
        defaults,
        CalendarHolidayPreferences {
            enabled: true,
            china: true,
            united_states: true,
        }
    );

    let changed = CalendarHolidayPreferences {
        enabled: true,
        china: false,
        united_states: true,
    };
    assert_eq!(
        first_launch
            .set_preferences(changed)
            .expect("preferences should save and read back"),
        changed
    );
    let relaunched = CalendarHolidayPreferencesApplication::new(persistence);
    assert_eq!(
        relaunched.load().expect("saved preferences should load"),
        changed
    );
}

#[test]
fn corrupt_local_calendar_preferences_recover_to_enabled_defaults() {
    let persistence = MemoryCalendarHolidayPreferences {
        document: Arc::new(Mutex::new(Some(
            br#"{"schemaVersion":99,"enabled":false,"china":false,"unitedStates":false}"#.to_vec(),
        ))),
    };
    assert_eq!(
        CalendarHolidayPreferencesApplication::new(persistence)
            .load()
            .expect("an unknown local preference version should recover"),
        CalendarHolidayPreferences::default()
    );
}
