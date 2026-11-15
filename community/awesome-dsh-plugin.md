# Listing this plugin in the DSH plugin community

The community list is [awesome-dsh-plugin](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin). Adding one line there is what makes the plugin show up on <https://awesome-dsh-plugin.com> and inside the plugin market's Discover tab; both are generated from that list.

## The line to add

Category **Skills** (`### Skills`), inserted alphabetically by `owner/repo` 鈥?between the `J鈥 and `L鈥 entries when sorted case-insensitively.

`README.md` (English):

```markdown
- [JackGuogit/dsh-oo-spec](https://github.com/JackGuogit/dsh-oo-spec) - Turns the four-gate object-oriented design method into an enforceable workflow: one skill routes requirement, domain, design and implementation work to nine judgement cards, and five tools search the bundled spec, read a card, look up original-text anchors, build the 鈮?-question block complete with defaults, and check a deliverable's slots, use cases, relation multiplicities, change windows and design鈫攃ode class parity with line-number evidence; a composer control opens the whole spec in-app. The gate checks are text heuristics, not a parser.
```

`README.zh.md`:

```markdown
- [JackGuogit/dsh-oo-spec](https://github.com/JackGuogit/dsh-oo-spec) - 鎶婇潰鍚戝璞″洓娈垫祦绋嬶紙闇€姹傗啋棰嗗煙鈫掕璁♀啋瀹炵幇锛夌殑闂搁棬涓庝節寮犲垽瀹氬崱鍋氭垚鍙墽琛屽伐浣滄祦锛氫竴涓?skill 鎸変换鍔¤矾鐢卞埌鍗＄墖锛屼簲涓伐鍏疯礋璐ｆ绱㈣鑼冦€佽鍗°€佸彇鍘熸枃閿氱偣銆佺敓鎴?鈮? 棰樺悎瑙勬彁闂潡銆佸苟鎸夊垽鎹牳瀵逛氦浠樼墿鐨勬Ы浣?鐢ㄤ緥/閲嶆暟/鍙樺寲鏃堕棿绐椾笌璁捐鈫斾唬鐮佺被闆嗗悎涓€鑷存€э紙甯﹁鍙疯瘉鎹級锛涜緭鍏ユ宸ュ叿琛岀殑鎸夐挳鍙洿鎺ョ炕寮€鍏ㄦ枃銆傛鏌ヤ负鏂囨湰鍚彂寮忥紝骞堕潪璇硶瑙ｆ瀽銆?```

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
- The description matches the source: one skill, five tools, one UI control 鈥?nothing else is registered.
- The plugin is maintained in this repository, MIT licensed, with source, tests (`npm test`) and the packaged file list in `files`.

## Before the PR

```sh
git tag v1.0.2 && git push origin v1.0.2
```

`.github/workflows/release.yml` then packs the tarball and publishes it as a release asset, so a listing reviewer can install the same bytes the market would use:

```sh
dsh plugin --profile <profile> add https://github.com/JackGuogit/dsh-oo-spec/releases/download/v1.0.2/dsh-oo-spec-1.0.0.tgz
```
