use personal_dashboard_lib::exercise::{ExerciseApplication, ExerciseClock, ExercisePersistence};
use personal_dashboard_lib::notification::{
    NotificationIntent, NotificationPermission, NotificationPlatform,
};
use std::sync::{Arc, Mutex};

#[derive(Clone, Default)]
struct IsolatedProfile {
    document: Arc<Mutex<Option<Vec<u8>>>>,
}

impl ExercisePersistence for IsolatedProfile {
    fn load(&self) -> Result<Option<Vec<u8>>, String> {
        Ok(self.document.lock().unwrap().clone())
    }

    fn save(&self, document: &[u8]) -> Result<(), String> {
        *self.document.lock().unwrap() = Some(document.to_vec());
        Ok(())
    }
}

#[derive(Clone)]
struct FixedNewYorkClock {
    now_epoch_millis: i64,
}

impl ExerciseClock for FixedNewYorkClock {
    fn now_epoch_millis(&self) -> i64 {
        self.now_epoch_millis
    }

    fn utc_offset_minutes_at(&self, _epoch_millis: i64) -> i32 {
        -4 * 60
    }
}

#[derive(Clone, Default)]
struct ReminderOutbox {
    scheduled: Arc<Mutex<Vec<NotificationIntent>>>,
}

impl NotificationPlatform for ReminderOutbox {
    fn permission(&self) -> Result<NotificationPermission, String> {
        Ok(NotificationPermission::Granted)
    }

    fn request_permission(&self) -> Result<NotificationPermission, String> {
        Ok(NotificationPermission::Granted)
    }

    fn schedule(&self, intent: NotificationIntent) -> Result<(), String> {
        self.scheduled.lock().unwrap().push(intent);
        Ok(())
    }
}

#[test]
fn fresh_exercise_week_survives_relaunch_and_emits_the_first_departure_reminder() {
    let profile = IsolatedProfile::default();
    let reminders = ReminderOutbox::default();
    let monday_morning = FixedNewYorkClock {
        now_epoch_millis: 1_786_366_800_000,
    };

    let first_launch =
        ExerciseApplication::new(profile.clone(), reminders.clone(), monday_morning.clone());
    let dashboard = first_launch.open().unwrap();

    assert_eq!("Personal Dashboard", dashboard.product_name);
    assert_eq!("Exercise tracking", dashboard.feature_area);
    assert_eq!(1, dashboard.schema_version);
    assert_eq!(
        "Monday, August 10 – Sunday, August 16",
        dashboard.week_label
    );
    assert_eq!("0 of 3 completed", dashboard.progress);
    assert_eq!(
        vec![
            ("Monday", "4:00 PM"),
            ("Wednesday", "4:00 PM"),
            ("Friday", "4:00 PM")
        ],
        dashboard
            .primary_departures
            .iter()
            .map(|slot| (slot.day.as_str(), slot.time.as_str()))
            .collect::<Vec<_>>()
    );
    assert_eq!(
        vec![("Saturday", "Available"), ("Sunday", "Available")],
        dashboard
            .fallback_departures
            .iter()
            .map(|slot| (slot.day.as_str(), slot.availability.as_str()))
            .collect::<Vec<_>>()
    );
    assert_eq!(2, dashboard.fallback_available_count);
    assert_eq!(
        "Monday, August 10 at 4:00 PM",
        dashboard.next_departure.as_deref().unwrap()
    );
    assert_eq!(
        vec![NotificationIntent {
            id: "exercise-departure-2026-08-10-primary-1".into(),
            deliver_at_epoch_millis: 1_786_392_000_000,
            title: "Personal Dashboard".into(),
            body: "Time to leave for the gym.".into(),
            detail: "Monday, August 10 at 4:00 PM".into(),
        }],
        *reminders.scheduled.lock().unwrap()
    );

    let relaunched = ExerciseApplication::new(profile, reminders.clone(), monday_morning);
    assert_eq!(dashboard, relaunched.open().unwrap());
    assert_eq!(1, reminders.scheduled.lock().unwrap().len());
}
