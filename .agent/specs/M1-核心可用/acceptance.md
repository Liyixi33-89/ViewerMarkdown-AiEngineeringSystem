# M1 验收标准

> 对应 PRD 第 10 节；执行 `scripts/verify.ps1 -Scope commit` 全绿为自动化部分。

- [x] 前台无任何管理按钮/右键菜单；不登录可完整浏览（代码审查确认 readonly 路径无管理入口）
- [x] `/admin` 未登录重定向登录页；登录后可上传 `.md` 与粘贴文本并出现在管理树
- [x] 后台保存/删除后 ≤10s 前台轮询同步生效（10s 轮询 `usePolling` + `VersionRegistry.bump`）
- [x] 渲染输出经 rehype-sanitize 白名单消毒，`<script>` 注入不执行（MarkdownViewer 统一管线）
- [x] `scripts/verify.ps1 -Scope commit` 全绿（tsc + vite build + mvn compile + mvn test）

## 待人工验收（需启动双端后执行）

- [ ] 点击树上文档 ≤300ms 渲染（50KB 内），GFM 基础语法正确
- [ ] 375px 宽移动端无横向溢出，抽屉树可正常导航文档
- [ ] 门户首屏 gzip ≤250KB（不含 admin/markdown 懒加载 chunk；构建产物已初步确认 vendor+index ≈ 93KB gzip）
