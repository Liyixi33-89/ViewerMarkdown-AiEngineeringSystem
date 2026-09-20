---
name: verify-workflow
description: 任何代码改动完成后的统一验证流程。涵盖 scripts/verify.ps1 的 quick/commit/ci 三级验证选择、失败重试上限、经验回写义务与环境缺失时的如实上报。每次编辑代码后或验证失败排查时检索本技能。
---

# Skill: 验证工作流（Agent 改动后的必经步骤）

| 项 | 值 |
| --- | --- |
| skill_id | SKILL-VERIFY-01 |
| 更新时间 | 2026-09-20 |

## 分级验证

| Scope | 命令 | 内容 | 用途 |
| --- | --- | --- | --- |
| quick | `scripts/verify.ps1 -Scope quick` | 前端 `tsc --noEmit` + 后端 `mvn compile` | 迭代中每次改动后（目标 <1min） |
| commit | `scripts/verify.ps1 -Scope commit` | quick + 前端 `vite build` + 后端 `mvn test` | 提交前 |
| ci | `scripts/verify.ps1 -Scope ci` | commit + E2E（M2 接入 Playwright） | 联调/交付前 |

## 规则

1. 失败先读脚本分组输出的首个错误，修复后重跑同 scope。
2. 同一错误最多重试 2 次；仍失败换思路或上报，禁止静默跳过。
3. 验证失败原因属可复用经验 → 回写 `.agent/skills/<name>/SKILL.md`（义务，非可选）。
4. 环境缺失（无 mvn / 无 node_modules）时脚本会明确 SKIP，此时如实上报环境限制，不假装通过。

## 已知坑与规避

- Windows 执行策略拦截脚本：用 `powershell -ExecutionPolicy Bypass -File scripts/verify.ps1`。
- 后端首次编译需拉取 Maven 依赖（网络敏感）；离线时 quick 环节跳过后端并明确说明。
- PowerShell 中 `mvn` 输出偶发 `[Exit code: 1]` 但 BUILD SUCCESS：以脚本内的 PASS/FAIL 汇总行为准（已踩过：`Select-String "BUILD"` 管道使 exit code 失真）。
- UTF-8 BOM 问题：Windows 工具生成的文件可能带 BOM，导致 Vite/PostCSS 解析 JSON 失败（`Unexpected token '﻿'`）；修复方式为剥离前 3 字节 `EF BB BF`。反向坑：**含中文注释的 .ps1 必须保留 BOM**——PowerShell 5.1 对无 BOM 文件按 ANSI/GBK 解码，中文会被误读成伪引号导致大面积语法错误且报错位置与实际内容错位。
- 端口占用排查：netstat 显示 LISTENING 不等于自己的服务在跑（本机 8080 被 svchost/HTTP.sys 长期占用）；先用 `Get-Process -Id <pid>` 确认占用者身份再选端口。当前后端固定 8090。
- 后台方式启动服务失败时无输出：改前台运行拿真实报错；Spring Boot 启动失败常见根因是 SQL 初始化（如 H2 未配 `spring.sql.init.schema-locations` 建表脚本）。

## 相关文件

- `scripts/verify.ps1`
- `.agent/specs/M1-核心可用/`（当前任务验收标准）
