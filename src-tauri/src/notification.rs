use serde::Serialize;
use std::sync::Mutex;

pub const CAPABILITY_DELAY_MILLIS: i64 = 10_000;

#[derive(Clone, Copy, Debug, PartialEq, Serialize)]
#[serde(rename_all = "kebab-case")]
pub enum NotificationPermission {
    Prompt,
    Granted,
    Denied,
}

#[derive(Clone, Debug, PartialEq)]
pub struct NotificationIntent {
    pub deliver_at_epoch_millis: i64,
    pub title: &'static str,
    pub body: &'static str,
}

pub trait NotificationPlatform: Send + Sync {
    fn permission(&self) -> Result<NotificationPermission, String>;
    fn request_permission(&self) -> Result<NotificationPermission, String>;
    fn schedule(&self, intent: NotificationIntent) -> Result<(), String>;
}

pub trait Clock: Send + Sync {
    fn now_epoch_millis(&self) -> i64;
}

#[derive(Clone, Debug, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NotificationCapabilityView {
    pub permission: NotificationPermission,
    pub scheduled_for_epoch_millis: Option<i64>,
    pub message: String,
}

pub struct NotificationApplication<N, C> {
    platform: N,
    clock: C,
    scheduled_for_epoch_millis: Mutex<Option<i64>>,
}

impl<N: NotificationPlatform, C: Clock> NotificationApplication<N, C> {
    pub fn new(platform: N, clock: C) -> Self {
        Self {
            platform,
            clock,
            scheduled_for_epoch_millis: Mutex::new(None),
        }
    }

    pub fn state(&self) -> Result<NotificationCapabilityView, String> {
        let permission = self.platform.permission()?;
        let scheduled_for_epoch_millis = *self.scheduled_for_epoch_millis.lock().unwrap();
        Ok(NotificationCapabilityView {
            permission,
            scheduled_for_epoch_millis,
            message: match scheduled_for_epoch_millis {
                Some(scheduled_for) if scheduled_for <= self.clock.now_epoch_millis() => {
                    "Capability notification delivery time has passed."
                }
                Some(_) => "Capability notification remains scheduled.",
                None => permission_message(permission),
            }
            .into(),
        })
    }

    pub fn request_permission(&self) -> Result<NotificationCapabilityView, String> {
        let permission = self.platform.request_permission()?;
        Ok(NotificationCapabilityView {
            permission,
            scheduled_for_epoch_millis: *self.scheduled_for_epoch_millis.lock().unwrap(),
            message: permission_message(permission).into(),
        })
    }

    pub fn schedule_capability(&self) -> Result<NotificationCapabilityView, String> {
        let permission = self.platform.permission()?;
        if permission != NotificationPermission::Granted {
            return Err(
                "Grant notification permission before scheduling the capability check.".into(),
            );
        }

        let deliver_at_epoch_millis = self.clock.now_epoch_millis() + CAPABILITY_DELAY_MILLIS;
        self.platform.schedule(NotificationIntent {
            deliver_at_epoch_millis,
            title: "Personal Dashboard",
            body: "Mac notification capability delivered while the window was closed.",
        })?;
        *self.scheduled_for_epoch_millis.lock().unwrap() = Some(deliver_at_epoch_millis);

        Ok(NotificationCapabilityView {
            permission,
            scheduled_for_epoch_millis: Some(deliver_at_epoch_millis),
            message: "Capability notification scheduled.".into(),
        })
    }
}

fn permission_message(permission: NotificationPermission) -> &'static str {
    match permission {
        NotificationPermission::Granted => "Notification permission is granted.",
        NotificationPermission::Denied => "Notification permission is denied in macOS settings.",
        NotificationPermission::Prompt => "Notification permission has not been granted yet.",
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::{Arc, Mutex};

    #[derive(Clone)]
    struct FixedClock(Arc<Mutex<i64>>);

    impl FixedClock {
        fn at(epoch_millis: i64) -> Self {
            Self(Arc::new(Mutex::new(epoch_millis)))
        }

        fn advance_to(&self, epoch_millis: i64) {
            *self.0.lock().unwrap() = epoch_millis;
        }
    }

    impl Clock for FixedClock {
        fn now_epoch_millis(&self) -> i64 {
            *self.0.lock().unwrap()
        }
    }

    #[derive(Clone)]
    struct MemoryNotificationPlatform {
        permission: Arc<Mutex<NotificationPermission>>,
        scheduled: Arc<Mutex<Vec<NotificationIntent>>>,
    }

    impl MemoryNotificationPlatform {
        fn prompting() -> Self {
            Self {
                permission: Arc::new(Mutex::new(NotificationPermission::Prompt)),
                scheduled: Arc::new(Mutex::new(Vec::new())),
            }
        }
    }

    impl NotificationPlatform for MemoryNotificationPlatform {
        fn permission(&self) -> Result<NotificationPermission, String> {
            Ok(*self.permission.lock().unwrap())
        }

        fn request_permission(&self) -> Result<NotificationPermission, String> {
            *self.permission.lock().unwrap() = NotificationPermission::Granted;
            Ok(NotificationPermission::Granted)
        }

        fn schedule(&self, intent: NotificationIntent) -> Result<(), String> {
            self.scheduled.lock().unwrap().push(intent);
            Ok(())
        }
    }

    #[test]
    fn permission_request_reports_the_result_to_the_user() {
        let application = NotificationApplication::new(
            MemoryNotificationPlatform::prompting(),
            FixedClock::at(1_000_000),
        );

        let result = application.request_permission().unwrap();

        assert_eq!(NotificationPermission::Granted, result.permission);
        assert_eq!("Notification permission is granted.", result.message);
    }

    #[test]
    fn capability_notification_uses_the_clock_and_platform_boundary() {
        let platform = MemoryNotificationPlatform::prompting();
        *platform.permission.lock().unwrap() = NotificationPermission::Granted;
        let application = NotificationApplication::new(platform.clone(), FixedClock::at(1_000_000));

        let result = application.schedule_capability().unwrap();

        assert_eq!(Some(1_010_000), result.scheduled_for_epoch_millis);
        assert_eq!("Capability notification scheduled.", result.message);
        assert_eq!(
            vec![NotificationIntent {
                deliver_at_epoch_millis: 1_010_000,
                title: "Personal Dashboard",
                body: "Mac notification capability delivered while the window was closed.",
            }],
            *platform.scheduled.lock().unwrap()
        );
    }

    #[test]
    fn reopening_capability_state_does_not_schedule_a_duplicate() {
        let platform = MemoryNotificationPlatform::prompting();
        *platform.permission.lock().unwrap() = NotificationPermission::Granted;
        let clock = FixedClock::at(1_000_000);
        let application = NotificationApplication::new(platform.clone(), clock.clone());
        application.schedule_capability().unwrap();
        clock.advance_to(1_010_001);

        let reopened = application.state().unwrap();

        assert_eq!(Some(1_010_000), reopened.scheduled_for_epoch_millis);
        assert_eq!(
            "Capability notification delivery time has passed.",
            reopened.message
        );
        assert_eq!(1, platform.scheduled.lock().unwrap().len());
    }
}
