import { useEffect } from 'react'
import { Check, Fish, X } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { FishArt } from '@/components/FishArt'
import { useGameStore } from '@/store/useGameStore'
import { RARITIES } from '@/game/fishing/fishTable'
import { METHOD_COLOR, METHOD_LABEL } from '@/game/capture/tools'
import { cn } from '@/lib/utils'

export function CaptureResultDialog() {
  const list = useGameStore((s) => s.captureResult)
  const setList = useGameStore((s) => s.setCaptureResult)
  const total = list?.reduce((sum, c) => sum + c.value, 0) ?? 0

  return (
    <Dialog open={Boolean(list)} onOpenChange={(v) => !v && setList(null)}>
      <DialogContent
        showClose={false}
        className="w-[calc(100%-1.5rem)] max-w-md overflow-hidden border-tide/30 bg-[#0a2326] p-0"
      >
        <div className="relative border-b border-border/50 px-4 pb-3 pt-4">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(111,224,207,0.16),transparent_70%)]" />
          <div className="relative flex items-start justify-between gap-3">
            <div>
              <DialogTitle className="flex items-center gap-2 text-[15px] font-semibold tracking-wide text-foam">
                <span className="grid size-8 place-items-center rounded-full bg-tide/15 text-tide">
                  <Fish className="size-4" />
                </span>
                这一网有货
              </DialogTitle>
              <DialogDescription className="mt-1 text-[10px] text-foam/45">
                共 {list?.length ?? 0} 条 · 码头估值 ¥{total}
              </DialogDescription>
            </div>
            <button
              type="button"
              onClick={() => setList(null)}
              className="grid size-7 place-items-center rounded-full text-foam/40 hover:bg-foam/8 hover:text-foam"
              aria-label="关闭"
            >
              <X className="size-3.5" />
            </button>
          </div>
        </div>

        <div className="max-h-[52dvh] space-y-1.5 overflow-y-auto p-3">
          {list?.map((c) => {
            const meta = RARITIES[c.rarity]
            return (
              <div
                key={c.id}
                className="flex items-center gap-2.5 rounded-lg border border-border/45 bg-card/40 p-2"
              >
                <div className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-md bg-abyss/40">
                  <FishArt rarity={c.rarity} defId={c.defId} className="h-9 w-12" glow={false} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate text-[12px] font-medium text-foam">{c.name}</span>
                    <span
                      className="rounded-full px-1.5 py-0.5 text-[8px] font-semibold"
                      style={{ background: meta.soft, color: meta.color }}
                    >
                      {meta.label}
                    </span>
                  </div>
                  <div className="tnum mt-0.5 text-[9.5px] text-foam/40">
                    {c.kg.toFixed(2)} kg · {c.cm} cm
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-0.5">
                  <span className="tnum text-[12px] font-semibold text-gold">¥{c.value}</span>
                  {c.method && (
                    <span
                      className="rounded-full px-1.5 py-0.5 text-[8px]"
                      style={{ background: `${METHOD_COLOR[c.method]}1f`, color: METHOD_COLOR[c.method] }}
                    >
                      {METHOD_LABEL[c.method]}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        <div className="border-t border-border/50 p-3">
          <button
            type="button"
            onClick={() => setList(null)}
            className={cn(
              'flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-tide/15 text-[12px] font-semibold text-tide transition-colors hover:bg-tide/25',
            )}
          >
            <Check className="size-4" />
            收进鱼篓
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
