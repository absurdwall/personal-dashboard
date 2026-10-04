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

pub(super) const READ_GUIDANCE: &str = "The host-selected existing dida365 MCP reads are available as needed in manual and automatic morning turns, including existing sessions; no per-message source selection is required. Use the discovered MCP tool schemas directly for current Task/list, Habit/check-in/history and timezone preference queries. Keep stable external object identities and query date/range/source distinct from local Dashboard Task identities. Use actual query results, not old chat or retained snapshots. Report confirmed empty results separately from failure, authentication-required, partial coverage and unavailable sources. Preserve useful source/date/coverage in replies and morning evidence, without raw dumps or sensitive configuration. Discovery alone does not confirm a query or refresh Habits. External failure does not prevent supported local work. This connection currently exposes only reads; do not create/copy/write external objects or infer local Tasks from external ones.";

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn only_selected_enabled_dida_reads_are_reused() {
        let source = json!({"name":SERVER,"enabled":true,"transport":{"type":"streamable_http","url":"https://example.invalid","http_headers":{"Authorization":"synthetic secret"}},"disabled_tools":["search_task"]});
        let selected = selected_connection(source.clone()).unwrap();
        let tools = selected["enabled_tools"].as_array().unwrap();
        assert!(tools.contains(&json!("list_habits")));
        assert!(!tools.contains(&json!("search_task")));
        assert!(!tools.contains(&json!("create_task")));
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
