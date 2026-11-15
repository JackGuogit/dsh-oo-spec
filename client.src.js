/**
 * Client half of dsh-oo-spec: a launcher in the composer tool row and a
 * frame-wide overlay that browses the bundled OO spec.
 *
 * This file is a template: `scripts/build-client.mjs` swaps the SPEC
 * placeholder below for the packaged documents and writes `client.js`.
 * Only `react` is required from the host; no Harness client package is loaded.
 */
window.__ModuleLoader__.load({
  id: 'dsh-oo-spec',
  factory(require) {
    const React = require('react')
    const h = React.createElement
    const SPEC = /*__OO_SPEC_DOCUMENTS__*/ []

    const STYLE_ID = 'dsh-oo-spec'

    const GROUP_ORDER = ['core', 'card', 'table', 'example', 'eval', 'anchors']

    const TEXT = {
      zh: {
        title: 'OO 开发规范',
        hint: '宪法 · 四道闸门 · 九张判定卡 · 24 道评测',
        search: '搜索：内聚 / 时间窗 / 5W1H8C / 模式',
        close: '关闭',
        empty: '没有匹配的条目，换个关键词。',
        open: '打开 OO 设计规范',
        groups: { core: '宪法与闸门', card: '判定卡 C01–C09', table: '查表', example: '黄金链路与反例', eval: '评测与评分', anchors: '原文锚点' },
        footer: '规范由 5 个工具支撑：oo_spec_search / oo_spec_read / oo_gate_check / oo_ask_plan / oo_spec_anchor',
      },
      en: {
        title: 'OO design spec',
        hint: 'constitution · four gates · nine cards · 24 eval cases',
        search: 'Search: cohesion / time window / 5W1H8C / pattern',
        close: 'Close',
        empty: 'No entry matches. Try another keyword.',
        open: 'Open the OO design spec',
        groups: { core: 'Constitution and gates', card: 'Cards C01–C09', table: 'Lookup tables', example: 'Golden path and anti-patterns', eval: 'Evals and rubric', anchors: 'Original-text anchors' },
        footer: 'Backed by five tools: oo_spec_search / oo_spec_read / oo_gate_check / oo_ask_plan / oo_spec_anchor',
      },
    }

    const LANG = (() => {
      const raw = typeof navigator !== 'undefined' && navigator.language ? navigator.language.toLowerCase() : 'zh'
      return raw.startsWith('zh') ? 'zh' : 'en'
    })()
    const t = TEXT[LANG]

    const CSS = `
      .oo-spec-btn{border:1px solid var(--dsw-alias-border-l1);background:transparent;color:var(--dsw-alias-label-secondary);border-radius:6px;font-size:11px;font-weight:600;line-height:1;padding:5px 7px;cursor:pointer;letter-spacing:.02em}
      .oo-spec-btn:hover{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)}
      .oo-spec-overlay{position:fixed;inset:0;z-index:2147483000;display:flex;align-items:center;justify-content:center;padding:24px;background:rgba(0,0,0,.42)}
      .oo-spec-panel{display:flex;flex-direction:column;width:min(1040px,94vw);height:min(760px,86vh);border:1px solid var(--dsw-alias-border-l1);border-radius:12px;background:var(--dsw-alias-bg-overlay);color:var(--dsw-alias-label-primary);box-shadow:0 24px 64px rgba(0,0,0,.35);overflow:hidden}
      .oo-spec-head{display:flex;align-items:center;gap:12px;padding:14px 16px;border-bottom:1px solid var(--dsw-alias-border-l1)}
      .oo-spec-title{font-size:14px;font-weight:600}
      .oo-spec-hint{font-size:11px;color:var(--dsw-alias-label-secondary)}
      .oo-spec-search{flex:1;min-width:120px;height:30px;padding:0 10px;border-radius:8px;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font-size:12px;outline:none}
      .oo-spec-search:focus{border-color:var(--dsw-alias-brand-primary)}
      .oo-spec-close{width:28px;height:28px;border-radius:8px;border:1px solid transparent;background:transparent;color:var(--dsw-alias-label-secondary);font-size:15px;line-height:1;cursor:pointer}
      .oo-spec-close:hover{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)}
      .oo-spec-body{display:flex;flex:1;min-height:0}
      .oo-spec-nav{width:236px;flex:0 0 236px;overflow:auto;padding:8px;border-right:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1)}
      .oo-spec-group{font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:var(--dsw-alias-label-secondary);padding:10px 8px 4px}
      .oo-spec-item{display:block;width:100%;text-align:left;padding:6px 8px;border-radius:6px;border:0;background:transparent;color:var(--dsw-alias-label-secondary);font-size:12px;line-height:1.35;cursor:pointer}
      .oo-spec-item:hover{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)}
      .oo-spec-item[data-active="true"]{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);font-weight:600}
      .oo-spec-doc{flex:1;overflow:auto;padding:18px 22px 40px;font-size:13px;line-height:1.65}
      .oo-spec-doc h1{font-size:17px;margin:0 0 12px}
      .oo-spec-doc h2{font-size:14px;margin:18px 0 8px;padding-bottom:4px;border-bottom:1px solid var(--dsw-alias-border-l1)}
      .oo-spec-doc h3{font-size:13px;margin:14px 0 6px;color:var(--dsw-alias-label-primary)}
      .oo-spec-doc p{margin:6px 0}
      .oo-spec-doc ul{margin:6px 0;padding-left:18px}
      .oo-spec-doc li{margin:2px 0}
      .oo-spec-doc code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11.5px;background:var(--dsw-alias-bg-layer-2);border-radius:4px;padding:1px 4px}
      .oo-spec-doc pre{margin:8px 0;padding:10px 12px;border-radius:8px;background:var(--dsw-alias-bg-layer-2);overflow:auto;font-size:11.5px;line-height:1.5}
      .oo-spec-doc pre code{background:transparent;padding:0}
      .oo-spec-doc table{border-collapse:collapse;margin:8px 0;font-size:12px;width:100%}
      .oo-spec-doc th,.oo-spec-doc td{border:1px solid var(--dsw-alias-border-l1);padding:4px 8px;text-align:left;vertical-align:top}
      .oo-spec-doc th{background:var(--dsw-alias-bg-layer-2);font-weight:600}
      .oo-spec-doc blockquote{margin:8px 0;padding:4px 10px;border-left:2px solid var(--dsw-alias-border-l2);color:var(--dsw-alias-label-secondary)}
      .oo-spec-foot{padding:8px 16px;border-top:1px solid var(--dsw-alias-border-l1);font-size:11px;color:var(--dsw-alias-label-secondary)}
      .oo-spec-mark{background:color-mix(in srgb,var(--dsw-alias-state-warn-primary) 30%,transparent);border-radius:3px}
    `

    /** Module-level UI store shared by the launcher and the overlay. */
    const store = { open: false, query: '', activeId: SPEC.length > 0 ? SPEC[0].id : '', version: 0, listeners: new Set() }

    function commit(patch) {
      Object.assign(store, patch)
      store.version += 1
      for (const listener of store.listeners) listener()
    }

    function subscribe(listener) {
      store.listeners.add(listener)
      return () => store.listeners.delete(listener)
    }

    const snapshot = () => store.version
    const serverSnapshot = () => 0

    function useStore() {
      React.useSyncExternalStore(subscribe, snapshot, serverSnapshot)
      return store
    }

    function ensureStyle() {
      if (typeof document === 'undefined') return
      if (document.querySelector(`style[data-plugin="${STYLE_ID}"]`)) return
      const style = document.createElement('style')
      style.dataset.plugin = STYLE_ID
      style.textContent = CSS
      document.head.appendChild(style)
    }

    /** Render inline `code` and **bold** spans. */
    function inline(text, keyBase) {
      const nodes = []
      const pattern = /(`[^`]+`|\*\*[^*]+\*\*)/g
      let last = 0
      let match = pattern.exec(text)
      let index = 0
      while (match) {
        if (match.index > last) nodes.push(text.slice(last, match.index))
        const token = match[0]
        if (token.startsWith('`')) nodes.push(h('code', { key: `${keyBase}-c${index}` }, token.slice(1, -1)))
        else nodes.push(h('strong', { key: `${keyBase}-b${index}` }, token.slice(2, -2)))
        last = match.index + token.length
        index += 1
        match = pattern.exec(text)
      }
      if (last < text.length) nodes.push(text.slice(last))
      return nodes
    }

    /** Minimal markdown renderer: headings, lists, tables, fences, quotes. */
    function renderMarkdown(source) {
      const lines = source.split(/\r?\n/)
      const out = []
      let i = 0
      let key = 0
      while (i < lines.length) {
        const line = lines[i]
        if (/^```/.test(line.trim())) {
          const buffer = []
          i += 1
          while (i < lines.length && !/^```/.test(lines[i].trim())) {
            buffer.push(lines[i])
            i += 1
          }
          i += 1
          out.push(h('pre', { key: `k${key++}` }, h('code', null, buffer.join('\n'))))
          continue
        }
        const heading = /^(#{1,6})\s+(.*)$/.exec(line)
        if (heading) {
          const level = Math.min(3, heading[1].length)
          out.push(h(`h${level}`, { key: `k${key++}` }, inline(heading[2], `h${key}`)))
          i += 1
          continue
        }
        if (/^\s*\|/.test(line) && i + 1 < lines.length && /^\s*\|[\s:|-]+\|?\s*$/.test(lines[i + 1])) {
          const header = line.split('|').slice(1, -1).map((cell) => cell.trim())
          i += 2
          const rows = []
          while (i < lines.length && /^\s*\|/.test(lines[i])) {
            rows.push(lines[i].split('|').slice(1, -1).map((cell) => cell.trim()))
            i += 1
          }
          out.push(
            h(
              'table',
              { key: `k${key++}` },
              h('thead', null, h('tr', null, header.map((cell, ci) => h('th', { key: `th${ci}` }, inline(cell, `th${ci}`))))),
              h(
                'tbody',
                null,
                rows.map((row, ri) =>
                  h('tr', { key: `tr${ri}` }, row.map((cell, ci) => h('td', { key: `td${ci}` }, inline(cell, `td${ri}-${ci}`)))),
                ),
              ),
            ),
          )
          continue
        }
        if (/^\s*[-*+]\s+/.test(line)) {
          const items = []
          while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i])) {
            items.push(lines[i].replace(/^\s*[-*+]\s+/, ''))
            i += 1
          }
          out.push(h('ul', { key: `k${key++}` }, items.map((item, ii) => h('li', { key: `li${ii}` }, inline(item, `li${ii}`)))))
          continue
        }
        if (/^\s*>\s?/.test(line)) {
          const buffer = []
          while (i < lines.length && /^\s*>\s?/.test(lines[i])) {
            buffer.push(lines[i].replace(/^\s*>\s?/, ''))
            i += 1
          }
          out.push(h('blockquote', { key: `k${key++}` }, inline(buffer.join(' '), `bq${key}`)))
          continue
        }
        if (line.trim() === '') {
          i += 1
          continue
        }
        const paragraph = []
        while (i < lines.length && lines[i].trim() !== '' && !/^(#{1,6}\s|```|\s*[-*+]\s|\s*\||\s*>)/.test(lines[i])) {
          paragraph.push(lines[i])
          i += 1
        }
        out.push(h('p', { key: `k${key++}` }, inline(paragraph.join(' '), `p${key}`)))
      }
      return out
    }

    function SpecLauncher() {
      const state = useStore()
      return h(
        'button',
        {
          type: 'button',
          className: 'oo-spec-btn',
          title: t.open,
          'aria-label': t.open,
          'aria-expanded': state.open,
          onClick: () => commit({ open: !state.open }),
        },
        'OO 规范',
      )
    }

    function SpecOverlay() {
      const state = useStore()
      const searchRef = React.useRef(null)
      const open = state.open

      React.useEffect(() => {
        if (!open) return undefined
        const onKey = (event) => {
          if (event.key === 'Escape') commit({ open: false })
        }
        document.addEventListener('keydown', onKey)
        const timer = setTimeout(() => {
          if (searchRef.current) searchRef.current.focus()
        }, 30)
        return () => {
          document.removeEventListener('keydown', onKey)
          clearTimeout(timer)
        }
      }, [open])

      if (!open) return null

      const query = state.query.trim().toLowerCase()
      const filtered = query === ''
        ? SPEC
        : SPEC.filter((doc) => `${doc.title} ${doc.id} ${doc.text}`.toLowerCase().includes(query))
      const active = SPEC.find((doc) => doc.id === state.activeId) ?? filtered[0] ?? SPEC[0]

      const grouped = GROUP_ORDER.map((group) => ({
        group,
        docs: filtered.filter((doc) => doc.group === group),
      })).filter((row) => row.docs.length > 0)

      return h(
        'div',
        {
          className: 'oo-spec-overlay',
          onClick: (event) => {
            if (event.target === event.currentTarget) commit({ open: false })
          },
        },
        h(
          'div',
          { className: 'oo-spec-panel', role: 'dialog', 'aria-modal': 'true', 'aria-label': t.title },
          h(
            'div',
            { className: 'oo-spec-head' },
            h('div', null, h('div', { className: 'oo-spec-title' }, t.title), h('div', { className: 'oo-spec-hint' }, t.hint)),
            h('input', {
              ref: searchRef,
              className: 'oo-spec-search',
              value: state.query,
              placeholder: t.search,
              onChange: (event) => commit({ query: event.target.value }),
            }),
            h('button', { type: 'button', className: 'oo-spec-close', title: t.close, onClick: () => commit({ open: false }) }, '×'),
          ),
          h(
            'div',
            { className: 'oo-spec-body' },
            h(
              'nav',
              { className: 'oo-spec-nav' },
              grouped.map((row) =>
                h(
                  'div',
                  { key: row.group },
                  h('div', { className: 'oo-spec-group' }, t.groups[row.group] ?? row.group),
                  row.docs.map((doc) =>
                    h(
                      'button',
                      {
                        key: doc.id,
                        type: 'button',
                        className: 'oo-spec-item',
                        'data-active': doc.id === (active && active.id) ? 'true' : 'false',
                        onClick: () => commit({ activeId: doc.id }),
                      },
                      doc.title,
                    ),
                  ),
                ),
              ),
              grouped.length === 0 ? h('div', { className: 'oo-spec-group' }, t.empty) : null,
            ),
            h(
              'div',
              { className: 'oo-spec-doc' },
              active ? renderMarkdown(active.text) : h('p', null, t.empty),
            ),
          ),
          h('div', { className: 'oo-spec-foot' }, t.footer),
        ),
      )
    }

    function apply(ctx) {
      ensureStyle()
      ctx.slots.inject('conversation.input.left', () =>
        ctx.slots.register({ name: 'conversation.input.left', id: 'oo-spec-launcher', order: 40, label: t.title }, SpecLauncher),
      )
      ctx.slots.inject('shell.overlay', () =>
        ctx.slots.register({ name: 'shell.overlay', id: 'oo-spec-overlay', order: 60, label: t.title }, SpecOverlay),
      )
    }

    return { inject: ['slots'], apply }
  },
})
