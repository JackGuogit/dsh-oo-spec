# Listing this plugin in the DSH plugin community

The community list is [awesome-dsh-plugin](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin). Adding one line there is what makes the plugin show up on <https://awesome-dsh-plugin.com> and inside the plugin market's Discover tab; both are generated from that list.

## The line to add

Category **Skills** (`### Skills`), inserted alphabetically by `owner/repo` — between the `J…` and `L…` entries when sorted case-insensitively.

`README.md` (English):

```markdown
- [JackGuogit/dsh-oo-spec](https://github.com/JackGuogit/dsh-oo-spec) - Turns the four-gate object-oriented design method into an enforceable workflow: one skill routes requirement, domain, design and implementation work to nine judgement cards, and five tools search the bundled spec, read a card, look up original-text anchors, build the ≤5-question block complete with defaults, and check a deliverable's slots, use cases, relation multiplicities, change windows and design↔code class parity with line-number evidence; a composer control opens the whole spec in-app. The gate checks are text heuristics, not a parser.
```

`README.zh.md`:

```markdown
- [JackGuogit/dsh-oo-spec](https://github.com/JackGuogit/dsh-oo-spec) - 把面向对象四段流程（需求→领域→设计→实现）的闸门与九张判定卡做成可执行工作流：一个 skill 按任务路由到卡片，五个工具负责检索规范、读卡、取原文锚点、生成 ≤5 题合规提问块、并按判据核对交付物的槽位/用例/重数/变化时间窗与设计↔代码类集合一致性（带行号证据）；输入框工具行的按钮可直接翻开全文。检查为文本启发式，并非语法解析。
```

## Steps

```sh
# 1. fork the list (web UI: Fork), then:
git clone git@github.com:<you>/awesome-dsh-plugin.git
cd awesome-dsh-plugin
# 2. add the two lines above in their sections
git checkout -b add-dsh-oo-spec
git commit -am "Add JackGuogit/dsh-oo-spec"
git push origin add-dsh-oo-spec
# 3. open the PR against awesome-dsh-plugin/awesome-dsh-plugin:main
```

Reviewer checks, so they are already satisfied here:

- `dsh plugin add` works: `dsh.bundle.patch` is declared and the row id is `oo-spec`.
- The description matches the source: one skill, five tools, one UI control — nothing else is registered.
- The plugin is maintained in this repository, MIT licensed, with source, tests (`npm test`) and the packaged file list in `files`.

## Before the PR

```sh
git tag v1.0.0 && git push origin v1.0.0
```

`.github/workflows/release.yml` then packs the tarball and publishes it as a release asset, so a listing reviewer can install the same bytes the market would use:

```sh
dsh plugin --profile <profile> add https://github.com/JackGuogit/dsh-oo-spec/releases/download/v1.0.0/dsh-oo-spec-1.0.0.tgz
```
