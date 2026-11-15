# OO 开发规范包（AI 执行版）

> 源书：《编程的逻辑：如何用面向对象方法实现复杂业务需求》李运华，电子工业出版社 2020（ISBN 978-7-121-39402-7）
> 用途：给 AI 编码 / 设计 agent 用的**规范层**。不是书摘，不是教程，是判定条件集合。

## 加载规则（必须遵守）

1. **永远先加载** `00-constitution.md`（约 1.2k token）——它是优先级裁决器。
2. 按下面路由表**只加载 1–2 张卡**，不要一次全读。
3. 需要原文细节 → 用 `rag/`（`python rag/build_index.py -q "关键词"`），不要整本读。

## 路由表

| 你在做什么 | 加载 |
|---|---|
| 拿到新需求 / 写 PRD / 需求评审 | `10-flow-gates.md`（G1）+ `cards/C01` + `cards/C02` |
| 从需求推导业务实体 | `cards/C03` + G2 |
| 把实体变成类 | `cards/C04` + G3 |
| 判断一个类该不该拆 | `cards/C05` + `tables/cohesion-levels.md` |
| 依赖太多 / 改一处炸一片 | `cards/C06` |
| 类设计评审（SOLID） | `cards/C07` |
| 想引入设计模式 / 抽象 | `cards/C08` + `tables/variation-to-pattern.md` |
| 需要状态图、序列图、活动图 | `cards/C09` |
| 实现阶段 / 代码与设计对不上 | G4 |
| 校验 AI 是否守住规范 | `evals/cases.md` + `evals/rubric.md` |
| 新手看"合格的产出长什么样" | `examples/golden-path-pos.md` |
| 看"错的长什么样" | `examples/anti-*.md` |

## 目录

```
00-constitution.md      L0 宪法 12 条 + 冲突优先级
10-flow-gates.md        L1 四道闸门 + 5W1H8C 槽位表 + 提问模板
cards/C01-requirement-5w1h8c.md   C06-coupling-grade.md
cards/C02-usecase.md              C07-solid-and-nop.md
cards/C03-domain-nouns.md         C08-pattern-selection.md
cards/C04-class-mapping.md        C09-dynamic-model.md
cards/C05-cohesion-test.md        L2 操作卡（统一 schema）
tables/                 L3 可机械查表
examples/               L4 黄金链路 + 三组反例对
evals/                  L5 24 题 + 评分表
rag/                    原文切块 + 倒排索引 + 锚点表
```

## 使用红线

- **不许跳闸门**（宪法 #5）：跳步必须写明理由与补偿措施。
- **缺口必须三态**（宪法 #4）：`KNOWN` / `ASSUMED` / `UNKNOWN`，不许留空、不许编造。
- **结论必须带锚点**：卡片里 `source` 指向 `rag/anchors.md` 的 id；查不到锚点的结论视为不成立。

## 文件规格

| 项 | 值 |
|---|---|
| 全包字符数 | ≈ 36k 汉字（含示例与评测） |
| L0 单文件 | ≈ 1.4k 字 |
| 单卡 | ≈ 700–1000 字 |
| **常规调用** | **L0 + 2 卡 ≈ 3k 字 ≈ 2.2k token** |
| 原文切块 | 339 块，见 `rag/chunks/chunks.jsonl` |

> 只读 README 里的路由表 + 命中的卡片，不要整包塞进上下文。

## 维护约定

- 改任何条文 → 跑 `evals/` 24 题 → 相对空基线提升 < 30 个百分点则该条文作废，删除而不是保留。
- 新增条文必须同时给：判定方式、反例、`source`。
- 版本记录写在文件末尾 `## 变更`。
