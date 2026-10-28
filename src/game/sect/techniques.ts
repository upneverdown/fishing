import type { Rarity } from '@/types'
import type { FactionId } from '@/game/cultivation/factions'

export type TechniqueId = 'taigong' | 'thunderlure' | 'swordflight' | 'starabsorb'

export type TechniqueKind = 'passive' | 'active' | 'movement'

/** 学习门槛：贡献度为主，部分功法另要内丹或仙玉 */
export interface TechniqueTithe {
  contribution: number
  cores: number
  jade: number
  /** 阵营专属，null 表示两宗同修 */
  faction?: FactionId
}

export interface TechniqueDef {
  id: TechniqueId
  name: string
  kind: TechniqueKind
  /** 主动功法的按键 */
  key?: string
  sect: string
  desc: string
  maxLevel: number
  learn: TechniqueTithe
  /** 每级升级消耗的贡献度增量 */
  step: number
  /** 每级的实际数值，按下标取等级 */
  scale: number[]
  unit: string
  color: string
}

export const TECHNIQUES: TechniqueDef[] = [
  {
    id: 'taigong',
    name: '太公钓鱼诀',
    kind: 'passive',
    sect: '两宗同修',
    desc: '竿落之处自有分寸：抛竿距离与咬钩耐心随境界递进。',
    maxLevel: 5,
    learn: { contribution: 60, cores: 0, jade: 0 },
    step: 45,
    scale: [0.1, 0.2, 0.32, 0.46, 0.62],
    unit: '抛竿距离',
    color: '#f2c15c',
  },
  {
    id: 'thunderlure',
    name: '天雷引',
    kind: 'active',
    key: 'T',
    sect: '仙宗雷堂',
    desc: '引九天雷霆劈向水面，雷域之内鱼群尽数麻倒，直接进篓。',
    maxLevel: 4,
    learn: { contribution: 140, cores: 1, jade: 0 },
    step: 120,
    scale: [13, 16, 20, 25],
    unit: '雷域半径',
    color: '#7ed4ff',
  },
  {
    id: 'swordflight',
    name: '御剑飞行',
    kind: 'movement',
    sect: '两宗同修',
    desc: '踏剑离水，凡间海域亦可凌空虚渡，无视礁石与浅滩碰撞。',
    maxLevel: 3,
    learn: { contribution: 180, cores: 1, jade: 20 },
    step: 150,
    scale: [2.6, 4.2, 6],
    unit: '御空高度',
    color: '#e2c8ff',
  },
  {
    id: 'starabsorb',
    name: '吸星大法',
    kind: 'passive',
    sect: '魔宗禁典',
    desc: '魔道吞纳之法：每起一竿，鱼获修为尽归己身，额外掠夺两成道行。',
    maxLevel: 4,
    learn: { contribution: 150, cores: 0, jade: 0, faction: 'demon' },
    step: 130,
    scale: [0.2, 0.32, 0.46, 0.62],
    unit: '额外修为',
    color: '#ff5a4a',
  },
]

const TECHNIQUE_BY_ID = new Map(TECHNIQUES.map((t) => [t.id, t]))

export function techniqueById(id: string): TechniqueDef | undefined {
  return TECHNIQUE_BY_ID.get(id as TechniqueId)
}

export function isTechniqueId(value: unknown): value is TechniqueId {
  return typeof value === 'string' && TECHNIQUE_BY_ID.has(value as TechniqueId)
}

/** 升到下一级（或初次修习）所需的贡献度 */
export function techniqueCost(def: TechniqueDef, level: number) {
  return level <= 0 ? def.learn.contribution : def.learn.contribution + def.step * level
}

/** 该功法在当前等级下的实际数值 */
export function techniqueValue(def: TechniqueDef, level: number) {
  if (level <= 0) return 0
  return def.scale[Math.min(level, def.scale.length) - 1]
}

/** 上交鱼获换取贡献度：品质越高越值钱 */
export const CONTRIBUTION_BY_RARITY: Record<Rarity, number> = {
  common: 2,
  uncommon: 6,
  rare: 16,
  epic: 40,
  legendary: 90,
}

export const MAX_EQUIPPED = 3
