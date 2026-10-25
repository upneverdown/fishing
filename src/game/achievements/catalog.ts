export type AchievementCategory = 'combat' | 'explore' | 'vehicle' | 'secret'

export type AchievementIconId = 'swords' | 'waves' | 'ship' | 'sparkles' | 'compass' | 'chest'

export interface AchievementDef {
  id: string
  name: string
  desc: string
  category: AchievementCategory
  target: number
  unit: string
  reward: number
  icon: AchievementIconId
  hidden?: boolean
}

export interface AchievementProgress {
  progress: number
  unlockedAt: number
}

export type AchievementMap = Record<string, AchievementProgress>

export const ACHIEVEMENT_CATEGORIES: {
  id: AchievementCategory
  label: string
  accent: string
}[] = [
  { id: 'combat', label: '战斗', accent: '#e2685a' },
  { id: 'explore', label: '探索', accent: '#6fe0cf' },
  { id: 'vehicle', label: '载具', accent: '#f2c15c' },
  { id: 'secret', label: '彩蛋', accent: '#b58cff' },
]

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: 'dragon_slayer',
    name: '屠龙勇士',
    desc: '首次击败深渊龙王（终极形态）',
    category: 'combat',
    target: 1,
    unit: '次',
    reward: 3000,
    icon: 'swords',
  },
  {
    id: 'deep_fear',
    name: '深海恐惧症',
    desc: '在水下累计停留 5 分钟',
    category: 'explore',
    target: 300,
    unit: '秒',
    reward: 500,
    icon: 'waves',
  },
  {
    id: 'pirate_veteran',
    name: '加勒比老司机',
    desc: '驾驶海盗船累计航行 1000 米',
    category: 'vehicle',
    target: 1000,
    unit: '米',
    reward: 800,
    icon: 'ship',
  },
  {
    id: 'air_force_commander',
    name: '空军司令',
    desc: '高速航行时累计钓出 5 件垃圾物品',
    category: 'secret',
    target: 5,
    unit: '件',
    reward: 300,
    icon: 'sparkles',
    hidden: true,
  },
  {
    id: 'first_dive',
    name: '初次下潜',
    desc: '第一次潜入海湾水下',
    category: 'explore',
    target: 1,
    unit: '次',
    reward: 100,
    icon: 'compass',
  },
  {
    id: 'treasure_hunter',
    name: '宝箱猎人',
    desc: '打开 5 个沉船宝箱',
    category: 'explore',
    target: 5,
    unit: '个',
    reward: 600,
    icon: 'chest',
  },
]

const ACHIEVEMENT_MAP = new Map(ACHIEVEMENTS.map((a) => [a.id, a]))

export function achievementById(id: string) {
  return ACHIEVEMENT_MAP.get(id)
}

export function emptyAchievements(): AchievementMap {
  const map: AchievementMap = {}
  for (const def of ACHIEVEMENTS) map[def.id] = { progress: 0, unlockedAt: 0 }
  return map
}

export function achievementTotal(state: AchievementMap) {
  let unlocked = 0
  for (const def of ACHIEVEMENTS) if ((state[def.id]?.unlockedAt ?? 0) > 0) unlocked += 1
  return { unlocked, total: ACHIEVEMENTS.length }
}

export function formatAchievementValue(def: AchievementDef, value: number) {
  const clamped = Math.max(0, Math.min(def.target, value))
  if (def.id === 'deep_fear') {
    const mm = Math.floor(clamped / 60)
    const ss = Math.floor(clamped % 60)
    return `${mm}:${`${ss}`.padStart(2, '0')} / ${Math.floor(def.target / 60)}:00`
  }
  return `${Math.floor(clamped).toLocaleString('zh-CN')} / ${def.target.toLocaleString('zh-CN')} ${def.unit}`
}
