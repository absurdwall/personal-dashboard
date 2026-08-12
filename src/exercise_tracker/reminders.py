import json
import os
import plistlib
import subprocess
import sys
from datetime import datetime, timedelta
from pathlib import Path
from typing import Callable, Iterable, Literal

from .presentation import friendly_departure
from .state import (
    APP_NAME,
    AppState,
    Week,
    WeekSlot,
    current_time,
    default_data_directory,
    ensure_week,
    load_state,
    save_state,
    week_slots,
    weekly_goal_reached,
)


AGENT_LABEL = "com.tortillaflat.exercise-habit-tracker.reminders"
NotifierName = Literal["macos", "stdout"]
NotificationAdapter = Callable[[str, str, str], None]


def due_departures(week: Week, at: datetime) -> Iterable[WeekSlot]:
    for slot in week_slots(week):
        departure = datetime.fromisoformat(slot["departure_at"])
        if (
            slot["status"] == "scheduled"
            and slot["reminder_sent_at"] is None
            and departure <= at
            and departure.date() == at.date()
        ):
            yield slot


def due_follow_ups(week: Week, at: datetime) -> Iterable[WeekSlot]:
    for slot in week_slots(week):
        departure = datetime.fromisoformat(slot["departure_at"])
        if (
            slot["status"] == "scheduled"
            and slot["reminder_sent_at"] is not None
            and slot["follow_up_sent_at"] is None
            and departure + timedelta(minutes=15) <= at
            and departure.date() == at.date()
        ):
            yield slot


def due_workout_prompts(week: Week, at: datetime) -> Iterable[WeekSlot]:
    for slot in week_slots(week):
        due_at = slot["record_workout_prompt_due_at"]
        if (
            slot["status"] == "leaving"
            and due_at is not None
            and slot["record_workout_prompt_sent_at"] is None
            and datetime.fromisoformat(due_at) <= at
            and datetime.fromisoformat(due_at).date() == at.date()
        ):
            yield slot


def send_stdout_notification(title: str, body: str, detail: str) -> None:
    print(title)
    print(body)
    print(detail)


def send_macos_notification(title: str, body: str, detail: str) -> None:
    script = (
        f"display notification {json.dumps(body)} "
        f"with title {json.dumps(title)} subtitle {json.dumps(detail)}"
    )
    subprocess.run(["/usr/bin/osascript", "-e", script], check=True)


def notification_adapter(name: NotifierName) -> NotificationAdapter:
    return send_stdout_notification if name == "stdout" else send_macos_notification


def check_reminders(state_file: Path, at: datetime, notifier: NotifierName) -> int:
    state: AppState = load_state(state_file, at)
    week = ensure_week(state, at)
    if weekly_goal_reached(state, week):
        return 0
    sent = 0
    for slot in due_follow_ups(week, at):
        notification_adapter(notifier)(
            APP_NAME,
            "A gentle follow-up: are you leaving for the gym?",
            friendly_departure(slot["departure_at"]),
        )
        slot["follow_up_sent_at"] = at.isoformat()
        sent += 1
    for slot in due_workout_prompts(week, at):
        notification_adapter(notifier)(
            APP_NAME,
            "Record workout.",
            f"Leaving confirmed {friendly_departure(slot['departure_at'])}",
        )
        slot["record_workout_prompt_sent_at"] = at.isoformat()
        sent += 1
    for slot in due_departures(week, at):
        notification_adapter(notifier)(
            APP_NAME,
            "Time to leave for the gym.",
            friendly_departure(slot["departure_at"]),
        )
        slot["reminder_sent_at"] = at.isoformat()
        sent += 1
    if sent:
        save_state(state_file, state)
    return sent


def reminder_agent_file() -> Path:
    return default_data_directory() / f"{AGENT_LABEL}.plist"


def launch_domain() -> str:
    return f"gui/{os.getuid()}"


def start_reminder_agent(state_file: Path) -> Path:
    state_file = state_file.expanduser().resolve()
    load_state(state_file, current_time())
    data_directory = default_data_directory()
    data_directory.mkdir(parents=True, exist_ok=True)
    agent_file = reminder_agent_file()
    source_root = Path(__file__).resolve().parents[1]
    configuration = {
        "Label": AGENT_LABEL,
        "ProgramArguments": [
            sys.executable,
            "-m",
            "exercise_tracker",
            "check-reminders",
            "--state-file",
            str(state_file),
            "--notifier",
            "macos",
        ],
        "WorkingDirectory": str(source_root),
        "RunAtLoad": True,
        "StartInterval": 60,
        "StandardOutPath": str(data_directory / "reminders.log"),
        "StandardErrorPath": str(data_directory / "reminders-error.log"),
    }
    with agent_file.open("wb") as output:
        plistlib.dump(configuration, output)

    subprocess.run(
        ["/bin/launchctl", "bootout", launch_domain(), str(agent_file)],
        check=False,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    subprocess.run(
        ["/bin/launchctl", "bootstrap", launch_domain(), str(agent_file)], check=True
    )
    return agent_file


def stop_reminder_agent() -> None:
    subprocess.run(
        ["/bin/launchctl", "bootout", launch_domain(), str(reminder_agent_file())],
        check=True,
    )
