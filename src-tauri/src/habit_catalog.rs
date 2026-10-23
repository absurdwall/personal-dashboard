pub use crate::habits::HabitGoalTarget;
use crate::habits::{
    DayRelation, HabitCellStatus, HabitCellView, HabitDefinitionView, HabitDetailView,
    HabitGoalContextView, HabitGoalRevisionView, HabitLifecycleChangeView,
    HabitLocalCompletionState, HabitLocalizedNames, HabitSnapshotView, HabitView,
    LocalHabitCompletion,
};
use crate::today::CalendarDate;
use serde::{Deserialize, Serialize};
use std::collections::{BTreeMap, HashSet};
use std::fs;
use std::path::Path;

pub const CATALOG_RELATIVE_PATH: &str =
    "life/.personal-dashboard/habit-definitions/v1/catalog.json";
const CATALOG_SCHEMA_VERSION: u32 = 1;

#[derive(Debug, Clone, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct HabitDefinitionMutationInput {
    pub operation_id: String,
    pub target_binding: String,
    pub expected_revision: Option<String>,
    pub habit_key: Option<String>,
    pub language: String,
    pub name: String,
    pub emoji: Option<String>,
    pub group: Option<String>,
    pub start_date: Option<String>,
    pub goal: Option<HabitGoalTarget>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum HabitMutationOutcome {
    Created,
    Updated,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HabitDefinitionSaveResult {
    pub outcome: HabitMutationOutcome,
    pub operation_id: String,
    pub habit_key: String,
    pub revision: String,
    pub snapshot: HabitSnapshotView,
}

#[derive(Debug, Clone, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct HabitLifecycleMutationInput {
    pub operation_id: String,
    pub target_binding: String,
    pub expected_revision: Option<String>,
    pub habit_key: String,
    pub active: bool,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HabitLifecycleSaveResult {
    pub operation_id: String,
    pub habit_key: String,
    pub active: bool,
    pub revision: String,
    pub snapshot: HabitSnapshotView,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct HabitCatalogDocument {
    schema_version: u32,
    habits: BTreeMap<String, HabitDefinition>,
    #[serde(default)]
    operations: Vec<HabitCatalogOperationReceipt>,
}

impl Default for HabitCatalogDocument {
    fn default() -> Self {
        Self {
            schema_version: CATALOG_SCHEMA_VERSION,
            habits: BTreeMap::new(),
            operations: Vec::new(),
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct HabitDefinition {
    key: String,
    origin: HabitDefinitionOrigin,
    base_name: String,
    source_localized_names: HabitLocalizedNames,
    name_overrides: HabitLocalizedNames,
    emoji: Option<String>,
    group: Option<String>,
    start_date: Option<String>,
    #[serde(default)]
    lifecycle_active: Option<bool>,
    #[serde(default)]
    lifecycle_history: Vec<HabitLifecycleChange>,
    source_goal_target: Option<HabitGoalTarget>,
    source_goal_history: Vec<HabitGoalContextView>,
    goal_revisions: Vec<HabitGoalRevision>,
    created_at: String,
    modified_at: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct HabitLifecycleChange {
    operation_id: String,
    active: bool,
    effective_from: String,
    changed_at: String,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
enum HabitDefinitionOrigin {
    Local,
    Sourced,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct HabitGoalRevision {
    id: String,
    effective_from: String,
    goal: HabitGoalTarget,
    status: HabitGoalRevisionStatus,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
enum HabitGoalRevisionStatus {
    Active,
    Superseded,
    Cancelled,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct HabitCatalogOperationReceipt {
    id: String,
    fingerprint: String,
    habit_key: String,
    outcome: HabitMutationOutcome,
    accepted_at: String,
}

pub(crate) struct HabitCatalogMutation {
    pub document: HabitCatalogDocument,
    pub habit_key: String,
    pub outcome: HabitMutationOutcome,
    pub changed: bool,
}

pub fn canonical_path(vault: &std::path::Path) -> std::path::PathBuf {
    vault.join(CATALOG_RELATIVE_PATH)
}

#[derive(Clone, Copy)]
pub struct FileHabitCatalogStore;

impl FileHabitCatalogStore {
    pub fn load(&self, path: &Path) -> Result<Option<Vec<u8>>, String> {
        match fs::read(path) {
            Ok(document) => Ok(Some(document)),
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(None),
            Err(error) => Err(format!("无法读取本地 Habit 定义正本：{error}")),
        }
    }

    pub fn save_if_unchanged(
        &self,
        path: &Path,
        expected: &[u8],
        updated: &[u8],
    ) -> Result<(), String> {
        crate::today::save_file_if_unchanged(
            path,
            expected,
            updated,
            crate::today::StorageDocumentKind::HabitCatalog,
            |_| Ok(()),
        )
    }

    pub fn create_new(&self, path: &Path, document: &[u8]) -> Result<(), String> {
        crate::today::create_new_file(
            path,
            document,
            crate::today::StorageDocumentKind::HabitCatalog,
        )
    }
}

pub fn target_binding(path: &std::path::Path) -> String {
    format!(
        "habit-catalog-target-{}",
        crate::today::document_revision(path.to_string_lossy().as_bytes())
    )
}

pub(crate) fn revision(bytes: &[u8]) -> String {
    crate::today::document_revision(bytes)
}

pub(crate) fn operation_applied(
    document: &HabitCatalogDocument,
    operation_id: &str,
    habit_key: &str,
) -> bool {
    document
        .operations
        .iter()
        .any(|receipt| receipt.id == operation_id && receipt.habit_key == habit_key)
}

pub(crate) fn parse_document(bytes: &[u8]) -> Result<HabitCatalogDocument, String> {
    let document: HabitCatalogDocument = serde_json::from_slice(bytes)
        .map_err(|error| format!("本地 Habit 定义正本不是有效 JSON：{error}"))?;
    validate_document(&document)?;
    Ok(document)
}

pub(crate) fn encode_document(document: &HabitCatalogDocument) -> Result<Vec<u8>, String> {
    validate_document(document)?;
    let mut bytes = serde_json::to_vec_pretty(document)
        .map_err(|error| format!("无法编码本地 Habit 定义正本：{error}"))?;
    bytes.push(b'\n');
    Ok(bytes)
}

pub(crate) fn apply_mutation(
    existing: Option<HabitCatalogDocument>,
    current_revision: Option<&str>,
    input: &HabitDefinitionMutationInput,
    snapshot: &HabitSnapshotView,
    today: &str,
    timestamp: &str,
) -> Result<HabitCatalogMutation, String> {
    validate_mutation(input, today)?;
    let fingerprint = mutation_fingerprint(input)?;
    let mut document = existing.unwrap_or_default();

    if let Some(receipt) = document
        .operations
        .iter()
        .find(|receipt| receipt.id == input.operation_id)
    {
        if receipt.fingerprint != fingerprint {
            return Err("该 Habit 操作标识已用于不同修改；没有写入任何内容。".into());
        }
        return Ok(HabitCatalogMutation {
            habit_key: receipt.habit_key.clone(),
            outcome: receipt.outcome,
            changed: false,
            document,
        });
    }

    if input.expected_revision.as_deref() != current_revision {
        return Err(
            "Habit 定义已在其他位置改变。请刷新 Habits 后重新编辑；外部内容未被覆盖。".into(),
        );
    }

    let (habit_key, outcome) = match input.habit_key.as_deref() {
        None => {
            if input.start_date.is_none() {
                return Err("新建 Habit 需要一个开始日期。".into());
            }
            let key = format!("local-{}", revision(input.operation_id.as_bytes()));
            if document.habits.contains_key(&key) || snapshot.habit(&key).is_some() {
                return Err("生成的 Habit 稳定标识已存在；没有创建重复习惯。请刷新后重试。".into());
            }
            let start_date = input.start_date.clone().expect("validated above");
            let target_revision = HabitGoalRevision {
                id: format!("goal-{}", revision(input.operation_id.as_bytes())),
                effective_from: start_date.clone(),
                goal: input
                    .goal
                    .clone()
                    .expect("creation goal is required by mutation validation"),
                status: HabitGoalRevisionStatus::Active,
            };
            let mut localized_names = HabitLocalizedNames::default();
            set_localized_name(&mut localized_names, &input.language, &input.name);
            document.habits.insert(
                key.clone(),
                HabitDefinition {
                    key: key.clone(),
                    origin: HabitDefinitionOrigin::Local,
                    base_name: input.name.trim().to_string(),
                    source_localized_names: HabitLocalizedNames::default(),
                    name_overrides: localized_names,
                    emoji: clean_optional(input.emoji.as_deref()),
                    group: clean_optional(input.group.as_deref()),
                    start_date: Some(start_date),
                    lifecycle_active: Some(true),
                    lifecycle_history: Vec::new(),
                    source_goal_target: None,
                    source_goal_history: Vec::new(),
                    goal_revisions: vec![target_revision],
                    created_at: timestamp.to_string(),
                    modified_at: timestamp.to_string(),
                },
            );
            (key, HabitMutationOutcome::Created)
        }
        Some(key) => {
            let definition = if let Some(existing) = document.habits.get_mut(key) {
                existing
            } else {
                let source = snapshot.habit(key).ok_or_else(|| {
                    "Habits 中没有可编辑的稳定 key；请刷新后重试，没有创建替代对象。".to_string()
                })?;
                document
                    .habits
                    .entry(key.to_string())
                    .or_insert_with(|| HabitDefinition {
                        key: key.to_string(),
                        origin: HabitDefinitionOrigin::Sourced,
                        base_name: source.name.clone(),
                        source_localized_names: source.localized_names.clone(),
                        name_overrides: HabitLocalizedNames::default(),
                        emoji: None,
                        group: None,
                        start_date: None,
                        lifecycle_active: None,
                        lifecycle_history: Vec::new(),
                        source_goal_target: source.goal_target.clone(),
                        source_goal_history: source.goal_history.clone(),
                        goal_revisions: Vec::new(),
                        created_at: timestamp.to_string(),
                        modified_at: timestamp.to_string(),
                    })
            };

            if definition.origin == HabitDefinitionOrigin::Sourced {
                if let Some(source) = snapshot.habit(key) {
                    if definition.goal_revisions.is_empty() {
                        definition.source_goal_target = source.goal_target.clone();
                    }
                    if definition.source_goal_history.is_empty() {
                        definition.source_goal_history = source.goal_history.clone();
                    }
                    if definition.source_localized_names.zh.is_none()
                        && definition.source_localized_names.en.is_none()
                    {
                        definition.source_localized_names = source.localized_names.clone();
                    }
                }
            }
            set_localized_name(&mut definition.name_overrides, &input.language, &input.name);
            if definition.origin == HabitDefinitionOrigin::Local {
                definition.base_name = input.name.trim().to_string();
            }
            definition.emoji = clean_optional(input.emoji.as_deref());
            definition.group = clean_optional(input.group.as_deref());
            if input.start_date.is_some() {
                definition.start_date = input.start_date.clone();
            }
            if let Some(goal) = input.goal.as_ref() {
                schedule_goal_revision(definition, goal, key, &input.operation_id, today)?;
            }
            definition.modified_at = timestamp.to_string();
            (key.to_string(), HabitMutationOutcome::Updated)
        }
    };

    document.operations.push(HabitCatalogOperationReceipt {
        id: input.operation_id.clone(),
        fingerprint,
        habit_key: habit_key.clone(),
        outcome,
        accepted_at: timestamp.to_string(),
    });
    validate_document(&document)?;
    Ok(HabitCatalogMutation {
        document,
        habit_key,
        outcome,
        changed: true,
    })
}

pub(crate) fn apply_lifecycle_mutation(
    existing: Option<HabitCatalogDocument>,
    current_revision: Option<&str>,
    input: &HabitLifecycleMutationInput,
    snapshot: &HabitSnapshotView,
    today: &str,
    timestamp: &str,
) -> Result<HabitCatalogMutation, String> {
    validate_lifecycle_mutation(input, today)?;
    let fingerprint = lifecycle_fingerprint(input)?;
    let mut document = existing.unwrap_or_default();

    if let Some(receipt) = document
        .operations
        .iter()
        .find(|receipt| receipt.id == input.operation_id)
    {
        let receipt_fingerprint = receipt.fingerprint.clone();
        let receipt_habit_key = receipt.habit_key.clone();
        let receipt_outcome = receipt.outcome;
        if receipt_fingerprint != fingerprint || receipt_habit_key != input.habit_key {
            return Err("该 Habit 操作标识已用于不同修改；没有写入任何内容。".into());
        }
        return Ok(HabitCatalogMutation {
            document,
            habit_key: receipt_habit_key,
            outcome: receipt_outcome,
            changed: false,
        });
    }

    if input.expected_revision.as_deref() != current_revision {
        return Err(
            "Habit 定义已在其他位置改变。请刷新 Habits 后重新编辑；外部内容未被覆盖。".into(),
        );
    }

    let source = snapshot.habit(&input.habit_key).ok_or_else(|| {
        "Habits 中没有可查看的稳定 key；请刷新后重试，没有创建替代对象。".to_string()
    })?;
    let definition = document
        .habits
        .entry(input.habit_key.clone())
        .or_insert_with(|| HabitDefinition {
            key: input.habit_key.clone(),
            origin: HabitDefinitionOrigin::Sourced,
            base_name: source.name.clone(),
            source_localized_names: source.localized_names.clone(),
            name_overrides: HabitLocalizedNames::default(),
            emoji: None,
            group: None,
            start_date: None,
            lifecycle_active: None,
            lifecycle_history: Vec::new(),
            source_goal_target: source.goal_target.clone(),
            source_goal_history: source.goal_history.clone(),
            goal_revisions: Vec::new(),
            created_at: timestamp.to_string(),
            modified_at: timestamp.to_string(),
        });

    let current_active = definition.lifecycle_active.unwrap_or_else(|| {
        if definition.origin == HabitDefinitionOrigin::Local {
            true
        } else {
            source.active
        }
    });
    if current_active != input.active {
        definition.lifecycle_history.push(HabitLifecycleChange {
            operation_id: input.operation_id.clone(),
            active: input.active,
            effective_from: today.to_string(),
            changed_at: timestamp.to_string(),
        });
        definition.lifecycle_history.sort_by(|left, right| {
            left.effective_from
                .cmp(&right.effective_from)
                .then_with(|| left.changed_at.cmp(&right.changed_at))
        });
    }
    definition.lifecycle_active = Some(input.active);
    definition.modified_at = timestamp.to_string();
    document.operations.push(HabitCatalogOperationReceipt {
        id: input.operation_id.clone(),
        fingerprint,
        habit_key: input.habit_key.clone(),
        outcome: HabitMutationOutcome::Updated,
        accepted_at: timestamp.to_string(),
    });
    validate_document(&document)?;
    Ok(HabitCatalogMutation {
        document,
        habit_key: input.habit_key.clone(),
        outcome: HabitMutationOutcome::Updated,
        changed: true,
    })
}

fn lifecycle_fingerprint(input: &HabitLifecycleMutationInput) -> Result<String, String> {
    serde_json::to_vec(&(&input.habit_key, input.active))
        .map(|bytes| revision(&bytes))
        .map_err(|error| format!("无法核对 Habit 生命周期操作身份：{error}"))
}

fn validate_lifecycle_mutation(
    input: &HabitLifecycleMutationInput,
    today: &str,
) -> Result<(), String> {
    validate_identifier(&input.operation_id, "Habit 操作标识")?;
    validate_key(&input.habit_key)?;
    if input.target_binding.trim().is_empty() || input.target_binding.len() > 160 {
        return Err("Habit 定义目标绑定无效；没有写入任何内容。".into());
    }
    CalendarDate::parse(today).ok_or_else(|| "系统时钟没有提供有效的 lived date。".to_string())?;
    Ok(())
}

fn schedule_goal_revision(
    definition: &mut HabitDefinition,
    requested: &HabitGoalTarget,
    key: &str,
    operation_id: &str,
    today: &str,
) -> Result<(), String> {
    let current = target_for_date(definition, definition.source_goal_target.as_ref(), today);
    let pending = pending_revision(definition, today);
    if pending.is_some_and(|revision| &revision.goal == requested)
        || pending.is_none() && current.as_ref() == Some(requested)
    {
        return Ok(());
    }
    if let Some(pending_goal) = pending {
        if current.as_ref() == Some(requested) {
            let effective_from = pending_goal.effective_from.clone();
            for revision in &mut definition.goal_revisions {
                if revision.status == HabitGoalRevisionStatus::Active
                    && revision.effective_from == effective_from
                {
                    revision.status = HabitGoalRevisionStatus::Cancelled;
                }
            }
            return Ok(());
        }
    }

    let effective_from = pending
        .map(|revision| revision.effective_from.clone())
        .unwrap_or_else(|| next_goal_boundary(today, current.as_ref()));
    for revision in &mut definition.goal_revisions {
        if revision.status == HabitGoalRevisionStatus::Active
            && CalendarDate::parse(&revision.effective_from)
                .is_some_and(|effective| effective > CalendarDate::parse(today).unwrap())
        {
            revision.status = HabitGoalRevisionStatus::Superseded;
        }
    }
    definition.goal_revisions.push(HabitGoalRevision {
        id: format!("goal-{}", revision(operation_id.as_bytes())),
        effective_from,
        goal: requested.clone(),
        status: HabitGoalRevisionStatus::Active,
    });
    let _ = key;
    Ok(())
}

fn next_goal_boundary(today: &str, current: Option<&HabitGoalTarget>) -> String {
    let today = CalendarDate::parse(today).expect("validated lived date");
    match current {
        Some(HabitGoalTarget::WeeklyCount { .. }) => today.monday().plus_days(7).to_string(),
        _ => today.plus_days(1).to_string(),
    }
}

fn target_for_date(
    definition: &HabitDefinition,
    source_target: Option<&HabitGoalTarget>,
    date: &str,
) -> Option<HabitGoalTarget> {
    let date = CalendarDate::parse(date)?;
    let current = definition
        .goal_revisions
        .iter()
        .filter(|revision| {
            revision.status == HabitGoalRevisionStatus::Active
                && CalendarDate::parse(&revision.effective_from)
                    .is_some_and(|effective| effective <= date)
        })
        .max_by_key(|revision| revision.effective_from.as_str());
    current.map(|revision| revision.goal.clone()).or_else(|| {
        if definition.origin == HabitDefinitionOrigin::Local {
            None
        } else {
            source_target.cloned()
        }
    })
}

fn pending_revision<'a>(
    definition: &'a HabitDefinition,
    today: &str,
) -> Option<&'a HabitGoalRevision> {
    let today = CalendarDate::parse(today)?;
    definition
        .goal_revisions
        .iter()
        .filter(|revision| {
            revision.status == HabitGoalRevisionStatus::Active
                && CalendarDate::parse(&revision.effective_from)
                    .is_some_and(|effective| effective > today)
        })
        .min_by_key(|revision| revision.effective_from.as_str())
}

pub(crate) fn merge_catalog_view(
    snapshot: &mut HabitSnapshotView,
    document: Option<&HabitCatalogDocument>,
    local_completions: &[LocalHabitCompletion],
    today: &str,
) -> Result<(), String> {
    let Some(document) = document else {
        for habit in &mut snapshot.habits {
            habit.definition = Some(HabitDefinitionView {
                origin: "sourced".into(),
                emoji: None,
                group: None,
                start_date: None,
                lifecycle_active: habit.active,
                lifecycle_history: Vec::new(),
                goal_revisions: Vec::new(),
                current_goal: habit.goal_target.clone(),
                current_goal_effective_from: None,
                pending_goal: None,
                pending_goal_effective_from: None,
                partial_goal_cycle: false,
            });
        }
        return Ok(());
    };
    validate_document(document)?;
    let today_date = CalendarDate::parse(today)
        .ok_or_else(|| "系统时钟没有提供有效的 lived date。".to_string())?;
    let history_start = snapshot
        .habits
        .first()
        .and_then(|habit| habit.history.first())
        .and_then(|cell| CalendarDate::parse(&cell.date))
        .unwrap_or_else(|| today_date.plus_days(-83));

    for habit in &mut snapshot.habits {
        if let Some(definition) = document.habits.get(&habit.key) {
            apply_definition_to_sourced_habit(habit, definition, local_completions, today);
        } else {
            habit.definition = Some(HabitDefinitionView {
                origin: "sourced".into(),
                emoji: None,
                group: None,
                start_date: None,
                lifecycle_active: habit.active,
                lifecycle_history: Vec::new(),
                goal_revisions: Vec::new(),
                current_goal: habit.goal_target.clone(),
                current_goal_effective_from: None,
                pending_goal: None,
                pending_goal_effective_from: None,
                partial_goal_cycle: false,
            });
        }
    }

    let mut additions = Vec::new();
    for definition in document.habits.values() {
        if definition.origin == HabitDefinitionOrigin::Local {
            if snapshot.habit(&definition.key).is_none() {
                additions.push(local_habit_view(
                    definition,
                    local_completions,
                    today_date,
                    history_start,
                ));
            }
        } else if snapshot.habit(&definition.key).is_none() {
            additions.push(sourced_habit_stub(
                definition,
                local_completions,
                today_date,
                history_start,
            ));
        }
    }
    snapshot.habits.extend(additions);
    snapshot.summary.known_completions = 0;
    snapshot.summary.target_completions = 0;
    for habit in &snapshot.habits {
        if habit.active && habit.goal_kind == "weekly-count" {
            if let Some(target) = habit.weekly_target {
                snapshot.summary.target_completions += target;
                snapshot.summary.known_completions += habit.completed_count.unwrap_or_default();
            }
        }
    }
    if snapshot.state == crate::habits::HabitSnapshotState::Missing && !snapshot.habits.is_empty() {
        snapshot.message = "Habits 来源快照尚未生成；本地 Habit 定义与完成记录可独立使用。".into();
        snapshot.summary.coverage_note = "本地完成按 lived day 记录；外部来源覆盖仍未知。".into();
    }
    Ok(())
}

fn apply_definition_to_sourced_habit(
    habit: &mut HabitView,
    definition: &HabitDefinition,
    local_completions: &[LocalHabitCompletion],
    today: &str,
) {
    let lifecycle_active = definition.lifecycle_active.unwrap_or_else(|| {
        if definition.origin == HabitDefinitionOrigin::Local {
            true
        } else {
            habit.active
        }
    });
    habit.active = lifecycle_active;
    let base_target = if definition.goal_revisions.is_empty() {
        habit
            .goal_target
            .clone()
            .or_else(|| definition.source_goal_target.clone())
    } else {
        definition
            .source_goal_target
            .clone()
            .or_else(|| habit.goal_target.clone())
    };
    let current = target_for_date(definition, base_target.as_ref(), today);
    let pending = pending_revision(definition, today);
    if definition.origin == HabitDefinitionOrigin::Local {
        habit.name = definition.base_name.clone();
    }
    habit.localized_names = merge_names(&habit.localized_names, &definition.name_overrides);
    habit.goal_history = if definition.source_goal_history.is_empty() {
        habit.goal_history.clone()
    } else {
        definition.source_goal_history.clone()
    };
    apply_target(habit, current.as_ref());
    if !definition.goal_revisions.is_empty() {
        habit.goal_target = current.clone();
    }
    let today_date = CalendarDate::parse(today).expect("validated lived date");
    if definition
        .start_date
        .as_deref()
        .and_then(CalendarDate::parse)
        .is_some_and(|start| start > today_date)
    {
        habit.can_record_completion = false;
    }
    let current_effective_from = active_revision_for_date(definition, today)
        .map(|revision| revision.effective_from.clone())
        .or_else(|| definition.start_date.clone());
    let partial_goal_cycle = current.as_ref().is_some_and(|goal| {
        matches!(goal, HabitGoalTarget::WeeklyCount { .. })
            && current_effective_from
                .as_ref()
                .is_some_and(|effective_from| {
                    CalendarDate::parse(effective_from).is_some_and(|effective| {
                        effective.monday() != effective && effective <= today_date
                    })
                })
    });
    if partial_goal_cycle {
        if let Some(effective_from) = current_effective_from.as_deref() {
            habit.completed_count = Some(count_completed_since(habit, effective_from, today));
        }
    }
    habit.definition = Some(HabitDefinitionView {
        origin: "sourced".into(),
        emoji: definition.emoji.clone(),
        group: definition.group.clone(),
        start_date: definition.start_date.clone(),
        lifecycle_active,
        lifecycle_history: lifecycle_changes_view(definition),
        goal_revisions: goal_revisions_view(definition),
        current_goal: current.clone(),
        current_goal_effective_from: current_effective_from,
        pending_goal: pending.map(|revision| revision.goal.clone()),
        pending_goal_effective_from: pending.map(|revision| revision.effective_from.clone()),
        partial_goal_cycle,
    });
    // Local completion evidence is already merged into snapshot rows by TodayApplication.
    let _ = local_completions;
}

fn lifecycle_changes_view(definition: &HabitDefinition) -> Vec<HabitLifecycleChangeView> {
    definition
        .lifecycle_history
        .iter()
        .map(|change| HabitLifecycleChangeView {
            operation_id: change.operation_id.clone(),
            active: change.active,
            effective_from: change.effective_from.clone(),
            changed_at: change.changed_at.clone(),
        })
        .collect()
}

fn goal_revisions_view(definition: &HabitDefinition) -> Vec<HabitGoalRevisionView> {
    definition
        .goal_revisions
        .iter()
        .map(|revision| HabitGoalRevisionView {
            id: revision.id.clone(),
            effective_from: revision.effective_from.clone(),
            target: revision.goal.clone(),
            status: match revision.status {
                HabitGoalRevisionStatus::Active => "active",
                HabitGoalRevisionStatus::Superseded => "superseded",
                HabitGoalRevisionStatus::Cancelled => "cancelled",
            }
            .into(),
        })
        .collect()
}

fn local_habit_view(
    definition: &HabitDefinition,
    local_completions: &[LocalHabitCompletion],
    today: CalendarDate,
    history_start: CalendarDate,
) -> HabitView {
    make_habit_view(
        definition,
        local_completions,
        today,
        history_start,
        definition.source_goal_target.as_ref(),
    )
}

fn sourced_habit_stub(
    definition: &HabitDefinition,
    local_completions: &[LocalHabitCompletion],
    today: CalendarDate,
    history_start: CalendarDate,
) -> HabitView {
    make_habit_view(
        definition,
        local_completions,
        today,
        history_start,
        definition.source_goal_target.as_ref(),
    )
}

fn make_habit_view(
    definition: &HabitDefinition,
    local_completions: &[LocalHabitCompletion],
    today: CalendarDate,
    history_start: CalendarDate,
    source_target: Option<&HabitGoalTarget>,
) -> HabitView {
    let today_string = today.to_string();
    let current = target_for_date(definition, source_target, &today_string);
    let pending = pending_revision(definition, &today_string);
    let active_revision = active_revision_for_date(definition, &today_string);
    let mut history = Vec::new();
    for day in history_start.unix_days()..=today.unix_days() {
        let date = CalendarDate::from_unix_days(day).to_string();
        history.push(local_cell(
            &date,
            definition.key.as_str(),
            local_completions,
        ));
    }
    let recent_start = today.plus_days(-6);
    let recent = history
        .iter()
        .filter(|cell| CalendarDate::parse(&cell.date).is_some_and(|date| date >= recent_start))
        .cloned()
        .collect::<Vec<_>>();
    let today_cell = history
        .iter()
        .find(|cell| cell.date == today_string)
        .cloned()
        .expect("local habit history includes today");
    let active_days = history
        .iter()
        .filter(|cell| {
            cell.counts_as_completion
                && CalendarDate::parse(&cell.date).is_some_and(|date| {
                    date.monday() == today.monday()
                        && definition
                            .start_date
                            .as_deref()
                            .and_then(CalendarDate::parse)
                            .is_none_or(|start| date >= start)
                })
        })
        .count() as u32;
    let is_started = definition
        .start_date
        .as_deref()
        .and_then(CalendarDate::parse)
        .is_none_or(|date| date <= today);
    let display_target = current
        .as_ref()
        .or_else(|| pending.map(|revision| &revision.goal));
    let goal_kind = display_target
        .map(goal_kind)
        .unwrap_or("weekly-count")
        .to_string();
    let goal_label = current
        .as_ref()
        .map(goal_label)
        .unwrap_or_else(|| "待开始".into());
    let (weekly_target, completed_count) = match current.as_ref() {
        Some(HabitGoalTarget::WeeklyCount { standard }) => {
            (Some(u32::from(*standard)), Some(active_days))
        }
        Some(HabitGoalTarget::DailyCompletion) => {
            (Some(1), Some(u32::from(today_cell.counts_as_completion)))
        }
        _ => (None, None),
    };
    let source_labels = if local_completions
        .iter()
        .any(|completion| completion.key == definition.key)
    {
        vec!["Personal Dashboard local".into()]
    } else {
        Vec::new()
    };
    let current_effective_from = active_revision
        .map(|revision| revision.effective_from.clone())
        .or_else(|| definition.start_date.clone());
    let partial_goal_cycle = matches!(current, Some(HabitGoalTarget::WeeklyCount { .. }))
        && current_effective_from
            .as_deref()
            .and_then(CalendarDate::parse)
            .is_some_and(|effective| effective <= today && effective.monday() != effective);
    HabitView {
        key: definition.key.clone(),
        name: definition.base_name.clone(),
        localized_names: merge_names(
            &definition.source_localized_names,
            &definition.name_overrides,
        ),
        active: definition.lifecycle_active.unwrap_or(true),
        goal_kind,
        goal_label,
        goal_target: current.clone(),
        definition: Some(HabitDefinitionView {
            origin: if definition.origin == HabitDefinitionOrigin::Local {
                "local"
            } else {
                "sourced"
            }
            .into(),
            emoji: definition.emoji.clone(),
            group: definition.group.clone(),
            start_date: definition.start_date.clone(),
            lifecycle_active: definition.lifecycle_active.unwrap_or(true),
            lifecycle_history: lifecycle_changes_view(definition),
            goal_revisions: goal_revisions_view(definition),
            current_goal: current.clone(),
            current_goal_effective_from: current_effective_from,
            pending_goal: pending.map(|revision| revision.goal.clone()),
            pending_goal_effective_from: pending.map(|revision| revision.effective_from.clone()),
            partial_goal_cycle,
        }),
        weekly_target,
        completed_count,
        can_record_completion: is_started
            && matches!(
                current,
                Some(HabitGoalTarget::DailyCompletion | HabitGoalTarget::WeeklyCount { .. })
            ),
        source_labels,
        coverage_label: "Dashboard 本地完成；外部来源覆盖未知".into(),
        goal_history: definition.source_goal_history.clone(),
        today: today_cell,
        recent,
        history,
    }
}

fn local_cell(date: &str, key: &str, completions: &[LocalHabitCompletion]) -> HabitCellView {
    let completion = completions
        .iter()
        .find(|completion| completion.key == key && completion.date == date);
    let active = completion
        .is_some_and(|completion| completion.state == HabitLocalCompletionState::Completed);
    HabitCellView {
        date: date.to_string(),
        coverage: "unknown".into(),
        status: if active {
            HabitCellStatus::Completed
        } else {
            HabitCellStatus::Unknown
        },
        has_record: completion.is_some(),
        counts_as_completion: active,
        local_completion_state: completion
            .map(|completion| completion.state)
            .unwrap_or(HabitLocalCompletionState::None),
        has_external_completion: false,
        completion_source_labels: if active {
            vec!["Personal Dashboard local".into()]
        } else {
            Vec::new()
        },
        actual_time_label: None,
        sleep_fact: None,
        details: completion
            .map(|completion| {
                vec![HabitDetailView::LocalCompletion {
                    state: completion.state,
                    changed_at: completion.changed_at.clone(),
                }]
            })
            .unwrap_or_default(),
        local_records: Vec::new(),
    }
}

fn active_revision_for_date<'a>(
    definition: &'a HabitDefinition,
    date: &str,
) -> Option<&'a HabitGoalRevision> {
    let date = CalendarDate::parse(date)?;
    definition
        .goal_revisions
        .iter()
        .filter(|revision| {
            revision.status == HabitGoalRevisionStatus::Active
                && CalendarDate::parse(&revision.effective_from)
                    .is_some_and(|effective| effective <= date)
        })
        .max_by_key(|revision| revision.effective_from.as_str())
}

fn count_completed_since(habit: &HabitView, from: &str, to: &str) -> u32 {
    let from = CalendarDate::parse(from);
    let to = CalendarDate::parse(to);
    habit
        .history
        .iter()
        .filter(|cell| {
            cell.counts_as_completion
                && CalendarDate::parse(&cell.date).is_some_and(|date| {
                    from.is_none_or(|from| date >= from) && to.is_none_or(|to| date <= to)
                })
        })
        .count() as u32
}

fn goal_kind(goal: &HabitGoalTarget) -> &'static str {
    match goal {
        HabitGoalTarget::DailyCompletion => "daily-completion",
        HabitGoalTarget::WeeklyCount { .. } => "weekly-count",
        HabitGoalTarget::DailyTime { .. } => "daily-time",
    }
}

fn goal_label(goal: &HabitGoalTarget) -> String {
    match goal {
        HabitGoalTarget::DailyCompletion => "每日完成".into(),
        HabitGoalTarget::WeeklyCount { standard } => format!("每周 {standard} 次"),
        HabitGoalTarget::DailyTime {
            standard,
            day_relation,
        } => match day_relation {
            DayRelation::SameDay => format!("每日 {standard}"),
            DayRelation::NextDay => format!("每日 次日 {standard}"),
            DayRelation::Unresolved => format!("每日 {standard} · 日期归属待解释"),
        },
    }
}

fn apply_target(habit: &mut HabitView, target: Option<&HabitGoalTarget>) {
    if let Some(target) = target {
        habit.goal_kind = goal_kind(target).into();
        habit.goal_label = goal_label(target);
        habit.weekly_target = match target {
            HabitGoalTarget::WeeklyCount { standard } => Some(u32::from(*standard)),
            HabitGoalTarget::DailyCompletion => Some(1),
            HabitGoalTarget::DailyTime { .. } => None,
        };
        habit.can_record_completion = matches!(
            target,
            HabitGoalTarget::DailyCompletion | HabitGoalTarget::WeeklyCount { .. }
        );
    }
}

fn merge_names(base: &HabitLocalizedNames, overrides: &HabitLocalizedNames) -> HabitLocalizedNames {
    HabitLocalizedNames {
        zh: overrides.zh.clone().or_else(|| base.zh.clone()),
        en: overrides.en.clone().or_else(|| base.en.clone()),
    }
}

fn set_localized_name(names: &mut HabitLocalizedNames, language: &str, value: &str) {
    match language {
        "zh" => names.zh = Some(value.trim().to_string()),
        "en" => names.en = Some(value.trim().to_string()),
        _ => {}
    }
}

fn clean_optional(value: Option<&str>) -> Option<String> {
    value
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(str::to_string)
}

fn mutation_fingerprint(input: &HabitDefinitionMutationInput) -> Result<String, String> {
    #[derive(Serialize)]
    #[serde(rename_all = "camelCase")]
    struct Fingerprint<'a> {
        habit_key: &'a Option<String>,
        language: &'a str,
        name: &'a str,
        emoji: &'a Option<String>,
        group: &'a Option<String>,
        start_date: &'a Option<String>,
        goal: &'a Option<HabitGoalTarget>,
    }
    let payload = Fingerprint {
        habit_key: &input.habit_key,
        language: &input.language,
        name: &input.name,
        emoji: &input.emoji,
        group: &input.group,
        start_date: &input.start_date,
        goal: &input.goal,
    };
    serde_json::to_vec(&payload)
        .map(|bytes| revision(&bytes))
        .map_err(|error| format!("无法核对 Habit 操作身份：{error}"))
}

fn validate_mutation(input: &HabitDefinitionMutationInput, today: &str) -> Result<(), String> {
    validate_identifier(&input.operation_id, "Habit 操作标识")?;
    validate_key(input.habit_key.as_deref().unwrap_or("local-probe"))?;
    if input.target_binding.trim().is_empty() || input.target_binding.len() > 160 {
        return Err("Habit 定义目标绑定无效；没有写入任何内容。".into());
    }
    if !matches!(input.language.as_str(), "zh" | "en") {
        return Err("Habit 名称语言无效；没有写入任何内容。".into());
    }
    validate_text(&input.name, "Habit 名称", 200)?;
    validate_optional_text(input.emoji.as_deref(), "Habit emoji", 24)?;
    validate_optional_text(input.group.as_deref(), "Habit 分组", 80)?;
    if let Some(date) = input.start_date.as_deref() {
        CalendarDate::parse(date)
            .ok_or_else(|| "Habit 开始日期不是有效的 lived date。".to_string())?;
    }
    if let Some(goal) = input.goal.as_ref() {
        validate_goal_target(goal)?;
    } else if input.habit_key.is_none() {
        return Err("新建 Habit 需要一个目标。".into());
    }
    CalendarDate::parse(today).ok_or_else(|| "系统时钟没有提供有效的 lived date。".to_string())?;
    Ok(())
}

fn validate_document(document: &HabitCatalogDocument) -> Result<(), String> {
    if document.schema_version != CATALOG_SCHEMA_VERSION {
        return Err(format!(
            "本地 Habit 定义正本 schemaVersion {} 不受支持；未覆盖原文件。",
            document.schema_version
        ));
    }
    for (key, definition) in &document.habits {
        validate_key(key)?;
        if definition.key != *key {
            return Err("本地 Habit 定义正本中的身份索引不一致；未覆盖原文件。".into());
        }
        validate_text(&definition.base_name, "Habit 名称", 200)?;
        validate_optional_text(definition.emoji.as_deref(), "Habit emoji", 24)?;
        validate_optional_text(definition.group.as_deref(), "Habit 分组", 80)?;
        if let Some(date) = definition.start_date.as_deref() {
            CalendarDate::parse(date)
                .ok_or_else(|| "本地 Habit 定义正本包含无效开始日期；未覆盖原文件。".to_string())?;
        }
        if let Some(target) = definition.source_goal_target.as_ref() {
            validate_goal_target(target)?;
        }
        for name in [
            &definition.source_localized_names.zh,
            &definition.source_localized_names.en,
            &definition.name_overrides.zh,
            &definition.name_overrides.en,
        ]
        .into_iter()
        .flatten()
        {
            validate_text(name, "Habit 本地化名称", 200)?;
        }
        let mut revision_ids = HashSet::new();
        for revision in &definition.goal_revisions {
            validate_identifier(&revision.id, "Habit 目标修订标识")?;
            CalendarDate::parse(&revision.effective_from)
                .ok_or_else(|| "Habit 目标修订包含无效生效日期；未覆盖原文件。".to_string())?;
            validate_goal_target(&revision.goal)?;
            if !revision_ids.insert(revision.id.as_str()) {
                return Err("本地 Habit 目标修订包含重复标识；未覆盖原文件。".into());
            }
        }
        let mut lifecycle_operation_ids = HashSet::new();
        for change in &definition.lifecycle_history {
            validate_identifier(&change.operation_id, "Habit 生命周期操作标识")?;
            CalendarDate::parse(&change.effective_from)
                .ok_or_else(|| "Habit 生命周期历史包含无效生效日期；未覆盖原文件。".to_string())?;
            if crate::habits::timestamp_epoch_seconds(&change.changed_at).is_none() {
                return Err("Habit 生命周期历史包含无效保存时间；未覆盖原文件。".into());
            }
            if !lifecycle_operation_ids.insert(change.operation_id.as_str()) {
                return Err("Habit 生命周期历史包含重复操作标识；未覆盖原文件。".into());
            }
        }
    }
    let mut operation_ids = HashSet::new();
    for operation in &document.operations {
        validate_identifier(&operation.id, "Habit 操作标识")?;
        validate_key(&operation.habit_key)?;
        if !document.habits.contains_key(&operation.habit_key) {
            return Err("本地 Habit 操作收据引用了不存在的身份；未覆盖原文件。".into());
        }
        if !operation_ids.insert(operation.id.as_str()) {
            return Err("本地 Habit 正本包含重复操作标识；未覆盖原文件。".into());
        }
    }
    if document.habits.values().any(|definition| {
        definition
            .lifecycle_history
            .iter()
            .any(|change| !operation_ids.contains(change.operation_id.as_str()))
    }) {
        return Err("Habit 生命周期历史缺少操作收据；未覆盖原文件。".into());
    }
    Ok(())
}

fn validate_goal_target(goal: &HabitGoalTarget) -> Result<(), String> {
    match goal {
        HabitGoalTarget::DailyCompletion => Ok(()),
        HabitGoalTarget::WeeklyCount { standard } if (1..=7).contains(standard) => Ok(()),
        HabitGoalTarget::WeeklyCount { .. } => Err("每周达标天数必须是 1 到 7。".into()),
        HabitGoalTarget::DailyTime { standard, .. } if valid_time(standard) => Ok(()),
        HabitGoalTarget::DailyTime { .. } => Err("每日时间目标必须使用有效的 HH:mm。".into()),
    }
}

fn validate_text(value: &str, label: &str, max: usize) -> Result<(), String> {
    if value.trim().is_empty() || value.len() > max || value.contains(['\n', '\r']) {
        return Err(format!("{label}不能为空，且不能超过 {max} 字。"));
    }
    Ok(())
}

fn validate_optional_text(value: Option<&str>, label: &str, max: usize) -> Result<(), String> {
    if let Some(value) = value.filter(|value| !value.trim().is_empty()) {
        if value.len() > max || value.contains(['\n', '\r']) {
            return Err(format!("{label}过长或包含换行。"));
        }
    }
    Ok(())
}

fn validate_identifier(value: &str, label: &str) -> Result<(), String> {
    if value.is_empty() || value.len() > 160 || value.chars().any(char::is_control) {
        return Err(format!("{label}无效；没有写入任何内容。"));
    }
    Ok(())
}

fn validate_key(value: &str) -> Result<(), String> {
    if value.is_empty()
        || value.len() > 64
        || !value
            .bytes()
            .all(|byte| byte.is_ascii_lowercase() || byte.is_ascii_digit() || byte == b'-')
    {
        return Err("习惯标识必须是稳定的小写语义 key；没有写入任何内容。".into());
    }
    Ok(())
}

fn valid_time(value: &str) -> bool {
    value.len() == 5
        && value.as_bytes()[2] == b':'
        && value[..2].parse::<u32>().is_ok_and(|hour| hour < 24)
        && value[3..].parse::<u32>().is_ok_and(|minute| minute < 60)
}
