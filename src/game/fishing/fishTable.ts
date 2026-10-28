import type { BaitId, Catch, CatchMethod, DayPeriod, MapZone, Rarity, SeasonId, WaterId } from '@/types'
import { CELESTIAL_FISH } from './celestialTable'

export interface RarityMeta {
  label: string
  color: string
  soft: string
  mult: number
  weight: number
}

export const RARITIES: Record<Rarity, RarityMeta> = {
  common: { label: '普通', color: '#b9c7c9', soft: 'rgba(185,199,201,0.16)', mult: 1, weight: 1 },
  uncommon: { label: '少见', color: '#6fd18a', soft: 'rgba(111,209,138,0.16)', mult: 1.55, weight: 0.52 },
  rare: { label: '稀有', color: '#58b4ff', soft: 'rgba(88,180,255,0.16)', mult: 2.4, weight: 0.22 },
  epic: { label: '史诗', color: '#b57cff', soft: 'rgba(181,124,255,0.18)', mult: 4.2, weight: 0.075 },
  legendary: { label: '传说', color: '#ffb13d', soft: 'rgba(255,177,61,0.2)', mult: 8, weight: 0.016 },
}

export const RARITY_ORDER: Rarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary']

export interface FishDef {
  id: string
  name: string
  rarity: Rarity
  minDepth: number
  maxDepth: number
  minKg: number
  maxKg: number
  pricePerKg: number
  difficulty: number
  desc: string
  seasons?: SeasonId[]
  periods?: DayPeriod[]
  baits?: Partial<Record<BaitId, number>>
  zones?: WaterId[]
  /** 缺省即凡间物种 */
  map?: MapZone
  /** 钓起即刻灌顶的修为，不走卖鱼回收 */
  xp?: number
  /** 钓起即刻获得的天界货币 */
  jade?: number
  /** 额外馈赠：按比例灌顶 / 引出首领 / 掉落特殊材料 */
  boon?: 'xpPercent' | 'summonEel' | 'relic'
  /** 材质颜色随时间轮转（九色锦鲤） */
  prism?: boolean
}

const MORTAL_FISH: FishDef[] = [
  {
    id: 'bleak',
    name: '白条',
    rarity: 'common',
    minDepth: 0.4,
    maxDepth: 2.6,
    minKg: 0.08,
    maxKg: 0.36,
    pricePerKg: 10,
    difficulty: 0.7,
    desc: '浅水里成群结队的小家伙，咬钩快，收线也快。',
    periods: ['dawn', 'day'],
    baits: { worm: 1.3, dough: 1.5 },
  },
  {
    id: 'crucian',
    name: '鲫鱼',
    rarity: 'common',
    minDepth: 0.4,
    maxDepth: 3.2,
    minKg: 0.15,
    maxKg: 0.9,
    pricePerKg: 14,
    difficulty: 0.75,
    desc: '新手的老朋友，几乎每个海湾都少不了它。',
    seasons: ['spring', 'summer', 'autumn', 'winter'],
    periods: ['dawn', 'day', 'dusk'],
    baits: { worm: 1.7, dough: 1.8, pellet: 1.4 },
  },
  {
    id: 'carp',
    name: '鲤鱼',
    rarity: 'common',
    minDepth: 0.8,
    maxDepth: 4.2,
    minKg: 0.8,
    maxKg: 4.2,
    pricePerKg: 18,
    difficulty: 0.85,
    desc: '力气不小，上钩后会贴着水底横冲直撞。',
    seasons: ['spring', 'summer', 'autumn'],
    periods: ['day', 'dusk'],
    baits: { worm: 1.6, pellet: 1.9, dough: 1.5 },
  },
  {
    id: 'snakehead',
    name: '黑鱼',
    rarity: 'uncommon',
    minDepth: 1,
    maxDepth: 4.4,
    minKg: 0.9,
    maxKg: 3.2,
    pricePerKg: 26,
    difficulty: 1,
    desc: '藏在水草阴影里，性子凶，挣扎得厉害。',
    seasons: ['summer', 'autumn'],
    periods: ['dusk', 'night'],
    baits: { minnow: 1.7, crank: 1.8 },
  },
  {
    id: 'grasscarp',
    name: '草鱼',
    rarity: 'uncommon',
    minDepth: 1.2,
    maxDepth: 4.6,
    minKg: 1.5,
    maxKg: 6,
    pricePerKg: 24,
    difficulty: 1.05,
    desc: '身板厚实，一条就够装满半个鱼篓。',
    seasons: ['spring', 'summer'],
    periods: ['day'],
    baits: { pellet: 1.8, dough: 1.2 },
  },
  {
    id: 'seabass',
    name: '鲈鱼',
    rarity: 'uncommon',
    minDepth: 1.6,
    maxDepth: 5,
    minKg: 0.7,
    maxKg: 2.8,
    pricePerKg: 38,
    difficulty: 1.1,
    desc: '码头酒馆的招牌菜，食客愿意为它多付几个铜板。',
    seasons: ['spring', 'autumn'],
    periods: ['dawn', 'dusk'],
    baits: { minnow: 1.8, crank: 1.9, spoon: 1.3 },
  },
  {
    id: 'catfish',
    name: '鲶鱼',
    rarity: 'rare',
    minDepth: 2.4,
    maxDepth: 7.2,
    minKg: 2.5,
    maxKg: 9,
    pricePerKg: 33,
    difficulty: 1.2,
    desc: '深潭里的重量级选手，胡须比船桨还长。',
    seasons: ['summer', 'autumn'],
    periods: ['night'],
    baits: { worm: 1.8, pellet: 1.3 },
  },
  {
    id: 'trout',
    name: '鳟鱼',
    rarity: 'rare',
    minDepth: 2,
    maxDepth: 6,
    minKg: 0.6,
    maxKg: 2.4,
    pricePerKg: 46,
    difficulty: 1.15,
    desc: '只在干净冷水里出没，鳞片像洒了一层银粉。',
    seasons: ['spring', 'autumn', 'winter'],
    periods: ['dawn', 'day'],
    baits: { spoon: 1.9, minnow: 1.6, crank: 1.4 },
  },
  {
    id: 'silversalmon',
    name: '银鲑',
    rarity: 'rare',
    minDepth: 2.8,
    maxDepth: 7.6,
    minKg: 2,
    maxKg: 5.5,
    pricePerKg: 52,
    difficulty: 1.3,
    desc: '逆流而上的旅行者，肌肉紧实，拉力惊人。',
    seasons: ['autumn', 'winter'],
    periods: ['dawn', 'dusk'],
    baits: { spoon: 1.7, minnow: 1.5 },
  },
  {
    id: 'koi',
    name: '锦鲤',
    rarity: 'epic',
    minDepth: 1.2,
    maxDepth: 4.4,
    minKg: 1.5,
    maxKg: 5,
    pricePerKg: 90,
    difficulty: 1.25,
    desc: '林间小湾的吉祥物，据说看见它的人一整天都有好运气。',
    seasons: ['spring', 'summer'],
    periods: ['dawn'],
    baits: { pellet: 1.8, dough: 1.7 },
  },
  {
    id: 'puffer',
    name: '河豚',
    rarity: 'epic',
    minDepth: 2.6,
    maxDepth: 7,
    minKg: 0.8,
    maxKg: 2.6,
    pricePerKg: 110,
    difficulty: 1.35,
    desc: '圆滚滚的一团，脾气却一点也不小。处理它需要专门的执照。',
    seasons: ['summer'],
    periods: ['day', 'dusk'],
    baits: { crank: 1.5, minnow: 1.2 },
  },
  {
    id: 'goldentrout',
    name: '金鳟',
    rarity: 'epic',
    minDepth: 3.4,
    maxDepth: 8.2,
    minKg: 1.2,
    maxKg: 3.8,
    pricePerKg: 135,
    difficulty: 1.45,
    desc: '瀑布深潭底部的金色身影，鳞片会在日光下燃烧。',
    seasons: ['autumn'],
    periods: ['dusk'],
    baits: { spoon: 2, crank: 1.4 },
  },
  {
    id: 'moonsturgeon',
    name: '月光鲟',
    rarity: 'legendary',
    minDepth: 4.4,
    maxDepth: 9.2,
    minKg: 6,
    maxKg: 18,
    pricePerKg: 220,
    difficulty: 1.6,
    desc: '只在深夜浮上来的古老鱼类，渔夫们说它的背鳍托着月光。',
    seasons: ['autumn', 'winter'],
    periods: ['night'],
    baits: { worm: 1.5, pellet: 1.4 },
  },
  {
    id: 'redfin',
    name: '赤鳍鲛',
    rarity: 'legendary',
    minDepth: 4.8,
    maxDepth: 9.4,
    minKg: 4,
    maxKg: 12,
    pricePerKg: 260,
    difficulty: 1.75,
    desc: '深水区的传说，红色背鳍划开水面时，整片海湾都会安静下来。',
    seasons: ['winter'],
    periods: ['night'],
    baits: { spoon: 1.6, minnow: 1.4 },
  },
  {
    id: 'sakurakoi',
    name: '樱花鲤',
    rarity: 'epic',
    minDepth: 1.2,
    maxDepth: 3.8,
    minKg: 1.2,
    maxKg: 3.6,
    pricePerKg: 120,
    difficulty: 1.28,
    desc: '花瓣落满水面的清晨才会现身，鳞片像被春光照透的薄绢。',
    seasons: ['spring'],
    periods: ['dawn'],
    baits: { pellet: 2, dough: 1.9, worm: 1.2 },
  },
  {
    id: 'mapletrout',
    name: '枫叶鳟',
    rarity: 'rare',
    minDepth: 2,
    maxDepth: 5.6,
    minKg: 0.7,
    maxKg: 2.8,
    pricePerKg: 58,
    difficulty: 1.18,
    desc: '顺着落叶一路游进海湾，背上的斑点像一小片枫林。',
    seasons: ['autumn'],
    periods: ['dusk', 'day'],
    baits: { spoon: 2, crank: 1.5, minnow: 1.3 },
  },
  {
    id: 'icewhitefish',
    name: '冰湖白鱼',
    rarity: 'epic',
    minDepth: 2.6,
    maxDepth: 7.4,
    minKg: 1,
    maxKg: 4,
    pricePerKg: 145,
    difficulty: 1.4,
    desc: '冰层下的银色影子，出水时带着一层不化的寒气。',
    seasons: ['winter'],
    periods: ['night', 'dawn'],
    baits: { minnow: 1.9, worm: 1.5, spoon: 1.3 },
  },
  {
    id: 'fireflybait',
    name: '萤火鱲',
    rarity: 'uncommon',
    minDepth: 0.6,
    maxDepth: 2.8,
    minKg: 0.1,
    maxKg: 0.5,
    pricePerKg: 34,
    difficulty: 0.9,
    desc: '夏夜水面上一层会游动的微光，靠近时又忽然熄灭。',
    seasons: ['summer'],
    periods: ['night', 'dusk'],
    baits: { minnow: 1.5, spoon: 1.4, worm: 1.1 },
  },
  {
    id: 'abysssturgeon',
    name: '渊底鲟',
    rarity: 'legendary',
    minDepth: 5.6,
    maxDepth: 10.2,
    minKg: 8,
    maxKg: 26,
    pricePerKg: 240,
    difficulty: 1.8,
    desc: '沉船深沟的守夜者。它几乎不动，可一旦咬钩，整条船都会被拖向深渊。',
    seasons: ['winter'],
    periods: ['night'],
    baits: { worm: 1.8, pellet: 1.7, minnow: 1.2 },
  },
  {
    id: 'mirrorcarp',
    name: '镜影鲤',
    rarity: 'rare',
    minDepth: 1.8,
    maxDepth: 6.4,
    minKg: 1.2,
    maxKg: 4.6,
    pricePerKg: 88,
    difficulty: 1.2,
    desc: '镜湖里鳞片像碎银的鲤鱼，游过时水面会留下两道光。',
    seasons: ['spring', 'summer', 'autumn', 'winter'],
    periods: ['dawn', 'day', 'dusk'],
    baits: { dough: 1.8, pellet: 1.7 },
    zones: ['mirror'],
  },
  {
    id: 'farseasail',
    name: '黑潮旗鱼',
    rarity: 'epic',
    minDepth: 1.6,
    maxDepth: 6.6,
    minKg: 8,
    maxKg: 28,
    pricePerKg: 150,
    difficulty: 1.55,
    desc: '背鳍像一面黑帆，只有穿过东侧海峡才见得到它的冲刺。',
    seasons: ['summer', 'autumn'],
    periods: ['day', 'dusk'],
    baits: { spoon: 1.9, crank: 1.4 },
    zones: ['farsea'],
  },
  {
    id: 'tidemanta',
    name: '潮鹰鲼',
    rarity: 'rare',
    minDepth: 2,
    maxDepth: 7.2,
    minKg: 5,
    maxKg: 16,
    pricePerKg: 76,
    difficulty: 1.25,
    desc: '在水里飞行的宽翼影子，从船底滑过时像一片会呼吸的云。',
    seasons: ['spring', 'summer', 'autumn'],
    periods: ['dawn', 'day'],
    baits: { minnow: 1.5, spoon: 1.3 },
    zones: ['farsea'],
  },
  {
    id: 'sunfish',
    name: '翻车鲀',
    rarity: 'epic',
    minDepth: 3,
    maxDepth: 8.4,
    minKg: 12,
    maxKg: 42,
    pricePerKg: 128,
    difficulty: 1.5,
    desc: '一块会游泳的圆石，懒洋洋地晒着外海的水面。',
    seasons: ['summer', 'winter'],
    periods: ['day'],
    baits: { pellet: 1.4, dough: 1.2 },
    zones: ['farsea'],
  },
  {
    id: 'abyssangler',
    name: '灯笼鮟鱇',
    rarity: 'epic',
    minDepth: 5,
    maxDepth: 10.4,
    minKg: 2,
    maxKg: 8,
    pricePerKg: 196,
    difficulty: 1.5,
    desc: '沟底唯一的一盏灯。它张开嘴时，那点冷光会先把你的影子吞掉。',
    seasons: ['autumn', 'winter'],
    periods: ['night'],
    baits: { worm: 1.8, minnow: 1.6 },
    zones: ['trench'],
  },
  {
    id: 'trenchdrake',
    name: '渊峡龙鱼',
    rarity: 'legendary',
    minDepth: 6,
    maxDepth: 10.5,
    minKg: 9,
    maxKg: 30,
    pricePerKg: 300,
    difficulty: 1.85,
    desc: '鳞片像旧刀鞘上的鎏金，龙王巡游时，它总在阴影里跟着。',
    seasons: ['spring', 'summer', 'autumn', 'winter'],
    periods: ['night', 'dusk'],
    baits: { spoon: 1.8, minnow: 1.7 },
    zones: ['trench'],
  },
]

export const FISH: FishDef[] = [...MORTAL_FISH, ...CELESTIAL_FISH]

const FISH_BY_ID = new Map(FISH.map((f) => [f.id, f]))

export function fishById(id: string) {
  return FISH_BY_ID.get(id)
}

export interface FishPickContext {
  season?: SeasonId
  period?: DayPeriod
  bait?: BaitId
  baitWear?: number
  zone?: WaterId | null
  map?: MapZone
}

export function baitPreference(def: FishDef, bait?: BaitId) {
  if (!bait) return 1
  return def.baits?.[bait] ?? 1
}

export function pickFish(depth: number, ctx: FishPickContext = {}): FishDef {
  const inMap = FISH.filter((f) => (f.map ?? 'mortal') === (ctx.map ?? 'mortal'))
  const pool = inMap.filter((f) => depth >= f.minDepth && depth <= f.maxDepth)
  const candidates = pool.length ? pool : inMap.slice(0, 3)
  const freshness = ctx.baitWear === undefined ? 1 : 0.35 + (ctx.baitWear / 100) * 0.65
  let total = 0
  const weights = candidates.map((f) => {
    const rarity = RARITIES[f.rarity]
    const depthBoost = depth > 4.6 ? 1 + (depth - 4.6) * 0.28 : 1
    const seasonBoost = f.seasons && ctx.season
      ? f.seasons.includes(ctx.season)
        ? 2.4
        : 0.1
      : 1
    const periodBoost = f.periods && ctx.period
      ? f.periods.includes(ctx.period)
        ? 1.7
        : 0.28
      : 1
    const pref = baitPreference(f, ctx.bait)
    const baitBoost = 1 + (pref - 1) * freshness
    const zoneBoost = f.zones
      ? ctx.zone && f.zones.includes(ctx.zone)
        ? 4.5
        : 0.05
      : 1
    const w = rarity.weight * depthBoost * seasonBoost * periodBoost * baitBoost * zoneBoost
    total += w
    return w
  })
  let roll = Math.random() * total
  for (let i = 0; i < candidates.length; i++) {
    roll -= weights[i]
    if (roll <= 0) return candidates[i]
  }
  return candidates[candidates.length - 1]
}

let catchSeq = 0

export function createCatch(def: FishDef, method: CatchMethod = 'rod'): Catch {
  const t = Math.pow(Math.random(), 1.65)
  const kg = +(def.minKg + (def.maxKg - def.minKg) * t).toFixed(2)
  const cm = Math.round(16 + Math.pow(Math.max(kg, 0.05), 0.5) * 36)
  const meta = RARITIES[def.rarity]
  const unitPrice = Math.round(def.pricePerKg * meta.mult)
  const value = Math.max(1, Math.round(unitPrice * kg * (0.92 + Math.random() * 0.16)))
  catchSeq += 1
  return {
    id: `${Date.now().toString(36)}-${catchSeq}`,
    defId: def.id,
    name: def.name,
    rarity: def.rarity,
    kg,
    cm,
    value,
    unitPrice,
    desc: def.desc,
    caughtAt: Date.now(),
    method,
  }
}
