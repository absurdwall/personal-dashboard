#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    if std::env::args().nth(1).as_deref() == Some("--daily-flow-tasks") {
        std::process::exit(personal_dashboard_lib::task_adapter::run_daily_flow_task_cli());
    }
    personal_dashboard_lib::run();
}
