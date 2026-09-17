use personal_dashboard_lib::tasks::{TaskApplication, TaskUpdateInput};
use personal_dashboard_lib::today::{TodayClock, TodayWorkspacePersistence};
use serde_json::{json, Value};
use std::fs;
use std::io::Write;
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};
use std::time::{SystemTime, UNIX_EPOCH};

struct TempVault(PathBuf);

impl TempVault {
    fn new(label: &str) -> Self {
        let nonce = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        let path = std::env::temp_dir().join(format!(
            "personal-dashboard-daily-flow-{label}-{}-{nonce}",
            std::process::id()
        ));
        fs::create_dir_all(path.join(".obsidian")).unwrap();
        fs::create_dir_all(path.join("life/Journal/Daily")).unwrap();
        Self(path)
    }

    fn path(&self) -> &Path {
        &self.0
    }
}

impl Drop for TempVault {
    fn drop(&mut self) {
        let _ = fs::remove_dir_all(&self.0);
    }
}

#[derive(Clone)]
struct SelectedVault(PathBuf);

impl TodayWorkspacePersistence for SelectedVault {
    fn load_selected_vault(&self) -> Result<Option<PathBuf>, String> {
        Ok(Some(self.0.clone()))
    }

    fn save_selected_vault(&self, _vault: &Path) -> Result<(), String> {
        Ok(())
    }
}

struct RehearsalClock {
    date: String,
}

impl TodayClock for RehearsalClock {
    fn current_date(&self) -> String {
        self.date.clone()
    }

    fn current_time_label(&self) -> String {
        "12:00".into()
    }

    fn current_timestamp_label(&self) -> String {
        format!("{}T12:00+00:00", self.date)
    }
}

struct SimulatedDida {
    morning: Result<Vec<&'static str>, &'static str>,
    evening: Result<Vec<&'static str>, &'static str>,
    writes: usize,
}

impl SimulatedDida {
    fn available() -> Self {
        Self {
            morning: Ok(vec!["外部今天参考", "外部逾期参考"]),
            evening: Ok(vec!["外部完成参考"]),
            writes: 0,
        }
    }

    fn unavailable() -> Self {
        Self {
            morning: Err("simulated Dida read unavailable"),
            evening: Err("simulated Dida read unavailable"),
            writes: 0,
        }
    }

    fn read_morning(&self) -> Result<&[&'static str], &'static str> {
        self.morning
            .as_ref()
            .map(Vec::as_slice)
            .map_err(|error| *error)
    }

    fn read_evening(&self) -> Result<&[&'static str], &'static str> {
        self.evening
            .as_ref()
            .map(Vec::as_slice)
            .map_err(|error| *error)
    }
}

fn task_path(vault: &Path) -> PathBuf {
    vault.join("life/.personal-dashboard/tasks/v1/tasks.json")
}

fn run_cli(request: Value) -> Value {
    let mut child = Command::new(env!("CARGO_BIN_EXE_personal-dashboard"))
        .arg("--daily-flow-tasks")
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .unwrap();
    child
        .stdin
        .take()
        .unwrap()
        .write_all(&serde_json::to_vec(&request).unwrap())
        .unwrap();
    let output = child.wait_with_output().unwrap();
    assert!(
        output.status.success(),
        "daily-flow CLI failed: {}",
        String::from_utf8_lossy(&output.stderr)
    );
    serde_json::from_slice(&output.stdout).unwrap()
}

fn run_cli_failure(request: Value) -> String {
    let mut child = Command::new(env!("CARGO_BIN_EXE_personal-dashboard"))
        .arg("--daily-flow-tasks")
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .unwrap();
    child
        .stdin
        .take()
        .unwrap()
        .write_all(&serde_json::to_vec(&request).unwrap())
        .unwrap();
    let output = child.wait_with_output().unwrap();
    assert!(!output.status.success());
    String::from_utf8(output.stderr).unwrap()
}

fn read_request(vault: &Path, lived_date: &str) -> Value {
    json!({
        "operation": "read",
        "schemaVersion": 1,
        "vaultPath": vault,
        "livedDate": lived_date,
    })
}

fn apply_request(
    vault: &Path,
    read: &Value,
    lived_date: &str,
    candidates: Vec<Value>,
    commands: Vec<Value>,
) -> Value {
    json!({
        "operation": "apply",
        "schemaVersion": 1,
        "vaultPath": vault,
        "livedDate": lived_date,
        "targetBinding": read["targetBinding"],
        "expectedRevision": read["revision"],
        "candidates": candidates,
        "commands": commands,
    })
}

fn action(task_id: &str, source_reference: &str, name: &str, date: &str) -> Value {
    json!({
        "kind": "action",
        "taskId": task_id,
        "sourceReference": source_reference,
        "name": name,
        "content": null,
        "date": date,
        "time": null,
        "listId": null,
    })
}

fn suggestion(source_reference: &str, name: &str, date: &str) -> Value {
    json!({
        "kind": "suggestion",
        "sourceReference": source_reference,
        "name": name,
        "content": "仅供考虑",
        "date": date,
        "time": "18:00",
    })
}

fn command(kind: &str, task_id: &str, operation_id: &str, date: Option<&str>) -> Value {
    let mut value = json!({
        "kind": kind,
        "taskId": task_id,
        "operationId": operation_id,
    });
    if kind == "reschedule" {
        value["date"] = date.map_or(Value::Null, |value| json!(value));
        value["time"] = json!("18:00");
    }
    value
}

fn correction(task_id: &str, operation_id: &str, completed_on: &str) -> Value {
    json!({
        "kind": "correctCompletion",
        "taskId": task_id,
        "operationId": operation_id,
        "completedOn": completed_on,
        "completedTime": null,
    })
}

fn task<'a>(read: &'a Value, id: &str) -> &'a Value {
    read["tasks"]
        .as_array()
        .unwrap()
        .iter()
        .find(|value| value["id"] == id)
        .unwrap_or_else(|| panic!("missing task {id}: {read}"))
}

#[test]
fn real_daily_loop_rehearsal_uses_dashboard_for_local_actions_and_keeps_dida_reference_only() {
    let vault = TempVault::new("workflow");
    let dida = SimulatedDida::available();
    assert_eq!(
        dida.read_morning().unwrap(),
        &["外部今天参考", "外部逾期参考"]
    );

    let initial = run_cli(read_request(vault.path(), "2000-01-01"));
    let initial_read = &initial["result"];
    assert_eq!(initial["operation"], "read");
    assert_eq!(initial_read["state"], "empty");
    let lived_date = initial_read["currentDate"].as_str().unwrap().to_owned();

    let suggestion_only = run_cli(apply_request(
        vault.path(),
        initial_read,
        &lived_date,
        vec![suggestion("morning-suggestion", "建议整理", &lived_date)],
        vec![],
    ));
    assert!(!suggestion_only["result"]["changed"].as_bool().unwrap());
    assert!(suggestion_only["result"]["read"]["tasks"]
        .as_array()
        .unwrap()
        .is_empty());
    assert!(!task_path(vault.path()).exists());

    let first_morning = run_cli(apply_request(
        vault.path(),
        initial_read,
        &lived_date,
        vec![action(
            "morning-laundry",
            "morning-laundry-source",
            "洗衣服",
            &lived_date,
        )],
        vec![],
    ));
    assert!(first_morning["result"]["changed"].as_bool().unwrap());
    assert_eq!(first_morning["result"]["actions"][0]["outcome"], "created");

    let repeated_read = run_cli(read_request(vault.path(), &lived_date));
    let repeated_morning = run_cli(apply_request(
        vault.path(),
        &repeated_read["result"],
        &lived_date,
        vec![action(
            "morning-laundry",
            "morning-laundry-source",
            "旧的早间标题",
            &lived_date,
        )],
        vec![],
    ));
    assert!(!repeated_morning["result"]["changed"].as_bool().unwrap());
    assert_eq!(
        repeated_morning["result"]["actions"][0]["outcome"],
        "preserved"
    );

    let before_user_edit = run_cli(read_request(vault.path(), &lived_date));
    let user_application = TaskApplication::with_file_store(
        SelectedVault(vault.path().to_path_buf()),
        RehearsalClock {
            date: lived_date.clone(),
        },
    );
    let after_user_edit = user_application
        .update(TaskUpdateInput {
            target_binding: before_user_edit["result"]["targetBinding"]
                .as_str()
                .unwrap()
                .into(),
            expected_revision: before_user_edit["result"]["revision"]
                .as_str()
                .unwrap()
                .into(),
            task_id: "morning-laundry".into(),
            change_id: "user-edit-morning-laundry".into(),
            name: "用户改名的洗衣服".into(),
            content: Some("用户自己的内容".into()),
            date: Some(lived_date.clone()),
            time: Some("09:00".into()),
            list_id: None,
        })
        .unwrap();

    let repeat_after_edit = run_cli(apply_request(
        vault.path(),
        &json!({
            "targetBinding": after_user_edit.target_binding,
            "revision": after_user_edit.revision,
        }),
        &lived_date,
        vec![action(
            "morning-laundry",
            "morning-laundry-source",
            "重复输入不能覆盖用户编辑",
            &lived_date,
        )],
        vec![],
    ));
    let preserved = task(&repeat_after_edit["result"]["read"], "morning-laundry");
    assert_eq!(preserved["name"], "用户改名的洗衣服");
    assert_eq!(preserved["content"], "用户自己的内容");
    assert_eq!(preserved["time"], "09:00");

    let proposed_reschedule = run_cli(apply_request(
        vault.path(),
        &repeat_after_edit["result"]["read"],
        &lived_date,
        vec![suggestion(
            "daytime-reschedule",
            "建议改到明天",
            "2000-01-02",
        )],
        vec![],
    ));
    assert!(!proposed_reschedule["result"]["changed"].as_bool().unwrap());
    assert_eq!(
        task(&proposed_reschedule["result"]["read"], "morning-laundry")["date"],
        lived_date
    );

    let confirmed_reschedule = run_cli(apply_request(
        vault.path(),
        &proposed_reschedule["result"]["read"],
        &lived_date,
        vec![],
        vec![command(
            "reschedule",
            "morning-laundry",
            "daytime-reschedule-1",
            Some(&lived_date),
        )],
    ));
    assert_eq!(
        confirmed_reschedule["result"]["commands"][0]["outcome"],
        "applied"
    );
    assert_eq!(
        task(&confirmed_reschedule["result"]["read"], "morning-laundry")["time"],
        "18:00"
    );

    let late_created = run_cli(apply_request(
        vault.path(),
        &confirmed_reschedule["result"]["read"],
        &lived_date,
        vec![action(
            "late-completion",
            "evening-late-completion",
            "晚完成任务",
            "2000-01-01",
        )],
        vec![],
    ));
    let late_completed = run_cli(apply_request(
        vault.path(),
        &late_created["result"]["read"],
        &lived_date,
        vec![],
        vec![command(
            "complete",
            "late-completion",
            "evening-complete-late",
            None,
        )],
    ));
    let late_task = task(&late_completed["result"]["read"], "late-completion");
    assert_eq!(late_task["date"], "2000-01-01");
    assert_eq!(late_task["state"], "completed");
    assert_eq!(late_task["completion"]["completedOn"], lived_date);
    assert_eq!(late_task["completion"]["source"], "daily-flow");

    let corrected = run_cli(apply_request(
        vault.path(),
        &late_completed["result"]["read"],
        &lived_date,
        vec![],
        vec![correction(
            "late-completion",
            "evening-correct-late",
            &lived_date,
        )],
    ));
    assert_eq!(
        task(&corrected["result"]["read"], "late-completion")["completion"]["completedOn"],
        lived_date
    );
    assert!(
        task(&corrected["result"]["read"], "late-completion")["completion"]["completedTime"]
            .is_null()
    );

    let abandoned_created = run_cli(apply_request(
        vault.path(),
        &corrected["result"]["read"],
        &lived_date,
        vec![action(
            "evening-abandon",
            "evening-abandon-source",
            "明确放弃任务",
            &lived_date,
        )],
        vec![],
    ));
    let abandoned = run_cli(apply_request(
        vault.path(),
        &abandoned_created["result"]["read"],
        &lived_date,
        vec![],
        vec![command(
            "abandon",
            "evening-abandon",
            "evening-abandon-1",
            None,
        )],
    ));
    assert_eq!(
        task(&abandoned["result"]["read"], "evening-abandon")["state"],
        "abandoned"
    );
    assert!(
        !task(&abandoned["result"]["read"], "evening-abandon")["planningEligible"]
            .as_bool()
            .unwrap()
    );

    let evening = run_cli(read_request(vault.path(), &lived_date));
    let evening_late = task(&evening["result"], "late-completion");
    assert!(evening_late["reasons"]
        .as_array()
        .unwrap()
        .iter()
        .any(|reason| reason == "completedOnLivedDate"));
    assert_eq!(dida.read_evening().unwrap(), &["外部完成参考"]);
    assert_eq!(
        dida.writes, 0,
        "the rehearsal must never write simulated Dida data"
    );

    let source_unavailable = SimulatedDida::unavailable();
    assert!(source_unavailable.read_morning().is_err());
    assert!(source_unavailable.read_evening().is_err());

    let stale_read = run_cli(read_request(vault.path(), &lived_date));
    let changed_again = run_cli(apply_request(
        vault.path(),
        &stale_read["result"],
        &lived_date,
        vec![action(
            "conflict-source",
            "daytime-conflict",
            "另一个明确行动",
            &lived_date,
        )],
        vec![],
    ));
    let bytes_after_change = fs::read(task_path(vault.path())).unwrap();
    let conflict_error = run_cli_failure(apply_request(
        vault.path(),
        &stale_read["result"],
        &lived_date,
        vec![action(
            "stale-source",
            "daytime-stale",
            "陈旧输入",
            &lived_date,
        )],
        vec![],
    ));
    assert!(!conflict_error.is_empty());
    assert_eq!(
        fs::read(task_path(vault.path())).unwrap(),
        bytes_after_change
    );
    assert!(changed_again["result"]["changed"].as_bool().unwrap());

    fs::write(
        task_path(vault.path()),
        br#"{"schemaVersion":1,"lists":[]}"#,
    )
    .unwrap();
    let damaged = run_cli(read_request(vault.path(), &lived_date));
    assert_eq!(damaged["result"]["state"], "damaged");
    assert!(damaged["result"]["tasks"].as_array().unwrap().is_empty());
}
