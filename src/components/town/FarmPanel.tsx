import { useState } from 'react'
import { Droplets, Leaf, Package, ShoppingBasket, Sprout, Timer } from 'lucide-react'
import { useGameStore } from '@/store/useGameStore'
import { CROPS, PLOT_COUNT, cropById, growthInfo, seedKey, produceKey, type CropId } from '@/game/farm/crops'
import { FORAGE, forageKey } from '@/game/farm/forage'
import { SEASONS } from '@/game/world/seasons'
import { Button } from '@/components/ui/button'
import { Bar, Chip, Empty, PanelHead, useNow } from './shared'
import { cn } from '@/lib/utils'

function PlotCard({ index, now }: { index: number; now: number }) {
  const plot = useGameStore((s) => s.farmPlots[index])
  const season = useGameStore((s) => s.season)
  const cabinLevel = useGameStore((s) => s.cabinLevel)
  const pantry = useGameStore((s) => s.pantry)
  const plant = useGameStore((s) => s.plantPlot)
  const water = useGameStore((s) => s.waterPlot)
  const harvest = useGameStore((s) => s.harvestPlot)
  const [pickOpen, setPickOpen] = useState(false)
  const crop = plot?.cropId ? cropById(plot.cropId) : undefined
  const info = crop && plot ? growthInfo(plot, crop, season, cabinLevel, now) : null
  const seasonOk = crop ? crop.seasons.includes(season) || cabinLevel >= 3 : true
  const seconds = info ? Math.ceil(info.remainingMs / 1000) : 0

  return (
    <div className="relative overflow-hidden rounded-xl border border-border/50 bg-gradient-to-b from-[#163b32]/70 to-[#0d2624]/80 p-2">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-[9px] tracking-[0.18em] text-foam/35">菜畦 {index + 1}</span>
        {crop && (
          <Chip color={seasonOk ? '#8fbf77' : '#e2a354'} soft={seasonOk ? '#8fbf7722' : '#e2a35422'}>
            {seasonOk ? '当季' : '逆季'}
          </Chip>
        )}
      </div>

      <div className="relative grid h-[74px] place-items-center overflow-hidden rounded-lg bg-[radial-gradient(ellipse_at_50%_120%,rgba(143,191,119,0.2),transparent_70%)]">
        <div className="absolute inset-x-2 bottom-2 h-2 rounded-full bg-[#2d4a31]/70" />
        {!crop && (
          <button
            type="button"
            onClick={() => setPickOpen((v) => !v)}
            className="relative z-10 flex flex-col items-center gap-1 text-foam/45 transition-colors hover:text-tide"
          >
            <Sprout className="size-6" />
            <span className="text-[9.5px]">点击播种</span>
          </button>
        )}
        {crop && info && (
          <div className="relative z-10 flex flex-col items-center">
            <div className="flex items-end gap-1">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="rounded-full transition-all duration-500"
                  style={{
                    width: 4 + info.stage * 2.2,
                    height: Math.min(34, 8 + info.stage * 7),
                    background: crop.color,
                    opacity: 0.5 + info.stage * 0.12,
                    transform: `rotate(${(i - 1) * 10}deg)`,
                  }}
                />
              ))}
              {info.stage >= 3 && (
                <span
                  className="mb-0.5 size-2.5 rounded-full"
                  style={{ background: crop.accent, boxShadow: `0 0 8px ${crop.accent}` }}
                />
              )}
            </div>
            <span className="mt-1 text-[10px] text-foam/70">{crop.name}</span>
          </div>
        )}
      </div>

      {crop && info && (
        <div className="mt-1.5">
          <div className="mb-1 flex items-center justify-between text-[9px] text-foam/45">
            <span>{info.stageLabel}</span>
            <span className="tnum">
              {info.mature ? '可收获' : `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`}
            </span>
          </div>
          <Bar value={info.progress * 100} color={info.mature ? '#f2c15c' : crop.color} />
        </div>
      )}

      <div className="mt-1.5 flex gap-1.5">
        {!crop && (
          <div className="flex w-full flex-wrap gap-1">
            {CROPS.map((c) => {
              const count = pantry[seedKey(c.id)] ?? 0
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    plant(index, c.id)
                    setPickOpen(false)
                  }}
                  disabled={count < 1}
                  className={cn(
                    'flex flex-1 items-center justify-center gap-1 rounded-md border px-1 py-1 text-[9px] transition-colors',
                    count > 0
                      ? 'border-border/50 bg-foam/5 text-foam/60 hover:border-tide/40 hover:text-tide'
                      : 'border-border/25 text-foam/20',
                  )}
                  title={`${c.name}种子 ×${count}`}
                >
                  <span className="size-1.5 rounded-full" style={{ background: c.color }} />
                  {count}
                </button>
              )
            })}
          </div>
        )}
        {crop && (
          <>
            {!plot.watered && (
              <Button
                size="sm"
                variant="outline"
                className="h-6 flex-1 rounded-md border-tide/30 px-1.5 text-[9.5px] text-tide hover:bg-tide/10"
                onClick={() => water(index)}
              >
                <Droplets className="size-3" />浇水
              </Button>
            )}
            {plot.watered && !info?.mature && (
              <div className="flex h-6 flex-1 items-center justify-center gap-1 rounded-md bg-foam/5 text-[9.5px] text-foam/40">
                <Timer className="size-3" />已浇水
              </div>
            )}
            {info?.mature && (
              <Button
                size="sm"
                className="h-6 flex-1 rounded-md bg-gold/15 px-1.5 text-[9.5px] text-gold hover:bg-gold/25"
                onClick={() => harvest(index)}
              >
                <Package className="size-3" />收获 ×{info.yieldCount}
              </Button>
            )}
          </>
        )}
        {pickOpen && !crop && (
          <span className="sr-only">选择种子</span>
        )}
      </div>
    </div>
  )
}

function ForageList() {
  const season = useGameStore((s) => s.season)
  const cooldowns = useGameStore((s) => s.gatherCooldowns)
  const gather = useGameStore((s) => s.gather)
  const now = useNow(1000)

  return (
    <div className="grid gap-1.5 sm:grid-cols-2">
      {FORAGE.map((item) => {
        const inSeason = item.seasons.includes(season)
        const left = Math.max(0, (cooldowns[item.id] ?? 0) + item.cooldownMs - now)
        const ready = inSeason && left <= 0
        return (
          <div
            key={item.id}
            className={cn(
              'flex items-center gap-2 rounded-lg border p-2',
              ready ? 'border-border/50 bg-card/40' : 'border-border/25 bg-card/20 opacity-60',
            )}
          >
            <span
              className="grid size-8 shrink-0 place-items-center rounded-full"
              style={{ background: `${item.color}22`, color: item.color }}
            >
              <Leaf className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="truncate text-[11px] font-medium text-foam/85">{item.name}</span>
                <span className="text-[8.5px] text-foam/35">{item.zone}</span>
              </div>
              <div className="truncate text-[9px] text-foam/35">{item.use}</div>
            </div>
            <button
              type="button"
              disabled={!ready}
              onClick={() => gather(item.id)}
              className={cn(
                'shrink-0 rounded-full px-2 py-1 text-[9px] transition-colors',
                ready ? 'bg-tide/12 text-tide hover:bg-tide/20' : 'bg-foam/5 text-foam/30',
              )}
            >
              {!inSeason
                ? '不在季节'
                : left > 0
                  ? `${Math.ceil(left / 1000)}s`
                  : `采集 ¥${item.sellPrice}`}
            </button>
          </div>
        )
      })}
    </div>
  )
}

export function FarmPanel() {
  const season = useGameStore((s) => s.season)
  const cabinLevel = useGameStore((s) => s.cabinLevel)
  const pantry = useGameStore((s) => s.pantry)
  const money = useGameStore((s) => s.money)
  const buySeed = useGameStore((s) => s.buySeed)
  const sellPantry = useGameStore((s) => s.sellPantryItem)
  const plots = useGameStore((s) => s.farmPlots)
  const now = useNow(1000)
  const planted = plots.filter((p) => p.cropId).length
  const greenhouse = cabinLevel >= 3
  const produceKeys = Object.keys(pantry).filter((k) => k.startsWith('crop:') && pantry[k] > 0)

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-y-auto pr-0.5">
      <PanelHead
        title="阿婆的菜园"
        desc={`${SEASONS[season].name} · ${greenhouse ? '小屋暖棚能种反季作物' : '反季作物会大幅减产'} · ${planted}/${PLOT_COUNT} 畦在用`}
        right={<Chip color={greenhouse ? '#8fbf77' : '#e2a354'}>{greenhouse ? '暖棚已搭' : `小屋 Lv.${cabinLevel}`}</Chip>}
      />

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {Array.from({ length: PLOT_COUNT }, (_, i) => (
          <PlotCard key={i} index={i} now={now} />
        ))}
      </div>

      <div className="rounded-xl border border-border/45 bg-card/35 p-2.5">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[10px] tracking-[0.18em] text-foam/45">
            <ShoppingBasket className="size-3" />
            种子铺
          </div>
          <span className="text-[9px] text-foam/30">买一包，种一畦</span>
        </div>
        <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
          {CROPS.map((crop) => {
            const count = pantry[seedKey(crop.id)] ?? 0
            const inSeason = crop.seasons.includes(season) || greenhouse
            return (
              <div key={crop.id} className="flex items-center gap-2 rounded-lg border border-border/40 bg-abyss/25 p-1.5">
                <span className="size-2 rounded-full" style={{ background: crop.color }} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[10.5px] text-foam/80">{crop.name}</div>
                  <div className="text-[8.5px] text-foam/35">
                    持有 {count} · {inSeason ? crop.seasons.map((s) => SEASONS[s].name).join('/') : '反季'}
                  </div>
                </div>
                <button
                  type="button"
                  disabled={money < crop.seedPrice}
                  onClick={() => buySeed(crop.id, 1)}
                  className="shrink-0 rounded-full bg-gold/12 px-2 py-1 text-[9px] text-gold transition-colors hover:bg-gold/20 disabled:opacity-35"
                >
                  ¥{crop.seedPrice}
                </button>
              </div>
            )
          })}
        </div>
      </div>

      {produceKeys.length > 0 && (
        <div className="rounded-xl border border-border/45 bg-card/35 p-2.5">
          <div className="mb-2 flex items-center gap-1.5 text-[10px] tracking-[0.18em] text-foam/45">
            <Package className="size-3" />
            菜篮
          </div>
          <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
            {produceKeys.map((key) => {
              const crop = cropById(key.slice(5))
              if (!crop) return null
              return (
                <div key={key} className="flex items-center gap-2 rounded-lg border border-border/40 bg-abyss/25 p-1.5">
                  <span className="size-2 rounded-full" style={{ background: crop.color }} />
                  <span className="min-w-0 flex-1 truncate text-[10.5px] text-foam/80">
                    {crop.name} ×{pantry[key]}
                  </span>
                  <button
                    type="button"
                    onClick={() => sellPantry(key, 1)}
                    className="rounded-full bg-tide/10 px-2 py-1 text-[9px] text-tide hover:bg-tide/20"
                  >
                    卖 ¥{crop.sellPrice}
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="rounded-xl border border-border/45 bg-card/35 p-2.5">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[10px] tracking-[0.18em] text-foam/45">
            <Sprout className="size-3" />
            潮间带采集
          </div>
          <span className="text-[9px] text-foam/30">每处都有恢复时间</span>
        </div>
        <ForageList />
      </div>
    </div>
  )
}
