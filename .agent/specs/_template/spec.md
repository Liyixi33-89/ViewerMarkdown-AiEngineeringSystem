# Spec: <任务/需求名称>

| 项 | 值 |
| --- | --- |
| spec_id | SPEC-<里程碑>-<序号>（如 SPEC-M2-03） |
| status | draft / active / done / frozen |
| owner | @某人 |
| created_at / last_verified_at | 日期 |
| 关联文档 | docs/PRD.md 章节、docs/技术设计文档.md 章节 |

## 1. 目标（任务目标写这里，不写进 AGENTS.md）

一句话描述本次改动要达成什么。

## 2. 范围

- 涉及目录/模块：
- 明确不做：

## 3. 契约（接口/组件签名/数据结构）

```text
<在此粘贴 API 签名、DTO、组件 props 等契约；契约变更必须先改这里并同步技术设计文档>
```

## 4. 任务清单

见同目录 `tasks.md`（checkbox 即进度）。

## 5. 验收标准

见同目录 `acceptance.md`；完成后逐项勾选并注明验证方式。

## 6. 实现备注（实现后回填）

- 决策与原因：
- 踩坑（→ 触发 skill 回写）：
