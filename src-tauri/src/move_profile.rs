use crate::backup::CompleteProfileReplacement;
use crate::exercise::{
    ExerciseApplication, ExerciseAuthority, ExerciseClock, ExerciseDashboardView,
    ExercisePersistence, ExerciseState, NotificationCancellationJournal,
};
use crate::notification::NotificationPlatform;
use crate::profile::{
    encode_profile, parse_profile, Profile, ProfileAuthority, ProfilePersistence, ProfileView,
};
use serde::{Deserialize, Serialize};
use std::sync::Mutex;

const PROFILE_MOVE_SCHEMA_VERSION: u32 = 1;

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
struct ProfileMoveDocument {
    schema_version: u32,
    authority: ProfileMoveAuthority,
    profile: Profile,
    exercise: ExerciseState,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
struct ProfileMoveAuthority {
    source: MoveSourceAuthority,
    destination: MoveDestinationAuthority,
    exported_at_epoch_millis: i64,
}

#[derive(Clone, Copy, Debug, Deserialize, Serialize)]
#[serde(rename_all = "snake_case")]
enum MoveSourceAuthority {
    Authoritative,
}

#[derive(Clone, Copy, Debug, Deserialize, Serialize)]
#[serde(rename_all = "snake_case")]
enum MoveDestinationAuthority {
    ActivateOnConfirmation,
}

#[derive(Clone, Debug, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProfileMoveAction {
    pub profile: ProfileView,
    pub dashboard: ExerciseDashboardView,
    pub message: String,
    pub reminder_transition_pending: bool,
}

#[derive(Clone, Debug, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProfileMoveSelection {
    pub confirmation_required: bool,
    pub message: String,
}

pub trait ProfileMoveExchange: Send + Sync {
    type ExportTarget: Send;

    fn select_move_export(&self) -> Result<Option<Self::ExportTarget>, String>;
    fn export_move(&self, target: &Self::ExportTarget, document: &[u8]) -> Result<(), String>;
    fn import_move(&self) -> Result<Option<Vec<u8>>, String>;
}

#[derive(Clone)]
pub struct ProfileExerciseAuthority<P> {
    profile_persistence: P,
}

#[derive(Clone)]
pub struct ProfileNotificationCancellationJournal<P> {
    profile_persistence: P,
}

impl<P> ProfileExerciseAuthority<P> {
    pub fn new(profile_persistence: P) -> Self {
        Self {
            profile_persistence,
        }
    }
}

impl<P> ProfileNotificationCancellationJournal<P> {
    pub fn new(profile_persistence: P) -> Self {
        Self {
            profile_persistence,
        }
    }
}

impl<P: ProfilePersistence> ExerciseAuthority for ProfileExerciseAuthority<P> {
    fn is_active(&self) -> Result<bool, String> {
        Ok(load_current_profile(&self.profile_persistence)?.is_active())
    }
}

impl<P: ProfilePersistence> NotificationCancellationJournal
    for ProfileNotificationCancellationJournal<P>
{
    fn pending_notification_cancellations(&self) -> Result<Vec<String>, String> {
        Ok(load_current_profile(&self.profile_persistence)?
            .pending_notification_cancellations()
            .to_vec())
    }

    fn notification_cancellation_completed(&self, notification_id: &str) -> Result<(), String> {
        let mut profile = load_current_profile(&self.profile_persistence)?;
        profile.notification_cancellation_completed(notification_id);
        self.profile_persistence.save(&encode_profile(&profile)?)
    }
}

fn load_current_profile<P: ProfilePersistence>(persistence: &P) -> Result<Profile, String> {
    let document = persistence
        .load()?
        .ok_or_else(|| "The active profile is not initialized.".to_string())?;
    parse_profile(&document)
}

pub struct ProfileMoveApplication<P, E, X, N, C, R> {
    profile_persistence: P,
    exercise_persistence: E,
    exchange: X,
    notifications: N,
    clock: C,
    replacement: R,
    pending_import: Mutex<Option<ProfileMoveDocument>>,
}

impl<P, E, X, N, C, R> ProfileMoveApplication<P, E, X, N, C, R>
where
    P: ProfilePersistence + Clone,
    E: ExercisePersistence + Clone,
    X: ProfileMoveExchange,
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
            pending_import: Mutex::new(None),
        }
    }

    pub fn move_profile(&self) -> Result<ProfileMoveAction, String> {
        self.exercise_application().open()?;
        let profile = self.current_profile()?;
        if !profile.is_active() {
            return Err("This profile is already inactive.".into());
        }
        if !profile.pending_notification_cancellations().is_empty() {
            return Err(
                "Personal Dashboard is still cancelling old reminders. Try the move again.".into(),
            );
        }
        let exercise = self.current_exercise()?;
        let document = ProfileMoveDocument {
            schema_version: PROFILE_MOVE_SCHEMA_VERSION,
            authority: ProfileMoveAuthority {
                source: MoveSourceAuthority::Authoritative,
                destination: MoveDestinationAuthority::ActivateOnConfirmation,
                exported_at_epoch_millis: self.clock.now_epoch_millis(),
            },
            profile: profile
                .clone()
                .with_local_authority(ProfileAuthority::Active, Vec::new()),
            exercise: exercise.clone(),
        };
        let encoded_move = encode_move(&document)?;
        let Some(export_target) = self.exchange.select_move_export()? else {
            return Ok(ProfileMoveAction {
                profile: profile.view(),
                dashboard: self.exercise_application().open()?,
                message: "Profile move cancelled. This device remains active.".into(),
                reminder_transition_pending: false,
            });
        };
        let notification_ids = exercise.scheduled_notification_ids();
        let mut inactive_exercise = exercise;
        inactive_exercise.reset_native_reminder_markers();
        let inactive_profile = profile
            .clone()
            .with_local_authority(ProfileAuthority::Inactive, notification_ids);
        self.replace(&inactive_profile, &inactive_exercise)?;
        let dashboard = self.exercise_application().open()?;
        let inactive_profile = self.current_profile()?;
        if !inactive_profile
            .pending_notification_cancellations()
            .is_empty()
        {
            return Err("The exercise reminder could not be cancelled. This profile is inactive and will retry automatically.".into());
        }
        match self.exchange.export_move(&export_target, &encoded_move) {
            Ok(()) => {}
            Err(error) => {
                return match self.reactivate_after_failed_export(&profile, &inactive_exercise) {
                    Ok(()) => Err(error),
                    Err(recovery_error) => Err(format!(
                        "{error} The source profile could not be reactivated: {recovery_error}"
                    )),
                };
            }
        }
        Ok(ProfileMoveAction {
            profile: inactive_profile.view(),
            dashboard,
            message: "Profile move saved. This device is now inactive.".into(),
            reminder_transition_pending: false,
        })
    }

    pub fn select_profile_move_import(&self) -> Result<ProfileMoveSelection, String> {
        self.pending_import
            .lock()
            .map_err(|_| "The pending profile move is unavailable.".to_string())?
            .take();
        let Some(document) = self.exchange.import_move()? else {
            return Ok(ProfileMoveSelection::cancelled());
        };
        let moved = parse_move(&document)?;
        moved.exercise.validate_timestamps()?;
        *self
            .pending_import
            .lock()
            .map_err(|_| "The pending profile move is unavailable.".to_string())? = Some(moved);
        Ok(ProfileMoveSelection::ready())
    }

    pub fn cancel_profile_move_import(&self) -> Result<ProfileMoveSelection, String> {
        self.pending_import
            .lock()
            .map_err(|_| "The pending profile move is unavailable.".to_string())?
            .take();
        Ok(ProfileMoveSelection::cancelled())
    }

    pub fn confirm_profile_move_import(&self) -> Result<ProfileMoveAction, String> {
        let mut pending = self
            .pending_import
            .lock()
            .map_err(|_| "The pending profile move is unavailable.".to_string())?;
        let mut moved = pending
            .take()
            .ok_or_else(|| "No validated profile move is awaiting confirmation.".to_string())?;
        let current_exercise = self.current_exercise()?;
        let notification_ids = current_exercise.scheduled_notification_ids();
        moved.exercise.reset_native_reminder_markers();
        moved.profile = moved
            .profile
            .with_local_authority(ProfileAuthority::Active, notification_ids);
        if let Err(error) = self.replace(&moved.profile, &moved.exercise) {
            *pending = Some(moved);
            return Err(error);
        }
        drop(pending);
        let (dashboard, reminder_transition_pending) = self.open_with_reminder_retry()?;
        Ok(ProfileMoveAction {
            profile: moved.profile.view(),
            dashboard,
            message: "Moved profile activated on this device.".into(),
            reminder_transition_pending,
        })
    }

    pub fn reactivate_profile(&self) -> Result<ProfileMoveAction, String> {
        let profile = self.current_profile()?;
        if profile.is_active() {
            return Err("This profile is already active.".into());
        }
        self.exercise_application().open()?;
        let profile = self.current_profile()?;
        if !profile.pending_notification_cancellations().is_empty() {
            return Err(
                "Personal Dashboard is still pausing old reminders. Try reactivation again.".into(),
            );
        }
        let mut exercise = self.current_exercise()?;
        exercise.reset_native_reminder_markers();
        let active_profile = profile.with_local_authority(ProfileAuthority::Active, Vec::new());
        self.replace(&active_profile, &exercise)?;
        let (dashboard, reminder_transition_pending) = self.open_with_reminder_retry()?;
        Ok(ProfileMoveAction {
            profile: active_profile.view(),
            dashboard,
            message: "Profile reactivated on this device.".into(),
            reminder_transition_pending,
        })
    }

    fn current_profile(&self) -> Result<Profile, String> {
        load_current_profile(&self.profile_persistence)
    }

    fn current_exercise(&self) -> Result<ExerciseState, String> {
        let document = self
            .exercise_persistence
            .load()?
            .ok_or_else(|| "The active exercise profile is not initialized.".to_string())?;
        let (exercise, _) = crate::exercise::parse_state(&document)?;
        exercise.validate_timestamps()?;
        Ok(exercise)
    }

    fn exercise_application(
        &self,
    ) -> ExerciseApplication<
        E,
        N,
        C,
        ProfileExerciseAuthority<P>,
        ProfileNotificationCancellationJournal<P>,
    > {
        ExerciseApplication::with_authority(
            self.exercise_persistence.clone(),
            self.notifications.clone(),
            self.clock.clone(),
            ProfileExerciseAuthority::new(self.profile_persistence.clone()),
            ProfileNotificationCancellationJournal::new(self.profile_persistence.clone()),
        )
    }

    fn replace(&self, profile: &Profile, exercise: &ExerciseState) -> Result<(), String> {
        let profile_document = encode_profile(profile)?;
        let exercise_document = serde_json::to_vec_pretty(exercise)
            .map_err(|error| format!("Could not encode the exercise profile: {error}"))?;
        self.replacement
            .replace_complete(&profile_document, &exercise_document)
    }

    fn reactivate_after_failed_export(
        &self,
        profile: &Profile,
        exercise: &ExerciseState,
    ) -> Result<(), String> {
        self.replace(profile, exercise)?;
        self.exercise_application().open()?;
        Ok(())
    }

    fn open_with_reminder_retry(&self) -> Result<(ExerciseDashboardView, bool), String> {
        let application = self.exercise_application();
        match application.open() {
            Ok(dashboard) => Ok((
                dashboard,
                !self
                    .current_profile()?
                    .pending_notification_cancellations()
                    .is_empty(),
            )),
            Err(_) => application
                .open_inactive()
                .map(|dashboard| (dashboard, true)),
        }
    }
}

impl ProfileMoveSelection {
    fn ready() -> Self {
        Self {
            confirmation_required: true,
            message: "Valid moved profile selected. Import will replace this device's profile; histories will not be merged.".into(),
        }
    }

    fn cancelled() -> Self {
        Self {
            confirmation_required: false,
            message: "Profile move import cancelled.".into(),
        }
    }
}

fn encode_move(document: &ProfileMoveDocument) -> Result<Vec<u8>, String> {
    serde_json::to_vec_pretty(document)
        .map_err(|error| format!("Could not encode the profile move: {error}"))
}

fn parse_move(document: &[u8]) -> Result<ProfileMoveDocument, String> {
    let moved = serde_json::from_slice::<ProfileMoveDocument>(document)
        .map_err(|_| "The selected file is not a valid Personal Dashboard move.".to_string())?;
    if moved.schema_version != PROFILE_MOVE_SCHEMA_VERSION {
        return Err(format!(
            "Unsupported profile move schema version: {}",
            moved.schema_version
        ));
    }
    if moved.authority.exported_at_epoch_millis < 0 || !moved.profile.is_active() {
        return Err("The selected profile move has invalid authority metadata.".into());
    }
    Ok(ProfileMoveDocument {
        profile: moved.profile.validate()?,
        exercise: moved.exercise.validate()?,
        ..moved
    })
}
