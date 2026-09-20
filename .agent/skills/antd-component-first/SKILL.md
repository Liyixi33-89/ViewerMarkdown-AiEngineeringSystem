---
name: antd-component-first
description: 后台 UI 必须优先使用 AntD 组件而非原生 JS 弹窗/表单。适用场景：在 pages/admin、layouts/AdminLayout 或后台专用 components 中新增/修改交互组件；出现 window.prompt / window.confirm / window.alert / 原生 form 等写法时触发本约束。检索关键词：antd 规范、组件优先、window.prompt 替换、Modal Form、后台 UI 约束。
---

# AntD 组件优先规范（后台 UI 硬约束）

## 核心规则（优先级从高到低）

```text
1. 后台交互组件必须优先用 antd 现成组件（按交互类型对号入座）：
   文本输入弹窗   → Modal + Form + Input/Input.TextArea（禁止 window.prompt）
   确认操作       → Modal.confirm（或 Popconfirm 内联确认）（禁止 window.confirm）
   提示反馈       → message / notification（禁止 window.alert）
   下拉选择       → Select；开关 → Switch；日期 → DatePicker
   受控表单       → Form（rules 校验），禁止裸 input + 手写校验
2. antd 没有对应组件时（极少），才允许自定义实现，且必须：
   - 用 antd 基础组件（Button/Input/Tooltip 等）组装
   - 视觉对齐 antd 设计变量（token），不自造配色/圆角
3. 纯逻辑工具（防抖、格式化、URL 解析）不受本约束，正常用原生 JS 实现。
4. 前台（portal）不受本约束——前台禁用 antd（AGENTS.md 5.1），原生实现是正确的。
```

## 为什么（背景）

M1 阶段曾用 `window.prompt` 快速实现新建/重命名，交付后发现与 AntD 后台风格严重违和：
样式不可定制、无法校验、阻塞主线程、移动端体验差。本 skill 即该教训的固化——
**「能用 AntD 就不裸写，裸写必须降级到 antd 基础组件组装」**。

## 实现模式（对号入座模板）

### 输入类弹窗（新建/重命名/粘贴入库等）

```tsx
// 1. 组件持有 open + 受控值；Modal onOk 提交；Form rules 做校验
const [open, setOpen] = useState(false);
const [form] = Form.useForm();

<Modal
  open={open}
  title="新建文档"
  okText="创建"
  cancelText="取消"
  onOk={async () => {
    const values = await form.validateFields();   // 校验失败自动标红，不关窗
    await adminApi.createDoc(parentId, values.name.trim());
    message.success('已创建');
    setOpen(false);
  }}
  onCancel={() => setOpen(false)}
>
  <Form form={form} layout="vertical">
    <Form.Item name="name" label="文档标题"
      rules={[{ required: true, message: '请输入标题' },
              { max: 100, message: '不超过 100 字' }]}>
      <Input placeholder="未命名文档" maxLength={100} showCount />
    </Form.Item>
  </Form>
</Modal>
```

要点：`validateFields()` 失败自动阻断提交并高亮错误字段；弹窗打开时 `form.resetFields()` 清残留。

### 确认类操作

危险操作用 `Modal.confirm({ okButtonProps: { danger: true } })`；轻量删除可用 `Popconfirm`。

## 已知坑与规避

- **禁止 window.prompt 残留**：后台代码出现 `window.prompt|confirm|alert` 即违反本 skill，
  review/verify 时应拦截（当前 verify 不检查此项，靠 Agent 自查 + 人工 review）。
- Form 实例必须由 `Form.useForm()` 创建并传给 `<Form form={form}>`，漏传则 `validateFields` 报错。
- Modal 内异步提交要处理 loading（`confirmLoading`），防止双击重复提交。
- 多处弹窗可抽成一个受控组件（参考 `components/UploadDialog.tsx` 的 open/onClose 模式）。
