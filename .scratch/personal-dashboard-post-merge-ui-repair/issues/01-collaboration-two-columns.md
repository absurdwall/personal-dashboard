Status: claimed

## Parent

https://github.com/absurdwall/personal-dashboard/issues/36

## What to build

宽窗口三栏，稍窄窗口默认保留紧凑 Sessions 与更宽 conversation，Current context 按需可达；极窄或用户主动收起才使用单栏。

## Acceptance criteria

- [ ] 在含 PR #35 的基线复现缺少两栏过渡的症状，以实际渲染回归先捕获失败。
- [ ] 宽→稍窄→极窄→放宽均显示正确内容；两栏对话占主要空间，辅助上下文可访问且不迫使整页横向滚动。
- [ ] 自动响应与用户主动收起分开处理；旧偏好不会永久跳过两栏，已保存宽度被约束到有效范围，不清空全部偏好。
- [ ] 保留拖动／键盘调宽、焦点、草稿、会话选择、重启恢复及中英文界面；automatic morning plan 仍是原会话流程。
- [ ] 在真实 packaged Mac 候选版中操作同一宽度序列，记录构建、窗口尺寸和截图，交用户验收。

## Shared delivery conditions

- 每票在含 PR #35 合并成果的基线上，独立完成失败复现、修复、实际渲染回归和 packaged Mac 验收，使用隔离合成数据；复用现有测试入口。
- Today 长内容排版与时间轴控件修改需协调集成，集成后回归两者同时使用的场景；共享页面不构成硬阻塞。
- 最终集成候选版同时展示三项修复，记录构建身份、窗口尺寸、自动化结果、代理界面检查和用户验收结论。截图为补充，候选版必须可实际操作。
- 用户实际看过候选版并确认前 PR 保持 draft；相关 UI 再变化须重新验收受影响场景。验收通过后仍须用户明确同意才 merge；日常安装更新另行授权。
- 保留既有生活日、日期、记录身份与数据边界，不改真实个人记录、不增加依赖或服务。旧 #28–#34、#19 的其他未验收项不随本轮关闭。
- 本次只发布实施队列，不代表认领或启动实现。

## Blocked by

None (can start immediately).

## Implementation checkpoint

Implemented in [draft PR #40](https://github.com/absurdwall/personal-dashboard/pull/40). See [integrated acceptance evidence](../acceptance.md). Technical verification is complete; user acceptance is pending. Status remains claimed and GitHub issue remains open.
