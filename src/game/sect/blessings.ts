import type { Rarity } from '@/types'
import { factionOf, type FactionId } from '@/game/cultivation/factions'
import { TECHNIQUES, techniqueValue, type TechniqueId } from './techniques'

/** 功法加成只读取这三项，避免与 store 形成循环依赖 */
export interface BlessingSource {
  playerFaction: FactionId | null
  techniques: Record<TechniqueId, number>
  equippedTechniques: TechniqueId[]
}

export function equippedLevel(source: BlessingSource, id: TechniqueId) {
  if (!source.equippedTechniques.includes(id)) return 0
  return source.techniques[id] ?? 0
}

export function hasTechnique(source: BlessingSource, id: TechniqueId) {
  return equippedLevel(source, id) > 0
}

export interface FishingBlessing {
  /** 蓄力读条倍率，越小越快 */
  chargeMul: number
  /** 等咬钩倍率 */
  waitMul: number
  /** 抛竿距离倍率 */
  castMul: number
  /** 稀有鱼权重放大 */
  rareBoost: number
  /** 魔道掠夺：垃圾也能变成材料与金币 */
  junkLoot: boolean
  /** 吸星大法：渔获品阶折算修为的放大倍率，0 表示不触发 */
  absorbMul: number
}

export function fishingBlessing(source: BlessingSource): FishingBlessing {
  const faction = factionOf(source.playerFaction)
  const taigong = equippedLevel(source, 'taigong')
  const reach = techniqueValue(TECHNIQUES[0], taigong)
  const absorb = equippedLevel(source, 'starabsorb')
  return {
    chargeMul: faction.chargeTimeMul,
    waitMul: faction.waitTimeMul / (1 + reach * 0.55),
    castMul: 1 + reach,
    rareBoost: faction.rareBoost,
    junkLoot: faction.junkLoot,
    absorbMul: absorb > 0 ? 1 + techniqueValue(TECHNIQUES[3], absorb) : 0,
  }
}

/** 吸星大法按品阶夺来的道行 */
export const FISH_XP_BY_RARITY: Record<Rarity, number> = {
  common: 3,
  uncommon: 7,
  rare: 16,
  epic: 34,
  legendary: 70,
}
