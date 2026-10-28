export type FactionId = 'immortal' | 'demon'

export interface FactionDef {
  id: FactionId
  name: string
  role: string
  tagline: string
  /** 玩家模型染色 */
  body: string
  trim: string
  hood: string
  accent: string
  /** 船体染色 */
  hull: string
  /** UI 主色与光效 */
  color: string
  soft: string
  glow: string
  /** 阵营气运粒子外观 */
  aura: {
    core: string
    halo: string
    /** 仙人向上浮升，魔气向下沉坠 */
    rise: number
    size: number
    count: number
    opacity: number
    spin: number
  }
  /** 战斗数值 */
  attackMul: number
  /** 受伤倍率，小于 1 是更抗打 */
  hurtMul: number
  dodgeChance: number
  /** 造成伤害时按此比例回血 */
  lifesteal: number
  /** 神通命中时按此比例回血 */
  skillHeal: number
  /** 钓鱼数值 */
  chargeTimeMul: number
  waitTimeMul: number
  /** 稀有鱼权重放大倍数 */
  rareBoost: number
  /** 魔道：钓上垃圾时掠夺成材料与金币 */
  junkLoot: boolean
  perks: string[]
  costs: string[]
}

export const FACTIONS: Record<FactionId, FactionDef> = {
  immortal: {
    id: 'immortal',
    name: '仙人鱼王',
    role: '辅助 · 气运',
    tagline: '乘云御风，渔获自有天相',
    body: '#eaf6ff',
    trim: '#8fe8ff',
    hood: '#dff0ff',
    accent: '#ffd98a',
    hull: '#f3f7ff',
    color: '#7fe9d8',
    soft: 'rgba(127,233,216,0.16)',
    glow: 'rgba(143,232,255,0.7)',
    aura: {
      core: '#ffe6a8',
      halo: '#9ff0ff',
      rise: 1,
      size: 0.34,
      count: 120,
      opacity: 0.72,
      spin: 0.22,
    },
    attackMul: 0.86,
    hurtMul: 0.82,
    dodgeChance: 0.34,
    lifesteal: 0,
    skillHeal: 0.14,
    chargeTimeMul: 0.5,
    waitTimeMul: 0.62,
    rareBoost: 2.3,
    junkLoot: false,
    perks: ['攻击略低但闪避极高', '神通命中回血', '钓鱼读条缩短 50%', '稀有鱼概率大幅提升'],
    costs: ['基础攻击下降 14%'],
  },
  demon: {
    id: 'demon',
    name: '魔人鱼王',
    role: '狂暴 · 掠夺',
    tagline: '一刀见血，海族皆为我粮',
    body: '#3a1418',
    trim: '#8e1f26',
    hood: '#20090c',
    accent: '#ff5a4a',
    hull: '#2b1013',
    color: '#e2685a',
    soft: 'rgba(226,104,90,0.16)',
    glow: 'rgba(255,90,74,0.7)',
    aura: {
      core: '#ff5a3c',
      halo: '#2a0d12',
      rise: -0.6,
      size: 0.46,
      count: 132,
      opacity: 0.66,
      spin: -0.3,
    },
    attackMul: 1.62,
    hurtMul: 1.24,
    dodgeChance: 0.05,
    lifesteal: 0.26,
    skillHeal: 0,
    chargeTimeMul: 1,
    waitTimeMul: 1,
    rareBoost: 0.95,
    junkLoot: true,
    perks: ['攻击力极高且攻击吸血', '钓上垃圾可掠夺成魔材与金币', '宗门魔典加成更高'],
    costs: ['防御下降，受伤提高 24%', '闪避几乎为零', '稀有鱼概率略降'],
  },
}

export function isFactionId(value: unknown): value is FactionId {
  return value === 'immortal' || value === 'demon'
}

/** 未转职时的中性档：所有倍率为 1，不触发任何阵营逻辑 */
export const NEUTRAL_FACTION: FactionDef = {
  ...FACTIONS.immortal,
  id: 'immortal',
  name: '凡躯',
  role: '未转职',
  tagline: '',
  attackMul: 1,
  hurtMul: 1,
  dodgeChance: 0,
  lifesteal: 0,
  skillHeal: 0,
  chargeTimeMul: 1,
  waitTimeMul: 1,
  rareBoost: 1,
  junkLoot: false,
  perks: [],
  costs: [],
}

export function factionOf(id: FactionId | null | undefined): FactionDef {
  return id ? FACTIONS[id] : NEUTRAL_FACTION
}

/** 阵营是否已定（决定转职 UI 与数值是否生效） */
export function hasFaction(id: FactionId | null | undefined): id is FactionId {
  return id === 'immortal' || id === 'demon'
}

export function rivalFaction(id: FactionId): FactionId {
  return id === 'immortal' ? 'demon' : 'immortal'
}

/** 大比镜像对手的名字：敌对阵营 + 玩家境界 */
export function mirrorName(id: FactionId, realmShort: string) {
  return `${FACTIONS[id].name.slice(0, 2)}·${realmShort}心魔`
}
