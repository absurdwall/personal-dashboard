# Daily Record baseline and current-plan contract

Personal Dashboard reads one Daily Record for one lived calendar day. The four
established top-level sections keep their meanings:

- `今天的大致安排` is the current usable arrangement.
- `计划依据` supports the current arrangement.
- `白天更新` contains explicit events and meaningful changes.
- `晚间复盘` contains the review.

A 2.0 writer may add this optional compatible extension before those sections:

```markdown
## 早间基准

### 初始安排

- **上午：** Prepare the first important task.

### 初始计划依据

#### 固定安排

- 10:00 synthetic check-in
```

`初始安排` and `初始计划依据` describe the same starting point. They are
kept together so later evidence cannot accidentally be shown as support for an
earlier plan.

## Explicit writer transitions

The writer chooses a transition from the user's explicit context. It must not
infer the transition from clock time, reply order, elapsed plan blocks, or
silence.

| Transition | `早间基准` | Current arrangement and basis | `白天更新` |
| --- | --- | --- | --- |
| Initial generation | Create both baseline subsections | Create the same initial plan and basis | Do not invent events |
| Morning calibration | Update baseline plan and basis | Update to the same calibrated plan and basis | Record only explicit facts, if any |
| Daytime replan | Preserve byte-for-byte | Update only the current plan and basis | Briefly retain explicit original intent, known reason, and revised direction |
| Event-only record | Preserve byte-for-byte | Preserve byte-for-byte | Append only the explicit event |
| No input | Preserve byte-for-byte | Preserve byte-for-byte | Append nothing |

An explicit correction of a wrongly recorded baseline is not a daytime replan.
It may change the baseline only when the user identifies the earlier record as
wrong, and it must leave a trace of that correction.

## Synthetic conversion examples

- Waking and planning at 07:00: a stated calibration updates baseline and
  current sections together. No confirmation button is required.
- Waking and planning at 11:00: the same calibration rule applies. `11:00
  起床` may be recorded when stated; the writer does not infer that the user was
  late.
- First reply at 11:00 after reported morning work: keep the automatically
  generated baseline, record only the reported work as fact, and update the
  remaining current arrangement.
- Pure event: append the event and leave both plan representations unchanged.
- Pure replan: update the current arrangement and change summary while leaving
  the baseline unchanged; an explanation or report of earlier activity is not
  required.

These examples are exercised through the `TodayApplication` workflow tests
with an isolated synthetic vault and a fixed clock.

## Old and partial records

An old record without `早间基准` remains readable. Personal Dashboard reports
that no independent baseline was saved and never copies `今天的大致安排` into a
fictional starting point. A present but blank baseline is distinguishable from
both a missing and a populated baseline. Missing or partial optional content
does not authorize reconstruction.

## Activation boundary

This contract makes the reader and native Today view compatible with old and
new records. It does not activate a production generator. The current live
skill, real Daily Records, Dida365 data, automations, and the installed 1.0 app
remain unchanged. A future cutover must coordinate and verify the writer before
claiming an end-to-end independent-baseline loop.
