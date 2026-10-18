# 首次受邀 Beta：准备记录

> **历史归档（2026-10-17）**：本目录保留首次 Beta 发布前的准备记录。下文及其他文件中的未认领、未实施、未发布、票据 open 等表述均为当时快照，不代表当前状态。#116–#120 已在实际发布后关闭。
> 当前交付与未覆盖项见[验收记录](../../docs/releases/beta-1/acceptance.md)和[实际发布结果](../../docs/releases/beta-1/publication-result.json)；GitHub Issues 继续拥有实时状态。原始正文保留如下。

- Canonical spec: [PDBETA-SPEC-01 / GitHub #116](https://github.com/absurdwall/personal-dashboard/issues/116)
- Local full-body copy: [spec.md](spec.md), verified against the published Issue on 2026-10-17.
- Distribution research: [distribution-research.zh.md](distribution-research.zh.md).
- Baseline: `9e8132b96a6669259d34981fcb602c48774efaf8` / `4.0.7`.
- Preparation branch: `codex/public-beta-discovery`.

GitHub owns the live specification. These files are supporting evidence, not a second executable queue. The Issue is open, labelled `ready-for-agent`, and unassigned. Four implementation tickets (#117–#120) are published as native sub-issues of #116, labelled ready-for-agent, open and unassigned. Native blockers form #117 → #118 → #119 → #120. No ticket has been claimed or implemented.

Confirmed scope: a small invited Apple Silicon Mac cohort, including AI Collaboration; keep source public and reuse this repository for Pages and prereleases; verify a real fresh-user download/install/eject/initialize/login/save/relaunch/readback journey plus offline, conflict and upgrade cases.

Discussion decisions: public label `1.0.0 Beta 1`, tag `v1.0.0-beta.1`; ad-hoc signed and unnotarized; users install compatible Codex themselves and sign into their own ChatGPT in Dashboard; no bundled/downloaded Codex; documentation can provide setup instructions. The App prepares a blank personal space after location/name selection; no Obsidian installation or demo records required. Keep dictation and in-process automatic morning planning; no new-user Dida onboarding.

Engineering verification remains for the evidenced minimum macOS, supported external Codex source/version and numeric version/build mapping. No app version, product code, dependency, deployment configuration, repository visibility or installed App changed during specification publication. No Release, release tag or Pages site has been created.

The specification was updated before ticket breakdown. [ticket-breakdown.md](ticket-breakdown.md) maps the user-confirmed four-ticket plan to canonical GitHub Issues; full-body copies are under issues/. The parent spec body was preserved during ticket publication.
