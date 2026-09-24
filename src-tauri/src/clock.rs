use crate::exercise::ExerciseClock;
use crate::notification::Clock;
use crate::today::{wall_time_components, LocalWallTimeResolution, TodayClock, TodayClockView};
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
        self.current_local_time().date
    }

    fn current_time_label(&self) -> String {
        self.current_local_time().time
    }

    fn current_timestamp_label(&self) -> String {
        let (clock, offset_minutes) = system_clock_snapshot();
        let sign = if offset_minutes < 0 { '-' } else { '+' };
        let absolute_offset = offset_minutes.unsigned_abs();
        format!(
            "{}T{}{sign}{:02}:{:02}",
            clock.date,
            clock.time,
            absolute_offset / 60,
            absolute_offset % 60
        )
    }

    fn current_local_time(&self) -> TodayClockView {
        system_clock_snapshot().0
    }

    fn resolve_local_wall_time(&self, date: &str, minute: u16) -> LocalWallTimeResolution {
        if wall_time_components(date, minute).is_none() {
            return LocalWallTimeResolution::Nonexistent;
        }
        if let Ok(value) = std::env::var("PERSONAL_DASHBOARD_UTC_OFFSET_MINUTES") {
            if let Ok(utc_offset_minutes) = value.parse::<i32>() {
                return LocalWallTimeResolution::Unique { utc_offset_minutes };
            }
        }
        platform_resolve_local_wall_time(date, minute)
    }
}

fn system_clock_snapshot() -> (TodayClockView, i32) {
    let epoch_millis = system_epoch_millis();
    let utc_offset_minutes = platform_utc_offset_minutes(epoch_millis);
    (
        clock_view_from_epoch_and_offset(epoch_millis, utc_offset_minutes),
        utc_offset_minutes,
    )
}

pub(crate) fn clock_view_from_epoch_and_offset(
    epoch_millis: i64,
    utc_offset_minutes: i32,
) -> TodayClockView {
    let local_millis = epoch_millis + i64::from(utc_offset_minutes) * 60_000;
    let (year, month, day) = civil_date_from_unix_days(local_millis.div_euclid(86_400_000));
    let within_day = local_millis.rem_euclid(86_400_000);
    TodayClockView {
        date: format!("{year:04}-{month:02}-{day:02}"),
        time: format!(
            "{:02}:{:02}",
            within_day / 3_600_000,
            within_day % 3_600_000 / 60_000
        ),
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

#[cfg(all(unix, target_pointer_width = "64"))]
fn platform_resolve_local_wall_time(date: &str, minute: u16) -> LocalWallTimeResolution {
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
        fn mktime(time: *mut PlatformTime) -> c_long;
        fn localtime_r(time: *const c_long, result: *mut PlatformTime) -> *mut PlatformTime;
    }

    let Some((year, month, day, hour, minute)) = wall_time_components(date, minute) else {
        return LocalWallTimeResolution::Nonexistent;
    };
    let mut candidates = Vec::new();
    for is_dst in [-1, 0, 1] {
        let mut requested = PlatformTime {
            tm_sec: 0,
            tm_min: minute,
            tm_hour: hour,
            tm_mday: day,
            tm_mon: month - 1,
            tm_year: year - 1900,
            tm_wday: 0,
            tm_yday: 0,
            tm_isdst: is_dst,
            tm_gmtoff: 0,
            tm_zone: std::ptr::null(),
        };
        let epoch_seconds = unsafe { mktime(&mut requested) };
        let mut roundtrip = MaybeUninit::<PlatformTime>::uninit();
        let result = unsafe { localtime_r(&epoch_seconds, roundtrip.as_mut_ptr()) };
        if result.is_null() {
            continue;
        }
        let roundtrip = unsafe { roundtrip.assume_init() };
        if roundtrip.tm_year == year - 1900
            && roundtrip.tm_mon == month - 1
            && roundtrip.tm_mday == day
            && roundtrip.tm_hour == hour
            && roundtrip.tm_min == minute
            && !candidates
                .iter()
                .any(|(candidate, _): &(c_long, i32)| *candidate == epoch_seconds)
        {
            candidates.push((epoch_seconds, (roundtrip.tm_gmtoff / 60) as i32));
        }
    }
    match candidates.as_slice() {
        [] => LocalWallTimeResolution::Nonexistent,
        [(_, utc_offset_minutes)] => LocalWallTimeResolution::Unique {
            utc_offset_minutes: *utc_offset_minutes,
        },
        _ => LocalWallTimeResolution::Ambiguous,
    }
}

#[cfg(not(all(unix, target_pointer_width = "64")))]
fn platform_resolve_local_wall_time(date: &str, minute: u16) -> LocalWallTimeResolution {
    match wall_time_components(date, minute) {
        Some(_) => LocalWallTimeResolution::Unique {
            utc_offset_minutes: 0,
        },
        None => LocalWallTimeResolution::Nonexistent,
    }
}

#[cfg(not(all(unix, target_pointer_width = "64")))]
fn platform_utc_offset_minutes(_epoch_millis: i64) -> i32 {
    0
}

#[cfg(test)]
mod tests {
    use super::clock_view_from_epoch_and_offset;

    #[test]
    fn snapshot_keeps_date_and_time_on_the_same_side_of_midnight() {
        let before = clock_view_from_epoch_and_offset(14_399_000, -240);
        assert_eq!(
            (before.date.as_str(), before.time.as_str()),
            ("1969-12-31", "23:59")
        );
        let after = clock_view_from_epoch_and_offset(14_400_000, -240);
        assert_eq!(
            (after.date.as_str(), after.time.as_str()),
            ("1970-01-01", "00:00")
        );
    }
}
