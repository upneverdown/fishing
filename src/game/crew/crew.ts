export type CrewId = 'helmsman' | 'carpenter' | 'gunner' | 'diver'

export interface CrewDef {
  id: CrewId
  name: string
  role: string
  desc: string
  effect: string
  cost: number
  color: string
  accent: string
}

export const CREW: CrewDef[] = [
  {
    id: 'helmsman',
    name: '老舵',
    role: '舵手',
    desc: '在风浪里掌了半辈子舵，知道怎么让船吃住风。',
    effect: '航速 +12%',
    cost: 1200,
    color: '#2f6f6a',
    accent: '#6fe0cf',
  },
  {
    id: 'carpenter',
    name: '鲁木',
    role: '船匠',
    desc: '随身带着锤子和木楔，船板一响他就醒。',
    effect: '每 5 秒自动修复 2 点船体',
    cost: 1000,
    color: '#7a5a34',
    accent: '#f2c15c',
  },
  {
    id: 'gunner',
    name: '铁线',
    role: '炮手',
    desc: '从前在远洋捕鲸船上干活，出手又快又狠。',
    effect: '武器伤害 +25%',
    cost: 1500,
    color: '#7c3f36',
    accent: '#ff9d7d',
  },
  {
    id: 'diver',
    name: '阿潜',
    role: '潜水员',
    desc: '能在水下睁着眼换气，肺活量吓人。',
    effect: '水下氧气消耗 -20%',
    cost: 1400,
    color: '#2e5566',
    accent: '#9fd8ff',
  },
]

const CREW_MAP = new Map(CREW.map((c) => [c.id, c]))

export function crewById(id: string) {
  return CREW_MAP.get(id as CrewId)
}

export function crewSpeedMul(ids: readonly string[]) {
  return ids.includes('helmsman') ? 1.12 : 1
}

export function crewDamageMul(ids: readonly string[]) {
  return ids.includes('gunner') ? 1.25 : 1
}

export function crewOxygenMul(ids: readonly string[]) {
  return ids.includes('diver') ? 0.8 : 1
}

export function crewRepairsHull(ids: readonly string[]) {
  return ids.includes('carpenter')
}

export const CREW_AFFINITY_MAX = 100

/** 好感度兑成产出：满好感时渔获分成翻倍、收线节奏快三分之一 */
export function crewAffinityBonus(affinity: number) {
  return Math.max(0, Math.min(1, affinity / CREW_AFFINITY_MAX))
}

export function crewCatchCoins(affinity: number, base = 20) {
  return Math.round(base * (1 + crewAffinityBonus(affinity)))
}

export function crewFishingInterval(affinity: number, base: number) {
  return base * (1 - crewAffinityBonus(affinity) * 0.34)
}
