---
name: frontend-style-priority
description: 前端代码书写的层级优先级硬约束：能用 CSS class 不用内联 style、能用 React 机制不用裸 JS、能用 TS 不用 JS 逃逸。适用场景：frontend/src 下任何组件/样式/交互的新增或修改；出现 style={{}}、addEventListener、document.querySelector、as any、@ts-ignore 等写法时触发本约束。检索关键词：样式优先级、内联 style、原生 DOM 操作、React 规范、TS 类型逃逸、代码层级。
---

# 前端书写层级优先级（硬约束）

## 核心规则（每层：上层可用则禁止降级到下层）

```text
L1 能用框架机制，不用手写：
    事件 → 组件 props（onClick/onChange），禁止 addEventListener / dispatchEvent
    DOM 引用 → ref + useRef，禁止 document.querySelector/getElementById
    路由跳转 → useNavigate/<Navigate>，禁止 location.href / history.pushState
    状态 → useState/useReducer/Zustand，禁止全局可变变量模拟状态
    列表渲染 → map + key，禁止手动拼接 innerHTML / dangerouslySetInnerHTML

L2 能用 CSS class，不用内联 style：
    静态/可枚举样式 → className + CSS 文件（含 CSS 变量），禁止 style={{...}}
    动态值（如颜色随数据变）才允许内联 style，且须注释原因
    例外：AntD 组件上的 style 用于对抗 cssinjs 优先级（见下）

L3 能用 TypeScript 类型，不用 JS 逃逸：
    禁止 as any / @ts-ignore / @ts-nocheck / 非 null 断言滥用
    类型不全时先用 unknown 收窄、或补齐类型定义，而不是绕过检查
    第三方缺类型 → 写 .d.ts 声明，不用 require 逃逸

L4 能用现有工具/组件，不用重造：
    请求 → src/api/ 封装；树操作 → utils/tree；断点 → utils/breakpoints
    Markdown 渲染 → components/markdown/MarkdownViewer 统一管线
    与 antd-component-first skill 联动：后台 UI 用 AntD，前台自研
```

## 为什么（背景）

2026-09-21 后台重构时两起返工的教训固化：
1. 样式写进 CSS 文件被 AntD v5 cssinjs 运行时注入压掉（加载顺序），顶栏错位返工三次
   ——但修复方案是「内联 style」而非 CSS，因为对抗 cssinjs 时内联优先级最高。
   本 skill 的 L2 规则因此含例外条款；判断标准是**是否与 AntD 同元素抢样式**。
2. 多层 shell 转义、裸 DOM 操作等都出过静默失败（详见 linux-deploy-static skill）。

## 已知例外（白名单）

| 场景 | 允许的写法 | 原因 |
| --- | --- | --- |
| AntD 组件布局覆盖 | 组件上内联 style | cssinjs 注入顺序压过外部 CSS，内联优先级最高 |
| 随数据动态变化的样式值 | 内联 style + 注释 | class 无法参数化 |
| 前台（portal）原生实现 | 不用 antd | AGENTS.md 5.1：前台禁 AntD，antd-component-first 仅约束后台 |
| 纯算法/工具函数 | 原生 JS 逻辑 | L1 只约束 UI/DOM 交互层 |

## 自查清单（review/verify 时逐条过）

- [ ] 新增 style={{}} 是否属于白名单例外？否则迁移到 CSS class
- [ ] 是否有 addEventListener / querySelector / location.href？改 React 机制
- [ ] 是否有 as any / @ts-ignore？先尝试类型收窄
- [ ] 是否重复造轮子（请求/树工具/渲染管线）？改用既有封装
