//! Embedded usage resources guide the model; registration and mechanical
//! enforcement remain with CollaborationApplication and the business adapters.
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::collections::BTreeMap;
use std::sync::OnceLock;

const MANIFEST: &str =
    include_str!("../../.agents/skills/personal-dashboard-collaboration/manifest.json");
const SKILL: &str = include_str!("../../.agents/skills/personal-dashboard-collaboration/SKILL.md");
const DESCRIPTIONS: &str =
    include_str!("../../.agents/skills/personal-dashboard-collaboration/tool-descriptions.json");
const DOCUMENTS: &str =
    include_str!("../../.agents/skills/personal-dashboard-collaboration/references/documents.md");
const DIDA_READS: &str =
    include_str!("../../.agents/skills/personal-dashboard-collaboration/references/dida-reads.md");
const DIDA_WRITES: &str =
    include_str!("../../.agents/skills/personal-dashboard-collaboration/references/dida-writes.md");
const MAPPED_HABITS: &str = include_str!(
    "../../.agents/skills/personal-dashboard-collaboration/references/mapped-habits.md"
);
const PERSONAL_RETRO: &str = include_str!(
    "../../.agents/skills/personal-dashboard-collaboration/references/personal-retro.md"
);
const AUTOMATIC: &str = include_str!(
    "../../.agents/skills/personal-dashboard-collaboration/references/automatic-morning.md"
);
const AUTOMATIC_FILES: &str = include_str!(
    "../../.agents/skills/personal-dashboard-collaboration/references/automatic-files.md"
);
const AUTOMATIC_REQUEST: &str = include_str!(
    "../../.agents/skills/personal-dashboard-collaboration/references/automatic-request.txt"
);

pub(super) fn automatic_request(date: &str, scheduled_time: &str, current_time: &str) -> String {
    AUTOMATIC_REQUEST
        .trim()
        .replace("{date}", date)
        .replace("{scheduled_time}", scheduled_time)
        .replace("{current_time}", current_time)
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RuntimeThreadConfiguration {
    pub model: Option<String>,
    pub reasoning_effort: Option<String>,
    pub model_provider: Option<String>,
    pub source: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CollaborationExecutionConfiguration {
    pub thread_id: String,
    pub captured_at: String,
    pub runtime_executable: Option<String>,
    pub runtime_version: Option<String>,
    pub app_version: String,
    pub app_build_revision: Option<String>,
    pub requested_model: Option<String>,
    pub requested_reasoning_effort: Option<String>,
    pub effective_model: Option<String>,
    pub effective_reasoning_effort: Option<String>,
    pub model_provider: Option<String>,
    pub configuration_source: Option<String>,
    pub tool_schema_fingerprint: String,
    pub gaps: Vec<String>,
}

pub(super) fn thread_configuration(value: &Value, source: &str) -> RuntimeThreadConfiguration {
    let field = |name: &str| {
        value[name]
            .as_str()
            .or_else(|| value["thread"][name].as_str())
            .map(str::to_owned)
    };
    RuntimeThreadConfiguration {
        model: field("model"),
        reasoning_effort: field("reasoningEffort"),
        model_provider: field("modelProvider"),
        source: source.into(),
    }
}

pub(super) fn capture_configuration(
    connection: &super::RuntimeConnectionView,
    thread: Option<RuntimeThreadConfiguration>,
    requested_model: Option<&str>,
    requested_effort: Option<&str>,
    thread_id: &str,
    captured_at: &str,
    tool_schema: &str,
) -> CollaborationExecutionConfiguration {
    let mut gaps = Vec::new();
    let effective_model = thread
        .as_ref()
        .and_then(|config| config.model.clone())
        .filter(|model| requested_model.is_none_or(|requested| requested == model));
    let effective_effort = thread
        .as_ref()
        .and_then(|config| config.reasoning_effort.clone())
        .filter(|effort| requested_effort.is_none_or(|requested| requested == effort));
    if effective_model.is_none() {
        gaps.push("Effective model unavailable or turn override differs from observed thread response; requested model is separate.".into());
    }
    if effective_effort.is_none() {
        gaps.push("Effective reasoning effort unset/unavailable or turn override not independently confirmed.".into());
    }
    if connection.version.is_none() || connection.executable_path.is_none() {
        gaps.push("Actual runtime version/executable unavailable at execution start.".into());
    }
    let build = option_env!("PERSONAL_DASHBOARD_BUILD_REVISION").map(str::to_owned);
    if build.is_none() {
        gaps.push("App version is captured; source build revision was not embedded.".into());
    }
    CollaborationExecutionConfiguration {
        thread_id: thread_id.into(),
        captured_at: captured_at.into(),
        runtime_executable: connection.executable_path.clone(),
        runtime_version: connection.version.clone(),
        app_version: env!("CARGO_PKG_VERSION").into(),
        app_build_revision: build,
        requested_model: requested_model.map(str::to_owned),
        requested_reasoning_effort: requested_effort.map(str::to_owned),
        effective_model,
        effective_reasoning_effort: effective_effort,
        model_provider: thread
            .as_ref()
            .and_then(|config| config.model_provider.clone()),
        configuration_source: thread.map(|config| config.source),
        tool_schema_fingerprint: tool_schema.into(),
        gaps,
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CollaborationUsageBinding {
    pub execution_id: String,
    pub skill_name: String,
    pub skill_version: String,
    pub tool_set_version: String,
    pub package_fingerprint: String,
    pub registered_tools: Vec<String>,
    pub registered_operations: BTreeMap<String, Vec<String>>,
    pub external_capability_fingerprint: Option<String>,
    pub automatic_morning: bool,
    #[serde(default)]
    pub configuration: Option<CollaborationExecutionConfiguration>,
}

pub(super) fn description(key: &str) -> &'static str {
    static DESCRIPTIONS_VALUE: OnceLock<Value> = OnceLock::new();
    DESCRIPTIONS_VALUE.get_or_init(|| {
        serde_json::from_str(DESCRIPTIONS)
            .expect("checked-in usage tool descriptions must be valid JSON")
    })[key]
        .as_str()
        .expect("host description keys must exist in the embedded usage package")
}

pub(super) fn binding(
    execution_id: &str,
    automatic_morning: bool,
    tools: &[Value],
    external_capability_fingerprint: Option<String>,
) -> CollaborationUsageBinding {
    let manifest: Value =
        serde_json::from_str(MANIFEST).expect("embedded usage manifest must be valid JSON");
    assert_eq!(
        manifest["contractVersion"], 1,
        "unsupported embedded usage contract"
    );
    let field = |key: &str| {
        manifest[key]
            .as_str()
            .expect("embedded usage version is required")
            .to_owned()
    };
    let mut registered_operations = BTreeMap::new();
    for tool in tools {
        if let Some(variants) = tool["inputSchema"]["oneOf"].as_array() {
            registered_operations.insert(
                tool["name"].as_str().unwrap().to_owned(),
                variants
                    .iter()
                    .filter_map(|variant| {
                        variant["properties"]["operation"]["const"]
                            .as_str()
                            .map(str::to_owned)
                    })
                    .collect(),
            );
        } else if let Some(operation) =
            tool["inputSchema"]["properties"]["operation"]["const"].as_str()
        {
            registered_operations.insert(
                tool["name"].as_str().unwrap().to_owned(),
                vec![operation.to_owned()],
            );
        }
    }
    CollaborationUsageBinding {
        execution_id: execution_id.to_owned(),
        skill_name: field("skillName"),
        skill_version: field("skillVersion"),
        tool_set_version: field("toolSetVersion"),
        package_fingerprint: super::stable_effect_fingerprint(&json!([
            MANIFEST,
            SKILL,
            DESCRIPTIONS,
            DOCUMENTS,
            DIDA_READS,
            DIDA_WRITES,
            MAPPED_HABITS,
            PERSONAL_RETRO,
            AUTOMATIC,
            AUTOMATIC_FILES,
            AUTOMATIC_REQUEST,
        ])),
        registered_tools: tools
            .iter()
            .filter_map(|tool| tool["name"].as_str().map(str::to_owned))
            .collect(),
        registered_operations,
        external_capability_fingerprint,
        automatic_morning,
        configuration: None,
    }
}

pub(super) fn instructions(binding: &CollaborationUsageBinding, extra: &str) -> String {
    let guidance = if binding.automatic_morning {
        format!("{AUTOMATIC}\n{AUTOMATIC_FILES}\n{DIDA_READS}")
    } else {
        format!("{SKILL}\n{DOCUMENTS}\n{DIDA_READS}\n{DIDA_WRITES}\n{MAPPED_HABITS}\n{PERSONAL_RETRO}")
    };
    // Thread instructions persist across turns: execution identity belongs in
    // each saved binding, while this header describes the immutable tool set.
    let contract = json!({
        "skillName": binding.skill_name, "skillVersion": binding.skill_version,
        "toolSetVersion": binding.tool_set_version, "packageFingerprint": binding.package_fingerprint,
        "registeredTools": binding.registered_tools, "registeredOperations": binding.registered_operations,
        "externalCapabilityFingerprint": binding.external_capability_fingerprint,
        "automaticMorning": binding.automatic_morning,
    });
    format!("{guidance}\n\nLoaded Dashboard usage contract: {contract}\n{extra}")
}
