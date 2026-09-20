---
name: frontend-layout-debug
description: 前台布局类「组件不显示」问题的排查路径。适用场景：数据接口正常但 UI 元素不可见、侧栏/树/面板空白、怀疑渲染丢失时。检索关键词：树不显示、侧栏空白、布局塌陷、grid 列宽 0、persist 恢复、collapsed 锁死、布局调试。
---

# 前台布局调试（「树不回显」类问题）

## 排查路径（按此顺序，别瞎猜）

```text
1. 先验证数据层：curl 后端接口 + 经 Vite 代理各测一次 —— 排除接口问题
2. 再验证数据到达组件：临时调试页复刻数据逻辑（fetch + buildTree），
   把结果渲染到页面 DOM 里读取（别依赖 Console 截图 OCR，不可靠）
3. 最后验证布局层：临时调试页输出布局度量到 DOM：
   - 元素 offsetWidth/offsetHeight（宽高为 0 = 布局塌陷）
   - getComputedStyle 的 gridTemplateColumns/rows、transform、position、overflow
   - 元素 className（找 collapsed/hidden 类）
   - window.innerWidth + matchMedia 断点判定（是否误入移动端分支）
4. 修复后删除调试页与调试路由，tsc + build 验证
```

## 本次实际根因（2026-09-20 案例）

**现象**：/doc 左侧树空白，但接口正常、数据正常、tree-node 渲染了 10 个。

**根因链**：
1. `viewerPrefsStore` 用 zustand `persist` 把 `sidebarCollapsed: true` 存进 localStorage（用户点过折叠按钮）
2. 刷新后 persist 恢复折叠态，`.portal-main.collapsed` 把 grid 列宽设为 `0px`
3. **展开按钮在侧栏内部**——宽 0 后按钮也不可见，用户被锁死在折叠态
4. 视觉表象 = 「树不回显」，极易误判为数据/渲染 bug

**修复**：
1. 短期：折叠态在内容区渲染固定定位的展开按钮（`.sidebar-expand-fab`，fixed 左下角）——
   任何「折叠自身」的 UI 都必须在折叠区外保留恢复入口。
2. 终局（2026-09-20 后续）：折叠态不再持久化——`viewerPrefsStore` 移除 `sidebarCollapsed`
   字段（persist 加 `partialize` 只存 theme/scrollPositions），折叠态改为 PortalLayout
   本地 `useState`，每次刷新默认展开。UI 临时态（折叠/抽屉/选中态）一律不进 localStorage。

## 已知坑与规避

- **persist 恢复的布尔状态会跨会话锁死 UI**：设计折叠/隐藏类功能时必须先问
  「恢复入口在哪」。入口在被隐藏元素内 = 死锁。
- **Console 截图 OCR 不可靠**：多行 JSON/长字符串会被大模型幻觉污染。
  调试输出一律渲染到页面 DOM（白色背景大字标签或调试页），再截图读取。
- **`querySelector` 返回 Element 类型没有 offsetWidth**：调试页 TS 会报错，
  用 `(el as HTMLElement).offsetWidth` 或干脆内联在 useEffect 里。
- Chrome 窗口缩放/半屏时 matchMedia 可能触发移动端断点——先用
  `window.matchMedia('(max-width: 767px)').matches` 确认当前断点再下结论。
