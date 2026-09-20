# MD Viewer — Markdown 文档预览门户 + 后台管理系统

前台纯只读预览门户（PC + 移动端）+ 后台管理中心（上传/组织文档）。前后端分离。

## 文档

- `docs/PRD.md` — 产品需求（v1.3）
- `docs/技术设计文档.md` — 架构、API、数据库设计（v1.0）
- `AGENTS.md` — AI 协作规范（技术栈/权限分级/编码规范/验证闭环）
- `.agent/` — AI 工程体系（specs 任务规范 / skills 固化经验）

## 目录

```text
frontend/   React 18 + Vite + TS（前台 / + 后台 /admin 双路由域）
backend/    Java 17 + Spring Boot 3（portal 公开只读 + admin 鉴权管理）
sql/        建表脚本
scripts/    统一验证入口
docs/       基线文档（冻结）
.agent/     AI 工程体系
```

## 快速启动

```powershell
# 1. 数据库：MySQL 8 执行 sql/init.sql（默认库名 md_viewer）
# 2. 后端：
cd backend
# 修改 application.yml 中数据库连接
mvn spring-boot:run            # http://localhost:8090  接口文档 /doc.html
# 3. 前端：
cd frontend
npm install
npm run dev                    # http://localhost:5173  代理 /api → 8090
# 4. 默认管理员：admin / admin123（首次启动后请修改密码）
```

## 验证

```powershell
powershell -ExecutionPolicy Bypass -File scripts/verify.ps1 -Scope quick|commit|ci
```
