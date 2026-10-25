import type { Quality, Rarity } from '@/types'
import type { CropId } from '@/game/farm/crops'
import type { ForageId } from '@/game/farm/forage'
import { RARITY_ORDER } from '@/game/fishing/fishTable'

export interface RecipeDef {
  id: string
  name: string
  method: string
  fishRarity: Rarity
  fishCount: number
  cropId?: CropId
  cropCount?: number
  forageId?: ForageId
  forageCount?: number
  basePrice: number
  heatMs: number
  tagline: string
  effect: string
}

export const RECIPES: RecipeDef[] = [
  {
    id: 'campfire-grill',
    name: '篝火盐烤鱼',
    method: '篝火直烤',
    fishRarity: 'common',
    fishCount: 1,
    basePrice: 62,
    heatMs: 4800,
    tagline: '只撒一把粗盐，鱼皮贴着炭火卷起来的时候最香。',
    effect: '食用后恢复 14 点潜水氧气',
  },
  {
    id: 'campfire-skewer',
    name: '双鱼串烧',
    method: '篝火串烤',
    fishRarity: 'common',
    fishCount: 2,
    basePrice: 138,
    heatMs: 6200,
    tagline: '两条小鱼穿在一根枝上，油脂滴进火里，火苗会蹿高。',
    effect: '食用后恢复 22 点潜水氧气',
  },
  {
    id: 'campfire-stew',
    name: '渔夫乱炖',
    method: '吊锅慢炖',
    fishRarity: 'uncommon',
    fishCount: 1,
    basePrice: 196,
    heatMs: 7600,
    tagline: '锅里的汤色慢慢变白，海风一吹，整座码头都闻得到。',
    effect: '食用后恢复 30 点潜水氧气',
  },
  {
    id: 'grilled-crucian',
    name: '炭烤鲫鱼',
    method: '炭火直烤',
    fishRarity: 'common',
    fishCount: 1,
    cropId: 'scallion',
    cropCount: 1,
    basePrice: 74,
    heatMs: 6200,
    tagline: '鱼身划三刀，塞进小葱，烤到鱼皮起泡。',
    effect: '食用后恢复 15 点潜水氧气',
  },
  {
    id: 'bay-stew',
    name: '海湾杂鱼汤',
    method: '砂锅慢炖',
    fishRarity: 'common',
    fishCount: 2,
    cropId: 'radish',
    cropCount: 1,
    basePrice: 156,
    heatMs: 7400,
    tagline: '两条小鱼、一块萝卜，汤色会慢慢变成奶白。',
    effect: '食用后恢复 25 点潜水氧气',
  },
  {
    id: 'pumpkin-fish',
    name: '南瓜焖鱼',
    method: '铁锅焖烧',
    fishRarity: 'uncommon',
    fishCount: 1,
    cropId: 'pumpkin',
    cropCount: 1,
    basePrice: 228,
    heatMs: 8200,
    tagline: '南瓜吸饱鱼汁，甜味和咸味在锅底握手。',
    effect: '食用后恢复 30 点潜水氧气',
  },
  {
    id: 'chili-grill',
    name: '椒香烤鱼',
    method: '炭火直烤',
    fishRarity: 'rare',
    fishCount: 1,
    cropId: 'chili',
    cropCount: 1,
    basePrice: 336,
    heatMs: 7000,
    tagline: '火尾椒铺满鱼背，烤到边缘微焦才够香。',
    effect: '食用后短时提升鱼叉命中',
  },
  {
    id: 'lotus-soup',
    name: '莲藕鱼汤',
    method: '砂锅慢炖',
    fishRarity: 'uncommon',
    fishCount: 1,
    cropId: 'lotus',
    cropCount: 1,
    basePrice: 268,
    heatMs: 8600,
    tagline: '藕孔里全是汤，咬下去会烫嘴。',
    effect: '食用后恢复 28 点潜水氧气',
  },
  {
    id: 'snowpea-platter',
    name: '雪豆煎鱼',
    method: '平底锅煎',
    fishRarity: 'uncommon',
    fishCount: 1,
    cropId: 'snowpea',
    cropCount: 1,
    basePrice: 246,
    heatMs: 6800,
    tagline: '雪豆垫底，鱼皮朝下煎到金黄。',
    effect: '食用后恢复 20 点潜水氧气',
  },
  {
    id: 'forage-skewer',
    name: '野葱烤串',
    method: '炭火直烤',
    fishRarity: 'common',
    fishCount: 1,
    forageId: 'wildonion',
    forageCount: 2,
    basePrice: 118,
    heatMs: 5600,
    tagline: '没有菜园也能做的一串，野葱比想象中更提味。',
    effect: '食用后恢复 12 点潜水氧气',
  },
  {
    id: 'berry-glaze',
    name: '浆果蜜烤鱼',
    method: '炭火直烤',
    fishRarity: 'uncommon',
    fishCount: 1,
    forageId: 'berry',
    forageCount: 2,
    basePrice: 206,
    heatMs: 6400,
    tagline: '酸浆果压成酱刷在鱼皮上，烤出一层亮壳。',
    effect: '食用后恢复 24 点潜水氧气',
  },
  {
    id: 'mushroom-roast',
    name: '蘑菇烤鱼',
    method: '铁板炙烤',
    fishRarity: 'rare',
    fishCount: 1,
    forageId: 'mushroom',
    forageCount: 1,
    basePrice: 312,
    heatMs: 7200,
    tagline: '松针蘑菇先煎出汁，再把鱼放上去。',
    effect: '食用后恢复 32 点潜水氧气',
  },
  {
    id: 'shell-broth',
    name: '贝壳海鲜汤',
    method: '砂锅慢炖',
    fishRarity: 'rare',
    fishCount: 1,
    forageId: 'shell',
    forageCount: 2,
    basePrice: 328,
    heatMs: 8800,
    tagline: '海带和月牙贝一起下锅，鲜味会从锅盖缝里跑出来。',
    effect: '食用后恢复 36 点潜水氧气',
  },
]

const RECIPE_MAP = new Map(RECIPES.map((r) => [r.id, r]))

export function recipeById(id: string): RecipeDef | undefined {
  return RECIPE_MAP.get(id)
}

export const QUALITY_META: Record<Quality, { label: string; color: string; mult: number; note: string }> = {
  raw: { label: '夹生', color: '#d7b06b', mult: 0.42, note: '火候不足，鱼皮粘锅了' },
  good: { label: '恰好', color: '#8fd9b2', mult: 1, note: '火候正好，香味出来了' },
  perfect: { label: '完美', color: '#f2c15c', mult: 1.55, note: '外脆里嫩，锅气十足' },
  burnt: { label: '焦糊', color: '#b96556', mult: 0.28, note: '火太大了，边缘已经发黑' },
}

export function dishKey(recipeId: string, quality: Quality) {
  return `dish:${recipeId}#${quality}`
}

export function parseDishKey(key: string): { recipeId: string; quality: Quality } | null {
  if (!key.startsWith('dish:')) return null
  const body = key.slice(5)
  const hash = body.lastIndexOf('#')
  if (hash < 0) return null
  const recipeId = body.slice(0, hash)
  const quality = body.slice(hash + 1) as Quality
  if (!RECIPE_MAP.has(recipeId) || !(quality in QUALITY_META)) return null
  return { recipeId, quality }
}

export function dishValue(key: string) {
  const parsed = parseDishKey(key)
  if (!parsed) return 0
  const recipe = recipeById(parsed.recipeId)
  if (!recipe) return 0
  return Math.round(recipe.basePrice * QUALITY_META[parsed.quality].mult)
}

export function rowMeetsRarity(rarity: Rarity, required: Rarity) {
  return RARITY_ORDER.indexOf(rarity) >= RARITY_ORDER.indexOf(required)
}
