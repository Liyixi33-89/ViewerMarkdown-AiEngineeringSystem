# .agent/ — AI 工程体系

本目录是项目的 "AI 开发操作系统"：上下文、规范、经验、验证的统一入口。

## 目录结构

```text
.agent/
├── README.md            # 本文件：启动方式、安全边界
├── specs/               # 需求规范（每需求一目录，spec-kit 风格）
│   ├── _template/       # 新需求模板：spec.md / tasks.md / acceptance.md
│   └── M1-核心可用/     # 当前活跃：spec（目标契约）/ tasks（进度）/ acceptance（验收）
└── skills/              # 固化的可复用经验（Agent Skills 标准格式）
    ├── _template/       # 新建 skill 模板（SKILL.md 含 YAML frontmatter）
    ├── add-portal-page/
    ├── add-admin-api/
    ├── antd-component-first/   # 后台 UI 必须 AntD 组件优先，禁原生弹窗
    ├── frontend-layout-debug/  # 「组件不显示」类问题的三层排查路径
    └── verify-workflow/
```

## 格式约定（对齐开源标准）

- **skills**：每个 skill 一个目录，内含 `SKILL.md`，文件头为 YAML frontmatter（`name` + `description`），description 写明触发场景与检索关键词 —— 兼容 Anthropic Agent Skills 规范，可被 Claude Code / Cursor 等工具自动发现。
- **specs**：采用 spec-kit 风格三件套 —— `spec.md`（目标/范围/契约）、`tasks.md`（checkbox 进度）、`acceptance.md`（验收标准，含人工验收项）。

## 快速上手（给 Agent 的启动指令）

1. 读根目录 `AGENTS.md`（技术栈、目录职责、权限分级、编码规范）。
2. 读 `.agent/specs/` 中与当前任务对应的 spec 目录（按目录名匹配）。
3. 需要复用经验时按 frontmatter description 检索 `.agent/skills/`。
4. 完成改动后执行 `scripts/verify.ps1 -Scope quick|commit|ci`。
5. 踩坑后按 `_template` 新建或更新对应 skill（义务）。

## 安全边界（禁止 AI 修改）

- `docs/`（PRD 与技术设计为冻结基线，变更需人类确认）
- `.agent/specs/` 中标记 `[FROZEN]` 的规范
- `sql/init.sql`、`pom.xml`、`package.json`、`tsconfig.json`、`.gitignore`
- 任何删除操作、生产配置、密钥文件

## 实时状态从哪里读（不要写进文档）

| 信息 | 来源 |
| --- | --- |
| 目录树/路由 | 代码本身（`frontend/src/routes/`、`backend/**/controller/`） |
| DB Schema | `sql/init.sql` |
| API 契约 | `docs/技术设计文档.md` 3.3 节 + 运行时 `/doc.html`（SpringDoc） |
| 当前进度 | `specs/<需求名>/tasks.md` 的 checkbox |
