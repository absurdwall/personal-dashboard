//! Host-only selection of the existing Dida connection. MCP owns discovery,
//! schemas, authentication and calls; this module does not wrap business tools.
use serde_json::{json, Value};
use std::path::Path;
use std::process::Command;

pub(super) const SERVER: &str = "dida365";
pub(super) const READ_TOOLS: &[&str] = &[
    "search_task",
    "search",
    "fetch",
    "get_task_by_id",
    "get_task_in_project",
    "filter_tasks",
    "list_projects",
    "get_project_by_id",
    "get_project_with_undone_tasks",
    "list_undone_tasks_by_time_query",
    "list_undone_tasks_by_date",
    "list_completed_tasks_by_date",
    "list_habits",
    "get_habit",
    "get_habit_checkins",
    "get_user_preference",
    "list_habit_sections",
    "list_project_groups",
];

// CLI reads its own user configuration, without initializing any other MCP.
// Capture its output only in host memory; never return endpoint/auth fields to
// the agent, history, logs or business files. No independent config parser or
// authentication copy is needed.
pub(super) fn discover(executable: &Path) -> Option<Value> {
    let mut command = Command::new(executable);
    command.args(["mcp", "get", SERVER, "--json"]);
    if let Some(home) = std::env::var_os("HOME") {
        command.current_dir(home);
    }
    let output = command.output().ok()?;
    if !output.status.success() {
        return None;
    }
    selected_connection(serde_json::from_slice(&output.stdout).ok()?)
}

fn selected_connection(source: Value) -> Option<Value> {
    if source.get("name").and_then(Value::as_str) != Some(SERVER)
        || source.get("enabled").and_then(Value::as_bool) != Some(true)
    {
        return None;
    }
    let transport = source.get("transport")?.as_object()?;
    // The existing selected connection is Streamable HTTP. Fail closed on a
    // transport we have not validated instead of inventing authentication.
    if transport.get("type").and_then(Value::as_str) != Some("streamable_http") {
        return None;
    }
    let url = transport.get("url")?.as_str()?;
    if !url.starts_with("https://")
        && !url.starts_with("http://localhost")
        && !url.starts_with("http://127.0.0.1")
    {
        return None;
    }
    let mut connection = serde_json::Map::new();
    for key in [
        "url",
        "bearer_token_env_var",
        "http_headers",
        "env_http_headers",
        "http_headers_helper",
    ] {
        if let Some(value) = transport.get(key).filter(|v| !v.is_null()) {
            connection.insert(key.to_owned(), value.clone());
        }
    }
    for key in ["startup_timeout_sec", "tool_timeout_sec"] {
        if let Some(value) = source.get(key).filter(|v| !v.is_null()) {
            connection.insert(key.to_owned(), value.clone());
        }
    }
    let selected = source.get("enabled_tools").and_then(Value::as_array);
    let disabled = source.get("disabled_tools").and_then(Value::as_array);
    let reads: Vec<_> = READ_TOOLS
        .iter()
        .chain(super::dida_writes::WRITE_TOOLS.iter())
        .filter(|tool| {
            selected.map_or(true, |tools| {
                tools.iter().any(|v| v.as_str() == Some(**tool))
            }) && !disabled.is_some_and(|tools| tools.iter().any(|v| v.as_str() == Some(**tool)))
        })
        .copied()
        .collect();
    connection.insert("enabled_tools".into(), json!(reads));
    Some(Value::Object(connection))
}

// JSON and TOML differ for objects. Serialize recursively to TOML inline
// tables rather than passing JSON object syntax through CLI fallback strings.
fn toml_value(value: &Value) -> Option<String> {
    Some(match value {
        Value::Null => return None,
        Value::Bool(_) | Value::Number(_) | Value::String(_) => value.to_string(),
        Value::Array(values) => format!(
            "[{}]",
            values
                .iter()
                .map(toml_value)
                .collect::<Option<Vec<_>>>()?
                .join(", ")
        ),
        Value::Object(values) => format!(
            "{{ {} }}",
            values
                .iter()
                .map(|(key, value)| { Some(format!("{} = {}", json!(key), toml_value(value)?)) })
                .collect::<Option<Vec<_>>>()?
                .join(", ")
        ),
    })
}

pub(super) fn configure(command: &mut Command, connection: Option<&Value>) {
    // Dashboard-owned profile excludes user-level MCPs; disable implicit Apps
    // and plugins too. Enable only the host-selected connection's actual reads.
    command.args(["-c", "features.apps=false", "-c", "features.plugins=false"]);
    if let Some(connection) = connection.and_then(Value::as_object) {
        // Codex's native macOS keyring backend resolves the login keychain
        // using the real user home. Keep CODEX_HOME and all XDG paths isolated;
        // named filesystem permissions still deny agent access outside scope.
        // This reuses existing OAuth instead of copying any credential store.
        if let Some(home) = std::env::var_os("HOME") {
            command.env("HOME", home);
        }
        for (key, value) in connection {
            let filtered;
            let value = if key == "enabled_tools" {
                filtered = json!(value
                    .as_array()
                    .into_iter()
                    .flatten()
                    .filter(|v| v.as_str().is_some_and(|tool| READ_TOOLS.contains(&tool)))
                    .collect::<Vec<_>>());
                &filtered
            } else {
                value
            };
            if let Some(value) = toml_value(value) {
                command.args(["-c", &format!("mcp_servers.{SERVER}.{key}={value}")]);
            }
        }
        // Only explicitly named credential environment variables are forwarded.
        // Keyring/HTTP authentication stays in Codex's existing implementation.
        let mut names = Vec::new();
        if let Some(name) = connection
            .get("bearer_token_env_var")
            .and_then(Value::as_str)
        {
            names.push(name);
        }
        if let Some(headers) = connection
            .get("env_http_headers")
            .and_then(Value::as_object)
        {
            names.extend(headers.values().filter_map(Value::as_str));
        }
        for name in names {
            if let Some(value) = std::env::var_os(name) {
                command.env(name, value);
            }
        }
    }
}

pub(super) fn thread_config(connection: Option<&Value>, writes_allowed: bool) -> Value {
    // With no selected transport, an enabled_tools override would itself create
    // an invalid MCP server section in the native CLI configuration.
    if connection.is_none() {
        return json!({});
    }
    let tools: Vec<_> = connection
        .and_then(|c| c.get("enabled_tools"))
        .and_then(Value::as_array)
        .into_iter()
        .flatten()
        .filter(|value| {
            value.as_str().is_some_and(|tool| {
                READ_TOOLS.contains(&tool)
                    || (writes_allowed && super::dida_writes::WRITE_TOOLS.contains(&tool))
            })
        })
        .cloned()
        .collect();
    let mut config=json!({"mcp_servers.dida365.enabled_tools":tools});
    set_current_tool_approvals(&mut config);
    config
}

pub(super) fn thread_config_with_habit_writes(connection: Option<&Value>, writes_allowed:bool, habit_writes_allowed:bool) -> Value {
    if connection.is_none() { return json!({}); }
    let mut config=thread_config(connection,writes_allowed);
    if !habit_writes_allowed {
        if let Some(tools)=config["mcp_servers.dida365.enabled_tools"].as_array_mut() {
            tools.retain(|tool| ![Some("create_habit"),Some("update_habit"),Some("upsert_habit_checkins")].contains(&tool.as_str()));
        }
    }
    set_current_tool_approvals(&mut config);
    config
}

// ApprovalPolicy::Never still rejects native MCP writes classified as requiring
// approval. Current manual authority is represented by exact per-tool overrides,
// never a server-wide trust setting. Read-only/only-local catalogs omit them.
const MANUAL_APPROVAL_POLICY_REVISION: &str = "selected-dida-manual-per-tool-approve-v1";
fn set_current_tool_approvals(config: &mut Value) {
    let enabled = config["mcp_servers.dida365.enabled_tools"]
        .as_array()
        .cloned()
        .unwrap_or_default();
    let fields = config
        .as_object_mut()
        .expect("Host thread configuration object");
    for tool in super::dida_writes::WRITE_TOOLS {
        let key = format!("mcp_servers.{SERVER}.tools.{tool}.approval_mode");
        fields.remove(&key);
        if enabled.iter().any(|enabled| enabled.as_str() == Some(tool)) {
            fields.insert(key, json!("approve"));
        }
    }
}
pub(super) fn capability_fingerprint(connection: Option<&Value>) -> Option<String> {
    connection.map(|connection|super::stable_effect_fingerprint(&json!({"enabledTools":connection.get("enabled_tools"),"manualApprovalPolicyRevision":MANUAL_APPROVAL_POLICY_REVISION})))
}
pub(super) fn validate_config(effective: &Value) -> Result<(), String> {
    let servers = effective
        .get("config")
        .and_then(|config| config.get("mcp_servers"))
        .and_then(Value::as_object)
        .ok_or_else(|| "Could not verify the isolated Dashboard MCP configuration.".to_owned())?;
    if servers.keys().any(|name| name != SERVER) {
        return Err("The isolated Dashboard runtime contained an unselected MCP connection. No model turn was sent.".into());
    }
    Ok(())
}

pub(super) fn startup_failed(status: &Value) -> bool {
    status["state"] == "unavailable" && status["runtimeStatus"] == "failed"
}

pub(super) fn source_status(catalog: Result<Value, String>) -> Value {
    let Ok(catalog) = catalog else {
        return json!({"source":SERVER,"state":"unavailable","coverage":"No current external query has succeeded; local work can continue."});
    };
    let Some(server) = catalog
        .get("data")
        .and_then(Value::as_array)
        .and_then(|servers| {
            servers
                .iter()
                .find(|s| s.get("name").and_then(Value::as_str) == Some(SERVER))
        })
    else {
        return json!({"source":SERVER,"state":"unconfigured","coverage":"No current external query has succeeded; local work can continue."});
    };
    let auth = server
        .get("authStatus")
        .and_then(Value::as_str)
        .unwrap_or("unknown");
    let runtime = server
        .get("runtimeStatus")
        .and_then(Value::as_str)
        .unwrap_or("unknown");
    let tools: Vec<_> = server
        .get("tools")
        .and_then(Value::as_object)
        .into_iter()
        .flat_map(|tools| tools.values())
        .filter_map(|tool| tool.get("name").and_then(Value::as_str))
        .filter(|name| READ_TOOLS.contains(name))
        .collect();
    let state = if auth == "notLoggedIn" || runtime == "authenticationRequired" {
        "authenticationRequired"
    } else if server
        .get("toolsError")
        .is_some_and(|error| !error.is_null())
        || ["failed", "cancelled", "disabled"].contains(&runtime)
    {
        "unavailable"
    } else if tools.is_empty() {
        "noReadableTools"
    } else if runtime == "connected" {
        "connected"
    } else {
        "discovered"
    };
    json!({"source":SERVER,"state":state,"authStatus":auth,"runtimeStatus":runtime,"readTools":tools,
        "coverage":"Tool discovery is not a successful business query. Query the needed current objects and dates; each result establishes only that query's coverage. Reading does not refresh the Habits snapshot."})
}


#[cfg(test)]
mod tests {
    #[test]
    fn absent_selected_connection_never_constructs_a_transportless_mcp_override() {
        for writes in [false,true] {
            assert_eq!(thread_config(None,writes),json!({}));
            for habits in [false,true] {
                assert_eq!(thread_config_with_habit_writes(None,writes,habits),json!({}));
            }
        }
    }
    use super::*;
    #[test]
    fn recovery_requires_confirmed_native_startup_failure_not_auth_or_missing_discovery() {
        for (runtime,auth,expected) in [("failed","oAuth",true),("failed","notLoggedIn",false),("authenticationRequired","oAuth",false),("disabled","oAuth",false),("cancelled","oAuth",false),("connected","oAuth",false)] {
            let status=source_status(Ok(json!({"data":[{"name":SERVER,"runtimeStatus":runtime,"authStatus":auth,"tools":{}}]})));
            assert_eq!(startup_failed(&status),expected,"{runtime}/{auth}");
        }
        assert!(!startup_failed(&source_status(Err("No typed runtime startup status".into()))));
        assert!(!startup_failed(&source_status(Ok(json!({"data":[]})))));
    }
    #[test]
    fn native_approval_is_per_enabled_manual_tool_and_removed_from_read_only_or_local_habit_scope() {
        let selected=selected_connection(json!({"name":SERVER,"enabled":true,"transport":{"type":"streamable_http","url":"https://example.invalid"},"disabled_tools":["delete_task"]})).unwrap();
        let manual=thread_config(Some(&selected),true);
        let overrides:Vec<_>=manual.as_object().unwrap().iter().filter(|(key,_)|key.ends_with(".approval_mode")).collect();
        assert_eq!(overrides.len(),7); assert!(overrides.iter().all(|(_,value)|**value==json!("approve")));
        assert!(manual.get("mcp_servers.dida365.tools.delete_task.approval_mode").is_none());
        assert!(manual.get("mcp_servers.dida365.default_tools_approval_mode").is_none());
        let readonly=thread_config(Some(&selected),false);
        assert_eq!(readonly.as_object().unwrap().len(),1);
        let local=thread_config_with_habit_writes(Some(&selected),true,false);
        for tool in ["create_habit","update_habit","upsert_habit_checkins"] {assert!(local.get(format!("mcp_servers.dida365.tools.{tool}.approval_mode")).is_none());}
        assert_eq!(local["mcp_servers.dida365.tools.create_task.approval_mode"],"approve");
        assert_ne!(capability_fingerprint(Some(&selected)),Some(super::super::stable_effect_fingerprint(&selected.get("enabled_tools"))),"Existing manual native threads must rotate when the approval contract changes");
        assert!(capability_fingerprint(None).is_none());
    }
    #[test]
    fn only_local_habit_scope_removes_native_habit_mutations_but_keeps_task_authority() {
        let connection=selected_connection(json!({"name":SERVER,"enabled":true,"transport":{"type":"streamable_http","url":"https://example.invalid"}})).unwrap();
        let local=thread_config_with_habit_writes(Some(&connection),true,false);
        let tools=local["mcp_servers.dida365.enabled_tools"].as_array().unwrap();
        assert!(tools.contains(&json!("create_task")) && tools.contains(&json!("get_habit_checkins")));
        for tool in ["create_habit","update_habit","upsert_habit_checkins"] { assert!(!tools.contains(&json!(tool))); }
        let automatic=thread_config_with_habit_writes(Some(&connection),false,true);
        assert!(automatic["mcp_servers.dida365.enabled_tools"].as_array().unwrap().iter().all(|tool|!super::super::dida_writes::WRITE_TOOLS.contains(&tool.as_str().unwrap())));
    }
    #[test]
    fn only_selected_enabled_dida_reads_are_reused() {
        let source = json!({"name":SERVER,"enabled":true,"transport":{"type":"streamable_http","url":"https://example.invalid","http_headers":{"Authorization":"synthetic secret"}},"disabled_tools":["search_task"]});
        let selected = selected_connection(source.clone()).unwrap();
        let tools = selected["enabled_tools"].as_array().unwrap();
        assert!(tools.contains(&json!("list_habits")));
        assert!(!tools.contains(&json!("search_task")));
        assert!(tools.contains(&json!("create_task")));
        assert!(
            !thread_config(Some(&selected), false)["mcp_servers.dida365.enabled_tools"]
                .as_array()
                .unwrap()
                .contains(&json!("create_task"))
        );
        assert!(
            thread_config(Some(&selected), true)["mcp_servers.dida365.enabled_tools"]
                .as_array()
                .unwrap()
                .contains(&json!("create_task"))
        );
        assert!(selected_connection(
            json!({"name":"unrelated","enabled":true,"transport":source["transport"]})
        )
        .is_none());
        assert!(selected_connection(
            json!({"name":SERVER,"enabled":false,"transport":source["transport"]})
        )
        .is_none());
        let mut command = Command::new("synthetic");
        configure(&mut command, Some(&selected));
        let args: Vec<_> = command.get_args().map(|a| a.to_str().unwrap()).collect();
        assert!(args
            .iter()
            .any(|a| a.contains("http_headers={ \"Authorization\" = \"synthetic secret\" }")));
        assert!(!args.iter().any(|a| a.contains("unrelated")));
        assert!(command
            .get_envs()
            .any(|(name, value)| name == "HOME" && value == std::env::var_os("HOME").as_deref()));
        assert!(validate_config(&json!({"config":{"mcp_servers":{SERVER:{}}}})).is_ok());
        assert!(validate_config(&json!({"config":{"mcp_servers":{"unrelated":{}}}})).is_err());
    }
    #[test]
    fn discovery_is_not_current_data_and_does_not_leak_config_or_errors() {
        let status = source_status(Ok(
            json!({"data":[{"name":SERVER,"authStatus":"unknown","runtimeStatus":"connected","url":"synthetic secret","tools":{"list_habits":{"name":"list_habits","inputSchema":{"type":"object"}},"create_task":{"name":"create_task"}}}]}),
        ));
        assert_eq!(status["state"], "connected");
        assert_eq!(status["readTools"], json!(["list_habits"]));
        assert!(!status.to_string().contains("synthetic secret"));
        assert_eq!(
            source_status(Err("sensitive endpoint".into()))["state"],
            "unavailable"
        );
        assert_eq!(
            source_status(Ok(json!({"data":[]})))["state"],
            "unconfigured"
        );
        assert_eq!(
            source_status(Ok(
                json!({"data":[{"name":SERVER,"authStatus":"notLoggedIn","tools":{}}]})
            ))["state"],
            "authenticationRequired"
        );
        let failure = source_status(Ok(
            json!({"data":[{"name":SERVER,"tools":{},"toolsError":"sensitive endpoint"}]}),
        ));
        assert_eq!(failure["state"], "unavailable");
        assert!(!failure.to_string().contains("sensitive endpoint"));
    }
}

#[cfg(test)]
mod runtime_gate {
    use super::*;
    use crate::collaboration::{
        RuntimeShutdownHandle, StdioJsonlClient, COLLABORATION_READ_PERMISSION_PROFILE,
    };
    #[test]
    #[ignore = "Requires selected Dida; genuine native read-only and only-local catalogs, no mutation"]
    fn native_catalog_keeps_automatic_review_and_only_local_habit_boundaries_after_manual_approval_change() {
        let executable=crate::collaboration::discover_codex_cli().unwrap();
        let connection=discover(&executable).expect("Existing selected source required");
        let root=std::env::temp_dir().join(format!("personal-dashboard-dida-approval-catalog-{}",std::process::id()));
        let mut client=StdioJsonlClient::spawn_with_selected_dida(&executable,&root,RuntimeShutdownHandle::default(),Some(&connection)).unwrap();client.initialize().unwrap();
        for (mode,writes,habit_writes) in [("automatic/review",false,true),("only-local-Habit",true,false)] {
            let started=client.request("thread/start",json!({"cwd":root,"permissions":COLLABORATION_READ_PERMISSION_PROFILE,"approvalPolicy":"never","ephemeral":true,"config":thread_config_with_habit_writes(Some(&connection),writes,habit_writes)})).unwrap();
            let thread=started["thread"]["id"].as_str().unwrap();
            let catalog=client.request("mcpServerStatus/list",json!({"threadId":thread,"serverName":SERVER,"detail":"toolsAndAuthOnly"})).unwrap();
            let tools=catalog["data"][0]["tools"].as_object().expect("Actual native schema required");
            let names:Vec<_>=tools.values().filter_map(|tool|tool["name"].as_str()).collect();
            assert!(names.contains(&"get_habit_checkins"),"{mode} must retain actual current source reads");
            for tool in super::super::dida_writes::WRITE_TOOLS {
                if !writes || ["create_habit","update_habit","upsert_habit_checkins"].contains(tool) {assert!(!names.contains(tool),"{mode} cannot expose mutation {tool}");}
            }
            if writes {assert!(names.contains(&"create_task"));}
        }
        drop(client);std::fs::remove_dir_all(root).unwrap();
    }
    #[test]
    #[ignore = "Requires real selected Dida MCP; read-only runtime probe, no personal mutations"]
    fn selected_dida_is_discovered_and_queried_in_dashboard_runtime() {
        let executable = crate::collaboration::discover_codex_cli().unwrap();
        let connection =
            discover(&executable).expect("Existing enabled Dida HTTP connection required");
        let root = std::env::temp_dir().join(format!(
            "personal-dashboard-dida-read-{}",
            std::process::id()
        ));
        let mut client = StdioJsonlClient::spawn_with_selected_dida(
            &executable,
            &root,
            RuntimeShutdownHandle::default(),
            Some(&connection),
        )
        .unwrap();
        client.initialize().unwrap();
        let effective = client
            .request("config/read", json!({"includeLayers":false}))
            .unwrap();
        let servers = effective["config"]["mcp_servers"]
            .as_object()
            .expect("MCP configuration available");
        assert_eq!(
            servers.len(),
            1,
            "Dashboard must not inherit unrelated MCPs"
        );
        assert!(servers.contains_key(SERVER));
        let started = client.request("thread/start", json!({"cwd":root,"permissions":COLLABORATION_READ_PERMISSION_PROFILE,"approvalPolicy":"never","ephemeral":true,"serviceName":"personal-dashboard"})).unwrap();
        let thread = started["thread"]["id"].as_str().unwrap();
        let catalog = client
            .request(
                "mcpServerStatus/list",
                json!({"threadId":thread,"serverName":SERVER,"detail":"toolsAndAuthOnly"}),
            )
            .unwrap();
        let status = source_status(Ok(catalog.clone()));
        assert!(
            ["connected", "discovered"].contains(&status["state"].as_str().unwrap()),
            "Dida must be callable in Dashboard's own profile: {status}"
        );
        let tools = catalog["data"][0]["tools"].as_object().unwrap();
        assert!(tools
            .values()
            .any(|t| t["name"] == "get_user_preference" && t["inputSchema"].is_object()));
        assert!(!tools.values().any(|t| t["name"] == "create_task"));
        let result = client.request("mcpServer/tool/call", json!({"threadId":thread,"server":SERVER,"tool":"get_user_preference","arguments":{}})).unwrap();
        assert_ne!(result["isError"], true, "Read query must succeed");
        assert!(
            result["content"].as_array().is_some_and(|v| !v.is_empty()),
            "Read query must return evidence"
        );
        drop(client);
        std::fs::remove_dir_all(root).unwrap();
    }
}

#[cfg(test)]
mod actor_approval_gate {
    use super::*;
    use crate::collaboration::{
        CodexAppServerRuntime, CollaborationApplication, CollaborationClock,
        CollaborationContextSource, DashboardContextReader, FileCollaborationStore,
    };
    use std::sync::Arc;
    struct GateClock;
    impl CollaborationClock for GateClock {
        fn current_timestamp(&self) -> String {
            "2026-10-03T17:00:00-04:00".into()
        }
        fn current_date(&self) -> String {
            "2026-10-03".into()
        }
    }
    #[test]
    #[ignore = "Requires explicitly authorized isolated logged-in profile + retained owned Habit; real MODEL mutation/readback and reset"]
    fn real_model_native_habit_write_is_approved_and_verified_through_dashboard_runtime() {
        let profile = std::env::var_os("PD_SPEC54_NATIVE_APPROVAL_PROFILE")
            .map(std::path::PathBuf::from)
            .expect("Explicit isolated acceptance profile required");
        assert_eq!(
            profile,
            std::path::PathBuf::from("/tmp/pd-spec54-acceptance.noindex/profile")
        );
        let workspace: Value =
            serde_json::from_slice(&std::fs::read(profile.join("today-workspace.json")).unwrap())
                .unwrap();
        assert_eq!(
            workspace["selectedVault"],
            "/tmp/pd-spec54-acceptance.noindex/vault"
        );
        assert!(
            profile.join("codex-profile/auth.json").is_file(),
            "Use existing task-owned login in place, never copy credentials"
        );
        let owned: Value = serde_json::from_slice(
            &std::fs::read("/tmp/pd-spec54/dida59-owned-habit.json").unwrap(),
        )
        .unwrap();
        assert_eq!(owned["prepared"], false);
        let id = owned["id"].as_str().unwrap();
        let name = owned["name"].as_str().unwrap();
        let source = Arc::new(DashboardContextReader::new(
            profile.join("today-workspace.json"),
        ));
        let owned_key = source.current_vault_key().unwrap().unwrap();
        let key = owned_key.as_str();
        let app=CollaborationApplication::with_adapters(Arc::new(FileCollaborationStore::new(profile.join("native-approval59-actor-history.json"))),Box::new(CodexAppServerRuntime::new(profile.clone())),source,Arc::new(GateClock),profile.join("collaboration-runtime"),"Only the explicitly identified owned external test Habit may be mutated. Use native MCP directly, read exact ID and historical check-in before and after. Do not create objects or change files or genuine personal data.".into());
        assert!(
            app.connection().read_only_text_turns_available,
            "Existing native runtime/login required"
        );
        let session = app.create_default_session().unwrap();
        let wait = || {
            for _ in 0..3600 {
                let state = app.session(key, &session.id).unwrap();
                if [
                    "completed",
                    "error",
                    "interrupted",
                    "stop-unconfirmed",
                    "attention",
                ]
                .contains(&state.run_state.as_str())
                {
                    return state;
                }
                std::thread::sleep(std::time::Duration::from_millis(100));
            }
            panic!("Owned actor gate did not finish; inspect isolated native history before retry");
        };
        let prepare=format!("只改滴答 Habit {id}（{name}）：准备本次独立验收，先读取20261001..20261004相邻范围，只有2026-10-02或2026-10-03仍有完成打卡时才重置支持的 status 0。已未打卡则不写。回读确认，仅该对象这两个日期，不改名称、其他对象、文件或本地记录。");
        app.submit_message(key, &session.id, "2026-10-03", &prepare)
            .unwrap();
        let prepared = wait();
        assert_eq!(
            prepared.run_state, "completed",
            "Actual-model cleanup preparation must finish before any test write"
        );
        let complete=format!("只改滴答 Habit：稳定 ID {id}，已明确拥有的测试对象名称 {name}。把2026-10-02完成打卡保存为 status 2，未知实际分钟。先读该对象与20261001..20261003相邻日期范围，仅操作该 ID 的20261002；如果已经是2不要重复。写后回读同一范围并核对精确日期。不要改任何其他对象、文件或本地记录。");
        app.submit_message(key, &session.id, "2026-10-03", &complete)
            .unwrap();
        let saved = wait();
        let observed = saved
            .messages
            .iter()
            .flat_map(|message| &message.external_actions)
            .filter(|action| action.tool_id == "upsert_habit_checkins")
            .cloned()
            .collect::<Vec<_>>();
        // Cleanup is another actual MODEL turn, in the same Dashboard session.
        // It reads current source before deciding whether status0 is necessary.
        let reset=format!("只改滴答 Habit {id}（{name}）：撤回本测试的2026-10-02及2026-10-03完成打卡，先读取该对象与20261001..20261004相邻日期范围。已是0/未打卡的日期不要重复写；只有精确对应日期仍有完成状态时才重置为支持的 status 0。写后回读确认两个日期都未标记。不要改其他对象、名称、文件或本地记录。");
        app.submit_message(key, &session.id, "2026-10-03", &reset)
            .unwrap();
        let reset_state = wait();
        let reset_actions = reset_state
            .messages
            .iter()
            .rev()
            .find(|message| message.role == "user")
            .unwrap()
            .external_actions
            .clone();
        std::fs::write("/tmp/pd-spec54/native-approval59-model-evidence.json",json!({"sessionId":session.id,"initialMutationActions":observed,"resetActions":reset_actions,"initialRunState":saved.run_state,"resetRunState":reset_state.run_state,"actorTransport":"CodexAppServerRuntime through CollaborationApplication native item handler; no host MCP business write"}).to_string()).unwrap();
        app.shutdown().unwrap();
        assert!(observed.iter().any(|action|action.status=="saved" && action.verification.as_ref().is_some_and(|v|v["habitCheckin"]["habitId"]==id && v["habitCheckin"]["stamp"]==20261002 && v["habitCheckin"]["status"]==2)),"The actual model must mutate the exact owned source and the production native handler must confirm saved through source readback; inspect private gate evidence");
        assert!(
            reset_actions.iter().any(|action| action.status == "saved"
                && action
                    .verification
                    .as_ref()
                    .is_some_and(|v| v["habitCheckin"]["stamp"] == 20261002
                        && v["habitCheckin"]["status"] == 0)),
            "The actual model cleanup must source-confirm the exact historical reset"
        );
    }
}
