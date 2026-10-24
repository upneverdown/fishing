import type { SeasonId } from '@/types'

export type ForageId = 'wildonion' | 'berry' | 'mushroom' | 'seaweed' | 'shell' | 'firefly'

export interface ForageDef {
  id: ForageId
  name: string
  zone: string
  seasons: SeasonId[]
  cooldownMs: number
  sellPrice: number
  color: string
  tagline: string
  use: string
}

export const FORAGE: ForageDef[] = [
  {
    id: 'wildonion',
    name: '野葱',
    zone: '潮线草坡',
    seasons: ['spring', 'summer', 'autumn'],
    cooldownMs: 120000,
    sellPrice: 9,
    color: '#8fbf77',
    tagline: '贴着礁石缝长，辛香比菜园里的小葱更野。',
    use: '烤鱼去腥 / 鱼汤提味',
  },
  {
    id: 'berry',
    name: '海崖浆果',
    zone: '南侧灌木',
    seasons: ['summer', 'autumn'],
    cooldownMs: 180000,
    sellPrice: 14,
    color: '#c2576e',
    tagline: '酸甜的小果，鸟和小满都盯着同一丛。',
    use: '浆果蜜烤鱼 / 赠礼',
  },
  {
    id: 'mushroom',
    name: '松针蘑菇',
    zone: '林间小湾',
    seasons: ['autumn'],
    cooldownMs: 240000,
    sellPrice: 20,
    color: '#c9a06b',
    tagline: '落叶堆里冒出来的小伞，只在秋雨后成片。',
    use: '蘑菇烤鱼',
  },
  {
    id: 'seaweed',
    name: '潮汐海带',
    zone: '浅滩石隙',
    seasons: ['spring', 'summer', 'autumn', 'winter'],
    cooldownMs: 90000,
    sellPrice: 8,
    color: '#4f8f72',
    tagline: '退潮后挂在石头上，带着一层薄薄的盐霜。',
    use: '海鲜汤 / 鱼饵辅料',
  },
  {
    id: 'shell',
    name: '月牙贝',
    zone: '码头浅滩',
    seasons: ['summer', 'autumn'],
    cooldownMs: 150000,
    sellPrice: 18,
    color: '#e6d6c0',
    tagline: '半掩在沙里的小贝，壳口像一弯月牙。',
    use: '贝壳海鲜汤',
  },
  {
    id: 'firefly',
    name: '萤火虫',
    zone: '夏夜芦苇',
    seasons: ['summer'],
    cooldownMs: 210000,
    sellPrice: 12,
    color: '#d8f38a',
    tagline: '夏夜才有的微光，装进玻璃瓶里能亮半宿。',
    use: '赠礼 / 夜钓气氛',
  },
]

const FORAGE_MAP = new Map(FORAGE.map((f) => [f.id, f]))

export function forageById(id: string): ForageDef | undefined {
  return FORAGE_MAP.get(id as ForageId)
}

export function forageKey(id: ForageId) {
  return `forage:${id}`
}

export function forageFromKey(key: string) {
  return key.startsWith('forage:') ? forageById(key.slice(7)) : undefined
}
