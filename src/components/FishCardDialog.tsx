import { Check, Coins, Ruler, Scale, Sparkles, Waves } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { FishArt } from '@/components/FishArt'
import { RARITY_ORDER, RARITIES, fishById } from '@/game/fishing/fishTable'
import { BAITS } from '@/game/fishing/baitTable'
import { METHOD_COLOR, METHOD_LABEL } from '@/game/capture/tools'
import { marketQuote } from '@/game/economy/market'
import { DAY_PERIOD_LABEL, SEASONS } from '@/game/world/seasons'
import { bagCapacity, useGameStore } from '@/store/useGameStore'
import { cn } from '@/lib/utils'

export function FishCardDialog() {
  const card = useGameStore((s) => s.card)
  const cardAdded = useGameStore((s) => s.cardAdded)
  const bagCount = useGameStore((s) => s.bag.length)
  const capacity = useGameStore((s) => bagCapacity(s))
  const closeCard = useGameStore((s) => s.closeCard)
  const season = useGameStore((s) => s.season)
  const cabinLevel = useGameStore((s) => s.cabinLevel)
  const dailySold = useGameStore((s) => s.dailySold)
  const livewell = useGameStore((s) => s.installedFacilities.includes('livewell'))
  const meta = card ? RARITIES[card.rarity] : null
  const showSparkle = card ? RARITY_ORDER.indexOf(card.rarity) >= 2 : false
  const ink = card?.rarity === 'common' ? '#5d706b' : meta?.color
  const def = card ? fishById(card.defId) : undefined
  const method = card?.method ?? 'rod'
  const quote = card ? marketQuote(card, season, cabinLevel, dailySold, livewell) : null
  const quoted = quote?.price ?? card?.value ?? 0
  const bonusBits: string[] = []
  if (quote) {
    if (quote.specialty) bonusBits.push('当季鱼汛 +6%')
    if (quote.demand !== 1) bonusBits.push(`需求 ×${quote.demand.toFixed(2)}`)
    if (quote.cabinBonus > 1) bonusBits.push(`船舱 +${Math.round((quote.cabinBonus - 1) * 100)}%`)
  }
  const seasonsText = def?.seasons?.map((s) => SEASONS[s].name).join(' · ')
  const periodsText = def?.periods?.map((p) => DAY_PERIOD_LABEL[p]).join(' · ')
  const baitText = def
    ? BAITS.filter((b) => b.favors[def.id])
        .sort((a, b) => (b.favors[def.id] ?? 0) - (a.favors[def.id] ?? 0))
        .slice(0, 3)
        .map((b) => b.name)
        .join(' / ')
    : ''

  return (
    <Dialog open={Boolean(card)} onOpenChange={(open) => !open && closeCard()}>
      {card && meta && (
        <DialogContent
          showClose={false}
          className="max-h-[92dvh] w-[calc(100%-2rem)] max-w-[380px] overflow-y-auto rounded-2xl border-none bg-[#f3ecdc] p-0 text-[#1c2d29] shadow-[0_40px_120px_-30px_rgba(0,0,0,0.9)]"
        >
          <div className="relative">
            <div className="flex items-center justify-between px-5 pt-4">
              <span className="text-[9.5px] font-semibold uppercase tracking-[0.32em] text-[#8b988f]">
                Tidewater catch
              </span>
              <span className="tnum text-[10px] tracking-wide text-[#8b988f]">
                {new Date(card.caughtAt).toLocaleTimeString('zh-CN', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>

            <div className="relative mx-4 mt-2 overflow-hidden rounded-xl">
              <div
                className="absolute inset-0"
                style={{ background: `linear-gradient(165deg, ${meta.soft}, rgba(255,255,255,0) 70%)` }}
              />
              <div
                className="absolute inset-x-6 bottom-2 h-px"
                style={{ background: `linear-gradient(90deg, transparent, ${meta.color}66, transparent)` }}
              />
              <FishArt rarity={card.rarity} defId={card.defId} className="relative h-36 w-full" />
              <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-[#f7f1e3]/85 py-0.5 pl-2 pr-2.5 backdrop-blur-sm">
                <span className="size-1.5 rounded-full" style={{ background: meta.color }} />
                <span className="text-[10.5px] font-semibold" style={{ color: ink }}>
                  {meta.label}
                </span>
              </div>
              {showSparkle && (
                <Sparkles
                  className="absolute right-3 top-3 size-4 opacity-70"
                  style={{ color: meta.color }}
                />
              )}
            </div>

            <div className="flex items-baseline justify-between px-5 pt-3">
              <DialogTitle className="text-[27px] font-bold leading-none tracking-[0.1em] text-[#1b2c28]">
                {card.name}
              </DialogTitle>
              <span className="text-[10px] tracking-[0.18em] text-[#98a49c]">刚出水</span>
            </div>
            <DialogDescription className="mt-2 px-5 text-[12px] leading-relaxed text-[#5e6d66]">
              {card.desc}
            </DialogDescription>

            <div className="mx-5 mt-2.5 flex flex-wrap items-center gap-1.5">
                <span className="flex items-center gap-1 rounded-full bg-[#1b2c28]/6 px-2 py-0.5 text-[9.5px] text-[#68766f]">
                  <span
                    className="size-1.5 rounded-full"
                    style={{ background: METHOD_COLOR[method] }}
                  />
                  {METHOD_LABEL[method]}捕获
                </span>
                {seasonsText && (
                  <span className="rounded-full bg-[#1b2c28]/6 px-2 py-0.5 text-[9.5px] text-[#68766f]">
                    季节 · {seasonsText}
                  </span>
                )}
                {periodsText && (
                  <span className="rounded-full bg-[#1b2c28]/6 px-2 py-0.5 text-[9.5px] text-[#68766f]">
                    时段 · {periodsText}
                  </span>
                )}
                {baitText && (
                  <span className="rounded-full bg-[#1b2c28]/6 px-2 py-0.5 text-[9.5px] text-[#68766f]">
                    偏爱 · {baitText}
                  </span>
                )}
                {def && (
                  <span className="tnum rounded-full bg-[#1b2c28]/6 px-2 py-0.5 text-[9.5px] text-[#68766f]">
                    水深 · {def.minDepth.toFixed(1)}–{def.maxDepth.toFixed(1)} m
                  </span>
                )}
              </div>

            <div className="mx-5 mt-3.5 grid grid-cols-3 divide-x divide-[#1b2c28]/10 rounded-lg border border-[#1b2c28]/12 bg-white/40 py-2.5">
              <div className="flex flex-col items-center gap-1">
                <Scale className="size-3.5 text-[#8b988f]" />
                <span className="tnum text-[15px] font-semibold text-[#263a34]">{card.kg.toFixed(2)}</span>
                <span className="text-[9px] tracking-[0.16em] text-[#93a098]">重量 kg</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <Ruler className="size-3.5 text-[#8b988f]" />
                <span className="tnum text-[15px] font-semibold text-[#263a34]">{card.cm}</span>
                <span className="text-[9px] tracking-[0.16em] text-[#93a098]">体长 cm</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <Coins className="size-3.5 text-[#8b988f]" />
                <span className="tnum text-[15px] font-semibold text-[#263a34]">¥{card.unitPrice}</span>
                <span className="text-[9px] tracking-[0.16em] text-[#93a098]">单价 /kg</span>
              </div>
            </div>

            <div className="mx-5 mt-3 flex items-end justify-between border-t border-dashed border-[#1b2c28]/18 pt-3">
              <div>
                <div className="text-[9.5px] font-semibold tracking-[0.22em] text-[#93a098]">码头估价</div>
                <div className="mt-0.5 text-[10.5px] text-[#6b7972]">
                  {bonusBits.length ? bonusBits.join(' · ') : '按当日行情浮动'}
                </div>
              </div>
              <div className="flex items-baseline gap-1.5">
                {quoted !== card.value && (
                  <span className="tnum text-[13px] text-[#98a49c] line-through">¥{card.value}</span>
                )}
                <div className="tnum text-[32px] font-bold leading-none text-[#a87b21]">
                  <span className="mr-0.5 text-base font-semibold">¥</span>
                  {quoted}
                </div>
              </div>
            </div>

            <div
              className={cn(
                'mx-5 mt-3 rounded-md px-3 py-2 text-[10.5px] leading-relaxed',
                cardAdded ? 'bg-[#1b2c28]/6 text-[#68766f]' : 'bg-[#e2685a]/14 text-[#a34a3d]',
              )}
            >
              {cardAdded
                ? `已收入鱼篓 · ${bagCount}/${capacity} · 划回老码头就能卖个好价钱`
                : '鱼篓已经塞满了，这条鱼只能放回水里'}
            </div>

            <div className="px-5 pb-5 pt-3.5">
              <Button
                onClick={closeCard}
                className="h-11 w-full rounded-lg bg-[#1b2c28] text-[13px] font-semibold tracking-[0.08em] text-[#f4eddc] hover:bg-[#243832]"
              >
                <Check className="size-4" />
                {cardAdded ? '收好，继续钓鱼' : '知道了'}
              </Button>
            </div>
          </div>
        </DialogContent>
      )}
    </Dialog>
  )
}
