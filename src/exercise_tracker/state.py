import json
import os
import tempfile
import uuid
from datetime import datetime, time, timedelta
from pathlib import Path
from typing import Any, Dict, List, Literal, NamedTuple, Optional, TypedDict, cast


APP_NAME = "Exercise Habit Tracker"
SCHEMA_VERSION = 5
PRIMARY_DAYS = ((0, "Monday"), (2, "Wednesday"), (4, "Friday"))
FALLBACK_DAYS = ((5, "Saturday"), (6, "Sunday"))
DEPARTURE_TIME = time(16, 0)
ACTIVITY_CHOICES = ("Elliptical", "Weight training", "Other exercise")
EFFORT_CHOICES = ("Very easy", "Easy", "Moderate", "Hard", "Very hard")
WEEKDAY_CHOICES = (
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
)
DEPARTURE_TIME_CHOICES = tuple(
    f"{hour:02d}:{minute:02d}"
    for hour in range(24)
    for minute in (0, 30)
)

SlotKind = Literal["primary", "fallback"]
WorkoutSource = Literal["primary", "fallback", "unscheduled"]
SlotStatus = Literal[
    "scheduled",
    "available",
    "leaving",
    "moved",
    "skipped",
    "missed",
    "not-needed",
]
DepartureDecisionOutcome = Literal["move-to-fallback", "skip"]
DepartureReason = Literal[
    "Work ran late",
    "Too tired",
    "Sick or injured",
    "Another commitment",
    "Other",
]
REASON_CHOICES: tuple[DepartureReason, ...] = (
    "Work ran late",
    "Too tired",
    "Sick or injured",
    "Another commitment",
    "Other",
)


class DurationOption(NamedTuple):
    label: str
    qualifies: bool


DURATION_OPTIONS = (
    DurationOption("Under 20", False),
    DurationOption("20", True),
    DurationOption("30", True),
    DurationOption("45", True),
    DurationOption("60+ minutes", True),
)
DURATION_CHOICES = tuple(option.label for option in DURATION_OPTIONS)
DURATION_QUALIFICATION = {
    option.label: option.qualifies for option in DURATION_OPTIONS
}


class RoutineSlot(TypedDict):
    weekday: int
    day: str
    departure_time: str
    order: int


class Routine(TypedDict):
    weekly_goal: int
    primary: List[RoutineSlot]
    fallback: List[RoutineSlot]


class DepartureResponse(TypedDict):
    outcome: Literal["leaving-for-gym", "move-to-fallback", "skip"]
    recorded_at: str
    reason: Optional[DepartureReason]
    fallback_slot_id: Optional[str]


class WeekSlot(TypedDict):
    id: str
    kind: SlotKind
    order: int
    weekday: int
    day: str
    departure_at: str
    status: SlotStatus
    reminder_sent_at: Optional[str]
    follow_up_sent_at: Optional[str]
    departure_response: Optional[DepartureResponse]
    record_workout_prompt_due_at: Optional[str]
    record_workout_prompt_sent_at: Optional[str]
    assigned_from_slot_id: Optional[str]


class WorkoutRecord(TypedDict):
    id: str
    source: WorkoutSource
    source_slot_id: Optional[str]
    recorded_at: str
    activity: str
    duration: str
    effort: str
    qualifies: bool


class WorkoutDraft(TypedDict):
    source: WorkoutSource
    slot_id: Optional[str]
    activity: Optional[str]
    duration: Optional[str]


class DepartureDecision(TypedDict):
    slot_id: str
    outcome: DepartureDecisionOutcome


class Week(TypedDict):
    week_start: str
    week_end: str
    completed_count: int
    primary_slots: List[WeekSlot]
    fallback_slots: List[WeekSlot]
    workout_records: List[WorkoutRecord]


class AppState(TypedDict):
    schema_version: int
    routine: Routine
    weeks: Dict[str, Week]
    workout_draft: Optional[WorkoutDraft]
    departure_decision: Optional[DepartureDecision]


def default_data_directory() -> Path:
    return Path.home() / "Library" / "Application Support" / APP_NAME


def default_state_file() -> Path:
    return default_data_directory() / "state.json"


def current_time() -> datetime:
    return datetime.now().astimezone()


def parse_time(value: Optional[str]) -> Optional[datetime]:
    if value is None:
        return None
    parsed = datetime.fromisoformat(value)
    if parsed.tzinfo is None:
        return parsed.astimezone()
    return parsed


def week_start_for(at: datetime) -> datetime:
    monday = at - timedelta(days=at.weekday())
    return monday.replace(hour=0, minute=0, second=0, microsecond=0)


def default_routine_slots(days: tuple[tuple[int, str], ...]) -> List[RoutineSlot]:
    return [
        {
            "weekday": weekday,
            "day": day,
            "departure_time": DEPARTURE_TIME.strftime("%H:%M"),
            "order": order,
        }
        for order, (weekday, day) in enumerate(days, start=1)
    ]


def new_state() -> AppState:
    return {
        "schema_version": SCHEMA_VERSION,
        "routine": {
            "weekly_goal": 3,
            "primary": default_routine_slots(PRIMARY_DAYS),
            "fallback": default_routine_slots(FALLBACK_DAYS),
        },
        "weeks": {},
        "workout_draft": None,
        "departure_decision": None,
    }


def departure_on(week_start: datetime, routine_slot: RoutineSlot) -> datetime:
    hour, minute = map(int, routine_slot["departure_time"].split(":"))
    day = week_start + timedelta(days=routine_slot["weekday"])
    return day.replace(hour=hour, minute=minute, second=0, microsecond=0)


def make_week_slot(
    week_key: str,
    kind: SlotKind,
    routine_slot: RoutineSlot,
    at: datetime,
) -> WeekSlot:
    return {
        "id": f"{week_key}-{kind}-{routine_slot['order']}",
        "kind": kind,
        "order": routine_slot["order"],
        "weekday": routine_slot["weekday"],
        "day": routine_slot["day"],
        "departure_at": at.isoformat(),
        "status": "scheduled" if kind == "primary" else "available",
        "reminder_sent_at": None,
        "follow_up_sent_at": None,
        "departure_response": None,
        "record_workout_prompt_due_at": None,
        "record_workout_prompt_sent_at": None,
        "assigned_from_slot_id": None,
    }


def ensure_week(state: AppState, at: datetime) -> Week:
    week_start = week_start_for(at)
    week_key = week_start.date().isoformat()
    if week_key not in state["weeks"]:
        week_end = week_start + timedelta(days=6)
        state["weeks"][week_key] = {
            "week_start": week_start.date().isoformat(),
            "week_end": week_end.date().isoformat(),
            "completed_count": 0,
            "primary_slots": [
                make_week_slot(
                    week_key, "primary", slot, departure_on(week_start, slot)
                )
                for slot in state["routine"]["primary"]
            ],
            "fallback_slots": [
                make_week_slot(
                    week_key, "fallback", slot, departure_on(week_start, slot)
                )
                for slot in state["routine"]["fallback"]
            ],
            "workout_records": [],
        }
    return state["weeks"][week_key]


def save_state(path: Path, state: AppState) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary_name = ""
    try:
        with tempfile.NamedTemporaryFile(
            mode="w",
            encoding="utf-8",
            dir=path.parent,
            prefix=f".{path.name}.",
            suffix=".tmp",
            delete=False,
        ) as temporary_file:
            json.dump(state, temporary_file, indent=2, sort_keys=True)
            temporary_file.write("\n")
            temporary_name = temporary_file.name
        os.replace(temporary_name, path)
    finally:
        if temporary_name and os.path.exists(temporary_name):
            os.unlink(temporary_name)


def backup_error(label: str) -> ValueError:
    return ValueError(f"file is not a complete exercise tracker backup: {label}")


def backup_mapping(value: Any, label: str) -> Dict[str, Any]:
    if not isinstance(value, dict):
        raise backup_error(label)
    return value


def backup_list(value: Any, label: str) -> List[Any]:
    if not isinstance(value, list):
        raise backup_error(label)
    return value


def require_backup_keys(value: Dict[str, Any], keys: set[str], label: str) -> None:
    if not keys.issubset(value):
        raise backup_error(label)


def validate_backup_timestamp(value: Any, label: str, optional: bool = False) -> None:
    if value is None and optional:
        return
    if not isinstance(value, str):
        raise backup_error(label)
    try:
        parsed = datetime.fromisoformat(value)
    except ValueError as error:
        raise backup_error(label) from error
    if parsed.utcoffset() is None:
        raise backup_error(label)


def validate_backup_routine_slot(value: Any, label: str) -> None:
    slot = backup_mapping(value, label)
    require_backup_keys(
        slot, {"weekday", "day", "departure_time", "order"}, label
    )
    weekday = slot["weekday"]
    if (
        not isinstance(weekday, int)
        or isinstance(weekday, bool)
        or weekday not in range(7)
        or slot["day"] != WEEKDAY_CHOICES[weekday]
        or slot["departure_time"] not in DEPARTURE_TIME_CHOICES
        or not isinstance(slot["order"], int)
        or isinstance(slot["order"], bool)
        or slot["order"] < 1
    ):
        raise backup_error(label)


def validate_backup_response(value: Any, label: str) -> None:
    if value is None:
        return
    response = backup_mapping(value, label)
    require_backup_keys(
        response, {"outcome", "recorded_at", "reason", "fallback_slot_id"}, label
    )
    outcome = response["outcome"]
    if outcome not in ("leaving-for-gym", "move-to-fallback", "skip"):
        raise backup_error(label)
    validate_backup_timestamp(response["recorded_at"], f"{label}.recorded_at")
    reason = response["reason"]
    if reason is not None and reason not in REASON_CHOICES:
        raise backup_error(f"{label}.reason")
    fallback_slot_id = response["fallback_slot_id"]
    if fallback_slot_id is not None and not isinstance(fallback_slot_id, str):
        raise backup_error(f"{label}.fallback_slot_id")


def validate_backup_week_slot(value: Any, label: str) -> str:
    slot = backup_mapping(value, label)
    require_backup_keys(
        slot,
        {
            "id",
            "kind",
            "order",
            "weekday",
            "day",
            "departure_at",
            "status",
            "reminder_sent_at",
            "follow_up_sent_at",
            "departure_response",
            "record_workout_prompt_due_at",
            "record_workout_prompt_sent_at",
            "assigned_from_slot_id",
        },
        label,
    )
    slot_id = slot["id"]
    weekday = slot["weekday"]
    if (
        not isinstance(slot_id, str)
        or not slot_id
        or slot["kind"] not in ("primary", "fallback")
        or not isinstance(slot["order"], int)
        or isinstance(slot["order"], bool)
        or slot["order"] < 1
        or not isinstance(weekday, int)
        or isinstance(weekday, bool)
        or weekday not in range(7)
        or slot["day"] != WEEKDAY_CHOICES[weekday]
        or slot["status"]
        not in (
            "scheduled",
            "available",
            "leaving",
            "moved",
            "skipped",
            "missed",
            "not-needed",
        )
    ):
        raise backup_error(label)
    validate_backup_timestamp(slot["departure_at"], f"{label}.departure_at")
    for field in (
        "reminder_sent_at",
        "follow_up_sent_at",
        "record_workout_prompt_due_at",
        "record_workout_prompt_sent_at",
    ):
        validate_backup_timestamp(slot[field], f"{label}.{field}", optional=True)
    validate_backup_response(slot["departure_response"], f"{label}.departure_response")
    assigned_from = slot["assigned_from_slot_id"]
    if assigned_from is not None and not isinstance(assigned_from, str):
        raise backup_error(f"{label}.assigned_from_slot_id")
    return slot_id


def validate_backup_record(value: Any, label: str) -> str:
    record = backup_mapping(value, label)
    require_backup_keys(
        record,
        {
            "id",
            "source",
            "source_slot_id",
            "recorded_at",
            "activity",
            "duration",
            "effort",
            "qualifies",
        },
        label,
    )
    record_id = record["id"]
    source_slot_id = record["source_slot_id"]
    if (
        not isinstance(record_id, str)
        or not record_id
        or record["source"] not in ("primary", "fallback", "unscheduled")
        or (source_slot_id is not None and not isinstance(source_slot_id, str))
        or record["activity"] not in ACTIVITY_CHOICES
        or record["duration"] not in DURATION_CHOICES
        or record["effort"] not in EFFORT_CHOICES
        or not isinstance(record["qualifies"], bool)
        or record["qualifies"] != DURATION_QUALIFICATION[record["duration"]]
    ):
        raise backup_error(label)
    validate_backup_timestamp(record["recorded_at"], f"{label}.recorded_at")
    return record_id


def validate_backup_week(value: Any, week_key: str) -> None:
    label = f"weeks.{week_key}"
    week = backup_mapping(value, label)
    require_backup_keys(
        week,
        {
            "week_start",
            "week_end",
            "completed_count",
            "primary_slots",
            "fallback_slots",
            "workout_records",
        },
        label,
    )
    try:
        week_start = datetime.fromisoformat(week["week_start"]).date()
        week_end = datetime.fromisoformat(week["week_end"]).date()
    except (TypeError, ValueError) as error:
        raise backup_error(label) from error
    if week_key != week["week_start"] or week_end != week_start + timedelta(days=6):
        raise backup_error(label)
    primary_slots = backup_list(week["primary_slots"], f"{label}.primary_slots")
    fallback_slots = backup_list(week["fallback_slots"], f"{label}.fallback_slots")
    records = backup_list(week["workout_records"], f"{label}.workout_records")
    slot_ids = [
        validate_backup_week_slot(slot, f"{label}.slot.{index}")
        for index, slot in enumerate(primary_slots + fallback_slots)
    ]
    record_ids = [
        validate_backup_record(record, f"{label}.record.{index}")
        for index, record in enumerate(records)
    ]
    completed_count = week["completed_count"]
    if (
        len(slot_ids) != len(set(slot_ids))
        or len(record_ids) != len(set(record_ids))
        or not isinstance(completed_count, int)
        or isinstance(completed_count, bool)
        or completed_count != sum(record["qualifies"] for record in records)
    ):
        raise backup_error(label)
    slots_by_id = {
        slot["id"]: slot for slot in primary_slots + fallback_slots
    }
    if any(slot["kind"] != "primary" for slot in primary_slots) or any(
        slot["kind"] != "fallback" for slot in fallback_slots
    ):
        raise backup_error(label)
    for slot in primary_slots + fallback_slots:
        assigned_from = slot["assigned_from_slot_id"]
        response = slot["departure_response"]
        if assigned_from is not None and assigned_from not in slots_by_id:
            raise backup_error(label)
        if (
            response is not None
            and response["fallback_slot_id"] is not None
            and response["fallback_slot_id"] not in slots_by_id
        ):
            raise backup_error(label)
    for record in records:
        source_slot_id = record["source_slot_id"]
        if record["source"] == "unscheduled":
            if source_slot_id is not None:
                raise backup_error(label)
        elif (
            source_slot_id not in slots_by_id
            or slots_by_id[source_slot_id]["kind"] != record["source"]
        ):
            raise backup_error(label)


def validate_complete_state(value: Any) -> AppState:
    state = backup_mapping(value, "root")
    require_backup_keys(
        state,
        {
            "schema_version",
            "routine",
            "weeks",
            "workout_draft",
            "departure_decision",
        },
        "root",
    )
    if state["schema_version"] != SCHEMA_VERSION:
        raise backup_error("schema_version")
    routine = backup_mapping(state["routine"], "routine")
    require_backup_keys(routine, {"weekly_goal", "primary", "fallback"}, "routine")
    if (
        not isinstance(routine["weekly_goal"], int)
        or isinstance(routine["weekly_goal"], bool)
        or routine["weekly_goal"] < 1
    ):
        raise backup_error("routine.weekly_goal")
    for group in ("primary", "fallback"):
        slots = backup_list(routine[group], f"routine.{group}")
        if not slots:
            raise backup_error(f"routine.{group}")
        for index, slot in enumerate(slots):
            validate_backup_routine_slot(slot, f"routine.{group}.{index}")
        orders = [slot["order"] for slot in slots]
        if len(orders) != len(set(orders)):
            raise backup_error(f"routine.{group}")
    weeks = backup_mapping(state["weeks"], "weeks")
    for week_key, week in weeks.items():
        if not isinstance(week_key, str):
            raise backup_error("weeks")
        validate_backup_week(week, week_key)
    draft = state["workout_draft"]
    if draft is not None:
        draft = backup_mapping(draft, "workout_draft")
        require_backup_keys(
            draft, {"source", "slot_id", "activity", "duration"}, "workout_draft"
        )
        if (
            draft["source"] not in ("primary", "fallback", "unscheduled")
            or (draft["slot_id"] is not None and not isinstance(draft["slot_id"], str))
            or (draft["activity"] is not None and draft["activity"] not in ACTIVITY_CHOICES)
            or (draft["duration"] is not None and draft["duration"] not in DURATION_CHOICES)
        ):
            raise backup_error("workout_draft")
    decision = state["departure_decision"]
    if decision is not None:
        decision = backup_mapping(decision, "departure_decision")
        require_backup_keys(decision, {"slot_id", "outcome"}, "departure_decision")
        if (
            not isinstance(decision["slot_id"], str)
            or decision["outcome"] not in ("move-to-fallback", "skip")
        ):
            raise backup_error("departure_decision")
    return cast(AppState, state)


def read_complete_state(path: Path) -> AppState:
    with path.open(encoding="utf-8") as state_file:
        raw_state: Any = json.load(state_file)
    return validate_complete_state(raw_state)


def export_backup(state_file: Path, backup_file: Path) -> None:
    save_state(backup_file, read_complete_state(state_file))


def restore_backup(backup_file: Path, state_file: Path) -> None:
    save_state(state_file, read_complete_state(backup_file))


def legacy_workout_source(slot_id: Optional[str]) -> WorkoutSource:
    if slot_id == "unscheduled":
        return "unscheduled"
    if "-fallback-" in (slot_id or ""):
        return "fallback"
    return "primary"


def migrate_state(state: AppState) -> bool:
    version_upgrade = state["schema_version"] < SCHEMA_VERSION
    changed = version_upgrade
    if "workout_draft" not in state:
        state["workout_draft"] = None
        changed = True
    if "departure_decision" not in state:
        state["departure_decision"] = None
        changed = True
    draft = state["workout_draft"]
    if draft is not None and "source" not in draft:
        draft["source"] = legacy_workout_source(draft["slot_id"])
        if draft["source"] == "unscheduled":
            draft["slot_id"] = None
        changed = True
    for week in state["weeks"].values():
        if "workout_records" not in week:
            week["workout_records"] = []
            changed = True
        for record in week["workout_records"]:
            if "source" not in record:
                record["source"] = legacy_workout_source(record["source_slot_id"])
                if record["source"] == "unscheduled":
                    record["source_slot_id"] = None
                changed = True
        for slot in week["primary_slots"] + week["fallback_slots"]:
            if "follow_up_sent_at" not in slot:
                slot["follow_up_sent_at"] = None
                changed = True
            if "departure_response" not in slot:
                slot["departure_response"] = None
                changed = True
            if "record_workout_prompt_due_at" not in slot:
                slot["record_workout_prompt_due_at"] = None
                changed = True
            if "record_workout_prompt_sent_at" not in slot:
                slot["record_workout_prompt_sent_at"] = None
                changed = True
            if "assigned_from_slot_id" not in slot:
                slot["assigned_from_slot_id"] = None
                changed = True
    if version_upgrade:
        state["schema_version"] = SCHEMA_VERSION
    return changed


def week_slots(week: Week) -> List[WeekSlot]:
    return week["primary_slots"] + week["fallback_slots"]


def week_goal_reached_at(state: AppState, week: Week) -> Optional[datetime]:
    qualifying_records = sorted(
        (record for record in week["workout_records"] if record["qualifies"]),
        key=lambda record: record["recorded_at"],
    )
    goal = state["routine"]["weekly_goal"]
    if len(qualifying_records) < goal:
        return None
    return datetime.fromisoformat(qualifying_records[goal - 1]["recorded_at"])


def recompute_closed_slot_outcomes(state: AppState, week: Week) -> None:
    goal_reached_at = week_goal_reached_at(state, week)
    for slot in week_slots(week):
        if slot["status"] not in ("missed", "not-needed"):
            continue
        departure = datetime.fromisoformat(slot["departure_at"])
        slot["status"] = (
            "not-needed"
            if goal_reached_at is not None and departure >= goal_reached_at
            else "missed"
        )


def close_expired_weeks(state: AppState, at: datetime) -> bool:
    changed = False
    for week in state["weeks"].values():
        if datetime.fromisoformat(week["week_end"]).date() >= at.date():
            continue
        goal_reached_at = week_goal_reached_at(state, week)
        for slot in week_slots(week):
            if slot["status"] == "scheduled":
                departure = datetime.fromisoformat(slot["departure_at"])
                slot["status"] = (
                    "not-needed"
                    if goal_reached_at is not None and departure >= goal_reached_at
                    else "missed"
                )
                changed = True
    return changed


def weekly_goal_reached(state: AppState, week: Week) -> bool:
    return week["completed_count"] >= state["routine"]["weekly_goal"]


def recompute_week_progress(state: AppState, week: Week) -> None:
    week["completed_count"] = sum(
        workout["qualifies"] for workout in week["workout_records"]
    )
    recompute_closed_slot_outcomes(state, week)


def workout_record(state: AppState, record_id: str) -> tuple[Week, WorkoutRecord]:
    for week in state["weeks"].values():
        for record in week["workout_records"]:
            if record["id"] == record_id:
                return week, record
    raise ValueError("workout record does not exist")


def correct_workout_record(
    state: AppState,
    record_id: str,
    activity: str,
    duration: str,
    effort: str,
) -> WorkoutRecord:
    if (
        activity not in ACTIVITY_CHOICES
        or duration not in DURATION_CHOICES
        or effort not in EFFORT_CHOICES
    ):
        raise ValueError("invalid workout correction")
    week, record = workout_record(state, record_id)
    record["activity"] = activity
    record["duration"] = duration
    record["effort"] = effort
    record["qualifies"] = DURATION_QUALIFICATION[duration]
    recompute_week_progress(state, week)
    return record


def delete_workout_record(state: AppState, record_id: str) -> None:
    week, record = workout_record(state, record_id)
    week["workout_records"].remove(record)
    recompute_week_progress(state, week)


def week_slot_index(week: Week) -> Dict[str, WeekSlot]:
    return {slot["id"]: slot for slot in week_slots(week)}


def require_decidable_departure_slot(
    week: Week, slot_id: str, at: datetime
) -> WeekSlot:
    for slot in week_slots(week):
        departure = datetime.fromisoformat(slot["departure_at"])
        if slot["id"] == slot_id and slot["status"] == "scheduled":
            if departure > at:
                raise ValueError("departure cannot be decided before its planned time")
            return slot
    raise ValueError("departure slot is not awaiting a response")


def confirm_departure(week: Week, slot_id: str, at: datetime) -> WeekSlot:
    slot = require_decidable_departure_slot(week, slot_id, at)
    slot["status"] = "leaving"
    slot["departure_response"] = {
        "outcome": "leaving-for-gym",
        "recorded_at": at.isoformat(),
        "reason": None,
        "fallback_slot_id": None,
    }
    slot["record_workout_prompt_due_at"] = (at + timedelta(minutes=90)).isoformat()
    return slot


def fallback_reserved_by_primary(week: Week, slot: WeekSlot) -> bool:
    fallback_date = datetime.fromisoformat(slot["departure_at"]).date()
    return any(
        primary["status"] in ("scheduled", "leaving")
        and datetime.fromisoformat(primary["departure_at"]).date() == fallback_date
        for primary in week["primary_slots"]
    )


def fallback_is_available(week: Week, slot: WeekSlot, at: datetime) -> bool:
    return (
        slot["status"] == "available"
        and datetime.fromisoformat(slot["departure_at"]) >= at
        and not fallback_reserved_by_primary(week, slot)
    )


def next_available_fallback(week: Week, at: datetime) -> Optional[WeekSlot]:
    return min(
        (
            slot
            for slot in week["fallback_slots"]
            if fallback_is_available(week, slot, at)
        ),
        key=lambda slot: slot["order"],
        default=None,
    )


def schedule_selection(weekday_value: str, departure_time: str) -> tuple[int, str]:
    try:
        weekday = int(weekday_value)
    except ValueError as error:
        raise ValueError("invalid schedule selection") from error
    if weekday not in range(7) or departure_time not in DEPARTURE_TIME_CHOICES:
        raise ValueError("invalid schedule selection")
    return weekday, departure_time


def adjust_week_slot(
    week: Week,
    slot_id: str,
    weekday_value: str,
    departure_time: str,
    at: datetime,
) -> WeekSlot:
    weekday, departure_time = schedule_selection(weekday_value, departure_time)
    slot = next(
        (
            candidate
            for candidate in week["primary_slots"]
            if candidate["id"] == slot_id
            and candidate["status"] == "scheduled"
            and candidate["reminder_sent_at"] is None
            and datetime.fromisoformat(candidate["departure_at"]) > at
        ),
        None,
    )
    if slot is None:
        raise ValueError("only an upcoming primary departure can be adjusted")
    week_start = datetime.fromisoformat(week["week_start"]).date()
    hour, minute = map(int, departure_time.split(":"))
    adjusted = datetime.combine(
        week_start + timedelta(days=weekday),
        time(hour, minute),
        tzinfo=at.tzinfo,
    )
    if adjusted <= at:
        raise ValueError("adjusted departure must remain upcoming")
    slot["weekday"] = weekday
    slot["day"] = WEEKDAY_CHOICES[weekday]
    slot["departure_at"] = adjusted.isoformat()
    return slot


def update_primary_routine(
    state: AppState,
    order_value: str,
    weekday_value: str,
    departure_time: str,
) -> RoutineSlot:
    try:
        order = int(order_value)
    except ValueError as error:
        raise ValueError("invalid routine slot") from error
    weekday, departure_time = schedule_selection(weekday_value, departure_time)
    routine_slot = next(
        (slot for slot in state["routine"]["primary"] if slot["order"] == order),
        None,
    )
    if routine_slot is None:
        raise ValueError("invalid routine slot")
    routine_slot["weekday"] = weekday
    routine_slot["day"] = WEEKDAY_CHOICES[weekday]
    routine_slot["departure_time"] = departure_time
    return routine_slot


def start_departure_decision(
    state: AppState,
    week: Week,
    slot_id: str,
    outcome: DepartureDecisionOutcome,
    at: datetime,
) -> None:
    require_decidable_departure_slot(week, slot_id, at)
    if outcome == "move-to-fallback" and next_available_fallback(week, at) is None:
        raise ValueError("no fallback slot remains")
    state["departure_decision"] = {
        "slot_id": slot_id,
        "outcome": outcome,
    }


def confirm_departure_decision(
    state: AppState, week: Week, slot_id: str, reason: str, at: datetime
) -> WeekSlot:
    decision = state["departure_decision"]
    if (
        decision is None
        or decision["slot_id"] != slot_id
        or reason not in REASON_CHOICES
    ):
        raise ValueError("invalid departure reason selection")
    slot = require_decidable_departure_slot(week, slot_id, at)
    selected_reason = cast(DepartureReason, reason)
    fallback_slot: Optional[WeekSlot] = None
    if decision["outcome"] == "move-to-fallback":
        fallback_slot = next_available_fallback(week, at)
        if fallback_slot is None:
            raise ValueError("no fallback slot remains")
        fallback_slot["status"] = "scheduled"
        fallback_slot["assigned_from_slot_id"] = slot_id
        slot["status"] = "moved"
    else:
        slot["status"] = "skipped"
    slot["departure_response"] = {
        "outcome": decision["outcome"],
        "recorded_at": at.isoformat(),
        "reason": selected_reason,
        "fallback_slot_id": fallback_slot["id"] if fallback_slot is not None else None,
    }
    state["departure_decision"] = None
    return slot


def recordable_slots(week: Week) -> List[WeekSlot]:
    recorded_slot_ids = {
        record["source_slot_id"] for record in week["workout_records"]
    }
    return [
        slot
        for slot in week_slots(week)
        if slot["status"] == "leaving"
        and slot["record_workout_prompt_sent_at"] is not None
        and slot["id"] not in recorded_slot_ids
    ]


def recordable_slot(week: Week, slot_id: str) -> WeekSlot:
    for slot in recordable_slots(week):
        if slot["id"] == slot_id:
            return slot
    raise ValueError("workout prompt is not awaiting a record")


def workout_draft_for(state: AppState, slot_id: Optional[str]) -> WorkoutDraft:
    draft = state["workout_draft"]
    if draft is None or draft["slot_id"] != slot_id:
        raise ValueError("workout record is not in progress")
    return draft


def start_workout_record(state: AppState, week: Week, slot_id: str) -> None:
    slot = recordable_slot(week, slot_id)
    if state["workout_draft"] is not None:
        raise ValueError("a workout record is already in progress")
    state["workout_draft"] = {
        "source": slot["kind"],
        "slot_id": slot_id,
        "activity": None,
        "duration": None,
    }


def start_unscheduled_workout_record(state: AppState) -> None:
    if state["workout_draft"] is not None:
        raise ValueError("a workout record is already in progress")
    state["workout_draft"] = {
        "source": "unscheduled",
        "slot_id": None,
        "activity": None,
        "duration": None,
    }


def choose_workout_activity(
    state: AppState, slot_id: Optional[str], activity: str
) -> None:
    draft = workout_draft_for(state, slot_id)
    if draft["activity"] is not None or activity not in ACTIVITY_CHOICES:
        raise ValueError("invalid workout activity selection")
    draft["activity"] = activity


def choose_workout_duration(
    state: AppState, slot_id: Optional[str], duration: str
) -> None:
    draft = workout_draft_for(state, slot_id)
    if (
        draft["activity"] is None
        or draft["duration"] is not None
        or duration not in DURATION_CHOICES
    ):
        raise ValueError("invalid workout duration selection")
    draft["duration"] = duration


def complete_workout_record(
    state: AppState,
    week: Week,
    slot_id: Optional[str],
    effort: str,
    at: datetime,
) -> WorkoutRecord:
    draft = workout_draft_for(state, slot_id)
    if draft["source"] != "unscheduled":
        if slot_id is None:
            raise ValueError("workout prompt is not awaiting a record")
        recordable_slot(week, slot_id)
    if (
        draft["activity"] is None
        or draft["duration"] is None
        or effort not in EFFORT_CHOICES
    ):
        raise ValueError("invalid workout effort selection")
    unscheduled_id = f"{week['week_start']}-unscheduled-{uuid.uuid4().hex}"
    record = WorkoutRecord(
        id=(
            unscheduled_id
            if draft["source"] == "unscheduled"
            else f"{slot_id}-workout"
        ),
        source=draft["source"],
        source_slot_id=slot_id,
        recorded_at=at.isoformat(),
        activity=draft["activity"],
        duration=draft["duration"],
        effort=effort,
        qualifies=DURATION_QUALIFICATION[draft["duration"]],
    )
    week["workout_records"].append(record)
    recompute_week_progress(state, week)
    state["workout_draft"] = None
    return record


def load_state(path: Path, at: datetime) -> AppState:
    changed = False
    if path.exists():
        with path.open(encoding="utf-8") as state_file:
            raw_state: Dict[str, Any] = json.load(state_file)
        state = AppState(**raw_state)
        changed = migrate_state(state)
    else:
        state = new_state()
        changed = True

    changed = close_expired_weeks(state, at) or changed
    week_key = week_start_for(at).date().isoformat()
    if week_key not in state["weeks"]:
        ensure_week(state, at)
        changed = True
    week = state["weeks"][week_key]
    decision = state["departure_decision"]
    if decision is not None:
        source_is_current = any(
            slot["id"] == decision["slot_id"] and slot["status"] == "scheduled"
            for slot in week_slots(week)
        )
        move_can_still_succeed = (
            decision["outcome"] != "move-to-fallback"
            or next_available_fallback(week, at) is not None
        )
        if not source_is_current or not move_can_still_succeed:
            state["departure_decision"] = None
            changed = True

    if changed:
        save_state(path, state)
    return state
