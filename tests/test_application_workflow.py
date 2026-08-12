import json
import os
import re
import subprocess
import sys
import tempfile
import unittest
import urllib.error
import urllib.parse
import urllib.request
from html.parser import HTMLParser
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]
SOURCE_ROOT = PROJECT_ROOT / "src"
DEPARTURE_ACTION_CHOICES = ("Leaving for gym", "Move to fallback", "Skip")
DEPARTURE_REASON_CHOICES = (
    "Work ran late",
    "Too tired",
    "Sick or injured",
    "Another commitment",
    "Other",
)


def application_environment() -> dict[str, str]:
    environment = os.environ.copy()
    existing_path = environment.get("PYTHONPATH")
    environment["PYTHONPATH"] = (
        f"{SOURCE_ROOT}{os.pathsep}{existing_path}" if existing_path else str(SOURCE_ROOT)
    )
    return environment


class VisibleTextParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.parts: list[str] = []
        self.hidden_depth = 0

    def handle_starttag(
        self, tag: str, attrs: list[tuple[str, str | None]]
    ) -> None:
        if tag in ("style", "script"):
            self.hidden_depth += 1

    def handle_endtag(self, tag: str) -> None:
        if tag in ("style", "script"):
            self.hidden_depth -= 1

    def handle_data(self, data: str) -> None:
        if self.hidden_depth:
            return
        stripped = data.strip()
        if stripped:
            self.parts.append(stripped)


def visible_text(view: str) -> str:
    parser = VisibleTextParser()
    parser.feed(view)
    return "\n".join(parser.parts)


class DashboardProcess:
    def __init__(self, state_file: Path, at: str):
        self.process = subprocess.Popen(
            [
                sys.executable,
                "-m",
                "exercise_tracker",
                "serve",
                "--state-file",
                str(state_file),
                "--host",
                "127.0.0.1",
                "--port",
                "0",
                "--at",
                at,
            ],
            cwd=PROJECT_ROOT,
            env=application_environment(),
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
        )
        assert self.process.stdout is not None
        startup_line = self.process.stdout.readline().strip()
        if not startup_line.startswith("Dashboard: "):
            assert self.process.stderr is not None
            error = self.process.stderr.read().strip()
            self.close()
            raise AssertionError(
                f"dashboard did not start; stdout={startup_line!r}, stderr={error!r}"
            )
        self.url = startup_line.removeprefix("Dashboard: ")

    def read(self) -> str:
        with urllib.request.urlopen(self.url, timeout=3) as response:
            return response.read().decode("utf-8")

    def submit(self, fields: dict[str, str]) -> str:
        request = urllib.request.Request(
            self.url,
            data=urllib.parse.urlencode(fields).encode("utf-8"),
            method="POST",
        )
        with urllib.request.urlopen(request, timeout=3) as response:
            return response.read().decode("utf-8")

    def close(self) -> None:
        if self.process.poll() is None:
            self.process.terminate()
            self.process.wait(timeout=3)
        if self.process.stdout is not None:
            self.process.stdout.close()
        if self.process.stderr is not None:
            self.process.stderr.close()


class LocalDashboardReminderWorkflowTest(unittest.TestCase):
    def assert_click_only(self, view: str) -> None:
        self.assertNotIn("<textarea", view.lower())
        self.assertIsNone(
            re.search(
                r'<input[^>]+type=["\'](?:text|number|search|email|url|tel)["\']',
                view,
                re.IGNORECASE,
            )
        )

    def button_choices(self, view: str, name: str) -> list[str]:
        pattern = rf'<button[^>]+name="{re.escape(name)}"[^>]+value="([^"]+)"[^>]*>([^<]+)</button>'
        return [label.strip() for _, label in re.findall(pattern, view)]

    def history_record(self, view: str, timing_context: str) -> str:
        context_position = view.index(timing_context)
        record_start = view.rfind("<li>", 0, context_position)
        record_end = view.index("</li>", context_position) + len("</li>")
        return view[record_start:record_end]

    def history_record_id(self, view: str, timing_context: str) -> str:
        record = self.history_record(view, timing_context)
        match = re.search(r'<input type="hidden" name="record_id" value="([^"]+)">', record)
        self.assertIsNotNone(match)
        assert match is not None
        return match.group(1)

    def run_reminder_check(
        self, state_file: Path, at: str, notifier: str = "stdout"
    ) -> subprocess.CompletedProcess[str]:
        return subprocess.run(
            [
                sys.executable,
                "-m",
                "exercise_tracker",
                "check-reminders",
                "--state-file",
                str(state_file),
                "--at",
                at,
                "--notifier",
                notifier,
            ],
            cwd=PROJECT_ROOT,
            env=application_environment(),
            check=True,
            capture_output=True,
            text=True,
        )

    def run_application(
        self, *arguments: str, check: bool = True
    ) -> subprocess.CompletedProcess[str]:
        return subprocess.run(
            [sys.executable, "-m", "exercise_tracker", *arguments],
            cwd=PROJECT_ROOT,
            env=application_environment(),
            check=check,
            capture_output=True,
            text=True,
        )

    def log_unscheduled_workout(
        self,
        dashboard: DashboardProcess,
        activity: str,
        duration: str,
        effort: str,
    ) -> tuple[str, str, str, str]:
        activity_view = dashboard.submit(
            {
                "manual_action": "log-workout-now",
                "workout_source": "unscheduled",
            }
        )
        duration_view = dashboard.submit(
            {
                "action": "choose-activity",
                "workout_source": "unscheduled",
                "activity": activity,
            }
        )
        effort_view = dashboard.submit(
            {
                "action": "choose-duration",
                "workout_source": "unscheduled",
                "duration": duration,
            }
        )
        completed_view = dashboard.submit(
            {
                "action": "choose-effort",
                "workout_source": "unscheduled",
                "effort": effort,
            }
        )
        return activity_view, duration_view, effort_view, completed_view

    def test_fresh_plan_survives_dashboard_restart_and_reminds_while_closed(self):
        with tempfile.TemporaryDirectory() as temporary_directory:
            state_file = Path(temporary_directory) / "state.json"
            monday_morning = "2026-08-10T09:00:00-04:00"

            dashboard = DashboardProcess(state_file, monday_morning)
            first_view = dashboard.read()
            dashboard.close()

            self.assertIn("0 of 3 completed", first_view)
            self.assertIn("Next departure", first_view)
            self.assertIn("Monday, August 10 at 4:00 PM", first_view)
            for expected_slot in (
                "<strong>Monday</strong><span>4:00 PM</span>",
                "<strong>Wednesday</strong><span>4:00 PM</span>",
                "<strong>Friday</strong><span>4:00 PM</span>",
                "<strong>Saturday</strong><span>4:00 PM</span>",
                "<strong>Sunday</strong><span>4:00 PM</span>",
            ):
                self.assertIn(expected_slot, first_view)
            self.assertLess(
                first_view.index("<strong>Monday</strong>"),
                first_view.index("<strong>Wednesday</strong>"),
            )
            self.assertLess(
                first_view.index("<strong>Wednesday</strong>"),
                first_view.index("<strong>Friday</strong>"),
            )
            self.assertIn("Fallback availability", first_view)
            self.assertLess(
                first_view.index("<strong>Saturday</strong>"),
                first_view.index("<strong>Sunday</strong>"),
            )
            self.assertGreaterEqual(first_view.count("Available"), 2)
            self.assertNotIn("streak", first_view.lower())

            reopened_dashboard = DashboardProcess(state_file, monday_morning)
            reopened_view = reopened_dashboard.read()
            reopened_dashboard.close()
            self.assertEqual(first_view, reopened_view)

            reminder = self.run_reminder_check(
                state_file, "2026-08-10T16:00:00-04:00"
            )

            self.assertEqual(
                reminder.stdout.strip().splitlines(),
                [
                    "Exercise Habit Tracker",
                    "Time to leave for the gym.",
                    "Monday, August 10 at 4:00 PM",
                ],
            )

            duplicate_check = self.run_reminder_check(
                state_file, "2026-08-10T16:00:00-04:00"
            )
            self.assertEqual("", duplicate_check.stdout)

            delayed_state_file = Path(temporary_directory) / "delayed-state.json"
            delayed_dashboard = DashboardProcess(delayed_state_file, monday_morning)
            delayed_dashboard.close()
            delayed_reminder = self.run_reminder_check(
                delayed_state_file, "2026-08-10T18:00:00-04:00"
            )
            self.assertIn("Time to leave for the gym.", delayed_reminder.stdout)

            if os.environ.get("EXERCISE_TRACKER_MACOS_ACCEPTANCE") == "1":
                platform_state_file = Path(temporary_directory) / "platform-state.json"
                platform_dashboard = DashboardProcess(platform_state_file, monday_morning)
                platform_dashboard.close()
                platform_reminder = self.run_reminder_check(
                    platform_state_file,
                    "2026-08-10T16:00:00-04:00",
                    notifier="macos",
                )
                self.assertEqual("", platform_reminder.stdout)

    def test_departure_response_or_silence_drives_exactly_one_next_prompt(self):
        with tempfile.TemporaryDirectory() as temporary_directory:
            leaving_state = Path(temporary_directory) / "leaving.json"
            monday_departure = "2026-08-10T16:00:00-04:00"

            departure_reminder = self.run_reminder_check(
                leaving_state, monday_departure
            )
            self.assertIn("Time to leave for the gym.", departure_reminder.stdout)

            dashboard = DashboardProcess(leaving_state, monday_departure)
            departure_prompt = dashboard.read()
            self.assertIn("Leaving for gym", departure_prompt)
            after_leaving = dashboard.submit(
                {
                    "action": "leaving-for-gym",
                    "slot_id": "2026-08-10-primary-1",
                }
            )
            dashboard.close()

            self.assertIn("Leaving for gym confirmed", after_leaving)
            self.assertIn("Record workout reminder at 5:30 PM", after_leaving)

            ignored_follow_up = self.run_reminder_check(
                leaving_state, "2026-08-10T16:15:00-04:00"
            )
            self.assertEqual("", ignored_follow_up.stdout)

            workout_prompt = self.run_reminder_check(
                leaving_state, "2026-08-10T17:30:00-04:00"
            )
            self.assertEqual(
                workout_prompt.stdout.strip().splitlines(),
                [
                    "Exercise Habit Tracker",
                    "Record workout.",
                    "Leaving confirmed Monday, August 10 at 4:00 PM",
                ],
            )
            repeated_workout_prompt = self.run_reminder_check(
                leaving_state, "2026-08-10T18:00:00-04:00"
            )
            self.assertEqual("", repeated_workout_prompt.stdout)

            silent_state = Path(temporary_directory) / "silent.json"
            self.run_reminder_check(silent_state, monday_departure)
            before_follow_up = self.run_reminder_check(
                silent_state, "2026-08-10T16:14:00-04:00"
            )
            self.assertEqual("", before_follow_up.stdout)

            follow_up = self.run_reminder_check(
                silent_state, "2026-08-10T16:15:00-04:00"
            )
            self.assertEqual(
                follow_up.stdout.strip().splitlines(),
                [
                    "Exercise Habit Tracker",
                    "A gentle follow-up: are you leaving for the gym?",
                    "Monday, August 10 at 4:00 PM",
                ],
            )
            no_more_nagging = self.run_reminder_check(
                silent_state, "2026-08-10T18:00:00-04:00"
            )
            self.assertEqual("", no_more_nagging.stdout)

            unresolved_dashboard = DashboardProcess(
                silent_state, "2026-08-10T18:00:00-04:00"
            )
            unresolved_view = unresolved_dashboard.read()
            unresolved_dashboard.close()
            self.assertIn("Unresolved — no response", unresolved_view)
            self.assertNotIn("Skipped", unresolved_view)

    def test_four_tap_workout_record_uses_presets_and_persists_weekly_progress(self):
        with tempfile.TemporaryDirectory() as temporary_directory:
            state_file = Path(temporary_directory) / "workouts.json"

            self.run_reminder_check(state_file, "2026-08-10T16:00:00-04:00")
            departure_dashboard = DashboardProcess(
                state_file, "2026-08-10T16:00:00-04:00"
            )
            departure_dashboard.submit(
                {
                    "action": "leaving-for-gym",
                    "slot_id": "2026-08-10-primary-1",
                }
            )
            departure_dashboard.close()

            before_prompt = self.run_reminder_check(
                state_file, "2026-08-10T17:29:00-04:00"
            )
            self.assertEqual("", before_prompt.stdout)
            workout_prompt = self.run_reminder_check(
                state_file, "2026-08-10T17:30:00-04:00"
            )
            self.assertEqual(
                workout_prompt.stdout.strip().splitlines(),
                [
                    "Exercise Habit Tracker",
                    "Record workout.",
                    "Leaving confirmed Monday, August 10 at 4:00 PM",
                ],
            )
            duplicate_prompt = self.run_reminder_check(
                state_file, "2026-08-10T18:00:00-04:00"
            )
            self.assertEqual("", duplicate_prompt.stdout)

            workout_dashboard = DashboardProcess(
                state_file, "2026-08-10T17:30:00-04:00"
            )
            done_view = workout_dashboard.read()
            self.assertIn("Record workout", done_view)
            self.assertEqual(["Done"], self.button_choices(done_view, "action"))
            self.assert_click_only(done_view)

            activity_view = workout_dashboard.submit(
                {
                    "action": "start-workout-record",
                    "slot_id": "2026-08-10-primary-1",
                }
            )
            self.assertEqual(
                ["Elliptical", "Weight training", "Other exercise"],
                self.button_choices(activity_view, "activity"),
            )
            self.assert_click_only(activity_view)

            duration_view = workout_dashboard.submit(
                {
                    "action": "choose-activity",
                    "slot_id": "2026-08-10-primary-1",
                    "activity": "Elliptical",
                }
            )
            self.assertEqual(
                ["Under 20", "20", "30", "45", "60+ minutes"],
                self.button_choices(duration_view, "duration"),
            )
            self.assert_click_only(duration_view)

            effort_view = workout_dashboard.submit(
                {
                    "action": "choose-duration",
                    "slot_id": "2026-08-10-primary-1",
                    "duration": "20",
                }
            )
            self.assertIn("How strenuous did this workout feel?", effort_view)
            self.assertIn("Harder is not better", effort_view)
            self.assertEqual(
                ["Very easy", "Easy", "Moderate", "Hard", "Very hard"],
                self.button_choices(effort_view, "effort"),
            )
            self.assert_click_only(effort_view)

            qualifying_view = workout_dashboard.submit(
                {
                    "action": "choose-effort",
                    "slot_id": "2026-08-10-primary-1",
                    "effort": "Moderate",
                }
            )
            workout_dashboard.close()
            self.assertIn("1 of 3 completed", qualifying_view)
            self.assertIn("Counts toward weekly progress", qualifying_view)
            self.assertIn("Elliptical", qualifying_view)
            self.assertIn("20", qualifying_view)
            self.assertIn("Moderate", qualifying_view)

            self.run_reminder_check(state_file, "2026-08-12T16:00:00-04:00")
            short_dashboard = DashboardProcess(
                state_file, "2026-08-12T16:00:00-04:00"
            )
            short_dashboard.submit(
                {
                    "action": "leaving-for-gym",
                    "slot_id": "2026-08-10-primary-2",
                }
            )
            short_dashboard.close()
            self.run_reminder_check(state_file, "2026-08-12T17:30:00-04:00")

            short_dashboard = DashboardProcess(
                state_file, "2026-08-12T17:30:00-04:00"
            )
            short_dashboard.submit(
                {
                    "action": "start-workout-record",
                    "slot_id": "2026-08-10-primary-2",
                }
            )
            short_dashboard.submit(
                {
                    "action": "choose-activity",
                    "slot_id": "2026-08-10-primary-2",
                    "activity": "Other exercise",
                }
            )
            short_dashboard.submit(
                {
                    "action": "choose-duration",
                    "slot_id": "2026-08-10-primary-2",
                    "duration": "Under 20",
                }
            )
            short_view = short_dashboard.submit(
                {
                    "action": "choose-effort",
                    "slot_id": "2026-08-10-primary-2",
                    "effort": "Very easy",
                }
            )
            short_dashboard.close()

            self.assertIn("1 of 3 completed", short_view)
            self.assertIn(
                "Short effort — does not count toward weekly progress", short_view
            )
            self.assertIn("Other exercise", short_view)
            self.assertIn("Under 20", short_view)
            self.assertIn("Very easy", short_view)

            reopened_dashboard = DashboardProcess(
                state_file, "2026-08-12T18:00:00-04:00"
            )
            reopened_view = reopened_dashboard.read()
            reopened_dashboard.close()
            self.assertIn("1 of 3 completed", reopened_view)
            self.assertIn("Elliptical", reopened_view)
            self.assertIn("Other exercise", reopened_view)
            self.assertIn("Counts toward weekly progress", reopened_view)
            self.assertIn(
                "Short effort — does not count toward weekly progress", reopened_view
            )

    def test_weekly_goal_counts_mixed_workouts_suppresses_reminders_and_allows_extras(self):
        with tempfile.TemporaryDirectory() as temporary_directory:
            state_file = Path(temporary_directory) / "weekly-goal.json"
            dashboard = DashboardProcess(
                state_file, "2026-08-10T09:00:00-04:00"
            )
            self.addCleanup(dashboard.close)

            ready_view = dashboard.read()
            self.assertEqual(
                ["Log workout now"], self.button_choices(ready_view, "manual_action")
            )
            self.assert_click_only(ready_view)

            activity_view, duration_view, effort_view, completed_view = (
                self.log_unscheduled_workout(
                    dashboard, "Weight training", "30", "Moderate"
                )
            )
            self.assertEqual(
                ["Elliptical", "Weight training", "Other exercise"],
                self.button_choices(activity_view, "activity"),
            )
            self.assertEqual(
                ["Under 20", "20", "30", "45", "60+ minutes"],
                self.button_choices(duration_view, "duration"),
            )
            self.assertEqual(
                ["Very easy", "Easy", "Moderate", "Hard", "Very hard"],
                self.button_choices(effort_view, "effort"),
            )
            dashboard.close()

            self.assertIn("1 of 3 completed", completed_view)
            self.assertIn("Weight training", completed_view)
            self.assertIn("Counts toward weekly progress", completed_view)
            self.assert_click_only(completed_view)

            self.run_reminder_check(state_file, "2026-08-10T16:00:00-04:00")
            primary_dashboard = DashboardProcess(
                state_file, "2026-08-10T16:00:00-04:00"
            )
            primary_dashboard.submit(
                {
                    "action": "leaving-for-gym",
                    "slot_id": "2026-08-10-primary-1",
                }
            )
            primary_dashboard.close()
            self.run_reminder_check(state_file, "2026-08-10T17:30:00-04:00")
            primary_dashboard = DashboardProcess(
                state_file, "2026-08-10T17:30:00-04:00"
            )
            primary_dashboard.submit(
                {
                    "action": "start-workout-record",
                    "slot_id": "2026-08-10-primary-1",
                }
            )
            primary_dashboard.submit(
                {
                    "action": "choose-activity",
                    "slot_id": "2026-08-10-primary-1",
                    "activity": "Elliptical",
                }
            )
            primary_dashboard.submit(
                {
                    "action": "choose-duration",
                    "slot_id": "2026-08-10-primary-1",
                    "duration": "20",
                }
            )
            primary_view = primary_dashboard.submit(
                {
                    "action": "choose-effort",
                    "slot_id": "2026-08-10-primary-1",
                    "effort": "Moderate",
                }
            )
            primary_dashboard.close()
            self.assertIn("2 of 3 completed", primary_view)

            short_dashboard = DashboardProcess(
                state_file, "2026-08-11T09:00:00-04:00"
            )
            _, _, _, short_view = self.log_unscheduled_workout(
                short_dashboard, "Other exercise", "Under 20", "Easy"
            )
            short_dashboard.close()

            self.assertIn("2 of 3 completed", short_view)
            self.assertIn("Other exercise", short_view)
            self.assertIn(
                "Short effort — does not count toward weekly progress", short_view
            )

            for departure_at, slot_id, fallback_day in (
                (
                    "2026-08-12T16:00:00-04:00",
                    "2026-08-10-primary-2",
                    "Saturday",
                ),
                (
                    "2026-08-14T16:00:00-04:00",
                    "2026-08-10-primary-3",
                    "Sunday",
                ),
            ):
                self.run_reminder_check(state_file, departure_at)
                recovery_dashboard = DashboardProcess(state_file, departure_at)
                recovery_dashboard.submit(
                    {
                        "action": "move-to-fallback",
                        "slot_id": slot_id,
                    }
                )
                assignment_view = recovery_dashboard.submit(
                    {
                        "action": "confirm-departure-decision",
                        "slot_id": slot_id,
                        "reason": "Another commitment",
                    }
                )
                recovery_dashboard.close()
                self.assertIn(f"Moved to {fallback_day}", assignment_view)

            saturday_departure = self.run_reminder_check(
                state_file, "2026-08-15T16:00:00-04:00"
            )
            self.assertIn("Time to leave for the gym.", saturday_departure.stdout)
            fallback_dashboard = DashboardProcess(
                state_file, "2026-08-15T16:00:00-04:00"
            )
            fallback_dashboard.submit(
                {
                    "action": "leaving-for-gym",
                    "slot_id": "2026-08-10-fallback-1",
                }
            )
            fallback_dashboard.close()
            self.run_reminder_check(state_file, "2026-08-15T17:30:00-04:00")
            fallback_dashboard = DashboardProcess(
                state_file, "2026-08-15T17:30:00-04:00"
            )
            fallback_dashboard.submit(
                {
                    "action": "start-workout-record",
                    "slot_id": "2026-08-10-fallback-1",
                }
            )
            fallback_dashboard.submit(
                {
                    "action": "choose-activity",
                    "slot_id": "2026-08-10-fallback-1",
                    "activity": "Weight training",
                }
            )
            fallback_dashboard.submit(
                {
                    "action": "choose-duration",
                    "slot_id": "2026-08-10-fallback-1",
                    "duration": "45",
                }
            )
            success_view = fallback_dashboard.submit(
                {
                    "action": "choose-effort",
                    "slot_id": "2026-08-10-fallback-1",
                    "effort": "Hard",
                }
            )
            fallback_dashboard.close()

            self.assertIn("3 of 3 completed", success_view)
            self.assertIn("Weekly goal complete", success_view)

            suppressed_fallback = self.run_reminder_check(
                state_file, "2026-08-16T16:00:00-04:00"
            )
            self.assertEqual("", suppressed_fallback.stdout)

            extra_dashboard = DashboardProcess(
                state_file, "2026-08-16T17:00:00-04:00"
            )
            optional_view = extra_dashboard.read()
            self.assertEqual([], self.button_choices(optional_view, "action"))
            self.assertEqual(
                ["Log workout now"],
                self.button_choices(optional_view, "manual_action"),
            )
            self.assertIn(
                "Weekly goal complete — optional workouts welcome", optional_view
            )
            _, _, _, extra_view = self.log_unscheduled_workout(
                extra_dashboard, "Elliptical", "60+ minutes", "Very hard"
            )
            extra_dashboard.close()
            self.assertIn("4 of 3 completed", extra_view)
            self.assertIn("Weekly goal complete", extra_view)
            self.assertIn("60+ minutes", extra_view)
            self.assertIn(
                "Unscheduled workout · Sunday, August 16 at 5:00 PM", extra_view
            )
            self.assertIn(
                "Fallback workout · Saturday, August 15 at 5:30 PM", extra_view
            )
            self.assertIn(
                "Unscheduled workout · Tuesday, August 11 at 9:00 AM", extra_view
            )
            self.assertIn(
                "Primary workout · Monday, August 10 at 5:30 PM", extra_view
            )
            self.assertLess(
                extra_view.index("Sunday, August 16 at 5:00 PM"),
                extra_view.index("Saturday, August 15 at 5:30 PM"),
            )
            self.assertLess(
                extra_view.index("Saturday, August 15 at 5:30 PM"),
                extra_view.index("Tuesday, August 11 at 9:00 AM"),
            )
            self.assertNotIn("chart", extra_view.lower())
            self.assertNotIn("trend", extra_view.lower())
            self.assertNotIn("coaching", extra_view.lower())
            self.assertNotIn("streak", extra_view.lower())

    def test_legacy_in_progress_workout_resumes_after_source_migration(self):
        with tempfile.TemporaryDirectory() as temporary_directory:
            state_file = Path(temporary_directory) / "legacy-workout.json"
            self.run_reminder_check(state_file, "2026-08-10T16:00:00-04:00")
            dashboard = DashboardProcess(state_file, "2026-08-10T16:00:00-04:00")
            dashboard.submit(
                {
                    "action": "leaving-for-gym",
                    "slot_id": "2026-08-10-primary-1",
                }
            )
            dashboard.close()
            self.run_reminder_check(state_file, "2026-08-10T17:30:00-04:00")
            dashboard = DashboardProcess(state_file, "2026-08-10T17:30:00-04:00")
            dashboard.submit(
                {
                    "action": "start-workout-record",
                    "slot_id": "2026-08-10-primary-1",
                }
            )
            dashboard.submit(
                {
                    "action": "choose-activity",
                    "slot_id": "2026-08-10-primary-1",
                    "activity": "Elliptical",
                }
            )
            dashboard.close()

            legacy_state = json.loads(state_file.read_text(encoding="utf-8"))
            legacy_state["schema_version"] = 4
            del legacy_state["workout_draft"]["source"]
            state_file.write_text(
                json.dumps(legacy_state, indent=2, sort_keys=True) + "\n",
                encoding="utf-8",
            )

            resumed_dashboard = DashboardProcess(
                state_file, "2026-08-10T17:30:00-04:00"
            )
            resumed_view = resumed_dashboard.read()
            self.assertEqual(
                ["Under 20", "20", "30", "45", "60+ minutes"],
                self.button_choices(resumed_view, "duration"),
            )
            resumed_dashboard.submit(
                {
                    "action": "choose-duration",
                    "slot_id": "2026-08-10-primary-1",
                    "duration": "20",
                }
            )
            completed_view = resumed_dashboard.submit(
                {
                    "action": "choose-effort",
                    "slot_id": "2026-08-10-primary-1",
                    "effort": "Moderate",
                }
            )
            resumed_dashboard.close()
            self.assertIn("1 of 3 completed", completed_view)
            self.assertIn("Elliptical", completed_view)

    def test_goal_suppresses_remaining_primary_and_assigned_fallback_reminders(self):
        with tempfile.TemporaryDirectory() as temporary_directory:
            suppression_state = Path(temporary_directory) / "suppressed.json"
            self.run_reminder_check(
                suppression_state, "2026-08-10T16:00:00-04:00"
            )
            suppression_dashboard = DashboardProcess(
                suppression_state, "2026-08-10T16:00:00-04:00"
            )
            suppression_dashboard.submit(
                {
                    "action": "move-to-fallback",
                    "slot_id": "2026-08-10-primary-1",
                }
            )
            suppression_dashboard.submit(
                {
                    "action": "confirm-departure-decision",
                    "slot_id": "2026-08-10-primary-1",
                    "reason": "Work ran late",
                }
            )
            suppression_dashboard.close()

            for effort in ("Easy", "Moderate", "Hard"):
                suppression_dashboard = DashboardProcess(
                    suppression_state, "2026-08-10T17:00:00-04:00"
                )
                self.log_unscheduled_workout(
                    suppression_dashboard, "Other exercise", "20", effort
                )
                suppression_dashboard.close()

            suppressed_primary = self.run_reminder_check(
                suppression_state, "2026-08-12T16:00:00-04:00"
            )
            suppressed_assigned_fallback = self.run_reminder_check(
                suppression_state, "2026-08-15T16:00:00-04:00"
            )
            self.assertEqual("", suppressed_primary.stdout)
            self.assertEqual("", suppressed_assigned_fallback.stdout)

    def test_departure_can_move_to_ordered_fallbacks_or_skip_with_preset_reasons(self):
        with tempfile.TemporaryDirectory() as temporary_directory:
            state_file = Path(temporary_directory) / "fallbacks.json"
            monday_departure = "2026-08-10T16:00:00-04:00"

            self.run_reminder_check(state_file, monday_departure)
            dashboard = DashboardProcess(state_file, monday_departure)
            self.addCleanup(dashboard.close)
            departure_prompt = dashboard.read()

            self.assertEqual(
                list(DEPARTURE_ACTION_CHOICES),
                self.button_choices(departure_prompt, "action"),
            )
            reason_prompt = dashboard.submit(
                {
                    "action": "move-to-fallback",
                    "slot_id": "2026-08-10-primary-1",
                }
            )

            self.assertEqual(
                list(DEPARTURE_REASON_CHOICES),
                self.button_choices(reason_prompt, "reason"),
            )
            self.assert_click_only(reason_prompt)
            with self.assertRaises(urllib.error.HTTPError) as missing_move_reason:
                dashboard.submit(
                    {
                        "action": "confirm-departure-decision",
                        "slot_id": "2026-08-10-primary-1",
                    }
                )
            self.assertEqual(409, missing_move_reason.exception.code)

            saturday_assignment = dashboard.submit(
                {
                    "action": "confirm-departure-decision",
                    "slot_id": "2026-08-10-primary-1",
                    "reason": "Work ran late",
                }
            )
            dashboard.close()

            self.assertIn("Moved to Saturday · Work ran late", saturday_assignment)
            self.assertIn("Assigned from Monday", saturday_assignment)
            self.assertIn("1 fallback slot available", saturday_assignment)

            self.run_reminder_check(state_file, "2026-08-12T16:00:00-04:00")
            dashboard = DashboardProcess(
                state_file, "2026-08-12T16:00:00-04:00"
            )
            dashboard.submit(
                {
                    "action": "move-to-fallback",
                    "slot_id": "2026-08-10-primary-2",
                }
            )
            sunday_assignment = dashboard.submit(
                {
                    "action": "confirm-departure-decision",
                    "slot_id": "2026-08-10-primary-2",
                    "reason": "Too tired",
                }
            )
            dashboard.close()

            self.assertIn("Moved to Sunday · Too tired", sunday_assignment)
            self.assertIn("Assigned from Wednesday", sunday_assignment)
            self.assertIn("No fallback slots available", sunday_assignment)

            self.run_reminder_check(state_file, "2026-08-14T16:00:00-04:00")
            dashboard = DashboardProcess(
                state_file, "2026-08-14T16:00:00-04:00"
            )
            exhausted_prompt = dashboard.read()
            self.assertIn("No fallback slots available", exhausted_prompt)
            self.assertEqual(
                list(DEPARTURE_ACTION_CHOICES),
                self.button_choices(exhausted_prompt, "action"),
            )
            with self.assertRaises(urllib.error.HTTPError) as exhausted_move:
                dashboard.submit(
                    {
                        "action": "move-to-fallback",
                        "slot_id": "2026-08-10-primary-3",
                    }
                )
            self.assertEqual(409, exhausted_move.exception.code)

            skip_reasons = dashboard.submit(
                {
                    "action": "skip",
                    "slot_id": "2026-08-10-primary-3",
                }
            )
            self.assertEqual(
                list(DEPARTURE_REASON_CHOICES),
                self.button_choices(skip_reasons, "reason"),
            )
            with self.assertRaises(urllib.error.HTTPError) as missing_skip_reason:
                dashboard.submit(
                    {
                        "action": "confirm-departure-decision",
                        "slot_id": "2026-08-10-primary-3",
                    }
                )
            self.assertEqual(409, missing_skip_reason.exception.code)
            skipped = dashboard.submit(
                {
                    "action": "confirm-departure-decision",
                    "slot_id": "2026-08-10-primary-3",
                    "reason": "Sick or injured",
                }
            )
            dashboard.close()

            self.assertIn("Skipped · Sick or injured", skipped)
            skipped_follow_up = self.run_reminder_check(
                state_file, "2026-08-14T16:15:00-04:00"
            )
            self.assertEqual("", skipped_follow_up.stdout)

            fallback_departure = self.run_reminder_check(
                state_file, "2026-08-15T16:00:00-04:00"
            )
            self.assertEqual(
                [
                    "Exercise Habit Tracker",
                    "Time to leave for the gym.",
                    "Saturday, August 15 at 4:00 PM",
                ],
                fallback_departure.stdout.strip().splitlines(),
            )
            fallback_dashboard = DashboardProcess(
                state_file, "2026-08-15T16:00:00-04:00"
            )
            fallback_prompt = fallback_dashboard.read()
            self.assertEqual(
                list(DEPARTURE_ACTION_CHOICES),
                self.button_choices(fallback_prompt, "action"),
            )
            fallback_confirmation = fallback_dashboard.submit(
                {
                    "action": "leaving-for-gym",
                    "slot_id": "2026-08-10-fallback-1",
                }
            )
            fallback_dashboard.close()
            self.assertIn("Leaving for gym confirmed", fallback_confirmation)
            self.assertIn(
                "Record workout reminder at 5:30 PM", fallback_confirmation
            )

            fallback_workout_prompt = self.run_reminder_check(
                state_file, "2026-08-15T17:30:00-04:00"
            )
            self.assertEqual(
                [
                    "Exercise Habit Tracker",
                    "Record workout.",
                    "Leaving confirmed Saturday, August 15 at 4:00 PM",
                ],
                fallback_workout_prompt.stdout.strip().splitlines(),
            )
            fallback_dashboard = DashboardProcess(
                state_file, "2026-08-15T17:30:00-04:00"
            )
            done_view = fallback_dashboard.read()
            self.assertEqual(["Done"], self.button_choices(done_view, "action"))
            activity_view = fallback_dashboard.submit(
                {
                    "action": "start-workout-record",
                    "slot_id": "2026-08-10-fallback-1",
                }
            )
            self.assertEqual(
                ["Elliptical", "Weight training", "Other exercise"],
                self.button_choices(activity_view, "activity"),
            )
            duration_view = fallback_dashboard.submit(
                {
                    "action": "choose-activity",
                    "slot_id": "2026-08-10-fallback-1",
                    "activity": "Weight training",
                }
            )
            self.assertEqual(
                ["Under 20", "20", "30", "45", "60+ minutes"],
                self.button_choices(duration_view, "duration"),
            )
            effort_view = fallback_dashboard.submit(
                {
                    "action": "choose-duration",
                    "slot_id": "2026-08-10-fallback-1",
                    "duration": "30",
                }
            )
            self.assertEqual(
                ["Very easy", "Easy", "Moderate", "Hard", "Very hard"],
                self.button_choices(effort_view, "effort"),
            )
            fallback_completion = fallback_dashboard.submit(
                {
                    "action": "choose-effort",
                    "slot_id": "2026-08-10-fallback-1",
                    "effort": "Hard",
                }
            )
            fallback_dashboard.close()
            self.assertIn("1 of 3 completed", fallback_completion)
            self.assertIn("Weight training", fallback_completion)
            self.assertIn("Counts toward weekly progress", fallback_completion)

            for outcome, result_label in (
                ("move-to-fallback", "Moved to Saturday"),
                ("skip", "Skipped"),
            ):
                for index, reason in enumerate(DEPARTURE_REASON_CHOICES):
                    reason_state = (
                        Path(temporary_directory) / f"{outcome}-{index}.json"
                    )
                    self.run_reminder_check(reason_state, monday_departure)
                    reason_dashboard = DashboardProcess(
                        reason_state, monday_departure
                    )
                    reason_dashboard.submit(
                        {
                            "action": outcome,
                            "slot_id": "2026-08-10-primary-1",
                        }
                    )
                    reason_view = reason_dashboard.submit(
                        {
                            "action": "confirm-departure-decision",
                            "slot_id": "2026-08-10-primary-1",
                            "reason": reason,
                        }
                    )
                    reason_dashboard.close()
                    self.assertIn(f"{result_label} · {reason}", reason_view)
                    self.assert_click_only(reason_view)

    def test_recovery_uses_only_fallbacks_that_have_not_passed(self):
        with tempfile.TemporaryDirectory() as temporary_directory:
            state_file = Path(temporary_directory) / "late-recovery.json"

            self.run_reminder_check(state_file, "2026-08-14T16:00:00-04:00")
            dashboard = DashboardProcess(
                state_file, "2026-08-15T17:00:00-04:00"
            )
            dashboard.submit(
                {
                    "action": "move-to-fallback",
                    "slot_id": "2026-08-10-primary-3",
                }
            )
            late_assignment = dashboard.submit(
                {
                    "action": "confirm-departure-decision",
                    "slot_id": "2026-08-10-primary-3",
                    "reason": "Another commitment",
                }
            )
            dashboard.close()

            self.assertIn("Moved to Sunday · Another commitment", late_assignment)
            self.assertIn("Saturday</strong><span>4:00 PM</span>", late_assignment)
            self.assertIn("No longer available", late_assignment)
            self.assertIn("No fallback slots available", late_assignment)

            exhausted_state = Path(temporary_directory) / "expired-fallbacks.json"
            self.run_reminder_check(exhausted_state, "2026-08-14T16:00:00-04:00")
            exhausted_dashboard = DashboardProcess(
                exhausted_state, "2026-08-16T17:00:00-04:00"
            )
            self.addCleanup(exhausted_dashboard.close)
            exhausted_view = exhausted_dashboard.read()
            self.assertIn("No fallback slots available", exhausted_view)
            self.assertEqual(2, exhausted_view.count("No longer available"))
            with self.assertRaises(urllib.error.HTTPError) as expired_move:
                exhausted_dashboard.submit(
                    {
                        "action": "move-to-fallback",
                        "slot_id": "2026-08-10-primary-3",
                    }
                )
            self.assertEqual(409, expired_move.exception.code)
            exhausted_dashboard.close()

            abandoned_state = Path(temporary_directory) / "expired-decision.json"
            self.run_reminder_check(abandoned_state, "2026-08-14T16:00:00-04:00")
            abandoned_dashboard = DashboardProcess(
                abandoned_state, "2026-08-14T16:00:00-04:00"
            )
            abandoned_reason_prompt = abandoned_dashboard.submit(
                {
                    "action": "move-to-fallback",
                    "slot_id": "2026-08-10-primary-3",
                }
            )
            abandoned_dashboard.close()
            self.assertIn("Why are you moving this workout?", abandoned_reason_prompt)

            recovered_dashboard = DashboardProcess(
                abandoned_state, "2026-08-16T17:00:00-04:00"
            )
            self.addCleanup(recovered_dashboard.close)
            recovered_prompt = recovered_dashboard.read()
            self.assertNotIn("Why are you moving this workout?", recovered_prompt)
            self.assertIn("No fallback slots available", recovered_prompt)
            self.assertEqual(
                list(DEPARTURE_ACTION_CHOICES),
                self.button_choices(recovered_prompt, "action"),
            )
            recovered_dashboard.close()

    def test_abandoned_reason_choice_does_not_block_the_next_week(self):
        with tempfile.TemporaryDirectory() as temporary_directory:
            state_file = Path(temporary_directory) / "abandoned-reason.json"

            self.run_reminder_check(state_file, "2026-08-14T16:00:00-04:00")
            dashboard = DashboardProcess(
                state_file, "2026-08-16T17:00:00-04:00"
            )
            abandoned_reason_prompt = dashboard.submit(
                {
                    "action": "skip",
                    "slot_id": "2026-08-10-primary-3",
                }
            )
            dashboard.close()
            self.assertIn("Why are you skipping this workout?", abandoned_reason_prompt)

            next_week_dashboard = DashboardProcess(
                state_file, "2026-08-17T16:00:00-04:00"
            )
            self.addCleanup(next_week_dashboard.close)
            next_week_prompt = next_week_dashboard.read()
            self.assertNotIn("Why are you skipping this workout?", next_week_prompt)
            self.assertEqual(
                list(DEPARTURE_ACTION_CHOICES),
                self.button_choices(next_week_prompt, "action"),
            )
            leaving_confirmation = next_week_dashboard.submit(
                {
                    "action": "leaving-for-gym",
                    "slot_id": "2026-08-17-primary-1",
                }
            )
            next_week_dashboard.close()
            self.assertIn("Leaving for gym confirmed", leaving_confirmation)

    def test_week_rollover_closes_unanswered_slots_and_repeats_the_plan(self):
        with tempfile.TemporaryDirectory() as temporary_directory:
            state_file = Path(temporary_directory) / "week-rollover.json"

            for date in (
                "2026-08-10",
                "2026-08-12",
                "2026-08-14",
            ):
                self.run_reminder_check(state_file, f"{date}T16:00:00-04:00")
                self.run_reminder_check(state_file, f"{date}T16:15:00-04:00")

            sunday_dashboard = DashboardProcess(
                state_file, "2026-08-16T23:59:59-04:00"
            )
            sunday_view = sunday_dashboard.read()
            sunday_dashboard.close()
            self.assertEqual(
                3, sunday_view.count('class="response-status unresolved"')
            )
            self.assertNotIn("Missed — no response", sunday_view)

            monday_dashboard = DashboardProcess(
                state_file, "2026-08-17T09:00:00-04:00"
            )
            monday_view = monday_dashboard.read()
            monday_dashboard.close()
            self.assertIn("0 of 3 completed", monday_view)
            self.assertIn(
                "Week of Monday, August 17 – Sunday, August 23", monday_view
            )
            self.assertIn("Monday, August 17 at 4:00 PM", monday_view)
            self.assertIn("Previous week outcomes", monday_view)
            self.assertEqual(3, monday_view.count('class="response-status missed"'))
            self.assertNotIn("Unresolved — no response", monday_view)
            self.assertNotIn("Confirm weekly plan", monday_view)

            repeated_plan_reminder = self.run_reminder_check(
                state_file, "2026-08-17T16:00:00-04:00"
            )
            self.assertEqual(
                [
                    "Exercise Habit Tracker",
                    "Time to leave for the gym.",
                    "Monday, August 17 at 4:00 PM",
                ],
                repeated_plan_reminder.stdout.strip().splitlines(),
            )

    def test_rollover_preserves_completed_short_moved_skipped_and_missed_outcomes(self):
        with tempfile.TemporaryDirectory() as temporary_directory:
            state_file = Path(temporary_directory) / "outcome-history.json"

            self.run_reminder_check(state_file, "2026-08-10T16:00:00-04:00")
            dashboard = DashboardProcess(state_file, "2026-08-10T16:00:00-04:00")
            dashboard.submit(
                {
                    "action": "leaving-for-gym",
                    "slot_id": "2026-08-10-primary-1",
                }
            )
            dashboard.close()
            self.run_reminder_check(state_file, "2026-08-10T17:30:00-04:00")
            dashboard = DashboardProcess(state_file, "2026-08-10T17:30:00-04:00")
            dashboard.submit(
                {
                    "action": "start-workout-record",
                    "slot_id": "2026-08-10-primary-1",
                }
            )
            dashboard.submit(
                {
                    "action": "choose-activity",
                    "slot_id": "2026-08-10-primary-1",
                    "activity": "Elliptical",
                }
            )
            dashboard.submit(
                {
                    "action": "choose-duration",
                    "slot_id": "2026-08-10-primary-1",
                    "duration": "20",
                }
            )
            dashboard.submit(
                {
                    "action": "choose-effort",
                    "slot_id": "2026-08-10-primary-1",
                    "effort": "Moderate",
                }
            )
            dashboard.close()

            short_dashboard = DashboardProcess(
                state_file, "2026-08-11T09:00:00-04:00"
            )
            self.log_unscheduled_workout(
                short_dashboard, "Other exercise", "Under 20", "Easy"
            )
            short_dashboard.close()

            self.run_reminder_check(state_file, "2026-08-12T16:00:00-04:00")
            moved_dashboard = DashboardProcess(
                state_file, "2026-08-12T16:00:00-04:00"
            )
            moved_dashboard.submit(
                {
                    "action": "move-to-fallback",
                    "slot_id": "2026-08-10-primary-2",
                }
            )
            moved_dashboard.submit(
                {
                    "action": "confirm-departure-decision",
                    "slot_id": "2026-08-10-primary-2",
                    "reason": "Work ran late",
                }
            )
            moved_dashboard.close()

            self.run_reminder_check(state_file, "2026-08-14T16:00:00-04:00")
            self.run_reminder_check(state_file, "2026-08-14T16:15:00-04:00")

            self.run_reminder_check(state_file, "2026-08-15T16:00:00-04:00")
            skipped_dashboard = DashboardProcess(
                state_file, "2026-08-15T16:00:00-04:00"
            )
            skipped_dashboard.submit(
                {
                    "action": "skip",
                    "slot_id": "2026-08-10-fallback-1",
                }
            )
            skipped_dashboard.submit(
                {
                    "action": "confirm-departure-decision",
                    "slot_id": "2026-08-10-fallback-1",
                    "reason": "Too tired",
                }
            )
            skipped_dashboard.close()

            monday_dashboard = DashboardProcess(
                state_file, "2026-08-17T09:00:00-04:00"
            )
            monday_view = monday_dashboard.read()
            monday_dashboard.close()

            self.assertIn("0 of 3 completed", monday_view)
            self.assertIn("Completed", monday_view)
            self.assertIn("Moved to Saturday · Work ran late", monday_view)
            self.assertIn("Skipped · Too tired", monday_view)
            self.assertEqual(1, monday_view.count("Missed — no response"))
            self.assertNotIn("Missed — no response ·", monday_view)
            self.assertIn("Workout history", monday_view)
            self.assertIn("Elliptical", monday_view)
            self.assertIn("20 · Moderate", monday_view)
            self.assertIn("Other exercise", monday_view)
            self.assertIn("Under 20 · Easy", monday_view)
            self.assertIn(
                "Short effort — does not count toward weekly progress", monday_view
            )
            self.assertLess(
                monday_view.index("Other exercise"), monday_view.index("Elliptical")
            )

    def test_rollover_does_not_mark_goal_suppressed_slots_as_missed(self):
        with tempfile.TemporaryDirectory() as temporary_directory:
            state_file = Path(temporary_directory) / "successful-week.json"

            for effort in ("Easy", "Moderate", "Hard"):
                dashboard = DashboardProcess(
                    state_file, "2026-08-10T09:00:00-04:00"
                )
                self.log_unscheduled_workout(
                    dashboard, "Other exercise", "20", effort
                )
                dashboard.close()

            monday_dashboard = DashboardProcess(
                state_file, "2026-08-17T09:00:00-04:00"
            )
            monday_view = monday_dashboard.read()
            monday_dashboard.close()

            self.assertIn("0 of 3 completed", monday_view)
            self.assertIn("Weekly goal met — no workout needed", monday_view)
            self.assertNotIn("Missed — no response", monday_view)

    def test_rollover_keeps_ignored_reminders_before_success_as_missed(self):
        with tempfile.TemporaryDirectory() as temporary_directory:
            state_file = Path(temporary_directory) / "late-success.json"
            self.run_reminder_check(state_file, "2026-08-10T16:00:00-04:00")
            self.run_reminder_check(state_file, "2026-08-10T16:15:00-04:00")

            for effort in ("Easy", "Moderate", "Hard"):
                dashboard = DashboardProcess(
                    state_file, "2026-08-11T09:00:00-04:00"
                )
                self.log_unscheduled_workout(
                    dashboard, "Other exercise", "20", effort
                )
                dashboard.close()

            monday_dashboard = DashboardProcess(
                state_file, "2026-08-17T09:00:00-04:00"
            )
            monday_view = monday_dashboard.read()
            monday_dashboard.close()

            self.assertEqual(1, monday_view.count("Missed — no response"))
            self.assertEqual(
                2, monday_view.count("Weekly goal met — no workout needed")
            )

    def test_upcoming_primary_slot_can_change_day_and_time_for_this_week(self):
        with tempfile.TemporaryDirectory() as temporary_directory:
            state_file = Path(temporary_directory) / "week-exception.json"
            thursday_morning = "2026-08-13T09:00:00-04:00"

            dashboard = DashboardProcess(state_file, thursday_morning)
            self.addCleanup(dashboard.close)
            original_view = dashboard.read()
            self.assertIn("Friday, August 14 at 4:00 PM", original_view)
            self.assertIn("Adjust this week", original_view)
            self.assertIn("Save this week only", original_view)
            self.assert_click_only(original_view)

            adjusted_view = dashboard.submit(
                {
                    "schedule_action": "adjust-week-slot",
                    "slot_id": "2026-08-10-primary-3",
                    "weekday": "5",
                    "departure_time": "17:30",
                }
            )
            dashboard.close()

            self.assertIn("Saturday, August 15 at 5:30 PM", adjusted_view)
            self.assertIn("<strong>Monday</strong><span>4:00 PM</span>", adjusted_view)
            self.assertIn(
                "<strong>Wednesday</strong><span>4:00 PM</span>", adjusted_view
            )
            self.assertIn("<strong>Saturday</strong><span>5:30 PM</span>", adjusted_view)
            self.assertIn("1 fallback slot available", adjusted_view)
            self.assertIn("Reserved by primary departure", adjusted_view)
            self.assertNotIn("Friday, August 14 at 4:00 PM", adjusted_view)

            superseded_reminder = self.run_reminder_check(
                state_file, "2026-08-14T16:00:00-04:00"
            )
            before_adjusted_reminder = self.run_reminder_check(
                state_file, "2026-08-15T17:29:00-04:00"
            )
            adjusted_reminder = self.run_reminder_check(
                state_file, "2026-08-15T17:30:00-04:00"
            )
            adjusted_follow_up = self.run_reminder_check(
                state_file, "2026-08-15T17:45:00-04:00"
            )

            self.assertEqual("", superseded_reminder.stdout)
            self.assertEqual("", before_adjusted_reminder.stdout)
            self.assertEqual(
                [
                    "Exercise Habit Tracker",
                    "Time to leave for the gym.",
                    "Saturday, August 15 at 5:30 PM",
                ],
                adjusted_reminder.stdout.strip().splitlines(),
            )
            self.assertEqual(
                [
                    "Exercise Habit Tracker",
                    "A gentle follow-up: are you leaving for the gym?",
                    "Saturday, August 15 at 5:30 PM",
                ],
                adjusted_follow_up.stdout.strip().splitlines(),
            )

            next_week_dashboard = DashboardProcess(
                state_file, "2026-08-17T09:00:00-04:00"
            )
            next_week_view = next_week_dashboard.read()
            next_week_dashboard.close()

            current_primary_schedule = next_week_view.split(
                '<h2 id="primary-heading">', 1
            )[1].split("</section>", 1)[0]
            self.assertIn(
                "<strong>Friday</strong><span>4:00 PM</span>",
                current_primary_schedule,
            )
            self.assertNotIn(
                "<strong>Saturday</strong><span>5:30 PM</span>",
                current_primary_schedule,
            )

    def test_deliberate_routine_change_applies_only_to_future_weeks(self):
        with tempfile.TemporaryDirectory() as temporary_directory:
            state_file = Path(temporary_directory) / "routine-change.json"
            monday_morning = "2026-08-10T09:00:00-04:00"

            dashboard = DashboardProcess(state_file, monday_morning)
            self.addCleanup(dashboard.close)
            original_view = dashboard.read()
            self.assertIn("Change repeating routine", original_view)
            self.assertIn("Applies to future weeks only", original_view)
            self.assertIn("Save future routine", original_view)
            self.assert_click_only(original_view)

            changed_view = dashboard.submit(
                {
                    "schedule_action": "save-routine-slot",
                    "routine_order": "1",
                    "weekday": "1",
                    "departure_time": "15:30",
                }
            )
            dashboard.close()

            self.assertIn("Monday, August 10 at 4:00 PM", changed_view)
            self.assertIn("<strong>Monday</strong><span>4:00 PM</span>", changed_view)
            self.assertIn("Tuesday · 3:30 PM", changed_view)
            self.assertIn("Wednesday · 4:00 PM", changed_view)
            self.assertIn("Friday · 4:00 PM", changed_view)

            history_dashboard = DashboardProcess(
                state_file, "2026-08-11T09:00:00-04:00"
            )
            self.log_unscheduled_workout(
                history_dashboard, "Other exercise", "Under 20", "Easy"
            )
            history_dashboard.close()

            next_week_dashboard = DashboardProcess(
                state_file, "2026-08-17T09:00:00-04:00"
            )
            next_week_view = next_week_dashboard.read()
            next_week_dashboard.close()

            self.assertIn("0 of 3 completed", next_week_view)
            self.assertIn("Tuesday, August 18 at 3:30 PM", next_week_view)
            self.assertIn("<strong>Tuesday</strong><span>3:30 PM</span>", next_week_view)
            self.assertIn(
                "<strong>Wednesday</strong><span>4:00 PM</span>", next_week_view
            )
            self.assertIn("<strong>Friday</strong><span>4:00 PM</span>", next_week_view)
            self.assertIn("Previous week outcomes", next_week_view)
            self.assertIn("<strong>Monday</strong><span>4:00 PM</span>", next_week_view)
            self.assertIn("Workout history", next_week_view)
            self.assertIn("Other exercise", next_week_view)
            self.assertIn("Under 20 · Easy", next_week_view)

            superseded_future_reminder = self.run_reminder_check(
                state_file, "2026-08-17T16:00:00-04:00"
            )
            changed_future_reminder = self.run_reminder_check(
                state_file, "2026-08-18T15:30:00-04:00"
            )
            self.assertEqual("", superseded_future_reminder.stdout)
            self.assertEqual(
                [
                    "Exercise Habit Tracker",
                    "Time to leave for the gym.",
                    "Tuesday, August 18 at 3:30 PM",
                ],
                changed_future_reminder.stdout.strip().splitlines(),
            )

    def test_routine_repeats_unchanged_without_an_explicit_settings_save(self):
        with tempfile.TemporaryDirectory() as temporary_directory:
            state_file = Path(temporary_directory) / "unchanged-routine.json"

            dashboard = DashboardProcess(
                state_file, "2026-08-10T09:00:00-04:00"
            )
            current_view = dashboard.read()
            dashboard.close()
            self.assertIn("Change repeating routine", current_view)

            next_week_dashboard = DashboardProcess(
                state_file, "2026-08-17T09:00:00-04:00"
            )
            next_week_view = next_week_dashboard.read()
            next_week_dashboard.close()

            self.assertIn("Monday, August 17 at 4:00 PM", next_week_view)
            self.assertIn("<strong>Monday</strong><span>4:00 PM</span>", next_week_view)
            self.assertIn(
                "<strong>Wednesday</strong><span>4:00 PM</span>", next_week_view
            )
            self.assertIn("<strong>Friday</strong><span>4:00 PM</span>", next_week_view)

    def test_history_correction_recomputes_progress_and_persists_across_weeks(self):
        with tempfile.TemporaryDirectory() as temporary_directory:
            state_file = Path(temporary_directory) / "editable-history.json"

            for recorded_at, effort in (
                ("2026-08-10T09:00:00-04:00", "Easy"),
                ("2026-08-10T10:00:00-04:00", "Moderate"),
                ("2026-08-10T11:00:00-04:00", "Hard"),
            ):
                previous_week_dashboard = DashboardProcess(state_file, recorded_at)
                self.log_unscheduled_workout(
                    previous_week_dashboard, "Elliptical", "20", effort
                )
                previous_week_dashboard.close()

            for recorded_at, activity, duration, effort in (
                (
                    "2026-08-17T09:00:00-04:00",
                    "Weight training",
                    "20",
                    "Moderate",
                ),
                (
                    "2026-08-18T09:00:00-04:00",
                    "Other exercise",
                    "30",
                    "Hard",
                ),
                (
                    "2026-08-19T09:00:00-04:00",
                    "Elliptical",
                    "Under 20",
                    "Very easy",
                ),
            ):
                dashboard = DashboardProcess(state_file, recorded_at)
                history_view = self.log_unscheduled_workout(
                    dashboard, activity, duration, effort
                )[-1]
                dashboard.close()

            self.assertIn("2 of 3 completed", history_view)
            self.assertIn("Edit record", history_view)
            self.assertIn("Save correction", history_view)
            self.assert_click_only(history_view)
            for choice in ("Elliptical", "Weight training", "Other exercise"):
                self.assertIn(f'<option value="{choice}"', history_view)
            for choice in ("Under 20", "20", "30", "45", "60+ minutes"):
                self.assertIn(f'<option value="{choice}"', history_view)
            for choice in ("Very easy", "Easy", "Moderate", "Hard", "Very hard"):
                self.assertIn(f'<option value="{choice}"', history_view)
            self.assertLess(
                history_view.index("Wednesday, August 19 at 9:00 AM"),
                history_view.index("Tuesday, August 18 at 9:00 AM"),
            )
            self.assertLess(
                history_view.index("Monday, August 17 at 9:00 AM"),
                history_view.index("Monday, August 10 at 11:00 AM"),
            )

            correction_dashboard = DashboardProcess(
                state_file, "2026-08-19T10:00:00-04:00"
            )
            current_record_id = self.history_record_id(
                history_view, "Wednesday, August 19 at 9:00 AM"
            )
            corrected_view = correction_dashboard.submit(
                {
                    "history_action": "save-workout-correction",
                    "record_id": current_record_id,
                    "activity": "Weight training",
                    "duration": "45",
                    "effort": "Hard",
                }
            )
            correction_dashboard.close()

            self.assertIn("3 of 3 completed", corrected_view)
            self.assertIn("Weekly goal complete", corrected_view)
            corrected_record = self.history_record(
                corrected_view, "Wednesday, August 19 at 9:00 AM"
            )
            self.assertIn("Weight training", corrected_record)
            self.assertIn("45 · Hard", corrected_record)
            self.assertNotIn("Under 20 · Very easy", corrected_record)

            historical_record_id = self.history_record_id(
                corrected_view, "Monday, August 10 at 11:00 AM"
            )
            historical_correction_dashboard = DashboardProcess(
                state_file, "2026-08-19T10:00:00-04:00"
            )
            historical_view = historical_correction_dashboard.submit(
                {
                    "history_action": "save-workout-correction",
                    "record_id": historical_record_id,
                    "activity": "Other exercise",
                    "duration": "Under 20",
                    "effort": "Very easy",
                }
            )
            historical_correction_dashboard.close()
            self.assertIn("Previous week progress: 2 of 3 completed", historical_view)
            self.assertNotIn("Previous week goal complete", historical_view)

            reopened_dashboard = DashboardProcess(
                state_file, "2026-08-19T10:00:00-04:00"
            )
            reopened_view = reopened_dashboard.read()
            reopened_dashboard.close()
            self.assertIn("3 of 3 completed", reopened_view)
            self.assertIn(
                "Unscheduled workout · Monday, August 10 at 11:00 AM",
                reopened_view,
            )
            reopened_current_record = self.history_record(
                reopened_view, "Wednesday, August 19 at 9:00 AM"
            )
            self.assertIn("45 · Hard", reopened_current_record)
            self.assertIn("Previous week progress: 2 of 3 completed", reopened_view)
            historical_record = self.history_record(
                reopened_view, "Monday, August 10 at 11:00 AM"
            )
            self.assertIn("Other exercise", historical_record)
            self.assertIn("Under 20 · Very easy", historical_record)

    def test_history_deletion_requires_confirmation_and_recomputes_progress(self):
        with tempfile.TemporaryDirectory() as temporary_directory:
            state_file = Path(temporary_directory) / "deletable-history.json"

            for recorded_at, activity, effort in (
                ("2026-08-17T09:00:00-04:00", "Elliptical", "Easy"),
                ("2026-08-18T09:00:00-04:00", "Other exercise", "Moderate"),
                ("2026-08-19T09:00:00-04:00", "Weight training", "Hard"),
            ):
                dashboard = DashboardProcess(state_file, recorded_at)
                complete_view = self.log_unscheduled_workout(
                    dashboard, activity, "30", effort
                )[-1]
                dashboard.close()

            self.assertIn("3 of 3 completed", complete_view)
            self.assertIn("Delete record", complete_view)
            self.assertIn("Delete this workout record?", complete_view)
            self.assertIn("Confirm delete", complete_view)
            self.assertIn("Other exercise", complete_view)
            self.assert_click_only(complete_view)

            unconfirmed_dashboard = DashboardProcess(
                state_file, "2026-08-19T10:00:00-04:00"
            )
            unconfirmed_view = unconfirmed_dashboard.read()
            unconfirmed_dashboard.close()
            self.assertIn("3 of 3 completed", unconfirmed_view)
            self.assertIn(
                "Unscheduled workout · Tuesday, August 18 at 9:00 AM",
                unconfirmed_view,
            )

            delete_dashboard = DashboardProcess(
                state_file, "2026-08-19T10:00:00-04:00"
            )
            deleted_record_id = self.history_record_id(
                unconfirmed_view, "Tuesday, August 18 at 9:00 AM"
            )
            deleted_view = delete_dashboard.submit(
                {
                    "history_action": "confirm-workout-deletion",
                    "record_id": deleted_record_id,
                }
            )
            delete_dashboard.close()

            self.assertIn("2 of 3 completed", deleted_view)
            self.assertNotIn("Weekly goal complete", deleted_view)
            self.assertNotIn(
                "Unscheduled workout · Tuesday, August 18 at 9:00 AM",
                deleted_view,
            )

            reopened_dashboard = DashboardProcess(
                state_file, "2026-08-19T10:00:00-04:00"
            )
            reopened_view = reopened_dashboard.read()
            reopened_dashboard.close()
            self.assertIn("2 of 3 completed", reopened_view)
            self.assertNotIn(
                "Unscheduled workout · Tuesday, August 18 at 9:00 AM",
                reopened_view,
            )

    def test_complete_local_state_can_be_exported_and_restored(self):
        with tempfile.TemporaryDirectory() as temporary_directory:
            directory = Path(temporary_directory)
            source_state = directory / "source.json"
            backup_file = directory / "exercise-backup.json"
            restored_state = directory / "restored.json"

            dashboard = DashboardProcess(source_state, "2026-08-10T09:00:00-04:00")
            dashboard.submit(
                {
                    "schedule_action": "adjust-week-slot",
                    "slot_id": "2026-08-10-primary-3",
                    "weekday": "5",
                    "departure_time": "17:30",
                }
            )
            dashboard.submit(
                {
                    "schedule_action": "save-routine-slot",
                    "routine_order": "1",
                    "weekday": "1",
                    "departure_time": "15:30",
                }
            )
            corrected_history = self.log_unscheduled_workout(
                dashboard, "Elliptical", "20", "Easy"
            )[-1]
            corrected_record_id = self.history_record_id(
                corrected_history, "Monday, August 10 at 9:00 AM"
            )
            corrected_history = dashboard.submit(
                {
                    "history_action": "save-workout-correction",
                    "record_id": corrected_record_id,
                    "activity": "Weight training",
                    "duration": "30",
                    "effort": "Moderate",
                }
            )
            dashboard.close()
            deletable_dashboard = DashboardProcess(
                source_state, "2026-08-10T10:00:00-04:00"
            )
            deletable_history = self.log_unscheduled_workout(
                deletable_dashboard, "Other exercise", "Under 20", "Very easy"
            )[-1]
            deleted_record_id = self.history_record_id(
                deletable_history, "Monday, August 10 at 10:00 AM"
            )
            deletable_dashboard.submit(
                {
                    "history_action": "confirm-workout-deletion",
                    "record_id": deleted_record_id,
                }
            )
            deletable_dashboard.close()

            self.run_reminder_check(source_state, "2026-08-10T16:00:00-04:00")
            moved_dashboard = DashboardProcess(
                source_state, "2026-08-10T16:00:00-04:00"
            )
            moved_dashboard.submit(
                {
                    "action": "move-to-fallback",
                    "slot_id": "2026-08-10-primary-1",
                }
            )
            moved_dashboard.submit(
                {
                    "action": "confirm-departure-decision",
                    "slot_id": "2026-08-10-primary-1",
                    "reason": "Work ran late",
                }
            )
            moved_dashboard.close()

            self.run_reminder_check(source_state, "2026-08-12T16:00:00-04:00")
            skipped_dashboard = DashboardProcess(
                source_state, "2026-08-12T16:00:00-04:00"
            )
            skipped_dashboard.submit(
                {"action": "skip", "slot_id": "2026-08-10-primary-2"}
            )
            skipped_dashboard.submit(
                {
                    "action": "confirm-departure-decision",
                    "slot_id": "2026-08-10-primary-2",
                    "reason": "Too tired",
                }
            )
            skipped_dashboard.close()

            self.run_reminder_check(source_state, "2026-08-15T17:30:00-04:00")
            self.run_reminder_check(source_state, "2026-08-15T17:45:00-04:00")

            current_dashboard = DashboardProcess(
                source_state, "2026-08-17T09:00:00-04:00"
            )
            source_view = self.log_unscheduled_workout(
                current_dashboard, "Other exercise", "Under 20", "Hard"
            )[-1]
            current_dashboard.close()
            source_text = visible_text(source_view)

            for expected in (
                "Tuesday, August 18 at 3:30 PM",
                "Moved to Sunday · Work ran late",
                "Skipped · Too tired",
                "Missed — no response",
                "Weight training",
                "30 · Moderate",
                "Other exercise",
                "Under 20 · Hard",
                "Tuesday · 3:30 PM",
            ):
                self.assertIn(expected, source_text)
            self.assertNotIn("Under 20 · Very easy", source_text)

            exported = self.run_application(
                "export-backup",
                "--state-file",
                str(source_state),
                "--backup-file",
                str(backup_file),
            )
            self.assertEqual(
                f"Backup exported: {backup_file.resolve()}", exported.stdout.strip()
            )

            restored = self.run_application(
                "restore-backup",
                "--state-file",
                str(restored_state),
                "--backup-file",
                str(backup_file),
            )
            self.assertEqual(
                f"Backup restored: {restored_state.resolve()}",
                restored.stdout.strip(),
            )

            restored_dashboard = DashboardProcess(
                restored_state, "2026-08-17T09:00:00-04:00"
            )
            restored_text = visible_text(restored_dashboard.read())
            restored_dashboard.close()
            self.assertEqual(source_text, restored_text)

            source_reminder = self.run_reminder_check(
                source_state, "2026-08-18T15:30:00-04:00"
            )
            restored_reminder = self.run_reminder_check(
                restored_state, "2026-08-18T15:30:00-04:00"
            )
            self.assertEqual(source_reminder.stdout, restored_reminder.stdout)
            self.assertIn("Tuesday, August 18 at 3:30 PM", restored_reminder.stdout)

    def test_invalid_backup_cannot_replace_valid_local_state(self):
        with tempfile.TemporaryDirectory() as temporary_directory:
            directory = Path(temporary_directory)
            state_file = directory / "valid-state.json"
            invalid_backup = directory / "invalid-backup.json"

            dashboard = DashboardProcess(state_file, "2026-08-10T09:00:00-04:00")
            original_view = self.log_unscheduled_workout(
                dashboard, "Elliptical", "30", "Moderate"
            )[-1]
            dashboard.close()
            original_text = visible_text(original_view)

            self.run_application(
                "export-backup",
                "--state-file",
                str(state_file),
                "--backup-file",
                str(invalid_backup),
            )
            naive_timestamp_document = json.loads(
                invalid_backup.read_text(encoding="utf-8")
            )
            naive_timestamp_document["weeks"]["2026-08-10"]["primary_slots"][0][
                "departure_at"
            ] = "2026-08-10T16:00:00"

            invalid_documents = (
                "not json",
                json.dumps(
                    {
                        "schema_version": 5,
                        "routine": {},
                        "weeks": {},
                        "workout_draft": None,
                        "departure_decision": None,
                    }
                ),
                json.dumps(naive_timestamp_document),
            )
            for invalid_document in invalid_documents:
                invalid_backup.write_text(invalid_document, encoding="utf-8")
                failed_restore = self.run_application(
                    "restore-backup",
                    "--state-file",
                    str(state_file),
                    "--backup-file",
                    str(invalid_backup),
                    check=False,
                )
                self.assertEqual(1, failed_restore.returncode)
                self.assertIn("Restore failed:", failed_restore.stderr)

                unchanged_dashboard = DashboardProcess(
                    state_file, "2026-08-10T09:00:00-04:00"
                )
                unchanged_text = visible_text(unchanged_dashboard.read())
                unchanged_dashboard.close()
                self.assertEqual(original_text, unchanged_text)


if __name__ == "__main__":
    unittest.main()
