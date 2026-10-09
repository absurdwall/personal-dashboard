use super::app_server_request_tests::turn_client;
use super::*;
use std::sync::atomic::AtomicUsize;
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
    fn selected_vault_path(&self, _: &str) -> Result<Option<PathBuf>, String> {
        Ok(Some(self.0 .0.clone()))
    }
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
        connection.executable_path = Some("/synthetic/codex".into());
        connection.version = Some("synthetic-runtime-1".into());
        connection.models = vec![ModelOptionView {
            id: "synthetic-model".into(),
            display_name: "Synthetic".into(),
            default_reasoning_effort: Some("low".into()),
            reasoning_efforts: vec!["low".into()],
            is_default: true,
        }];
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
        if request.user_text == "Generate bounded evidence" {
            let mut items = (0..20).map(|index|json!({"id":format!("comment-{index}"),"type":"agentMessage","phase":"commentary","text":"可见内容".repeat(5461)})).collect::<Vec<_>>();
            items.push(json!({"id":"failed-command","type":"commandExecution","status":"failed","exitCode":7}));
            items.push(json!({"id":"file","type":"fileChange","status":"completed","changes":[{"path":request.selected_vault.as_ref().unwrap().join("life/ordinary.md"),"kind":{"type":"update"},"diff":"d".repeat(65536)}]}));
            items.push(json!({"id":"final","type":"agentMessage","phase":"final_answer","text":"Final original reply ".repeat(4000)}));
            sender.send(Ok(json!({"method":"turn/completed","params":{"threadId":request.thread_id,"turn":{"id":"budget-turn","status":"completed","items":items}}}).to_string())).unwrap();
            let (text,stopped,external_actions)=client.wait_for_turn_observed(&request.thread_id,"budget-turn",&cancel,handler.as_ref(),"2026-10-09",None,None,observer)?;
            return Ok(RuntimeTurnResult{text,stopped,external_actions,runtime_turn_id:Some("budget-turn".into())});
        }
        if request.user_text == "Refresh saturated native source cache" {
            let thread=request.thread_id.clone();
            let read=|id:String,tool:&str,args:Value,result:Value|json!({"method":"item/completed","params":{"threadId":thread,"turnId":"refresh-turn","item":{"id":id,"type":"mcpToolCall","server":"dida365","tool":tool,"status":"completed","arguments":args,"result":{"structuredContent":result}}}});
            sender.send(Ok(read("source-object".into(),"get_habit",json!({"habit_id":"owned-counterpart"}),json!({"result":{"id":"owned-counterpart","name":"Owned"}})).to_string())).unwrap();
            sender.send(Ok(read("source-window".into(),"get_habit_checkins",json!({"habit_ids":["owned-counterpart"],"from_stamp":20260719,"to_stamp":20261010}),json!({"result":[{"habitId":"owned-counterpart","checkins":[]}]})).to_string())).unwrap();
            for index in 0..32 { sender.send(Ok(read(format!("extra-{index}"),"get_habit",json!({"habit_id":format!("unrelated-{index}")}),json!({"result":{"id":format!("unrelated-{index}"),"name":"Unrelated same display name"}})).to_string())).unwrap(); }
            sender.send(Ok(json!({"method":"item/tool/call","id":"refresh-rpc","params":{"threadId":thread,"turnId":"refresh-turn","callId":"refresh-call","tool":COLLABORATION_HABIT_REFRESH_TOOL,"arguments":{"executionMode":"execute","mappings":{"exercise":"owned-counterpart"}}}}).to_string())).unwrap();
            sender.send(Ok(json!({"method":"item/completed","params":{"threadId":thread,"turnId":"refresh-turn","item":{"id":"final","type":"agentMessage","phase":"final_answer","text":"Source coverage checked."}}}).to_string())).unwrap();
            sender.send(Ok(json!({"method":"turn/completed","params":{"threadId":thread,"turn":{"id":"refresh-turn","status":"completed"}}}).to_string())).unwrap();
            let reader=std::thread::spawn(move ||BufReader::new(stdout).lines().take(1).collect::<Vec<_>>());
            let result=client.wait_for_turn_observed(&thread,"refresh-turn",&cancel,handler.as_ref(),"2026-10-09",None,None,observer);
            drop(client);reader.join().unwrap();
            let (text,stopped,external_actions)=result?;
            return Ok(RuntimeTurnResult {text,stopped,external_actions,runtime_turn_id:Some("refresh-turn".into())});
        }
        if request.user_text.starts_with("Refresh mapped habits") {
            client.habit_refresh_context = Some(request.habit_completion_context["producer"].clone());
            let thread = request.thread_id.clone();
            let response_sender = sender.clone();
            let response_thread = thread.clone();
            let partial = request.user_text.ends_with("partial");
            let source_error = request.user_text.ends_with("source error");
            let duplicate = request.user_text.ends_with("duplicate");
            let reader = std::thread::spawn(move || {
                let mut calls = Vec::new();
                for line in BufReader::new(stdout).lines() {
                    let call: Value = serde_json::from_str(&line.unwrap()).unwrap();
                    let result = match call["method"].as_str() {
                        Some("mcpServerStatus/list") => json!({"data":[{"name":"dida365","runtimeStatus":"connected","tools":{
                            "get_habit":{"name":"get_habit","inputSchema":{"type":"object","required":["habit_id"],"properties":{"habit_id":{"type":"string"}}}},
                            "get_habit_checkins":{"name":"get_habit_checkins","inputSchema":{"type":"object","required":["habit_ids","from_stamp","to_stamp"],"properties":{"habit_ids":{"type":"array"},"from_stamp":{"type":"integer"},"to_stamp":{"type":"integer"},"client_timezone":{"type":"string"}}}}
                        } }]}),
                        Some("mcpServer/tool/call") => {
                            assert_eq!(call["params"]["server"], "dida365");
                            calls.push(call["params"].clone());
                            if source_error && call["params"]["tool"] == "get_habit_checkins" {
                                response_sender.send(Ok(json!({"id":call["id"],"error":{"code":-32000,"message":"Native Habit source coverage is partial, paginated, failed or unavailable"}}).to_string())).unwrap();
                                continue;
                            }
                            match call["params"]["tool"].as_str().unwrap() {
                                "get_habit" => json!({"structuredContent":{"result":{"id":"owned-counterpart","name":"Same display name is not identity"}}}),
                                "get_habit_checkins" if partial => json!({"structuredContent":{"partial":true,"result":[{"habitId":"owned-counterpart","checkins":[]}]}}),
                                "get_habit_checkins" => json!({"structuredContent":{"result":[{"habitId":"owned-counterpart","checkins":[{"stamp":20261003,"status":2}]}]}}),
                                other => panic!("No mutation/read wrapper: {other}"),
                            }
                        },
                        None if call["id"] == "refresh-rpc" && duplicate => {
                            response_sender.send(Ok(json!({"method":"item/tool/call","id":"refresh-duplicate","params":{"threadId":response_thread,"turnId":"refresh-turn","callId":"refresh-call","tool":COLLABORATION_HABIT_REFRESH_TOOL,"arguments":{"executionMode":"execute"}}}).to_string())).unwrap();
                            continue;
                        },
                        None if call["id"] == "refresh-rpc" || call["id"] == "refresh-duplicate" => {
                            response_sender.send(Ok(json!({"method":"item/completed","params":{"threadId":response_thread,"turnId":"refresh-turn","item":{"id":"refresh-final","type":"agentMessage","phase":"final_answer","text":"Refresh outcome checked."}}}).to_string())).unwrap();
                            response_sender.send(Ok(json!({"method":"turn/completed","params":{"threadId":response_thread,"turn":{"id":"refresh-turn","status":"completed"}}}).to_string())).unwrap();
                            break;
                        },
                        other => panic!("Unexpected native request {other:?}"),
                    };
                    response_sender.send(Ok(json!({"id":call["id"],"result":result}).to_string())).unwrap();
                }
                calls
            });
            sender.send(Ok(json!({"method":"item/tool/call","id":"refresh-rpc","params":{"threadId":thread,"turnId":"refresh-turn","callId":"refresh-call","tool":COLLABORATION_HABIT_REFRESH_TOOL,"arguments":{"executionMode":"execute"}}}).to_string())).unwrap();
            let result = client.wait_for_turn_observed(&thread,"refresh-turn",&cancel,handler.as_ref(),"2026-10-09",None,None,observer);
            drop(client);
            let calls = reader.join().unwrap();
            if result.is_ok() && !partial {
                assert_eq!(calls.len(), 2, "producer owns exact-object and full-window reads");
                assert_eq!(calls[0]["arguments"], json!({"habit_id":"owned-counterpart"}));
                assert_eq!(calls[1]["arguments"], json!({"habit_ids":["owned-counterpart"],"from_stamp":20260719,"to_stamp":20261010}));
            }
            let (text,stopped,external_actions)=result?;
            return Ok(RuntimeTurnResult {text,stopped,external_actions,runtime_turn_id:Some("refresh-turn".into())});
        }
        if request.user_text == "Update durable background" {
            for event in [
                json!({"method":"item/tool/call","id":"memory-rpc","params":{"threadId":request.thread_id,"turnId":"memory-turn","callId":"memory-call","tool":COLLABORATION_MEMORY_TOOL,"arguments":{"operation":"proposeLongTermUpdate","basis":"explicitUserInstruction","executionMode":"execute","change":"Prefers a quiet morning.","replaces":null}}}),
                json!({"method":"item/completed","params":{"threadId":request.thread_id,"turnId":"memory-turn","item":{"id":"final","type":"agentMessage","phase":"final_answer","text":"Updated durable background."}}}),
                json!({"method":"turn/completed","params":{"threadId":request.thread_id,"turn":{"id":"memory-turn","status":"completed"}}}),
            ] {
                sender.send(Ok(event.to_string())).unwrap();
            }
            let (text, stopped, external_actions) = client.wait_for_turn_observed(
                &request.thread_id,
                "memory-turn",
                &cancel,
                handler.as_ref(),
                "2026-10-09",
                None,
                None,
                observer,
            )?;
            return Ok(RuntimeTurnResult {
                text,
                stopped,
                external_actions,
                runtime_turn_id: Some("memory-turn".into()),
            });
        }
        if request.user_text.starts_with("Patch the ordinary document") {
            let path = request
                .selected_vault
                .as_ref()
                .unwrap()
                .join("life/ordinary.md");
            let observer = if request.user_text.ends_with("with later edit") {
                let original_observer = observer.unwrap();
                let edited_path = path.clone();
                let edited = Arc::new(AtomicBool::new(false));
                Some(Arc::new(move |history: CollaborationWorkHistory| {
                    let completed = history
                        .items
                        .iter()
                        .any(|item| item.item_id == "file-change" && item.authoritative);
                    original_observer(history)?;
                    if completed && !edited.swap(true, Ordering::SeqCst) {
                        fs::write(
                            &edited_path,
                            "Later independent correction\nKeep unrelated paragraph\n",
                        )
                        .unwrap();
                    }
                    Ok(())
                }) as RuntimeWorkObserver)
            } else {
                observer
            };
            let original = fs::read_to_string(&path).unwrap();
            let overwrite = request.user_text.contains("with overwrite");
            let corrected = original.replace("Old fact", "Corrected fact");
            fs::write(&path, if overwrite {corrected.replace("Keep unrelated paragraph\n", "")} else {corrected}).unwrap();
            let diff = if overwrite {"@@ -1,2 +1 @@\n-Old fact\n-Keep unrelated paragraph\n+Corrected fact\n"} else {"@@ -1,2 +1,2 @@\n-Old fact\n+Corrected fact\n Keep unrelated paragraph\n"};
            for event in [
                json!({"method":"item/started","params":{"threadId":request.thread_id,"turnId":"document-turn","item":{"id":"file-change","type":"fileChange","status":"inProgress","changes":[{"path":path,"kind":{"type":"update","move_path":null},"diff":diff}]}}}),
                json!({"method":"item/completed","params":{"threadId":request.thread_id,"turnId":"document-turn","item":{"id":"file-change","type":"fileChange","status":"completed","changes":[{"path":path,"kind":{"type":"update","move_path":null},"diff":diff}]}}}),
                json!({"method":"item/completed","params":{"threadId":request.thread_id,"turnId":"document-turn","item":{"id":"final","type":"agentMessage","phase":"final_answer","text":"Corrected the document."}}}),
                json!({"method":"turn/completed","params":{"threadId":request.thread_id,"turn":{"id":"document-turn","status":"completed"}}}),
            ] {
                sender.send(Ok(event.to_string())).unwrap();
            }
            let (text, stopped, external_actions) = client.wait_for_turn_observed(
                &request.thread_id,
                "document-turn",
                &cancel,
                handler.as_ref(),
                "2026-10-09",
                None,
                None,
                observer,
            )?;
            return Ok(RuntimeTurnResult {
                text,
                stopped,
                external_actions,
                runtime_turn_id: Some("document-turn".into()),
            });
        }
        if request.user_text.starts_with("Trace unknown synthetic external") {
            let thread = request.thread_id;
            for event in [
                json!({"method":"item/started","params":{"threadId":thread,"turnId":"unknown-turn","item":{"id":"unknown-write","type":"mcpToolCall","server":"synthetic","tool":"upsert_task","arguments":{"task_id":"synthetic-owned-A","date":"2026-10-09"},"status":"inProgress"}}}),
                json!({"method":"item/completed","params":{"threadId":thread,"turnId":"unknown-turn","item":{"id":"replay-write","type":"mcpToolCall","server":"synthetic","tool":"upsert_task","arguments":{"task_id":"synthetic-owned-A","date":"2026-10-09"},"status":"completed"}}}),
                json!({"method":"item/completed","params":{"threadId":thread,"turnId":"unknown-turn","item":{"id":"final","type":"agentMessage","phase":"final_answer","text":"All source writes saved."}}}),
                json!({"method":"turn/completed","params":{"threadId":thread,"turn":{"id":"unknown-turn","status":"completed"}}}),
            ] { sender.send(Ok(event.to_string())).unwrap(); }
            let (text,stopped,external_actions)=client.wait_for_turn_observed(&thread,"unknown-turn",&cancel,handler.as_ref(),"2026-10-09",None,None,observer)?;
            return Ok(RuntimeTurnResult{text,stopped,external_actions,runtime_turn_id:Some("unknown-turn".into())});
        }
        let wrong_target=request.user_text.contains("wrong-target fixture");
        let turn_id=format!("turn-{}",request.execution_id);
        let thread = request.thread_id;
        let events = [
            json!({"method":"item/completed","emittedAtMs":500,"params":{"threadId":"other","turnId":"turn","item":{"id":"foreign","type":"agentMessage","text":"Do not retain"}}}),
            json!({"method":"item/started","emittedAtMs":1000,"params":{"threadId":thread,"turnId":"turn","startedAtMs":900,"item":{"id":"comment","type":"agentMessage","phase":"commentary","text":"Checking the task list."}}}),
            json!({"method":"item/reasoning/summaryTextDelta","params":{"threadId":thread,"turnId":"turn","itemId":"summary","summaryIndex":0,"delta":"Use the current task revision."}}),
            json!({"method":"item/reasoning/textDelta","params":{"threadId":thread,"turnId":"turn","itemId":"summary","delta":"HIDDEN CONTENT"}}),
            json!({"method":"item/completed","params":{"threadId":thread,"turnId":"turn","item":{"id":"summary","type":"reasoning","summary":["Use the current task revision."],"content":["HIDDEN CONTENT"]}}}),
            json!({"method":"item/completed","params":{"threadId":thread,"turnId":"turn","item":{"id":"read-1","type":"mcpToolCall","server":"synthetic","tool":"read_tasks","arguments":{"scope":"local","date":"2026-10-09"},"status":"completed"}}}),
            json!({"method":"item/completed","params":{"threadId":thread,"turnId":"turn","item":{"id":"read-2","type":"mcpToolCall","server":"synthetic","tool":"read_tasks","arguments":{"scope":"local","date":"2026-10-09"},"status":"completed"}}}),
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
        for mut event in events {
            if event["params"]["turnId"] == "turn" {event["params"]["turnId"]=json!(turn_id);}
            if event["params"]["turn"]["id"] == "turn" {event["params"]["turn"]["id"]=json!(turn_id);}
            if wrong_target && event["id"] == "good" {
                event["params"]["arguments"]=json!({"operation":"updateTask","executionMode":"execute","taskId":"missing-owned-B","name":"Synthetic groceries","content":null,"date":"2026-10-08","time":null,"listId":null});
            }
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
            &turn_id,
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
            replies[1]["result"]["success"], !wrong_target,
            "tool reply: {}",
            replies[1]
        );
        let (text, stopped, external_actions) = result?;
        Ok(RuntimeTurnResult {
            text,
            stopped,
            external_actions,
            runtime_turn_id: Some(turn_id),
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

#[test]
fn cancel_received_before_dynamic_action_keeps_canonical_tasks_unchanged() {
    let root = isolated_root();
    let tasks = Arc::new(TaskApplication::with_file_store(
        Workspace(root.join("vault")),
        FixedClock,
    ));
    let action_tasks = tasks.clone();
    let handler: RuntimeDynamicToolHandler = Arc::new(move |_| {
        let current = action_tasks.read().unwrap();
        action_tasks
            .create(TaskCreateInput {
                target_binding: current.target_binding.unwrap(),
                expected_revision: current.revision,
                task_id: "must-not-start".into(),
                name: "Canceled synthetic Task".into(),
                content: None,
                date: None,
                time: None,
                list_id: None,
            })
            .unwrap();
        RuntimeDynamicToolResult {
            success: true,
            text: "Task saved".into(),
        }
    });
    let cancel = Arc::new(AtomicBool::new(false));
    let observer_cancel = cancel.clone();
    let observed = Arc::new(Mutex::new(Vec::new()));
    let history_observed = observed.clone();
    let observer: RuntimeWorkObserver = Arc::new(move |history| {
        if history
            .items
            .iter()
            .any(|item| item.call_id.as_deref() == Some("late-action"))
        {
            observer_cancel.store(true, Ordering::SeqCst);
        }
        history_observed.lock().unwrap().push(history);
        Ok(())
    });
    let (mut client, sender, stdout) = turn_client();
    sender.send(Ok(json!({"id":"late-rpc","method":"item/tool/call","params":{
        "threadId":"stop-thread","turnId":"stop-turn","callId":"late-action","tool":COLLABORATION_TASK_TOOL,"arguments":{}}}).to_string())).unwrap();
    sender.send(Ok(json!({"method":"turn/completed","params":{"threadId":"stop-thread","turn":{"id":"stop-turn","status":"interrupted"}}}).to_string())).unwrap();
    let reader = thread::spawn(move || {
        let mut responses = Vec::new();
        for line in BufReader::new(stdout).lines() {
            let value: Value = serde_json::from_str(&line.unwrap()).unwrap();
            if value["method"] == "turn/interrupt" {
                sender
                    .send(Ok(json!({"id":value["id"],"result":{}}).to_string()))
                    .unwrap();
            } else {
                responses.push(value);
            }
        }
        responses
    });
    let result = client.wait_for_turn_observed(
        "stop-thread",
        "stop-turn",
        &cancel,
        Some(&handler),
        "2026-10-09",
        None,
        None,
        Some(observer),
    );
    drop(client);
    let responses = reader.join().unwrap();
    assert!(result.unwrap().1);
    assert_eq!(
        responses[0]["result"]["success"], false,
        "stop must prevent a not-yet-started effect"
    );
    assert!(
        tasks.read().unwrap().tasks.is_empty(),
        "canceled action must not save a Task"
    );
    let history = observed.lock().unwrap().last().unwrap().clone();
    assert_eq!(history.status, "interrupted");
    assert_eq!(history.items[0].status, "failed");
    fs::remove_dir_all(root).unwrap();
}

#[test]
fn ordinary_native_patch_keeps_actual_diff_and_bound_readback_in_saved_work_history() {
    let root = isolated_root();
    fs::write(
        root.join("vault/life/ordinary.md"),
        "Old fact\nKeep unrelated paragraph\n",
    )
    .unwrap();
    let path = root.join("history/state.json");
    let app = application(&root, Arc::new(FileCollaborationStore::new(path.clone())));
    let session = app.create_session("2026-10-09").unwrap();
    app.submit_message(
        "history-vault",
        &session.id,
        "2026-10-09",
        "Patch the ordinary document",
    )
    .unwrap();
    let finished = await_end(&app, &session.id);
    let value = serde_json::to_value(&finished).unwrap();
    let item = value["workHistory"][0]["items"]
        .as_array()
        .unwrap()
        .iter()
        .find(|item| item["itemId"] == "file-change")
        .unwrap();
    let change = &item["changes"][0];
    assert_eq!(change["path"], "life/ordinary.md");
    assert!(change["diff"]
        .as_str()
        .unwrap()
        .contains("-Old fact\n+Corrected fact"));
    assert_eq!(change["verification"], "sourceObserved");
    assert!(change["afterRevision"].as_str().is_some());
    assert!(
        change["beforeRevision"].is_null(),
        "started notification may arrive after the write"
    );
    assert!(!change["gaps"].as_array().unwrap().is_empty());
    assert_eq!(
        fs::read_to_string(root.join("vault/life/ordinary.md")).unwrap(),
        "Corrected fact\nKeep unrelated paragraph\n"
    );
    let reopened = application(&root, Arc::new(FileCollaborationStore::new(path)));
    assert_eq!(
        reopened
            .session("history-vault", &session.id)
            .unwrap()
            .work_history,
        finished.work_history
    );
    fs::remove_dir_all(root).unwrap();
}

struct FileMemory {
    service: SelectedVaultCollaborationMemoryService,
    actual_key: String,
    saves: AtomicUsize,
}
impl CollaborationMemoryService for FileMemory {
    fn read(&self, key: Option<&str>) -> Result<CollaborationMemorySources, String> {
        assert_eq!(key, Some("history-vault"));
        self.service.read(Some(&self.actual_key))
    }
    fn save_long_term(
        &self,
        key: &str,
        revision: &str,
        content: &str,
    ) -> Result<LongTermMemoryDocumentView, String> {
        assert_eq!(key, "history-vault");
        self.saves.fetch_add(1, Ordering::SeqCst);
        self.service
            .save_long_term(&self.actual_key, revision, content)
    }
}

#[test]
fn managed_background_change_uses_actual_source_revisions_and_independent_readback() {
    let root = isolated_root();
    let self_path = root.join("vault/life/Self.md");
    fs::write(
        &self_path,
        "# Background\n\nUnrelated paragraph and prior correction.\n",
    )
    .unwrap();
    let workspace = root.join("workspace.json");
    FileTodayWorkspacePersistence::new(workspace.clone())
        .save_selected_vault(&root.join("vault"))
        .unwrap();
    let memory = Arc::new(FileMemory {
        service: SelectedVaultCollaborationMemoryService::new(workspace),
        actual_key: vault_key(&root.join("vault")),
        saves: AtomicUsize::new(0),
    });
    let before = memory
        .read(Some("history-vault"))
        .unwrap()
        .long_term
        .revision
        .unwrap();
    let app = application(
        &root,
        Arc::new(FileCollaborationStore::new(root.join("history/state.json"))),
    )
    .with_memory_service(memory.clone());
    let session = app.create_session("2026-10-09").unwrap();
    app.submit_message(
        "history-vault",
        &session.id,
        "2026-10-09",
        "Update durable background",
    )
    .unwrap();
    let saved = await_end(&app, &session.id);
    assert_eq!(saved.memory_proposals[0].status, "applied");
    let json = serde_json::to_value(&saved).unwrap();
    let item = json["workHistory"][0]["items"]
        .as_array()
        .unwrap()
        .iter()
        .find(|item| item["callId"] == "memory-call")
        .unwrap();
    let change = &item["changes"][0];
    assert_eq!(change["source"], "managedMemory");
    assert_eq!(change["beforeRevision"], before);
    assert_eq!(
        change["afterRevision"],
        memory
            .read(Some("history-vault"))
            .unwrap()
            .long_term
            .revision
            .unwrap()
    );
    assert_eq!(change["verification"], "verified");
    assert_eq!(change["receiptId"], saved.memory_proposals[0].id);
    let contents = fs::read_to_string(self_path).unwrap();
    assert!(contents.contains("Unrelated paragraph and prior correction."));
    assert!(contents.contains("Prefers a quiet morning."));
    fs::remove_dir_all(root).unwrap();
}

#[test]
fn later_full_history_snapshots_preserve_first_native_readback() {
    let root = isolated_root();
    let file = root.join("vault/life/ordinary.md");
    fs::write(&file, "Old fact\nKeep unrelated paragraph\n").unwrap();
    let app = application(
        &root,
        Arc::new(FileCollaborationStore::new(root.join("history/state.json"))),
    );
    let session = app.create_session("2026-10-09").unwrap();
    app.submit_message(
        "history-vault",
        &session.id,
        "2026-10-09",
        "Patch the ordinary document with later edit",
    )
    .unwrap();
    let finished = await_end(&app, &session.id);
    let item = finished.work_history[0]
        .items
        .iter()
        .find(|item| item.item_id == "file-change")
        .unwrap();
    assert_eq!(
        item.changes[0].after_revision,
        Some(stable_effect_fingerprint(
            &b"Corrected fact\nKeep unrelated paragraph\n".to_vec()
        ))
    );
    assert_eq!(
        fs::read_to_string(&file).unwrap(),
        "Later independent correction\nKeep unrelated paragraph\n"
    );
    fs::remove_dir_all(root).unwrap();
}

struct FailMemoryResultOnce {
    file: FileCollaborationStore,
    fail: AtomicBool,
}
impl CollaborationStore for FailMemoryResultOnce {
    fn load(&self) -> Result<CollaborationState, String> {
        self.file.load()
    }
    fn save(&self, state: &CollaborationState) -> Result<(), String> {
        if state.sessions.iter().any(|session| {
            session
                .memory_proposals
                .iter()
                .any(|proposal| proposal.status == "applied")
        }) && self.fail.swap(false, Ordering::SeqCst)
        {
            return Err("Synthetic managed-result history failure".into());
        }
        self.file.save(state)
    }
}
#[test]
fn memory_history_failure_reconciles_actual_file_without_second_write() {
    let root = isolated_root();
    fs::write(
        root.join("vault/life/Self.md"),
        "# Background\nUnrelated history\n",
    )
    .unwrap();
    let workspace = root.join("workspace.json");
    FileTodayWorkspacePersistence::new(workspace.clone())
        .save_selected_vault(&root.join("vault"))
        .unwrap();
    let memory = Arc::new(FileMemory {
        service: SelectedVaultCollaborationMemoryService::new(workspace),
        actual_key: vault_key(&root.join("vault")),
        saves: AtomicUsize::new(0),
    });
    let path = root.join("history/state.json");
    let app = application(
        &root,
        Arc::new(FailMemoryResultOnce {
            file: FileCollaborationStore::new(path.clone()),
            fail: AtomicBool::new(true),
        }),
    )
    .with_memory_service(memory.clone());
    let session = app.create_session("2026-10-09").unwrap();
    app.submit_message(
        "history-vault",
        &session.id,
        "2026-10-09",
        "Update durable background",
    )
    .unwrap();
    let failed = await_end(&app, &session.id);
    assert_ne!(failed.memory_proposals[0].status, "applied");
    assert_eq!(memory.saves.load(Ordering::SeqCst), 1);
    let recovered = app
        .approve_memory_proposal_for_selected_vault(&session.id, &failed.memory_proposals[0].id)
        .unwrap();
    assert_eq!(recovered.memory_proposals[0].status, "applied");
    let recovered_item = recovered.work_history[0]
        .items
        .iter()
        .find(|item| item.call_id.as_deref() == Some("memory-call"))
        .unwrap();
    assert_eq!(recovered_item.changes[0].verification, "verified");
    assert_eq!(memory.saves.load(Ordering::SeqCst), 1);
    let stored = FileCollaborationStore::new(path).load().unwrap();
    let witness = stored.sessions[0].memory_proposals[0]
        .change_evidence
        .as_ref()
        .unwrap();
    assert_eq!(witness.verification, "verified");
    assert!(witness
        .gaps
        .iter()
        .any(|gap| gap.contains("without another write")));
    assert!(fs::read_to_string(root.join("vault/life/Self.md"))
        .unwrap()
        .contains("Unrelated history"));
    fs::remove_dir_all(root).unwrap();
}

struct ConcurrentFileMemory {
    inner: FileMemory,
    path: PathBuf,
    before_save: bool,
}
impl CollaborationMemoryService for ConcurrentFileMemory {
    fn read(&self, key: Option<&str>) -> Result<CollaborationMemorySources, String> {
        self.inner.read(key)
    }
    fn save_long_term(
        &self,
        key: &str,
        revision: &str,
        content: &str,
    ) -> Result<LongTermMemoryDocumentView, String> {
        if self.before_save {
            fs::write(
                &self.path,
                "# Independent correction\nPreserve this content\n",
            )
            .unwrap();
        }
        let result = self.inner.save_long_term(key, revision, content)?;
        if !self.before_save {
            fs::write(
                &self.path,
                "# Independent correction\nPreserve this content\n",
            )
            .unwrap();
        }
        Ok(result)
    }
}
#[test]
fn managed_source_conflict_or_later_edit_keeps_observed_revision_and_original_outcome_separate() {
    for before_save in [true, false] {
        let root = isolated_root();
        let path = root.join("vault/life/Self.md");
        fs::write(&path, "# Background\nPrior history\n").unwrap();
        let workspace = root.join("workspace.json");
        FileTodayWorkspacePersistence::new(workspace.clone())
            .save_selected_vault(&root.join("vault"))
            .unwrap();
        let memory = Arc::new(ConcurrentFileMemory {
            inner: FileMemory {
                service: SelectedVaultCollaborationMemoryService::new(workspace),
                actual_key: vault_key(&root.join("vault")),
                saves: AtomicUsize::new(0),
            },
            path: path.clone(),
            before_save,
        });
        let app = application(
            &root,
            Arc::new(FileCollaborationStore::new(root.join("history/state.json"))),
        )
        .with_memory_service(memory.clone());
        let session = app.create_session("2026-10-09").unwrap();
        app.submit_message(
            "history-vault",
            &session.id,
            "2026-10-09",
            "Update durable background",
        )
        .unwrap();
        let finished = await_end(&app, &session.id);
        assert_eq!(
            finished.memory_proposals[0].status,
            if before_save { "conflict" } else { "applied" }
        );
        let item = finished.work_history[0]
            .items
            .iter()
            .find(|item| item.call_id.as_deref() == Some("memory-call"))
            .unwrap();
        if before_save {
            assert!(item.changes.is_empty());
            assert!(item.change_gap.is_some());
        } else {
            let witness = &item.changes[0];
            assert_eq!(witness.verification, "unconfirmed");
            assert_eq!(
                witness.after_revision,
                memory
                    .read(Some("history-vault"))
                    .unwrap()
                    .long_term
                    .revision
            );
            assert!(
                witness.target_date.is_none(),
                "background is distinct from one day's facts"
            );
        }
        assert_eq!(
            fs::read_to_string(&path).unwrap(),
            "# Independent correction\nPreserve this content\n"
        );
        // Completion is observable before the background worker's final history flush.
        // Only teardown waits; all actual source/outcome assertions above stay immediate.
        let cleanup_deadline = Instant::now() + Duration::from_secs(1);
        loop {
            match fs::remove_dir_all(&root) {
                Ok(()) => break,
                Err(error) if error.kind() == std::io::ErrorKind::NotFound => break,
                Err(error) if error.kind() == std::io::ErrorKind::DirectoryNotEmpty
                    && Instant::now() < cleanup_deadline => thread::sleep(Duration::from_millis(20)),
                Err(error) => panic!("isolated fixture teardown failed: {error}"),
            }
        }
    }
}

#[test]
fn simple_refresh_queries_native_full_window_without_model_mappings_or_evidence_assembly() {
    let root=isolated_root();let vault=root.join("vault");
    let snapshot_path=vault.join(crate::habits::SNAPSHOT_RELATIVE_PATH);
    fs::create_dir_all(snapshot_path.parent().unwrap()).unwrap();
    let mut snapshot:Value=serde_json::from_slice(include_bytes!("../tests/fixtures/habits-v1-complete.json")).unwrap();
    snapshot["sources"].as_array_mut().unwrap().push(json!({"key":"dida-exercise","kind":"dida365","label":"Dida365 explicit mapping exercise=owned-counterpart"}));
    fs::write(&snapshot_path,serde_json::to_vec(&snapshot).unwrap()).unwrap();
    let source=fs::read(&snapshot_path).unwrap();
    let app=application(&root,Arc::new(FileCollaborationStore::new(root.join("history.json"))))
        .with_daily_data_service(Arc::new(TodayApplicationCollaborationDailyDataAdapter::new(TodayApplication::new(Workspace(vault),NoVaultPicker,FixedClock))));
    let session=app.create_session("2026-10-09").unwrap();
    app.submit_message("history-vault",&session.id,"2026-10-09","Refresh mapped habits").unwrap();
    let saved=await_end(&app,&session.id);
    assert_eq!(saved.run_state,"completed");
    assert_eq!(saved.last_habit_refresh.as_ref().unwrap().publication,"published");
    assert!(saved.task_operations.is_empty());
    assert!(saved.messages[0].external_actions.is_empty());
    assert_ne!(fs::read(&snapshot_path).unwrap(),source);
    let reads:Vec<_>=saved.work_history[0].items.iter().filter(|item|item.kind=="hostSourceRead").collect();
    assert_eq!(reads.len(),2);assert!(reads.iter().all(|item|item.status=="completed" && item.authoritative));
    assert!(reads.iter().all(|item|item.input_fingerprint.as_ref().is_some_and(|value| !value.is_empty()) && !item.parameters.iter().any(|parameter|parameter.name=="inputFingerprint")));
    let script = Path::new(env!("CARGO_MANIFEST_DIR"))
        .join("../.agents/skills/personal-dashboard-workflow-retro/scripts/read_evidence.py");
    let export = std::process::Command::new("python3").arg(script)
        .arg("--history").arg(root.join("history.json"))
        .arg("--execution").arg(saved.run_id.as_ref().unwrap()).output().unwrap();
    assert!(export.status.success(), "{}", String::from_utf8_lossy(&export.stderr));
    let exported: Value = serde_json::from_slice(&export.stdout).unwrap();
    let source_attempts: Vec<_> = exported["executions"][0]["history"]["items"].as_array().unwrap()
        .iter().filter(|item| item["kind"] == "hostSourceRead").collect();
    assert_eq!(source_attempts.len(), 2);
    assert!(source_attempts.iter().all(|item| item["inputFingerprint"].is_string()
        && item["status"] == "completed" && item["authoritative"] == true));
    let source: Value = serde_json::from_slice(&fs::read(root.join("history.json")).unwrap()).unwrap();
    for reference in exported["references"].as_object().unwrap().values() {
        assert!(source.pointer(reference["pointer"].as_str().unwrap()).is_some());
    }
    app.shutdown().unwrap();fs::remove_dir_all(root).unwrap();
}

#[test]
fn partial_native_producer_query_retains_snapshot_then_independent_refresh_keeps_failed_history() {
    let root=isolated_root();let vault=root.join("vault");let path=vault.join(crate::habits::SNAPSHOT_RELATIVE_PATH);
    fs::create_dir_all(path.parent().unwrap()).unwrap();
    let mut snapshot:Value=serde_json::from_slice(include_bytes!("../tests/fixtures/habits-v1-complete.json")).unwrap();
    snapshot["sources"].as_array_mut().unwrap().push(json!({"key":"dida-exercise","kind":"dida365","label":"Dida365 explicit mapping exercise=owned-counterpart"}));
    fs::write(&path,serde_json::to_vec(&snapshot).unwrap()).unwrap();let before=fs::read(&path).unwrap();
    let app=application(&root,Arc::new(FileCollaborationStore::new(root.join("history.json"))))
        .with_daily_data_service(Arc::new(TodayApplicationCollaborationDailyDataAdapter::new(TodayApplication::new(Workspace(vault.clone()),NoVaultPicker,FixedClock))));
    let session=app.create_session("2026-10-09").unwrap();
    app.submit_message("history-vault",&session.id,"2026-10-09","Refresh mapped habits partial").unwrap();
    let failed=await_end(&app,&session.id);
    assert_eq!(failed.last_habit_refresh.as_ref().unwrap().query,"error");
    assert_eq!(failed.last_habit_refresh.as_ref().unwrap().publication,"notPublished");
    assert_eq!(fs::read(&path).unwrap(),before);
    assert!(failed.work_history[0].items.iter().any(|item|item.kind=="hostSourceRead" && item.tool.as_deref()==Some("get_habit_checkins") && item.status=="failed"));
    let source_failure=failed.work_history[0].items.iter().find(|item|item.kind=="hostSourceRead" && item.status=="failed").unwrap();
    assert_eq!(serde_json::to_value(source_failure).unwrap()["diagnosticOrigin"],"application","producer validation origin is mechanically captured, never inferred from error text");
    app.submit_message("history-vault",&session.id,"2026-10-09","Refresh mapped habits").unwrap();
    let repaired=await_end(&app,&session.id);
    assert_eq!(repaired.last_habit_refresh.as_ref().unwrap().publication,"published");
    assert_eq!(repaired.work_history.len(),2);
    assert!(repaired.work_history[1].items.iter().any(|item|item.kind=="hostSourceRead" && item.status=="completed"));
    assert!(repaired.work_history[0].items.iter().any(|item|item.kind=="hostSourceRead" && item.status=="failed"));
    assert!(repaired.task_operations.is_empty());
    assert!(!vault.join("life/.personal-dashboard/habit-completions/v1/completions.json").exists());
    let retained_snapshot=fs::read(&path).unwrap();
    app.submit_message("history-vault",&session.id,"2026-10-09","Refresh mapped habits source error").unwrap();
    let external=await_end(&app,&session.id);
    let external_failure=external.work_history.last().unwrap().items.iter().find(|item|item.kind=="hostSourceRead" && item.status=="failed").unwrap();
    assert_eq!(serde_json::to_value(external_failure).unwrap()["diagnosticOrigin"],"external","native RPC failure is not promoted to application origin by matching grammar");
    assert!(external_failure.diagnostic.as_deref().unwrap().contains("Native Habit source coverage is partial, paginated, failed or unavailable"));
    assert_eq!(fs::read(&path).unwrap(),retained_snapshot,"source failure does not republish or mutate the prior snapshot");
    let script=Path::new(env!("CARGO_MANIFEST_DIR")).join("../.agents/skills/personal-dashboard-workflow-retro/scripts/read_evidence.py");
    let export=std::process::Command::new("python3").arg(script).arg("--history").arg(root.join("history.json")).arg("--execution").arg(failed.run_id.as_ref().unwrap()).output().unwrap();
    assert!(export.status.success());
    let exported:Value=serde_json::from_slice(&export.stdout).unwrap();
    assert!(exported["executions"][0]["history"]["items"].as_array().unwrap().iter().any(|item|item["kind"]=="hostSourceRead" && item["status"]=="failed" && item["diagnosticOrigin"]=="application"));
    app.shutdown().unwrap();fs::remove_dir_all(root).unwrap();
}

#[test]
fn duplicate_refresh_delivery_reuses_source_query_attempts_and_publication_identity() {
    let root=isolated_root();let vault=root.join("vault");let path=vault.join(crate::habits::SNAPSHOT_RELATIVE_PATH);
    fs::create_dir_all(path.parent().unwrap()).unwrap();
    let mut snapshot:Value=serde_json::from_slice(include_bytes!("../tests/fixtures/habits-v1-complete.json")).unwrap();
    snapshot["sources"].as_array_mut().unwrap().push(json!({"key":"dida-exercise","kind":"dida365","label":"Dida365 explicit mapping exercise=owned-counterpart"}));
    fs::write(&path,serde_json::to_vec(&snapshot).unwrap()).unwrap();
    let app=application(&root,Arc::new(FileCollaborationStore::new(root.join("history.json"))))
        .with_daily_data_service(Arc::new(TodayApplicationCollaborationDailyDataAdapter::new(TodayApplication::new(Workspace(vault),NoVaultPicker,FixedClock))));
    let session=app.create_session("2026-10-09").unwrap();
    app.submit_message("history-vault",&session.id,"2026-10-09","Refresh mapped habits duplicate").unwrap();
    let saved=await_end(&app,&session.id);
    assert_eq!(saved.run_state,"completed");
    assert_eq!(saved.last_habit_refresh.as_ref().unwrap().publication,"published");
    assert_eq!(saved.work_history[0].items.iter().filter(|item|item.kind=="hostSourceRead").count(),2);
    app.shutdown().unwrap();fs::remove_dir_all(root).unwrap();
}

#[test]
fn saturated_native_evidence_cache_reports_unknown_coverage_and_retains_snapshot_bytes() {
    let root=isolated_root();let vault=root.join("vault");let path=vault.join(crate::habits::SNAPSHOT_RELATIVE_PATH);
    fs::create_dir_all(path.parent().unwrap()).unwrap();
    fs::write(&path,include_bytes!("../tests/fixtures/habits-v1-complete.json")).unwrap();let before=fs::read(&path).unwrap();
    let app=application(&root,Arc::new(FileCollaborationStore::new(root.join("history.json"))))
        .with_daily_data_service(Arc::new(TodayApplicationCollaborationDailyDataAdapter::new(TodayApplication::new(Workspace(vault),NoVaultPicker,FixedClock))));
    let session=app.create_session("2026-10-09").unwrap();
    app.submit_message("history-vault",&session.id,"2026-10-09","Refresh saturated native source cache").unwrap();
    let saved=await_end(&app,&session.id);let report=saved.last_habit_refresh.as_ref().unwrap();
    assert_eq!(report.publication,"notPublished");assert!(report.message.contains("capacity"));
    assert_eq!(fs::read(&path).unwrap(),before);
    assert!(saved.work_history[0].items.iter().any(|item|item.status=="failed" && item.diagnostic.as_ref().is_some_and(|diagnostic|diagnostic.contains("capacity"))));
    app.shutdown().unwrap();fs::remove_dir_all(root).unwrap();
}

#[test]
fn developer_reader_resolves_failed_attempt_and_actual_saved_change_from_application_history() {
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
    let saved = await_end(&app, &session.id);
    let script = Path::new(env!("CARGO_MANIFEST_DIR"))
        .join("../.agents/skills/personal-dashboard-workflow-retro/scripts/read_evidence.py");
    let before = fs::read(&history_path).unwrap();
    let result = std::process::Command::new("python3")
        .arg(script)
        .arg("--history")
        .arg(&history_path)
        .arg("--execution")
        .arg(saved.run_id.as_ref().unwrap())
        .output()
        .unwrap();
    assert!(
        result.status.success(),
        "{}",
        String::from_utf8_lossy(&result.stderr)
    );
    let exported: Value = serde_json::from_slice(&result.stdout).unwrap();
    let execution = &exported["executions"][0];
    assert_eq!(execution["request"]["targetDate"], "2026-10-09");
    let attempts = execution["history"]["items"].as_array().unwrap();
    let read_one = attempts
        .iter()
        .find(|item| item["itemId"] == "read-1")
        .unwrap();
    let read_two = attempts
        .iter()
        .find(|item| item["itemId"] == "read-2")
        .unwrap();
    assert!(read_one["inputFingerprint"].is_string());
    assert_eq!(read_one["inputFingerprint"], read_two["inputFingerprint"]);
    assert!(attempts
        .iter()
        .any(|item| item["callId"] == "attempt-1" && item["status"] == "failed"));
    assert!(attempts
        .iter()
        .any(|item| item["callId"] == "attempt-2" && item["status"] == "completed"));
    assert_eq!(execution["effects"][0]["status"], "applied");
    assert!(execution["effects"][0]["resultRevision"].is_string());
    assert_eq!(
        execution["history"]["tokenUsage"]["last"]["totalTokens"],
        50
    );
    let refs = exported["references"].as_object().unwrap();
    assert!(!refs.is_empty());
    let source: Value = serde_json::from_slice(&before).unwrap();
    for reference in refs.values() {
        assert!(source
            .pointer(reference["pointer"].as_str().unwrap())
            .is_some());
    }
    let output = String::from_utf8(result.stdout).unwrap();
    assert!(
        !output.contains("HIDDEN CONTENT")
            && !output.contains("PRIVATE DIAGNOSTIC")
            && !output.contains("RAW COMMAND OUTPUT")
    );
    assert_eq!(
        fs::read(&history_path).unwrap(),
        before,
        "reader leaves source bytes unchanged"
    );
    if let Some(destination) = std::env::var_os("PDCR_RETRO_SYNTHETIC_CAPTURE") {
        let destination = PathBuf::from(destination);
        fs::create_dir_all(&destination).unwrap();
        fs::write(destination.join("history.json"), before).unwrap();
        fs::write(destination.join("export.json"), output).unwrap();
    }
    fs::remove_dir_all(root).unwrap();
}

#[test]
fn execution_configuration_retains_original_requested_model_after_settings_change() {
    let root = isolated_root();
    let app = application(
        &root,
        Arc::new(FileCollaborationStore::new(root.join("history/state.json"))),
    );
    app.select_model(Some("synthetic-model")).unwrap();
    app.select_reasoning_effort(Some("low")).unwrap();
    let session = app.create_session("2026-10-09").unwrap();
    app.submit_message(
        "history-vault",
        &session.id,
        "2026-10-09",
        "Create Synthetic groceries",
    )
    .unwrap();
    let saved = await_end(&app, &session.id);
    app.select_model(None).unwrap();
    let reopened = app.session("history-vault", &session.id).unwrap();
    let binding = serde_json::to_value(&reopened.usage_bindings[0]).unwrap();
    let configuration = &binding["configuration"];
    assert_eq!(configuration["runtimeVersion"], "synthetic-runtime-1");
    assert_eq!(configuration["requestedModel"], "synthetic-model");
    assert_eq!(configuration["requestedReasoningEffort"], "low");
    assert_eq!(configuration["threadId"], "history-thread");
    assert_eq!(reopened.work_history, saved.work_history);
    fs::remove_dir_all(root).unwrap();
}

#[test]
fn developer_reader_complete_chain_keeps_rejected_target_overwrite_unknown_replay_and_stale_render() {
    let root = isolated_root();
    let path = root.join("history/state.json");
    fs::write(root.join("vault/life/Self.md"),"# Background\nUnrelated prior correction.\n").unwrap();
    let workspace=root.join("workspace.json");
    FileTodayWorkspacePersistence::new(workspace.clone()).save_selected_vault(&root.join("vault")).unwrap();
    let memory_service=Arc::new(FileMemory {service:SelectedVaultCollaborationMemoryService::new(workspace),actual_key:vault_key(&root.join("vault")),saves:AtomicUsize::new(0)});
    let app = application(&root, Arc::new(FileCollaborationStore::new(path.clone()))).with_memory_service(memory_service);
    let session = app.create_session("2026-10-09").unwrap();
    let run = |request: &str| {
        app.submit_message("history-vault", &session.id, "2026-10-09", request).unwrap();
        await_end(&app, &session.id)
    };
    let initial = run("Create Synthetic groceries");
    let tasks = TaskApplication::with_file_store(Workspace(root.join("vault")), FixedClock);
    let initial_revision = tasks.read().unwrap().revision;
    let wrong = run("Correct Synthetic groceries on 2026-10-09 (wrong-target fixture)");
    assert_eq!(tasks.read().unwrap().revision, initial_revision, "wrong object/date attempt must not write");
    assert!(!wrong.task_operations.iter().any(|receipt| Some(receipt.execution_id.as_str()) == wrong.run_id.as_deref() && receipt.status == "applied"));
    fs::write(root.join("vault/life/ordinary.md"), "Old fact\nKeep unrelated paragraph\n").unwrap();
    let overwrite = run("Patch the ordinary document with overwrite; only correct Old fact");
    assert_eq!(fs::read_to_string(root.join("vault/life/ordinary.md")).unwrap(), "Corrected fact\n");
    let replay = run("Trace unknown synthetic external result followed by same-input replay");
    let memory = run("Update durable background");
    app.record_refresh_for_selected_vault(&session.id, initial.run_id.as_ref().unwrap(), vec![CollaborationRefreshInput {
        target:"habits".into(), target_date:"2026-10-09".into(), status:"readCompleted".into(),
        source_state:Some("stale".into()),page_state:"rendered".into(),trigger:"turnTerminal".into()
    }]).unwrap();
    let before = fs::read(&path).unwrap();
    let script = Path::new(env!("CARGO_MANIFEST_DIR")).join("../.agents/skills/personal-dashboard-workflow-retro/scripts/read_evidence.py");
    let output = std::process::Command::new("python3").arg(script).arg("--history").arg(&path).arg("--session").arg(&session.id).output().unwrap();
    assert!(output.status.success(), "{}", String::from_utf8_lossy(&output.stderr));
    let export:Value=serde_json::from_slice(&output.stdout).unwrap();
    let executions=export["executions"].as_array().unwrap();
    assert_eq!(executions.len(),5);
    let find = |id:&Option<String>| executions.iter().find(|execution| execution["executionId"].as_str()==id.as_deref()).unwrap();
    let rejected=find(&wrong.run_id);
    assert!(rejected["history"]["items"].as_array().unwrap().iter().any(|item| item["callId"]=="attempt-2" && item["status"]=="failed"));
    assert!(rejected["replies"][0]["text"].as_str().unwrap().contains("Created"), "intentional report/receipt mismatch fixture");
    let changed=find(&overwrite.run_id);
    let change=&changed["history"]["items"].as_array().unwrap().iter().find(|item|item["itemId"]=="file-change").unwrap()["changes"][0];
    assert_eq!(change["verification"],"sourceObserved");
    assert!(change["beforeRevision"].is_null());
    assert!(change["diff"].as_str().unwrap().contains("-Keep unrelated paragraph"));
    let unknown=find(&replay.run_id);
    let attempts=unknown["history"]["items"].as_array().unwrap();
    let one=attempts.iter().find(|item|item["itemId"]=="unknown-write").unwrap();
    let two=attempts.iter().find(|item|item["itemId"]=="replay-write").unwrap();
    assert_eq!(one["inputFingerprint"],two["inputFingerprint"]);
    assert_ne!(one["status"],"completed");
    assert!(unknown["externalActions"].as_array().unwrap().iter().all(|item|item["verification"].is_null()),"synthetic external boundary is not verified external save");
    assert_eq!(find(&initial.run_id)["history"]["refreshes"][0]["sourceState"],"stale");
    assert_eq!(find(&initial.run_id)["history"]["refreshes"][0]["pageState"],"rendered");
    assert!(!find(&memory.run_id)["memoryEffects"].as_array().unwrap().is_empty());
    let source:Value=serde_json::from_slice(&before).unwrap();
    for reference in export["references"].as_object().unwrap().values(){assert!(source.pointer(reference["pointer"].as_str().unwrap()).is_some());}
    assert_eq!(fs::read(&path).unwrap(),before);
    if let Some(destination)=std::env::var_os("PDCR_RETRO_SYNTHETIC_CAPTURE"){
        let destination=PathBuf::from(destination);fs::create_dir_all(&destination).unwrap();
        fs::write(destination.join("complete-history.json"),before).unwrap();
        fs::write(destination.join("complete-export.json"),output.stdout).unwrap();
    }
    fs::remove_dir_all(root).unwrap();
}

#[test]
fn source_refresh_observations_are_scoped_and_do_not_change_canonical_task_revision() {
    let root = isolated_root();
    let app = application(
        &root,
        Arc::new(FileCollaborationStore::new(root.join("history/state.json"))),
    );
    let session = app.create_session("2026-10-09").unwrap();
    app.submit_message(
        "history-vault",
        &session.id,
        "2026-10-09",
        "Create Synthetic groceries",
    )
    .unwrap();
    let saved = await_end(&app, &session.id);
    let tasks = TaskApplication::with_file_store(Workspace(root.join("vault")), FixedClock);
    let before = tasks.read().unwrap();
    let observation = CollaborationRefreshInput {
        target: "habits".into(),
        target_date: "2026-10-09".into(),
        status: "readCompleted".into(),
        source_state: Some("stale".into()),
        page_state: "rendered".into(),
        trigger: "turnTerminal".into(),
    };
    assert!(app
        .record_refresh_for_selected_vault(
            &session.id,
            "foreign-execution",
            vec![observation.clone()]
        )
        .is_err());
    app.record_refresh_for_selected_vault(
        &session.id,
        saved.run_id.as_ref().unwrap(),
        vec![observation],
    )
    .unwrap();
    let observed = app.session("history-vault", &session.id).unwrap();
    assert_eq!(observed.work_history[0].refreshes.len(), 1);
    assert_eq!(
        observed.work_history[0].refreshes[0]
            .observation
            .source_state
            .as_deref(),
        Some("stale")
    );
    assert_eq!(
        observed.work_history[0].refreshes[0].history_sequence,
        saved.work_history[0].sequence
    );
    assert_eq!(tasks.read().unwrap().revision, before.revision);
    fs::remove_dir_all(root).unwrap();
}

#[test]
fn saved_native_turn_read_keeps_authoritative_items_without_dispatching_a_turn() {
    for status in ["completed", "interrupted", "failed"] {
        let (mut client, sender, stdout) = turn_client();
        let turn=json!({"id":"saved-turn","status":status,"startedAt":100,"completedAt":200,"items":[
            {"id":"user","type":"userMessage","content":[{"text":"{\"dashboardExecutionId\": \"original-execution\"}"}]},
            {"id":"failed-attempt","type":"commandExecution","status":"failed","exitCode":7},
            {"id":"changed","type":"fileChange","status":"completed","changes":[{"path":"life/ordinary.md","kind":{"type":"update"},"diff":"-Before\n+After"}]},
            {"id":"final","type":"agentMessage","phase":"final_answer","text":"Original saved reply"}
        ]});
        sender.send(Ok(json!({"id":1,"result":{"thread":{"id":"original-thread","turns":[turn]}}}).to_string())).unwrap();
        let requests=thread::spawn(move||BufReader::new(stdout).lines().take(1).map(|line|serde_json::from_str::<Value>(&line.unwrap()).unwrap()).collect::<Vec<_>>());
        let recovered=client.read_saved_turn("original-thread","original-execution").unwrap();
        let requests=requests.join().unwrap();
        drop(client);
        assert_eq!(requests.len(),1);assert_eq!(requests[0]["method"],"thread/read");
        let history=match recovered {
            RuntimeRunReconciliation::Completed {text,work_history,..} => {assert_eq!(text,"Original saved reply");work_history.unwrap()},
            RuntimeRunReconciliation::Interrupted {work_history,..} => work_history.unwrap(),
            _ => panic!("a matched saved terminal snapshot must be preserved"),
        };
        assert_eq!(history.status,status);
        assert_eq!(history.items.iter().find(|item|item.item_id=="failed-attempt").unwrap().status,"failed");
        let file=history.items.iter().find(|item|item.item_id=="changed").unwrap();
        assert!(file.authoritative);assert_eq!(file.changes[0].diff.as_deref(),Some("-Before\n+After"));
        assert!(file.changes[0].after_revision.is_none());
        assert_eq!(history.runtime_completed_at_ms,Some(200_000));
    }
}


#[test]
fn prospective_optional_history_budget_preserves_replies_failures_and_existing_archive() {
    let root=isolated_root();fs::create_dir_all(root.join("vault/life")).unwrap();
    fs::write(root.join("vault/life/ordinary.md"),"Independent resulting file").unwrap();
    let store=Arc::new(FileCollaborationStore::new(root.join("history/state.json")));
    let app=application(&root,store.clone());
    let await_budget_end = |app: &CollaborationApplication, id: &str| {
        let deadline=Instant::now()+Duration::from_secs(30);
        loop { let view=app.session("history-vault",id).unwrap();
            if !matches!(view.run_state.as_str(),"queued"|"thinking"|"reading") {break view;}
            assert!(Instant::now()<deadline,"budget fixture did not complete");thread::sleep(Duration::from_millis(30));
        }
    };
    for _ in 0..10 {
        let session=app.create_session("2026-10-09").unwrap();
        app.submit_message("history-vault",&session.id,"2026-10-09","Generate bounded evidence").unwrap();
        let ended=await_budget_end(&app,&session.id);
        assert_eq!(ended.messages.last().unwrap().text,"Final original reply ".repeat(4000));
        let history=&ended.work_history[0];
        assert_eq!(history.status,"completed");
        assert_eq!(history.items.len(),23,"optional payload limits never evict item skeletons");
        assert!(history.items.iter().any(|item|item.item_id=="failed-command" && item.status=="failed" && item.diagnostic.as_deref()==Some("Command exited with code 7.")));
        let file=history.items.iter().find(|item|item.item_id=="file").unwrap();
        assert!(file.changes[0].after_revision.is_some(),"independently observed source metadata survives optional limits");
    }
    let state=store.load().unwrap();
    let bytes:usize=state.sessions.iter().flat_map(|session|&session.work_history).flat_map(|history|&history.items).map(|item|item.text.len()+item.summary.iter().map(String::len).sum::<usize>()+item.changes.iter().filter_map(|change|change.diff.as_ref()).map(String::len).sum::<usize>()).sum();
    assert!(bytes<=8*1024*1024,"aggregate optional evidence exceeded the production 8MiB budget: {bytes}");
    let last=serde_json::to_value(state.sessions.first().unwrap()).unwrap();
    assert!(last["workHistory"][0]["items"].as_array().unwrap().iter().any(|item|item["payloadOmissions"].as_array().is_some_and(|omissions|omissions.iter().any(|omission|omission["reasonCode"]=="aggregateByteBound"))));
    let original=state.sessions[0].work_history[0].clone();
    let mut legacy=state.clone();legacy.sessions[0].work_history[0].items[0].text="Legacy original".repeat(800_000);
    store.save(&legacy).unwrap();
    let legacy_history=legacy.sessions[0].work_history[0].clone();
    let app=application(&root,store.clone());let session=app.create_session("2026-10-09").unwrap();
    app.submit_message("history-vault",&session.id,"2026-10-09","Generate bounded evidence").unwrap();await_budget_end(&app,&session.id);
    let retained=store.load().unwrap();let prior=retained.sessions.iter().find(|session|session.id==legacy.sessions[0].id).unwrap();
    assert_eq!(prior.work_history[0],legacy_history,"legacy archive is never retroactively trimmed");
    assert_eq!(original.items.len(),prior.work_history[0].items.len());
    fs::remove_dir_all(root).unwrap();
}
