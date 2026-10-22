use std::sync::atomic::{AtomicBool, Ordering};

/// One explicitly enabled local permission/capture attempt for this process.
/// Failure and cancellation consume the attempt too; no reset API is provided.
pub(crate) struct DiagnosticVoicePreflight(AtomicBool);
impl DiagnosticVoicePreflight {
    pub(crate) const fn new() -> Self { Self(AtomicBool::new(false)) }
    pub(crate) fn claim(&self) -> Result<(), String> {
        self.0.compare_exchange(false, true, Ordering::SeqCst, Ordering::SeqCst)
            .map(|_| ())
            .map_err(|_| "capture-unavailable".into())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn a_claim_is_consumed_before_any_permission_or_capture_outcome() {
        for _outcome in ["success", "failure", "cancel"] {
            let gate = DiagnosticVoicePreflight::new();
            assert!(gate.claim().is_ok());
            assert_eq!(gate.claim(), Err("capture-unavailable".into()));
        }
    }
    #[test]
    fn concurrent_claims_across_owners_allow_exactly_one_attempt() {
        let gate = std::sync::Arc::new(DiagnosticVoicePreflight::new());
        let owners: Vec<_> = (0..16).map(|_| {
            let gate = gate.clone();
            std::thread::spawn(move || gate.claim().is_ok())
        }).collect();
        assert_eq!(owners.into_iter().map(|owner| owner.join().unwrap() as usize).sum::<usize>(), 1);
        assert!(gate.claim().is_err(), "a later WebView owner cannot rearm the process");
    }
}
