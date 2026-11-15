/**
 * Model-facing tools of the OO spec bundle.
 *
 * Each tool reads only bundled data plus the text the caller supplies: nothing
 * is written, nothing leaves the process.
 */

import { checkGate, GATES } from './gates.js'
import { buildAskPlan } from './ask.js'
import { DOCS, SCOPES, findAnchors, readDocs, search } from './corpus.js'

/** Wrap text for a tool result. */
const text = (value) => [{ type: 'text', text: value }]

/** Clamp a numeric option. */
function num(value, min, max, fallback) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return fallback
  return Math.min(max, Math.max(min, Math.trunc(parsed)))
}

const SEARCH_TOOL = {
  name: 'oo_spec_search',
  description:
    'Keyword search over the bundled OO design spec (L0 constitution, four gates, nine operation cards, cohesion/coupling tables, golden path and anti-pattern examples, 24 eval cases, and the original-text anchor table). Use it before proposing or reviewing a design so a conclusion can cite a document id and line instead of memory. Returns ranked blocks with `docId`, `line`, and a bounded snippet; load full documents with oo_spec_read.',
  parameters: {
    type: 'object',
    additionalProperties: false,
    required: ['query'],
    properties: {
      query: { type: 'string', description: 'What to look up, in Chinese or English. Keywords, not a question.' },
      scope: {
        type: 'string',
        enum: SCOPES,
        description: 'Limit to one group of documents. Default all.',
      },
      limit: { type: 'integer', description: 'Maximum hits, 1-20. Default 6.' },
      snippetChars: { type: 'integer', description: 'Characters per snippet, 120-2000. Default 480.' },
    },
  },
  output: {
    schema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        query: { type: 'string' },
        scope: { type: 'string' },
        total: { type: 'integer' },
        docs: { type: 'integer' },
        terms: { type: 'array', items: { type: 'string' } },
        hits: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            properties: {
              docId: { type: 'string' },
              title: { type: 'string' },
              kind: { type: 'string' },
              line: { type: 'integer' },
              score: { type: 'number' },
              snippet: { type: 'string' },
            },
          },
        },
      },
    },
    render(_args, value) {
      if (!value || !Array.isArray(value.hits) || value.hits.length === 0) {
        return text(`未命中：query=${value?.query ?? ''} scope=${value?.scope ?? 'all'}。换更短的关键词，或用 oo_spec_read 直接读卡片。`)
      }
      const body = value.hits
        .map(
          (hit, i) =>
            `${i + 1}. [${hit.docId}:${hit.line}] ${hit.title}（${hit.kind}, score ${hit.score}）\n   ${hit.snippet}`,
        )
        .join('\n')
      return text(`${value.hits.length} 条命中（共 ${value.total} 个候选块，语料 ${DOCS.length} 篇）：\n${body}`)
    },
  },
  async execute(args) {
    const query = String(args?.query ?? '').trim()
    if (query === '') throw new Error('oo_spec_search: query is required')
    return search(query, {
      scope: typeof args?.scope === 'string' ? args.scope : 'all',
      limit: num(args?.limit, 1, 20, 6),
      snippetChars: num(args?.snippetChars, 120, 2000, 480),
    })
  },
}

const READ_TOOL = {
  name: 'oo_spec_read',
  description:
    'Load whole OO spec documents by id: constitution, gates, readme, C01-C09 (operation cards), cohesion-levels, variation-to-pattern, golden-path, anti-over-split, anti-skip-8c, anti-pattern-for-pattern, eval-cases, eval-rubric, anchors. Load the constitution first, then at most two cards. Output is capped; request fewer ids instead of a bigger cap.',
  parameters: {
    type: 'object',
    additionalProperties: false,
    required: ['ids'],
    properties: {
      ids: {
        type: 'array',
        items: { type: 'string' },
        description: 'Document ids, in reading order.',
      },
      maxChars: { type: 'integer', description: 'Total character budget, 800-60000. Default 12000.' },
    },
  },
  output: {
    schema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        chars: { type: 'integer' },
        truncated: { type: 'boolean' },
        unknown: { type: 'array', items: { type: 'string' } },
        docs: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            properties: {
              id: { type: 'string' },
              title: { type: 'string' },
              kind: { type: 'string' },
              text: { type: 'string' },
            },
          },
        },
      },
    },
    render(_args, value) {
      const parts = (value?.docs ?? []).map((doc) => `## ${doc.id} · ${doc.title}\n\n${doc.text}`)
      if (value?.unknown?.length) parts.push(`未识别的 id：${value.unknown.join('、')}（可用：${DOCS.map((d) => d.id).join(', ')}）`)
      if (value?.truncated) parts.push('…已达字符上限，继续读请减少 ids。')
      return text(parts.join('\n\n') || '没有读到内容。')
    },
  },
  async execute(args) {
    const ids = Array.isArray(args?.ids) ? args.ids.map((id) => String(id)) : []
    if (ids.length === 0) throw new Error('oo_spec_read: ids must contain at least one document id')
    return readDocs(ids, num(args?.maxChars, 800, 60000, 12000))
  },
}

const GATE_TOOL = {
  name: 'oo_gate_check',
  description:
    'Check a deliverable against one OO gate and return per-criterion verdicts with line evidence: G1 (14 slots + tri-state + use-case four parts + ≥2 exception flows + function traceability), G2 (domain class → use case, multiplicity, table-name and attribute-as-class smells), G3 (every abstraction has a change point, a change time window, and a no-change cost), G4 (no open TODO(BLOCKING), implementation mapping, design↔code class parity, assumptions mapped to replaceable points). Heuristic text checks: use the reported gaps as a checklist, not as proof. `all` runs G1-G4.',
  parameters: {
    type: 'object',
    additionalProperties: false,
    required: ['content'],
    properties: {
      gate: {
        type: 'string',
        enum: [...GATES, 'all'],
        description: 'Gate to check, or `all`. Default G1.',
      },
      content: { type: 'string', description: 'The deliverable markdown to check (slot table, use cases, domain model, design model, or implementation mapping).' },
      code: { type: 'string', description: 'Optional source text for the G4 class-parity check.' },
    },
  },
  output: {
    schema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        ok: { type: 'boolean' },
        gate: { type: 'string' },
        verdict: { type: 'string' },
        lines: { type: 'integer' },
        error: { type: 'string' },
        gates: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            properties: {
              gate: { type: 'string' },
              verdict: { type: 'string' },
              nextAction: { type: 'string' },
              failed: { type: 'array', items: { type: 'string' } },
              advisories: { type: 'array', items: { type: 'string' } },
              criteria: {
                type: 'array',
                items: {
                  type: 'object',
                  additionalProperties: false,
                  properties: {
                    id: { type: 'string' },
                    title: { type: 'string' },
                    level: { type: 'string' },
                    ok: { type: 'boolean' },
                    detail: { type: 'string' },
                    ref: { type: 'string' },
                    evidence: {
                      type: 'array',
                      items: {
                        type: 'object',
                        additionalProperties: false,
                        properties: {
                          line: { type: 'integer' },
                          text: { type: 'string' },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    render(_args, value) {
      if (!value || value.error) return text(`检查未执行：${value?.error ?? '未知原因'}`)
      const blocks = value.gates.map((gate) => {
        const healthy = gate.criteria.filter((item) => item.ok).length
        const rows = gate.criteria.map((item) => {
          const mark = item.ok ? '✓' : item.level === 'blocking' ? '✗✗' : item.level === 'advisory' ? '!' : '✗'
          const evid = item.evidence?.length
            ? `\n${item.evidence.map((e) => `     L${e.line || '-'} ${e.text}`).join('\n')}`
            : ''
          return `  ${mark} ${item.id} ${item.title} — ${item.detail}${evid}`
        })
        return `${gate.gate}：${gate.verdict.toUpperCase()}（${healthy}/${gate.criteria.length} 通过）\n${rows.join('\n')}\n  下一步：${gate.nextAction}`
      })
      return text(`总判定：${String(value.verdict).toUpperCase()}（${value.lines} 行输入）\n\n${blocks.join('\n\n')}`)
    },
  },
  async execute(args) {
    const content = typeof args?.content === 'string' ? args.content : ''
    if (content.trim() === '') throw new Error('oo_gate_check: content must be the deliverable text')
    return checkGate({
      gate: typeof args?.gate === 'string' ? args.gate : 'G1',
      content,
      code: typeof args?.code === 'string' ? args.code : '',
    })
  },
}

const ASK_TOOL = {
  name: 'oo_ask_plan',
  description:
    'Turn identified gaps into the required gate question block and assumption ledger. Enforces constitution #12: at most five questions, blocking gaps first, each with a recommendation, a one-line reason, the cost of choosing wrong, and the default taken when nobody answers; plus the 《假设与待确认清单》 table so a later round can continue the numbering. Returns ready-to-send markdown.',
  parameters: {
    type: 'object',
    additionalProperties: false,
    required: ['gaps'],
    properties: {
      gate: { type: 'string', enum: [...GATES], description: 'Gate the questions belong to. Default G1.' },
      startIndex: { type: 'integer', description: 'First assumption number, to continue a ledger. Default 1.' },
      gaps: {
        type: 'array',
        description: 'Gaps in priority order; the tool re-sorts blocking (B) first and truncates to five.',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['question'],
          properties: {
            question: { type: 'string', description: 'A choice or confirmation question, never open-ended.' },
            recommend: { type: 'string', description: 'The answer to use when nobody replies.' },
            reason: { type: 'string', description: 'One line citing known information.' },
            consequence: { type: 'string', description: 'Rework scope if the recommendation is wrong.' },
            level: { type: 'string', enum: ['A', 'B'], description: 'B blocks the gate; A can proceed as ASSUMED. Default B.' },
            impact: { type: 'string', description: 'Affected aggregates or interfaces, for the ledger.' },
            rollback: { type: 'string', description: 'How to reverse the assumption, for the ledger.' },
          },
        },
      },
    },
  },
  output: {
    schema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        ok: { type: 'boolean' },
        gate: { type: 'string' },
        count: { type: 'integer' },
        dropped: { type: 'integer' },
        error: { type: 'string' },
        markdown: { type: 'string' },
        formWarnings: { type: 'array', items: { type: 'string' } },
        assumptions: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            properties: {
              id: { type: 'string' },
              content: { type: 'string' },
              basis: { type: 'string' },
              impact: { type: 'string' },
              rollback: { type: 'string' },
            },
          },
        },
      },
    },
    render(_args, value) {
      if (!value || value.error) return text(`未生成：${value?.error ?? '未知原因'}`)
      const warnings = value.formWarnings?.length ? `\n\n形式提醒（宪法 #12）：\n- ${value.formWarnings.join('\n- ')}` : ''
      return text(`${value.markdown}${warnings}`)
    },
  },
  async execute(args) {
    return buildAskPlan({
      gate: typeof args?.gate === 'string' ? args.gate : 'G1',
      gaps: Array.isArray(args?.gaps) ? args.gaps : [],
      startIndex: num(args?.startIndex, 1, 999, 1),
    })
  },
}

const ANCHOR_TOOL = {
  name: 'oo_spec_anchor',
  description:
    'Look up original-text anchors in the bundled anchor table so a conclusion can carry a checkable `rag #NNN` reference. Match by anchor id fragment (e.g. `#073`) or by keyword from the quoted passage. Use it when a card claims something came from the book and you need the anchor id.',
  parameters: {
    type: 'object',
    additionalProperties: false,
    required: ['query'],
    properties: {
      query: { type: 'string', description: 'Anchor id fragment or keyword from the passage.' },
      limit: { type: 'integer', description: 'Maximum anchors, 1-30. Default 5.' },
    },
  },
  output: {
    schema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        query: { type: 'string' },
        anchors: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            properties: {
              id: { type: 'string' },
              chapter: { type: 'string' },
              lines: { type: 'string' },
              page: { type: 'string' },
              lead: { type: 'string' },
            },
          },
        },
      },
    },
    render(_args, value) {
      if (!value?.anchors?.length) return text(`没有匹配的锚点：${value?.query ?? ''}。换关键词，或用 oo_spec_search scope=anchors。`)
      return text(
        value.anchors
          .map((anchor) => `${anchor.id}｜${anchor.chapter}｜行 ${anchor.lines}｜页 ${anchor.page}\n   ${anchor.lead}`)
          .join('\n'),
      )
    },
  },
  async execute(args) {
    const query = String(args?.query ?? '').trim()
    if (query === '') throw new Error('oo_spec_anchor: query is required')
    return { query, anchors: await findAnchors(query, num(args?.limit, 1, 30, 5)) }
  },
}

/** Every tool this bundle registers. */
export const TOOLS = [SEARCH_TOOL, READ_TOOL, GATE_TOOL, ASK_TOOL, ANCHOR_TOOL]

/**
 * Register all tools on the tools service.
 *
 * @param {object} ctx - plugin context carrying `ctx.tools`.
 * @returns {void}
 */
export function registerTools(ctx) {
  for (const tool of TOOLS) {
    ctx.effect(() => ctx.tools.register(tool), `oo-spec:${tool.name}`)
  }
}
