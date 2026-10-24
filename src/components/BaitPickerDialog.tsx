import { Check, Coins, Droplets, Fish, Sparkles, Waves, X } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useGameStore } from '@/store/useGameStore'
import {
  BAITS,
  baitById,
  baitCategoryLabel,
  type BaitDef,
} from '@/game/fishing/baitTable'
import { fishById } from '@/game/fishing/fishTable'
import { cn } from '@/lib/utils'

function BaitGlyph({ bait }: { bait: BaitDef }) {
  const Icon = bait.category === 'live' ? Fish : bait.category === 'lure' ? Sparkles : Droplets
  return (
    <span
      className="relative grid size-11 shrink-0 place-items-center rounded-xl"
      style={{ background: `${bait.color}22`, color: bait.accent }}
    >
      <Icon className="size-5" />
      <span
        className="absolute -bottom-1 -right-1 size-3 rounded-full border-2 border-[#0a2326]"
        style={{ background: bait.color }}
      />
    </span>
  )
}

export function BaitPickerDialog() {
  const open = useGameStore((s) => s.baitOpen)
  const setBaitOpen = useGameStore((s) => s.setBaitOpen)
  const baitId = useGameStore((s) => s.baitId)
  const baitWear = useGameStore((s) => s.baitWear)
  const money = useGameStore((s) => s.money)
  const setBait = useGameStore((s) => s.setBait)
  const current = baitById(baitId)

  const close = () => setBaitOpen(false)

  return (
    <Dialog open={open} onOpenChange={(v) => !v && close()}>
      <DialogContent
        showClose={false}
        className="w-[calc(100%-1rem)] max-w-2xl overflow-hidden border-border/70 bg-[#0a2326] p-0"
      >
        <div className="flex items-start justify-between gap-3 border-b border-border/60 px-4 py-3.5 sm:px-5">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-full bg-tide/12 text-tide">
              <Fish className="size-5" />
            </span>
            <div>
              <DialogTitle className="text-[15px] font-semibold tracking-wide text-foam">
                潮汐饵盒
              </DialogTitle>
              <DialogDescription className="mt-0.5 text-[10.5px] text-muted-foreground">
                不同鱼饵会吸引不同的鱼 · 越新鲜诱鱼越强
              </DialogDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-full bg-foam/6 px-2.5 py-1">
              <Coins className="size-3.5 text-gold" />
              <span className="tnum text-[12px] font-semibold text-gold">
                ¥{money.toLocaleString('zh-CN')}
              </span>
            </div>
            <button
              type="button"
              onClick={close}
              className="grid size-8 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-foam/8 hover:text-foam"
              aria-label="关闭饵盒"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        {current && (
          <div className="mx-4 mt-3 flex items-center gap-3 rounded-lg border border-tide/25 bg-tide/6 px-3 py-2 sm:mx-5">
            <BaitGlyph bait={current} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-[12.5px] font-medium text-foam">{current.name}</span>
                <span className="text-[9.5px] text-tide/80">{baitCategoryLabel(current.category)}</span>
              </div>
              <div className="mt-1 flex items-center gap-2">
                <div className="h-1 flex-1 overflow-hidden rounded-full bg-foam/10">
                  <div
                    className={cn(
                      'h-full rounded-full transition-[width]',
                      baitWear > 50 ? 'bg-tide' : baitWear > 20 ? 'bg-gold' : 'bg-destructive',
                    )}
                    style={{ width: `${baitWear}%` }}
                  />
                </div>
                <span className="tnum text-[9.5px] text-foam/45">新鲜度 {Math.round(baitWear)}%</span>
              </div>
            </div>
          </div>
        )}

        <div className="grid max-h-[min(62dvh,520px)] grid-cols-1 gap-2 overflow-y-auto px-3 pb-3 pt-3 sm:grid-cols-2 sm:px-4 sm:pb-4">
          {BAITS.map((bait) => {
            const active = bait.id === baitId
            const favored = Object.keys(bait.favors)
              .sort((a, b) => (bait.favors[b] ?? 0) - (bait.favors[a] ?? 0))
              .slice(0, 3)
              .map((id) => fishById(id)?.name)
              .filter(Boolean)
              .join(' / ')
            return (
              <div
                key={bait.id}
                className={cn(
                  'rounded-xl border p-2.5 transition-colors',
                  active ? 'border-tide/50 bg-tide/6' : 'border-border/50 bg-card/40',
                )}
              >
                <div className="flex items-start gap-2.5">
                  <BaitGlyph bait={bait} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[13px] font-semibold text-foam">{bait.name}</span>
                      <span className="rounded-full bg-foam/8 px-1.5 py-0.5 text-[8.5px] text-foam/50">
                        {baitCategoryLabel(bait.category)}
                      </span>
                      {active && <Check className="size-3 text-tide" />}
                    </div>
                    <p className="mt-1 line-clamp-2 text-[10px] leading-relaxed text-muted-foreground">
                      {bait.desc}
                    </p>
                  </div>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[9.5px] text-foam/40">
                  <span className="tnum">下沉 {bait.sink.toFixed(2)} m/s</span>
                  <span className="text-foam/15">·</span>
                  <span className="tnum">诱鱼 ×{bait.attract.toFixed(2)}</span>
                  <span className="text-foam/15">·</span>
                  <span className="tnum">咬钩 ×{bait.waitFactor.toFixed(2)}</span>
                  <span className="text-foam/15">·</span>
                  <span className="tnum">耐用 {bait.durability}</span>
                </div>
                {favored && (
                  <div className="mt-1 text-[9.5px] text-tide/55">偏爱 · {favored}</div>
                )}

                <div className="mt-2 flex items-center justify-between gap-2">
                  <span className="text-[9.5px] text-foam/35">{bait.tip}</span>
                  {active ? (
                    <span className="shrink-0 rounded-full border border-tide/30 px-2.5 py-1 text-[10px] text-tide/80">
                      使用中
                    </span>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => {
                        setBait(bait.id)
                        close()
                      }}
                      className="h-7 shrink-0 rounded-full bg-tide/15 px-2.5 text-[10.5px] text-tide hover:bg-tide/25"
                    >
                      换上
                    </Button>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        <div className="flex items-center gap-1.5 border-t border-border/50 px-4 py-2 text-[10px] text-muted-foreground sm:px-5">
          <Waves className="size-3 text-tide/60" />
          每次抛竿都会消耗一点新鲜度 · 新鲜度越低，诱鱼加成越弱
        </div>
      </DialogContent>
    </Dialog>
  )
}
