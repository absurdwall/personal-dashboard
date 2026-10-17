//! Bounded witnesses on the existing work-history items. A runtime diff is a
//! witness from that runtime; current file readback is a separate observation.
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::fs;
use std::io::Read;
use std::path::{Component, Path, PathBuf};

const MAX_CHANGE_BYTES: usize = 64 * 1024;
const MAX_FILE_CHANGES: usize = 32;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CollaborationChangeEvidence {
    pub id: String,
    pub source: String,
    pub object_id: Option<String>,
    pub path: Option<String>,
    pub operation: String,
    pub receipt_id: Option<String>,
    pub target_date: Option<String>,
    pub before_revision: Option<String>,
    pub after_revision: Option<String>,
    pub diff: Option<String>,
    pub verification: String,
    pub observed_at_ms: Option<u64>,
    pub gaps: Vec<String>,
    #[serde(default)]
    pub move_path: Option<String>,
}

pub(super) fn native_changes(
    item_id: &str,
    value: &Value,
) -> (Vec<CollaborationChangeEvidence>, Option<String>) {
    let Some(changes) = value.as_array() else {
        return (
            Vec::new(),
            Some("Native file-change snapshot did not provide actual changes/diff.".into()),
        );
    };
    if changes.is_empty() {
        return (
            Vec::new(),
            Some("Native file-change snapshot provided no actual changes/diff.".into()),
        );
    }
    let evidence = changes
        .iter()
        .take(MAX_FILE_CHANGES)
        .enumerate()
        .map(|(index, change)| {
            let diff = change["diff"]
                .as_str()
                .filter(|diff| !diff.is_empty() && diff.len() <= MAX_CHANGE_BYTES)
                .map(str::to_owned);
            let mut gaps = vec![
                "Before bytes/revision were not observed; item start may occur after the write."
                    .into(),
            ];
            if diff.is_none() {
                gaps.push(
                    "Actual native diff unavailable, empty or exceeds the 64 KiB evidence bound."
                        .into(),
                );
            }
            CollaborationChangeEvidence {
                id: format!("{item_id}:native:{index}"),
                source: "nativeFileChange".into(),
                object_id: None,
                path: change["path"]
                    .as_str()
                    .filter(|s| s.len() <= 4096)
                    .map(str::to_owned),
                operation: change["kind"]["type"]
                    .as_str()
                    .filter(|s| ["add", "update", "delete"].contains(s))
                    .unwrap_or("unknown")
                    .into(),
                receipt_id: None,
                target_date: None,
                before_revision: None,
                after_revision: None,
                diff,
                verification: "unobserved".into(),
                observed_at_ms: None,
                gaps,
                move_path: change["kind"]["move_path"]
                    .as_str()
                    .filter(|s| s.len() <= 4096)
                    .map(str::to_owned),
            }
        })
        .collect();
    (
        evidence,
        (changes.len() > MAX_FILE_CHANGES).then(|| {
            "Native change list exceeds 32 entries; omitted entries are an evidence gap.".into()
        }),
    )
}

fn absolute(path: &Path, cwd: &Path) -> Option<PathBuf> {
    let path = if path.is_absolute() {
        path.to_owned()
    } else {
        cwd.join(path)
    };
    let mut normalized = PathBuf::new();
    for part in path.components() {
        match part {
            Component::ParentDir => {
                if !normalized.pop() {
                    return None;
                }
            }
            Component::CurDir => {}
            other => normalized.push(other.as_os_str()),
        }
    }
    normalized.is_absolute().then_some(normalized)
}

fn scoped_path(path: &str, vault: &Path, cwd: &Path) -> Result<(PathBuf, String), String> {
    let candidate = absolute(Path::new(path), cwd)
        .ok_or("File-change path could not be resolved against captured cwd.")?;
    // macOS may spell the selected root through /var -> /private/var. Resolve
    // only the root alias, retaining the relative spelling to reject redirects
    // inside life/ rather than hiding them by canonicalizing the final file.
    let root_alias = if candidate.starts_with(vault) {
        vault
    } else {
        candidate
            .ancestors()
            .filter(|ancestor| ancestor.canonicalize().ok().as_deref() == Some(vault))
            .last()
            .ok_or("File-change path is outside the captured selected Vault.")?
    };
    let relative = candidate
        .strip_prefix(root_alias)
        .map_err(|_| "File-change path is outside the captured selected Vault.")?;
    let relative_text = relative
        .to_str()
        .ok_or("File-change path is not valid UTF-8.")?;
    if !relative.starts_with("life")
        || relative == Path::new("life")
        || relative == Path::new("life/Self.md")
        || (relative.starts_with("life/.personal-dashboard")
            && relative != Path::new("life/.personal-dashboard/habit-names/v1/names.json"))
    {
        return Err(
            "File-change path is outside ordinary life/ scope or requires a managed operation."
                .into(),
        );
    }
    let relative_text = relative_text.to_owned();
    Ok((vault.join(&relative_text), relative_text))
}

fn check_redirects(vault: &Path, relative: &Path) -> Result<(), String> {
    let mut current = vault.to_owned();
    for component in relative.components() {
        current.push(component.as_os_str());
        match fs::symlink_metadata(&current) {
            Ok(metadata) if metadata.file_type().is_symlink() => {
                return Err("File-change evidence refuses redirected/symlink paths.".into())
            }
            Ok(_) => {}
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => {}
            Err(_) => return Err("File-change path metadata could not be observed.".into()),
        }
    }
    Ok(())
}

pub(super) struct NativeChangeObservationContext<'a> {
    pub selected_vault: Option<&'a Path>,
    pub working_directory: &'a Path,
    pub target_date: &'a str,
    pub item_authoritative: bool,
    pub item_status: &'a str,
    pub automatic_round: bool,
    pub previous_witnesses: &'a [CollaborationChangeEvidence],
    pub observed_at_ms: u64,
}

fn check_change_redirects(
    vault: &Path,
    relative: &str,
    move_path: Option<&str>,
) -> Result<(), String> {
    check_redirects(vault, Path::new(relative))?;
    move_path
        .map(|path| check_redirects(vault, Path::new(path)))
        .unwrap_or(Ok(()))
}

pub(super) fn observe_native(
    item_id: &str,
    evidence: &mut CollaborationChangeEvidence,
    context: NativeChangeObservationContext<'_>,
) {
    let NativeChangeObservationContext {
        selected_vault: vault,
        working_directory: cwd,
        target_date,
        item_authoritative: authoritative,
        item_status: status,
        automatic_round: automatic,
        previous_witnesses: previous,
        observed_at_ms: now,
    } = context;
    evidence.target_date = Some(target_date.into());
    let resolved = (|| {
        if automatic {
            return Err("Automatic round cannot publish ordinary file-write evidence.".to_owned());
        }
        let vault = vault.ok_or("Captured selected Vault unavailable for file evidence.")?;
        let (path, relative) = scoped_path(
            evidence
                .path
                .as_deref()
                .ok_or("Native file-change path unavailable.")?,
            vault,
            cwd,
        )?;
        if let Some(moved) = evidence.move_path.as_deref() {
            scoped_path(moved, vault, cwd)?;
        }
        Ok((path, relative))
    })();
    let (path, relative) = match resolved {
        Ok(value) => value,
        Err(gap) => {
            evidence.path = None;
            evidence.move_path = None;
            evidence.diff = None;
            evidence.verification = "scopeRejected".into();
            evidence.gaps.push(gap);
            return;
        }
    };
    evidence.path = Some(relative.clone());
    if let Some(move_path) = evidence.move_path.as_deref() {
        evidence.move_path = vault.and_then(|vault| {
            scoped_path(move_path, vault, cwd)
                .ok()
                .map(|(_, relative)| relative)
        });
    }
    if let Some(date) = evidence
        .move_path
        .as_deref()
        .unwrap_or(&relative)
        .strip_prefix("life/Journal/Daily/")
        .and_then(|name| name.strip_suffix(".md"))
        .filter(|date| super::validate_date(date).is_ok())
    {
        evidence.target_date = Some(date.to_owned());
    }
    evidence.id = format!(
        "{item_id}:{}",
        super::stable_effect_fingerprint(&json!([
            relative,
            evidence.operation,
            evidence.move_path
        ]))
    );
    if let Some(saved) = previous
        .iter()
        .find(|saved| saved.id == evidence.id && saved.observed_at_ms.is_some())
    {
        // Later full snapshots/deltas retain the observation made at completion,
        // rather than auditing a newer file under an old event's identity.
        *evidence = saved.clone();
        if let Some(vault) = vault {
            let scope = check_change_redirects(vault, &relative, evidence.move_path.as_deref());
            if scope.is_err() {
                let gap = "Later path scope is redirected/unavailable; original observation retained without new readback.".to_owned();
                if !evidence.gaps.contains(&gap) {
                    evidence.gaps.push(gap);
                }
            }
        }
        return;
    }
    if let Some(vault) = vault {
        let scope = check_change_redirects(vault, &relative, evidence.move_path.as_deref());
        if let Err(gap) = scope {
            evidence.path = None;
            evidence.move_path = None;
            evidence.diff = None;
            evidence.verification = "scopeRejected".into();
            evidence.gaps.push(gap);
            return;
        }
    }
    if !authoritative || !["completed", "succeeded"].contains(&status) {
        return;
    }
    evidence.observed_at_ms = Some(now);
    let result_path = evidence
        .move_path
        .as_ref()
        .and_then(|move_path| vault.map(|vault| vault.join(move_path)))
        .unwrap_or(path);
    let result = (|| {
        if !fs::symlink_metadata(&result_path).map_err(|_| "File-change result readback unavailable; runtime status alone is not source confirmation.")?.file_type().is_file() {
            return Err("File-change result is not a regular unredirected file.");
        }
        let file = fs::File::open(&result_path).map_err(|_| "File-change result readback unavailable; runtime status alone is not source confirmation.")?;
        if !file
            .metadata()
            .map_err(|_| "Result metadata unavailable.")?
            .is_file()
        {
            return Err("File-change result is not a regular file.");
        }
        let mut bytes = Vec::new();
        file.take((MAX_CHANGE_BYTES + 1) as u64)
            .read_to_end(&mut bytes)
            .map_err(|_| "File-change result readback failed.")?;
        if bytes.len() > MAX_CHANGE_BYTES {
            return Err("File-change result exceeds the 64 KiB readback bound.");
        }
        Ok(super::stable_effect_fingerprint(&bytes))
    })();
    match result {
        Ok(revision) => {
            evidence.after_revision = Some(revision);
            evidence.verification = "sourceObserved".into();
            evidence.gaps.push("Result revision is current readback after the event, not a guaranteed immediate post-patch snapshot or proof of original intent.".into());
        }
        Err(gap) => evidence.gaps.push(gap.into()),
    }
}

pub(super) fn memory_evidence(
    proposal: &super::StoredCollaborationMemoryProposal,
    observed: Option<&crate::collaboration_memory::LongTermMemoryDocumentView>,
) -> CollaborationChangeEvidence {
    let verified = observed.is_some_and(|view| {
        view.state == "ready"
            && proposal.expected_document_fingerprint.as_deref()
                == Some(&super::stable_effect_fingerprint(&view.content))
    });
    let mut gaps = vec!["Before revision was observed when the revision-guarded proposal was prepared; complete document bytes are not retained.".into()];
    if !verified {
        gaps.push("Independent current background readback is unavailable or differs from the expected complete document; the original save outcome remains separate.".into());
    }
    CollaborationChangeEvidence {
        id: format!("{}:background", proposal.id),
        source: "managedMemory".into(),
        object_id: Some("life/Self.md".into()),
        path: Some("life/Self.md".into()),
        operation: if proposal.replaces.is_some() {
            "correct"
        } else {
            "append"
        }
        .into(),
        receipt_id: Some(proposal.id.clone()),
        target_date: None,
        before_revision: Some(proposal.source_revision.clone()),
        after_revision: observed.and_then(|view| view.revision.clone()),
        diff: None,
        verification: if verified { "verified" } else { "unconfirmed" }.into(),
        observed_at_ms: Some(
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap_or_default()
                .as_millis() as u64,
        ),
        gaps,
        move_path: None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    fn root() -> PathBuf {
        let path = std::env::temp_dir().join(format!(
            "pdcr-change-{}-{}",
            std::process::id(),
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_nanos()
        ));
        fs::create_dir_all(path.join("life/.personal-dashboard/habit-names/v1")).unwrap();
        path.canonicalize().unwrap()
    }
    fn evidence(path: &Path, diff: &str) -> CollaborationChangeEvidence {
        native_changes(
            "file",
            &json!([{"path":path,"kind":{"type":"update"},"diff":diff}]),
        )
        .0
        .remove(0)
    }
    #[test]
    fn scope_rejects_managed_settings_source_other_vault_and_redirects() {
        let root = root();
        fs::write(root.join("life/ordinary.md"), "allowed").unwrap();
        #[cfg(unix)]
        std::os::unix::fs::symlink(root.join("life/ordinary.md"), root.join("life/redirect.md"))
            .unwrap();
        for relative in [
            "life/Self.md",
            "life/.personal-dashboard/tasks/v1/tasks.json",
            "settings.json",
            "src/app.rs",
            "../outside.md",
            "life/redirect.md",
        ] {
            let mut change = evidence(&root.join(relative), "private outside diff");
            observe_native(
                "file",
                &mut change,
                NativeChangeObservationContext {
                    selected_vault: Some(&root),
                    working_directory: &root,
                    target_date: "2026-10-09",
                    item_authoritative: true,
                    item_status: "completed",
                    automatic_round: false,
                    previous_witnesses: &[],
                    observed_at_ms: 1,
                },
            );
            assert_eq!(change.verification, "scopeRejected", "{relative}");
            assert!(
                change.path.is_none() && change.diff.is_none() && change.after_revision.is_none()
            );
        }
        let names = root.join("life/.personal-dashboard/habit-names/v1/names.json");
        fs::write(&names, "{}").unwrap();
        let mut allowed = evidence(&names, "+{}");
        observe_native(
            "file",
            &mut allowed,
            NativeChangeObservationContext {
                selected_vault: Some(&root),
                working_directory: &root,
                target_date: "2026-10-09",
                item_authoritative: true,
                item_status: "completed",
                automatic_round: false,
                previous_witnesses: &[],
                observed_at_ms: 2,
            },
        );
        assert_eq!(allowed.verification, "sourceObserved");
        fs::remove_dir_all(root).unwrap();
    }
    #[cfg(unix)]
    #[test]
    fn retained_witness_survives_later_source_redirection_without_reading_it() {
        let root = root();
        let path = root.join("life/file.md");
        fs::write(&path, "Original observed result").unwrap();
        let mut saved = evidence(&path, "+Original observed result");
        observe_native(
            "file",
            &mut saved,
            NativeChangeObservationContext {
                selected_vault: Some(&root),
                working_directory: &root,
                target_date: "2026-10-09",
                item_authoritative: true,
                item_status: "completed",
                automatic_round: false,
                previous_witnesses: &[],
                observed_at_ms: 1,
            },
        );
        fs::remove_file(&path).unwrap();
        std::os::unix::fs::symlink(root.join("settings.json"), &path).unwrap();
        let mut incoming = evidence(&path, "+Original observed result");
        observe_native(
            "file",
            &mut incoming,
            NativeChangeObservationContext {
                selected_vault: Some(&root),
                working_directory: &root,
                target_date: "2026-10-09",
                item_authoritative: true,
                item_status: "completed",
                automatic_round: false,
                previous_witnesses: &[saved.clone()],
                observed_at_ms: 2,
            },
        );
        assert_eq!(incoming.after_revision, saved.after_revision);
        assert_eq!(incoming.observed_at_ms, saved.observed_at_ms);
        assert_eq!(incoming.diff, saved.diff);
        assert_eq!(incoming.verification, "sourceObserved");
        assert!(incoming
            .gaps
            .iter()
            .any(|gap| gap.contains("original observation retained")));
        fs::remove_dir_all(root).unwrap();
    }
    #[test]
    #[cfg(unix)]
    fn redirected_move_destination_rejects_new_witness_but_retains_prior_observation() {
        let root = root();
        let source = root.join("life/source.md");
        let destination = root.join("life/destination.md");
        fs::write(&source, "original").unwrap();
        fs::write(&destination, "observed move result").unwrap();
        let mut saved = evidence(&source, "actual move diff");
        saved.move_path = Some(destination.to_string_lossy().into());
        observe_native(
            "move",
            &mut saved,
            NativeChangeObservationContext {
                selected_vault: Some(&root),
                working_directory: &root,
                target_date: "2026-10-09",
                item_authoritative: true,
                item_status: "completed",
                automatic_round: false,
                previous_witnesses: &[],
                observed_at_ms: 1,
            },
        );
        assert_eq!(saved.verification, "sourceObserved");
        fs::remove_file(&destination).unwrap();
        std::os::unix::fs::symlink(root.join("settings.json"), &destination).unwrap();
        for retained in [false, true] {
            let mut incoming = evidence(&source, "actual move diff");
            incoming.move_path = Some(destination.to_string_lossy().into());
            let previous = if retained {
                vec![saved.clone()]
            } else {
                Vec::new()
            };
            observe_native(
                "move",
                &mut incoming,
                NativeChangeObservationContext {
                    selected_vault: Some(&root),
                    working_directory: &root,
                    target_date: "2026-10-09",
                    item_authoritative: true,
                    item_status: "completed",
                    automatic_round: false,
                    previous_witnesses: &previous,
                    observed_at_ms: 2,
                },
            );
            if retained {
                assert_eq!(incoming.after_revision, saved.after_revision);
                assert_eq!(incoming.observed_at_ms, saved.observed_at_ms);
                assert!(incoming
                    .gaps
                    .iter()
                    .any(|gap| gap.contains("original observation retained")));
            } else {
                assert_eq!(incoming.verification, "scopeRejected");
                assert!(
                    incoming.path.is_none()
                        && incoming.move_path.is_none()
                        && incoming.diff.is_none()
                );
                assert!(incoming.after_revision.is_none());
            }
        }
        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn cwd_missing_diff_readback_bounds_and_automatic_writes_are_explicit_gaps() {
        let root = root();
        let cwd = root.join("isolated-runtime");
        fs::create_dir_all(&cwd).unwrap();
        let mut wrong_cwd = evidence(Path::new("life/file.md"), "+wrong");
        observe_native(
            "file",
            &mut wrong_cwd,
            NativeChangeObservationContext {
                selected_vault: Some(&root),
                working_directory: &cwd,
                target_date: "2026-10-09",
                item_authoritative: true,
                item_status: "completed",
                automatic_round: false,
                previous_witnesses: &[],
                observed_at_ms: 1,
            },
        );
        assert_eq!(wrong_cwd.verification, "scopeRejected");
        let mut missing = evidence(&root.join("life/missing.md"), "");
        observe_native(
            "file",
            &mut missing,
            NativeChangeObservationContext {
                selected_vault: Some(&root),
                working_directory: &cwd,
                target_date: "2026-10-09",
                item_authoritative: true,
                item_status: "completed",
                automatic_round: false,
                previous_witnesses: &[],
                observed_at_ms: 1,
            },
        );
        assert!(missing.after_revision.is_none());
        assert!(missing
            .gaps
            .iter()
            .any(|gap| gap.contains("diff unavailable")));
        assert!(missing
            .gaps
            .iter()
            .any(|gap| gap.contains("readback unavailable")));
        let oversized = root.join("life/large.md");
        fs::write(&oversized, vec![b'a'; MAX_CHANGE_BYTES + 1]).unwrap();
        let mut bounded = evidence(&oversized, "+bounded");
        observe_native(
            "file",
            &mut bounded,
            NativeChangeObservationContext {
                selected_vault: Some(&root),
                working_directory: &cwd,
                target_date: "2026-10-09",
                item_authoritative: true,
                item_status: "completed",
                automatic_round: false,
                previous_witnesses: &[],
                observed_at_ms: 1,
            },
        );
        assert!(bounded.after_revision.is_none());
        assert!(bounded
            .gaps
            .iter()
            .any(|gap| gap.contains("64 KiB readback")));
        let mut automatic = evidence(&oversized, "+bounded");
        observe_native(
            "file",
            &mut automatic,
            NativeChangeObservationContext {
                selected_vault: Some(&root),
                working_directory: &cwd,
                target_date: "2026-10-09",
                item_authoritative: true,
                item_status: "completed",
                automatic_round: true,
                previous_witnesses: &[],
                observed_at_ms: 1,
            },
        );
        assert_eq!(automatic.verification, "scopeRejected");
        fs::remove_dir_all(root).unwrap();
    }
}

pub(super) fn attach_memory_evidence(
    session: &mut super::StoredCollaborationSession,
    proposal: &super::StoredCollaborationMemoryProposal,
) {
    let Some(evidence) = proposal.change_evidence.as_ref() else {
        return;
    };
    for history in &mut session.work_history {
        for item in &mut history.items {
            let key = format!(
                "{}:{}:{}",
                history.thread_id,
                history.turn_id,
                item.call_id.as_deref().unwrap_or(&item.item_id)
            );
            if key == proposal.tool_call_key {
                item.changes.retain(|change| change.id != evidence.id);
                item.changes.push(evidence.clone());
                item.change_gap = None;
            }
        }
    }
}
