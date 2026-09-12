use serde::{Deserialize, Serialize};

const APPEARANCE_SCHEMA_VERSION: u32 = 1;

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
}

impl Default for AppearancePreferences {
    fn default() -> Self {
        Self {
            accent_color: AccentColor::Forest,
        }
    }
}

#[derive(Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct AppearanceDocument {
    schema_version: u32,
    accent_color: AccentColor,
}

pub trait AppearancePersistence {
    fn load(&self) -> Result<Option<Vec<u8>>, String>;
    fn save(&self, document: &[u8]) -> Result<(), String>;
}

pub struct AppearanceApplication<P> {
    persistence: P,
}

impl<P> AppearanceApplication<P>
where
    P: AppearancePersistence,
{
    pub fn new(persistence: P) -> Self {
        Self { persistence }
    }

    pub fn load(&self) -> Result<AppearancePreferences, String> {
        let Some(document) = self.persistence.load()? else {
            return Ok(AppearancePreferences::default());
        };
        let document: AppearanceDocument = serde_json::from_slice(&document)
            .map_err(|error| format!("The local appearance preference is invalid: {error}"))?;
        if document.schema_version != APPEARANCE_SCHEMA_VERSION {
            return Err(
                "The local appearance preference uses an unsupported schema version.".into(),
            );
        }
        Ok(AppearancePreferences {
            accent_color: document.accent_color,
        })
    }

    pub fn set_accent_color(
        &self,
        accent_color: AccentColor,
    ) -> Result<AppearancePreferences, String> {
        let preferences = AppearancePreferences { accent_color };
        self.save(&preferences)?;
        Ok(preferences)
    }

    pub fn restore_defaults(&self) -> Result<AppearancePreferences, String> {
        let preferences = AppearancePreferences::default();
        self.save(&preferences)?;
        Ok(preferences)
    }

    fn save(&self, preferences: &AppearancePreferences) -> Result<(), String> {
        let document = serde_json::to_vec_pretty(&AppearanceDocument {
            schema_version: APPEARANCE_SCHEMA_VERSION,
            accent_color: preferences.accent_color,
        })
        .map_err(|error| format!("Could not encode the local appearance preference: {error}"))?;
        self.persistence.save(&document)
    }
}
