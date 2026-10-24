import { Anchor, BookOpen, Fish, Home, Leaf, Package, ScrollText, Soup, Store, X } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { useGameStore } from '@/store/useGameStore'
import { NPCS } from '@/game/town/npcs'
import { QuestPanel } from './town/QuestPanel'
import { FarmPanel } from './town/FarmPanel'
import { KitchenPanel } from './town/KitchenPanel'
import { CodexPanel } from './town/CodexPanel'
import { CabinPanel } from './town/CabinPanel'
import { ShopPanel } from './town/ShopPanel'
import { cn } from '@/lib/utils'
import type { TownTab } from '@/types'

const TABS: { id: TownTab; label: string; icon: typeof Fish }[] = [
  { id: 'quests', label: '委托', icon: ScrollText },
  { id: 'farm', label: '菜园', icon: Leaf },
  { id: 'kitchen', label: '灶台', icon: Soup },
  { id: 'codex', label: '图鉴', icon: BookOpen },
  { id: 'cabin', label: '小屋', icon: Home },
  { id: 'shop', label: '铺子', icon: Store },
]

function NpcStrip() {
  const openNpc = useGameStore((s) => s.openNpc)
  const npcId = useGameStore((s) => s.npcId)
  return (
    <div className="flex gap-1.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {NPCS.map((npc) => (
        <button
          key={npc.id}
          type="button"
          onClick={() => openNpc(npc.id)}
          className={cn(
            'flex shrink-0 items-center gap-1.5 rounded-full border py-1 pl-1 pr-2.5 transition-colors',
            npcId === npc.id
              ? 'border-gold/40 bg-gold/8'
              : 'border-border/50 bg-card/40 hover:border-border/90 hover:bg-card/70',
          )}
        >
          <span
            className="grid size-6 place-items-center rounded-full text-[10px] font-semibold"
            style={{ background: `${npc.color}26`, color: npc.accent }}
          >
            {npc.name.slice(-1)}
          </span>
          <span className="flex flex-col items-start leading-none">
            <span className="text-[10px] font-medium text-foam/80">{npc.name}</span>
            <span className="mt-0.5 text-[7.5px] text-foam/30">{npc.role}</span>
          </span>
        </button>
      ))}
    </div>
  )
}

export function TownDialog() {
  const open = useGameStore((s) => s.townOpen)
  const tab = useGameStore((s) => s.townTab)
  const setTab = useGameStore((s) => s.setTownTab)
  const setOpen = useGameStore((s) => s.setTownOpen)
  const money = useGameStore((s) => s.money)
  const bag = useGameStore((s) => s.bag)
  const openMarket = useGameStore((s) => s.openMarket)

  return (
    <Dialog open={open} onOpenChange={(v) => !v && setOpen(false)}>
      <DialogContent
        showClose={false}
        className="flex h-[min(88dvh,760px)] w-[calc(100%-0.75rem)] max-w-5xl flex-col overflow-hidden border-border/70 bg-[#082024] p-0"
      >
        <div className="flex items-start justify-between gap-3 border-b border-border/60 px-3 py-2.5 sm:px-4">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-tide/12 text-tide">
              <Anchor className="size-4.5" />
            </span>
            <div className="min-w-0">
              <DialogTitle className="text-[15px] font-semibold tracking-wide text-foam">潮汐码头</DialogTitle>
              <DialogDescription className="mt-0.5 truncate text-[10px] text-muted-foreground">
                老周头、阿岚、小满、阿婆、阿澈、阿舟都在这儿
              </DialogDescription>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                setOpen(false)
                openMarket()
              }}
              className="flex h-8 items-center gap-1.5 rounded-full bg-gold/10 px-2.5 text-[10px] text-gold transition-colors hover:bg-gold/20"
            >
              <Package className="size-3.5" />
              卖鱼 {bag.length > 0 && <span className="tnum text-[9px] opacity-70">{bag.length}</span>}
            </button>
            <span className="tnum hidden rounded-full bg-foam/6 px-2.5 py-1 text-[11px] font-semibold text-gold sm:inline">
              ¥{money.toLocaleString('zh-CN')}
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="grid size-8 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-foam/8 hover:text-foam"
              aria-label="关闭码头"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        <div className="border-b border-border/40 px-2.5 pb-1.5 pt-2 sm:px-4">
          <NpcStrip />
        </div>

        <div className="flex gap-1 overflow-x-auto border-b border-border/40 px-2.5 py-1.5 sm:px-4">
          {TABS.map((t) => {
            const Icon = t.icon
            const active = t.id === tab
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={cn(
                  'inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] transition-colors',
                  active
                    ? 'bg-foam/12 font-medium text-foam'
                    : 'text-foam/45 hover:bg-foam/6 hover:text-foam/75',
                )}
              >
                <Icon className="size-3.5" />
                {t.label}
              </button>
            )
          })}
        </div>

        <div className="min-h-0 flex-1 overflow-hidden p-2.5 sm:p-3.5">
          <div className="h-full min-h-0">
            {tab === 'quests' && <QuestPanel />}
            {tab === 'farm' && <FarmPanel />}
            {tab === 'kitchen' && <KitchenPanel />}
            {tab === 'codex' && <CodexPanel />}
            {tab === 'cabin' && <CabinPanel />}
            {tab === 'shop' && <ShopPanel />}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
