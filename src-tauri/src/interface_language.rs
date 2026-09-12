use serde::{Deserialize, Serialize};

const INTERFACE_LANGUAGE_SCHEMA_VERSION: u32 = 1;

#[derive(Debug, Clone, Copy, Default, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum InterfaceLanguage {
    #[default]
    Zh,
    En,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct InterfaceLanguagePreferences {
    pub interface_language: InterfaceLanguage,
}

impl Default for InterfaceLanguagePreferences {
    fn default() -> Self {
        Self {
            interface_language: InterfaceLanguage::Zh,
        }
    }
}

#[derive(Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct InterfaceLanguageDocument {
    schema_version: u32,
    interface_language: InterfaceLanguage,
}

pub trait InterfaceLanguagePersistence {
    fn load(&self) -> Result<Option<Vec<u8>>, String>;
    fn save(&self, document: &[u8]) -> Result<(), String>;
}

pub struct InterfaceLanguageApplication<P> {
    persistence: P,
}

impl<P> InterfaceLanguageApplication<P>
where
    P: InterfaceLanguagePersistence,
{
    pub fn new(persistence: P) -> Self {
        Self { persistence }
    }

    pub fn load(&self) -> Result<InterfaceLanguagePreferences, String> {
        let Some(document) = self.persistence.load()? else {
            return Ok(InterfaceLanguagePreferences::default());
        };
        let Ok(document) = serde_json::from_slice::<InterfaceLanguageDocument>(&document) else {
            return Ok(InterfaceLanguagePreferences::default());
        };
        if document.schema_version != INTERFACE_LANGUAGE_SCHEMA_VERSION {
            return Ok(InterfaceLanguagePreferences::default());
        }
        Ok(InterfaceLanguagePreferences {
            interface_language: document.interface_language,
        })
    }

    pub fn set_language(
        &self,
        interface_language: InterfaceLanguage,
    ) -> Result<InterfaceLanguagePreferences, String> {
        let preferences = InterfaceLanguagePreferences { interface_language };
        let document = serde_json::to_vec_pretty(&InterfaceLanguageDocument {
            schema_version: INTERFACE_LANGUAGE_SCHEMA_VERSION,
            interface_language,
        })
        .map_err(|error| format!("Could not encode the local interface language: {error}"))?;
        self.persistence.save(&document)?;
        Ok(preferences)
    }
}
