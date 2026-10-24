import { Backpack, BookOpen, Coins, Fish, Lock, PackageOpen, Scale, X } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { FishArt } from '@/components/FishArt'
import { FISH, RARITIES } from '@/game/fishing/fishTable'
import { BAG_CAPACITY, useGameStore } from '@/store/useGameStore'
import { cn } from '@/lib/utils'

export function BagDialog() {
  const open = useGameStore((s) => s.bagOpen)
  const setBagOpen = useGameStore((s) => s.setBagOpen)
  const bag = useGameStore((s) => s.bag)
  const caughtLog = useGameStore((s) => s.caughtLog)
  const bestKg = useGameStore((s) => s.bestKg)
  const totalEarned = useGameStore((s) => s.totalEarned)
  const money = useGameStore((s) => s.money)

  const totalValue = bag.reduce((sum, c) => sum + c.value, 0)
  const collected = FISH.filter((f) => (caughtLog[f.id] ?? 0) > 0).length
  const progress = (collected / FISH.length) * 100

  return (
    <Dialog open={open} onOpenChange={setBagOpen}>
      <DialogContent
        showClose={false}
        className="w-[calc(100%-1.25rem)] max-w-lg overflow-hidden border-border/70 bg-[#0a2326] p-0"
      >
        <div className="flex items-start justify-between gap-3 border-b border-border/60 px-4 py-3.5 sm:px-5">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-full bg-tide/12 text-tide">
              <Backpack className="size-5" />
            </span>
            <div>
              <DialogTitle className="text-[15px] font-semibold tracking-wide text-foam">
                鱼篓与图鉴
              </DialogTitle>
              <DialogDescription className="mt-0.5 text-[10.5px] text-muted-foreground">
                潮汐湾的每一种鱼，都在这里留个记号
              </DialogDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden items-center gap-1.5 rounded-full bg-foam/6 px-2.5 py-1 sm:flex">
              <Coins className="size-3.5 text-gold" />
              <span className="tnum text-[12px] font-semibold text-gold">
                ¥{money.toLocaleString('zh-CN')}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setBagOpen(false)}
              className="grid size-8 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-foam/8 hover:text-foam"
              aria-label="关闭鱼篓"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 px-4 pt-3">
          <div className="rounded-lg border border-border/45 bg-card/40 px-2.5 py-2">
            <div className="text-[9.5px] tracking-[0.16em] text-muted-foreground">鱼篓</div>
            <div className="tnum mt-1 text-[15px] font-semibold text-foam">
              {bag.length}
              <span className="text-[10px] text-foam/35"> / {BAG_CAPACITY}</span>
            </div>
          </div>
          <div className="rounded-lg border border-border/45 bg-card/40 px-2.5 py-2">
            <div className="text-[9.5px] tracking-[0.16em] text-muted-foreground">待售估值</div>
            <div className="tnum mt-1 text-[15px] font-semibold text-gold">¥{totalValue}</div>
          </div>
          <div className="rounded-lg border border-border/45 bg-card/40 px-2.5 py-2">
            <div className="text-[9.5px] tracking-[0.16em] text-muted-foreground">最大渔获</div>
            <div className="tnum mt-1 text-[15px] font-semibold text-tide">{bestKg.toFixed(2)} kg</div>
          </div>
        </div>

        <Tabs defaultValue="bag" className="px-4 pb-4 pt-3">
          <TabsList className="w-full">
            <TabsTrigger value="bag" className="flex-1 gap-1.5">
              <Fish className="size-3.5" />
              鱼篓
            </TabsTrigger>
            <TabsTrigger value="dex" className="flex-1 gap-1.5">
              <BookOpen className="size-3.5" />
              图鉴
              <span className="tnum text-[9px] text-foam/35">
                {collected}/{FISH.length}
              </span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="bag" className="mt-2.5">
            <div className="h-[min(50dvh,380px)] overflow-y-auto pr-0.5">
              {bag.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
                  <PackageOpen className="size-9 text-foam/20" />
                  <div className="text-[12px] text-foam/50">鱼篓里还没有鱼</div>
                  <div className="text-[10.5px] text-muted-foreground">
                    划出码头，按住空格蓄力，松开抛竿
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {bag.map((c) => {
                    const meta = RARITIES[c.rarity]
                    return (
                      <div
                        key={c.id}
                        className="flex items-center gap-3 rounded-lg border border-border/45 bg-card/40 p-2"
                      >
                        <div className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-md bg-abyss/50">
                          <FishArt rarity={c.rarity} defId={c.defId} className="h-9 w-12" glow={false} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[13px] font-medium text-foam">{c.name}</span>
                            <span
                              className="rounded-full px-1.5 py-0.5 text-[9px] font-medium"
                              style={{ background: meta.soft, color: meta.color }}
                            >
                              {meta.label}
                            </span>
                          </div>
                          <div className="tnum mt-0.5 flex items-center gap-1.5 text-[10.5px] text-muted-foreground">
                            <Scale className="size-3" />
                            {c.kg.toFixed(2)} kg · {c.cm} cm
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="tnum text-[13px] font-semibold text-gold">¥{c.value}</div>
                          <div className="text-[9px] text-foam/30">待售</div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
            <div className="mt-2 flex items-center justify-between rounded-md bg-foam/4 px-2.5 py-1.5 text-[10px] text-muted-foreground">
              <span>卖鱼请靠近老码头，按 E 或点「卖鱼」</span>
              <span className="tnum text-gold/80">共 ¥{totalValue}</span>
            </div>
          </TabsContent>

          <TabsContent value="dex" className="mt-2.5">
            <div className="mb-2.5">
              <div className="mb-1.5 flex items-center justify-between text-[10px]">
                <span className="text-muted-foreground">收集进度</span>
                <span className="tnum text-foam/60">
                  {collected} / {FISH.length}
                </span>
              </div>
              <Progress value={progress} className="h-1.5" indicatorClassName="bg-gradient-to-r from-tide to-gold" />
              <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground">
                <span>
                  累计收入 <span className="tnum text-gold/85">¥{totalEarned}</span>
                </span>
                <span>
                  最大单尾 <span className="tnum text-tide/85">{bestKg.toFixed(2)} kg</span>
                </span>
              </div>
            </div>

            <div className="h-[min(41dvh,310px)] overflow-y-auto pr-0.5">
              <div className="grid grid-cols-2 gap-1.5">
                {FISH.map((f) => {
                  const count = caughtLog[f.id] ?? 0
                  const meta = RARITIES[f.rarity]
                  const unlocked = count > 0
                  return (
                    <div
                      key={f.id}
                      className={cn(
                        'relative overflow-hidden rounded-lg border px-2 py-1.5',
                        unlocked ? 'border-border/50 bg-card/45' : 'border-border/25 bg-abyss/40',
                      )}
                      style={unlocked ? { borderColor: `${meta.color}33` } : undefined}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="relative grid size-10 shrink-0 place-items-center overflow-hidden rounded-md"
                          style={{ background: unlocked ? meta.soft : 'rgba(243,238,226,0.04)' }}
                        >
                          <FishArt
                            rarity={unlocked ? f.rarity : 'common'}
                            defId={f.id}
                            className={cn('h-8 w-11', !unlocked && 'opacity-20 grayscale')}
                            glow={false}
                          />
                          {!unlocked && (
                            <Lock className="absolute size-3 text-foam/30" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div
                            className={cn(
                              'truncate text-[11.5px] font-medium',
                              unlocked ? 'text-foam' : 'text-foam/30',
                            )}
                          >
                            {unlocked ? f.name : '???'}
                          </div>
                          <div className="text-[9.5px] text-muted-foreground">
                            {unlocked ? (
                              <>
                                <span style={{ color: meta.color }}>{meta.label}</span>
                                <span className="text-foam/25"> · </span>
                                <span className="tnum">×{count}</span>
                              </>
                            ) : (
                              '尚未钓到'
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
