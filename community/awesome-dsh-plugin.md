# 上架 awesome-dsh-plugin（官方社区列表）

这份文件记录**真实**的投稿方式与当前卡点。社区列表的正文（两个 README）由脚本生成，**不接受手工编辑 README**；投稿 = 在他们的仓库里新增**一个 YAML 文件**。

## 那一份文件

路径：`data/plugins/JackGuogit__dsh-oo-spec.yml`（仓库名里 `/` 换成 `__`）

内容（本仓库已备好一份：[community/data-plugins/JackGuogit__dsh-oo-spec.yml](data-plugins/JackGuogit__dsh-oo-spec.yml)）：

```yaml
url: https://github.com/JackGuogit/dsh-oo-spec
name: JackGuogit/dsh-oo-spec
category: skill
description:
  en: 'Object-oriented design work run through four gates and nine judgement cards: one skill routes requirement, domain, design and implementation tasks; five tools search and read the bundled spec, resolve original-text anchors, build the ≤5-question block with defaults, and check a deliverable for missing slots, use-case parts, relation multiplicities, change windows and design↔code class parity with line-number evidence; a composer control opens the spec in-app. The gate checks are text heuristics.'
  zh: '把面向对象四段流程（需求→领域→设计→实现）做成可执行工作流：一个 skill 按任务路由到九张判定卡；五个工具检索与读取规范、取原文锚点、生成 ≤5 题合规提问块、按闸门判据核对交付物的槽位/用例/重数/变化时间窗与设计↔代码类集合一致性（带行号证据）；输入框工具行按钮可直接翻开规范全文。闸门检查为文本启发式。'
icon: https://raw.githubusercontent.com/JackGuogit/dsh-oo-spec/main/assets/icon-180.png
```

`category` 只能取他们的固定集合之一，本插件选 `skill`（一个 skill + 五个工具 + 一个输入框按钮）。

## 提交门槛逐条对照

| 门槛 | 状态 |
|---|---|
| `package.json` 声明 `dsh.bundle`，并有 `cordis.patch.yml` | ✅ 已有（row id `oo-spec`） |
| 仓库有真实可用代码（不是占位/纯 README） | ✅ 21 篇规范 + 5 个工具 + UI，`npm test` 可跑 |
| 仓库**创建满 1 天**（CI 自动查） | ⏳ 仓库创建于 2026-11-15 04:35Z，**2026-11-16 04:35Z 之后**才可用 |
| 仓库加 `dsh-plugin` topic | ❌ 待设置（需要 GitHub 写权限的用户操作或 API 令牌） |
| 描述属实、无营销词 | ✅ 明确写了「文本启发式」这一限制 |

## 三条命令（在你自己的机器上）

```sh
# 1. 先 Fork（网页点 Fork），然后
git clone git@github.com:<you>/awesome-dsh-plugin.git
cd awesome-dsh-plugin
cp /path/to/dsh-oo-spec/community/data-plugins/JackGuogit__dsh-oo-spec.yml data/plugins/
git checkout -b add-dsh-oo-spec
git add data/plugins/JackGuogit__dsh-oo-spec.yml
git commit -m "Add JackGuogit/dsh-oo-spec"
git push origin add-dsh-oo-spec
# 2. 对 awesome-dsh-plugin/awesome-dsh-plugin:main 开 PR
# 3. 不要动 README，合并后由脚本生成
```

设置 topic（网页操作）：仓库首页右侧齿轮 → Topics 填 `dsh-plugin`。

## 更快的替代：发 npm

官方索引只收录**有 npm 版本**的条目；包名 `dsh-oo-spec` 在 npm 上**未被占用**（`registry.npmjs.org/dsh-oo-spec` 返回 404）。发布后：

```sh
npm login                 # 交互式，需你在自己终端里完成
npm publish --access public
```

此后 `dsh plugin add dsh-oo-spec` 直接可装，并且会出现在 `https://cdn.jsdelivr.net/npm/dsh-plugin-catalog/index.json` 这份 format-1 索引里（dsh 0.2.1+ 的 **插件 → 发现 → 索引源** 可直接添加该 URL）。
