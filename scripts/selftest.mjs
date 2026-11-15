/**
 * Deterministic self-test for the bundled spec logic: corpus search, document
 * reads, anchor lookup, gate checks on a golden sample and on defect samples,
 * and the question planner's shape rules.
 *
 * Run with `node scripts/selftest.mjs`.
 */

import assert from 'node:assert/strict'

import { DOCS, findAnchors, readDocs, search } from '../lib/corpus.js'
import { checkGate } from '../lib/gates.js'
import { buildAskPlan } from '../lib/ask.js'

let checks = 0

/**
 * Run one labelled assertion.
 *
 * @param {string} label - what is being asserted.
 * @param {() => void} body - assertion body.
 * @returns {Promise<void>} resolves when the assertion passed.
 */
async function test(label, body) {
  checks += 1
  await body()
  console.log(`  ok  ${label}`)
}

const GOOD_G1 = `# 需求模型（POS 买单）

| # | 槽 | 探针 | 状态 |
|---|---|---|---|
| 1 | When | 营业时段 8:00-22:00 | KNOWN |
| 2 | Where | 门店收银台 | KNOWN |
| 3 | Who | 收银员、顾客、支付网关 | KNOWN |
| 4 | What | 完成一笔买单并出小票 | KNOWN |
| 5 | Why | 排队时间从 3 分钟降到 1 分钟 | KNOWN |
| 6 | How | 见 UC-01 | KNOWN |
| 7 | 性能 | 单笔响应 ≤ 2s，峰值 50 笔/分钟 | KNOWN |
| 8 | 成本 | 硬件预算 5 万 | ASSUMED-A |
| 9 | 交付节点 | 2026 Q2 上线 | KNOWN |
| 10 | 可靠性 | 允许停机 5 分钟/月，不丢单 | KNOWN |
| 11 | 安全性 | 不存卡号，PCI 范围外 | KNOWN |
| 12 | 合规性 | 电子发票合规 | KNOWN |
| 13 | 技术性 | 客户锁定 Java 17 | KNOWN |
| 14 | 兼容性 | 对接现有库存系统 HTTP 接口 | KNOWN |

## UC-01 买单

【用例名称】买单

【场景】
Who: 收银员、顾客
Where: 门店收银台
When: 营业时段

【用例描述】
1. 收银员扫描商品，系统累加金额
   1.1 条码无法识别 → 提示手工输入编码，收银员输入后继续
2. 顾客选择支付方式并付款
   2.1 支付网关超时 → 提示重试，订单保持待支付，不重复扣款

【用例价值】顾客完成付款并拿到小票离店

【约束和限制】单笔金额上限 5 万元；同一订单支付重试不超过 3 次

## 功能列表

| 编号 | 功能 | 用例 |
|---|---|---|
| F01 | 商品扫描与金额汇总 | UC-01 |
| F02 | 支付与出票 | UC-01 |
`

const BAD_G1 = `# 需求

- 系统要提供商品扫描
- 系统要支持打印小票

## 功能列表

| 编号 | 功能 |
|---|---|
| F01 | 扫描 |

## UC-01 买单

【用例名称】买单
【用例描述】
1. 用户点击结算
`

const DESIGN_WITH_ABSTRACTION = `# 设计模型

## 类模型

接口 PaymentGateway：变化点 = 支付渠道（微信/支付宝/现金）；时间窗 = 6 个月内接入 2 家新渠道；若不发生，成本 = 1 个 if 分支。

## 实现映射

| 设计 | 代码 |
|---|---|
| \`Order\` | src/Order.java |
| \`Payment\` | src/Payment.java |
`

const DESIGN_WITHOUT_WINDOW = `# 设计模型

接口 PaymentGateway 用于支付渠道扩展。
`

const DOMAIN_OK = `# 领域模型

- Order（UC-01）：订单，来自"完成一笔买单"
- OrderItem（UC-01）：订单行，来自"扫描商品"
- Order —— 1..n —— OrderItem（UC-01）

## 关系

- Order 0..1 Payment（UC-01）
`

const DOMAIN_BAD = `# 领域模型

- t_order（UC-01）：订单表
- 价格（UC-01）：单价
- Order —— OrderItem（UC-01）
`

console.log('dsh-oo-spec selftest')

await test('corpus ships every document', async () => {
  assert.ok(DOCS.length >= 21)
  for (const doc of DOCS) {
    const { docs } = await readDocs([doc.id], 60000)
    assert.equal(docs.length, 1, `missing ${doc.id}`)
    assert.ok(docs[0].text.length > 100, `${doc.id} looks empty`)
  }
})

await test('search finds cohesion material for 内聚', async () => {
  const result = await search('内聚', { scope: 'all', limit: 6 })
  assert.ok(result.hits.length > 0)
  const ids = result.hits.map((hit) => hit.docId)
  assert.ok(ids.includes('cohesion-levels') || ids.includes('C05') || ids.includes('constitution'), ids.join(','))
})

await test('search scopes stay inside their group', async () => {
  const cards = await search('变化', { scope: 'cards', limit: 20 })
  assert.ok(cards.hits.every((hit) => hit.kind === 'card'))
  const anchors = await search('封装', { scope: 'anchors', limit: 5 })
  assert.ok(anchors.hits.every((hit) => hit.kind === 'anchors'))
})

await test('read is capped and reports unknown ids', async () => {
  const capped = await readDocs(['constitution', 'gates'], 1200)
  assert.equal(capped.truncated, true)
  assert.ok(capped.chars <= 1400)
  const unknown = await readDocs(['nope'])
  assert.deepEqual(unknown.unknown, ['nope'])
})

await test('anchor lookup by id and by keyword', async () => {
  const byId = await findAnchors('#033')
  assert.ok(byId.length >= 1 && byId[0].id.includes('#033'), JSON.stringify(byId[0]))
  const byText = await findAnchors('封装')
  assert.ok(byText.length >= 1)
})

await test('G1 passes the golden requirement model', async () => {
  const result = checkGate({ gate: 'G1', content: GOOD_G1 })
  assert.equal(result.verdict, 'pass', JSON.stringify(result.gates[0].failed))
  assert.deepEqual(result.gates[0].failed, [])
})

await test('G1 blocks on UNKNOWN-B and catches missing slots', async () => {
  const blocked = checkGate({
    gate: 'G1',
    content: GOOD_G1.replace('| 7 | 性能 | 单笔响应 ≤ 2s，峰值 50 笔/分钟 | KNOWN |', '| 7 | 性能 | 未定 | UNKNOWN-B |'),
  })
  assert.equal(blocked.verdict, 'blocked')
  assert.ok(blocked.gates[0].criteria.find((item) => item.id === 'G1.3' && item.ok === false))
  const sparse = checkGate({ gate: 'G1', content: BAD_G1 })
  assert.equal(sparse.verdict, 'fail')
  const slotCheck = sparse.gates[0].criteria.find((item) => item.id === 'G1.1')
  assert.equal(slotCheck.ok, false)
  assert.ok(slotCheck.detail.includes('性能'))
})

await test('G1 catches missing use-case value, constraint, and exception flows', async () => {
  const result = checkGate({ gate: 'G1', content: BAD_G1 })
  const thin = result.gates[0].criteria.find((item) => item.id === 'G1.5')
  const exception = result.gates[0].criteria.find((item) => item.id === 'G1.6')
  assert.equal(thin.ok, false)
  assert.equal(exception.ok, false)
})

await test('G2 separates a traceable domain model from table/attribute smells', async () => {
  const good = checkGate({ gate: 'G2', content: DOMAIN_OK })
  assert.equal(good.verdict, 'pass', JSON.stringify(good.gates[0].failed))
  const bad = checkGate({ gate: 'G2', content: DOMAIN_BAD })
  assert.equal(bad.verdict, 'fail')
  const ids = bad.gates[0].criteria.filter((item) => !item.ok).map((item) => item.id)
  assert.ok(ids.includes('G2.4'), ids.join(','))
  assert.ok(ids.includes('G2.5'), ids.join(','))
  assert.ok(ids.includes('G2.3'), ids.join(','))
})

await test('G3 requires both a change point and a time window', async () => {
  const ok = checkGate({ gate: 'G3', content: DESIGN_WITH_ABSTRACTION })
  assert.equal(ok.verdict, 'pass', JSON.stringify(ok.gates[0].failed))
  const bad = checkGate({ gate: 'G3', content: DESIGN_WITHOUT_WINDOW })
  assert.equal(bad.verdict, 'fail')
  const ids = bad.gates[0].criteria.filter((item) => !item.ok).map((item) => item.id)
  assert.ok(ids.includes('G3.1') && ids.includes('G3.2'), ids.join(','))
})

await test('G4 reports design/code parity in both directions', async () => {
  const result = checkGate({ gate: 'G4', content: DESIGN_WITH_ABSTRACTION, code: 'class Order {} class Pay {}' })
  const parity = result.gates[0].criteria.find((item) => item.id === 'G4.3')
  assert.equal(parity.ok, false)
  assert.ok(parity.detail.includes('Payment'))
  assert.ok(parity.detail.includes('Pay'))
  const clean = checkGate({ gate: 'G4', content: DESIGN_WITH_ABSTRACTION, code: 'class Order {} class Payment {}' })
  assert.equal(clean.gates[0].criteria.find((item) => item.id === 'G4.3').ok, true)
})

await test('G4 flags an open TODO(BLOCKING)', async () => {
  const result = checkGate({
    gate: 'G4',
    content: `${DESIGN_WITH_ABSTRACTION}\nTODO(BLOCKING:"退款规则由谁审批")\n`,
  })
  const todo = result.gates[0].criteria.find((item) => item.id === 'G4.1')
  assert.equal(todo.ok, false)
})

await test('all gates run together', async () => {
  const result = checkGate({ gate: 'all', content: GOOD_G1 })
  assert.equal(result.gates.length, 4)
  assert.equal(result.gates.map((row) => row.gate).join(','), 'G1,G2,G3,G4')
})

await test('ask plan keeps five questions, blocking first, and numbers assumptions', async () => {
  const gaps = [
    { question: '支付是否含退款？A 含 / B 不含', recommend: 'B 不含', reason: '状态机无退款态', consequence: '多做一个聚合', level: 'A', impact: '订单聚合', rollback: '抽出 Payment 聚合' },
    { question: '并发峰值按 50 还是 500 笔/分钟？A 50 / B 500', recommend: 'A 50', reason: '单店单收银台', consequence: '架构从单体变分布式', level: 'B' },
    { question: '是否保留离线收银？A 保留 / B 不保留', recommend: 'B', reason: '门店网络稳定', consequence: '增加同步冲突处理', level: 'B' },
    { question: '小票要电子还是纸质？A 电子 / B 纸质', recommend: 'A', reason: '客户已提电子发票', consequence: '打印模块返工', level: 'A' },
    { question: '商品数量上限 99 还是 999？A 99 / B 999', recommend: 'A 99', reason: '单笔金额上限 5 万', consequence: '改校验常量', level: 'A' },
    { question: '库存扣减在支付前还是支付后？A 前 / B 后', recommend: 'A', reason: '避免超卖', consequence: '对账逻辑重写', level: 'B' },
  ]
  const plan = buildAskPlan({ gate: 'G1', gaps, startIndex: 3 })
  assert.equal(plan.count, 5)
  assert.equal(plan.dropped, 1)
  assert.equal(plan.assumptions[0].id, 'ASSUMED-B3')
  assert.ok(plan.markdown.startsWith('【G1 闸门 · 5 项阻塞缺口】'))
  assert.ok(plan.markdown.includes('若无回复：按推荐继续，登记为 ASSUMED-B3'))
  assert.ok(plan.markdown.includes('## 假设与待确认清单'))
  assert.ok(plan.markdown.includes('| 编号 | 假设内容 | 依据 | 影响面 | 回滚方式 |'))
})

await test('ask plan warns about open-ended or recommendation-free gaps', async () => {
  const plan = buildAskPlan({ gate: 'G2', gaps: [{ question: '你想怎么做？' }] })
  assert.equal(plan.ok, true)
  assert.ok(plan.formWarnings.some((warning) => warning.includes('开放式')))
  assert.ok(plan.formWarnings.some((warning) => warning.includes('缺推荐答案')))
})

console.log(`\n${checks} checks passed`)
