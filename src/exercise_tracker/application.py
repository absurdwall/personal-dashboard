import argparse
import sys
from pathlib import Path
from typing import List, Optional, cast

from .dashboard import serve_dashboard
from .reminders import (
    NotifierName,
    check_reminders,
    start_reminder_agent,
    stop_reminder_agent,
)
from .state import (
    current_time,
    default_state_file,
    export_backup,
    parse_time,
    restore_backup,
)


def add_state_file_argument(parser: argparse.ArgumentParser) -> None:
    parser.add_argument(
        "--state-file",
        type=Path,
        default=default_state_file(),
        help="local state path (default: %(default)s)",
    )


def parser() -> argparse.ArgumentParser:
    application_parser = argparse.ArgumentParser(
        prog="python3 -m exercise_tracker",
        description="Private local exercise dashboard and departure reminders.",
    )
    commands = application_parser.add_subparsers(dest="command", required=True)

    serve = commands.add_parser("serve", help="run the local dashboard")
    add_state_file_argument(serve)
    serve.add_argument("--host", default="127.0.0.1")
    serve.add_argument("--port", type=int, default=8765)
    serve.add_argument("--at", help=argparse.SUPPRESS)

    check = commands.add_parser("check-reminders", help="send reminders that are due")
    add_state_file_argument(check)
    check.add_argument("--notifier", choices=("macos", "stdout"), default="macos")
    check.add_argument("--at", help=argparse.SUPPRESS)

    start = commands.add_parser(
        "start-reminders", help="run reminders in this logged-in Mac session"
    )
    add_state_file_argument(start)

    export = commands.add_parser(
        "export-backup", help="export all local exercise data to one file"
    )
    add_state_file_argument(export)
    export.add_argument(
        "--backup-file",
        type=Path,
        required=True,
        help="local file to create or replace",
    )

    restore = commands.add_parser(
        "restore-backup", help="restore all local exercise data from one file"
    )
    add_state_file_argument(restore)
    restore.add_argument(
        "--backup-file",
        type=Path,
        required=True,
        help="previously exported local backup file",
    )

    commands.add_parser("stop-reminders", help="stop the current-session reminder runner")
    return application_parser


def main(arguments: Optional[List[str]] = None) -> int:
    options = parser().parse_args(arguments)
    if options.command == "serve":
        serve_dashboard(
            options.state_file.expanduser().resolve(),
            options.host,
            options.port,
            parse_time(options.at),
        )
        return 0
    if options.command == "check-reminders":
        check_reminders(
            options.state_file.expanduser().resolve(),
            parse_time(options.at) or current_time(),
            cast(NotifierName, options.notifier),
        )
        return 0
    if options.command == "start-reminders":
        agent_file = start_reminder_agent(options.state_file)
        print(f"Reminder runner started: {agent_file}")
        return 0
    if options.command == "export-backup":
        backup_file = options.backup_file.expanduser().resolve()
        try:
            export_backup(options.state_file.expanduser().resolve(), backup_file)
        except (OSError, TypeError, ValueError) as error:
            print(f"Export failed: {error}", file=sys.stderr)
            return 1
        print(f"Backup exported: {backup_file}")
        return 0
    if options.command == "restore-backup":
        state_file = options.state_file.expanduser().resolve()
        try:
            restore_backup(options.backup_file.expanduser().resolve(), state_file)
        except (OSError, TypeError, ValueError) as error:
            print(f"Restore failed: {error}", file=sys.stderr)
            return 1
        print(f"Backup restored: {state_file}")
        return 0
    if options.command == "stop-reminders":
        stop_reminder_agent()
        print("Reminder runner stopped")
        return 0
    return 2
