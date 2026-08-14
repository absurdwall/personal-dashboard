use crate::exercise::{
    parse_state, CompletedBaselineError, CompletedBaselineExercise, ExerciseClock,
    ExercisePersistence,
};
use crate::profile::{encode_profile, parse_profile, Profile, ProfileOrigin, ProfilePersistence};
use serde::Serialize;

pub trait BaselinePersistence: Send + Sync {
    fn load(&self) -> Result<Option<Vec<u8>>, String>;
}

pub struct CompleteProfileDocuments {
    profile: Vec<u8>,
    exercise: Vec<u8>,
}

impl CompleteProfileDocuments {
    pub fn new(profile: Vec<u8>, exercise: Vec<u8>) -> Self {
        Self { profile, exercise }
    }

    pub fn profile(&self) -> &[u8] {
        &self.profile
    }

    pub fn exercise(&self) -> &[u8] {
        &self.exercise
    }
}

pub trait CompleteProfileAdoption: Send + Sync {
    fn adopt_complete(&self, documents: &CompleteProfileDocuments) -> Result<(), String>;
}

#[derive(Clone, Copy, Debug, PartialEq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum BaselineMigrationStatus {
    Completed,
    NotFound,
    ExistingProfile,
    Failed,
}

#[derive(Clone, Copy, Debug, PartialEq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum BaselineMigrationFailure {
    AppStateRead,
    IncompleteAppState,
    InvalidAppState,
    BaselineRead,
    InvalidBaseline,
    UnsupportedBaseline,
    AdoptionFailed,
}

#[derive(Clone, Debug, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BaselineMigrationView {
    pub status: BaselineMigrationStatus,
    pub failure: Option<BaselineMigrationFailure>,
    pub blocks_profile: bool,
}

impl BaselineMigrationView {
    fn ready(status: BaselineMigrationStatus) -> Self {
        Self {
            status,
            failure: None,
            blocks_profile: false,
        }
    }

    fn failed(failure: BaselineMigrationFailure) -> Self {
        Self {
            status: BaselineMigrationStatus::Failed,
            failure: Some(failure),
            blocks_profile: true,
        }
    }
}

pub struct BaselineMigrationApplication<B, P, E, A, C> {
    baseline: B,
    profile: P,
    exercise: E,
    adoption: A,
    clock: C,
}

impl<B, P, E, A, C> BaselineMigrationApplication<B, P, E, A, C>
where
    B: BaselinePersistence,
    P: ProfilePersistence,
    E: ExercisePersistence,
    A: CompleteProfileAdoption,
    C: ExerciseClock,
{
    pub fn new(baseline: B, profile: P, exercise: E, adoption: A, clock: C) -> Self {
        Self {
            baseline,
            profile,
            exercise,
            adoption,
            clock,
        }
    }

    pub fn launch(&self) -> BaselineMigrationView {
        let profile_document = match self.profile.load() {
            Ok(document) => document,
            Err(_) => return BaselineMigrationView::failed(BaselineMigrationFailure::AppStateRead),
        };
        let exercise_document = match self.exercise.load() {
            Ok(document) => document,
            Err(_) => return BaselineMigrationView::failed(BaselineMigrationFailure::AppStateRead),
        };

        let existing_local_profile = match (profile_document, exercise_document) {
            (Some(profile), Some(exercise)) => {
                let profile = match parse_profile(&profile) {
                    Ok(profile) => profile,
                    Err(_) => {
                        return BaselineMigrationView::failed(
                            BaselineMigrationFailure::InvalidAppState,
                        )
                    }
                };
                if parse_state(&exercise).is_err() {
                    return BaselineMigrationView::failed(
                        BaselineMigrationFailure::InvalidAppState,
                    );
                }
                if profile.origin() == ProfileOrigin::CompletedBaseline {
                    return BaselineMigrationView::ready(BaselineMigrationStatus::ExistingProfile);
                }
                true
            }
            (None, None) => false,
            _ => {
                return BaselineMigrationView::failed(BaselineMigrationFailure::IncompleteAppState)
            }
        };

        let baseline_document = match self.baseline.load() {
            Ok(Some(document)) => document,
            Ok(None) => {
                return BaselineMigrationView::ready(if existing_local_profile {
                    BaselineMigrationStatus::ExistingProfile
                } else {
                    BaselineMigrationStatus::NotFound
                })
            }
            Err(_) => return BaselineMigrationView::failed(BaselineMigrationFailure::BaselineRead),
        };
        let migrated = match CompletedBaselineExercise::parse(&baseline_document, &self.clock) {
            Ok(migrated) => migrated,
            Err(CompletedBaselineError::Invalid) => {
                return BaselineMigrationView::failed(BaselineMigrationFailure::InvalidBaseline)
            }
            Err(CompletedBaselineError::Unsupported) => {
                return BaselineMigrationView::failed(BaselineMigrationFailure::UnsupportedBaseline)
            }
        };
        let profile = match encode_profile(&Profile::migrated_from_completed_baseline(
            migrated.source_schema_version(),
        )) {
            Ok(profile) => profile,
            Err(_) => {
                return BaselineMigrationView::failed(BaselineMigrationFailure::AdoptionFailed)
            }
        };
        let exercise = match migrated.document() {
            Ok(exercise) => exercise,
            Err(_) => {
                return BaselineMigrationView::failed(BaselineMigrationFailure::AdoptionFailed)
            }
        };
        let documents = CompleteProfileDocuments::new(profile, exercise);
        if self.adoption.adopt_complete(&documents).is_err() {
            return BaselineMigrationView::failed(BaselineMigrationFailure::AdoptionFailed);
        }
        BaselineMigrationView::ready(BaselineMigrationStatus::Completed)
    }
}
