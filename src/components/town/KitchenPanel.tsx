import { useEffect, useMemo, useRef, useState } from 'react'
import { ChefHat, Flame, Fish, Info, Soup, UtensilsCrossed } from 'lucide-react'
import { useGameStore } from '@/store/useGameStore'
import {
  QUALITY_META,
  RECIPES,
  dishValue,
  parseDishKey,
  recipeById,
  rowMeetsRarity,
  type RecipeDef,
} from '@/game/cooking/recipes'
import { cropById, produceKey, seedKey } from '@/game/farm/crops'
import { forageById, forageKey } from '@/game/farm/forage'
import { Button } from '@/components/ui/button'
import { Bar, Chip, Empty, PanelHead } from './shared'
import { cn } from '@/lib/utils'
import type { Quality } from '@/types'

function ingredientStatus(recipe: RecipeDef, bag: ReturnType<typeof useGameStore.getState>['bag'], pantry: Record<string, number>) {
  const fishHave = bag.filter((c) => rowMeetsRarity(c.rarity, recipe.fishRarity)).length
  const cropHave = recipe.cropId ? (pantry[produceKey(recipe.cropId)] ?? 0) : 0
  const forageHave = recipe.forageId ? (pantry[forageKey(recipe.forageId)] ?? 0) : 0
  return {
    fishHave,
    fishOk: fishHave >= recipe.fishCount,
    cropHave,
    cropOk: !recipe.cropId || cropHave >= (recipe.cropCount ?? 1),
    forageHave,
    forageOk: !recipe.forageId || forageHave >= (recipe.forageCount ?? 1),
  }
}

function qualityAt(pos: number): Quality {
  const d = Math.abs(pos - 0.5)
  if (d <= 0.055) return 'perfect'
  if (d <= 0.17) return 'good'
  return pos < 0.5 ? 'raw' : 'burnt'
}

function RecipeRow({
  recipe,
  selected,
  onSelect,
}: {
  recipe: RecipeDef
  selected: boolean
  onSelect: () => void
}) {
  const bag = useGameStore((s) => s.bag)
  const pantry = useGameStore((s) => s.pantry)
  const status = ingredientStatus(recipe, bag, pantry)
  const ready = status.fishOk && status.cropOk && status.forageOk
  const quality = useMemo(() => {
    const keys = Object.keys(pantry).filter((k) => k.startsWith(`dish:${recipe.id}#`))
    return keys.reduce((sum, k) => sum + (pantry[k] ?? 0), 0)
  }, [pantry, recipe.id])

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'w-full rounded-lg border p-2 text-left transition-colors',
        selected
          ? 'border-gold/45 bg-gold/8'
          : ready
            ? 'border-border/50 bg-card/40 hover:border-tide/35'
            : 'border-border/30 bg-card/20 opacity-70 hover:border-border/50',
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-[11.5px] font-medium text-foam/90">{recipe.name}</span>
        <span className="tnum shrink-0 text-[10px] text-gold">¥{recipe.basePrice}</span>
      </div>
      <div className="mt-0.5 flex items-center gap-1.5 text-[8.5px] text-foam/35">
        <span>{recipe.method}</span>
        <span>·</span>
        <span className={ready ? 'text-tide/70' : 'text-destructive/70'}>{ready ? '材料齐备' : '缺材料'}</span>
        {quality > 0 && <span className="text-foam/45">· 库存 {quality}</span>}
      </div>
    </button>
  )
}

function HeatBar({ pos, active }: { pos: number; active: boolean }) {
  return (
    <div className="relative h-8 overflow-hidden rounded-lg border border-border/50 bg-[#1b0f0b]">
      <div className="absolute inset-y-0 left-0 w-[18%] bg-[#3b2a1c]" />
      <div className="absolute inset-y-0 left-[18%] w-[14%] bg-[#6b4a26]/70" />
      <div className="absolute inset-y-0 left-[44%] w-[12%] bg-gradient-to-r from-[#e2a354]/60 via-[#f2c15c]/80 to-[#e2a354]/60" />
      <div className="absolute inset-y-0 left-[68%] w-[14%] bg-[#8a4a2c]/70" />
      <div className="absolute inset-y-0 right-0 w-[18%] bg-[#4a1712]" />
      <div className="pointer-events-none absolute inset-0 flex items-center justify-between px-2 text-[8px] tracking-widest text-foam/30">
        <span>生</span>
        <span className="text-gold/70">完美</span>
        <span>焦</span>
      </div>
      <div
        className={cn(
          'absolute top-0 h-full w-0.5 bg-foam shadow-[0_0_8px_rgba(255,255,255,0.8)]',
          active && 'transition-none',
        )}
        style={{ left: `${pos * 100}%` }}
      />
    </div>
  )
}

export function KitchenPanel() {
  const bag = useGameStore((s) => s.bag)
  const pantry = useGameStore((s) => s.pantry)
  const cookDish = useGameStore((s) => s.cookDish)
  const eatDish = useGameStore((s) => s.eatDish)
  const sellPantry = useGameStore((s) => s.sellPantryItem)
  const underwater = useGameStore((s) => s.underwater)
  const [selectedId, setSelectedId] = useState(RECIPES[0].id)
  const recipe = recipeById(selectedId) ?? RECIPES[0]
  const status = ingredientStatus(recipe, bag, pantry)
  const canCook = status.fishOk && status.cropOk && status.forageOk
  const [cooking, setCooking] = useState(false)
  const [pos, setPos] = useState(0)
  const [result, setResult] = useState<{ quality: Quality; key: string } | null>(null)
  const startRef = useRef(0)
  const posRef = useRef(0)

  useEffect(() => {
    if (!cooking) return
    startRef.current = performance.now()
    let raf = 0
    const speed = 1.5 + 5200 / recipe.heatMs
    const tick = (t: number) => {
      const elapsed = (t - startRef.current) / 1000
      const next = 0.5 + 0.5 * Math.sin(elapsed * speed * Math.PI)
      posRef.current = next
      setPos(next)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [cooking, recipe.heatMs])

  const finish = () => {
    if (!cooking) return
    const quality = qualityAt(posRef.current)
    const key = cookDish(recipe.id, quality)
    setCooking(false)
    if (key) setResult({ quality, key })
  }

  const dishKeys = Object.keys(pantry).filter((k) => k.startsWith('dish:') && pantry[k] > 0)

  return (
    <div className="grid h-full min-h-0 gap-3 overflow-y-auto pr-0.5 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
      <div className="flex min-h-0 flex-col gap-2">
        <PanelHead title="阿澈的灶台" desc="挑一条鱼、配一味菜，火候到了就起锅。" />
        <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
          {RECIPES.map((r) => (
            <RecipeRow key={r.id} recipe={r} selected={r.id === recipe.id} onSelect={() => setSelectedId(r.id)} />
          ))}
        </div>
      </div>

      <div className="flex min-h-0 flex-col gap-2">
        <div className="rounded-xl border border-border/50 bg-card/40 p-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <ChefHat className="size-4 text-gold" />
                <span className="text-[15px] font-semibold text-foam">{recipe.name}</span>
              </div>
              <div className="mt-0.5 text-[9.5px] text-foam/40">
                {recipe.method} · 火候 {Math.round(recipe.heatMs / 1000)} 秒左右
              </div>
            </div>
            <Chip color="#f2c15c" soft="#f2c15c1a">
              基准 ¥{recipe.basePrice}
            </Chip>
          </div>

          <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">{recipe.tagline}</p>

          <div className="mt-2.5 flex flex-wrap gap-1.5">
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9.5px]',
                status.fishOk ? 'bg-tide/10 text-tide' : 'bg-destructive/10 text-destructive',
              )}
            >
              <Fish className="size-3" />
              {recipe.fishRarity}以上鱼 {status.fishHave}/{recipe.fishCount}
            </span>
            {recipe.cropId && (
              <span
                className={cn(
                  'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9.5px]',
                  status.cropOk ? 'bg-[#8fbf77]/12 text-[#a9d48f]' : 'bg-destructive/10 text-destructive',
                )}
              >
                <Soup className="size-3" />
                {cropById(recipe.cropId)?.name} {status.cropHave}/{recipe.cropCount ?? 1}
              </span>
            )}
            {recipe.forageId && (
              <span
                className={cn(
                  'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9.5px]',
                  status.forageOk ? 'bg-gold/10 text-gold' : 'bg-destructive/10 text-destructive',
                )}
              >
                <UtensilsCrossed className="size-3" />
                {forageById(recipe.forageId)?.name} {status.forageHave}/{recipe.forageCount ?? 1}
              </span>
            )}
          </div>

          <div className="mt-2 flex items-start gap-1.5 rounded-md bg-foam/5 px-2 py-1.5 text-[9.5px] leading-relaxed text-foam/45">
            <Info className="mt-0.5 size-3 shrink-0" />
            {recipe.effect}
          </div>

          <div className="mt-3">
            <div className="mb-1 flex items-center justify-between text-[9px] text-foam/40">
              <span className="inline-flex items-center gap-1">
                <Flame className="size-3 text-destructive/80" />
                火候
              </span>
              {cooking && <span className="text-gold">在完美区起锅</span>}
            </div>
            <HeatBar pos={pos} active={cooking} />
          </div>

          <div className="mt-2.5 flex items-center gap-2">
            {!cooking ? (
              <Button
                disabled={!canCook}
                onClick={() => {
                  setResult(null)
                  setCooking(true)
                }}
                className="h-9 flex-1 rounded-lg bg-gold/18 text-[12px] font-semibold text-gold hover:bg-gold/28 disabled:opacity-40"
              >
                <Flame className="size-4" />
                {canCook ? '点火开锅' : '材料不足'}
              </Button>
            ) : (
              <Button
                onClick={finish}
                className="h-9 flex-1 rounded-lg bg-destructive/85 text-[12px] font-semibold text-white hover:bg-destructive"
              >
                起锅
              </Button>
            )}
          </div>

          {result && (
            <div className="mt-2 rounded-lg border border-border/45 bg-abyss/35 px-2.5 py-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-foam/80">
                  {recipe.name} ·{' '}
                  <span style={{ color: QUALITY_META[result.quality].color }}>
                    {QUALITY_META[result.quality].label}
                  </span>
                </span>
                <span className="tnum text-[11px] font-semibold text-gold">¥{dishValue(result.key)}</span>
              </div>
              <div className="mt-0.5 text-[9.5px] text-foam/35">{QUALITY_META[result.quality].note}</div>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-border/45 bg-card/35 p-2.5">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[10px] tracking-[0.18em] text-foam/45">
              <UtensilsCrossed className="size-3" />
              做好的菜
            </div>
            <span className="text-[9px] text-foam/30">{underwater ? '潜水中可食用' : '浮上水面后可食用'}</span>
          </div>
          {dishKeys.length === 0 ? (
            <Empty icon={<Soup className="size-5" />} title="还没有做好的菜" hint="先从最简单的炭烤鲫鱼开始" />
          ) : (
            <div className="grid gap-1.5 sm:grid-cols-2">
              {dishKeys.map((key) => {
                const parsed = parseDishKey(key)
                const def = parsed ? recipeById(parsed.recipeId) : undefined
                const meta = parsed ? QUALITY_META[parsed.quality] : null
                if (!def || !meta) return null
                return (
                  <div key={key} className="flex items-center gap-2 rounded-lg border border-border/40 bg-abyss/25 p-1.5">
                    <span className="grid size-7 place-items-center rounded-full bg-gold/10 text-gold">
                      <Soup className="size-3.5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[10.5px] text-foam/85">
                        {def.name} <span style={{ color: meta.color }}>· {meta.label}</span>
                      </div>
                      <div className="tnum text-[8.5px] text-foam/35">
                        库存 {pantry[key]} · ¥{dishValue(key)}
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={!underwater}
                      onClick={() => eatDish(key)}
                      className="rounded-full bg-tide/10 px-1.5 py-1 text-[8.5px] text-tide transition-colors hover:bg-tide/20 disabled:opacity-30"
                      title={underwater ? '食用恢复氧气' : '需要潜入水下'}
                    >
                      食用
                    </button>
                    <button
                      type="button"
                      onClick={() => sellPantry(key, 1)}
                      className="rounded-full bg-gold/10 px-1.5 py-1 text-[8.5px] text-gold transition-colors hover:bg-gold/20"
                    >
                      卖
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-border/40 bg-abyss/25 p-2 text-[9px] leading-relaxed text-foam/35">
          <div className="mb-1 flex items-center gap-1.5 text-foam/45">
            <Bar value={100} className="hidden w-8" />
            菜园产出入菜，海货决定底味。完美火候的菜价值最高，夹生和焦糊只能贱卖。
          </div>
        </div>
      </div>
    </div>
  )
}
