---
name: add-portal-page
description: 在前台门户（/ 路由域）新增或修改页面时使用。涵盖路由懒加载挂载、前台禁止 antd 约束、响应式断点与滚动记忆接入。涉及 frontend/src/pages/portal/、frontend/src/routes/portalRouter.tsx 或 PortalLayout 时检索本技能。
---

# Skill: 新增前台门户页面

| 项 | 值 |
| --- | --- |
| skill_id | SKILL-FE-01 |
| 更新时间 | 2026-09-20 |

## 标准步骤

1. `frontend/src/pages/portal/` 下新建 PascalCase 页面组件；**禁止 import antd**（前台 chunk 不含 antd，误引入会使门户首屏体积超标）。
2. 在 `frontend/src/routes/portalRouter.tsx` 挂路由，组件用 `React.lazy` 包裹。
3. 页面在 `PortalLayout` 内容区渲染；布局形态由布局层 CSS Grid 决定，页面只管内容。
4. 树导航交互通过 `docTreeStore`，不直接操作 DOM。
5. 消费新接口：先在 `frontend/src/api/portalApi.ts` 封装（公开接口，无鉴权头）。
6. 响应式：确认 <768px 表现（断点常量 `utils/breakpoints.ts`）。
7. 完成后执行 `scripts/verify.ps1 -Scope quick`。

## 已知坑与规避

- 前台滚动位置记忆依赖 `viewerPrefsStore` 的 `docId -> scrollTop`，新页面有滚动容器需接入 `useScrollMemory`。
- Vite 代理 `/api` → `localhost:8080`，开发期接口 404 先确认后端是否启动。

## 相关文件

- `frontend/src/layouts/PortalLayout.tsx`
- `frontend/src/routes/portalRouter.tsx`
