"""Public script boundary: explicit source selectors, privacy and read-only behavior."""
import hashlib
import json
from pathlib import Path
import subprocess
import tempfile
import unittest

READER = Path(__file__).resolve().parents[2] / ".agents/skills/personal-dashboard-workflow-retro/scripts/read_evidence.py"

class ReaderTests(unittest.TestCase):
    def source(self, root):
        source = {"schemaVersion": 1, "settings": {"api_key": "PRIVATE_CREDENTIAL_SENTINEL"}, "sessions": [
            {"id":"selected", "vaultKey":"vault-a", "messages":[
                {"id":"request-a", "role":"user", "executionId":"a", "messageDate":"2026-10-09", "targetDate":"2026-10-02", "text":"Read synthetic Task A"},
                {"id":"reply-a", "role":"assistant", "executionId":"a", "text":"Observed source"},
                {"id":"request-b", "role":"user", "executionId":"b", "messageDate":"2026-10-10", "targetDate":"2026-10-09", "text":"Other day"},
            ], "workHistory":[{"executionId":"a", "status":"completed", "items":[
                {"itemId":"summary", "kind":"reasoning", "summary":["Visible summary"], "content":"HIDDEN_REASONING_SENTINEL", "rawResponse":"RAW_RESPONSE_SENTINEL"},
                {"itemId":"attempt", "kind":"dynamicToolCall", "status":"failed", "diagnostic":"password=PRIVATE_CREDENTIAL_SENTINEL"},
            ]}]},
            {"id":"unrelated", "messages":[{"role":"user", "executionId":"foreign", "messageDate":"2026-10-09", "text":"UNRELATED_SESSION_SENTINEL"}]},
        ]}
        path = root / "history.json"
        path.write_text(json.dumps(source))
        path.chmod(0o600)
        return path

    def run_reader(self, path, *arguments):
        return subprocess.run(["python3", str(READER), "--history", str(path), *arguments], capture_output=True, text=True)

    def test_period_uses_captured_request_date_and_reader_does_not_mutate(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp); path = self.source(root)
            before = path.read_bytes(); metadata = path.stat(); files = list(root.iterdir())
            result = self.run_reader(path, "--session", "selected", "--from", "2026-10-09", "--to", "2026-10-09")
            self.assertEqual(result.returncode, 0, result.stderr)
            exported = json.loads(result.stdout)
            self.assertEqual([entry["executionId"] for entry in exported["executions"]], ["a"])
            self.assertEqual(exported["source"]["sha256"], hashlib.sha256(before).hexdigest())
            self.assertEqual(exported["executions"][0]["request"]["targetDate"], "2026-10-02")
            self.assertIn("Visible summary", result.stdout)
            for sentinel in ["PRIVATE_CREDENTIAL_SENTINEL", "HIDDEN_REASONING_SENTINEL", "RAW_RESPONSE_SENTINEL", "UNRELATED_SESSION_SENTINEL"]:
                self.assertNotIn(sentinel, result.stdout)
            self.assertTrue(exported["omissions"])
            self.assertTrue(exported["executions"][0]["gaps"])
            self.assertEqual(path.read_bytes(), before)
            self.assertEqual((path.stat().st_mode, path.stat().st_mtime_ns), (metadata.st_mode, metadata.st_mtime_ns))
            self.assertEqual(list(root.iterdir()), files)

    def test_empty_selection_legacy_unknowns_and_explicit_export_bound(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = self.source(Path(tmp))
            empty = json.loads(self.run_reader(path, "--execution", "absent").stdout)
            self.assertEqual(empty["executions"], [])
            legacy = json.loads(self.run_reader(path, "--execution", "b").stdout)["executions"][0]
            self.assertIsNone(legacy["history"])
            self.assertTrue(any("unavailable" in gap for gap in legacy["gaps"]))
            bounded = json.loads(self.run_reader(path, "--session", "selected", "--max-export-bytes", "1024").stdout)
            self.assertEqual(bounded["coverage"], "unavailable-export-bound")
            self.assertEqual(bounded["selectedExecutions"], 2)
            self.assertTrue(bounded["omissions"])

    def test_damaged_and_unsupported_sources_are_errors_not_empty_history(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "history.json"
            for value in ["{", '{"schemaVersion":2,"sessions":[]}', '{"schemaVersion":1,"sessions":[{"messages":"broken"}]}']:
                path.write_text(value)
                result = self.run_reader(path, "--session", "selected")
                self.assertEqual(result.returncode, 2)
                self.assertIn("evidence-source-unavailable", result.stderr)

if __name__ == "__main__":
    unittest.main()
