# components/semantic —— 语义组件层

G 类三层分层解耦（`docs/design/修改方案-G类-分层解耦-2026-09-29.md`）定义的**新增组件默认落点**。
本目录组件在 raw 原语与 ui 存量原子之上封装出「带基线的语义整体」，是基线变更的隔离层。

## 层规则（依赖矩阵详见 G 类方案 §2.2）

- **实现方式**：内部组合 `components/raw/` 原语与 `components/ui/` 原子（R5）；不得反向依赖业务模块（R6，lint:layers 强制）。
- **可被业务面消费**（modules/shared/app → semantic 放行）——这正是本层存在的意义。
- **目录内禁止裸写交互元素**：no-naked-controls 对本目录**不豁免且为 error 级**（裁决 G3）——button/input 等必须走 RawButton / RawInput 等**具名出口**。

## props 面封闭（裁决 G8）

语义组件是基线变更的隔离层，调用方不得绕过基线，因此：

- **不接 `className`**（形态由组件自身语义负责，不做样式透传口子）；
- **不透传 `variant` / 任意样式 props**；
- **不 `extends React.HTMLAttributes<…>`**（防开放 DOM props 面稀释封闭性；确需事件就显式声明具体 props，如 `onClick` / `onRemove`）。

首期为代码审查约定（批 G1 起落实到首个组件 Chip 并沉淀 raw vs ui 边界判例）；第二个语义组件出现时抽 ESLint 规则转机械化（二期）。

## 判例（后续语义组件照此裁断）

**判例一（2026-09-29，Chip / G8 落点）——「容器可点击」的展示件不是动作钮**：
chip/tag/徽章类组件的可点击语义用 `RawButton` 承载（button 元素可达性 + `type="button"`
防表单误提交），**不用 `<Button>`**——它们不参与宪法 §4.5 动作钮形态收敛，换 Button 会把
非动作钮卷进 variant/size 轴。纯展示态（无交互 props）用 `span`。尾部关闭钮同理走
`RawButton`。参考实现：同目录 `chip.tsx`（含 props 封闭复核记录）。
