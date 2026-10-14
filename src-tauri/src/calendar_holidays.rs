use serde::{Deserialize, Serialize};

const CALENDAR_HOLIDAY_PREFERENCES_SCHEMA_VERSION: u32 = 1;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CalendarHolidayPreferences {
    pub enabled: bool,
    pub china: bool,
    pub united_states: bool,
}

impl Default for CalendarHolidayPreferences {
    fn default() -> Self {
        Self {
            enabled: true,
            china: true,
            united_states: true,
        }
    }
}

#[derive(Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct CalendarHolidayPreferencesDocument {
    schema_version: u32,
    enabled: bool,
    china: bool,
    united_states: bool,
}

pub trait CalendarHolidayPreferencesPersistence {
    fn load(&self) -> Result<Option<Vec<u8>>, String>;
    fn save(&self, document: &[u8]) -> Result<(), String>;
}

pub struct CalendarHolidayPreferencesApplication<P> {
    persistence: P,
}

impl<P> CalendarHolidayPreferencesApplication<P>
where
    P: CalendarHolidayPreferencesPersistence,
{
    pub fn new(persistence: P) -> Self {
        Self { persistence }
    }

    pub fn load(&self) -> Result<CalendarHolidayPreferences, String> {
        let Some(document) = self.persistence.load()? else {
            return Ok(CalendarHolidayPreferences::default());
        };
        let Ok(document) = serde_json::from_slice::<CalendarHolidayPreferencesDocument>(&document)
        else {
            return Ok(CalendarHolidayPreferences::default());
        };
        if document.schema_version != CALENDAR_HOLIDAY_PREFERENCES_SCHEMA_VERSION {
            return Ok(CalendarHolidayPreferences::default());
        }
        Ok(CalendarHolidayPreferences {
            enabled: document.enabled,
            china: document.china,
            united_states: document.united_states,
        })
    }

    pub fn set_preferences(
        &self,
        preferences: CalendarHolidayPreferences,
    ) -> Result<CalendarHolidayPreferences, String> {
        let document = serde_json::to_vec_pretty(&CalendarHolidayPreferencesDocument {
            schema_version: CALENDAR_HOLIDAY_PREFERENCES_SCHEMA_VERSION,
            enabled: preferences.enabled,
            china: preferences.china,
            united_states: preferences.united_states,
        })
        .map_err(|error| format!("Could not encode local Calendar preferences: {error}"))?;
        self.persistence.save(&document)?;
        let saved = self.load()?;
        if saved != preferences {
            return Err(
                "The saved Calendar preferences did not match the requested values.".into(),
            );
        }
        Ok(saved)
    }
}
