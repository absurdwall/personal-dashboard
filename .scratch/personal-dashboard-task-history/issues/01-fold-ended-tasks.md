# 01: 收起 Task 已完成历史

Status: resolved
Type: task
Blocked by: None

## What to build

按父规格修复 Tasks 默认主区、Today 已完成折叠、待办计数与按日期分批历史查看；保持原有状态写入和恢复功能。

## Evidence

- 安装版只读观察：8 个未删除 Task 中有 2 个待办、5 个已完成、1 个已放弃，默认主区却展示 8 个。
- TickTick 清单默认折叠“已完成 & 已放弃”；独立完成列表按完成日期分组。
- 修复前 `node --test tests/frontend/task-history-render.test.ts` 确定失败：主区终态行 2，预期 0。

## Answer

实现完成，并已更新日用安装：

- 默认主区只保留待办；完成／放弃保存后立即移入默认折叠历史，侧栏统计待办。
- Tasks 历史按真实完成日期／最后一次放弃日期倒序分组，未知日期不补造；每次显示 30 项。
- 历史仍可重开／恢复／更正完成记录；直接打开旧任务能越过首批历史限制；分页复用已有编辑器和对话框。
- Today 右栏折叠所选日期已完成项，之后日期不带入旧完成项；逾期待办仍保留。Calendar 与时间轴的事实展示保留。
- 中英文固定文案完整；同步维护原生验收脚本的历史筛选／折叠预期。

验证：`npm run test:frontend` 200 passed；`npm run build` 与 macOS App release build 通过；`bash -n scripts/acceptance/macos-ipc-workflow.sh` 与 `git diff --check` 通过。

原生 Computer Use 直接验证：隔离 Vault 的 2 个待办和 35 个历史；完成后 1 待办／36 折叠历史；展开按日期分组，查看更多追加余下 6 项；重开同一任务恢复待办；放弃后收起，历史可恢复；Today 打勾后收起且保留逾期；独立 Completed 筛选与英文默认文案；重启并将仅该进程的合成时钟推进到下一天后旧完成项退出 Today、逾期待办保留。合成正本中保留 completed/reopened/completed 与 abandoned/restored 变更链。

日用 `/Applications/Personal Dashboard.app` 已替换并重启；在现有 Vault 只读确认主区 2 个待办、默认关闭的历史 6 项。任务正本、28 个 Daily Record 与 3 个设置文件共 32 项哈希完全一致。旧程序已保存到 `Documents/Codex/backups/personal-dashboard-before-task-history-2026-10-03.zip` 并通过压缩包完整性与旧程序指纹检查。真实任务没有进行完成或恢复测试。完整旧 `dashboard-4` 脚本未运行，本次原生验证使用 CUA。无 Dida365 写入、自动化或语音修改。

日用新程序 SHA-256：`75c962632e1dfd7949e6bef42415196d56ef3f89fb2e79d225a09aee95cdb8f3`；版本保持 4.0.4。代码通过 [PR #42](https://github.com/absurdwall/personal-dashboard/pull/42) 合并路径。用户主观使用验收未代替为自动通过。
