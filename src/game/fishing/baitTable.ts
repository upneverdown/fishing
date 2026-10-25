import type { BaitCategory, BaitId } from '@/types'

export interface BaitDef {
  id: BaitId
  name: string
  short: string
  category: BaitCategory
  color: string
  accent: string
  desc: string
  tip: string
  sink: number
  wiggle: string
  attract: number
  waitFactor: number
  durability: number
  favors: Record<string, number>
}

export const BAITS: BaitDef[] = [
  {
    id: 'worm',
    name: '红蚯蚓',
    short: '活饵',
    category: 'live',
    color: '#c9755d',
    accent: '#e8a58e',
    desc: '挂在钩上还会扭动，底层鱼很难拒绝。',
    tip: '鲫鱼 / 鲤鱼 / 鲶鱼 · 下沉 0.35m/s',
    sink: 0.35,
    wiggle: '3cm · 3Hz',
    attract: 1,
    waitFactor: 1,
    durability: 90,
    favors: {
      crucian: 1.7,
      carp: 1.6,
      catfish: 1.8,
      icewhitefish: 1.5,
      abysssturgeon: 1.6,
    },
  },
  {
    id: 'minnow',
    name: '小银鱼',
    short: '活饵',
    category: 'live',
    color: '#a8c8c8',
    accent: '#d9efec',
    desc: '会自己游动的活饵，掠食性鱼种尤其偏爱。',
    tip: '鲈鱼 / 黑鱼 / 鳟鱼 · 悬浮慢沉',
    sink: 0.15,
    wiggle: '6cm · 3.5Hz',
    attract: 1.12,
    waitFactor: 0.88,
    durability: 110,
    favors: {
      seabass: 1.8,
      snakehead: 1.7,
      trout: 1.6,
      fireflybait: 1.5,
    },
  },
  {
    id: 'spoon',
    name: '亮片',
    short: '假饵',
    category: 'lure',
    color: '#e8c76a',
    accent: '#fff0bc',
    desc: '收线时左右摇摆反光，专门骗冷水里的掠食者。',
    tip: '鳟鱼 / 银鲑 / 枫叶鳟 · 需要抽动',
    sink: 0.9,
    wiggle: '侧摆 ±15° · 2Hz',
    attract: 1.28,
    waitFactor: 0.78,
    durability: 280,
    favors: {
      trout: 1.9,
      silversalmon: 1.7,
      mapletrout: 2,
      fireflybait: 1.4,
    },
  },
  {
    id: 'crank',
    name: '米诺',
    short: '假饵',
    category: 'lure',
    color: '#dd8a4b',
    accent: '#f6c393',
    desc: '硬质小鱼造型，抽动时会窜出逃命般的泳姿。',
    tip: '鲈鱼 / 黑鱼 / 鳟鱼 · 抽动诱鱼',
    sink: 0.3,
    wiggle: '摆尾 + 左右逃窜',
    attract: 1.22,
    waitFactor: 0.82,
    durability: 240,
    favors: {
      seabass: 1.9,
      snakehead: 1.8,
      mapletrout: 1.5,
      trout: 1.4,
    },
  },
  {
    id: 'pellet',
    name: '颗粒饵',
    short: '雾化',
    category: 'soft',
    color: '#b08a56',
    accent: '#dfc08d',
    desc: '入水后缓慢雾化，在钓点里拉出一条诱鱼的味道带。',
    tip: '鲤鱼 / 草鱼 / 锦鲤 · 雾化 20s',
    sink: 1.2,
    wiggle: '无 · 持续雾化',
    attract: 1.15,
    waitFactor: 0.9,
    durability: 70,
    favors: {
      carp: 1.9,
      grasscarp: 1.8,
      koi: 1.8,
      sakurakoi: 2,
      crucian: 1.4,
    },
  },
  {
    id: 'dough',
    name: '面团饵',
    short: '雾化',
    category: 'soft',
    color: '#d4bb84',
    accent: '#f4e2b4',
    desc: '捏成小团挂在钩尖，浅水里的鲫鱼和锦鲤最常光顾。',
    tip: '鲫鱼 / 锦鲤 / 樱花鲤 · 雾化 30s',
    sink: 0.9,
    wiggle: '无 · 缓慢散落',
    attract: 1.08,
    waitFactor: 0.95,
    durability: 55,
    favors: {
      crucian: 1.8,
      carp: 1.5,
      koi: 1.7,
      sakurakoi: 1.9,
      bleak: 1.3,
    },
  },
]

export const BAIT_BY_ID = new Map(BAITS.map((bait) => [bait.id, bait]))

export function baitById(id: string) {
  return BAIT_BY_ID.get(id as BaitId)
}

export function isBaitId(value: unknown): value is BaitId {
  return typeof value === 'string' && BAIT_BY_ID.has(value as BaitId)
}

export function baitCategoryLabel(category: BaitCategory) {
  if (category === 'live') return '活饵'
  if (category === 'lure') return '假饵'
  return '雾化饵'
}
