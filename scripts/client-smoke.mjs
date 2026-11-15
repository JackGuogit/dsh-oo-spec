/**
 * Headless smoke test for the generated client module: load it through a stub
 * module loader and a stub React, apply it to a stub slot context, then render
 * the launcher and the overlay to prove the tree builds and the store toggles.
 *
 * Run with `node scripts/client-smoke.mjs`.
 */

import assert from 'node:assert/strict'
import { register } from 'node:module'

let loaded
const styleTags = []
const docStub = {
  head: { appendChild: (node) => styleTags.push(node) },
  querySelector: () => null,
  createElement: () => ({ dataset: {}, set textContent(value) { this._text = value } }),
  addEventListener: () => {},
  removeEventListener: () => {},
}

const fakeReact = {
  createElement(type, props, ...children) {
    return { type, props: props ?? {}, children: children.flat(Infinity).filter((child) => child !== undefined && child !== null && child !== false) }
  },
  useSyncExternalStore(_subscribe, getSnapshot) {
    return getSnapshot()
  },
  useRef(initial) {
    return { current: initial ?? null }
  },
  useEffect(effect) {
    effect()
  },
}

globalThis.window = {
  __ModuleLoader__: {
    load(module) {
      loaded = module
    },
  },
}
globalThis.document = docStub
Object.defineProperty(globalThis, 'navigator', { value: { language: 'zh-CN' }, configurable: true })

await import('../client.js')
assert.ok(loaded, 'client.js must call window.__ModuleLoader__.load')
assert.equal(loaded.id, 'dsh-oo-spec')

const mod = loaded.factory((id) => {
  if (id === 'react') return fakeReact
  throw new Error(`unexpected require(${JSON.stringify(id)}) — the client must not load Harness packages`)
})
assert.deepEqual(mod.inject, ['slots'])

const registrations = []
const ctx = {
  slots: {
    inject(key, install) {
      assert.equal(typeof key, 'string')
      install()
    },
    register(definition, component) {
      assert.equal(typeof definition.name, 'string')
      assert.equal(typeof definition.id, 'string')
      registrations.push({ definition, component })
    },
  },
}

mod.apply(ctx)

assert.equal(styleTags.length, 1, 'one injected stylesheet')
const slots = registrations.map((row) => row.definition.name)
assert.deepEqual(slots.sort(), ['conversation.input.left', 'shell.overlay'])

const launcher = registrations.find((row) => row.definition.name === 'conversation.input.left')
const overlay = registrations.find((row) => row.definition.name === 'shell.overlay')

const closedOverlay = overlay.component()
assert.equal(closedOverlay, null, 'the overlay renders nothing while closed')

const button = launcher.component()
assert.equal(button.type, 'button')
assert.equal(button.props['aria-expanded'], false)
assert.equal(button.children[0], 'OO 规范')

button.props.onClick()
const openOverlay = overlay.component()
assert.ok(openOverlay, 'the overlay renders once opened')
assert.equal(openOverlay.type, 'div')

/** Depth-first search for the first node whose type matches. */
function find(node, type) {
  if (!node || typeof node !== 'object') return undefined
  if (node.type === type) return node
  for (const child of node.children ?? []) {
    const hit = find(child, type)
    if (hit) return hit
  }
  return undefined
}

const panel = find(openOverlay, 'div')
const nav = openOverlay.children[0].children[1].children[0]
assert.ok(nav, 'the overlay has a navigation column')
const navButtons = nav.children.flatMap((group) => group.children ?? []).filter((node) => node && node.type === 'button')
assert.ok(navButtons.length >= 21, `expected every document in the nav, got ${navButtons.length}`)

const doc = openOverlay.children[0].children[1].children[1]
assert.ok(doc.children.length > 5, 'the document pane renders the constitution')

const articles = navButtons.map((node) => node.children[0])
assert.ok(articles.includes('C05 内聚测试'))
assert.ok(articles.includes('原文锚点表（source 指向这里）'))

navButtons.at(-1).props.onClick()
const anchorsView = overlay.component()
assert.ok(anchorsView, 'switching documents keeps the overlay open')

const search = find(openOverlay, 'input')
search.props.onChange({ target: { value: '内聚' } })
const filtered = overlay.component()
const filteredNav = filtered.children[0].children[1].children[0]
const filteredButtons = filteredNav.children.flatMap((group) => group.children ?? []).filter((node) => node && node.type === 'button')
assert.ok(filteredButtons.length > 0 && filteredButtons.length < navButtons.length, 'search narrows the list')

const updatedLauncher = launcher.component()
updatedLauncher.props.onClick()
assert.equal(overlay.component(), null, 'the launcher closes the overlay again')

console.log(`client smoke test passed: ${registrations.length} slots, ${navButtons.length} documents, search and toggling verified`)
