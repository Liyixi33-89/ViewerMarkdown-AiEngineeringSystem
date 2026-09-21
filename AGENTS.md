# AGENTS.md — MD Viewer 项目 AI 协作规范

> 所有 AI Agent（编码助手/自动化脚本）在本仓库工作前必须先读本文件。
> 版本：v1.0 | last_verified_at: 2026-09-20 | owner: @team

## 1. 项目概览

- **产品**：MD Viewer —— Markdown 文档预览门户（前台只读）+ 后台管理系统
- **架构**：前后端分离；单仓库双前端路由域（`/` 门户 + `/admin` 管理）
- **文档基线**：`docs/PRD.md`（v1.3，产品需求）、`docs/技术设计文档.md`（v1.0，架构与 API）
- **里程碑**：M1 核心可用（树/渲染/上传/登录/轮询同步）→ M2 体验完善 → M3 增强

## 2. 技术栈约定（不可擅改）

| 层 | 选型 |
| --- | --- |
| 前端 | React 18 + Vite 5 + TypeScript 5（strict）、React Router 6、Zustand |
| 前端 UI | 后台用 Ant Design 5（仅 admin chunk）；前台自研样式，禁止引入 AntD |
| Markdown | react-markdown + remark-gfm + rehype-sanitize + react-syntax-highlighter |
| 后端 | Java 17 + Spring Boot 3.2 + MyBatis-Plus + MySQL 8 |
| 认证 | JWT（AccessToken 2h / RefreshToken 7d） |
| API 契约 | REST，统一响应 `{ code, msg, data }`；OpenAPI 由 SpringDoc 生成 |

## 3. 仓库结构与目录职责

```text
frontend/            # React SPA（前台 + 后台同工程双路由域）
  src/routes/        # 路由树：portalRouter（公开）/ adminRouter（<RequireAuth>）
  src/layouts/       # PortalLayout（响应式三栏/抽屉）/ AdminLayout
  src/components/    # markdown/（双端复用渲染组件）、DocTree/（readonly props 双模式）
  src/stores/        # Zustand：docTree / auth / viewerPrefs（persist localStorage）
  src/pages/         # portal/ 与 admin/ 页面
  src/api/           # axios 封装；portalApi（公开）/ adminApi（鉴权）
  src/hooks/ src/utils/
backend/             # Spring Boot 单体（分包按端隔离）
  src/main/java/com/mdviewer/
    portal/          # 前台公开只读模块（controller/service/dto）
    admin/           # 后台管理模块（auth/nodes/docs/upload/recycle）
    auth/            # JwtUtil / JwtAuthFilter
    domain/          # entity + mapper
    common/ config/ sync/
  src/main/resources/application.yml、mapper/
docs/                # PRD、技术设计文档（只读基准）
.agent/              # AI 工程体系（specs 当前任务规范 / skills 固化经验）
scripts/verify*      # 统一验证入口（Agent 改动后必须执行）
sql/init.sql         # 建表脚本（迁移需人工确认）
```

## 4. 权限分级（安全边界）

| 级别 | 路径/操作 | 规则 |
| --- | --- | --- |
| 🔴 禁止 | `docs/`、`.agent/specs/` 中 status=frozen 的 spec、`sql/init.sql` 直接改表 | AI 不得修改；需求变更需人类确认后由人类或明确授权下修改 |
| 🔴 禁止 | `.gitignore`、`package.json` 依赖增删、`pom.xml`、`tsconfig.json` | 除非用户在当前会话明确要求 |
| 🔴 禁止 | 删除文件/目录、`git push --force`、`git reset --hard`、生产配置 | 一律需人类确认 |
| 🟡 谨慎 | `src/**`（常规编码）、`.agent/skills/**`（按模板追加） | 正常修改；保持既有风格，不重构无关代码 |
| 🟢 自由 | 新增组件/hook/页面等增量文件 | 遵循命名与分层约定即可 |
| ⚠️ 永久排除 | 密钥、`.env`、真实用户数据、token | 不得写入代码/文档/日志；密钥从环境变量读取 |

## 5. 编码规范要点

### 5.1 前端

- 组件文件名 PascalCase；hook 以 `use` 开头；工具函数小驼峰。
- 组件拆分：页面级组件放 `pages/`，可复用组件放 `components/`，业务逻辑优先抽 hook。
- 状态：跨组件/跨页面状态用 Zustand store；组件内状态用 useState。禁止把服务端数据写死在 store 初值。
- 请求：只通过 `src/api/` 封装调用，组件内不得直接 import axios。
- Markdown 渲染必须走 `components/markdown/MarkdownViewer.tsx` 统一管线（含 rehype-sanitize），禁止绕过消毒直接 `dangerouslySetInnerHTML`。
- 前台组件禁止 import antd；AntD 组件只能出现在 `pages/admin/`、`layouts/AdminLayout` 及后台专用 components。
- 后台交互必须 AntD 组件优先（skill：`antd-component-first`）：输入弹窗用 Modal+Form、确认用 Modal.confirm/Popconfirm、提示用 message/notification；**禁止 window.prompt / window.confirm / window.alert**。antd 无对应组件时才可用其基础组件组装，纯逻辑工具不受限。
- 书写层级优先级（skill：`frontend-style-priority`）：**能用 React 机制不写裸 JS**（禁止 addEventListener/querySelector/location.href）；**能用 CSS class 不用内联 style**（仅 AntD cssinjs 覆盖与数据动态值例外）；**能用 TS 类型不用 JS 逃逸**（禁止 as any/@ts-ignore）。
- 响应式：断点常量统一用 `utils/breakpoints.ts`（<768 移动 / 768-1279 平板 / ≥1280 桌面），样式优先 CSS 变量。

### 5.2 后端

- 分层：Controller（参数校验/组装响应）→ Service（业务/事务）→ Mapper（数据访问）；Controller 不写业务，Service 不直接返回 HTTP 语义。
- 统一响应 `Result<T>`；业务异常抛 `BizException(code, msg)`，由全局处理器兜底。
- 错误码遵循技术设计文档 3.3.3 节（400x 参数 / 401x 认证 / 409x 冲突等），新增错误码先更新文档再使用。
- 所有写操作成功后必须调用 `VersionRegistry.bump()`（前台轮询同步依赖）。
- 前台 portal 查询强制 `deleted=0 AND status=1`（用 MyBatis-Plus 逻辑删除 + 查询封装保证）。
- 实体沿用 `doc_node` 单表 + `path` 物化路径模型；移动节点必须做环检测（禁止移动到自身子树）。

### 5.3 通用

- 注释语言跟随所在文件既有注释；新文件用中文注释业务逻辑、英文注释算法细节。
- 提交信息：`feat|fix|docs|refactor|test|chore(scope): 描述`。
- 不引入文档约定之外的新依赖（新依赖 = 修改本文件第 2 节 + 人类确认）。

## 6. 上下文预算（Agent 必读）

| 内容 | 加载时机 | 预算 |
| --- | --- | --- |
| 本文件 | 每会话常驻 | ≤200 行（当前合规） |
| `.agent/specs/` 中与任务相关的 spec | 接到任务时按需读 1-2 份 | 单份 ≤500 行 |
| 实时状态（树结构/路由表/DB schema） | 从代码/工具读取 | 禁止写进文档 |
| 代码本体 | outline → 局部读 | 禁止整仓投喂 |
| `docs/` 基线文档 | 仅按需检索相关章节 | 不整篇进上下文 |

规则：本文件禁止出现会过期的内容（任务进度、具体行数、TODO 清单）。

## 7. 验证与回流闭环（Agent 工作流）

1. **改前**：outline/read 定位目标代码；确认修改范围在权限分级内。
2. **改后必须执行** `scripts/verify.ps1`（或跨平台 `scripts/verify`），按范围选择：
   - `quick`：前端 tsc --noEmit / 后端 compile / 文档防腐检查（迭代中，每次改动后）
   - `commit`：quick + 前端 build + 后端 test（提交前）；通过后自动刷新 active spec 的 `last_verified_at`
   - `ci`：commit + E2E（联调/交付前）；CI（`.github/workflows/verify.yml`）在 push/PR 时跑 commit 级
3. **踩坑回流**：返工/验证失败原因属于"可复用经验"时，按 `.agent/skills/` 模板追加 skill 或更新对应 spec（这是义务，不是可选项）。
4. **度量自动沉淀**：每次 verify 结果自动追加到 `.agent/metrics/verify-log.jsonl`（本地数据，不入库）；人类复盘通过率/返工率时读取该文件。
5. **禁止**：验证失败就静默重试超过 2 次；必须换思路或上报。

## 8. 度量（人类复盘用，Agent 不需要执行）

- verify 一次通过率；返工率（AI 改动被大幅重写比例）；重复交代指数（同一背景多次粘贴即固化 skill）。
