use serde::{Deserialize, Serialize};

const PROFILE_SCHEMA_VERSION: u32 = 3;
const DEFAULT_PROFILE_LABEL: &str = "My Personal Dashboard";

#[derive(Clone, Copy, Debug, Default, Deserialize, PartialEq, Serialize)]
#[serde(rename_all = "snake_case")]
pub(crate) enum ProfileAuthority {
    #[default]
    Active,
    Inactive,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize)]
#[serde(deny_unknown_fields)]
pub(crate) struct Profile {
    schema_version: u32,
    profile_label: String,
    #[serde(default)]
    authority: ProfileAuthority,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pending_notification_cancellations: Vec<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    baseline_migration: Option<BaselineMigrationRecord>,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize)]
#[serde(deny_unknown_fields)]
struct BaselineMigrationRecord {
    source_schema_version: u32,
}

#[derive(Clone, Debug, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProfileView {
    pub schema_version: u32,
    pub profile_label: String,
    pub authority: String,
    pub origin: ProfileOrigin,
}

#[derive(Clone, Copy, Debug, PartialEq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum ProfileOrigin {
    Local,
    CompletedBaseline,
}

pub trait ProfilePersistence: Send + Sync {
    fn load(&self) -> Result<Option<Vec<u8>>, String>;
    fn save(&self, document: &[u8]) -> Result<(), String>;
}

pub trait ProfileExchange: Send + Sync {
    fn export(&self, document: &[u8]) -> Result<bool, String>;
    fn import(&self) -> Result<Option<Vec<u8>>, String>;
}

#[derive(Clone, Debug, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProfileAction {
    pub profile: ProfileView,
    pub message: String,
}

pub struct ProfileApplication<P, E> {
    persistence: P,
    exchange: E,
}

impl Profile {
    fn new() -> Self {
        Self {
            schema_version: PROFILE_SCHEMA_VERSION,
            profile_label: DEFAULT_PROFILE_LABEL.into(),
            authority: ProfileAuthority::Active,
            pending_notification_cancellations: Vec::new(),
            baseline_migration: None,
        }
    }

    pub(crate) fn migrated_from_completed_baseline(source_schema_version: u32) -> Self {
        Self {
            baseline_migration: Some(BaselineMigrationRecord {
                source_schema_version,
            }),
            ..Self::new()
        }
    }

    pub(crate) fn validate(self) -> Result<Self, String> {
        if !(1..=PROFILE_SCHEMA_VERSION).contains(&self.schema_version) {
            return Err(format!(
                "Unsupported profile schema version: {}",
                self.schema_version
            ));
        }

        let profile_label = self.profile_label.trim();
        if profile_label.is_empty() {
            return Err("Profile label cannot be empty.".into());
        }
        if profile_label.chars().count() > 80 {
            return Err("Profile label must be 80 characters or fewer.".into());
        }

        Ok(Self {
            schema_version: PROFILE_SCHEMA_VERSION,
            profile_label: profile_label.into(),
            ..self
        })
    }

    pub(crate) fn view(&self) -> ProfileView {
        ProfileView {
            schema_version: self.schema_version,
            profile_label: self.profile_label.clone(),
            authority: self.authority.label().into(),
            origin: self.origin(),
        }
    }

    pub(crate) fn is_active(&self) -> bool {
        self.authority == ProfileAuthority::Active
    }

    pub(crate) fn authority(&self) -> ProfileAuthority {
        self.authority
    }

    pub(crate) fn origin(&self) -> ProfileOrigin {
        if self.baseline_migration.is_some() {
            ProfileOrigin::CompletedBaseline
        } else {
            ProfileOrigin::Local
        }
    }

    pub(crate) fn with_local_authority(
        mut self,
        authority: ProfileAuthority,
        pending_notification_cancellations: Vec<String>,
    ) -> Self {
        self.authority = authority;
        self.pending_notification_cancellations = pending_notification_cancellations;
        self
    }

    pub(crate) fn pending_notification_cancellations(&self) -> &[String] {
        &self.pending_notification_cancellations
    }

    pub(crate) fn notification_cancellation_completed(&mut self, notification_id: &str) {
        self.pending_notification_cancellations
            .retain(|pending| pending != notification_id);
    }
}

impl ProfileAuthority {
    fn label(self) -> &'static str {
        match self {
            Self::Active => "active",
            Self::Inactive => "inactive",
        }
    }
}

impl<P: ProfilePersistence, E: ProfileExchange> ProfileApplication<P, E> {
    pub fn new(persistence: P, exchange: E) -> Self {
        Self {
            persistence,
            exchange,
        }
    }

    pub fn open(&self) -> Result<ProfileView, String> {
        self.current_profile().map(|profile| profile.view())
    }

    pub fn update_profile_label(&self, profile_label: String) -> Result<ProfileView, String> {
        let current = match self.persistence.load()? {
            Some(document) => parse_profile(&document)?,
            None => Profile::new(),
        };
        require_active_profile(&current)?;
        let updated = Profile {
            profile_label,
            ..current
        }
        .validate()?;
        self.save_profile(&updated)?;
        Ok(updated.view())
    }

    pub fn require_active(&self) -> Result<(), String> {
        require_active_profile(&self.current_profile()?)
    }

    pub fn export_profile(&self) -> Result<ProfileAction, String> {
        let profile = self.current_profile()?;
        let document = encode_profile(&profile)?;
        let exported = self.exchange.export(&document)?;
        Ok(ProfileAction {
            profile: profile.view(),
            message: if exported {
                "Profile exported."
            } else {
                "Export cancelled."
            }
            .into(),
        })
    }

    pub fn import_profile(&self) -> Result<ProfileAction, String> {
        let Some(document) = self.exchange.import()? else {
            return Ok(ProfileAction {
                profile: self.current_profile()?.view(),
                message: "Import cancelled.".into(),
            });
        };
        let imported = parse_profile(&document)?;
        self.save_profile(&imported)?;
        Ok(ProfileAction {
            profile: imported.view(),
            message: "Profile imported.".into(),
        })
    }

    fn save_profile(&self, profile: &Profile) -> Result<(), String> {
        let document = encode_profile(profile)?;
        self.persistence.save(&document)
    }

    fn current_profile(&self) -> Result<Profile, String> {
        match self.persistence.load()? {
            Some(document) => {
                let decoded = decode_profile(&document)?;
                let migration_required = decoded.schema_version != PROFILE_SCHEMA_VERSION;
                let profile = decoded.validate()?;
                if migration_required {
                    self.save_profile(&profile)?;
                }
                Ok(profile)
            }
            None => {
                let profile = Profile::new();
                self.save_profile(&profile)?;
                Ok(profile)
            }
        }
    }
}

fn require_active_profile(profile: &Profile) -> Result<(), String> {
    if profile.is_active() {
        Ok(())
    } else {
        Err("This profile is inactive. Reactivate it only if the move failed.".into())
    }
}

pub(crate) fn encode_profile(profile: &Profile) -> Result<Vec<u8>, String> {
    serde_json::to_vec_pretty(profile)
        .map_err(|error| format!("Could not encode the local profile: {error}"))
}

pub(crate) fn parse_profile(document: &[u8]) -> Result<Profile, String> {
    decode_profile(document)?.validate()
}

fn decode_profile(document: &[u8]) -> Result<Profile, String> {
    serde_json::from_slice::<Profile>(document)
        .map_err(|_| "The selected file is not a valid Personal Dashboard profile.".to_string())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::{Arc, Mutex};

    #[derive(Clone, Default)]
    struct MemoryPersistence {
        document: Arc<Mutex<Option<Vec<u8>>>>,
    }

    #[derive(Clone, Default)]
    struct MemoryExchange {
        exported_document: Arc<Mutex<Option<Vec<u8>>>>,
        import_document: Arc<Mutex<Option<Vec<u8>>>>,
    }

    impl ProfilePersistence for MemoryPersistence {
        fn load(&self) -> Result<Option<Vec<u8>>, String> {
            Ok(self.document.lock().unwrap().clone())
        }

        fn save(&self, document: &[u8]) -> Result<(), String> {
            *self.document.lock().unwrap() = Some(document.to_vec());
            Ok(())
        }
    }

    impl ProfileExchange for MemoryExchange {
        fn export(&self, document: &[u8]) -> Result<bool, String> {
            *self.exported_document.lock().unwrap() = Some(document.to_vec());
            Ok(true)
        }

        fn import(&self) -> Result<Option<Vec<u8>>, String> {
            Ok(self.import_document.lock().unwrap().take())
        }
    }

    #[test]
    fn visible_profile_change_survives_application_relaunch() {
        let persistence = MemoryPersistence::default();
        let first_launch = ProfileApplication::new(persistence.clone(), MemoryExchange::default());

        assert_eq!(
            DEFAULT_PROFILE_LABEL,
            first_launch.open().unwrap().profile_label
        );
        assert_eq!(
            "Mac capability profile",
            first_launch
                .update_profile_label("Mac capability profile".into())
                .unwrap()
                .profile_label
        );

        let relaunched = ProfileApplication::new(persistence, MemoryExchange::default());
        assert_eq!(
            "Mac capability profile",
            relaunched.open().unwrap().profile_label
        );
    }

    #[test]
    fn version_one_profile_migrates_to_active_authority_state() {
        let persistence = MemoryPersistence::default();
        *persistence.document.lock().unwrap() =
            Some(br#"{"schema_version":1,"profile_label":"Existing profile"}"#.to_vec());
        let application = ProfileApplication::new(persistence.clone(), MemoryExchange::default());

        let profile = application.open().unwrap();

        assert_eq!(PROFILE_SCHEMA_VERSION, profile.schema_version);
        assert_eq!("active", profile.authority);
        let saved: serde_json::Value =
            serde_json::from_slice(persistence.document.lock().unwrap().as_deref().unwrap())
                .unwrap();
        assert_eq!(PROFILE_SCHEMA_VERSION, saved["schema_version"]);
        assert_eq!("active", saved["authority"]);
    }

    #[test]
    fn exported_profile_can_replace_changed_state_after_complete_validation() {
        let persistence = MemoryPersistence::default();
        let exchange = MemoryExchange::default();
        let application = ProfileApplication::new(persistence, exchange.clone());

        application
            .update_profile_label("Exported capability profile".into())
            .unwrap();
        assert_eq!(
            "Profile exported.",
            application.export_profile().unwrap().message
        );
        *exchange.import_document.lock().unwrap() =
            exchange.exported_document.lock().unwrap().clone();

        application
            .update_profile_label("Changed after export".into())
            .unwrap();
        let imported = application.import_profile().unwrap();

        assert_eq!("Profile imported.", imported.message);
        assert_eq!(
            "Exported capability profile",
            imported.profile.profile_label
        );
        assert_eq!(
            "Exported capability profile",
            application.open().unwrap().profile_label
        );
    }

    #[test]
    fn invalid_or_unsupported_import_keeps_active_profile_unchanged() {
        let invalid_documents = [
            b"not json".to_vec(),
            br#"{"schema_version":99,"profile_label":"Unsupported"}"#.to_vec(),
            br#"{"schema_version":1,"profile_label":"","extra":true}"#.to_vec(),
        ];

        for invalid_document in invalid_documents {
            let persistence = MemoryPersistence::default();
            let exchange = MemoryExchange::default();
            let application = ProfileApplication::new(persistence, exchange.clone());
            application
                .update_profile_label("Keep this profile".into())
                .unwrap();
            *exchange.import_document.lock().unwrap() = Some(invalid_document);

            let error = application.import_profile().unwrap_err();

            assert!(
                error.contains("valid Personal Dashboard profile") || error.contains("Unsupported")
            );
            assert_eq!(
                "Keep this profile",
                application.open().unwrap().profile_label
            );
        }
    }
}
