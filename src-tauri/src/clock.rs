use crate::exercise::ExerciseClock;
use crate::notification::Clock;
use std::time::{SystemTime, UNIX_EPOCH};

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

fn system_epoch_millis() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .expect("the system clock must be after the Unix epoch")
        .as_millis() as i64
}

#[cfg(all(unix, target_pointer_width = "64"))]
fn platform_utc_offset_minutes(epoch_millis: i64) -> i32 {
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
