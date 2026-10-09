use super::app_server_request_tests::turn_client;
use super::*;
use std::time::Instant;

#[derive(Clone)]
struct Workspace(PathBuf);
impl TodayWorkspacePersistence for Workspace {
    fn load_selected_vault(&self) -> Result<Option<PathBuf>, String> {
        Ok(Some(self.0.clone()))
    }
    fn save_selected_vault(&self, _: &Path) -> Result<(), String> {
        panic!("test never selects another Vault")
    }
}
#[derive(Clone, Copy)]
struct FixedClock;
impl CollaborationClock for FixedClock {
    fn current_timestamp(&self) -> String {
        "2026-10-09T10:00:00-04:00".into()
    }
    fn current_date(&self) -> String {
        "2026-10-09".into()
    }
}
impl TodayClock for FixedClock {
    fn current_timestamp_label(&self) -> String {
        CollaborationClock::current_timestamp(self)
    }
    fn current_date(&self) -> String {
        CollaborationClock::current_date(self)
    }
    fn current_time_label(&self) -> String {
        "10:00".into()
    }
}

struct Context(Workspace);
impl CollaborationContextSource for Context {
    fn current_vault_key(&self) -> Result<Option<String>, String> {
        Ok(Some("history-vault".into()))
    }
    fn read_context(
        &self,
        _: Option<&str>,
        date: &str,
    ) -> Result<CollaborationContextView, String> {
        let tasks = TaskApplication::with_file_store(self.0.clone(), FixedClock).read()?;
        let pane = || ContextPaneView {
            state: "ready".into(),
            message: "Synthetic current facts".into(),
            items: Vec::new(),
        };
        Ok(CollaborationContextView {
            date: date.into(),
            vault_name: Some("history fixture".into()),
            daily_record: pane(),
            tasks: pane(),
            habits: pane(),
            task_revision: tasks.revision,
            task_target_binding: tasks.target_binding,
            task_records: Vec::new(),
            task_lists: Vec::new(),
        })
    }
}

/// Inject at the actual JSONL boundary, while the application uses its real
/// session adapter, TaskApplication and FileCollaborationStore.
struct InjectedTransport;
impl AppServerTransport for InjectedTransport {
    fn inspect(&mut self) -> Result<RuntimeConnectionView, String> {
        let mut connection = RuntimeConnectionView::unavailable("synthetic");
        connection.authenticated = true;
        connection.auth_mode = Some("chatgpt".into());
        connection.read_only_text_turns_available = true;
        connection.text_turn_unavailable_reason = None;
        connection.error = None;
        Ok(connection)
    }
    fn start_chatgpt_login(&mut self) -> Result<(), String> {
        panic!("no live login")
    }
    fn start_thread(&mut self, _: Option<&str>, _: &str) -> Result<String, String> {
        Ok("history-thread".into())
    }
    fn resume_thread(&mut self, _: &str) -> Result<(), String> {
        Ok(())
    }
    fn send_turn(&mut self, _: RuntimeTurnRequest) -> Result<RuntimeTurnResult, String> {
        panic!("observed boundary must be used")
    }
    fn send_turn_observed(
        &mut self,
        request: RuntimeTurnRequest,
        cancel: Arc<AtomicBool>,
        handler: Option<RuntimeDynamicToolHandler>,
        _: Option<RuntimeExternalActionHandler>,
        _: Option<RuntimeExternalApprovalHandler>,
        observer: Option<RuntimeWorkObserver>,
    ) -> Result<RuntimeTurnResult, String> {
        let (mut client, sender, stdout) = turn_client();
        let thread = request.thread_id;
        let events = [
            json!({"method":"item/completed","emittedAtMs":500,"params":{"threadId":"other","turnId":"turn","item":{"id":"foreign","type":"agentMessage","text":"Do not retain"}}}),
            json!({"method":"item/started","emittedAtMs":1000,"params":{"threadId":thread,"turnId":"turn","startedAtMs":900,"item":{"id":"comment","type":"agentMessage","phase":"commentary","text":"Checking the task list."}}}),
            json!({"method":"item/reasoning/summaryTextDelta","params":{"threadId":thread,"turnId":"turn","itemId":"summary","summaryIndex":0,"delta":"Use the current task revision."}}),
            json!({"method":"item/reasoning/textDelta","params":{"threadId":thread,"turnId":"turn","itemId":"summary","delta":"HIDDEN CONTENT"}}),
            json!({"method":"item/completed","params":{"threadId":thread,"turnId":"turn","item":{"id":"summary","type":"reasoning","summary":["Use the current task revision."],"content":["HIDDEN CONTENT"]}}}),
            json!({"method":"item/tool/call","id":"bad","params":{"threadId":thread,"turnId":"turn","callId":"attempt-1","tool":COLLABORATION_TASK_TOOL,"arguments":{"operation":"createTask","executionMode":"invalid"}}}),
            json!({"method":"error","params":{"threadId":thread,"turnId":"turn","willRetry":true,"error":{"message":"API token=PRIVATE DIAGNOSTIC"}}}),
            json!({"method":"item/tool/call","id":"good","params":{"threadId":thread,"turnId":"turn","callId":"attempt-2","tool":COLLABORATION_TASK_TOOL,"arguments":{"operation":"createTask","executionMode":"execute","name":"Synthetic groceries","content":null,"date":"2026-10-09","time":null,"listId":null}}}),
            json!({"method":"item/completed","params":{"threadId":thread,"turnId":"turn","item":{"id":"command-failed","type":"commandExecution","status":"completed","exitCode":2,"aggregatedOutput":"RAW COMMAND OUTPUT"}}}),
            json!({"method":"item/agentMessage/delta","params":{"threadId":thread,"turnId":"turn","itemId":"final","delta":"Saved "}}),
            json!({"method":"item/agentMessage/delta","params":{"threadId":thread,"turnId":"turn","itemId":"final","delta":"Saved "}}),
            json!({"method":"item/completed","params":{"threadId":thread,"turnId":"turn","item":{"id":"final","type":"agentMessage","phase":"final_answer","text":"Created Synthetic groceries."}}}),
            json!({"method":"item/completed","params":{"threadId":thread,"turnId":"turn","item":{"id":"final","type":"agentMessage","phase":"final_answer","text":"Created Synthetic groceries."}}}),
            json!({"method":"item/agentMessage/delta","params":{"threadId":thread,"turnId":"turn","itemId":"final","delta":"LATE DUPLICATE"}}),
            json!({"method":"thread/tokenUsage/updated","params":{"threadId":thread,"turnId":"turn","tokenUsage":{"total":{"totalTokens":100,"inputTokens":70,"cachedInputTokens":20,"cacheWriteInputTokens":0,"outputTokens":30,"reasoningOutputTokens":10},"last":{"totalTokens":50,"inputTokens":35,"cachedInputTokens":10,"cacheWriteInputTokens":0,"outputTokens":15,"reasoningOutputTokens":5},"modelContextWindow":200000}}}),
            json!({"method":"turn/completed","params":{"threadId":thread,"turn":{"id":"turn","status":"completed","startedAt":100,"completedAt":105,"itemsView":"notLoaded"}}}),
        ];
        for event in events {
            sender.send(Ok(event.to_string())).unwrap();
        }
        // Keep observing tool RPC responses even when history persistence fails.
        let reader = std::thread::spawn(move || {
            BufReader::new(stdout)
                .lines()
                .take(2)
                .map(|line| serde_json::from_str::<Value>(&line.unwrap()).unwrap())
                .collect::<Vec<_>>()
        });
        let result = client.wait_for_turn_observed(
            &thread,
            "turn",
            &cancel,
            handler.as_ref(),
            "2026-10-09",
            None,
            None,
            observer,
        );
        drop(client);
        let replies = reader.join().unwrap();
        assert_eq!(
            replies.len(),
            2,
            "both actual tool RPC replies survive observer failure"
        );
        assert_eq!(replies[0]["result"]["success"], false);
        assert_eq!(
            replies[1]["result"]["success"], true,
            "tool reply: {}",
            replies[1]
        );
        let (text, stopped, external_actions) = result?;
        Ok(RuntimeTurnResult {
            text,
            stopped,
            external_actions,
            runtime_turn_id: Some("turn".into()),
        })
    }
}

struct FailCompletedHistoryOnce {
    file: FileCollaborationStore,
    fail: AtomicBool,
}
impl CollaborationStore for FailCompletedHistoryOnce {
    fn load(&self) -> Result<CollaborationState, String> {
        self.file.load()
    }
    fn save(&self, state: &CollaborationState) -> Result<(), String> {
        if state.sessions.iter().any(|session| {
            session.work_history.iter().any(|history| {
                history.items.iter().any(|item| {
                    item.call_id.as_deref() == Some("attempt-2") && item.status == "completed"
                })
            })
        }) && self.fail.swap(false, Ordering::SeqCst)
        {
            return Err("Synthetic history write failure".into());
        }
        self.file.save(state)
    }
}

fn isolated_root() -> PathBuf {
    let root = std::env::temp_dir().join(format!(
        "dashboard-work-history-{}-{}",
        std::process::id(),
        IDENTIFIER_SEQUENCE.fetch_add(1, Ordering::Relaxed)
    ));
    fs::create_dir_all(root.join("vault/life/Journal/Daily")).unwrap();
    fs::create_dir_all(root.join("vault/.obsidian")).unwrap();
    root
}
fn application(root: &Path, store: Arc<dyn CollaborationStore>) -> CollaborationApplication {
    let workspace = Workspace(root.join("vault"));
    CollaborationApplication::with_adapters(
        store,
        Box::new(InjectedTransport),
        Arc::new(Context(workspace.clone())),
        Arc::new(FixedClock),
        root.join("work"),
        "Synthetic usage package".into(),
    )
    .with_task_service(Arc::new(TaskApplicationCollaborationAdapter::new(
        TaskApplication::with_file_store(workspace, FixedClock),
    )))
}
fn await_end(application: &CollaborationApplication, session: &str) -> CollaborationSessionView {
    let deadline = Instant::now() + Duration::from_secs(3);
    loop {
        let session = application.session("history-vault", session).unwrap();
        if !matches!(
            session.run_state.as_str(),
            "queued" | "thinking" | "reading"
        ) {
            return session;
        }
        assert!(
            Instant::now() < deadline,
            "actual application did not complete"
        );
        thread::sleep(Duration::from_millis(10));
    }
}

#[test]
fn actual_stdio_history_and_receipts_survive_application_reopen_without_hidden_content() {
    let root = isolated_root();
    let history_path = root.join("history/state.json");
    let app = application(
        &root,
        Arc::new(FileCollaborationStore::new(history_path.clone())),
    );
    let session = app.create_session("2026-10-09").unwrap();
    app.submit_message(
        "history-vault",
        &session.id,
        "2026-10-09",
        "Create Synthetic groceries",
    )
    .unwrap();
    let finished = await_end(&app, &session.id);
    assert_eq!(finished.run_state, "completed", "{}", finished.progress);
    assert_eq!(
        finished.messages.last().unwrap().text,
        "Created Synthetic groceries."
    );
    assert_eq!(finished.work_history.len(), 1);
    let history = &finished.work_history[0];
    assert_eq!(
        history.execution_id,
        finished.messages[0].execution_id.clone().unwrap()
    );
    assert_eq!(history.status, "completed");
    assert_eq!(history.runtime_started_at_ms, Some(100000));
    assert_eq!(
        history.token_usage.as_ref().unwrap().last.total_tokens,
        Some(50)
    );
    assert_eq!(
        history
            .items
            .iter()
            .filter(|item| item.item_id == "final")
            .count(),
        1
    );
    assert!(history
        .items
        .iter()
        .any(|item| item.call_id.as_deref() == Some("attempt-1") && item.status == "failed"));
    assert!(history
        .items
        .iter()
        .any(|item| item.call_id.as_deref() == Some("attempt-2") && item.status == "completed"));
    assert!(history
        .items
        .iter()
        .any(|item| item.kind == "runtimeError" && item.status == "retrying"));
    assert!(history
        .items
        .iter()
        .any(|item| item.item_id == "command-failed"
            && item.status == "failed"
            && item.diagnostic.as_deref() == Some("Command exited with code 2.")));
    assert_eq!(finished.task_operations[0].status, "applied");
    let serialized = serde_json::to_string(&finished).unwrap();
    for omitted in [
        "HIDDEN CONTENT",
        "API token=PRIVATE DIAGNOSTIC",
        "Do not retain",
        "RAW COMMAND OUTPUT",
        "LATE DUPLICATE",
    ] {
        assert!(!serialized.contains(omitted));
    }
    let reopened = application(
        &root,
        Arc::new(FileCollaborationStore::new(history_path.clone())),
    );
    let loaded = reopened.session("history-vault", &session.id).unwrap();
    assert_eq!(loaded.work_history, finished.work_history);
    assert_eq!(loaded.task_operations, finished.task_operations);
    // Real legacy file loading: absence is unavailable evidence, never fabricated.
    let mut legacy: Value = serde_json::from_slice(&fs::read(&history_path).unwrap()).unwrap();
    legacy["sessions"][0]
        .as_object_mut()
        .unwrap()
        .remove("workHistory");
    fs::write(&history_path, serde_json::to_vec(&legacy).unwrap()).unwrap();
    assert!(
        application(&root, Arc::new(FileCollaborationStore::new(history_path)))
            .session("history-vault", &session.id)
            .unwrap()
            .work_history
            .is_empty()
    );
    fs::remove_dir_all(root).unwrap();
}

#[test]
fn history_failure_after_canonical_save_keeps_receipt_and_returns_tool_reply() {
    let root = isolated_root();
    let app = application(
        &root,
        Arc::new(FailCompletedHistoryOnce {
            file: FileCollaborationStore::new(root.join("history/state.json")),
            fail: AtomicBool::new(true),
        }),
    );
    let session = app.create_session("2026-10-09").unwrap();
    app.submit_message(
        "history-vault",
        &session.id,
        "2026-10-09",
        "Create Synthetic groceries",
    )
    .unwrap();
    let ended = await_end(&app, &session.id);
    assert_eq!(ended.run_state, "interrupted");
    assert!(ended.progress.contains("work history"));
    assert_eq!(ended.task_operations[0].status, "applied");
    assert_eq!(ended.work_history[0].status, "history-save-failed");
    let tasks = TaskApplication::with_file_store(Workspace(root.join("vault")), FixedClock)
        .read()
        .unwrap();
    assert_eq!(tasks.tasks.len(), 1);
    assert_eq!(tasks.tasks[0].name, "Synthetic groceries");
    fs::remove_dir_all(root).unwrap();
}
