import {
  Anchor,
  Box,
  Check,
  Coins,
  Fish,
  Flag,
  Lightbulb,
  Ship,
  Sparkles,
  X,
} from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useGameStore } from '@/store/useGameStore'
import {
  BOAT_STYLES,
  DECORATIONS,
  ROD_SKINS,
  type BoatSkinId,
  type DecorationId,
} from '@/game/shop/catalog'
import { cn } from '@/lib/utils'

function BoatGlyph({ variant, accent }: { variant: BoatSkinId; accent: string }) {
  return (
    <svg viewBox="0 0 140 64" className="h-full w-full" aria-hidden>
      <line x1="8" y1="50" x2="132" y2="50" stroke="rgba(127,216,201,0.28)" strokeWidth="1" strokeDasharray="4 5" />
      {variant === 'rowboat' && (
        <g>
          <path d="M28 38 H112 L102 51 Q70 56 38 51 Z" fill="#8a5a37" />
          <path d="M30 38 H110 L106 42.5 H34 Z" fill={accent} />
          <path d="M54 38 L70 22 L86 38 Z" fill="#d8b978" />
          <path d="M70 22 V17" stroke="#5b3f28" strokeWidth="2" />
          <path d="M42 43 L25 53" stroke="#c9945e" strokeWidth="3" strokeLinecap="round" />
          <path d="M98 43 L115 53" stroke="#c9945e" strokeWidth="3" strokeLinecap="round" />
        </g>
      )}
      {variant === 'speedboat' && (
        <g>
          <path d="M20 40 Q25 50 44 50 H104 L118 40 Z" fill="#e4ede8" />
          <path d="M23 40 H114 L109 44.5 H28 Z" fill={accent} />
          <path d="M47 39 L57 27 H69 L74 39 Z" fill="#b8e6e0" fillOpacity="0.85" stroke="#8fb0bd" strokeWidth="0.8" />
          <rect x="104" y="33" width="10" height="11" rx="2" fill="#3d525c" />
          <path d="M114 44 V50" stroke="#93a6ad" strokeWidth="2" />
          <path d="M14 45 Q20 48 26 45" stroke="rgba(127,216,201,0.5)" strokeWidth="1.5" fill="none" />
        </g>
      )}
      {variant === 'patrol' && (
        <g>
          <path d="M16 40 H120 L110 51 H26 Z" fill="#93a6ad" />
          <path d="M18 40 H118 L115 43 H21 Z" fill="#3d525c" />
          <rect x="54" y="26" width="34" height="14" rx="2" fill="#b6c2c3" />
          <rect x="57" y="29" width="28" height="5" fill="#b8e6e0" fillOpacity="0.8" />
          <circle cx="36" cy="38" r="5.5" fill="#3d525c" />
          <rect x="18" y="36.5" width="14" height="3" fill="#93a6ad" />
          <path d="M92 27 V9" stroke="#93a6ad" strokeWidth="2" />
          <path d="M92 9 L104 12 L92 15 Z" fill="#e3554a" />
          <path d="M64 31 H80" stroke="#93a6ad" strokeWidth="1" />
        </g>
      )}
      {variant === 'submarine' && (
        <g>
          <ellipse cx="70" cy="41" rx="43" ry="11.5" fill="#2c3c40" />
          <rect x="60" y="23" width="21" height="12" rx="2" fill="#2c3c40" />
          <rect x="62" y="26" width="17" height="4" rx="1" fill="#b8e6e0" fillOpacity="0.55" />
          <path d="M72 23 V11" stroke="#93a6ad" strokeWidth="2" />
          <rect x="66" y="9.5" width="11" height="2.5" rx="1" fill="#93a6ad" />
          <ellipse cx="27" cy="41" rx="2.5" ry="9" fill="none" stroke={accent} strokeWidth="1.6" />
          <ellipse cx="113" cy="41" rx="2.5" ry="9" fill="none" stroke={accent} strokeWidth="1.6" />
          <path d="M14 34 L27 34" stroke={accent} strokeWidth="2" />
          <circle cx="60" cy="40" r="2" fill="#b8e6e0" fillOpacity="0.8" />
          <path d="M30 47 H108" stroke={accent} strokeWidth="2" strokeOpacity="0.6" />
        </g>
      )}
    </svg>
  )
}

function RodGlyph({
  rod,
  grip,
  reel,
  accent,
}: {
  rod: string
  grip: string
  reel: string
  accent: string
}) {
  return (
    <svg viewBox="0 0 120 64" className="h-full w-full" aria-hidden>
      <path d="M14 54 L100 10" stroke={rod} strokeWidth="4" strokeLinecap="round" />
      <path d="M14 54 L32 45" stroke={grip} strokeWidth="7" strokeLinecap="round" />
      <path d="M55 33 L63 37" stroke={accent} strokeWidth="2.5" />
      <path d="M73 24 L81 28" stroke={accent} strokeWidth="2.5" />
      <path d="M89 16 L97 20" stroke={accent} strokeWidth="2.5" />
      <circle cx="41" cy="41" r="5" fill={reel} stroke={accent} strokeWidth="1.2" />
      <circle cx="100" cy="10" r="2.2" fill={accent} />
      <path d="M20 60 Q42 55 64 60" stroke="rgba(127,216,201,0.28)" strokeWidth="1" strokeDasharray="3 4" fill="none" />
    </svg>
  )
}

function DecoIcon({ id, color }: { id: DecorationId; color: string }) {
  const cls = 'size-4'
  if (id === 'flag') return <Flag className={cls} style={{ color }} />
  if (id === 'crate') return <Box className={cls} style={{ color }} />
  if (id === 'garland') return <Lightbulb className={cls} style={{ color }} />
  return <Fish className={cls} style={{ color }} />
}

function StatBar({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[9px] text-foam/35">{label}</span>
      <div className="h-1 w-10 overflow-hidden rounded-full bg-foam/10">
        <div
          className="h-full rounded-full"
          style={{ width: `${Math.min(100, value * 62)}%`, background: accent }}
        />
      </div>
    </div>
  )
}

export function ShipyardDialog() {
  const open = useGameStore((s) => s.shopOpen)
  const setShopOpen = useGameStore((s) => s.setShopOpen)
  const money = useGameStore((s) => s.money)
  const ownedItems = useGameStore((s) => s.ownedItems)
  const boatSkin = useGameStore((s) => s.boatSkin)
  const rodSkin = useGameStore((s) => s.rodSkin)
  const decorations = useGameStore((s) => s.decorations)
  const buyItem = useGameStore((s) => s.buyItem)
  const equipBoat = useGameStore((s) => s.equipBoat)
  const equipRod = useGameStore((s) => s.equipRod)
  const toggleDecoration = useGameStore((s) => s.toggleDecoration)

  const close = () => setShopOpen(false)

  return (
    <Dialog open={open} onOpenChange={(v) => !v && close()}>
      <DialogContent
        showClose={false}
        className="w-[calc(100%-1rem)] max-w-3xl overflow-hidden border-border/70 bg-[#0a2326] p-0"
      >
        <div className="flex items-start justify-between gap-3 border-b border-border/60 px-4 py-3.5 sm:px-5">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-full bg-gold/12 text-gold">
              <Ship className="size-5" />
            </span>
            <div>
              <DialogTitle className="text-[15px] font-semibold tracking-wide text-foam">
                潮汐船坞
              </DialogTitle>
              <DialogDescription className="mt-0.5 text-[10.5px] text-muted-foreground">
                用卖鱼攒下的金币，换一条更合心意的小船
              </DialogDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-full bg-foam/6 px-2 py-1 sm:px-2.5">
              <Coins className="size-3.5 text-gold" />
              <span className="tnum text-[12px] font-semibold text-gold">
                ¥{money.toLocaleString('zh-CN')}
              </span>
            </div>
            <button
              type="button"
              onClick={close}
              className="grid size-8 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-foam/8 hover:text-foam"
              aria-label="关闭船坞"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        <Tabs defaultValue="boats" className="px-3 pb-3 pt-3 sm:px-4 sm:pb-4">
          <TabsList className="w-full">
            <TabsTrigger value="boats" className="flex-1 gap-1.5">
              <Ship className="size-3.5" />
              船体
              <span className="tnum text-[9px] text-foam/35">{BOAT_STYLES.length}</span>
            </TabsTrigger>
            <TabsTrigger value="rods" className="flex-1 gap-1.5">
              <Anchor className="size-3.5" />
              鱼竿
              <span className="tnum text-[9px] text-foam/35">{ROD_SKINS.length}</span>
            </TabsTrigger>
            <TabsTrigger value="decor" className="flex-1 gap-1.5">
              <Sparkles className="size-3.5" />
              装饰
              <span className="tnum text-[9px] text-foam/35">{DECORATIONS.length}</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="boats" className="mt-2.5">
            <div className="grid max-h-[min(56dvh,430px)] grid-cols-1 gap-2.5 overflow-y-auto pr-0.5 sm:grid-cols-2">
              {BOAT_STYLES.map((style) => {
                const owned = ownedItems.includes(style.id)
                const equipped = boatSkin === style.id
                const affordable = money >= style.price
                return (
                  <div
                    key={style.id}
                    className={cn(
                      'overflow-hidden rounded-xl border bg-card/40',
                      equipped ? 'border-gold/55' : 'border-border/50',
                    )}
                  >
                    <div className="relative h-[96px] bg-[radial-gradient(ellipse_at_50%_25%,rgba(93,216,201,0.12),rgba(7,27,29,0.2))] px-2 pt-1">
                      <BoatGlyph variant={style.id} accent={style.accent} />
                      <span className="absolute left-2.5 top-2 rounded-full bg-abyss/60 px-2 py-0.5 text-[9px] tracking-[0.16em] text-foam/60">
                        {style.title}
                      </span>
                      {equipped && (
                        <span className="absolute right-2.5 top-2 flex items-center gap-1 rounded-full bg-gold/15 px-2 py-0.5 text-[9px] font-medium text-gold">
                          <Check className="size-2.5" />
                          使用中
                        </span>
                      )}
                    </div>
                    <div className="flex flex-col gap-1.5 px-3 pb-3 pt-2">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-[14px] font-semibold text-foam">{style.name}</span>
                        <span className="flex items-center gap-2">
                          <StatBar label="航速" value={style.speed} accent={style.accent} />
                          <StatBar label="转向" value={style.turn} accent={style.accent} />
                        </span>
                      </div>
                      <p className="line-clamp-2 min-h-[28px] text-[10.5px] leading-relaxed text-muted-foreground">
                        {style.tagline}
                      </p>
                      <div className="mt-0.5 flex items-center justify-between gap-2">
                        <span
                          className={cn(
                            'tnum text-[11px]',
                            owned ? 'text-foam/40' : affordable ? 'text-gold' : 'text-destructive/80',
                          )}
                        >
                          {owned ? '已拥有' : `¥${style.price}`}
                        </span>
                        {equipped ? (
                          <span className="rounded-full border border-gold/30 px-2.5 py-1 text-[10px] text-gold/80">
                            当前船体
                          </span>
                        ) : owned ? (
                          <Button
                            size="sm"
                            onClick={() => equipBoat(style.id)}
                            className="h-7 rounded-full bg-foam/10 px-2.5 text-[10.5px] text-foam hover:bg-foam/18"
                          >
                            换乘
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            disabled={!affordable}
                            onClick={() => buyItem(style.id)}
                            className="h-7 rounded-full bg-gold/15 px-2.5 text-[10.5px] text-gold hover:bg-gold/25"
                          >
                            {affordable ? '购入' : '金币不足'}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </TabsContent>

          <TabsContent value="rods" className="mt-2.5">
            <div className="grid max-h-[min(56dvh,430px)] grid-cols-1 gap-2.5 overflow-y-auto pr-0.5 sm:grid-cols-2">
              {ROD_SKINS.map((skin) => {
                const owned = ownedItems.includes(skin.id)
                const equipped = rodSkin === skin.id
                const affordable = money >= skin.price
                return (
                  <div
                    key={skin.id}
                    className={cn(
                      'overflow-hidden rounded-xl border bg-card/40',
                      equipped ? 'border-gold/55' : 'border-border/50',
                    )}
                  >
                    <div className="relative h-[86px] bg-[radial-gradient(ellipse_at_60%_30%,rgba(255,207,122,0.1),rgba(7,27,29,0.2))] px-3 py-1">
                      <RodGlyph rod={skin.rod} grip={skin.grip} reel={skin.reel} accent={skin.accent} />
                      {equipped && (
                        <span className="absolute right-2.5 top-2 flex items-center gap-1 rounded-full bg-gold/15 px-2 py-0.5 text-[9px] font-medium text-gold">
                          <Check className="size-2.5" />
                          使用中
                        </span>
                      )}
                    </div>
                    <div className="px-3 pb-3">
                      <div className="flex items-baseline justify-between">
                        <span className="text-[13.5px] font-semibold text-foam">{skin.name}</span>
                        <span className="tnum text-[10px] text-foam/35">
                          {skin.glowIntensity > 0 ? '微光' : '原木'}
                        </span>
                      </div>
                      <p className="mt-1 line-clamp-2 min-h-[28px] text-[10.5px] leading-relaxed text-muted-foreground">
                        {skin.tagline}
                      </p>
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <span
                          className={cn(
                            'tnum text-[11px]',
                            owned ? 'text-foam/40' : affordable ? 'text-gold' : 'text-destructive/80',
                          )}
                        >
                          {owned ? '已拥有' : `¥${skin.price}`}
                        </span>
                        {equipped ? (
                          <span className="rounded-full border border-gold/30 px-2.5 py-1 text-[10px] text-gold/80">
                            当前鱼竿
                          </span>
                        ) : owned ? (
                          <Button
                            size="sm"
                            onClick={() => equipRod(skin.id)}
                            className="h-7 rounded-full bg-foam/10 px-2.5 text-[10.5px] text-foam hover:bg-foam/18"
                          >
                            换上
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            disabled={!affordable}
                            onClick={() => buyItem(skin.id)}
                            className="h-7 rounded-full bg-gold/15 px-2.5 text-[10.5px] text-gold hover:bg-gold/25"
                          >
                            {affordable ? '购入' : '金币不足'}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </TabsContent>

          <TabsContent value="decor" className="mt-2.5">
            <div className="grid max-h-[min(56dvh,430px)] grid-cols-1 gap-2 overflow-y-auto pr-0.5 sm:grid-cols-2">
              {DECORATIONS.map((deco) => {
                const owned = ownedItems.includes(deco.id)
                const equipped = decorations.includes(deco.id)
                const affordable = money >= deco.price
                return (
                  <div
                    key={deco.id}
                    className={cn(
                      'flex items-center gap-2.5 rounded-lg border p-2.5',
                      equipped ? 'border-gold/45 bg-gold/5' : 'border-border/50 bg-card/40',
                    )}
                  >
                    <span
                      className="grid size-10 shrink-0 place-items-center rounded-md"
                      style={{ background: `${deco.accent}1f` }}
                    >
                      <DecoIcon id={deco.id} color={deco.accent} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[12.5px] font-medium text-foam">{deco.name}</span>
                        {equipped && <Check className="size-3 text-gold" />}
                      </div>
                      <p className="mt-0.5 line-clamp-2 text-[10px] leading-relaxed text-muted-foreground">
                        {deco.tagline}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <span
                        className={cn(
                          'tnum text-[10.5px]',
                          owned ? 'text-foam/35' : affordable ? 'text-gold' : 'text-destructive/80',
                        )}
                      >
                        {owned ? '已拥有' : `¥${deco.price}`}
                      </span>
                      {!owned ? (
                        <Button
                          size="sm"
                          disabled={!affordable}
                          onClick={() => buyItem(deco.id)}
                          className="h-6 rounded-full bg-gold/15 px-2 text-[10px] text-gold hover:bg-gold/25"
                        >
                          {affordable ? '购入' : '不足'}
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => toggleDecoration(deco.id)}
                          className={cn(
                            'h-6 rounded-full px-2 text-[10px]',
                            equipped
                              ? 'bg-gold/15 text-gold hover:bg-gold/25'
                              : 'bg-foam/10 text-foam hover:bg-foam/18',
                          )}
                        >
                          {equipped ? '收起' : '挂上'}
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="mt-2 rounded-md bg-foam/4 px-2.5 py-1.5 text-[10px] text-muted-foreground">
              装饰可以同时挂多件 · 购买后立即装到船上，也可随时收起
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
