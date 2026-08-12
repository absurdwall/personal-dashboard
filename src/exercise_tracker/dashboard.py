import html
from datetime import datetime
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any, Optional
from urllib.parse import parse_qs

from .presentation import friendly_departure
from .state import (
    ACTIVITY_CHOICES,
    APP_NAME,
    DEPARTURE_TIME_CHOICES,
    DURATION_CHOICES,
    EFFORT_CHOICES,
    REASON_CHOICES,
    WEEKDAY_CHOICES,
    AppState,
    Week,
    adjust_week_slot,
    choose_workout_activity,
    choose_workout_duration,
    complete_workout_record,
    confirm_departure,
    confirm_departure_decision,
    correct_workout_record,
    current_time,
    delete_workout_record,
    ensure_week,
    fallback_is_available,
    fallback_reserved_by_primary,
    load_state,
    recordable_slots,
    save_state,
    start_departure_decision,
    start_unscheduled_workout_record,
    start_workout_record,
    update_primary_routine,
    week_slot_index,
    week_slots,
    weekly_goal_reached,
)


def workout_records_by_slot(week: Week) -> dict[str, dict[str, Any]]:
    return {
        record["source_slot_id"]: record
        for record in week["workout_records"]
        if record["source_slot_id"] is not None
    }


def workout_outcome(record: dict[str, Any]) -> str:
    return "Completed" if record["qualifies"] else "Short effort"


WORKOUT_SOURCE_LABELS = {
    "primary": "Primary workout",
    "fallback": "Fallback workout",
    "unscheduled": "Unscheduled workout",
}


def schedule_options(
    choices: tuple[tuple[str, str], ...], selected_value: str
) -> str:
    return "".join(
        '<option value="{value}"{selected}>{label}</option>'.format(
            value=html.escape(value),
            selected=" selected" if value == selected_value else "",
            label=html.escape(label),
        )
        for value, label in choices
    )


def friendly_time_choice(value: str) -> str:
    hour, minute = map(int, value.split(":"))
    return datetime(2000, 1, 1, hour, minute).strftime("%-I:%M %p")


WEEKDAY_SCHEDULE_CHOICES = tuple(
    (str(index), day) for index, day in enumerate(WEEKDAY_CHOICES)
)
DEPARTURE_TIME_SCHEDULE_CHOICES = tuple(
    (value, friendly_time_choice(value)) for value in DEPARTURE_TIME_CHOICES
)


def week_slot_adjustment(slot: dict[str, Any], at: datetime) -> str:
    departure = datetime.fromisoformat(slot["departure_at"])
    if (
        slot["status"] != "scheduled"
        or slot["reminder_sent_at"] is not None
        or departure <= at
    ):
        return ""
    weekday_options = schedule_options(
        WEEKDAY_SCHEDULE_CHOICES,
        str(slot["weekday"]),
    )
    time_options = schedule_options(
        DEPARTURE_TIME_SCHEDULE_CHOICES,
        departure.strftime("%H:%M"),
    )
    return f"""
    <details class="schedule-editor">
      <summary>Adjust this week</summary>
      <form method="post">
        <input type="hidden" name="slot_id" value="{html.escape(slot['id'])}">
        <label>Day<select name="weekday">{weekday_options}</select></label>
        <label>Departure time<select name="departure_time">{time_options}</select></label>
        <button type="submit" name="schedule_action" value="adjust-week-slot">Save this week only</button>
      </form>
    </details>
    """


def primary_schedule(week: Week, at: Optional[datetime] = None) -> str:
    slots_by_id = week_slot_index(week)
    records_by_slot_id = workout_records_by_slot(week)

    def response_status(slot: dict[str, Any]) -> str:
        response = slot["departure_response"]
        if slot["status"] == "leaving":
            record = records_by_slot_id.get(slot["id"])
            if record is not None:
                return (
                    '<span class="response-status">'
                    f"{workout_outcome(record)}</span>"
                )
            return '<span class="response-status">Leaving for gym confirmed</span>'
        if slot["status"] == "moved" and response is not None:
            fallback = slots_by_id.get(response["fallback_slot_id"])
            fallback_day = fallback["day"] if fallback is not None else "fallback"
            return (
                '<span class="response-status">Moved to '
                f'{html.escape(fallback_day)} · {html.escape(response["reason"] or "")}</span>'
            )
        if slot["status"] == "skipped" and response is not None:
            return (
                '<span class="response-status skipped">Skipped · '
                f'{html.escape(response["reason"] or "")}</span>'
            )
        if slot["status"] == "missed":
            return '<span class="response-status missed">Missed — no response</span>'
        if slot["status"] == "not-needed":
            return (
                '<span class="response-status not-needed">'
                "Weekly goal met — no workout needed</span>"
            )
        if slot["follow_up_sent_at"] is not None:
            return '<span class="response-status unresolved">Unresolved — no response</span>'
        return ""

    return "".join(
        "<li><div><strong>{day}</strong><span>{time}</span></div>{status}{editor}</li>".format(
            day=html.escape(slot["day"]),
            time=html.escape(
                datetime.fromisoformat(slot["departure_at"]).strftime("%-I:%M %p")
            ),
            status=response_status(slot),
            editor=week_slot_adjustment(slot, at) if at is not None else "",
        )
        for slot in week["primary_slots"]
    )


def fallback_schedule(week: Week, at: datetime) -> str:
    slots_by_id = week_slot_index(week)
    records_by_slot_id = workout_records_by_slot(week)
    available_count = sum(
        fallback_is_available(week, slot, at)
        for slot in week["fallback_slots"]
    )
    summary = (
        f"{available_count} fallback slot{'s' if available_count != 1 else ''} available"
        if available_count
        else "No fallback slots available"
    )

    def fallback_status(slot: dict[str, Any]) -> str:
        if slot["status"] == "available":
            if fallback_reserved_by_primary(week, slot):
                return "Reserved by primary departure"
            return (
                "Available"
                if fallback_is_available(week, slot, at)
                else "No longer available"
            )
        source = slots_by_id.get(slot["assigned_from_slot_id"])
        source_day = source["day"] if source is not None else "planned workout"
        assignment = f"Assigned from {source_day}"
        response = slot["departure_response"]
        if slot["status"] == "missed":
            return f"{assignment} · Missed — no response"
        if slot["status"] == "not-needed":
            return f"{assignment} · Weekly goal met — no workout needed"
        if slot["status"] == "skipped" and response is not None:
            return f"{assignment} · Skipped · {response['reason'] or ''}"
        if slot["status"] == "leaving":
            record = records_by_slot_id.get(slot["id"])
            if record is not None:
                return f"{assignment} · {workout_outcome(record)}"
        return assignment

    slots = "".join(
        "<li><div><strong>{day}</strong><span>{time}</span></div>"
        '<span class="availability">{status}</span></li>'.format(
            day=html.escape(slot["day"]),
            time=html.escape(
                datetime.fromisoformat(slot["departure_at"]).strftime("%-I:%M %p")
            ),
            status=html.escape(fallback_status(slot)),
        )
        for slot in week["fallback_slots"]
    )
    return f'<p class="availability-summary">{html.escape(summary)}</p><ol>{slots}</ol>'


def next_departure(week: Week, at: datetime) -> Optional[dict[str, Any]]:
    departures = [
        slot
        for slot in week_slots(week)
        if slot["status"] == "scheduled"
        and slot["reminder_sent_at"] is None
        and datetime.fromisoformat(slot["departure_at"]) >= at
    ]
    return min(departures, key=lambda slot: slot["departure_at"], default=None)


def departure_awaiting_response(week: Week, at: datetime) -> Optional[dict[str, Any]]:
    departures = [
        slot
        for slot in week_slots(week)
        if slot["status"] == "scheduled"
        and datetime.fromisoformat(slot["departure_at"]) <= at
    ]
    return max(departures, key=lambda slot: slot["departure_at"], default=None)


def departure_prompt(state: AppState, week: Week, at: datetime) -> str:
    decision = state["departure_decision"]
    if decision is not None:
        heading = (
            "Why are you moving this workout?"
            if decision["outcome"] == "move-to-fallback"
            else "Why are you skipping this workout?"
        )
        return f"""
        <section class="departure-prompt" aria-labelledby="departure-prompt-heading">
          <p>Choose one reason</p>
          <h2 id="departure-prompt-heading">{html.escape(heading)}</h2>
          <div class="choices">{choice_forms("confirm-departure-decision", decision["slot_id"], "reason", REASON_CHOICES)}</div>
        </section>
        """
    slot = departure_awaiting_response(week, at)
    if slot is None:
        return ""
    prompt_status = (
        '<p class="unresolved">Unresolved — no response</p>'
        if slot["follow_up_sent_at"] is not None
        else ""
    )
    return f"""
    <section class="departure-prompt" aria-labelledby="departure-prompt-heading">
      <p>Departure prompt</p>
      <h2 id="departure-prompt-heading">Time to leave for the gym</h2>
      {prompt_status}
      <form method="post">
        <input type="hidden" name="slot_id" value="{html.escape(slot['id'])}">
        <button type="submit" name="action" value="leaving-for-gym">Leaving for gym</button>
        <button type="submit" name="action" value="move-to-fallback">Move to fallback</button>
        <button type="submit" name="action" value="skip">Skip</button>
      </form>
    </section>
    """


def departure_confirmation(week: Week) -> str:
    leaving_slots = [
        slot
        for slot in week_slots(week)
        if slot["status"] == "leaving"
        and slot["record_workout_prompt_due_at"] is not None
    ]
    if not leaving_slots:
        return ""

    def response_time(slot: dict[str, Any]) -> str:
        response = slot["departure_response"]
        return response["recorded_at"] if response is not None else ""

    slot = max(
        leaving_slots,
        key=response_time,
    )
    due_at = datetime.fromisoformat(slot["record_workout_prompt_due_at"] or "")
    return f"""
    <section class="confirmation" aria-live="polite">
      <strong>Leaving for gym confirmed</strong>
      <span>Record workout reminder at {due_at.strftime('%-I:%M %p')}</span>
    </section>
    """


def choice_forms(
    action: str, slot_id: Optional[str], field: str, choices: tuple[str, ...]
) -> str:
    source_field = (
        f'<input type="hidden" name="slot_id" value="{html.escape(slot_id)}">'
        if slot_id is not None
        else '<input type="hidden" name="workout_source" value="unscheduled">'
    )
    return "".join(
        f"""
        <form method="post">
          <input type="hidden" name="action" value="{html.escape(action)}">
          {source_field}
          <button type="submit" name="{html.escape(field)}" value="{html.escape(choice)}">{html.escape(choice)}</button>
        </form>
        """
        for choice in choices
    )


def workout_recording_flow(state: AppState) -> str:
    draft = state["workout_draft"]
    if draft is None:
        return ""
    slot_id = draft["slot_id"]
    if draft["activity"] is None:
        heading = "What activity did you do?"
        guidance = "Choose one activity."
        forms = choice_forms(
            "choose-activity", slot_id, "activity", ACTIVITY_CHOICES
        )
    elif draft["duration"] is None:
        heading = "About how long was the workout?"
        guidance = "Choose the closest duration."
        forms = choice_forms(
            "choose-duration", slot_id, "duration", DURATION_CHOICES
        )
    else:
        heading = "How strenuous did this workout feel?"
        guidance = "Choose the description that fits. Harder is not better."
        forms = choice_forms("choose-effort", slot_id, "effort", EFFORT_CHOICES)
    return f"""
    <section class="workout-flow" aria-labelledby="workout-flow-heading">
      <p>Record workout</p>
      <h2 id="workout-flow-heading">{html.escape(heading)}</h2>
      <p class="guidance">{html.escape(guidance)}</p>
      <div class="choices">{forms}</div>
    </section>
    """


def record_workout_prompt(state: AppState, week: Week) -> str:
    if state["workout_draft"] is not None:
        return workout_recording_flow(state)
    eligible_slots = recordable_slots(week)
    if not eligible_slots:
        return ""
    slot = max(
        eligible_slots,
        key=lambda candidate: candidate["record_workout_prompt_sent_at"] or "",
    )
    return f"""
    <section class="workout-prompt" aria-labelledby="workout-prompt-heading">
      <p>Record workout</p>
      <h2 id="workout-prompt-heading">Ready to save this workout?</h2>
      <form method="post">
        <input type="hidden" name="slot_id" value="{html.escape(slot['id'])}">
        <button type="submit" name="action" value="start-workout-record">Done</button>
      </form>
    </section>
    """


def log_workout_now_action(state: AppState) -> str:
    if state["workout_draft"] is not None:
        return ""
    return """
    <section class="manual-workout" aria-labelledby="manual-workout-heading">
      <h2 id="manual-workout-heading">Log a workout</h2>
      <form method="post">
        <input type="hidden" name="workout_source" value="unscheduled">
        <button type="submit" name="manual_action" value="log-workout-now">Log workout now</button>
      </form>
    </section>
    """


def routine_settings(state: AppState) -> str:
    forms = "".join(
        f"""
        <li>
          <strong>{html.escape(slot['day'])} · {html.escape(friendly_time_choice(slot['departure_time']))}</strong>
          <form method="post">
            <input type="hidden" name="routine_order" value="{slot['order']}">
            <label>Day<select name="weekday">{schedule_options(WEEKDAY_SCHEDULE_CHOICES, str(slot['weekday']))}</select></label>
            <label>Departure time<select name="departure_time">{schedule_options(DEPARTURE_TIME_SCHEDULE_CHOICES, slot['departure_time'])}</select></label>
            <button type="submit" name="schedule_action" value="save-routine-slot">Save future routine</button>
          </form>
        </li>
        """
        for slot in state["routine"]["primary"]
    )
    return f"""
    <section class="card routine-settings" aria-labelledby="routine-settings-heading">
      <details>
        <summary id="routine-settings-heading">Change repeating routine</summary>
        <p>Applies to future weeks only. This week and prior weeks stay unchanged.</p>
        <ol>{forms}</ol>
      </details>
    </section>
    """


def workout_record_editor(record: dict[str, Any]) -> str:
    activity_choices = tuple((choice, choice) for choice in ACTIVITY_CHOICES)
    duration_choices = tuple((choice, choice) for choice in DURATION_CHOICES)
    effort_choices = tuple((choice, choice) for choice in EFFORT_CHOICES)
    return f"""
    <details class="record-editor">
      <summary>Edit record</summary>
      <form method="post">
        <input type="hidden" name="record_id" value="{html.escape(record['id'])}">
        <label>Activity<select name="activity">{schedule_options(activity_choices, record['activity'])}</select></label>
        <label>Duration<select name="duration">{schedule_options(duration_choices, record['duration'])}</select></label>
        <label>Perceived effort<select name="effort">{schedule_options(effort_choices, record['effort'])}</select></label>
        <button type="submit" name="history_action" value="save-workout-correction">Save correction</button>
      </form>
    </details>
    <details class="record-deletion">
      <summary>Delete record</summary>
      <p>Delete this workout record? This cannot be undone.</p>
      <form method="post">
        <input type="hidden" name="record_id" value="{html.escape(record['id'])}">
        <button type="submit" name="history_action" value="confirm-workout-deletion">Confirm delete</button>
      </form>
    </details>
    """


def workout_history(state: AppState) -> str:
    workout_records = sorted(
        (
            record
            for week in state["weeks"].values()
            for record in week["workout_records"]
        ),
        key=lambda record: record["recorded_at"],
        reverse=True,
    )
    if not workout_records:
        return ""
    records = "".join(
        """
        <li>
          <div>
            <strong>{activity}</strong>
            <span>{duration} · {effort}</span>
            <span>{source} · {recorded_at}</span>
          </div>
          <span class="record-status {status_class}">{status}</span>
          {editor}
        </li>
        """.format(
            activity=html.escape(record["activity"]),
            duration=html.escape(record["duration"]),
            effort=html.escape(record["effort"]),
            source=html.escape(WORKOUT_SOURCE_LABELS[record["source"]]),
            recorded_at=html.escape(
                datetime.fromisoformat(record["recorded_at"]).strftime(
                    "%A, %B %-d at %-I:%M %p"
                )
            ),
            status_class="qualifying" if record["qualifies"] else "short-effort",
            status=(
                "Counts toward weekly progress"
                if record["qualifies"]
                else "Short effort — does not count toward weekly progress"
            ),
            editor=workout_record_editor(record),
        )
        for record in workout_records
    )
    return f"""
    <section class="card records" aria-labelledby="workout-records-heading">
      <h2 id="workout-records-heading">Workout history</h2>
      <ol>{records}</ol>
    </section>
    """


def previous_week_outcomes(state: AppState, current_week: Week, at: datetime) -> str:
    previous_weeks = [
        week
        for week in state["weeks"].values()
        if week["week_start"] < current_week["week_start"]
    ]
    if not previous_weeks:
        return ""
    previous_week = max(previous_weeks, key=lambda week: week["week_start"])
    goal = state["routine"]["weekly_goal"]
    progress = f"Previous week progress: {previous_week['completed_count']} of {goal} completed"
    success = (
        '<p class="goal-success">Previous week goal complete</p>'
        if previous_week["completed_count"] >= goal
        else ""
    )
    return f"""
    <section class="card previous-week" aria-labelledby="previous-week-heading">
      <h2 id="previous-week-heading">Previous week outcomes</h2>
      <p>{html.escape(progress)}</p>
      {success}
      <h3>Primary departures</h3>
      <ol>{primary_schedule(previous_week)}</ol>
      <h3>Fallback departures</h3>
      {fallback_schedule(previous_week, at)}
    </section>
    """


def render_dashboard(state: AppState, at: datetime) -> str:
    week = ensure_week(state, at)
    goal_reached = weekly_goal_reached(state, week)
    departure = None if goal_reached else next_departure(week, at)
    departure_text = (
        "Weekly goal complete — optional workouts welcome"
        if goal_reached
        else (
            friendly_departure(departure["departure_at"])
            if departure is not None
            else "No primary departures remaining this week"
        )
    )
    week_start = datetime.fromisoformat(week["week_start"])
    week_end = datetime.fromisoformat(week["week_end"])
    week_label = (
        f"{week_start.strftime('%A, %B')} {week_start.day} – "
        f"{week_end.strftime('%A, %B')} {week_end.day}"
    )
    prompt = "" if goal_reached else departure_prompt(state, week, at)
    confirmation = departure_confirmation(week)
    workout_prompt = (
        workout_recording_flow(state)
        if state["workout_draft"] is not None
        else ("" if goal_reached else record_workout_prompt(state, week))
    )
    manual_workout = log_workout_now_action(state)
    records = workout_history(state)
    previous_outcomes = previous_week_outcomes(state, week, at)
    settings = routine_settings(state)
    goal_status = (
        '<p class="goal-success" role="status">Weekly goal complete</p>'
        if goal_reached
        else ""
    )
    return f"""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{APP_NAME}</title>
  <style>
    :root {{ color-scheme: light; font-family: ui-rounded, "SF Pro Rounded", system-ui, sans-serif; }}
    * {{ box-sizing: border-box; }}
    body {{ margin: 0; min-height: 100vh; background: #f4f1ea; color: #17322b; }}
    main {{ width: min(720px, calc(100% - 32px)); margin: 0 auto; padding: 48px 0 64px; }}
    header p {{ margin: 0 0 6px; color: #597069; font-weight: 650; }}
    h1 {{ margin: 0; font-size: clamp(2.5rem, 9vw, 5rem); letter-spacing: -0.055em; line-height: .95; }}
    h2 {{ margin: 0 0 18px; font-size: 1.25rem; }}
    .next {{ margin: 32px 0; padding: 28px; border-radius: 24px; background: #183f35; color: #fff; box-shadow: 0 18px 45px #17322b24; }}
    .next p {{ margin: 0 0 8px; color: #bde1d6; font-weight: 700; }}
    .next strong {{ display: block; font-size: clamp(1.6rem, 5vw, 2.4rem); line-height: 1.15; }}
    .grid {{ display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 18px; }}
    section.card {{ padding: 24px; border: 1px solid #d8d2c7; border-radius: 20px; background: #fffdf8; }}
    ol {{ list-style: none; margin: 0; padding: 0; }}
    li {{ display: flex; justify-content: space-between; gap: 16px; padding: 13px 0; border-top: 1px solid #e7e1d8; }}
    li:first-child {{ border-top: 0; }}
    li strong, li span {{ display: block; }}
    li span {{ color: #65766f; }}
    .availability {{ align-self: center; border-radius: 999px; background: #dff3e7; color: #205d46; padding: 5px 9px; font-size: .82rem; font-weight: 750; }}
    .departure-prompt, .confirmation, .workout-prompt, .workout-flow, .manual-workout {{ margin: 24px 0; padding: 24px; border-radius: 20px; background: #fffdf8; border: 2px solid #d5a82f; }}
    .departure-prompt p {{ margin: 0 0 6px; color: #6e5a23; font-weight: 750; }}
    button {{ border: 0; border-radius: 999px; padding: 12px 18px; background: #d5a82f; color: #17322b; font: inherit; font-weight: 800; cursor: pointer; }}
    .confirmation {{ display: flex; justify-content: space-between; gap: 16px; border-color: #7eb89f; }}
    .workout-prompt p, .workout-flow > p:first-child {{ margin: 0 0 6px; color: #6e5a23; font-weight: 750; }}
    .guidance {{ color: #597069; }}
    .choices {{ display: flex; flex-wrap: wrap; gap: 10px; }}
    .records {{ margin-top: 18px; }}
    .previous-week, .routine-settings {{ margin-top: 18px; }}
    .record-status {{ align-self: center; max-width: 260px; text-align: right; color: #205d46; font-size: .85rem; font-weight: 750; }}
    .record-status.short-effort {{ color: #6f6558; }}
    .response-status {{ align-self: center; color: #205d46; font-size: .85rem; font-weight: 750; }}
    .unresolved {{ color: #8a532c; }}
    .goal-success {{ color: #205d46; font-weight: 800; }}
    @media (max-width: 620px) {{ .grid {{ grid-template-columns: 1fr; }} main {{ padding-top: 28px; }} }}
  </style>
</head>
<body>
  <main>
    <header>
      <p>Week of {html.escape(week_label)}</p>
      <h1>{week['completed_count']} of {state['routine']['weekly_goal']} completed</h1>
      {goal_status}
    </header>
    {prompt}
    {confirmation}
    {workout_prompt}
    {manual_workout}
    <section class="next" aria-labelledby="next-departure-heading">
      <p id="next-departure-heading">Next departure</p>
      <strong>{html.escape(departure_text)}</strong>
    </section>
    <div class="grid">
      <section class="card" aria-labelledby="primary-heading">
        <h2 id="primary-heading">Primary departures</h2>
        <ol>{primary_schedule(week, at)}</ol>
      </section>
      <section class="card" aria-labelledby="fallback-heading">
        <h2 id="fallback-heading">Fallback availability</h2>
        {fallback_schedule(week, at)}
      </section>
    </div>
    {records}
    {previous_outcomes}
    {settings}
  </main>
</body>
</html>
"""


class DashboardHandler(BaseHTTPRequestHandler):
    state_file: Path
    at_override: Optional[datetime]

    def do_GET(self) -> None:
        if self.path != "/":
            self.send_error(404)
            return
        at = self.at_override or current_time()
        state = load_state(self.state_file, at)
        body = render_dashboard(state, at).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self) -> None:
        if self.path != "/":
            self.send_error(404)
            return
        content_length = int(self.headers.get("Content-Length", "0"))
        if content_length <= 0 or content_length > 4096:
            self.send_error(400, "invalid form submission")
            return
        form = parse_qs(self.rfile.read(content_length).decode("utf-8"))
        action = form.get(
            "action",
            form.get(
                "manual_action",
                form.get("schedule_action", form.get("history_action", [""])),
            ),
        )[0]
        slot_id = form.get("slot_id", [""])[0]
        workout_source = form.get("workout_source", [""])[0]
        workout_slot_id = None if workout_source == "unscheduled" else slot_id or None
        if not action:
            self.send_error(400, "unknown departure response")
            return
        at = self.at_override or current_time()
        state = load_state(self.state_file, at)
        week = ensure_week(state, at)
        try:
            if action == "leaving-for-gym":
                confirm_departure(week, slot_id, at)
            elif action == "adjust-week-slot":
                adjust_week_slot(
                    week,
                    slot_id,
                    form.get("weekday", [""])[0],
                    form.get("departure_time", [""])[0],
                    at,
                )
            elif action == "save-routine-slot":
                update_primary_routine(
                    state,
                    form.get("routine_order", [""])[0],
                    form.get("weekday", [""])[0],
                    form.get("departure_time", [""])[0],
                )
            elif action in ("move-to-fallback", "skip"):
                start_departure_decision(state, week, slot_id, action, at)
            elif action == "confirm-departure-decision":
                confirm_departure_decision(
                    state, week, slot_id, form.get("reason", [""])[0], at
                )
            elif action == "start-workout-record":
                start_workout_record(state, week, slot_id)
            elif action == "log-workout-now":
                if workout_source != "unscheduled":
                    raise ValueError("invalid workout source")
                start_unscheduled_workout_record(state)
            elif action == "choose-activity":
                choose_workout_activity(
                    state, workout_slot_id, form.get("activity", [""])[0]
                )
            elif action == "choose-duration":
                choose_workout_duration(
                    state, workout_slot_id, form.get("duration", [""])[0]
                )
            elif action == "choose-effort":
                complete_workout_record(
                    state,
                    week,
                    workout_slot_id,
                    form.get("effort", [""])[0],
                    at,
                )
            elif action == "save-workout-correction":
                correct_workout_record(
                    state,
                    form.get("record_id", [""])[0],
                    form.get("activity", [""])[0],
                    form.get("duration", [""])[0],
                    form.get("effort", [""])[0],
                )
            elif action == "confirm-workout-deletion":
                delete_workout_record(
                    state,
                    form.get("record_id", [""])[0],
                )
            else:
                self.send_error(400, "unknown dashboard action")
                return
        except ValueError as error:
            self.send_error(409, str(error))
            return
        save_state(self.state_file, state)
        self.send_response(303)
        self.send_header("Location", "/")
        self.end_headers()

    def log_message(self, format: str, *args: Any) -> None:
        return


def serve_dashboard(
    state_file: Path, host: str, port: int, at_override: Optional[datetime]
) -> None:
    load_state(state_file, at_override or current_time())
    handler = type(
        "ConfiguredDashboardHandler",
        (DashboardHandler,),
        {"state_file": state_file, "at_override": at_override},
    )
    server = ThreadingHTTPServer((host, port), handler)
    actual_host, actual_port = server.server_address[:2]
    display_host = "127.0.0.1" if actual_host in ("0.0.0.0", "::") else actual_host
    print(f"Dashboard: http://{display_host}:{actual_port}/", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
