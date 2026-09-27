use crate::today::TodayWorkspacePersistence;
use serde::{Deserialize, Serialize};
use std::collections::hash_map::DefaultHasher;
use std::fs::{self, OpenOptions};
use std::hash::Hasher;
use std::io::Write;
#[cfg(unix)]
use std::os::unix::fs::OpenOptionsExt;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicU64, Ordering};

const LONG_TERM_CONTEXT_PATH: &str = "everyday/wiki/Life Operating Principles.md";
const ROUTINE_REFERENCE_PATH: &str = "everyday/.agents/skills/life-companion/SKILL.md";
const MAX_CONTEXT_BYTES: u64 = 64 * 1024;
static TEMPORARY_FILE_SEQUENCE: AtomicU64 = AtomicU64::new(1);

struct TemporaryMemoryFile(PathBuf);

impl TemporaryMemoryFile {
    fn new(path: PathBuf) -> Self {
        Self(path)
    }

    fn path(&self) -> &Path {
        &self.0
    }
}

impl Drop for TemporaryMemoryFile {
    fn drop(&mut self) {
        let _ = fs::remove_file(&self.0);
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LongTermMemoryDocumentView {
    pub state: String,
    pub source_path: String,
    pub content: String,
    pub revision: Option<String>,
    pub message: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RoutineMemoryReferenceView {
    pub state: String,
    pub source_path: String,
    pub content: String,
    pub message: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CollaborationMemorySources {
    pub long_term: LongTermMemoryDocumentView,
    pub routine_reference: RoutineMemoryReferenceView,
}

pub trait CollaborationMemoryService: Send + Sync {
    fn is_available(&self) -> bool {
        true
    }

    fn read(&self, expected_vault_key: Option<&str>) -> Result<CollaborationMemorySources, String>;

    fn save_long_term(
        &self,
        expected_vault_key: &str,
        expected_revision: &str,
        content: &str,
    ) -> Result<LongTermMemoryDocumentView, String>;
}

pub struct SelectedVaultCollaborationMemoryService {
    workspace_file: PathBuf,
}

impl SelectedVaultCollaborationMemoryService {
    pub fn new(workspace_file: PathBuf) -> Self {
        Self { workspace_file }
    }

    fn selected_vault(&self, expected_vault_key: Option<&str>) -> Result<Option<PathBuf>, String> {
        let persistence =
            crate::platform::FileTodayWorkspacePersistence::new(self.workspace_file.clone());
        let selected = persistence.load_selected_vault()?;
        let Some(vault) = selected else {
            if expected_vault_key.is_some() {
                return Err("The selected Vault changed before memory could be read.".into());
            }
            return Ok(None);
        };
        if !vault.is_dir() {
            return Err("The selected Vault is unavailable; memory was not read.".into());
        }
        let current_key = crate::collaboration::vault_key(&vault);
        if expected_vault_key != Some(current_key.as_str()) {
            return Err("The selected Vault changed before memory could be read.".into());
        }
        Ok(Some(vault))
    }
}

impl CollaborationMemoryService for SelectedVaultCollaborationMemoryService {
    fn read(&self, expected_vault_key: Option<&str>) -> Result<CollaborationMemorySources, String> {
        let Some(vault) = self.selected_vault(expected_vault_key)? else {
            return Ok(unconfigured_sources());
        };
        let root = vault
            .canonicalize()
            .map_err(|error| format!("Could not locate the selected Vault for memory: {error}"))?;
        Ok(CollaborationMemorySources {
            long_term: read_long_term_document(&root),
            routine_reference: read_routine_reference(&root),
        })
    }

    fn save_long_term(
        &self,
        expected_vault_key: &str,
        expected_revision: &str,
        content: &str,
    ) -> Result<LongTermMemoryDocumentView, String> {
        if content.trim().is_empty()
            || content.len() as u64 > MAX_CONTEXT_BYTES
            || content.contains('\0')
        {
            return Err("Long-term background must be valid text no larger than 64 KiB.".into());
        }
        let vault = self
            .selected_vault(Some(expected_vault_key))?
            .ok_or_else(|| {
                "Choose the selected Vault before updating long-term memory.".to_string()
            })?;
        let root = vault
            .canonicalize()
            .map_err(|error| format!("Could not locate the selected Vault for memory: {error}"))?;
        let path = existing_document_path(&root, LONG_TERM_CONTEXT_PATH)?;
        let current = read_required_document(&path, LONG_TERM_CONTEXT_PATH)?;
        if current.revision.as_deref() != Some(expected_revision) {
            return Err("Long-term background changed outside Personal Dashboard. Refresh memory and review the latest text before saving.".into());
        }

        let metadata = fs::metadata(&path)
            .map_err(|error| format!("Could not inspect long-term background: {error}"))?;
        let parent = path
            .parent()
            .ok_or_else(|| "Long-term background has no parent directory.".to_string())?;
        let nonce = TEMPORARY_FILE_SEQUENCE.fetch_add(1, Ordering::Relaxed);
        let temporary_path = parent.join(format!(
            ".personal-dashboard-memory-{}-{nonce}.tmp",
            std::process::id()
        ));
        let mut options = OpenOptions::new();
        options.create_new(true).write(true);
        #[cfg(unix)]
        options.mode(0o600);
        let mut file = options
            .open(&temporary_path)
            .map_err(|error| format!("Could not prepare the long-term memory update: {error}"))?;
        let temporary = TemporaryMemoryFile::new(temporary_path);
        if let Err(error) = file
            .write_all(content.as_bytes())
            .and_then(|_| file.sync_all())
        {
            return Err(format!(
                "Could not prepare the long-term memory update: {error}"
            ));
        }
        drop(file);
        if let Err(error) = fs::set_permissions(temporary.path(), metadata.permissions()) {
            return Err(format!(
                "Could not preserve long-term background permissions: {error}"
            ));
        }

        // Recheck both bindings after preparing the replacement, immediately before
        // the atomic rename, so stale UI edits cannot overwrite a newer Vault state.
        self.selected_vault(Some(expected_vault_key))?;
        let latest = read_required_document(&path, LONG_TERM_CONTEXT_PATH)?;
        if latest.revision.as_deref() != Some(expected_revision) {
            return Err("Long-term background changed while the update was being prepared. No content was overwritten; refresh memory and review again.".into());
        }
        if let Err(error) = fs::rename(temporary.path(), &path) {
            return Err(format!("Could not save long-term background: {error}"));
        }
        read_required_document(&path, LONG_TERM_CONTEXT_PATH)
    }
}

fn unconfigured_sources() -> CollaborationMemorySources {
    CollaborationMemorySources {
        long_term: LongTermMemoryDocumentView {
            state: "unconfigured".into(),
            source_path: LONG_TERM_CONTEXT_PATH.into(),
            content: String::new(),
            revision: None,
            message: "Choose the Tortilla Flat Vault to read long-term background.".into(),
        },
        routine_reference: RoutineMemoryReferenceView {
            state: "unconfigured".into(),
            source_path: ROUTINE_REFERENCE_PATH.into(),
            content: String::new(),
            message: "Choose the Tortilla Flat Vault to read its daily workflow reference.".into(),
        },
    }
}

fn read_long_term_document(root: &Path) -> LongTermMemoryDocumentView {
    match vault_relative_path(root, LONG_TERM_CONTEXT_PATH) {
        Ok(path) => match read_optional_document(&path, LONG_TERM_CONTEXT_PATH) {
            Ok(Some(document)) => document,
            Ok(None) => LongTermMemoryDocumentView {
                state: "missing".into(),
                source_path: LONG_TERM_CONTEXT_PATH.into(),
                content: String::new(),
                revision: None,
                message: "The existing Life Operating Principles document was not found. Personal Dashboard will not create a second profile.".into(),
            },
            Err(error) => memory_document_error(error),
        },
        Err(error) => memory_document_error(error),
    }
}

fn read_required_document(
    path: &Path,
    source_path: &str,
) -> Result<LongTermMemoryDocumentView, String> {
    let metadata = fs::symlink_metadata(path)
        .map_err(|error| format!("Could not read {source_path}: {error}"))?;
    if metadata.file_type().is_symlink() || !metadata.is_file() {
        return Err(format!(
            "{source_path} is not a regular file; no memory was changed."
        ));
    }
    if metadata.len() > MAX_CONTEXT_BYTES {
        return Err(format!(
            "{source_path} is larger than the 64 KiB memory limit."
        ));
    }
    let bytes = fs::read(path).map_err(|error| format!("Could not read {source_path}: {error}"))?;
    let content = String::from_utf8(bytes.clone())
        .map_err(|error| format!("{source_path} is not valid UTF-8: {error}"))?;
    Ok(LongTermMemoryDocumentView {
        state: "ready".into(),
        source_path: source_path.into(),
        content,
        revision: Some(memory_revision(&bytes)),
        message: "Loaded from the existing long-term background source.".into(),
    })
}

fn read_optional_document(
    path: &Path,
    source_path: &str,
) -> Result<Option<LongTermMemoryDocumentView>, String> {
    match fs::symlink_metadata(path) {
        Ok(_) => read_required_document(path, source_path).map(Some),
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(None),
        Err(error) => Err(format!("Could not inspect {source_path}: {error}")),
    }
}

fn read_routine_reference(root: &Path) -> RoutineMemoryReferenceView {
    let path = match vault_relative_path(root, ROUTINE_REFERENCE_PATH) {
        Ok(path) => path,
        Err(error) => {
            return RoutineMemoryReferenceView {
                state: "error".into(),
                source_path: ROUTINE_REFERENCE_PATH.into(),
                content: String::new(),
                message: error,
            }
        }
    };
    match read_text_file(&path, ROUTINE_REFERENCE_PATH) {
        Ok(Some(content)) => RoutineMemoryReferenceView {
            state: "ready".into(),
            source_path: ROUTINE_REFERENCE_PATH.into(),
            content,
            message: "Read-only daily workflow reference loaded from the selected Vault.".into(),
        },
        Ok(None) => RoutineMemoryReferenceView {
            state: "missing".into(),
            source_path: ROUTINE_REFERENCE_PATH.into(),
            content: String::new(),
            message: "The existing daily workflow reference was not found.".into(),
        },
        Err(error) => RoutineMemoryReferenceView {
            state: "error".into(),
            source_path: ROUTINE_REFERENCE_PATH.into(),
            content: String::new(),
            message: error,
        },
    }
}

fn read_text_file(path: &Path, source_path: &str) -> Result<Option<String>, String> {
    let metadata = match fs::symlink_metadata(path) {
        Ok(metadata) => metadata,
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => return Ok(None),
        Err(error) => return Err(format!("Could not inspect {source_path}: {error}")),
    };
    if metadata.file_type().is_symlink() || !metadata.is_file() {
        return Err(format!("{source_path} is not a regular file."));
    }
    if metadata.len() > MAX_CONTEXT_BYTES {
        return Err(format!(
            "{source_path} is larger than the 64 KiB reference limit."
        ));
    }
    let bytes = fs::read(path).map_err(|error| format!("Could not read {source_path}: {error}"))?;
    String::from_utf8(bytes)
        .map(Some)
        .map_err(|error| format!("{source_path} is not valid UTF-8: {error}"))
}

fn existing_document_path(root: &Path, relative: &str) -> Result<PathBuf, String> {
    let path = vault_relative_path(root, relative)?;
    let metadata = fs::symlink_metadata(&path).map_err(|error| {
        if error.kind() == std::io::ErrorKind::NotFound {
            format!("The existing long-term background {relative} is missing; Personal Dashboard will not create a duplicate profile.")
        } else {
            format!("Could not inspect {relative}: {error}")
        }
    })?;
    if metadata.file_type().is_symlink() || !metadata.is_file() {
        return Err(format!(
            "The long-term background {relative} is not a regular file."
        ));
    }
    Ok(path)
}

fn vault_relative_path(root: &Path, relative: &str) -> Result<PathBuf, String> {
    let relative_path = Path::new(relative);
    if relative_path.is_absolute()
        || relative_path
            .components()
            .any(|part| part == std::path::Component::ParentDir)
    {
        return Err("The memory source path is not inside the selected Vault.".into());
    }
    let root = root
        .canonicalize()
        .map_err(|error| format!("Could not locate the selected Vault: {error}"))?;
    let path = root.join(relative_path);
    match path.canonicalize() {
        Ok(canonical) if canonical.starts_with(&root) => Ok(canonical),
        Ok(_) => Err(format!("{relative} resolves outside the selected Vault.")),
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(path),
        Err(error) => Err(format!("Could not locate {relative}: {error}")),
    }
}

fn memory_document_error(message: String) -> LongTermMemoryDocumentView {
    LongTermMemoryDocumentView {
        state: "error".into(),
        source_path: LONG_TERM_CONTEXT_PATH.into(),
        content: String::new(),
        revision: None,
        message,
    }
}

fn memory_revision(bytes: &[u8]) -> String {
    let mut hasher = DefaultHasher::new();
    hasher.write(bytes);
    format!("memory-v1-{:016x}", hasher.finish())
}

#[cfg(test)]
mod tests {
    use super::{CollaborationMemoryService, SelectedVaultCollaborationMemoryService};
    use std::fs;
    use std::path::{Path, PathBuf};
    use std::sync::atomic::{AtomicU64, Ordering};
    use std::time::{SystemTime, UNIX_EPOCH};

    static SEQUENCE: AtomicU64 = AtomicU64::new(1);

    struct IsolatedVault(PathBuf);

    impl IsolatedVault {
        fn new() -> Self {
            let nonce = SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .expect("clock should be after epoch")
                .as_nanos();
            let sequence = SEQUENCE.fetch_add(1, Ordering::Relaxed);
            let root = std::env::temp_dir().join(format!(
                "dashboard-memory-test-{}-{nonce}-{sequence}",
                std::process::id()
            ));
            fs::create_dir_all(root.join("everyday/wiki")).unwrap();
            fs::create_dir_all(root.join("everyday/.agents/skills/life-companion")).unwrap();
            fs::write(
                root.join("everyday/wiki/Life Operating Principles.md"),
                "# Synthetic operating principles\n\nPrefer a short morning plan.\n",
            )
            .unwrap();
            fs::write(
                root.join("everyday/.agents/skills/life-companion/SKILL.md"),
                "# Synthetic daily workflow reference\nRead current facts first.\n",
            )
            .unwrap();
            Self(root)
        }

        fn path(&self) -> &Path {
            &self.0
        }
    }

    impl Drop for IsolatedVault {
        fn drop(&mut self) {
            let _ = fs::remove_dir_all(&self.0);
        }
    }

    fn workspace_file(root: &Path, selected: &Path) -> PathBuf {
        let file = root.join("app-data/today-workspace.json");
        fs::create_dir_all(file.parent().unwrap()).unwrap();
        fs::write(
            &file,
            serde_json::to_vec(&serde_json::json!({
                "schemaVersion": 1,
                "selectedVault": selected
            }))
            .unwrap(),
        )
        .unwrap();
        file
    }

    fn key(path: &Path) -> String {
        crate::collaboration::vault_key(path)
    }

    #[test]
    fn reads_the_existing_background_and_daily_reference_without_copying_them() {
        let vault = IsolatedVault::new();
        let service = SelectedVaultCollaborationMemoryService::new(workspace_file(
            vault.path(),
            vault.path(),
        ));

        let sources = service.read(Some(&key(vault.path()))).unwrap();

        assert_eq!(sources.long_term.state, "ready");
        assert!(sources
            .long_term
            .content
            .contains("Prefer a short morning plan."));
        assert_eq!(sources.routine_reference.state, "ready");
        assert!(sources
            .routine_reference
            .content
            .contains("Read current facts first."));
        assert_eq!(
            fs::read_dir(vault.path().join("everyday/wiki"))
                .unwrap()
                .count(),
            1
        );
    }

    #[test]
    fn saves_only_the_selected_existing_background_and_rejects_stale_versions() {
        let vault = IsolatedVault::new();
        let other = IsolatedVault::new();
        let workspace = workspace_file(vault.path(), vault.path());
        let service = SelectedVaultCollaborationMemoryService::new(workspace);
        let before = service.read(Some(&key(vault.path()))).unwrap().long_term;
        let revision = before.revision.clone().unwrap();
        let updated = service
            .save_long_term(
                &key(vault.path()),
                &revision,
                "# Synthetic operating principles\n\nPrefer a short morning plan.\n\nKeep Mondays open.\n",
            )
            .unwrap();

        assert_eq!(updated.state, "ready");
        assert!(updated.content.contains("Keep Mondays open."));
        assert!(fs::read_to_string(
            other
                .path()
                .join("everyday/wiki/Life Operating Principles.md")
        )
        .unwrap()
        .contains("Prefer a short morning plan."));
        assert!(service
            .save_long_term(&key(vault.path()), &revision, "stale overwrite")
            .unwrap_err()
            .contains("changed outside Personal Dashboard"));
        assert!(fs::read_to_string(
            vault
                .path()
                .join("everyday/wiki/Life Operating Principles.md")
        )
        .unwrap()
        .contains("Keep Mondays open."));
    }

    #[test]
    fn refuses_a_long_term_write_after_the_selected_vault_changes() {
        let vault = IsolatedVault::new();
        let other = IsolatedVault::new();
        let workspace = workspace_file(vault.path(), vault.path());
        let service = SelectedVaultCollaborationMemoryService::new(workspace.clone());
        let before = service.read(Some(&key(vault.path()))).unwrap().long_term;
        workspace_file(vault.path(), other.path());

        assert!(service
            .save_long_term(
                &key(vault.path()),
                before.revision.as_deref().unwrap(),
                "must not cross Vaults"
            )
            .unwrap_err()
            .contains("selected Vault changed"));
        assert!(fs::read_to_string(
            vault
                .path()
                .join("everyday/wiki/Life Operating Principles.md")
        )
        .unwrap()
        .contains("Prefer a short morning plan."));
    }
}
