# Codex WebRTC Collaboration 听写输入规格

Status: wontfix
Type: task
Document kind: spec
Blocked by: None
Created: 2026-10-03
Superseded by: https://github.com/absurdwall/personal-dashboard/issues/43
Execution boundary: 误建本地 tracker 项已废弃；正式规格和状态以 GitHub #43 为准。未认领或开始产品实现。

## Specification

正式规格：[GitHub Spec #43](https://github.com/absurdwall/personal-dashboard/issues/43)。[本地辅助副本](../spec.md)保留设计记录；本条不再作为独立待办或正式状态入口。

已确认：现有 ChatGPT 登录的 Codex WebRTC；用户转写预览到可编辑草稿；无自动发送、语音对话、语言选择、离线备用或固定录音时长自动停止；离开 Collaboration 停止并保存到原会话/日期；失败保留已识别文字，取消丢弃本次输入。

测试边界已由用户确认：现有听写控制器到原会话草稿；真实打包 Mac 应用另验麦克风/WebRTC、中英混说、长段及尾段/故障行为。

## Comments

- 2026-10-03：用户调用 to-spec；设计已确认，测试边界回复“按这个边界（推荐）”。发布状态为 ready-for-agent，不记录产品实现或真人验收完成。
- 2026-10-03：用户纠正正式 tracker 应为 GitHub。已补发 Spec #43 并核实 ready-for-agent 标签；本地错误待办标记 wontfix，避免形成第二条可执行队列。此前 Management 来源登记仍存在，本次未再调用 Management helper。
