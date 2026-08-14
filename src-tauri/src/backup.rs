use crate::exercise::{
    ExerciseApplication, ExerciseClock, ExerciseDashboardView, ExercisePersistence, ExerciseState,
};
use crate::notification::NotificationPlatform;
use crate::profile::{Profile, ProfileExchange, ProfilePersistence, ProfileView};
use serde::{Deserialize, Serialize};
use std::sync::Mutex;

const BACKUP_SCHEMA_VERSION: u32 = 1;

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
struct ProfileBackupDocument {
    schema_version: u32,
    profile: Profile,
    exercise: ExerciseState,
}

#[derive(Clone, Debug, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProfileBackupAction {
    pub message: String,
}

#[derive(Clone, Debug, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProfileRestoreSelection {
    pub confirmation_required: bool,
    pub message: String,
}

#[derive(Clone, Debug, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProfileRestoreAction {
    pub profile: ProfileView,
    pub dashboard: ExerciseDashboardView,
    pub message: String,
}

pub trait CompleteProfileReplacement: Send + Sync {
    fn replace_complete(&self, profile: &[u8], exercise: &[u8]) -> Result<(), String>;
}

pub struct ProfileBackupApplication<P, E, X, N, C, R> {
    profile_persistence: P,
    exercise_persistence: E,
    exchange: X,
    notifications: N,
    clock: C,
    replacement: R,
    pending_restore: Mutex<Option<ProfileBackupDocument>>,
}

impl<P, E, X, N, C, R> ProfileBackupApplication<P, E, X, N, C, R>
where
    P: ProfilePersistence + Clone,
    E: ExercisePersistence + Clone,
    X: ProfileExchange,
    N: NotificationPlatform + Clone,
    C: ExerciseClock + Clone,
    R: CompleteProfileReplacement,
{
    pub fn new(
        profile_persistence: P,
        exercise_persistence: E,
        exchange: X,
        notifications: N,
        clock: C,
        replacement: R,
    ) -> Self {
        Self {
            profile_persistence,
            exercise_persistence,
            exchange,
            notifications,
            clock,
            replacement,
            pending_restore: Mutex::new(None),
        }
    }

    pub fn backup_profile(&self) -> Result<ProfileBackupAction, String> {
        let backup = self.current_backup()?;
        let document = encode_backup(&backup)?;
        let exported = self.exchange.export(&document)?;
        Ok(ProfileBackupAction {
            message: if exported {
                "Profile backup saved."
            } else {
                "Backup cancelled."
            }
            .into(),
        })
    }

    pub fn select_profile_restore(&self) -> Result<ProfileRestoreSelection, String> {
        self.pending_restore
            .lock()
            .map_err(|_| "The pending restore is unavailable.".to_string())?
            .take();
        let Some(document) = self.exchange.import()? else {
            return Ok(ProfileRestoreSelection::cancelled());
        };
        let backup = parse_backup(&document)?;
        backup.exercise.validate_timestamps(&self.clock)?;
        *self
            .pending_restore
            .lock()
            .map_err(|_| "The pending restore is unavailable.".to_string())? = Some(backup);
        Ok(ProfileRestoreSelection::ready())
    }

    pub fn cancel_profile_restore(&self) -> Result<ProfileRestoreSelection, String> {
        self.pending_restore
            .lock()
            .map_err(|_| "The pending restore is unavailable.".to_string())?
            .take();
        Ok(ProfileRestoreSelection::cancelled())
    }

    pub fn confirm_profile_restore(&self) -> Result<ProfileRestoreAction, String> {
        let mut pending = self
            .pending_restore
            .lock()
            .map_err(|_| "The pending restore is unavailable.".to_string())?;
        let mut restored = pending
            .take()
            .ok_or_else(|| "No validated profile restore is awaiting confirmation.".to_string())?;
        let current_exercise_document = self.current_exercise_document()?;
        let (active_exercise, _) = crate::exercise::parse_state(&current_exercise_document)?;
        let notification_ids = active_exercise.scheduled_notification_ids();
        restored.exercise.reset_native_reminder_markers();
        let restored_exercise_document = encode_exercise(&restored.exercise)?;
        let restored_profile_document = crate::profile::encode_profile(&restored.profile)?;

        if let Err(error) = self
            .replacement
            .replace_complete(&restored_profile_document, &restored_exercise_document)
        {
            *pending = Some(restored);
            return Err(error);
        }
        drop(pending);

        for notification_id in notification_ids {
            self.notifications.cancel(&notification_id)?;
        }
        let dashboard = ExerciseApplication::new(
            self.exercise_persistence.clone(),
            self.notifications.clone(),
            self.clock.clone(),
        )
        .open()?;
        Ok(ProfileRestoreAction {
            profile: restored.profile.view(),
            dashboard,
            message: "Profile restored.".into(),
        })
    }

    fn current_backup(&self) -> Result<ProfileBackupDocument, String> {
        let profile_document = self.current_profile_document()?;
        let exercise_document = self.current_exercise_document()?;
        let profile = crate::profile::parse_profile(&profile_document)?;
        let (exercise, _) = crate::exercise::parse_state(&exercise_document)?;
        exercise.validate_timestamps(&self.clock)?;
        Ok(ProfileBackupDocument {
            schema_version: BACKUP_SCHEMA_VERSION,
            profile,
            exercise,
        })
    }

    fn current_profile_document(&self) -> Result<Vec<u8>, String> {
        self.profile_persistence
            .load()?
            .ok_or_else(|| "The active profile is not initialized.".to_string())
    }

    fn current_exercise_document(&self) -> Result<Vec<u8>, String> {
        self.exercise_persistence
            .load()?
            .ok_or_else(|| "The active exercise profile is not initialized.".to_string())
    }
}

impl ProfileRestoreSelection {
    fn ready() -> Self {
        Self {
            confirmation_required: true,
            message: "Valid profile backup selected.".into(),
        }
    }

    fn cancelled() -> Self {
        Self {
            confirmation_required: false,
            message: "Restore cancelled.".into(),
        }
    }
}

fn encode_backup(backup: &ProfileBackupDocument) -> Result<Vec<u8>, String> {
    serde_json::to_vec_pretty(backup)
        .map_err(|error| format!("Could not encode the profile backup: {error}"))
}

fn encode_exercise(state: &ExerciseState) -> Result<Vec<u8>, String> {
    serde_json::to_vec_pretty(state)
        .map_err(|error| format!("Could not encode the exercise profile: {error}"))
}

fn parse_backup(document: &[u8]) -> Result<ProfileBackupDocument, String> {
    let backup = serde_json::from_slice::<ProfileBackupDocument>(document)
        .map_err(|_| "The selected file is not a valid Personal Dashboard backup.".to_string())?;
    if backup.schema_version != BACKUP_SCHEMA_VERSION {
        return Err(format!(
            "Unsupported profile backup schema version: {}",
            backup.schema_version
        ));
    }
    Ok(ProfileBackupDocument {
        profile: backup.profile.validate()?,
        exercise: backup.exercise.validate()?,
        ..backup
    })
}
