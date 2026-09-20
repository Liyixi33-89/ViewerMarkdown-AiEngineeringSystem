---
name: add-admin-api
description: 为后台 /api/admin/** 或前台 /api/portal/** 新增接口时使用。涵盖契约先行原则、portal/admin 分包归属、Result/BizException 与错误码约定、VersionRegistry.bump 触发规则、软删除与 path 物化路径校验。涉及 backend 的 portal、admin 模块或接口契约变更时检索本技能。
---

# Skill: 新增后台管理接口

| 项 | 值 |
| --- | --- |
| skill_id | SKILL-BE-01 |
| 更新时间 | 2026-09-20 |

## 标准步骤

1. **契约先行**：先更新 `docs/技术设计文档.md` 3.3 节表格与对应 spec 的契约段，再写代码。
2. 按端选包：前台只读放 `portal/`，管理操作放 `admin/`；Controller 只做参数校验与响应组装，业务在 Service。
3. DTO 放同模块 `dto/`；返回一律 `Result<T>`；业务失败抛 `BizException(code, msg)`，错误码查文档 3.3.3 节。
4. 写操作成功后必须 `versionRegistry.bump()`（前台轮询同步依赖）。
5. portal 查询强制 `deleted=0 AND status=1`（走 `PortalService` 封装）；admin 查询全量。
6. 校验用 `@Valid` + jakarta.validation；重名由 Service 统一追加 `(n)` 并返回最终名（错误码 4091）。
7. 完成后执行 `scripts/verify.ps1 -Scope quick`；接口行为变化需同步前端 `src/api/` 封装。

## 已知坑与规避

- 移动节点必须环检测：`target.path LIKE concat(node.path,'%')` 命中即拒绝（4093）。
- 层级上限 5：移动前计算 `目标深度 + 子树高度`（4092）。
- `doc_node.path` 冗余列在移动/恢复后必须同步重算整棵子树，否则前缀查询结果错误。
- MyBatis-Plus `@TableLogic` 只对自动注入的查询生效；自定义 XML SQL 需手动加 `deleted=0`。
- **@TableLogic 字段不能经实体更新**：`setDeleted(1)` + `updateById()` 会被 MP 忽略（该字段由 MP 托管），导致软删除静默失败——表象是接口 200 但 portal 查询照常返回、`deleted_at` 有值而 `deleted=0`。软删除必须用显式 SQL（`@Update` 注解）直接写列。排查手段：JDBC 直查数据库对比标记位。
- **Security 白名单核对**：`/auth/refresh` 这类「自携带凭证」的接口必须 permitAll，否则过期后无法无感续期（前端只存 refreshToken 不调用等于功能缺失，核查脚本要把「前端是否真的用了某接口」纳入范围）。
- **搜索接口必须过滤节点类型**：portal 搜索若不过滤 `type=DOC`，文件夹会出现在搜索结果里，前端点击后 `getDocContent` 抛 4041 导致导航失败（已修复：PortalService.search 加 `eq(type, TYPE_DOC)`）。
- **H2 内存库重启即丢数据**：`jdbc:h2:mem:` 仅进程存活期间有效，开发演示务必用文件模式 `jdbc:h2:file:./data/md_viewer`（数据落 `backend/data/`，已入 .gitignore）。
- PowerShell 里用 curl `-d` 传含 `\n` 的 JSON 会被转义截断导致后端 Jackson 报 `Unexpected end-of-input`；正确做法是 JSON 写入临时文件后 `--data-binary "@file.json"`。

## 相关文件

- `backend/src/main/java/com/mdviewer/common/Result.java`、`BizException.java`
- `backend/src/main/java/com/mdviewer/sync/VersionRegistry.java`
