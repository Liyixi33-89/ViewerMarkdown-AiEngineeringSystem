# Spec: M1 里程碑（核心可用）

| 项 | 值 |
| --- | --- |
| spec_id | SPEC-M1-00 |
| status | active |
| owner | @team |
| created_at / last_verified_at | 2026-09-20 / 2026-09-20 |
| 关联文档 | PRD 全文（M1 范围）、技术设计文档第 2/3/5 章 |

## 1. 目标

交付可演示的双端原型：前台只读门户（PC + 移动端）完整渲染回显；后台登录后可上传/新建/删除文档；后台变更 ≤10s 同步前台。

## 2. 范围

- 涉及模块：前端全部、后端 portal/admin 模块、`sql/init.sql`
- 明确不做（M2+）：编辑模式分屏、拖拽排序、回收站页、全文检索、TOC、公式、Mermaid、WebSocket

## 3. 契约

见 `docs/技术设计文档.md` 3.3 节（API）、3.2 节（表结构）；错误码见 3.3.3。契约变更必须先改文档再用码。

## 4. 任务清单（进度见 tasks.md）

范围拆解与执行顺序见同目录 `tasks.md`。

## 5. 实现备注（实现后回填）

- 前端开发期 Vite 代理直连 `http://localhost:8090`。
- 后端开发默认 H2 内存库（零配置启动），生产切 MySQL 执行 `sql/init.sql`。
