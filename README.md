# dsh-oo-spec

The object-oriented design spec — four gates and nine judgement cards — as a DeepSeek Harness plugin: one on-demand skill that routes the model to the right card, five tools that search, read, anchor, and **mechanically check** a deliverable, and an in-app spec browser.

English | [中文](README.zh.md)

## Install

```sh
# local checkout (development)
dsh plugin --profile <profile> add /absolute/path/to/dsh-oo-spec

# or from GitHub
dsh plugin --profile <profile> add github:JackGuogit/dsh-oo-spec
```

On the desktop app, use **Plugins → Add plugin** with either the GitHub URL or a local directory.

## What you get

| Capability | Detail |
|---|---|
| skill `oo-spec` | Routes by task to one or two cards and puts the twelve constitution rules in front of the model, instead of loading the whole package |
| `oo_spec_search` | Ranked blocks with `docId:line` across the constitution, gates, nine cards, two tables, four worked examples, 24 eval cases, and the original-text anchors |
| `oo_spec_read` | Whole documents by id: `constitution`, `gates`, `C01`…`C09`, `cohesion-levels`, `variation-to-pattern`, the examples, the eval cases, `anchors` |
| `oo_gate_check` | Per-criterion verdicts for G1–G4 with line evidence: 14 slots in three states, use-case four parts and ≥2 exception flows, domain classes traced to `UC-xx`, relation multiplicities, change point plus time window per abstraction, closed `TODO(BLOCKING)`, design↔code class parity |
| `oo_ask_plan` | A compliant question block — at most five gaps, blocking first, each with recommendation, reason, cost of being wrong, and the default taken when nobody replies — plus the assumption ledger |
| `oo_spec_anchor` | The original-text anchor id so a conclusion can be checked against the book |
| Spec browser | An `OO 规范` control in the composer tool row opens a searchable overlay with the whole bundled spec; nothing is fetched |

## The four gates

```
G1 requirement ──→ G2 domain ──→ G3 design ──→ G4 implementation
```

Each gate has inputs, actions, deliverables, pass criteria, and failure modes. They run in order and cannot be skipped; an open `UNKNOWN-B` slot blocks the next gate. The criteria live in `spec/10-flow-gates.md`.

## Examples

```
User: give me the class diagram and DDL for this requirement
Model: (loads oo-spec) G1 first — performance, reliability, and security are UNKNOWN-B,
       so oo_ask_plan produces three choice questions and declares the defaults…
```

```
User: review this domain model
Model: oo_gate_check(gate="G2", content=...) →
      G2.2 ✗ 3 domain classes cite no use case (L12/L15/L19)
      G2.3 ✗ 2 relations carry no multiplicity (L22/L24)
      G2.5 ✗ `价格` was promoted to a class (L17)
```

## Limits

- Gate checks are text heuristics. They recognise the shapes the spec prescribes (slot tables with `KNOWN`/`ASSUMED`/`UNKNOWN`, `【用例名称】`/`UC-xx` use-case blocks, `变化点`/`时间窗` beside an abstraction, an `实现映射` section). A deliverable written another way produces false gaps; treat the criteria as a checklist and the line numbers as pointers.
- The G4 parity check compares PascalCase identifiers with `class`/`interface`/`record`/`enum`/`struct` declarations; aliases and generics are not resolved.
- The spec is Chinese-first. In-app labels follow the browser language.
- No system prompt text is injected and no session state is written: nothing changes until the skill is loaded or a tool is called.

## Development

```sh
node scripts/selftest.mjs      # 15 deterministic checks: search, read, anchors, all four gates, question planner
node scripts/build-client.mjs  # regenerate client.js from client.src.js + spec/
```

```
index.js              Host entry: skill provider + five tools
lib/corpus.js         Document registry, block index, search, anchor lookup
lib/gates.js          G1–G4 criteria
lib/ask.js            Question block and assumption ledger
lib/tools.js          Tool definitions (parameters, output schema, render)
lib/skill.md          Skill body: routing table plus the constitution
client.src.js         UI template: composer control and full-screen overlay
client.js             Generated: every spec document inlined
spec/                 The spec package as shipped
```

## License

Code MIT. The spec content under `spec/` is a judgement-condition set assembled from 《编程的逻辑：如何用面向对象方法实现复杂业务需求》(李运华, 电子工业出版社, 2020) and is kept as-is for reference.
