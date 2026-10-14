# 23: Collaboration 空间与输入体验

**What to build:** 一起改善消息、输入、背景和语音的空间配合：保留A/C认可的聊天空间，context采用限高独立滚动的浮层并可就地收起；语音在输入下方预览、停止后进可编辑草稿；slash只落实多候选上下选择，其他输入和真实执行语义保持。

**Blocked by:** None

**Status:** claimed

**Triage:** ready-for-agent
**ID:** PDEX-23
**Parent:** [PDEX-SPEC-02](../refinement-spec-2026-10-11.md)
**Lifecycle:** in-progress
**Implementation:** scoped source implementation and integration committed; packaged acceptance pending
**Date:** 2026-10-11
**Publication branch:** codex/dashboard-experience-refinement-spec
**Publication base:** d91d636b395d8c42c0c516827db37ca2565260a4
**Spec snapshot:** 0b0d727b23166ba1ccf9708656ab2bf00f6188ed
**Breakdown decision:** 用户在合并为8张票后明确回复“同意”，批准范围、粒度与直接依赖。

## Acceptance criteria

- [ ] 消息在消息区滚动，已认可的大输入和字体保留，输入/发送始终容易找到，外层不因长context被撑长。
- [ ] 按需context浮层在聊天区锚定，有独立限高/滚动、标题旁收起；短窗口限高依据输入区，不能遮输入、语音停止或发送。
- [ ] 背景收起时维持A/C认可的聊天空间，不因为选择浮层改全局侧栏、主题或消息视觉。
- [ ] 1280×720的背景＋转写组合中停止操作完整可见，窄窗口长context/草稿/消息仍可读可操作，不复制原型A的裁断。
- [ ] 语音流程为下方转写预览→停止→可编辑草稿→用户发送，停止不发送；预览空时不留大片空白，有内容可读或内部滚动。
- [ ] 使用真实dictation服务及其状态/错误和草稿持久化；取消/关闭预览不误发消息、不丢已有草稿，不把模拟按钮带进产品。
- [ ] 先验证既有上下键逻辑和真实候选供给，仅修多候选selection缺口，两个以上合法测试候选可上下循环选择。
- [ ] Enter/Tab只补全、Esc关闭，既有高亮/字号/菜单样式、光标和参数保留；补全不执行或自动发送。
- [ ] composition/中文输入法选字不被抢键，上下键仅在可见候选且非composition时处理，普通slash文本仍普通输入。
- [ ] 生产仅有retro时不新增虚构候选；Workflow retro不搬进Dashboard，不硬编码另一执行模型。
- [ ] 保留真实model/effort、会话/工作历史、队列/取消、结果和能力边界，不加语义审批层或自动规划权限。
- [ ] 用实际DOM和服务边界检查，保留不同消息/草稿/转写/背景组合的宽窄窗口证据；版式测试不调用真实模型花额度。

## Verification

PDEX-SPEC-02 stories 51–60；共同承担 1–3、88–91 的保存与保留边界。

使用既有application业务入口、真实持久写入/读回和实际DOM或指针检查外部行为；
保存后用新实例或重开验证，保留适用的宽窄窗口和打包来源证据。prototype只作
指定区域设计依据，源码字符串、mock、save toast或原型内存不代替真实验收。
未要求变化的区域按实际App基线保留；不增加依赖、外部服务或部署配置。

## Execution

- 2026-10-11：经用户批准发布本地完整票体，未分配assignee、未claim、未开始实现。
- 后续授权claim时记录实际owner、working branch、base commit、增量实现/评审/
  验收commits、结果和限制。每票可多次commit，完整验收前不关闭。
- 本票发布不授权安装正常App、main merge、remote push或关闭父规格。

## Reimplementation claim — 2026-10-13

Owner: Codex implementer `/root/pdex23_reimplementation`. Working branch
`codex/pdex-23-refinement-reimplementation`; original PDEX-SPEC-02 source
lineage `918e7e0d9c4b2c524c429bfd309482e328bc4c91`. The implementation worktree
was verified at integration tip `b7dcd71b50b42de4a706d460d635f99bf059770d`
before editing, and does not use the rejected prior implementation. Local Git
only; no installation, main merge, or remote operation.

## Reimplementation evidence — 2026-10-13

**State:** PDEX-23 source implementation and integration are committed. PDEX-26
packaged acceptance remains outstanding, so the lifecycle stays in progress.
The acceptance checklist above is intentionally not marked complete.

**Git record**

- Branch: `codex/pdex-23-refinement-reimplementation`
- Exact starting integration commit: `b7dcd71b50b42de4a706d460d635f99bf059770d`
- Implementation commit: `81c0c5dc25975564e403e71f3366442b341ed101`
- Ticket and visual-evidence commit: `606ead3d6f92c6d75083204b8d2917f98e448b14`
- Integrated source tip: `53a7495dcade91e979ef0e3acb58202af7f8e5e3`
- Integration merge commit: `41a2fd98cbafa5860641a9e587af292601a3ca6a` (parents: evidence commit `606ead3d6f92c6d75083204b8d2917f98e448b14`, integration tip `53a7495dcade91e979ef0e3acb58202af7f8e5e3`).

**Implementation boundary**

- The Current Work context is reparented into the chat surface. It is an
  independently scrolling overlay, sized from the chat heading to the
  composer, with a close control that returns focus to its disclosure button.
  Session history remains independently controlled; its keyboard resize,
  stored width, migration, restart behavior and focus return are retained.
- The layout checks run production HTML, styles and panel initialization in
  macOS WKWebView with synthetic messages, sessions, context, statuses, draft
  and recording preview only. The 8rem textarea minimum remains unchanged.
  Context is bounded by the actual composer position; at 680×560 the owning
  Collaboration content scrolls so the full-size input, stop and send controls
  stay reachable.
- Slash candidate supply is injectable at the controller seam for tests; the
  production default remains only `/retro`. The DOM test exercises three legal
  test candidates, up/down cycling, wraparound and composition ownership. No
  candidate is executed or sent by completion.
- CSS changes are limited to these Collaboration-owned selectors and rules:
  `#workspace-destination-collaboration.collaboration-destination`,
  `#workspace-destination-collaboration .collaboration-layout`,
  `.collaboration-primary-layout` and its narrow session/chat children,
  `.collaboration-chat-pane`, `.collaboration-message-list`,
  `.collaboration-composer`, `.collaboration-context-pane` and its heading,
  close control and context panes, `.collaboration-status-bar > p`,
  `#collaboration-task-tool-notice`, `.collaboration-run-status`, and
  `#collaboration-voice-preview` / `:empty`. Responsive rules apply only to
  the Collaboration destination and voice preview. No shared shell/header,
  global typography, theme, or Calendar selector is changed.
- At 640×756 and 680×560 CSS-pixel viewports, Collaboration reclaims exactly
  48px of its own bottom page padding (computed `0px` versus Today’s `48px`).
  At other heights the local bottom padding is `16px`; no shared page-frame
  spacing changes. On short windows (height ≤600px, or height ≤740px and width
  ≤720px), the Collaboration-owned page becomes scrollable with a 42rem work
  area so controls are not compressed below their existing sizes.
- DOM checks compare the shared page frame/header values and title typography
  directly. The existing Collaboration description line-height remains
  `0.576px` above Today as measured at baseline; it was not normalized.

**Visual evidence** — synthetic fixtures rendered by production WKWebView at
the stated CSS viewport. Images include the full app/page edges; PNG dimensions
are 2× the viewport dimensions.

- [640×756, five-session history expanded](../evidence/pdex-23-collaboration-640x756.png) — 1280×1512 pixels.
- [680×560, long context and draft with synthetic active dictation](../evidence/pdex-23-collaboration-680x560.png) — 1360×1120 pixels. Context has independent scroll; stop and send remain visible, and the page scroll route retains the 8rem editor.

**Checks observed**

| Command | Result |
| --- | --- |
| `node --test tests/frontend/collaboration-layout.test.ts` | Pass, 14/14. Includes 640×756 history and 680×560 long context/draft/recording-preview cases; verifies real DOM geometry, scroll ownership, focus and pointer reachability. |
| `node --test tests/frontend/collaboration-panels.test.ts` | Pass, 6/6. Includes saved preference migration/reinitialization, context width independence, history resize and focus behavior. |
| `node --test tests/frontend/collaboration-command-completion.test.ts` | 8/10 pass. The two failing tests below also fail on the clean base. |
| `npm run build` | Could not complete: `prepare-frontend.mjs` ran, then `tsc` was unavailable (`sh: tsc: command not found`, exit 127). No dependency was installed. |
| `git diff --check` | Pass. |

**Inherited command-test baseline proof**

On a detached, clean worktree at `b7dcd71b50b42de4a706d460d635f99bf059770d`,
the exact command `node --test
tests/frontend/collaboration-command-completion.test.ts` exited 1 with 7/9
passing and these same two failures:

1. `long help opens on demand while draft, dictation preview and real status surfaces remain exposed` — assertion `false !== true`.
2. `selected slash candidate retains readable foreground on its soft background` — selected candidate `rgb(35, 39, 36)` on `rgba(0, 0, 0, 0)`, contrast `1.39`.

The reimplementation run adds one passing multi-candidate test (8/10) and
retains the same two failures and observations. These are recorded as inherited
baseline failures, not as fixes delivered by PDEX-23. No real model calls,
real dictation-service capture, installed app, or packaged save/readback was
performed; those acceptance checks remain with PDEX-26.

## Integration and post-merge verification — 2026-10-13

The branch merged the then-current local integration commit
`53a7495dcade91e979ef0e3acb58202af7f8e5e3` using a no-fast-forward merge. Git
auto-merged `frontend/index.html`, `frontend/interface-language.ts` and
`frontend/styles.css`; there were no textual conflicts to resolve. Checks after
the merge confirm the PDEX-23 close control, overlay styles and tests remain,
and the integrated PDEX-19 task editor and PDEX-24 Habit form/source files are
present. No Task or Habit implementation was altered during this merge. The
capture-enabled WK cases were rerun on the merged tree at 640×756 and 680×560;
both passed and regenerated the linked PNGs.

The first-parent PDEX-23 branch commits, in order, are:

1. `81c0c5dc25975564e403e71f3366442b341ed101` — scoped PDEX-23 source and DOM/panel coverage.
2. `606ead3d6f92c6d75083204b8d2917f98e448b14` — ticket, base-failure proof and two viewport captures.
3. `41a2fd98cbafa5860641a9e587af292601a3ca6a` — no-fast-forward merge of integration tip `53a7495dcade91e979ef0e3acb58202af7f8e5e3`.

Post-merge checks:

- `PATH=/Users/tingranwang/Documents/Codex/projects/tortilla-flat/personal-dashboard/node_modules/.bin:$PATH npm run build` — pass, using the primary checkout's existing TypeScript compiler; no package install.
- `node --test tests/frontend/collaboration-layout.test.ts` — pass, 14/14.
- `node --test tests/frontend/collaboration-panels.test.ts` — pass, 6/6.
- `node --test tests/frontend/collaboration-command-completion.test.ts` — 8/10; the same two named inherited failures and messages above remain.
- `git diff --check` — pass; worktree clean after verification.

PDEX-23 stays claimed/in-progress. PDEX-26 packaged acceptance, actual dictation
service and packaged save/readback checks remain outstanding.

## Integration checkout — 2026-10-14

The primary integration branch `codex/dashboard-experience-refinement-reimplementation`
was clean at `53a7495dcade91e979ef0e3acb58202af7f8e5e3`; the clean worker tip was
`00e518d7e2c2f4b92333b863f7a54fb364c98bd8`. Integration used `--no-ff` and
created commit `968746ad4a3b2ab9722befe7bc160bfee07c15a9`, with parents
`53a7495dcade91e979ef0e3acb58202af7f8e5e3` and
`00e518d7e2c2f4b92333b863f7a54fb364c98bd8`. The complete worker history is
preserved: implementation `81c0c5dc25975564e403e71f3366442b341ed101`,
implementation evidence `606ead3d6f92c6d75083204b8d2917f98e448b14`, dependency
merge `41a2fd98cbafa5860641a9e587af292601a3ca6a` (second parent exactly
`53a7495dcade91e979ef0e3acb58202af7f8e5e3`), and branch verification
`00e518d7e2c2f4b92333b863f7a54fb364c98bd8`. The merge had no conflicts.

On the primary integration checkout, `PATH=node_modules/.bin:$PATH npm run build`
passed; `node --test tests/frontend/collaboration-layout.test.ts` passed 14/14;
`node --test tests/frontend/collaboration-panels.test.ts` passed 6/6. The
command-completion suite passed 8/10 and retained its two documented base
failures: “long help opens on demand while draft, dictation preview and real
status surfaces remain exposed” (`false !== true`) and “selected slash candidate
retains readable foreground on its soft background” (contrast 1.39). No attempt
was made to alter those baseline failures. The exact run is recorded in
[PDEX-23 integration evidence](../evidence/pdex-23-reimplementation-2026-10-13.md).

Lifecycle remains `in-progress`; packaged acceptance, real dictation-service
capture and packaged persistence/readback remain outstanding under PDEX-26.
