import type { WaterId } from '@/types'

export type BoatSkinId = 'rowboat' | 'speedboat' | 'patrol' | 'submarine' | 'icebreaker' | 'pirate'
export type RodSkinId = 'classic' | 'tide' | 'ember' | 'aurora'
export type DecorationId = 'figurehead' | 'garland' | 'flag' | 'crate'

export type ShopKind = 'boat' | 'rod' | 'decoration'

export interface BoatStyle {
  id: BoatSkinId
  name: string
  title: string
  tagline: string
  price: number
  speed: number
  turn: number
  accent: string
  tier: number
  classLabel: string
  capacity: number
  gearCap: number
  facilitySlots: number
  durability: number
  weatherproof: boolean
  waters: WaterId[]
}

export interface RodSkin {
  id: RodSkinId
  name: string
  tagline: string
  price: number
  rod: string
  grip: string
  reel: string
  accent: string
  glow: string
  glowIntensity: number
}

export interface Decoration {
  id: DecorationId
  name: string
  tagline: string
  price: number
  accent: string
}

export const BOAT_STYLES: BoatStyle[] = [
  {
    id: 'rowboat',
    name: '潮汐号',
    title: '老木舟',
    tagline: '船板被海水泡得发亮，摇橹声是海湾最熟悉的节拍。',
    price: 0,
    speed: 1,
    turn: 1,
    accent: '#c9945e',
    tier: 1,
    classLabel: '小木船',
    capacity: 10,
    gearCap: 2,
    facilitySlots: 2,
    durability: 70,
    weatherproof: false,
    waters: ['bay', 'creek'],
  },
  {
    id: 'speedboat',
    name: '飞鱼号',
    title: '快艇',
    tagline: '玻璃钢船身配一台老舷外机，起速时船头会轻轻抬起来。',
    price: 480,
    speed: 1.38,
    turn: 1.18,
    accent: '#5fd8c9',
    tier: 2,
    classLabel: '快艇',
    capacity: 16,
    gearCap: 3,
    facilitySlots: 3,
    durability: 90,
    weatherproof: false,
    waters: ['bay', 'creek', 'falls', 'mirror'],
  },
  {
    id: 'patrol',
    name: '守潮号',
    title: '巡逻舰',
    tagline: '退役的港区巡逻艇，甲板稳当，浪大也不怎么晃。',
    price: 1500,
    speed: 1.15,
    turn: 0.86,
    accent: '#8fb0bd',
    tier: 3,
    classLabel: '豪华游艇',
    capacity: 26,
    gearCap: 3,
    facilitySlots: 4,
    durability: 120,
    weatherproof: true,
    waters: ['bay', 'creek', 'falls', 'mirror', 'farsea', 'trench'],
  },
  {
    id: 'submarine',
    name: '深歌号',
    title: '潜水艇',
    tagline: '黄铜舷窗与围壳还带着机油味，潜望镜正好用来找鱼群。',
    price: 2600,
    speed: 1.06,
    turn: 1.12,
    accent: '#d8b45a',
    tier: 3,
    classLabel: '潜航艇',
    capacity: 20,
    gearCap: 3,
    facilitySlots: 3,
    durability: 100,
    weatherproof: true,
    waters: ['bay', 'creek', 'falls', 'mirror', 'farsea', 'trench'],
  },
  {
    id: 'icebreaker',
    name: '白夜号',
    title: '破冰船',
    tagline: '厚钢板船首能把浮冰压碎，冬天去最北边的海域也稳。',
    price: 4200,
    speed: 1.02,
    turn: 0.92,
    accent: '#d7e6ee',
    tier: 3,
    classLabel: '破冰船',
    capacity: 22,
    gearCap: 3,
    facilitySlots: 4,
    durability: 150,
    weatherproof: true,
    waters: ['bay', 'creek', 'falls', 'mirror', 'farsea', 'trench'],
  },
  {
    id: 'pirate',
    name: '黑帆号',
    title: '海盗船',
    tagline: '黑色船壳、破帆与船首骷髅，船尾灯笼在夜里像一点不肯熄灭的鬼火。',
    price: 6800,
    speed: 1.24,
    turn: 0.78,
    accent: '#d6a84a',
    tier: 4,
    classLabel: '加勒比海盗船',
    capacity: 30,
    gearCap: 3,
    facilitySlots: 4,
    durability: 320,
    weatherproof: true,
    waters: ['bay', 'creek', 'falls', 'mirror', 'farsea', 'trench'],
  },
]

export const ROD_SKINS: RodSkin[] = [
  {
    id: 'classic',
    name: '竹韵',
    tagline: '老竹竿，握柄被掌心磨得温润。',
    price: 0,
    rod: '#5d4229',
    grip: '#5b3f28',
    reel: '#c9945e',
    accent: '#d8b978',
    glow: '#000000',
    glowIntensity: 0,
  },
  {
    id: 'tide',
    name: '潮青',
    tagline: '青绿漆面绕着一圈圈浅金线，像退潮时露出的礁石。',
    price: 160,
    rod: '#1f5f5a',
    grip: '#143c39',
    reel: '#7fd8c9',
    accent: '#a8f0e1',
    glow: '#2fd8c0',
    glowIntensity: 0.35,
  },
  {
    id: 'ember',
    name: '赤霞',
    tagline: '晚霞色的竿身，出线时像把一小片天色甩了出去。',
    price: 320,
    rod: '#7b2f2a',
    grip: '#3d1c18',
    reel: '#e2a354',
    accent: '#f2c66f',
    glow: '#ff7a3c',
    glowIntensity: 0.45,
  },
  {
    id: 'aurora',
    name: '极光',
    tagline: '深蓝竿体里沉着一点冷光，夜里最显眼。',
    price: 560,
    rod: '#24314f',
    grip: '#141c2e',
    reel: '#9dc6ff',
    accent: '#d3e6ff',
    glow: '#6fa8ff',
    glowIntensity: 0.7,
  },
]

export const DECORATIONS: Decoration[] = [
  {
    id: 'flag',
    name: '三角旗',
    tagline: '系在船尾的小旗，顺风时会啪嗒啪嗒地响。',
    price: 120,
    accent: '#e35d4f',
  },
  {
    id: 'crate',
    name: '渔获木箱',
    tagline: '印着老码头字样的木箱，空着也有出海的样子。',
    price: 90,
    accent: '#c9945e',
  },
  {
    id: 'garland',
    name: '渔火灯串',
    tagline: '沿着船舷挂一圈暖灯，傍晚收竿时最好看。',
    price: 240,
    accent: '#ffcf7a',
  },
  {
    id: 'figurehead',
    name: '金鲤船首像',
    tagline: '一条鎏金小鲤鱼钉在船头，据说能带来好渔获。',
    price: 380,
    accent: '#d6a84a',
  },
]

export interface ShopEntry {
  id: BoatSkinId | RodSkinId | DecorationId
  kind: ShopKind
  name: string
  price: number
}

const ENTRY_MAP = new Map<string, ShopEntry>()
for (const item of BOAT_STYLES) {
  ENTRY_MAP.set(item.id, { id: item.id, kind: 'boat', name: item.name, price: item.price })
}
for (const item of ROD_SKINS) {
  ENTRY_MAP.set(item.id, { id: item.id, kind: 'rod', name: item.name, price: item.price })
}
for (const item of DECORATIONS) {
  ENTRY_MAP.set(item.id, { id: item.id, kind: 'decoration', name: item.name, price: item.price })
}

export function findShopEntry(id: string): ShopEntry | undefined {
  return ENTRY_MAP.get(id)
}

export const DEFAULT_OWNED = ['rowboat', 'classic']

export function isBoatSkin(id: string): id is BoatSkinId {
  return BOAT_STYLES.some((s) => s.id === id)
}

export function boatStyle(id: BoatSkinId): BoatStyle {
  return BOAT_STYLES.find((s) => s.id === id) ?? BOAT_STYLES[0]
}

export function boatCapacity(id: BoatSkinId): number {
  return boatStyle(id).capacity
}

export function boatGearCap(id: BoatSkinId): number {
  return boatStyle(id).gearCap
}

export function boatFacilitySlots(id: BoatSkinId): number {
  return boatStyle(id).facilitySlots
}

export function isRodSkin(id: string): id is RodSkinId {
  return ROD_SKINS.some((s) => s.id === id)
}

export function isDecoration(id: string): id is DecorationId {
  return DECORATIONS.some((s) => s.id === id)
}
