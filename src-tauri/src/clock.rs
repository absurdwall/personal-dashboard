use crate::exercise::ExerciseClock;
use crate::notification::Clock;
use crate::today::TodayClock;
use std::time::{SystemTime, UNIX_EPOCH};

#[derive(Clone, Copy)]
pub struct SystemClock;

impl Clock for SystemClock {
    fn now_epoch_millis(&self) -> i64 {
        system_epoch_millis()
    }
}

impl ExerciseClock for SystemClock {
    fn now_epoch_millis(&self) -> i64 {
        system_epoch_millis()
    }

    fn utc_offset_minutes_at(&self, epoch_millis: i64) -> i32 {
        platform_utc_offset_minutes(epoch_millis)
    }
}

impl TodayClock for SystemClock {
    fn current_date(&self) -> String {
        let epoch_millis = system_epoch_millis();
        let offset_millis = i64::from(platform_utc_offset_minutes(epoch_millis)) * 60_000;
        let local_days = (epoch_millis + offset_millis).div_euclid(86_400_000);
        let (year, month, day) = civil_date_from_unix_days(local_days);
        format!("{year:04}-{month:02}-{day:02}")
    }

    fn current_time_label(&self) -> String {
        let epoch_millis = system_epoch_millis();
        let offset_millis = i64::from(platform_utc_offset_minutes(epoch_millis)) * 60_000;
        let local_millis = (epoch_millis + offset_millis).rem_euclid(86_400_000);
        let hour = local_millis / 3_600_000;
        let minute = local_millis % 3_600_000 / 60_000;
        format!("{hour:02}:{minute:02}")
    }
}

fn civil_date_from_unix_days(unix_days: i64) -> (i64, i64, i64) {
    let shifted_days = unix_days + 719_468;
    let era = shifted_days.div_euclid(146_097);
    let day_of_era = shifted_days - era * 146_097;
    let year_of_era =
        (day_of_era - day_of_era / 1_460 + day_of_era / 36_524 - day_of_era / 146_096) / 365;
    let mut year = year_of_era + era * 400;
    let day_of_year = day_of_era - (365 * year_of_era + year_of_era / 4 - year_of_era / 100);
    let month_prime = (5 * day_of_year + 2) / 153;
    let day = day_of_year - (153 * month_prime + 2) / 5 + 1;
    let month = month_prime + if month_prime < 10 { 3 } else { -9 };
    year += i64::from(month <= 2);
    (year, month, day)
}

fn system_epoch_millis() -> i64 {
    if let Ok(value) = std::env::var("PERSONAL_DASHBOARD_NOW_EPOCH_MILLIS") {
        if let Ok(epoch_millis) = value.parse::<i64>() {
            return epoch_millis;
        }
    }
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .expect("the system clock must be after the Unix epoch")
        .as_millis() as i64
}

#[cfg(all(unix, target_pointer_width = "64"))]
fn platform_utc_offset_minutes(epoch_millis: i64) -> i32 {
    if let Ok(value) = std::env::var("PERSONAL_DASHBOARD_UTC_OFFSET_MINUTES") {
        if let Ok(offset_minutes) = value.parse::<i32>() {
            return offset_minutes;
        }
    }
    use std::ffi::{c_char, c_int, c_long};
    use std::mem::MaybeUninit;

    #[repr(C)]
    struct PlatformTime {
        tm_sec: c_int,
        tm_min: c_int,
        tm_hour: c_int,
        tm_mday: c_int,
        tm_mon: c_int,
        tm_year: c_int,
        tm_wday: c_int,
        tm_yday: c_int,
        tm_isdst: c_int,
        tm_gmtoff: c_long,
        tm_zone: *const c_char,
    }

    unsafe extern "C" {
        fn localtime_r(time: *const i64, result: *mut PlatformTime) -> *mut PlatformTime;
    }

    let epoch_seconds = epoch_millis.div_euclid(1_000);
    let mut local = MaybeUninit::<PlatformTime>::uninit();
    let result = unsafe { localtime_r(&epoch_seconds, local.as_mut_ptr()) };
    if result.is_null() {
        return 0;
    }
    let local = unsafe { local.assume_init() };
    (local.tm_gmtoff / 60) as i32
}

#[cfg(not(all(unix, target_pointer_width = "64")))]
fn platform_utc_offset_minutes(_epoch_millis: i64) -> i32 {
    0
}
