/**
 * Constitutional question planning (宪法 #12) and the assumption ledger
 * (10-flow-gates 反死锁).
 *
 * The point is to make the shape non-negotiable: at most five questions, each a
 * choice with a recommendation, a reason, the cost of choosing wrong, and the
 * default used when nobody answers.
 */

const MAX_QUESTIONS = 5

const OPEN_ENDED = /(你想怎么做|你觉得|如何设计|怎么处理才好|有什么想法|随便|都可以)/

/**
 * Normalize one gap into the fields the template prints.
 *
 * @param {object} gap - raw gap.
 * @param {number} index - position in the input.
 * @returns {object} normalized gap.
 */
function normalizeGap(gap, index) {
  const level = String(gap?.level ?? 'B').trim().toUpperCase() === 'A' ? 'A' : 'B'
  return {
    index: index + 1,
    question: String(gap?.question ?? '').trim(),
    recommend: String(gap?.recommend ?? '').trim(),
    reason: String(gap?.reason ?? '').trim(),
    consequence: String(gap?.consequence ?? '').trim(),
    level,
    impact: String(gap?.impact ?? '').trim(),
    rollback: String(gap?.rollback ?? '').trim(),
  }
}

/**
 * Build the gate question block and its assumption ledger rows.
 *
 * @param {object} input - plan input.
 * @param {string} [input.gate] - gate id the questions belong to.
 * @param {object[]} input.gaps - gaps, each `{ question, recommend, reason, consequence, level?, impact?, rollback? }`.
 * @param {number} [input.startIndex] - first assumption number, so a later round continues the ledger.
 * @returns {object} markdown, ledger rows, and form warnings.
 */
export function buildAskPlan({ gate = 'G1', gaps, startIndex = 1 }) {
  const list = Array.isArray(gaps) ? gaps.map(normalizeGap).filter((gap) => gap.question !== '') : []
  if (list.length === 0) {
    return { ok: false, error: 'gaps is empty: give at least one {question, recommend, reason, consequence}' }
  }
  const ordered = [...list].sort((a, b) => (a.level === b.level ? a.index - b.index : a.level === 'B' ? -1 : 1))
  const emitted = ordered.slice(0, MAX_QUESTIONS)
  const dropped = ordered.slice(MAX_QUESTIONS)
  const base = Math.max(1, Math.trunc(Number(startIndex) || 1))

  const assumptions = emitted.map((gap, offset) => ({
    id: `ASSUMED-${gap.level}${base + offset}`,
    content: gap.recommend || gap.question,
    basis: gap.reason || '（未给理由，需补）',
    impact: gap.impact || '（未填影响面）',
    rollback: gap.rollback || '（未填回滚方式）',
  }))

  const formWarnings = []
  emitted.forEach((gap, offset) => {
    const id = `Q${offset + 1}`
    if (OPEN_ENDED.test(gap.question)) formWarnings.push(`${id} 是开放式提问，改成"二选一/确认题"（宪法 #12）`)
    if (gap.recommend === '') formWarnings.push(`${id} 缺推荐答案（宪法 #12 要求每题给推荐）`)
    if (gap.reason === '') formWarnings.push(`${id} 缺一行理由`)
    if (gap.consequence === '') formWarnings.push(`${id} 缺"选错的后果"`)
    if (!/(A|B|是|否|一|二|选)/.test(gap.question)) formWarnings.push(`${id} 看起来不是选择题，建议给 2 个具体选项`)
  })

  const header = `【${gate} 闸门 · ${emitted.length} 项${emitted.every((gap) => gap.level === 'A') ? '待确认' : '阻塞'}缺口】（按阻塞度降序，≤5 题）`
  const body = emitted.map((gap, offset) => {
    const assumption = assumptions[offset]
    return [
      `Q${offset + 1}（${gap.level} 级）${gap.question}`,
      `   推荐：${gap.recommend || '（待补）'}`,
      `   理由：${gap.reason || '（待补，引用已知信息）'}`,
      `   选错的后果：${gap.consequence || '（待补，返工范围与量级）'}`,
      `   若无回复：按推荐继续，登记为 ${assumption.id}`,
    ].join('\n')
  })
  const footer = [
    `以上 ${emitted.length} 项不回复我将按推荐答案继续，并在交付物首页列出《假设与待确认清单》。`,
    dropped.length > 0
      ? `另有 ${dropped.length} 项（${dropped.map((gap) => gap.question).join('；')}）超出单轮 5 题，下一轮提问。`
      : '',
  ]
    .filter((line) => line !== '')
    .join('\n')

  const ledger = [
    '## 假设与待确认清单',
    '| 编号 | 假设内容 | 依据 | 影响面 | 回滚方式 |',
    '|---|---|---|---|---|',
    ...assumptions.map((row) => `| ${row.id} | ${row.content} | ${row.basis} | ${row.impact} | ${row.rollback} |`),
  ].join('\n')

  const markdown = [header, '', body.join('\n\n'), '', footer, '', ledger].join('\n')

  return {
    ok: true,
    gate,
    count: emitted.length,
    dropped: dropped.length,
    assumptions,
    formWarnings,
    markdown,
  }
}

export { MAX_QUESTIONS }
