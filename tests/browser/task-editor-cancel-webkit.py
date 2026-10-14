#!/usr/bin/env python3
"""Isolated synthetic WKWebView replay for Task Cancel reachability and discard."""

import json
import pathlib
import re
import subprocess
import sys
import tempfile

ROOT = pathlib.Path(__file__).resolve().parents[2]
HERE = pathlib.Path(__file__).resolve().parent

with tempfile.TemporaryDirectory(prefix="pd-task-cancel-webkit-") as temp:
    work = pathlib.Path(temp)
    dist = work / "dist"
    dist.mkdir()
    subprocess.run(
        [str(ROOT / "node_modules/.bin/tsc"), "--project", str(ROOT / "tsconfig.json"),
         "--module", "commonjs", "--outDir", str(dist)],
        cwd=ROOT,
        check=True,
    )
    main = (dist / "main.js").read_text().replace("void connectToApplication();", "")
    main += """
window.cancelHarness={
  init(view,nav){
    currentInterfaceLanguage='en';currentWorkspaceDestination='tasks';currentTasksView=view;
    appShell.dataset.workspaceDestination='tasks';
    workspaceDestinationPanels.forEach(p=>p.hidden=p.dataset.workspacePanel!=='tasks');
    workspaceInformation.prepend(document.querySelector('#workspace-destination-tasks'));
    workspaceSidebarExpanded=nav;updateWorkspaceSidebarPresentation();renderTasks(view);
  },
  view:()=>currentTasksView,
  draft:()=>taskEditDrafts.get(taskDraftKey('synthetic-vault','synthetic-task')),
  busy:()=>taskOperationCount>0,
  wait:()=>pendingWrites.wait(),
};
"""
    (dist / "main.js").write_text(main)
    modules = {"./" + item.name: item.read_text() for item in dist.glob("*.js")}

    html = (ROOT / "frontend/index.html").read_text()
    html = re.sub(r'<script[^>]*src="[^"]*main\.js[^"]*"[^>]*></script>', "", html)
    (work / "index.html").write_text(html)
    (work / "styles.css").write_bytes((ROOT / "frontend/styles.css").read_bytes())

    prelude = (
        "const modules=" + json.dumps(modules) +
        ",cache={};function require(n){if(cache[n])return cache[n];let e={};cache[n]=e;"
        "new Function('exports','require',modules[n])(e,require);return e;}\n"
    )
    cases = [
        {"nav": nav, "width": 969, "height": 560}
        for nav in (True, False)
    ] + [{"nav": True, "width": 969, "height": 723}]
    if "--quick" in sys.argv:
        cases = [cases[-1]]
    scenario = "const selectedCases=" + json.dumps(cases) + ";\n" + (HERE / "task-editor-cancel-webkit.js").read_text()
    check = work / "check.js"
    check.write_text(prelude + scenario)

    helper_source = ROOT / "tests/frontend/helpers/rendered-today-unlocated.swift"
    helper = work / "probe.swift"
    helper.write_text(helper_source.read_text().replace("addingTimeInterval(20)", "addingTimeInterval(90)"))
    probe = subprocess.run(
        ["swift", str(helper), str(work / "index.html"), str(check), "969", "723"],
        cwd=ROOT,
        text=True,
        capture_output=True,
        timeout=180,
    )
    if probe.returncode:
        print(probe.stderr, end="")
        raise SystemExit(probe.returncode)
    result = json.loads(probe.stdout.strip())
    print(json.dumps(result, indent=2))
    raise SystemExit(1 if result["failures"] else 0)
