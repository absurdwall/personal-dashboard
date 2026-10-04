> 发布时正文副本；正式票为 [GitHub #33](https://github.com/absurdwall/personal-dashboard/issues/33)，当前状态以 GitHub 为准。

## Parent

https://github.com/absurdwall/personal-dashboard/issues/28

## What to build

会话历史和当前工作区可独立收起，栏间可拖动调整并记住选择；窄窗口保留可用的主要会话区域，无需整页横向滚动。

## Acceptance criteria

- [ ] 保留既有三类内容和工作路径；左右辅助栏可收起及恢复，辅助内容始终可达。
- [ ] 拖动调宽与展开状态可记住，恢复窗口时将保存宽度约束到可用范围，不挤出输入区。
- [ ] 在日常窗口和窄窗口验证阅读、输入、发送、历史选择和当前工作操作不依赖整页横向滚动。
- [ ] 键盘操作、可访问名称、中英文界面和焦点恢复可用；草稿与会话不因布局切换丢失。
- [ ] packaged 窗口实际操作验证拖动、收起、展开、重启及窗口缩放；测试用户行为，不继续锁死旧三栏最小宽度。

## Shared verification

每票独立完成必要自动化与相关 packaged Mac 验收，使用隔离 Vault；真实布局及识别质量不能由源码断言或模拟录音代替。保留既有数据、来源、权限和草稿；不新增依赖或服务。验证基线包含已完成前置及已合入兄弟票，并回归本次触及的相邻功能。本次发布只创建实施队列，不代表认领或开始实现。

## Blocked by

None (can start immediately).
