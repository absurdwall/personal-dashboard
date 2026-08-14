use crate::notification::{NotificationIntent, NotificationPermission, NotificationPlatform};
use block2::RcBlock;
use objc2::runtime::Bool;
use objc2_foundation::NSString;
use objc2_user_notifications::{
    UNAuthorizationOptions, UNAuthorizationStatus, UNMutableNotificationContent,
    UNNotificationRequest, UNNotificationSettings, UNTimeIntervalNotificationTrigger,
    UNUserNotificationCenter,
};
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use std::{ptr::NonNull, sync::mpsc};

pub struct NativeNotificationPlatform;

impl NativeNotificationPlatform {
    pub fn new() -> Self {
        Self
    }
}

impl NotificationPlatform for NativeNotificationPlatform {
    fn permission(&self) -> Result<NotificationPermission, String> {
        macos_notification_permission()
    }

    fn request_permission(&self) -> Result<NotificationPermission, String> {
        request_macos_notification_permission()
    }

    fn schedule(&self, intent: NotificationIntent) -> Result<(), String> {
        schedule_macos_notification(intent)
    }
}

fn macos_notification_permission() -> Result<NotificationPermission, String> {
    let center = UNUserNotificationCenter::currentNotificationCenter();
    let (sender, receiver) = mpsc::channel();
    let completion = RcBlock::new(move |settings: NonNull<UNNotificationSettings>| {
        let settings = unsafe { settings.as_ref() };
        let _ = sender.send(map_macos_permission(settings.authorizationStatus()));
    });
    center.getNotificationSettingsWithCompletionHandler(&completion);
    receiver
        .recv_timeout(Duration::from_secs(5))
        .map_err(|_| "Timed out while reading macOS notification permission.".to_string())
}

fn request_macos_notification_permission() -> Result<NotificationPermission, String> {
    let current_permission = macos_notification_permission()?;
    if current_permission != NotificationPermission::Prompt {
        return Ok(current_permission);
    }

    let center = UNUserNotificationCenter::currentNotificationCenter();
    let completion = RcBlock::new(move |_granted: Bool, _error| {});
    center.requestAuthorizationWithOptions_completionHandler(
        UNAuthorizationOptions::Alert | UNAuthorizationOptions::Sound,
        &completion,
    );
    Ok(NotificationPermission::Prompt)
}

fn schedule_macos_notification(intent: NotificationIntent) -> Result<(), String> {
    let now_epoch_millis = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as i64;
    let delay_seconds = intent
        .deliver_at_epoch_millis
        .saturating_sub(now_epoch_millis) as f64
        / 1_000.0;
    let content = UNMutableNotificationContent::new();
    content.setTitle(&NSString::from_str(&intent.title));
    let body = if intent.detail.is_empty() {
        intent.body
    } else {
        format!("{} {}", intent.body, intent.detail)
    };
    content.setBody(&NSString::from_str(&body));
    let trigger = UNTimeIntervalNotificationTrigger::triggerWithTimeInterval_repeats(
        delay_seconds.max(1.0),
        false,
    );
    let request = UNNotificationRequest::requestWithIdentifier_content_trigger(
        &NSString::from_str(&intent.id),
        &content,
        Some(&trigger),
    );
    UNUserNotificationCenter::currentNotificationCenter()
        .addNotificationRequest_withCompletionHandler(&request, None);
    Ok(())
}

fn map_macos_permission(status: UNAuthorizationStatus) -> NotificationPermission {
    if status == UNAuthorizationStatus::NotDetermined {
        NotificationPermission::Prompt
    } else if status == UNAuthorizationStatus::Denied {
        NotificationPermission::Denied
    } else {
        NotificationPermission::Granted
    }
}
