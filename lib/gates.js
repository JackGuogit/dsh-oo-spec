/**
 * Mechanical gate checks (G1–G4) over a deliverable's text.
 *
 * The rules below implement the pass criteria written in
 * `spec/10-flow-gates.md` as far as text patterns can carry them. They are
 * heuristics: a check reports what it could not find, with line evidence, so a
 * reviewer can confirm or refute a single line instead of re-reading everything.
 */

/** Gate identifiers in pipeline order. */
export const GATES = ['G1', 'G2', 'G3', 'G4']

/** The 14 requirement slots of the 5W1H8C method. */
export const SLOTS = [
  { id: 'When', names: ['when'], probe: '什么时间/季节/班次发生？' },
  { id: 'Where', names: ['where'], probe: '室内/室外？哪个国家地区？' },
  { id: 'Who', names: ['who'], probe: '哪些参与者，含非人类参与者？' },
  { id: 'What', names: ['what'], probe: '做什么、产出什么、谁能看见结果？' },
  { id: 'Why', names: ['why'], probe: '为什么做？不做会怎样？' },
  { id: 'How', names: ['how'], probe: '流程怎么走？正常流 + 异常流' },
  { id: '性能', names: ['性能', 'performance'], probe: '响应时间、吞吐量、并发量级' },
  { id: '成本', names: ['成本', 'cost', '预算'], probe: '预算上限' },
  { id: '时间', names: ['交付节点', '时间节点', '交付时间', '排期'], probe: '交付节点' },
  { id: '可靠性', names: ['可靠性', 'reliability'], probe: '允许停机时长、数据丢失容忍度' },
  { id: '安全性', names: ['安全性', 'security'], probe: '是否涉及钱、身份、医疗数据' },
  { id: '合规性', names: ['合规', 'compliance'], probe: '行业标准/法规' },
  { id: '技术性', names: ['技术性', '技术栈', 'technology'], probe: '客户是否锁定技术栈' },
  { id: '兼容性', names: ['兼容性', 'compatibility', '对接'], probe: '要与哪些既有系统对接' },
]

const TRI = /\b(KNOWN|ASSUMED|UNKNOWN)\b(?:\s*[-–—:：_/]?\s*(?:级别|level)?\s*([AB])\b)?/i
const UC_ID = /UC-\d+/i
const ARROW = /——|→|-->|==>|-{1,2}>/
const MULTIPLICITY = /\d+\.\.[n*]|\d+\.\.\d+|0\.\.1|1:\d|\d:n|至?少?[01n*]\s*(个|条|项)|(\*|\bn\b)/i
const ABSTRACTION = /(接口|抽象类|设计模式|策略模式|工厂|Factory|Strategy|Adapter|Template\s*Method|Observer|Decorator|回调|扩展点)/i
const AUXILIARY = /(Helper|Util|Utils|Factory|DAO|Dto|DTO|Repository|Converter|Mapper|Builder)/
const CHANGE_WINDOW = /(时间窗|半年|(^|[^\d])[123]\s*年|个月内|一年内|两年内|三年内|n 个月)/i
const CHANGE_POINT = /(变化点|会变|变化的是|可变量|差异点|变化因素)/
const MODEL_HINT = /(价格|数量|金额|状态|时间|名称|地址|电话|备注|编号)$/

/**
 * Split into lines and keep 1-based numbering for evidence.
 *
 * @param {string} text - deliverable text.
 * @returns {string[]} lines.
 */
const toLines = (text) => String(text ?? '').split(/\r?\n/)

/**
 * A criterion result.
 *
 * @param {object} input - criterion fields.
 * @returns {object} criterion.
 */
function criterion({ id, title, level = 'required', ok, detail, evidence = [], ref }) {
  return { id, title, level, ok, detail, evidence: evidence.slice(0, 8), ...(ref ? { ref } : {}) }
}

/**
 * Format one line of evidence.
 *
 * @param {string} line - source line.
 * @param {number} index - 0-based index.
 * @returns {{ line: number, text: string }} evidence row.
 */
const ev = (line, index) => ({ line: index + 1, text: line.trim().slice(0, 200) })

/**
 * Does a table cell or label name this slot?
 *
 * @param {string} cell - cell text.
 * @param {object} slot - slot descriptor.
 * @returns {boolean} whether the cell names the slot.
 */
function namesSlot(cell, slot) {
  const value = cell.replace(/[*`\s]/g, '').toLowerCase()
  if (value === '') return false
  return slot.names.some((name) => {
    const needle = name.toLowerCase()
    return value === needle || value.startsWith(needle)
  })
}

/**
 * Collect slot rows and their tri-state markers.
 *
 * @param {string[]} lines - deliverable lines.
 * @returns {{ found: Map<string, object>, triRows: number }} scan result.
 */
function scanSlots(lines) {
  const found = new Map()
  let triRows = 0
  lines.forEach((line, index) => {
    const tri = TRI.exec(line)
    if (!tri) return
    triRows += 1
    const cells = line.split('|').map((cell) => cell.trim()).filter((cell) => cell !== '')
    const haystack = cells.length > 1 ? cells : [line.replace(/^[-*+\s]+/, '')]
    for (const slot of SLOTS) {
      if (found.has(slot.id)) continue
      const hit = haystack.some((cell) => namesSlot(cell, slot))
      if (!hit) continue
      found.set(slot.id, {
        state: tri[1].toUpperCase(),
        level: tri[2] ? tri[2].toUpperCase() : null,
        evidence: ev(line, index),
      })
    }
  })
  return { found, triRows }
}

/**
 * Collect use-case blocks, each starting at 【用例名称】 or a UC heading.
 *
 * @param {string[]} lines - deliverable lines.
 * @returns {object[]} blocks with `start` and `lines`.
 */
function scanUseCases(lines) {
  const blocks = []
  let current
  lines.forEach((line, index) => {
    const startsHeading = /^\s*#{1,6}\s*(UC-\d+|用例)/i.test(line)
    const namesUseCase = /【用例名称】/.test(line)
    if (startsHeading || (namesUseCase && !current)) {
      if (current) blocks.push(current)
      current = { start: index + 1, lines: [line] }
      return
    }
    if (current) current.lines.push(line)
  })
  if (current) blocks.push(current)
  return blocks
}

/**
 * Count exception branches inside one use-case block.
 *
 * @param {string[]} blockLines - block lines.
 * @returns {number} number of distinct exception entries.
 */
function countExceptions(blockLines) {
  let count = 0
  let inExceptions = false
  for (const line of blockLines) {
    if (/异常/.test(line)) inExceptions = true
    if (/^\s*\d+\.\d+[\s:：.)]/.test(line)) count += 1
    else if (inExceptions && /^\s*[-*]\s*(异常|失败|超时|拒绝|余额|库存|重复|越权)/.test(line)) count += 1
  }
  return count
}

/**
 * Extract PascalCase identifiers used as class names in design text.
 *
 * @param {string} text - design document.
 * @returns {string[]} identifiers.
 */
function designClasses(text) {
  const names = new Set()
  const patterns = [/`([A-Z][A-Za-z0-9_]{2,})`/g, /(?:^|[\s|（(])([A-Z][A-Za-z0-9_]{2,})(?=[）)|，,\s]|$)/gm]
  for (const pattern of patterns) {
    let match = pattern.exec(text)
    while (match) {
      names.add(match[1])
      match = pattern.exec(text)
    }
  }
  return [...names]
}

/**
 * Extract class names declared in source code.
 *
 * @param {string} code - source text.
 * @returns {string[]} identifiers.
 */
function codeClasses(code) {
  const names = new Set()
  const pattern = /\b(?:class|interface|record|enum|struct|trait|object)\s+([A-Za-z_][A-Za-z0-9_]*)/g
  let match = pattern.exec(code)
  while (match) {
    names.add(match[1])
    match = pattern.exec(code)
  }
  return [...names]
}

/**
 * G1 — requirement model.
 *
 * @param {string[]} lines - deliverable lines.
 * @returns {object[]} criteria.
 */
function checkG1(lines) {
  const out = []
  const { found } = scanSlots(lines)
  const missing = SLOTS.filter((slot) => !found.has(slot.id))
  out.push(
    criterion({
      id: 'G1.1',
      title: '14 槽（5W1H8C）无空槽',
      ok: missing.length === 0,
      detail:
        missing.length === 0
          ? `14 槽均已落位（识别到 ${found.size} 槽）`
          : `缺 ${missing.length} 槽：${missing.map((slot) => slot.id).join('、')}`,
      evidence: missing.slice(0, 4).map((slot) => ({ line: 0, text: `${slot.id}: 未找到该槽的行（探针：${slot.probe}）` })),
      ref: '宪法 #4',
    }),
  )

  const unknownNoLevel = [...found.entries()].filter(([, row]) => row.state === 'UNKNOWN' && !row.level)
  out.push(
    criterion({
      id: 'G1.2',
      title: '每槽三态齐全，UNKNOWN 必须标级别',
      ok: unknownNoLevel.length === 0,
      detail:
        unknownNoLevel.length === 0
          ? '所有 UNKNOWN 槽都标了级别'
          : `${unknownNoLevel.length} 个 UNKNOWN 槽未标 A/B：${unknownNoLevel.map(([id]) => id).join('、')}`,
      evidence: unknownNoLevel.map(([, row]) => row.evidence),
      ref: '宪法 #4',
    }),
  )

  const blockingUnknown = [...found.entries()].filter(([, row]) => row.state === 'UNKNOWN' && row.level === 'B')
  out.push(
    criterion({
      id: 'G1.3',
      title: '无 UNKNOWN-B 槽（有则闸门阻塞）',
      level: 'blocking',
      ok: blockingUnknown.length === 0,
      detail:
        blockingUnknown.length === 0
          ? '无阻塞级缺口'
          : `${blockingUnknown.length} 个 B 级缺口未闭合：${blockingUnknown.map(([id]) => id).join('、')} → 必须先提问`,
      evidence: blockingUnknown.map(([, row]) => row.evidence),
      ref: '10-flow-gates G1 判据 2',
    }),
  )

  const useCases = scanUseCases(lines)
  out.push(
    criterion({
      id: 'G1.4',
      title: '用例存在且四段齐全（描述/价值/约束）',
      ok: useCases.length > 0,
      detail: useCases.length === 0 ? '未找到用例块（【用例名称】或 UC-xx 标题）' : `识别到 ${useCases.length} 个用例块`,
      ref: '10-flow-gates G1 判据 4',
    }),
  )

  if (useCases.length > 0) {
    const thin = useCases.filter((block) => {
      const joined = block.lines.join('\n')
      return !/【用例价值】|用例价值/.test(joined) || !/【约束和限制】|约束和限制|约束与限制/.test(joined)
    })
    out.push(
      criterion({
        id: 'G1.5',
        title: '每个用例都有【用例价值】与【约束和限制】',
        ok: thin.length === 0,
        detail: thin.length === 0 ? '用例四段齐全' : `${thin.length} 个用例缺价值或约束段`,
        evidence: thin.slice(0, 4).map((block) => ({ line: block.start, text: block.lines[0].trim().slice(0, 120) })),
        ref: 'C02 强制要求',
      }),
    )
    const weak = useCases.filter((block) => countExceptions(block.lines) < 2)
    out.push(
      criterion({
        id: 'G1.6',
        title: '每个用例至少有 2 条异常处理',
        ok: weak.length === 0,
        detail: weak.length === 0 ? '异常流数量达标' : `${weak.length} 个用例异常流 < 2`,
        evidence: weak.slice(0, 4).map((block) => ({
          line: block.start,
          text: `${block.lines[0].trim().slice(0, 80)}（异常条数 ${countExceptions(block.lines)}）`,
        })),
        ref: 'C02 强制要求 1',
      }),
    )
  }

  const untraced = []
  let section = ''
  lines.forEach((line, index) => {
    const heading = /^#{1,6}\s+(.+)$/.exec(line)
    if (heading) {
      section = heading[1]
      return
    }
    if (!/功能/.test(section)) return
    if (!/^\s*(?:\||[-*+])\s*\S/.test(line)) return
    if (/^\s*\|[\s:|-]+\|?\s*$/.test(line)) return
    if (/\|?\s*(编号|功能编号)\s*\|/.test(line)) return
    if (!UC_ID.test(line)) untraced.push(ev(line, index))
  })
  out.push(
    criterion({
      id: 'G1.7',
      title: '每条功能可追溯到用例编号',
      level: 'advisory',
      ok: untraced.length === 0,
      detail:
        untraced.length === 0
          ? '功能列表均带 UC 编号（或未提供功能列表）'
          : `${untraced.length} 行功能未写 UC 编号`,
      evidence: untraced,
      ref: '10-flow-gates G1 判据 3',
    }),
  )

  const solutionSpeak = []
  lines.forEach((line, index) => {
    if (!/^\s*[-*+]\s*/.test(line)) return
    if (!/(要提供|支持|实现|需要|要有)/.test(line)) return
    if (/(价值|受益|客户能得到|为什么)/.test(line)) return
    solutionSpeak.push(ev(line, index))
  })
  out.push(
    criterion({
      id: 'G1.8',
      title: '需求不等于功能（价值测试）',
      level: 'advisory',
      ok: solutionSpeak.length === 0,
      detail:
        solutionSpeak.length === 0
          ? '未发现"只写功能不写价值"的行'
          : `${solutionSpeak.length} 行像是功能描述，需回答"对客户有什么价值"`,
      evidence: solutionSpeak,
      ref: '宪法 #3',
    }),
  )
  return out
}

/**
 * G2 — domain model.
 *
 * @param {string[]} lines - deliverable lines.
 * @returns {object[]} criteria.
 */
function checkG2(lines) {
  const out = []
  const text = lines.join('\n')
  const hasSection = /^#{1,6}\s+.*(领域|类模型|实体)/m.test(text)
  out.push(
    criterion({
      id: 'G2.1',
      title: '存在领域模型章节',
      ok: hasSection,
      detail: hasSection ? '找到领域模型章节' : '未找到"领域模型/类模型/实体"章节标题',
      ref: '10-flow-gates G2 交付物',
    }),
  )

  let section = ''
  const untraceable = []
  const attributeClasses = []
  const tableNames = []
  const relations = []
  lines.forEach((line, index) => {
    const heading = /^#{1,6}\s+(.+)$/.exec(line)
    if (heading) {
      section = heading[1]
      return
    }
    if (/\bt_[a-z0-9_]+\b/.test(line) || /`[a-z][a-z0-9]*_[a-z0-9_]+`/.test(line)) tableNames.push(ev(line, index))
    const decl = /^\s*(?:\||[-*+])\s*`?([\u4e00-\u9fffA-Za-z][\w\u4e00-\u9fff]*)`?\s*(?:[:：(（]|$)/.exec(line)
    const inDomain = /(领域|类模型|实体|类图)/.test(section)
    if (decl && inDomain) {
      const name = decl[1]
      if (MODEL_HINT.test(name)) attributeClasses.push({ ...ev(line, index), text: `${name} 是属性，不该立成类` })
      if (!UC_ID.test(line)) untraceable.push(ev(line, index))
    }
    if (ARROW.test(line)) relations.push({ index, line })
  })

  out.push(
    criterion({
      id: 'G2.2',
      title: '每个领域类能指向用例原文名词',
      ok: untraceable.length === 0,
      detail:
        untraceable.length === 0
          ? '领域类均带 UC 编号（或未列出领域类）'
          : `${untraceable.length} 个领域类未注明来源用例`,
      evidence: untraceable,
      ref: '宪法 #6',
    }),
  )

  const noMultiplicity = relations.filter(({ line }) => !MULTIPLICITY.test(line))
  out.push(
    criterion({
      id: 'G2.3',
      title: '关系必须带重数（1..n / 0..1）',
      ok: noMultiplicity.length === 0,
      detail:
        noMultiplicity.length === 0
          ? relations.length === 0
            ? '未出现关系连线，跳过'
            : '关系均带重数'
          : `${noMultiplicity.length} 条关系未标重数`,
      evidence: noMultiplicity.map(({ line, index }) => ev(line, index)),
      ref: '10-flow-gates G2 判据 3',
    }),
  )

  out.push(
    criterion({
      id: 'G2.4',
      title: '不把数据库表名当类',
      ok: tableNames.length === 0,
      detail: tableNames.length === 0 ? '未发现表名形态的类' : `${tableNames.length} 处出现表名形态（t_xxx / snake_case）`,
      evidence: tableNames,
      ref: '10-flow-gates G2 判据 4',
    }),
  )

  out.push(
    criterion({
      id: 'G2.5',
      title: '属性不被立成类',
      ok: attributeClasses.length === 0,
      detail: attributeClasses.length === 0 ? '未发现属性型类名' : `${attributeClasses.length} 处把属性当类（价格/数量/状态…）`,
      evidence: attributeClasses,
      ref: '10-flow-gates G2 失败模式',
    }),
  )
  return out
}

/**
 * G3 — design model.
 *
 * @param {string[]} lines - deliverable lines.
 * @returns {object[]} criteria.
 */
function checkG3(lines) {
  const out = []
  const abstractions = []
  lines.forEach((line, index) => {
    if (!ABSTRACTION.test(line)) return
    if (/^\s*\|?\s*(接口|抽象类)\s*\|/.test(line)) return
    abstractions.push({ index, line })
  })

  const noChangePoint = []
  const noWindow = []
  const noCost = []
  for (const item of abstractions) {
    const window = lines.slice(Math.max(0, item.index - 2), item.index + 3).join('\n')
    if (!CHANGE_POINT.test(window)) noChangePoint.push(ev(item.line, item.index))
    if (!CHANGE_WINDOW.test(window)) noWindow.push(ev(item.line, item.index))
    if (!/(成本|代价|如果.{0,12}不发生)/.test(window)) noCost.push(ev(item.line, item.index))
  }

  out.push(
    criterion({
      id: 'G3.1',
      title: '每个抽象都说明了变化点',
      ok: noChangePoint.length === 0,
      detail:
        abstractions.length === 0
          ? '未引入抽象，跳过'
          : noChangePoint.length === 0
            ? `${abstractions.length} 处抽象都带变化点说明`
            : `${noChangePoint.length} 处抽象缺变化点`,
      evidence: noChangePoint,
      ref: '宪法 #7',
    }),
  )
  out.push(
    criterion({
      id: 'G3.2',
      title: '每个抽象都有变化时间窗',
      ok: noWindow.length === 0,
      detail:
        abstractions.length === 0
          ? '未引入抽象，跳过'
          : noWindow.length === 0
            ? '时间窗齐全（半年/1-3 年等）'
            : `${noWindow.length} 处抽象缺时间窗`,
      evidence: noWindow,
      ref: '宪法 #8',
    }),
  )
  out.push(
    criterion({
      id: 'G3.3',
      title: '过度设计自查（变化不发生时的成本）',
      level: 'advisory',
      ok: noCost.length === 0,
      detail: noCost.length === 0 ? '已给出抽象成本判断' : `${noCost.length} 处抽象未回答"1 年内不变则成本多少"`,
      evidence: noCost,
      ref: 'C07 / NOP',
    }),
  )

  const auxLines = []
  lines.forEach((line, index) => {
    if (AUXILIARY.test(line)) auxLines.push(ev(line, index))
  })
  const auxMarked = lines.some((line) => /辅助类/.test(line))
  out.push(
    criterion({
      id: 'G3.4',
      title: '辅助类有标注与用途',
      ok: auxLines.length === 0 || auxMarked,
      detail:
        auxLines.length === 0
          ? '未出现辅助类'
          : auxMarked
            ? '辅助类已标注用途'
            : `${auxLines.length} 处辅助类（Helper/Factory/DAO/DTO…）缺少"辅助类"标注`,
      evidence: auxMarked ? [] : auxLines,
      ref: '10-flow-gates G3 判据 1',
    }),
  )
  return out
}

/**
 * G4 — implementation model.
 *
 * @param {string[]} lines - deliverable lines.
 * @param {string} code - source text, when supplied.
 * @returns {object[]} criteria.
 */
function checkG4(lines, code) {
  const out = []
  const text = lines.join('\n')
  const openTodos = []
  lines.forEach((line, index) => {
    if (!/TODO\(BLOCKING/i.test(line)) return
    if (/已闭合|closed|resolved|完成/i.test(line)) return
    openTodos.push(ev(line, index))
  })
  out.push(
    criterion({
      id: 'G4.1',
      title: '没有带进交付的 TODO(BLOCKING)',
      ok: openTodos.length === 0,
      detail: openTodos.length === 0 ? '未发现未闭合的阻塞 TODO' : `${openTodos.length} 处 TODO(BLOCKING) 仍未闭合`,
      evidence: openTodos,
      ref: '10-flow-gates G4 判据 3',
    }),
  )

  out.push(
    criterion({
      id: 'G4.2',
      title: '存在实现映射（设计与代码对账）',
      ok: /实现映射/.test(text),
      detail: /实现映射/.test(text) ? '找到实现映射段' : '未找到"实现映射"段，无法核对设计↔代码',
      ref: '10-flow-gates G4 交付物',
    }),
  )

  if (code && code.trim() !== '') {
    const design = new Set(designClasses(text))
    const impl = new Set(codeClasses(code))
    const designOnly = [...design].filter((name) => !impl.has(name))
    const codeOnly = [...impl].filter((name) => !design.has(name))
    out.push(
      criterion({
        id: 'G4.3',
        title: '类集合双向一致',
        ok: designOnly.length === 0 && codeOnly.length === 0,
        detail:
          designOnly.length === 0 && codeOnly.length === 0
            ? `一致：${impl.size} 个类双向匹配`
            : `设计有代码无：${designOnly.join('、') || '无'}；代码有设计无：${codeOnly.join('、') || '无'}`,
        ref: '10-flow-gates G4 判据 1',
      }),
    )
  } else {
    out.push(
      criterion({
        id: 'G4.3',
        title: '类集合双向一致',
        level: 'advisory',
        ok: false,
        detail: '未提供 code，跳过类集合对账（传 code 参数可启用）',
        ref: '10-flow-gates G4 判据 1',
      }),
    )
  }

  const assumptions = [...new Set(text.match(/ASSUMED-B\d+/g) ?? [])]
  const replaceable = /可替换点|替换点|配置项|策略类|接口隔离/.test(text)
  out.push(
    criterion({
      id: 'G4.4',
      title: '假设清单与可替换点一一对应',
      ok: assumptions.length === 0 || replaceable,
      detail:
        assumptions.length === 0
          ? '无 ASSUMED-B 假设'
          : replaceable
            ? `${assumptions.length} 个假设都有可替换点承接`
            : `${assumptions.length} 个假设（${assumptions.join('、')}）未落到可替换点`,
      ref: '宪法 #10 / 10-flow-gates G4 判据 4',
    }),
  )
  return out
}

const NEXT_ACTION = {
  G1: '补齐 14 槽与用例四段；存在 UNKNOWN-B 时先按宪法 #12 提问，未回复则按推荐答案继续并登记假设。',
  G2: '回到 G1 用例原文取名词：每个领域类注明 UC 号与原句，关系补重数，去掉表名形态与属性型类。',
  G3: '对每个抽象补「变化点 + 变化时间窗 + 不发生的成本」；说不出的抽象直接删掉（宪法 #7/#8）。',
  G4: '闭合 TODO(BLOCKING)，回填实现映射，把每个假设接到接口/配置等可替换点上。',
}

/**
 * Run one gate, or all gates, over a deliverable.
 *
 * @param {object} input - check input.
 * @param {string} input.gate - `G1` | `G2` | `G3` | `G4` | `all`.
 * @param {string} input.content - deliverable markdown.
 * @param {string} [input.code] - source text for the G4 class parity check.
 * @returns {object} verdict, per-criterion results, and the next action.
 */
export function checkGate({ gate, content, code }) {
  const requested = String(gate ?? 'G1').toUpperCase()
  const selected = requested === 'ALL' ? GATES : GATES.includes(requested) ? [requested] : null
  if (!selected) {
    return { ok: false, error: `unknown gate "${gate}"; expected one of ${[...GATES, 'all'].join(', ')}` }
  }
  const lines = toLines(content)
  const empty = String(content ?? '').trim() === ''
  if (empty) {
    return { ok: false, error: 'content is empty; pass the deliverable text to check' }
  }
  const perGate = selected.map((id) => {
    const criteria =
      id === 'G1' ? checkG1(lines) : id === 'G2' ? checkG2(lines) : id === 'G3' ? checkG3(lines) : checkG4(lines, code)
    const failed = criteria.filter((item) => !item.ok)
    const hardFailed = failed.filter((item) => item.level !== 'advisory')
    const advisory = failed.filter((item) => item.level === 'advisory')
    const blocked = hardFailed.filter((item) => item.level === 'blocking')
    return {
      gate: id,
      verdict: blocked.length > 0 ? 'blocked' : hardFailed.length > 0 ? 'fail' : 'pass',
      criteria,
      failed: hardFailed.map((item) => item.id),
      advisories: advisory.map((item) => item.id),
      nextAction:
        hardFailed.length === 0
          ? advisory.length === 0
            ? '本闸门通过，可进入下一阶段。'
            : `本闸门通过，但仍有 ${advisory.length} 项提醒（${advisory.map((item) => item.id).join('、')}）需要人工确认。`
          : NEXT_ACTION[id],
    }
  })
  const verdict = perGate.some((row) => row.verdict === 'blocked')
    ? 'blocked'
    : perGate.some((row) => row.verdict === 'fail')
      ? 'fail'
      : 'pass'
  return { ok: true, gate: requested, verdict, lines: lines.length, gates: perGate }
}
