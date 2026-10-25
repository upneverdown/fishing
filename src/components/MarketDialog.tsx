import { useEffect, useMemo, useState } from 'react'
import {
  DndContext,
  PointerSensor,
  pointerWithin,
  rectIntersection,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
} from '@dnd-kit/core'
import { Group, Panel, Separator } from 'react-resizable-panels'
import { Anchor, Check, Coins, GripVertical, PackageOpen, ShoppingBasket, X } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { FishArt } from '@/components/FishArt'
import { RarityDot } from '@/components/RarityBadge'
import { bagCapacity, currentDailyFactor, useGameStore } from '@/store/useGameStore'
import { freshnessOf, marketQuote } from '@/game/economy/market'
import { SEASONS } from '@/game/world/seasons'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { cn } from '@/lib/utils'
import type { Catch } from '@/types'

interface Sale {
  id: string
  name: string
  value: number
}

function FishRow({ item, quote, onSell }: { item: Catch; quote: number; onSell: (c: Catch) => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: item.id })
  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined
  const fresh = Math.round(freshnessOf(item) * 100)

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        'group relative flex touch-none select-none items-center gap-2.5 rounded-lg border border-border/50 bg-card/55 p-2 transition-colors hover:border-foam/20 hover:bg-card/80',
        isDragging && 'z-10 border-gold/60 bg-card shadow-[0_18px_40px_-16px_rgba(0,0,0,0.9)]',
      )}
    >
      <div className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-md bg-abyss/50">
        <FishArt rarity={item.rarity} defId={item.defId} className="h-9 w-12" glow={false} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-[13px] font-medium text-foam">{item.name}</span>
          <RarityDot rarity={item.rarity} />
        </div>
        <div className="tnum mt-0.5 text-[10.5px] text-muted-foreground">
          {item.kg.toFixed(2)} kg · {item.cm} cm · 鲜度 {fresh}%
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-0.5">
        <span className="tnum text-[13px] font-semibold text-gold">¥{quote}</span>
        {quote !== item.value && (
          <span className="tnum text-[8.5px] text-foam/30 line-through">¥{item.value}</span>
        )}
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation()
            onSell(item)
          }}
          className="rounded-full bg-foam/8 px-2 py-0.5 text-[9.5px] text-foam/60 transition-colors hover:bg-gold/15 hover:text-gold"
        >
          卖出
        </button>
      </div>
      <GripVertical className="size-3.5 shrink-0 text-foam/20" />
    </div>
  )
}

function Basket({ compact = false }: { compact?: boolean }) {
  const { setNodeRef, isOver } = useDroppable({ id: 'basket' })
  const over = isOver

  return (
    <div
      ref={setNodeRef}
      data-dnd-basket
      className={cn(
        'relative flex h-full flex-col items-center justify-center gap-1.5 overflow-hidden rounded-lg border border-dashed px-3 py-3 text-center transition-colors',
        over ? 'border-gold/70 bg-gold/10' : 'border-border/60 bg-abyss/30',
      )}
    >
      {!compact && (
        <div
          className={cn(
            'grid size-14 place-items-center rounded-full transition-colors',
            over ? 'bg-gold/20 text-gold' : 'bg-foam/6 text-foam/45',
          )}
        >
          <ShoppingBasket className="size-7" />
        </div>
      )}
      <div className={cn('font-medium text-foam/75', compact ? 'text-[11px]' : 'mt-1 text-[12.5px]')}>
        {over ? '松手成交' : '把鱼拖进收购筐'}
      </div>
      {!compact && (
        <div className="text-[10.5px] leading-relaxed text-muted-foreground">
          也可以点右侧的「卖出」，老周头按当日行情现结
        </div>
      )}
    </div>
  )
}

export function MarketDialog() {
  const open = useGameStore((s) => s.marketOpen)
  const close = useGameStore((s) => s.closeMarket)
  const bag = useGameStore((s) => s.bag)
  const capacity = useGameStore((s) => bagCapacity(s))
  const livewell = useGameStore((s) => s.installedFacilities.includes('livewell'))
  const money = useGameStore((s) => s.money)
  const sellOne = useGameStore((s) => s.sellOne)
  const sellAll = useGameStore((s) => s.sellAll)
  const season = useGameStore((s) => s.season)
  const cabinLevel = useGameStore((s) => s.cabinLevel)
  const dailySold = useGameStore((s) => s.dailySold)
  const isDesktop = useMediaQuery('(min-width: 768px)')

  const [sales, setSales] = useState<Sale[]>([])
  const [sessionEarned, setSessionEarned] = useState(0)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  )

  useEffect(() => {
    if (!open) return
    setSales([])
    setSessionEarned(0)
  }, [open])

  const quoteOf = (c: Catch) => marketQuote(c, season, cabinLevel, dailySold, livewell).price
  const total = useMemo(
    () => bag.reduce((sum, c) => sum + quoteOf(c), 0),
    [bag, season, cabinLevel, dailySold, livewell],
  )
  const dailyFactor = currentDailyFactor()

  const recordSale = (c: Catch, value: number) => {
    setSales((prev) => [{ id: c.id, name: c.name, value }, ...prev].slice(0, 4))
    setSessionEarned((prev) => prev + value)
  }

  const handleSell = (c: Catch) => {
    recordSale(c, quoteOf(c))
    sellOne(c.id)
  }

  const handleSellAll = () => {
    if (!bag.length) return
    setSales(bag.slice(0, 4).map((c) => ({ id: c.id, name: c.name, value: quoteOf(c) })))
    setSessionEarned((prev) => prev + total)
    sellAll()
  }

  const onDragEnd = (e: DragEndEvent) => {
    const item = bag.find((c) => c.id === String(e.active.id))
    if (!item) return
    const basket = document.querySelector('[data-dnd-basket]')?.getBoundingClientRect()
    const rect = e.active.rect.current.translated
    const overlaps =
      basket &&
      rect &&
      rect.left < basket.right &&
      rect.right > basket.left &&
      rect.top < basket.bottom &&
      rect.bottom > basket.top
    if (e.over?.id === 'basket' || overlaps) handleSell(item)
  }

  const collisionDetection: CollisionDetection = (args) => {
    const hits = pointerWithin(args)
    return hits.length ? hits : rectIntersection(args)
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && close()}>
      <DialogContent
        showClose={false}
        className="w-[calc(100%-1rem)] max-w-3xl overflow-hidden border-border/70 bg-[#0a2326] p-0"
      >
        <div className="flex items-start justify-between gap-3 border-b border-border/60 px-4 py-3.5 sm:px-5">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-full bg-gold/12 text-gold">
              <Anchor className="size-5" />
            </span>
            <div>
              <DialogTitle className="text-[15px] font-semibold tracking-wide text-foam">
                码头收购站
              </DialogTitle>
              <DialogDescription className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10.5px] text-muted-foreground">
                <span>{SEASONS[season].name}行情</span>
                <span className="text-foam/20">·</span>
                <span className={cn(dailyFactor < 1 ? 'text-destructive/80' : 'text-tide/80')}>
                  收购系数 ×{dailyFactor.toFixed(2)}
                </span>
                {cabinLevel > 1 && (
                  <>
                    <span className="text-foam/20">·</span>
                    <span className="text-gold/80">船舱溢价 +{(cabinLevel - 1) * 5}%</span>
                  </>
                )}
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
              onClick={close}
              className="grid size-8 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-foam/8 hover:text-foam"
              aria-label="关闭收购站"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        <div className="px-2.5 pb-2.5 pt-2.5 sm:px-4 sm:pb-4">
          <DndContext
            sensors={sensors}
            collisionDetection={collisionDetection}
            onDragEnd={onDragEnd}
          >
            <Group
              key={isDesktop ? 'market-h' : 'market-v'}
              orientation={isDesktop ? 'horizontal' : 'vertical'}
              className="h-[min(64dvh,470px)] min-h-[300px] rounded-lg border border-border/50 bg-abyss/30"
            >
              <Panel defaultSize={isDesktop ? '58' : '52'} minSize={isDesktop ? '34' : '34'} className="min-h-0 min-w-0">
                <div className="flex h-full min-h-0 flex-col">
                  <div className="flex items-center justify-between px-3 pb-2 pt-2.5">
                    <div className="flex items-center gap-1.5 text-[10.5px] font-medium tracking-[0.16em] text-foam/50">
                      待售渔获
                      <span className="tnum rounded-full bg-foam/8 px-1.5 py-0.5 text-[9.5px] text-foam/55">
                        {bag.length}/{capacity}
                      </span>
                    </div>
                    <span className="tnum text-[10.5px] text-muted-foreground">估值 ¥{total}</span>
                  </div>
                  <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto px-3 pb-3">
                    {bag.map((item) => (
                      <FishRow
                        key={item.id}
                        item={item}
                        quote={quoteOf(item)}
                        onSell={handleSell}
                      />
                    ))}
                    {bag.length === 0 && (
                      <div className="flex h-full flex-col items-center justify-center gap-2 py-8 text-center">
                        <PackageOpen className="size-8 text-foam/20" />
                        <div className="text-[12px] text-foam/50">鱼篓空空如也</div>
                        <div className="text-[10.5px] text-muted-foreground">回到船上再钓几条吧</div>
                      </div>
                    )}
                  </div>
                </div>
              </Panel>

              <Separator
                className={cn(
                  'relative bg-border/70 transition-colors hover:bg-gold/40',
                  isDesktop ? 'w-px' : 'h-px w-full',
                )}
              />

              <Panel defaultSize={isDesktop ? '42' : '48'} minSize={isDesktop ? '30' : '38'} className="min-h-0 min-w-0">
                <div className="flex h-full min-h-0 flex-col gap-2 px-3 py-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10.5px] font-medium tracking-[0.16em] text-foam/50">收购筐</span>
                    <Button
                      size="sm"
                      onClick={handleSellAll}
                      disabled={!bag.length}
                      className="h-7 gap-1 rounded-full bg-gold/15 px-2.5 text-[10.5px] text-gold hover:bg-gold/25"
                    >
                      <Check className="size-3" />
                      全部卖出 ¥{total}
                    </Button>
                  </div>

                  <div className="min-h-0 flex-1">
                    <Basket compact={!isDesktop} />
                  </div>

                  <div className="rounded-md border border-border/40 bg-card/35 px-2.5 py-1.5">
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                      <span>本次收购</span>
                      <span className="tnum font-semibold text-gold">+¥{sessionEarned}</span>
                    </div>
                    {sales.length > 0 && (
                      <div className="mt-1 max-h-[42px] space-y-0.5 overflow-y-auto">
                        {sales.map((s, i) => (
                          <div
                            key={`${s.id}-${i}`}
                            className="flex items-center justify-between text-[10px]"
                          >
                            <span className="truncate text-foam/55">{s.name}</span>
                            <span className="tnum text-foam/45">¥{s.value}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </Panel>
            </Group>
          </DndContext>
        </div>
      </DialogContent>
    </Dialog>
  )
}
