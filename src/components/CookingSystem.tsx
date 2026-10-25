import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ChefHat, Flame, Fish, Soup, Sparkles, X } from 'lucide-react'
import { useGameStore } from '@/store/useGameStore'
import {
  QUALITY_META,
  RECIPES,
  dishValue,
  recipeById,
  rowMeetsRarity,
  type RecipeDef,
} from '@/game/cooking/recipes'
import { cn } from '@/lib/utils'

const CAMPFIRE_RECIPES = RECIPES.filter((recipe) => recipe.id.startsWith('campfire'))
const QUALITY: keyof typeof QUALITY_META = 'good'

interface CookResult {
  key: string
  recipeId: string
  value: number
}

function availableFish(recipe: RecipeDef, bag: ReturnType<typeof useGameStore.getState>['bag']) {
  return bag.filter((catchItem) => rowMeetsRarity(catchItem.rarity, recipe.fishRarity)).length
}

function PotStage({ cooking, progress }: { cooking: boolean; progress: number }) {
  return (
    <div className="relative mx-auto h-32 w-48 select-none">
      <div className="absolute inset-x-0 bottom-0 h-3 rounded-full bg-[radial-gradient(ellipse,rgba(255,150,60,0.45),transparent_70%)] blur-[2px]" />
      <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 items-end justify-center gap-1">
        <span className={cn('flame flame-outer', cooking && 'flame-live')} />
        <span className={cn('flame flame-inner', cooking && 'flame-live')} />
        <span className={cn('flame flame-core', cooking && 'flame-live')} />
      </div>

      <div className={cn('pot absolute left-1/2 top-6 -translate-x-1/2', cooking && 'pot-bob')}>
        <div className="mx-auto h-2 w-24 rounded-t-md border border-b-0 border-[#6c7776]/70 bg-[#2f3839]" />
        <div className="relative h-14 w-32 overflow-hidden rounded-b-[46%] rounded-t-lg border border-[#6f7b79]/70 bg-[linear-gradient(180deg,#54605f,#2b3537_58%,#1c2628)] shadow-[inset_0_-8px_14px_rgba(0,0,0,0.45)]">
          <span className="absolute inset-x-3 top-2 h-1.5 rounded-full bg-white/12" />
          <span className="absolute left-1/2 top-0 h-1 w-1.5 -translate-x-1/2 rounded-full bg-[#1c2628]" />
        </div>
        <div className="mx-auto h-2 w-20 rounded-b-full bg-[#232c2d]" />
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-0 flex justify-center gap-3">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className={cn('steam', cooking && 'steam-live')}
            style={{ animationDelay: `${i * 0.55}s`, left: `${42 + i * 9}%` }}
          />
        ))}
      </div>

      <div className="absolute inset-x-2 bottom-1 h-1 overflow-hidden rounded-full bg-black/40">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#e2685a] via-[#f2c15c] to-[#ffe9a8] transition-[width] duration-100"
          style={{ width: `${Math.round(progress * 100)}%` }}
        />
      </div>
    </div>
  )
}

export function CookingSystem() {
  const open = useGameStore((s) => s.cookingOpen)
  const setCookingOpen = useGameStore((s) => s.setCookingOpen)
  const bag = useGameStore((s) => s.bag)
  const pantry = useGameStore((s) => s.pantry)
  const [selectedId, setSelectedId] = useState(CAMPFIRE_RECIPES[0].id)
  const [cooking, setCooking] = useState(false)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState<CookResult | null>(null)

  const recipe = recipeById(selectedId) ?? CAMPFIRE_RECIPES[0]
  const fishHave = useMemo(() => availableFish(recipe, bag), [bag, recipe])
  const canCook = fishHave >= recipe.fishCount && !cooking
  const stock = useMemo(() => {
    return Object.keys(pantry)
      .filter((key) => key.startsWith('dish:'))
      .reduce((sum, key) => sum + (pantry[key] ?? 0), 0)
  }, [pantry])

  useEffect(() => {
    if (!open) {
      setCooking(false)
      setProgress(0)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setCookingOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, setCookingOpen])

  useEffect(() => {
    if (!cooking) return
    const started = performance.now()
    let raf = 0
    let finished = false
    const tick = (now: number) => {
      const next = Math.min(1, (now - started) / recipe.heatMs)
      setProgress(next)
      if (next >= 1) {
        if (finished) return
        finished = true
        const key = useGameStore.getState().cookDish(recipe.id, QUALITY)
        setCooking(false)
        if (key) {
          setResult({ key, recipeId: recipe.id, value: dishValue(key) })
        }
        return
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [cooking, recipe.id, recipe.heatMs])

  const startCooking = () => {
    if (!canCook) return
    setResult(null)
    setProgress(0)
    setCooking(true)
  }

  const close = () => {
    setCooking(false)
    setProgress(0)
    setCookingOpen(false)
  }

  const selectRecipe = (id: string) => {
    if (cooking) return
    setSelectedId(id)
    setProgress(0)
    setResult(null)
  }

  const resultRecipe = result ? recipeById(result.recipeId) : undefined

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[72] flex items-end justify-center bg-abyss/72 px-3 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-sm sm:items-center sm:pb-0"
        >
          <motion.div
            initial={{ opacity: 0, y: 28, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 22, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 330, damping: 30 }}
            className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-gold/25 bg-[#0a1f20]/97 shadow-[0_40px_110px_-40px_rgba(0,0,0,0.95)]"
          >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(242,193,92,0.13),transparent_62%)]" />
            <div className="relative flex items-center justify-between border-b border-border/45 px-4 py-3">
              <div className="flex items-center gap-2.5">
                <span className="grid size-9 place-items-center rounded-full bg-gold/12 text-gold">
                  <ChefHat className="size-4.5" />
                </span>
                <div>
                  <div className="text-[15px] font-semibold tracking-wide text-foam">码头的篝火</div>
                  <div className="text-[9.5px] text-foam/40">海风正好 · 现钓现煮 · 出锅后自动收进背包</div>
                </div>
              </div>
              <button
                type="button"
                onClick={close}
                className="grid size-8 place-items-center rounded-full text-foam/45 transition-colors hover:bg-foam/8 hover:text-foam"
                aria-label="收起炉火"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="relative grid gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_15rem]">
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between text-[9px] tracking-[0.18em] text-foam/40">
                  <span>篝火菜谱</span>
                  <span className="inline-flex items-center gap-1 text-gold/70">
                    <Fish className="size-3" />
                    鱼篓 {bag.length} 条 · 菜品库存 {stock}
                  </span>
                </div>
                <div className="grid gap-1.5">
                  {CAMPFIRE_RECIPES.map((item) => {
                    const have = availableFish(item, bag)
                    const ready = have >= item.fishCount
                    const active = item.id === recipe.id
                    return (
                      <button
                        key={item.id}
                        type="button"
                        disabled={cooking}
                        onClick={() => selectRecipe(item.id)}
                        className={cn(
                          'group rounded-xl border p-2.5 text-left transition-colors disabled:opacity-60',
                          active
                            ? 'border-gold/50 bg-gold/10'
                            : 'border-border/40 bg-card/40 hover:border-tide/35',
                        )}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="flex items-center gap-1.5 text-[12px] font-medium text-foam/90">
                            <Flame
                              className={cn('size-3.5', active ? 'text-gold' : 'text-foam/35')}
                            />
                            {item.name}
                          </span>
                          <span className="tnum text-[10.5px] text-gold">¥{item.basePrice}</span>
                        </div>
                        <div className="mt-1 flex items-center gap-2 text-[9px] text-foam/40">
                          <span>{item.method}</span>
                          <span>·</span>
                          <span className={ready ? 'text-tide/75' : 'text-destructive/75'}>
                            鱼 {have}/{item.fishCount}
                          </span>
                          <span>·</span>
                          <span>{Math.round(item.heatMs / 1000)} 秒</span>
                        </div>
                        {active && (
                          <div className="mt-1.5 text-[9.5px] leading-relaxed text-foam/45">{item.tagline}</div>
                        )}
                      </button>
                    )
                  })}
                </div>
                <div className="mt-0.5 rounded-lg bg-foam/5 px-2.5 py-2 text-[9px] leading-relaxed text-foam/40">
                  <Sparkles className="mr-1 inline size-3 text-gold/70" />
                  {recipe.effect} · 出锅品质「{QUALITY_META[QUALITY].label}」，可在小镇厨房卖出或下水前食用。
                </div>
              </div>

              <div className="flex flex-col rounded-xl border border-border/45 bg-[#071a1b]/70 p-3">
                <div className="text-center text-[10px] tracking-[0.2em] text-foam/35">
                  {cooking ? '汤锅咕嘟作响' : result ? '出锅了' : '炉火已备好'}
                </div>
                <PotStage cooking={cooking} progress={progress} />

                <div className="mt-1 flex items-center justify-between text-[9px] text-foam/40">
                  <span>{cooking ? '火候' : '进度'}</span>
                  <span className="tnum text-gold">{Math.round(progress * 100)}%</span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-black/45">
                  <div
                    className={cn(
                      'h-full rounded-full bg-gradient-to-r from-[#e2685a] via-[#f2c15c] to-[#ffe9a8]',
                      cooking ? 'transition-none' : 'transition-[width] duration-300',
                    )}
                    style={{ width: `${Math.round(progress * 100)}%` }}
                  />
                </div>

                <div className="mt-3 flex flex-col gap-1.5">
                  {!cooking && !result && (
                    <button
                      type="button"
                      disabled={!canCook}
                      onClick={startCooking}
                      className="flex h-9 items-center justify-center gap-1.5 rounded-lg bg-gold/18 text-[12px] font-semibold text-gold transition-colors hover:bg-gold/28 disabled:opacity-40"
                    >
                      <Flame className="size-4" />
                      {canCook ? '点火开锅' : `还需要 ${Math.max(0, recipe.fishCount - fishHave)} 条鱼`}
                    </button>
                  )}
                  {cooking && (
                    <button
                      type="button"
                      onClick={close}
                      className="flex h-9 items-center justify-center gap-1.5 rounded-lg border border-destructive/40 bg-destructive/10 text-[11.5px] text-destructive/90 transition-colors hover:bg-destructive/20"
                    >
                      熄火离开（不消耗鱼）
                    </button>
                  )}
                  {result && resultRecipe && (
                    <button
                      type="button"
                      onClick={() => {
                        setResult(null)
                        setProgress(0)
                      }}
                      className="flex h-9 items-center justify-center gap-1.5 rounded-lg border border-tide/40 bg-tide/10 text-[11.5px] font-medium text-tide transition-colors hover:bg-tide/20"
                    >
                      <Soup className="size-3.5" />
                      再做一份
                    </button>
                  )}
                </div>

                <div className="mt-auto pt-2">
                  {result && resultRecipe ? (
                    <div className="rounded-lg border border-gold/30 bg-gold/8 p-2 text-center">
                      <div className="text-[11.5px] font-semibold text-foam">
                        {resultRecipe.name}
                        <span className="ml-1 text-[10px]" style={{ color: QUALITY_META[QUALITY].color }}>
                          · {QUALITY_META[QUALITY].label}
                        </span>
                      </div>
                      <div className="tnum text-[9px] text-gold/80">+1 道菜 · 估值 ¥{result.value}</div>
                      <div className="mt-0.5 text-[8.5px] text-foam/35">已放进背包，可去小镇厨房出售</div>
                    </div>
                  ) : (
                    <div className="text-center text-[8.5px] leading-relaxed text-foam/30">
                      篝火只消耗鱼获，不需要菜园配料
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
