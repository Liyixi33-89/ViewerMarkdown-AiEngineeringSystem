# M1 任务清单

> 执行约定：完成一项勾选一项；全部勾选后核对 acceptance.md，再核对 PRD 第 10 节。

## 骨架与基础设施
- [x] 前端工程骨架（Vite + React 18 + TS strict + 双路由域 + 状态/请求封装）
- [x] 后端工程骨架（Spring Boot 3 + MyBatis-Plus + 统一响应/异常 + JWT + 安全配置）
- [x] 数据库建表脚本 `sql/init.sql`（doc_node / admin_user，含 path 物化路径）+ H2 开发库 schema
- [x] 统一验证入口 `scripts/verify.ps1`

## 前台门户（portal）
- [x] 响应式三栏布局（桌面三栏 / 移动抽屉，汉堡菜单）
- [x] 只读目录树（展开折叠、选中高亮、树内筛选、折叠状态持久化）
- [x] Markdown 渲染回显（GFM + 代码高亮 + 复制 + rehype-sanitize 消毒）
- [x] 面包屑 + 预览/源码切换
- [x] 名称搜索（防抖 300ms 下拉）
- [x] 版本轮询同步（10s，变更刷新树与当前文档）
- [x] 主题切换（浅色/深色/跟随系统）+ localStorage 持久化

## 后台管理（admin）
- [x] 登录页 + JWT 鉴权（RequireAuth 路由守卫 + axios 拦截器）
- [x] 管理树（操作菜单：重命名、删除、新建子文件夹/子文档）
- [x] 上传对话框（文件多选 .md + 粘贴文本实时预览）
- [x] 内容保存与重命名接口对接

## 后端接口
- [x] portal：/tree、/docs/{id}/content、/search、/version
- [x] admin auth：login（BCrypt + JWT 签发）、refresh
- [x] admin nodes：文件夹/文档 CRUD、移动排序（环检测 + 层级校验）、软删除
- [x] admin upload：文件解析入库（UTF-8 校验、重名追加后缀）、粘贴文本入库
- [x] VersionRegistry 写操作 bump
