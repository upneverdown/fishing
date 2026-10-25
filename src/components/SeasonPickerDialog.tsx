import { Check, Leaf, Snowflake, Sun, Sunset, X } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useGameStore } from '@/store/useGameStore'
import { DAY_PERIOD_LABEL, SEASON_ORDER, SEASONS } from '@/game/world/seasons'
import type { SeasonId } from '@/types'
import { cn } from '@/lib/utils'

const SEASON_ICON: Record<SeasonId, typeof Leaf> = {
  spring: Leaf,
  summer: Sun,
  autumn: Sunset,
  winter: Snowflake,
}

function SeasonPreview({ id }: { id: SeasonId }) {
  const season = SEASONS[id]
  const Icon = SEASON_ICON[id]
  return (
    <div
      className="relative h-[84px] overflow-hidden rounded-lg"
      style={{
        background: `linear-gradient(170deg, ${season.sky.zenith}, ${season.sky.horizon} 62%, ${season.water.shallow})`,
      }}
    >
      <span
        className="absolute right-3 top-2.5 size-5 rounded-full blur-[0.3px]"
        style={{ background: season.sky.sun, boxShadow: `0 0 18px ${season.sky.sun}` }}
      />
      <Icon className="absolute left-2.5 top-2.5 size-4 text-white/70" />
      <div
        className="absolute inset-x-0 bottom-0 h-8"
        style={{
          background: `linear-gradient(180deg, transparent, ${season.water.deep}cc)`,
        }}
      />
      <svg viewBox="0 0 200 24" className="absolute inset-x-0 bottom-3 h-5 w-full" aria-hidden>
        <path
          d="M0 15 Q20 8 40 15 T80 15 T120 15 T160 15 T200 15"
          fill="none"
          stroke={season.water.scatter}
          strokeOpacity="0.55"
          strokeWidth="1.4"
        />
      </svg>
      <div className="absolute bottom-2 left-2.5 flex items-center gap-1">
        {season.foliage.slice(0, 4).map((color) => (
          <span key={color} className="size-1.5 rounded-full" style={{ background: color }} />
        ))}
      </div>
      <span className="absolute bottom-2 right-2.5 text-[8.5px] uppercase tracking-[0.24em] text-white/55">
        {season.en}
      </span>
    </div>
  )
}

export function SeasonPickerDialog() {
  const open = useGameStore((s) => s.seasonOpen)
  const setSeasonOpen = useGameStore((s) => s.setSeasonOpen)
  const current = useGameStore((s) => s.season)
  const setSeason = useGameStore((s) => s.setSeason)

  const close = () => setSeasonOpen(false)

  return (
    <Dialog open={open} onOpenChange={(v) => !v && close()}>
      <DialogContent
        showClose={false}
        className="w-[calc(100%-1rem)] max-w-2xl overflow-hidden border-border/70 bg-[#0a2326] p-0"
      >
        <div className="flex items-start justify-between gap-3 border-b border-border/60 px-4 py-3.5 sm:px-5">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-full bg-gold/12 text-gold">
              <Leaf className="size-5" />
            </span>
            <div>
              <DialogTitle className="text-[15px] font-semibold tracking-wide text-foam">
                季风手记
              </DialogTitle>
              <DialogDescription className="mt-0.5 text-[10.5px] text-muted-foreground">
                手动切换季节 · 光色、鱼群与水面都会随之改变
              </DialogDescription>
            </div>
          </div>
          <button
            type="button"
            onClick={close}
            className="grid size-8 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-foam/8 hover:text-foam"
            aria-label="关闭季风手记"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="grid max-h-[min(64dvh,560px)] grid-cols-1 gap-2.5 overflow-y-auto px-3 pb-3 pt-3 sm:grid-cols-2 sm:px-4 sm:pb-4">
          {SEASON_ORDER.map((id) => {
            const season = SEASONS[id]
            const active = id === current
            return (
              <div
                key={id}
                className={cn(
                  'rounded-xl border p-2.5 transition-colors',
                  active ? 'border-gold/55 bg-gold/6' : 'border-border/50 bg-card/40',
                )}
              >
                <SeasonPreview id={id} />
                <div className="mt-2 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[14px] font-semibold text-foam">{season.name}</span>
                    <span className="rounded-full bg-foam/8 px-1.5 py-0.5 text-[9px] text-foam/50">
                      {DAY_PERIOD_LABEL[season.period]}
                    </span>
                    {active && <Check className="size-3.5 text-gold" />}
                  </div>
                  <span className="text-[9.5px] text-foam/35">{season.tagline}</span>
                </div>
                <p className="mt-1 line-clamp-2 min-h-[26px] text-[10px] leading-relaxed text-muted-foreground">
                  {season.desc}
                </p>
                <div className="mt-1.5 flex items-center justify-between gap-2">
                  <span className="text-[9.5px]" style={{ color: season.accent }}>
                    {season.fishNote}
                  </span>
                  {active ? (
                    <span className="shrink-0 rounded-full border border-gold/30 px-2.5 py-1 text-[10px] text-gold/80">
                      当前季节
                    </span>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => {
                        setSeason(id)
                        close()
                      }}
                      className="h-7 shrink-0 rounded-full bg-gold/15 px-2.5 text-[10.5px] text-gold hover:bg-gold/25"
                    >
                      进入
                    </Button>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        <div className="border-t border-border/50 px-4 py-2 text-[10px] text-muted-foreground sm:px-5">
          季节会改变鱼类出没概率 · 当前季节的主场鱼更易咬钩
        </div>
      </DialogContent>
    </Dialog>
  )
}
