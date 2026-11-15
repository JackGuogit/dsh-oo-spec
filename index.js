/**
 * dsh-oo-spec — the OO design spec (four gates + nine judgement cards) as a
 * Harness bundle: one skill that routes the model to the right card, and five
 * tools that search, read, and mechanically check a deliverable against it.
 *
 * @module dsh-oo-spec
 */

import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { registerTools } from './lib/tools.js'
import { SPEC_ROOT } from './lib/corpus.js'

const PROVIDER = 'oo-spec'
const SKILL_NAME = 'oo-spec'
/** Standard precedence rank for packaged skill providers (bundled root). */
const SKILL_RANK = 600
const SKILL_BODY = join(fileURLToPath(new URL('.', import.meta.url)), 'lib', 'skill.md')

const DESCRIPTION =
  '面向对象的四阶段闸门与判定卡：需求模型→领域模型→设计模型→实现模型。用于需求不全时的结构化提问、业务实体推导、类设计与拆分判定、内聚/耦合分级、SOLID 与反过度设计（NOP）、设计模式选型、代码与设计对账。Triggers OO design review, requirement gap analysis, cohesion/coupling grading, pattern selection, over-design detection.'

const CANDIDATE = {
  name: SKILL_NAME,
  description: DESCRIPTION,
  whenToUse:
    '在动手设计或写代码之前，或评审一份需求/领域模型/类设计/实现映射时。需求含糊、依赖太多、想加抽象或设计模式、代码与设计对不上，也用它。',
  invocation: { modelInvocable: true, userInvocable: true },
  provider: PROVIDER,
  source: 'bundled',
  resourceBase: { kind: 'directory', path: SPEC_ROOT },
  rank: SKILL_RANK,
  locator: SKILL_BODY,
}

/** Skill provider serving the packaged OO spec. */
const provider = {
  name: PROVIDER,
  list: () => Promise.resolve([CANDIDATE]),
  /**
   * Load the skill body on demand.
   *
   * @returns {Promise<object>} the full skill definition.
   */
  async get() {
    return {
      name: CANDIDATE.name,
      description: CANDIDATE.description,
      whenToUse: CANDIDATE.whenToUse,
      invocation: CANDIDATE.invocation,
      provider: CANDIDATE.provider,
      source: CANDIDATE.source,
      resourceBase: CANDIDATE.resourceBase,
      content: await readFile(SKILL_BODY, 'utf8'),
    }
  },
}

/** Cordis plugin name. */
export const name = 'oo-spec'
/** Services this plugin needs; both are present in a web or desktop profile. */
export const inject = ['tools', 'skills']

/**
 * Register the OO spec skill provider and its model-facing tools.
 *
 * @param {object} ctx - Cordis plugin context.
 * @returns {void}
 */
export function apply(ctx) {
  ctx.effect(() => ctx.skills.registerProvider(() => provider), 'oo-spec:skill-provider')
  registerTools(ctx)
}
