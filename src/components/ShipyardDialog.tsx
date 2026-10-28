import { useState } from 'react'
import {
  Anchor,
  Box,
  Check,
  Coins,
  Fish,
  Flag,
  Flame,
  Flashlight,
  Lightbulb,
  Radar,
  Ship,
  Sparkles,
  Waves,
  Wrench,
  X,
  type LucideIcon,
} from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { BoatPreview } from '@/components/BoatPreview'
import { useGameStore } from '@/store/useGameStore'
import {
  BOAT_STYLES,
  DECORATIONS,
  ROD_SKINS,
  boatFacilitySlots,
  type BoatSkinId,
  type DecorationId,
} from '@/game/shop/catalog'
import { FACILITIES, facilityById } from '@/game/boat/facilities'
import { waterById } from '@/game/world/waters'
import { cn } from '@/lib/utils'
import type { FacilityId } from '@/types'

const FACILITY_ICONS: Record<FacilityId, LucideIcon> = {
  fishfinder: Radar,
  livewell: Waves,
  searchlight: Flashlight,
  grill: Flame,
  anchor: Anchor,
}

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
      {variant === 'icebreaker' && (
        <g>
          <path d="M18 38 H120 L112 50 Q70 55 30 50 Z" fill="#4d6068" />
          <path d="M20 38 H118 L114 42.5 H24 Z" fill={accent} />
          <path d="M20 43 L27 50 H44 L37 43 Z" fill="#ff9d5c" />
          <rect x="50" y="24" width="42" height="14" rx="2" fill="#dfe8e6" />
          <rect x="55" y="27" width="12" height="6" rx="1" fill="#b8e6e0" fillOpacity="0.7" />
          <rect x="72" y="27" width="9" height="6" rx="1" fill="#b8e6e0" fillOpacity="0.45" />
          <path d="M72 24 V12" stroke="#93a6ad" strokeWidth="2" />
          <path d="M72 12 L82 15 L72 18 Z" fill={accent} />
          <path d="M110 38 V28 H118 V38" fill="#93a6ad" />
          <path d="M96 38 V32 H104 V38" fill="#93a6ad" />
          <path d="M28 47 H108" stroke={accent} strokeWidth="2" strokeOpacity="0.5" />
          <path d="M122 45 l7 -3 3 4 -7 4 Z" fill="#cfe9ea" fillOpacity="0.5" />
          <path d="M10 49 l6 -3 3 4 -6 3 Z" fill="#cfe9ea" fillOpacity="0.4" />
        </g>
      )}
      {variant === 'skyboat' && (
        <g>
          <path d="M24 36 Q34 47 56 47 H96 Q112 47 118 36 Z" fill="#efe3cb" />
          <path d="M26 36 H116 L112 40 H30 Z" fill={accent} />
          <ellipse cx="70" cy="40" rx="30" ry="6.5" fill="none" stroke={accent} strokeWidth="1.4" strokeOpacity="0.8" />
          <path d="M70 34 V12" stroke={accent} strokeWidth="2" />
          <path d="M72 13 Q88 20 72 30 Z" fill="#fff1d2" fillOpacity="0.55" stroke={accent} strokeWidth="1" />
          <circle cx="46" cy="52" r="5" fill="#fffaf0" fillOpacity="0.7" />
          <circle cx="66" cy="54" r="6" fill="#fffaf0" fillOpacity="0.55" />
          <circle cx="88" cy="52" r="5" fill="#fffaf0" fillOpacity="0.65" />
          <path d="M120 30 l4 -7 4 7 -4 6 Z" fill={accent} fillOpacity="0.85" />
          <path d="M20 28 l3 -5 3 5 -3 5 Z" fill={accent} fillOpacity="0.7" />
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
  const immortalJade = useGameStore((s) => s.immortalJade)
  const ascended = useGameStore((s) => s.ascended)
  const ownedItems = useGameStore((s) => s.ownedItems)
  const boatSkin = useGameStore((s) => s.boatSkin)
  const rodSkin = useGameStore((s) => s.rodSkin)
  const decorations = useGameStore((s) => s.decorations)
  const buyItem = useGameStore((s) => s.buyItem)
  const equipBoat = useGameStore((s) => s.equipBoat)
  const equipRod = useGameStore((s) => s.equipRod)
  const toggleDecoration = useGameStore((s) => s.toggleDecoration)
  const ownedFacilities = useGameStore((s) => s.ownedFacilities)
  const installedFacilities = useGameStore((s) => s.installedFacilities)
  const facilityActive = useGameStore((s) => s.facilityActive)
  const buyFacility = useGameStore((s) => s.buyFacility)
  const installFacility = useGameStore((s) => s.installFacility)
  const toggleFacility = useGameStore((s) => s.toggleFacility)
  const toast = useGameStore((s) => s.toast)
  const [selectedBoat, setSelectedBoat] = useState<BoatSkinId>(boatSkin)

  const close = () => setShopOpen(false)
  const slots = boatFacilitySlots(boatSkin)
  const installedCount = installedFacilities.filter(Boolean).length
  const emptySlot = Array.from({ length: slots }, (_, i) => installedFacilities[i] ?? null).findIndex(
    (slot) => slot === null,
  )
  const installToFirstEmpty = (id: FacilityId) => {
    if (emptySlot < 0) {
      toast('设施槽已经满了 · 先卸下一件', 'info')
      return
    }
    installFacility(emptySlot, id)
  }
  const previewStyle = BOAT_STYLES.find((style) => style.id === selectedBoat) ?? BOAT_STYLES[0]
  const visibleBoatStyles = BOAT_STYLES.filter((style) => !style.hidden)

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
            {(ascended || immortalJade > 0) && (
              <div className="flex items-center gap-1.5 rounded-full bg-gold/8 px-2 py-1 sm:px-2.5">
                <Sparkles className="size-3.5 text-[#ffe6a8]" />
                <span className="tnum text-[12px] font-semibold text-[#ffe6a8]">{immortalJade} 仙玉</span>
              </div>
            )}
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
              <span className="tnum text-[9px] text-foam/35">{visibleBoatStyles.length}</span>
            </TabsTrigger>
            <TabsTrigger value="rods" className="flex-1 gap-1.5">
              <Anchor className="size-3.5" />
              鱼竿
              <span className="tnum text-[9px] text-foam/35">{ROD_SKINS.length}</span>
            </TabsTrigger>
            <TabsTrigger value="facilities" className="flex-1 gap-1.5">
              <Wrench className="size-3.5" />
              设施
              <span className="tnum text-[9px] text-foam/35">
                {installedCount}/{slots}
              </span>
            </TabsTrigger>
            <TabsTrigger value="decor" className="flex-1 gap-1.5">
              <Sparkles className="size-3.5" />
              装饰
              <span className="tnum hidden text-[9px] text-foam/35 sm:inline">{DECORATIONS.length}</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="boats" className="mt-2.5">
            <div className="max-h-[min(68dvh,610px)] overflow-y-auto pr-0.5">
              <div className="mb-2.5 overflow-hidden rounded-xl border border-border/50 bg-[radial-gradient(ellipse_at_50%_0%,rgba(93,216,201,0.16),rgba(7,27,29,0.55))]">
                <div className="flex items-start justify-between gap-2 px-3 pt-2">
                  <div>
                    <div className="text-[13px] font-semibold tracking-wide text-foam">
                      {previewStyle.name}
                      <span className="ml-1.5 text-[10px] font-normal text-foam/40">
                        {previewStyle.title}
                      </span>
                    </div>
                    <div className="mt-0.5 text-[9px] text-tide/75">
                      {previewStyle.classLabel} · 第{previewStyle.tier}级
                      {previewStyle.weatherproof ? ' · 全天候' : ' · 近岸'}
                    </div>
                  </div>
                  <span className="tnum rounded-full border border-gold/25 bg-gold/8 px-2 py-0.5 text-[9px] text-gold/80">
                    载重 {previewStyle.capacity}
                  </span>
                </div>
                <BoatPreview skin={selectedBoat} className="h-[148px] w-full sm:h-[188px]" />
                <div className="grid grid-cols-4 gap-1 border-t border-white/8 px-2 py-1.5 text-center">
                  {[
                    ['载重', `${previewStyle.capacity}`],
                    ['装备位', `${previewStyle.gearCap}`],
                    ['设施槽', `${previewStyle.facilitySlots}`],
                    ['耐久', `${previewStyle.durability}`],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-md bg-abyss/35 py-1">
                      <div className="tnum text-[11px] font-semibold text-foam/80">{value}</div>
                      <div className="text-[7.5px] tracking-[0.12em] text-foam/30">{label}</div>
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap items-center gap-1 px-2 pb-2 pt-1">
                  <span className="text-[8px] uppercase tracking-[0.16em] text-foam/30">可航</span>
                  {previewStyle.waters.map((waterId) => {
                    const water = waterById(waterId)
                    if (!water) return null
                    return (
                      <span
                        key={waterId}
                        className="rounded-full px-1.5 py-0.5 text-[8.5px]"
                        style={{ background: `${water.color}18`, color: water.color }}
                      >
                        {water.name}
                      </span>
                    )
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2.5 pb-0.5 sm:grid-cols-2">
              {visibleBoatStyles.map((style) => {
                const owned = ownedItems.includes(style.id)
                const equipped = boatSkin === style.id
                const locked = Boolean(style.celestialOnly) && !ascended
                const affordable = style.jade ? immortalJade >= style.jade : money >= style.price
                const selected = selectedBoat === style.id
                return (
                  <div
                    key={style.id}
                    onMouseEnter={() => setSelectedBoat(style.id)}
                    onClick={() => setSelectedBoat(style.id)}
                    className={cn(
                      'cursor-pointer overflow-hidden rounded-xl border bg-card/40 transition-colors',
                      equipped ? 'border-gold/55' : selected ? 'border-tide/55' : 'border-border/50',
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
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[8.5px] text-foam/35">
                        <span>{style.classLabel} · 第{style.tier}级</span>
                        <span>载重 {style.capacity}</span>
                        <span>设施槽 {style.facilitySlots}</span>
                        <span>耐久 {style.durability}</span>
                      </div>
                      <div className="mt-0.5 flex items-center justify-between gap-2">
                        <span
                          className={cn(
                            'tnum text-[11px]',
                            owned ? 'text-foam/40' : affordable ? 'text-gold' : 'text-destructive/80',
                          )}
                        >
                          {owned
                            ? '已拥有'
                            : style.jade
                              ? `${style.jade} 仙玉`
                              : `¥${style.price}`}
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
                            disabled={!affordable || locked}
                            onClick={() => buyItem(style.id)}
                            className="h-7 rounded-full bg-gold/15 px-2.5 text-[10.5px] text-gold hover:bg-gold/25"
                          >
                            {locked ? '飞升后可请' : affordable ? '购入' : style.jade ? '仙玉不足' : '金币不足'}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="rods" className="mt-2.5">
            <div className="grid max-h-[min(56dvh,430px)] grid-cols-1 gap-2.5 overflow-y-auto pr-0.5 sm:grid-cols-2">
              {ROD_SKINS.map((skin) => {
                const owned = ownedItems.includes(skin.id)
                const equipped = rodSkin === skin.id
                const locked = Boolean(skin.jade) && !ascended
                const affordable = skin.jade ? immortalJade >= skin.jade : money >= skin.price
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
                          {skin.jade ? '天界' : skin.glowIntensity > 0 ? '微光' : '原木'}
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
                          {owned ? '已拥有' : skin.jade ? `${skin.jade} 仙玉` : `¥${skin.price}`}
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
                            disabled={!affordable || locked}
                            onClick={() => buyItem(skin.id)}
                            className="h-7 rounded-full bg-gold/15 px-2.5 text-[10.5px] text-gold hover:bg-gold/25"
                          >
                            {locked ? '飞升后可请' : affordable ? '购入' : skin.jade ? '仙玉不足' : '金币不足'}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </TabsContent>

          <TabsContent value="facilities" className="mt-2.5">
            <div className="max-h-[min(64dvh,570px)] space-y-2.5 overflow-y-auto pr-0.5">
              <div className="flex items-center justify-between rounded-lg border border-border/45 bg-abyss/30 px-3 py-2">
                <div>
                  <div className="text-[11.5px] font-medium text-foam">
                    {BOAT_STYLES.find((style) => style.id === boatSkin)?.name ?? '当前船体'} · 设施槽
                  </div>
                  <div className="mt-0.5 text-[9px] text-foam/35">
                    拖拽设施到槽位，或点「安装」自动放进空槽
                  </div>
                </div>
                <span className="tnum rounded-full bg-tide/12 px-2 py-1 text-[10px] text-tide">
                  {installedCount}/{slots}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {Array.from({ length: slots }).map((_, index) => {
                  const id = installedFacilities[index] ?? null
                  const def = id ? facilityById(id) : undefined
                  const Icon = id ? FACILITY_ICONS[id] : null
                  const active = id ? Boolean(facilityActive[id]) : false
                  return (
                    <div
                      key={index}
                      onDragOver={(e) => {
                        e.preventDefault()
                        e.dataTransfer.dropEffect = 'move'
                      }}
                      onDrop={(e) => {
                        e.preventDefault()
                        const dropped = e.dataTransfer.getData('text/facility') as FacilityId
                        if (dropped) installFacility(index, dropped)
                      }}
                      className={cn(
                        'flex flex-col rounded-xl border p-2 transition-colors',
                        def
                          ? 'border-tide/35 bg-tide/5'
                          : 'border-dashed border-border/55 bg-abyss/25',
                      )}
                    >
                      <div className="flex items-center justify-between text-[8.5px] text-foam/30">
                        <span className="tnum">#{index + 1}</span>
                        {id && (
                          <button
                            type="button"
                            onClick={() => installFacility(index, null)}
                            className="grid size-4 place-items-center rounded-full text-foam/35 hover:bg-foam/10 hover:text-destructive"
                            aria-label="卸下设施"
                          >
                            <X className="size-2.5" />
                          </button>
                        )}
                      </div>
                      {def && Icon ? (
                        <div className="mt-1 flex flex-1 flex-col">
                          <span
                            className="grid size-7 place-items-center rounded-full"
                            style={{ background: `${def.color}1c`, color: def.color }}
                          >
                            <Icon className="size-3.5" />
                          </span>
                          <div className="mt-1 text-[11px] font-medium text-foam">{def.name}</div>
                          <div className="mt-0.5 text-[8.5px] text-foam/40">{def.effect}</div>
                          {def.toggle && (
                            <button
                              type="button"
                              onClick={() => toggleFacility(def.id)}
                              className={cn(
                                'mt-1.5 rounded-md px-1.5 py-0.5 text-[8.5px] transition-colors',
                                active
                                  ? 'bg-gold/15 text-gold'
                                  : 'bg-foam/6 text-foam/45 hover:text-foam/80',
                              )}
                            >
                              {active ? '开启中' : '已关闭'}
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="grid flex-1 place-items-center py-2 text-center text-[8.5px] text-foam/25">
                          <span>
                            <Wrench className="mx-auto mb-1 size-3.5" />
                            空槽
                          </span>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                {FACILITIES.map((facility) => {
                  const owned = ownedFacilities.includes(facility.id)
                  const installedIndex = installedFacilities.indexOf(facility.id)
                  const installed = installedIndex >= 0
                  const active = Boolean(facilityActive[facility.id])
                  const affordable = money >= facility.price
                  const Icon = FACILITY_ICONS[facility.id]
                  return (
                    <div
                      key={facility.id}
                      draggable={owned}
                      onDragStart={(e) => {
                        if (!owned) {
                          e.preventDefault()
                          return
                        }
                        e.dataTransfer.setData('text/facility', facility.id)
                        e.dataTransfer.effectAllowed = 'move'
                      }}
                      className={cn(
                        'flex gap-2.5 rounded-xl border p-2.5 transition-colors',
                        installed
                          ? 'border-tide/35 bg-tide/5'
                          : owned
                            ? 'cursor-grab border-border/50 bg-card/45 active:cursor-grabbing'
                            : 'border-border/45 bg-card/30',
                      )}
                    >
                      <span
                        className="grid size-9 shrink-0 place-items-center self-start rounded-full"
                        style={{ background: `${facility.color}1a`, color: facility.color }}
                      >
                        <Icon className="size-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-[12px] font-semibold text-foam">{facility.name}</span>
                          <span
                            className="rounded-full px-1.5 py-0.5 text-[8px]"
                            style={{ background: `${facility.color}18`, color: facility.color }}
                          >
                            {facility.effect}
                          </span>
                        </div>
                        <p className="mt-1 line-clamp-2 text-[9.5px] leading-relaxed text-foam/40">
                          {facility.tagline}
                        </p>
                        <div className="mt-1.5 flex items-center gap-1.5">
                          {!owned ? (
                            <>
                              <span
                                className={cn(
                                  'tnum text-[10px]',
                                  affordable ? 'text-gold' : 'text-destructive/80',
                                )}
                              >
                                ¥{facility.price}
                              </span>
                              <button
                                type="button"
                                disabled={!affordable}
                                onClick={() => buyFacility(facility.id)}
                                className="ml-auto rounded-md bg-gold/12 px-2 py-1 text-[9px] text-gold transition-colors hover:bg-gold/22 disabled:opacity-30"
                              >
                                购入
                              </button>
                            </>
                          ) : installed ? (
                            <>
                              <span className="text-[8.5px] text-tide/70">已装于 {installedIndex + 1} 号槽</span>
                              <button
                                type="button"
                                onClick={() => installFacility(installedIndex, null)}
                                className="ml-auto rounded-md border border-border/45 px-1.5 py-1 text-[8.5px] text-foam/50 hover:border-destructive/40 hover:text-destructive"
                              >
                                卸下
                              </button>
                            </>
                          ) : (
                            <>
                              <span className="text-[8.5px] text-foam/35">
                                {facility.toggle ? '可开关' : '常驻生效'}
                              </span>
                              <button
                                type="button"
                                disabled={emptySlot < 0}
                                onClick={() => installToFirstEmpty(facility.id)}
                                className="ml-auto rounded-md bg-foam/8 px-2 py-1 text-[9px] text-foam/70 transition-colors hover:bg-foam/16 disabled:opacity-30"
                              >
                                {emptySlot < 0 ? '槽位已满' : '安装'}
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="rounded-md bg-foam/4 px-2.5 py-1.5 text-[9px] leading-relaxed text-foam/35">
                换船后设施会留在仓库，按新船的槽位重新安装即可。探照灯按 L、船锚按 Y、船载烤架按 H 可直接操作。
              </div>
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
