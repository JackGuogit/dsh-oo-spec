/**
 * Bundled OO spec corpus: document registry, block index, keyword search, and
 * anchor lookup over the shipped `spec/` directory.
 *
 * Everything here is read-only and derived from files shipped in the package,
 * so results are reproducible and cost no host service.
 */

import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

/** Root of the bundled spec files, resolved next to the package. */
export const SPEC_ROOT = fileURLToPath(new URL('../spec/', import.meta.url))

/** Document registry: stable ids the tools and the skill use. */
export const DOCS = [
  { id: 'constitution', path: '00-constitution.md', kind: 'constitution', title: '00 · 宪法（L0，12 条）' },
  { id: 'gates', path: '10-flow-gates.md', kind: 'gates', title: '10 · 流程闸门（L1）' },
  { id: 'readme', path: 'README.md', kind: 'index', title: '规范包 README / 路由表' },
  { id: 'C01', path: 'cards/C01-requirement-5w1h8c.md', kind: 'card', card: 'C01', title: 'C01 需求 5W1H8C', trigger: '新需求 / PRD / 需求评审' },
  { id: 'C02', path: 'cards/C02-usecase.md', kind: 'card', card: 'C02', title: 'C02 用例', trigger: '写用例 / 用例评审' },
  { id: 'C03', path: 'cards/C03-domain-nouns.md', kind: 'card', card: 'C03', title: 'C03 领域名词', trigger: '从需求推导业务实体' },
  { id: 'C04', path: 'cards/C04-class-mapping.md', kind: 'card', card: 'C04', title: 'C04 类映射', trigger: '把实体变成类' },
  { id: 'C05', path: 'cards/C05-cohesion-test.md', kind: 'card', card: 'C05', title: 'C05 内聚测试', trigger: '判断一个类该不该拆' },
  { id: 'C06', path: 'cards/C06-coupling-grade.md', kind: 'card', card: 'C06', title: 'C06 耦合分级', trigger: '依赖太多 / 改一处炸一片' },
  { id: 'C07', path: 'cards/C07-solid-and-nop.md', kind: 'card', card: 'C07', title: 'C07 SOLID 与 NOP', trigger: '类设计评审（SOLID / 反过度设计）' },
  { id: 'C08', path: 'cards/C08-pattern-selection.md', kind: 'card', card: 'C08', title: 'C08 模式选型', trigger: '想引入设计模式 / 抽象' },
  { id: 'C09', path: 'cards/C09-dynamic-model.md', kind: 'card', card: 'C09', title: 'C09 动态模型', trigger: '需要状态图 / 序列图 / 活动图' },
  { id: 'cohesion-levels', path: 'tables/cohesion-levels.md', kind: 'table', title: '内聚七级判定表' },
  { id: 'variation-to-pattern', path: 'tables/variation-to-pattern.md', kind: 'table', title: '变化 → 模式选型表' },
  { id: 'golden-path', path: 'examples/golden-path-pos.md', kind: 'example', title: '黄金链路：合格的产出长什么样' },
  { id: 'anti-over-split', path: 'examples/anti-01-over-split.md', kind: 'example', title: '反例 01：过度拆分' },
  { id: 'anti-skip-8c', path: 'examples/anti-02-skip-8c.md', kind: 'example', title: '反例 02：8C 全空直接开设计' },
  { id: 'anti-pattern-for-pattern', path: 'examples/anti-03-pattern-for-pattern.md', kind: 'example', title: '反例 03：为模式而模式' },
  { id: 'eval-cases', path: 'evals/cases.md', kind: 'eval', title: '评测用例（24 题）' },
  { id: 'eval-rubric', path: 'evals/rubric.md', kind: 'eval', title: '评分表（四维 + 通过线）' },
  { id: 'anchors', path: 'rag/anchors.md', kind: 'anchors', title: '原文锚点表（source 指向这里）' },
]

const BY_ID = new Map(DOCS.map((doc) => [doc.id, doc]))

/** Accepted `scope` values for search. */
export const SCOPES = ['all', 'cards', 'gates', 'tables', 'examples', 'evals', 'anchors']

const SCOPE_KINDS = {
  all: null,
  cards: ['card'],
  gates: ['constitution', 'gates', 'index'],
  tables: ['table'],
  examples: ['example'],
  evals: ['eval'],
  anchors: ['anchors'],
}

/** @type {Map<string, Promise<{ doc: object, title: string, text: string, blocks: object[] }>>} */
const loaded = new Map()
let indexPromise
let anchorPromise

/**
 * Filesystem-safe read of one bundled document.
 *
 * @param {object} doc - registry entry.
 * @returns {Promise<{ doc: object, title: string, text: string, blocks: object[] }>} parsed document.
 */
async function loadDoc(doc) {
  const cached = loaded.get(doc.id)
  if (cached) return cached
  const pending = (async () => {
    const text = await readFile(join(SPEC_ROOT, doc.path), 'utf8')
    const title = doc.title ?? firstHeading(text) ?? doc.id
    return { doc, title, text, blocks: splitBlocks(text) }
  })()
  loaded.set(doc.id, pending)
  return pending
}

/**
 * The document's first level-1 heading.
 *
 * @param {string} text - markdown source.
 * @returns {string | undefined} heading text.
 */
function firstHeading(text) {
  const match = /^#\s+(.+)$/m.exec(text)
  return match ? match[1].trim() : undefined
}

/**
 * Split markdown into searchable blocks of contiguous non-empty lines.
 *
 * @param {string} text - markdown source.
 * @returns {object[]} blocks with 1-based `line` and `text`.
 */
function splitBlocks(text) {
  const lines = text.split(/\r?\n/)
  const blocks = []
  let start = 0
  let buffer = []
  const flush = () => {
    if (buffer.length === 0) return
    blocks.push({ line: start + 1, text: buffer.join('\n') })
    buffer = []
  }
  lines.forEach((line, i) => {
    if (line.trim() === '') {
      flush()
      start = i + 1
      return
    }
    if (buffer.length === 0) start = i
    buffer.push(line)
  })
  flush()
  return blocks
}

const CJK = /[\u3400-\u9fff]/

/**
 * Tokenize mixed Chinese/English text: ASCII words plus CJK bigrams.
 *
 * @param {string} text - any text.
 * @returns {string[]} tokens.
 */
export function tokenize(text) {
  const lower = String(text).toLowerCase()
  const tokens = lower.match(/[a-z0-9_]{2,}/g) ?? []
  const runs = lower.match(/[\u3400-\u9fff]+/g) ?? []
  for (const run of runs) {
    if (run.length === 1) {
      tokens.push(run)
      continue
    }
    for (let i = 0; i + 1 < run.length; i += 1) tokens.push(run.slice(i, i + 2))
  }
  return tokens
}

/**
 * Build (once) the block index with document frequency for scoring.
 *
 * @returns {Promise<{ rows: object[], df: Map<string, number>, total: number }>} index.
 */
function buildIndex() {
  if (indexPromise) return indexPromise
  indexPromise = (async () => {
    const rows = []
    const df = new Map()
    for (const doc of DOCS) {
      const parsed = await loadDoc(doc)
      for (const block of parsed.blocks) {
        const tokens = tokenize(`${doc.id} ${parsed.title} ${block.text}`)
        if (tokens.length === 0) continue
        const tf = new Map()
        for (const token of tokens) tf.set(token, (tf.get(token) ?? 0) + 1)
        for (const token of tf.keys()) df.set(token, (df.get(token) ?? 0) + 1)
        rows.push({ doc: parsed, line: block.line, text: block.text, tf, length: tokens.length })
      }
    }
    return { rows, df, total: rows.length }
  })()
  return indexPromise
}

/**
 * Cut a block down to a readable snippet around the first matched term.
 *
 * @param {string} text - block text.
 * @param {string[]} terms - query tokens.
 * @param {number} max - character budget.
 * @returns {string} snippet, with an ellipsis when shortened.
 */
function snippet(text, terms, max) {
  const flat = text.replace(/\s+/g, ' ').trim()
  if (flat.length <= max) return flat
  const lower = flat.toLowerCase()
  let at = -1
  for (const term of terms) {
    const found = lower.indexOf(term)
    if (found >= 0 && (at < 0 || found < at)) at = found
  }
  if (at < 0) return `${flat.slice(0, max)}…`
  const start = Math.max(0, at - Math.floor(max / 3))
  const cut = flat.slice(start, start + max)
  return `${start > 0 ? '…' : ''}${cut}${start + max < flat.length ? '…' : ''}`
}

/**
 * Keyword search across the bundled corpus.
 *
 * @param {string} query - natural-language query.
 * @param {object} [options] - search options.
 * @param {string} [options.scope] - one of {@link SCOPES}.
 * @param {number} [options.limit] - maximum results.
 * @param {number} [options.snippetChars] - snippet budget per result.
 * @returns {Promise<object>} search result with `hits` and match metadata.
 */
export async function search(query, options = {}) {
  const scope = SCOPES.includes(options.scope) ? options.scope : 'all'
  const limit = clampInt(options.limit, 1, 20, 6)
  const budget = clampInt(options.snippetChars, 120, 2000, 480)
  const terms = [...new Set(tokenize(query))].filter((token) => token.length > 0)
  if (terms.length === 0) return { query, scope, terms, hits: [], total: 0, docs: DOCS.length }
  const { rows, df, total } = await buildIndex()
  const kinds = SCOPE_KINDS[scope]
  const scored = []
  for (const row of rows) {
    if (kinds && !kinds.includes(row.doc.doc.kind)) continue
    let score = 0
    for (const term of terms) {
      const tf = row.tf.get(term)
      if (!tf) continue
      const idf = Math.log(1 + total / (df.get(term) ?? 1))
      score += (1 + Math.log(tf)) * idf
    }
    if (score <= 0) continue
    score /= Math.sqrt(row.length)
    if (row.doc.doc.kind === 'card' || row.doc.doc.kind === 'constitution' || row.doc.doc.kind === 'gates') score *= 1.15
    scored.push({ row, score })
  }
  scored.sort((a, b) => b.score - a.score || a.row.line - b.row.line)
  const hits = scored.slice(0, limit).map(({ row, score }) => ({
    docId: row.doc.doc.id,
    title: row.doc.title,
    kind: row.doc.doc.kind,
    line: row.line,
    score: Number(score.toFixed(3)),
    snippet: snippet(row.text, terms, budget),
  }))
  return { query, scope, terms, hits, total: scored.length, docs: DOCS.length }
}

/**
 * Read whole documents by id, with a character budget.
 *
 * @param {string[]} ids - document ids from {@link DOCS}.
 * @param {number} [maxChars] - total character budget.
 * @returns {Promise<{ docs: object[], unknown: string[], truncated: boolean, chars: number }>} content.
 */
export async function readDocs(ids, maxChars = 12000) {
  const budget = clampInt(maxChars, 800, 60000, 12000)
  const out = []
  const unknown = []
  let used = 0
  let truncated = false
  for (const id of ids) {
    const doc = BY_ID.get(String(id).trim())
    if (!doc) {
      unknown.push(String(id))
      continue
    }
    const parsed = await loadDoc(doc)
    let text = parsed.text
    const room = budget - used
    if (room <= 0) {
      truncated = true
      break
    }
    if (text.length > room) {
      text = `${text.slice(0, room)}\n…[truncated]`
      truncated = true
    }
    out.push({ id: doc.id, title: parsed.title, kind: doc.kind, text })
    used += text.length
  }
  return { docs: out, unknown, truncated, chars: used }
}

/**
 * Document ids grouped by kind, for prompts and the skill catalog.
 *
 * @returns {{ cards: string[], tables: string[], examples: string[], evals: string[], core: string[] }} groups.
 */
export function docGroups() {
  const groups = { cards: [], tables: [], examples: [], evals: [], core: [] }
  for (const doc of DOCS) {
    if (doc.kind === 'card') groups.cards.push(doc.id)
    else if (doc.kind === 'table') groups.tables.push(doc.id)
    else if (doc.kind === 'example') groups.examples.push(doc.id)
    else if (doc.kind === 'eval') groups.evals.push(doc.id)
    else groups.core.push(doc.id)
  }
  return groups
}

/**
 * Parse the anchor table so a conclusion can cite `rag/anchors.md` ids.
 *
 * @returns {Promise<object[]>} anchors as `{ id, chapter, lines, page, lead }`.
 */
function loadAnchors() {
  if (anchorPromise) return anchorPromise
  anchorPromise = (async () => {
    const parsed = await loadDoc(BY_ID.get('anchors'))
    const anchors = []
    for (const line of parsed.text.split(/\r?\n/)) {
      if (!line.startsWith('|')) continue
      const cells = line.split('|').slice(1, -1).map((cell) => cell.trim())
      if (cells.length < 5 || cells[0] === 'id' || /^-+$/.test(cells[0])) continue
      anchors.push({ id: cells[0], chapter: cells[1], lines: cells[2], page: cells[3], lead: cells[4] })
    }
    return anchors
  })()
  return anchorPromise
}

/**
 * Fuzzy anchor lookup by id fragment or lead-text keyword.
 *
 * @param {string} query - anchor id fragment or text.
 * @param {number} [limit] - maximum anchors.
 * @returns {Promise<object[]>} matching anchors.
 */
export async function findAnchors(query, limit = 5) {
  const anchors = await loadAnchors()
  const needle = String(query).trim().toLowerCase()
  if (needle === '') return anchors.slice(0, clampInt(limit, 1, 30, 5))
  const exact = anchors.filter((anchor) => anchor.id.toLowerCase() === needle)
  if (exact.length > 0) return exact
  const partial = anchors.filter((anchor) => anchor.id.toLowerCase().includes(needle))
  if (partial.length > 0) return partial.slice(0, clampInt(limit, 1, 30, 5))
  const terms = [...new Set(tokenize(needle))]
  const scored = anchors
    .map((anchor) => {
      const hay = `${anchor.id} ${anchor.chapter} ${anchor.lead}`.toLowerCase()
      let score = 0
      for (const term of terms) if (hay.includes(term)) score += term.length
      return { anchor, score }
    })
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score)
  return scored.slice(0, clampInt(limit, 1, 30, 5)).map((row) => row.anchor)
}

/**
 * Clamp an optional integer option.
 *
 * @param {unknown} value - raw value.
 * @param {number} min - lower bound.
 * @param {number} max - upper bound.
 * @param {number} fallback - used when the value is not a finite number.
 * @returns {number} clamped integer.
 */
function clampInt(value, min, max, fallback) {
  const num = Number(value)
  if (!Number.isFinite(num)) return fallback
  return Math.min(max, Math.max(min, Math.trunc(num)))
}

/** True when the string contains at least one CJK character. */
export const hasCjk = (text) => CJK.test(String(text))
