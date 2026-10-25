import type { CatchMethod, Rarity, SeasonId } from '@/types'
import { RARITY_ORDER } from '@/game/fishing/fishTable'
import { mulberry32 } from '@/game/utils/math'
import { dayKey } from '@/game/economy/market'
import { cropById } from '@/game/farm/crops'
import { forageById } from '@/game/farm/forage'
import { recipeById } from '@/game/cooking/recipes'

export type QuestKind =
  | 'catch'
  | 'catchRarity'
  | 'catchMethod'
  | 'catchSpecies'
  | 'sell'
  | 'harvest'
  | 'cook'
  | 'gather'

export interface QuestDef {
  id: string
  baseId: string
  npc: string
  title: string
  desc: string
  kind: QuestKind
  target: number
  targetId?: string
  rewardMoney: number
  rewardItem?: string
  rewardQty?: number
  weight: number
  seasons?: SeasonId[]
  category: 'catch' | 'farm' | 'cook' | 'gather' | 'sell'
  hint: string
}

export interface QuestState {
  id: string
  progress: number
  accepted: boolean
  claimed: boolean
}

export interface QuestEvent {
  kind: QuestKind
  amount: number
  defId?: string
  rarity?: Rarity
  method?: CatchMethod
  cropId?: string
  recipeId?: string
  itemId?: string
}

type QuestSeed = Omit<QuestDef, 'id'>

const seeds: QuestSeed[] = [
  {
    baseId: 'daily-catch-5',
    npc: 'xiaoman',
    title: '今日出海',
    desc: '小满说，收购站的冰柜空了一半。带五条鱼回来就行，大小不论。',
    kind: 'catch',
    target: 5,
    rewardMoney: 120,
    rewardItem: 'seed:scallion',
    rewardQty: 1,
    weight: 9,
    category: 'catch',
    hint: '任意方式捕获 5 条鱼',
  },
  {
    baseId: 'daily-catch-8',
    npc: 'xiaoman',
    title: '多跑一趟',
    desc: '风浪不大，别急着回港。再钓八条，老周头今晚就能早点收摊。',
    kind: 'catch',
    target: 8,
    rewardMoney: 190,
    rewardItem: 'seed:radish',
    rewardQty: 2,
    weight: 5,
    category: 'catch',
    hint: '任意方式捕获 8 条鱼',
  },
  {
    baseId: 'daily-rare',
    npc: 'xiaoman',
    title: '稀客来访',
    desc: '最近有稀有的影子在湾口打转。带一条稀有及以上的鱼回来，让大伙开开眼。',
    kind: 'catchRarity',
    target: 1,
    targetId: 'rare',
    rewardMoney: 260,
    weight: 6,
    category: 'catch',
    hint: '捕获 1 条稀有或更高稀有度的鱼',
  },
  {
    baseId: 'daily-epic',
    npc: 'xiaoman',
    title: '深水来信',
    desc: '阿岚想研究深水鱼的鳞片。史诗鱼一条，他愿意用一套新渔具换。',
    kind: 'catchRarity',
    target: 1,
    targetId: 'epic',
    rewardMoney: 520,
    rewardItem: 'seed:pumpkin',
    rewardQty: 2,
    weight: 2,
    category: 'catch',
    hint: '捕获 1 条史诗或传说鱼',
  },
  {
    baseId: 'daily-harpoon',
    npc: 'lan',
    title: '鱼叉试手',
    desc: '新磨的鱼叉总得见见血。用鱼叉带两条鱼回来，阿岚想知道手感如何。',
    kind: 'catchMethod',
    target: 2,
    targetId: 'harpoon',
    rewardMoney: 180,
    weight: 6,
    category: 'catch',
    hint: '用鱼叉捕获 2 条鱼',
  },
  {
    baseId: 'daily-net',
    npc: 'lan',
    title: '一网打尽',
    desc: '围网新补了边绳。用渔网捕三条鱼，看看网眼会不会太密。',
    kind: 'catchMethod',
    target: 3,
    targetId: 'net',
    rewardMoney: 210,
    weight: 5,
    category: 'catch',
    hint: '用渔网捕获 3 条鱼',
  },
  {
    baseId: 'daily-trap',
    npc: 'lan',
    title: '笼中客',
    desc: '鱼笼放在海底最省心。收两只笼子里的鱼回来，顺便看看笼门有没有变形。',
    kind: 'catchMethod',
    target: 2,
    targetId: 'trap',
    rewardMoney: 190,
    weight: 4,
    category: 'catch',
    hint: '用鱼笼捕获 2 条鱼',
  },
  {
    baseId: 'daily-species-crucian',
    npc: 'che',
    title: '今晚的鲫鱼汤',
    desc: '阿澈的汤锅已经烧上了。两条鲫鱼，现杀现炖，别让它等太久。',
    kind: 'catchSpecies',
    target: 2,
    targetId: 'crucian',
    rewardMoney: 150,
    rewardItem: 'seed:scallion',
    rewardQty: 1,
    weight: 7,
    category: 'catch',
    hint: '捕获 2 条鲫鱼',
  },
  {
    baseId: 'daily-species-snakehead',
    npc: 'che',
    title: '黑鱼两吃',
    desc: '黑鱼肉紧，切片涮锅最好。带一条来，阿澈给你留靠窗的位置。',
    kind: 'catchSpecies',
    target: 1,
    targetId: 'snakehead',
    rewardMoney: 200,
    weight: 5,
    category: 'catch',
    hint: '捕获 1 条黑鱼',
  },
  {
    baseId: 'daily-species-seabass',
    npc: 'che',
    title: '酒馆招牌',
    desc: '今晚有客人点名要鲈鱼。一条就够，但要新鲜的。',
    kind: 'catchSpecies',
    target: 1,
    targetId: 'seabass',
    rewardMoney: 220,
    weight: 5,
    category: 'catch',
    hint: '捕获 1 条鲈鱼',
  },
  {
    baseId: 'daily-species-trout',
    npc: 'che',
    title: '冷水鱼',
    desc: '阿澈想做一道冷盘。鳟鱼一条，鳞片要完整。',
    kind: 'catchSpecies',
    target: 1,
    targetId: 'trout',
    rewardMoney: 240,
    weight: 4,
    category: 'catch',
    hint: '捕获 1 条鳟鱼',
  },
  {
    baseId: 'daily-species-silversalmon',
    npc: 'che',
    title: '逆流的银光',
    desc: '银鲑开始洄游了。带一条回来，阿澈想试试新的烟熏法。',
    kind: 'catchSpecies',
    target: 1,
    targetId: 'silversalmon',
    rewardMoney: 320,
    weight: 3,
    seasons: ['autumn', 'winter'],
    category: 'catch',
    hint: '捕获 1 条银鲑',
  },
  {
    baseId: 'daily-species-koi',
    npc: 'apo',
    title: '好运锦鲤',
    desc: '阿婆说，看见锦鲤的人当天会走运。捞一条来给她看看，看完就放生。',
    kind: 'catchSpecies',
    target: 1,
    targetId: 'koi',
    rewardMoney: 420,
    rewardItem: 'seed:pumpkin',
    rewardQty: 1,
    weight: 2,
    seasons: ['spring', 'summer'],
    category: 'catch',
    hint: '捕获 1 条锦鲤',
  },
  {
    baseId: 'daily-species-moonsturgeon',
    npc: 'apo',
    title: '月光旧约',
    desc: '阿婆年轻时见过月光鲟。若你也能见到，替她带一句话回来说说。',
    kind: 'catchSpecies',
    target: 1,
    targetId: 'moonsturgeon',
    rewardMoney: 760,
    rewardItem: 'seed:snowpea',
    rewardQty: 2,
    weight: 1,
    seasons: ['autumn', 'winter'],
    category: 'catch',
    hint: '捕获 1 条月光鲟',
  },
  {
    baseId: 'daily-species-icewhitefish',
    npc: 'apo',
    title: '冰下银影',
    desc: '冬天的冰湖白鱼最干净。阿婆想用它的骨熬一锅汤。',
    kind: 'catchSpecies',
    target: 1,
    targetId: 'icewhitefish',
    rewardMoney: 460,
    weight: 3,
    seasons: ['winter'],
    category: 'catch',
    hint: '捕获 1 条冰湖白鱼',
  },
  {
    baseId: 'daily-species-sakurakoi',
    npc: 'apo',
    title: '花瓣落水时',
    desc: '樱花鲤只在春天的清晨露面。阿婆想再看一眼那种颜色。',
    kind: 'catchSpecies',
    target: 1,
    targetId: 'sakurakoi',
    rewardMoney: 460,
    weight: 3,
    seasons: ['spring'],
    category: 'catch',
    hint: '捕获 1 条樱花鲤',
  },
  {
    baseId: 'daily-harvest-3',
    npc: 'apo',
    title: '菜畦交货',
    desc: '阿婆的腰不太行了。帮她收三份蔬菜，动作轻点，别踩坏土埂。',
    kind: 'harvest',
    target: 3,
    rewardMoney: 150,
    rewardItem: 'seed:radish',
    rewardQty: 2,
    weight: 8,
    category: 'farm',
    hint: '收获 3 份蔬菜',
  },
  {
    baseId: 'daily-harvest-pumpkin',
    npc: 'apo',
    title: '南瓜熟了',
    desc: '蜜瓤南瓜应该能摘了。收一份来，阿婆教你挑瓜的诀窍。',
    kind: 'harvest',
    target: 1,
    targetId: 'pumpkin',
    rewardMoney: 190,
    rewardItem: 'seed:pumpkin',
    rewardQty: 1,
    weight: 4,
    category: 'farm',
    hint: '收获 1 份蜜瓤南瓜',
  },
  {
    baseId: 'daily-harvest-snowpea',
    npc: 'apo',
    title: '雪天里的绿',
    desc: '雪豆是冬天少见的绿色。收一份来，阿婆给你留一小包种子。',
    kind: 'harvest',
    target: 1,
    targetId: 'snowpea',
    rewardMoney: 220,
    weight: 3,
    seasons: ['winter'],
    category: 'farm',
    hint: '收获 1 份雪豆',
  },
  {
    baseId: 'daily-cook-2',
    npc: 'che',
    title: '灶台帮手',
    desc: '阿澈忙不过来。做两道菜就行，焦了也算你做过。',
    kind: 'cook',
    target: 2,
    rewardMoney: 190,
    rewardItem: 'forage:shell',
    rewardQty: 2,
    weight: 7,
    category: 'cook',
    hint: '完成 2 次烹饪',
  },
  {
    baseId: 'daily-cook-grilled',
    npc: 'che',
    title: '一条烤鱼',
    desc: '别的不用做，先来一条炭烤鲫鱼。阿澈要看看你的火候。',
    kind: 'cook',
    target: 1,
    targetId: 'grilled-crucian',
    rewardMoney: 160,
    rewardItem: 'seed:scallion',
    rewardQty: 2,
    weight: 6,
    category: 'cook',
    hint: '做出 1 份炭烤鲫鱼',
  },
  {
    baseId: 'daily-cook-stew',
    npc: 'che',
    title: '一锅海湾',
    desc: '杂鱼汤是酒馆的底子。炖一锅来，让阿澈尝尝你的调味。',
    kind: 'cook',
    target: 1,
    targetId: 'bay-stew',
    rewardMoney: 220,
    weight: 4,
    category: 'cook',
    hint: '做出 1 份海湾杂鱼汤',
  },
  {
    baseId: 'daily-cook-chili',
    npc: 'che',
    title: '辣味试炼',
    desc: '火尾椒烤鱼，阿澈只做给熟客。做一份来，辣度自己把握。',
    kind: 'cook',
    target: 1,
    targetId: 'chili-grill',
    rewardMoney: 300,
    weight: 2,
    category: 'cook',
    hint: '做出 1 份椒香烤鱼',
  },
  {
    baseId: 'daily-gather-4',
    npc: 'apo',
    title: '潮间带拾荒',
    desc: '退潮后的石缝里有不少好东西。帮阿婆捡四份回来，什么都要。',
    kind: 'gather',
    target: 4,
    rewardMoney: 130,
    rewardItem: 'forage:seaweed',
    rewardQty: 2,
    weight: 8,
    category: 'gather',
    hint: '采集任意物产 4 份',
  },
  {
    baseId: 'daily-gather-mushroom',
    npc: 'apo',
    title: '秋雨之后',
    desc: '松针蘑菇只在雨后冒头。采两份来，阿婆给你留着炖汤。',
    kind: 'gather',
    target: 2,
    targetId: 'mushroom',
    rewardMoney: 180,
    weight: 4,
    seasons: ['autumn'],
    category: 'gather',
    hint: '采集 2 份松针蘑菇',
  },
  {
    baseId: 'daily-gather-shell',
    npc: 'apo',
    title: '月牙贝壳',
    desc: '码头浅滩的月牙贝正肥。捡三枚来，阿澈要做海鲜汤。',
    kind: 'gather',
    target: 3,
    targetId: 'shell',
    rewardMoney: 170,
    weight: 4,
    seasons: ['summer', 'autumn'],
    category: 'gather',
    hint: '采集 3 枚月牙贝',
  },
  {
    baseId: 'daily-sell-400',
    npc: 'zhou',
    title: '今日流水',
    desc: '老周头今天想早点收摊。凑够四百块的渔获，他给你留一尾好鱼。',
    kind: 'sell',
    target: 400,
    rewardMoney: 110,
    rewardItem: 'seed:radish',
    rewardQty: 1,
    weight: 6,
    category: 'sell',
    hint: '累计卖出 ¥400 的渔获',
  },
  {
    baseId: 'daily-sell-900',
    npc: 'zhou',
    title: '大客户',
    desc: '有艘外港的船在收鱼。今天卖够九百块，老周头按上宾价结账。',
    kind: 'sell',
    target: 900,
    rewardMoney: 240,
    weight: 3,
    category: 'sell',
    hint: '累计卖出 ¥900 的渔获',
  },
]

function weightedPick(pool: QuestSeed[], rand: () => number): QuestSeed {
  const total = pool.reduce((s, q) => s + q.weight, 0)
  let roll = rand() * total
  for (const q of pool) {
    roll -= q.weight
    if (roll <= 0) return q
  }
  return pool[pool.length - 1]
}

export function dailyQuestList(day: string, season: SeasonId): QuestDef[] {
  const seed = Number(day.replace(/-/g, '')) + season.charCodeAt(0) * 31
  const rand = mulberry32(seed)
  const pool = seeds.filter((q) => !q.seasons || q.seasons.includes(season))
  const categories: QuestSeed['category'][] = ['catch', 'farm', 'cook', 'gather', 'sell']
  const shuffled = [...categories].sort(() => rand() - 0.5)
  const picked: QuestSeed[] = []
  for (const cat of shuffled) {
    if (picked.length >= 3) break
    const catPool = pool.filter((q) => q.category === cat)
    if (catPool.length) picked.push(weightedPick(catPool, rand))
  }
  if (picked.length < 3) {
    for (const q of pool) {
      if (!picked.includes(q)) picked.push(q)
      if (picked.length >= 3) break
    }
  }
  return picked.map((q) => ({
    ...q,
    id: `${day}:${season}:${q.baseId}`,
  }))
}

export function questMatches(def: QuestDef, ev: QuestEvent) {
  switch (def.kind) {
    case 'catch':
      return ev.kind === 'catch'
    case 'catchRarity':
      return (
        ev.kind === 'catch' &&
        Boolean(ev.rarity) &&
        RARITY_ORDER.indexOf(ev.rarity as Rarity) >=
          RARITY_ORDER.indexOf((def.targetId as Rarity) ?? 'rare')
      )
    case 'catchMethod':
      return ev.kind === 'catch' && ev.method === def.targetId
    case 'catchSpecies':
      return ev.kind === 'catch' && ev.defId === def.targetId
    case 'sell':
      return ev.kind === 'sell'
    case 'harvest':
      return ev.kind === 'harvest' && (!def.targetId || ev.cropId === def.targetId)
    case 'cook':
      return ev.kind === 'cook' && (!def.targetId || ev.recipeId === def.targetId)
    case 'gather':
      return ev.kind === 'gather' && (!def.targetId || ev.itemId === def.targetId)
    default:
      return false
  }
}

export function advanceQuests(
  states: QuestState[],
  defs: QuestDef[],
  event: QuestEvent,
): QuestState[] {
  let changed = false
  const next = states.map((state) => {
    if (!state.accepted || state.claimed) return state
    const def = defs.find((d) => d.id === state.id)
    if (!def || !questMatches(def, event)) return state
    if (state.progress >= def.target) return state
    const progress = Math.min(def.target, state.progress + event.amount)
    if (progress === state.progress) return state
    changed = true
    return { ...state, progress }
  })
  return changed ? next : states
}

export function questRewardItemName(key?: string) {
  if (!key) return ''
  if (key.startsWith('seed:')) {
    const crop = cropById(key.slice(5))
    return crop ? `${crop.name}种子` : '种子'
  }
  if (key.startsWith('forage:')) {
    const item = forageById(key.slice(7))
    return item?.name ?? '采集物'
  }
  if (key.startsWith('gear:')) return '渔具升级'
  if (key.startsWith('dish:')) {
    const body = key.slice(5)
    const recipe = recipeById(body.split('#')[0])
    return recipe?.name ?? '菜肴'
  }
  return '补给'
}

export function questDefsById(day: string, season: SeasonId) {
  return new Map(dailyQuestList(day, season).map((q) => [q.id, q]))
}

export function questDayLabel(day: string) {
  if (day === dayKey()) return '今日委托'
  return day
}

export function rarityFromIndex(index: number): Rarity {
  return ['common', 'uncommon', 'rare', 'epic', 'legendary'][index] as Rarity
}
