# dsh-oo-spec

面向对象设计规范（四道闸门 + 九张判定卡）的 DeepSeek Harness 插件：一个按需加载的 skill 负责路由，五个工具负责检索、读卡、原文锚点核对与**交付物机械判定**，另附应用内规范浏览器。

English | [中文](README.zh.md)

## 装

```sh
# 本机目录（开发用）
dsh plugin --profile <profile> add /absolute/path/to/dsh-oo-spec

# 或从 GitHub
dsh plugin --profile <profile> add github:JackGuogit/dsh-oo-spec
```

桌面端也可在 **插件 → 添加插件** 里填 GitHub 地址或选择本地目录。

## 它给你什么

| 能力 | 说明 |
|---|---|
| skill `oo-spec` | 按「你在做什么」路由到 1–2 张卡，并把宪法 12 条红线直接摆在模型面前；不整包塞上下文 |
| `oo_spec_search` | 在宪法/闸门/9 卡/表/反例/24 题/原文锚点里检索，返回 `docId:line` 与片段 |
| `oo_spec_read` | 按 id 读全文：`constitution`、`gates`、`C01`…`C09`、两张表、四篇示例、两篇评测、`anchors` |
| `oo_gate_check` | 按 G1–G4 的**可机械检查**判据核对交付物：14 槽三态、用例四段与异常流、领域类追溯、关系重数、抽象的变化点/时间窗、TODO 闭合、设计↔代码类集合双向一致 |
| `oo_ask_plan` | 把缺口变成合规提问块：≤5 题、B 级优先、每题带推荐/理由/后果/默认动作，并生成《假设与待确认清单》 |
| `oo_spec_anchor` | 取原文锚点编号（`rag #073` 形式），让结论可核对 |
| 应用内浏览器 | 输入框工具行的 `OO 规范` 按钮打开全屏浮层：左侧目录 + 搜索，右侧渲染全文，不联网 |

## 四道闸门

```
G1 需求模型 ──→ G2 领域模型 ──→ G3 设计模型 ──→ G4 实现模型
```

每道闸门有输入、动作、交付物、**通过判据**与失败模式；闸门串联不可跳，`UNKNOWN-B` 未闭合不许进入下一阶段。判定口径见 `spec/10-flow-gates.md`。

## 例子

```
用户：按这份需求给我类图和建表语句
模型：（加载 oo-spec）先跑 G1：14 槽里性能/可靠性/安全性为 UNKNOWN-B，
      用 oo_ask_plan 生成 3 个选择题，并声明不回复则按推荐继续……
```

```
用户：帮我看看这份领域模型
模型：oo_gate_check(gate="G2", content=...) →
      G2.2 ✗ 3 个领域类未注明来源用例（L12/L15/L19）
      G2.3 ✗ 2 条关系未标重数（L22/L24）
      G2.5 ✗ `价格` 被立成类（L17）
```

## 边界（诚实说明）

- 闸门检查是**文本启发式**，认的是规范规定的写法（`KNOWN/ASSUMED/UNKNOWN` 槽位表、`【用例名称】`/`UC-xx` 用例块、抽象旁的 `变化点`/`时间窗`、`实现映射` 段）。换一种写法会误报，按条目当清单用，行号只当线索。
- G4 的类集合对账比对 PascalCase 标识符与 `class`/`interface`/`record`/`enum`/`struct` 声明，不解析别名与泛型。
- 规范以中文为主；应用内标签跟随浏览器语言。
- 不注入系统提示、不写会话状态：不加载 skill、不调工具时，它不改变任何行为。

## 开发

```sh
node scripts/selftest.mjs      # 15 项确定性自测：检索/读文档/锚点/四道闸门/提问块
node scripts/build-client.mjs  # 由 client.src.js + spec/ 生成 client.js
```

目录：

```
index.js              Host 入口：注册 skill provider 与 5 个工具
lib/corpus.js         文档注册表、分块索引、检索、锚点解析
lib/gates.js          G1–G4 判据实现
lib/ask.js            提问块与假设清单
lib/tools.js          5 个工具定义（参数/输出/render）
lib/skill.md          skill 正文（路由表 + 宪法红线）
client.src.js         UI 模板（composer 按钮 + 全屏浮层）
client.js             生成产物：内联全部规范文档
spec/                 规范包原件（宪法/闸门/9 卡/表/示例/评测/锚点）
```

## 许可

代码 MIT。`spec/` 下的规范内容整理自《编程的逻辑：如何用面向对象方法实现复杂业务需求》（李运华，电子工业出版社，2020），随包原样保留，仅作方法条目与判定条件引用。
