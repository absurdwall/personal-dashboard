> 发布时正文副本；正式票为 [GitHub #32](https://github.com/absurdwall/personal-dashboard/issues/32)，当前状态以 GitHub 为准。

## Parent

https://github.com/absurdwall/personal-dashboard/issues/28

## What to build

从习惯历史选定日期后直接到达补记区，清楚显示所选日期，使用与普通习惯一致的完成／撤回交互。

## Acceptance criteria

- [ ] 历史日期入口无需用户手动滚到页面底部即可操作补记。
- [ ] 目标日期可见，完成／撤回作用于同一明确日期，刷新后展示一致。
- [ ] 复用现有本地习惯更正链路和身份，不增加第二套存储；外部证据继续只读。
- [ ] 重启、切 Vault、刷新和快速切日期不导致丢失或串写。
- [ ] 以真实 packaged 入口和隔离保存验证补记及撤回闭环。

本票处理显式历史日期，不依赖新的默认生活日；#29 负责换日规则的综合接入，避免以共享页面作为虚假阻塞。

## Shared verification

每票独立完成必要自动化与相关 packaged Mac 验收，使用隔离 Vault；真实布局及识别质量不能由源码断言或模拟录音代替。保留既有数据、来源、权限和草稿；不新增依赖或服务。验证基线包含已完成前置及已合入兄弟票，并回归本次触及的相邻功能。本次发布只创建实施队列，不代表认领或开始实现。

## Blocked by

None (can start immediately).
