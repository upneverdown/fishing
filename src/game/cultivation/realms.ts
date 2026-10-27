export interface RealmDef {
  id: string
  name: string
  short: string
  /** 修为达到该值即可渡劫；Infinity 表示已至尽头 */
  requiredXp: number
  attackMul: number
  hpMul: number
  speedMul: number
  color: string
  glow: string
  motto: string
}

export const REALMS: RealmDef[] = [
  {
    id: 'lianqi',
    name: '炼气期',
    short: '炼气',
    requiredXp: 1000,
    attackMul: 1,
    hpMul: 1,
    speedMul: 1,
    color: '#8fe6d6',
    glow: 'rgba(143,230,214,0.55)',
    motto: '引气入体，方能下海',
  },
  {
    id: 'zhuji',
    name: '筑基期',
    short: '筑基',
    requiredXp: 2000,
    attackMul: 1.1,
    hpMul: 1.1,
    speedMul: 1.1,
    color: '#7ed4ff',
    glow: 'rgba(126,212,255,0.6)',
    motto: '筑基成功，御水有诀',
  },
  {
    id: 'jindan',
    name: '金丹期',
    short: '金丹',
    requiredXp: 3600,
    attackMul: 1.22,
    hpMul: 1.22,
    speedMul: 1.2,
    color: '#f2c15c',
    glow: 'rgba(242,193,92,0.62)',
    motto: '金丹大成，火龙听令',
  },
  {
    id: 'yuanying',
    name: '元婴期',
    short: '元婴',
    requiredXp: Number.POSITIVE_INFINITY,
    attackMul: 1.36,
    hpMul: 1.36,
    speedMul: 1.3,
    color: '#e2c8ff',
    glow: 'rgba(226,200,255,0.68)',
    motto: '元婴出窍，万剑归宗',
  },
]

export const LAST_REALM_INDEX = REALMS.length - 1

export function realmAt(index: number): RealmDef {
  return REALMS[Math.min(Math.max(0, index | 0), LAST_REALM_INDEX)]
}

export function isRealmIndex(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= LAST_REALM_INDEX
}

/** 内丹只涨修为，永不换算金币 */
export interface CoreSpec {
  name: string
  xp: number
  color: string
  size: number
}

const CORE_BY_KIND: Record<string, CoreSpec> = {
  dragon: { name: '龙族内丹', xp: 200, color: '#f6d477', size: 0.62 },
  turtle: { name: '玄龟内丹', xp: 140, color: '#9fe0b4', size: 0.52 },
  whale: { name: '鲸落内丹', xp: 110, color: '#8ecbff', size: 0.46 },
  shark: { name: '鲨丹', xp: 60, color: '#b8d7de', size: 0.36 },
}

export function coreSpec(kind: string): CoreSpec {
  return CORE_BY_KIND[kind] ?? CORE_BY_KIND.shark
}

export type SkillId = 'water' | 'fire' | 'sword'

export interface SkillDef {
  id: SkillId
  key: string
  name: string
  realmIndex: number
  cooldown: number
  damage: number
  desc: string
  color: string
}

export const SKILLS: SkillDef[] = [
  {
    id: 'water',
    key: 'Q',
    name: '御水诀',
    realmIndex: 1,
    cooldown: 8,
    damage: 120,
    desc: '唤一道水流冲开前方海怪，附带迟滞',
    color: '#6fd8ff',
  },
  {
    id: 'fire',
    key: 'E',
    name: '火龙术',
    realmIndex: 2,
    cooldown: 15,
    damage: 60,
    desc: '在首领脚下烧起一片火海，持续灼烧',
    color: '#ff9a52',
  },
  {
    id: 'sword',
    key: 'R',
    name: '万剑归宗',
    realmIndex: 3,
    cooldown: 26,
    damage: 58,
    desc: '飞剑绕身，自动追斩最近的海怪',
    color: '#e2c8ff',
  },
]

export function skillUnlocked(skill: SkillDef, realmIndex: number) {
  return realmIndex >= skill.realmIndex
}

/** 首领的境界层级，用于境界压制 */
export function creatureRealm(kind: string): number {
  if (kind === 'dragon') return 2
  if (kind === 'turtle' || kind === 'whale') return 1
  return 0
}

export function realmAttackMul(realmIndex: number) {
  return realmAt(realmIndex).attackMul
}

export function realmSpeedMul(realmIndex: number) {
  return realmAt(realmIndex).speedMul
}

export function playerMaxHp(realmIndex: number, base = 100) {
  return Math.round(base * realmAt(realmIndex).hpMul)
}

export function realmSuppressionMul(playerRealm: number, bossRealm: number) {
  const diff = playerRealm - bossRealm
  if (diff === 0) return 1
  if (diff > 0) return Math.max(0.6, 1 / (1 + 0.2 * diff))
  return Math.min(1.6, 1 + 0.15 * -diff)
}

export function suppressionLabel(playerRealm: number, bossRealm: number) {
  const diff = playerRealm - bossRealm
  if (diff > 0) return '境界压制 · 受伤减少'
  if (diff < 0) return '境界受压 · 受伤增加'
  return '境界相当'
}
