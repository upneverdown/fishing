import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, Gift, Sparkles, X } from 'lucide-react'
<<<<<<< HEAD
import { motion } from 'motion/react'
import { useGameStore } from '@/store/useGameStore'
import { npcById, type DialogueAction, type DialogueCondition, type DialogueOption } from '@/game/town/npcs'
import { SEASONS } from '@/game/world/seasons'
=======
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { useGameStore } from '@/store/useGameStore'
import { npcById, type DialogueAction, type DialogueCondition, type DialogueOption } from '@/game/town/npcs'
import { SEASONS } from '@/game/world/seasons'
import { parseDishKey } from '@/game/cooking/recipes'
>>>>>>> d49125042e280aa62183c07294f8b20bed463f3a
import { cn } from '@/lib/utils'

function conditionOk(cond: DialogueCondition | undefined, state: ReturnType<typeof useGameStore.getState>) {
  if (!cond) return true
  if (cond.season && state.season !== cond.season) return false
  if (cond.minMoney !== undefined && state.money < cond.minMoney) return false
  if (cond.hasDish) {
    const has = Object.keys(state.pantry).some((k) => k.startsWith('dish:') && state.pantry[k] > 0)
    if (!has) return false
  }
  if (cond.petAffection !== undefined && state.pet.affection < cond.petAffection) return false
  return true
}

export function NpcDialog() {
  const npcId = useGameStore((s) => s.npcId)
  const closeNpc = useGameStore((s) => s.closeNpc)
  const setTownOpen = useGameStore((s) => s.setTownOpen)
  const setTownTab = useGameStore((s) => s.setTownTab)
  const openMarket = useGameStore((s) => s.openMarket)
<<<<<<< HEAD
  const setCrewOpen = useGameStore((s) => s.setCrewOpen)
=======
>>>>>>> d49125042e280aa62183c07294f8b20bed463f3a
  const npcGift = useGameStore((s) => s.npcGift)
  const season = useGameStore((s) => s.season)
  const npc = npcById(npcId)
  const [nodeId, setNodeId] = useState('root')
  const [shown, setShown] = useState('')
  const [giftNote, setGiftNote] = useState<string | null>(null)
  const node = npc?.nodes[nodeId] ?? npc?.nodes[npc.root]

  useEffect(() => {
    if (!npc) return
    setNodeId(npc.root)
    setGiftNote(null)
  }, [npcId, npc?.root, npc])

<<<<<<< HEAD
  useEffect(() => {
    if (!npc) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeNpc()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [npc, closeNpc])

=======
>>>>>>> d49125042e280aa62183c07294f8b20bed463f3a
  const text = node?.text ?? ''
  const full = !node || shown.length >= text.length

  useEffect(() => {
    if (!npc || !node) return
    setShown('')
    const id = window.setInterval(() => {
      setShown((prev) => {
        if (prev.length >= node.text.length) {
          window.clearInterval(id)
          return prev
        }
        return node.text.slice(0, prev.length + 1)
      })
    }, 22)
    return () => window.clearInterval(id)
  }, [nodeId, npc, node])

  const options = useMemo(() => {
    const state = useGameStore.getState()
    return (node?.options ?? []).filter((o) => conditionOk(o.condition, state))
  }, [node, npcId, season, giftNote])

  if (!npc) return null

  const run = (option: DialogueOption) => {
    const action: DialogueAction | undefined = option.action
    if (option.next) {
      setNodeId(option.next)
      return
    }
    if (!action) return
    if (action.type === 'close') {
      closeNpc()
      return
    }
    if (action.type === 'tab') {
      closeNpc()
      setTownOpen(true)
      setTownTab(action.tab)
      return
    }
    if (action.type === 'market') {
      closeNpc()
      setTownOpen(false)
      openMarket()
      return
    }
    if (action.type === 'gift') {
      const got = npcGift(npc.id)
      setGiftNote(got ? `收下了 ${got}` : '今天已经给过了，明天再来吧。')
      return
    }
    if (action.type === 'pet') {
      closeNpc()
      setTownOpen(true)
      setTownTab('cabin')
    }
<<<<<<< HEAD
    if (action.type === 'crew') {
      closeNpc()
      setCrewOpen(true)
    }
  }

  return (
    <div className="fixed inset-0 z-[71] flex flex-col justify-end">
      <button
        type="button"
        onClick={closeNpc}
        aria-label="结束对话"
        className="absolute inset-0 bg-gradient-to-t from-abyss/85 via-abyss/30 to-transparent"
      />
      <motion.section
        initial={{ y: 64, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 340, damping: 32 }}
        className="relative max-h-[76dvh] w-full overflow-y-auto border-t border-gold/30 bg-[#082123]/97 px-3 pb-[max(0.9rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-30px_90px_-30px_rgba(0,0,0,0.95)] backdrop-blur-xl sm:px-6"
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-50"
          style={{ background: `radial-gradient(ellipse at 12% 0%, ${npc.color}38, transparent 58%)` }}
        />
        <div className="relative mx-auto w-full max-w-3xl">
          <div className="flex items-start gap-3">
            <div
              className="relative grid size-12 shrink-0 place-items-center rounded-full text-[18px] font-semibold"
=======
  }

  return (
    <Dialog open={Boolean(npc)} onOpenChange={(v) => !v && closeNpc()}>
      <DialogContent
        showClose={false}
        className="w-[calc(100%-1.5rem)] max-w-lg overflow-hidden border-border/70 bg-[#0a2326] p-0"
      >
        <div className="relative overflow-hidden border-b border-border/50 px-4 pb-3 pt-4">
          <div
            className="pointer-events-none absolute inset-0 opacity-60"
            style={{ background: `radial-gradient(ellipse at 14% 0%, ${npc.color}38, transparent 62%)` }}
          />
          <div className="relative flex items-start gap-3">
            <div
              className="relative grid size-14 shrink-0 place-items-center rounded-full text-[20px] font-semibold"
>>>>>>> d49125042e280aa62183c07294f8b20bed463f3a
              style={{ background: `${npc.color}26`, color: npc.accent, border: `1px solid ${npc.color}55` }}
            >
              {npc.name.slice(-1)}
              <span
<<<<<<< HEAD
                className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-[#082123]"
=======
                className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-[#0a2326]"
>>>>>>> d49125042e280aa62183c07294f8b20bed463f3a
                style={{ background: npc.accent }}
              />
            </div>
            <div className="min-w-0 flex-1">
<<<<<<< HEAD
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-[15.5px] font-semibold tracking-wide text-foam">{npc.name}</h2>
=======
              <div className="flex items-center gap-2">
                <DialogTitle className="text-[16px] font-semibold tracking-wide text-foam">{npc.name}</DialogTitle>
>>>>>>> d49125042e280aa62183c07294f8b20bed463f3a
                <span
                  className="rounded-full px-1.5 py-0.5 text-[8.5px] font-medium"
                  style={{ background: `${npc.color}22`, color: npc.accent }}
                >
                  {npc.role}
                </span>
<<<<<<< HEAD
                <span className="flex items-center gap-1 text-[8.5px] text-foam/30">
                  <Sparkles className="size-2.5" />
                  {SEASONS[season].name}
                </span>
              </div>
              <p className="mt-0.5 truncate text-[9.5px] text-foam/40">{npc.tagline}</p>
=======
              </div>
              <DialogDescription className="mt-0.5 text-[9.5px] text-foam/40">{npc.tagline}</DialogDescription>
              <div className="mt-1 flex items-center gap-1 text-[9px] text-foam/30">
                <Sparkles className="size-2.5" />
                {SEASONS[season].name} · {npc.greetings[season]}
              </div>
>>>>>>> d49125042e280aa62183c07294f8b20bed463f3a
            </div>
            <button
              type="button"
              onClick={closeNpc}
<<<<<<< HEAD
              className="grid size-8 shrink-0 place-items-center rounded-full text-foam/40 transition-colors hover:bg-foam/8 hover:text-foam"
              aria-label="结束对话"
            >
              <X className="size-4" />
            </button>
          </div>

          <div className="mt-2.5 rounded-xl border border-border/40 bg-black/22 px-3 py-2.5">
            <button
              type="button"
              onClick={() => setShown(text)}
              className="min-h-[42px] w-full cursor-default text-left text-[12.5px] leading-[1.8] text-foam/85"
            >
              {shown}
              {!full && <span className="ml-0.5 inline-block h-3 w-1 animate-pulse bg-tide/70 align-middle" />}
            </button>
          </div>
=======
              className="grid size-7 shrink-0 place-items-center rounded-full text-foam/40 transition-colors hover:bg-foam/8 hover:text-foam"
              aria-label="结束对话"
            >
              <X className="size-3.5" />
            </button>
          </div>
        </div>

        <div className="px-4 py-3">
          <button
            type="button"
            onClick={() => setShown(text)}
            className="min-h-[64px] w-full cursor-default text-left text-[12px] leading-[1.75] text-foam/80"
          >
            {shown}
            {!full && <span className="ml-0.5 inline-block h-3 w-1 animate-pulse bg-tide/70 align-middle" />}
          </button>
>>>>>>> d49125042e280aa62183c07294f8b20bed463f3a

          {giftNote && (
            <div className="mt-2 flex items-center gap-1.5 rounded-md bg-gold/10 px-2.5 py-1.5 text-[10px] text-gold">
              <Gift className="size-3" />
              {giftNote}
            </div>
          )}

<<<<<<< HEAD
          <div className="mt-2.5 grid gap-1.5 sm:grid-cols-2">
=======
          <div className="mt-3 flex flex-col gap-1.5">
>>>>>>> d49125042e280aa62183c07294f8b20bed463f3a
            {full &&
              options.map((option, i) => (
                <button
                  key={`${option.label}-${i}`}
                  type="button"
                  onClick={() => run(option)}
                  className={cn(
<<<<<<< HEAD
                    'group flex items-center gap-2 rounded-lg border border-border/45 bg-card/50 px-3 py-2 text-left text-[11px] text-foam/80 transition-colors hover:border-tide/40 hover:bg-tide/8 hover:text-foam',
                  )}
                >
                  <ArrowRight className="size-3 shrink-0 text-tide/55 transition-transform group-hover:translate-x-0.5" />
=======
                    'group flex items-center gap-2 rounded-lg border border-border/45 bg-card/40 px-3 py-2 text-left text-[11px] text-foam/75 transition-colors hover:border-tide/40 hover:bg-tide/6 hover:text-foam',
                  )}
                >
                  <ArrowRight className="size-3 shrink-0 text-tide/50 transition-transform group-hover:translate-x-0.5" />
>>>>>>> d49125042e280aa62183c07294f8b20bed463f3a
                  <span className="flex-1">{option.label}</span>
                  {option.note && <span className="text-[8.5px] text-foam/25">{option.note}</span>}
                </button>
              ))}
            {!full && (
              <button
                type="button"
                onClick={() => setShown(text)}
<<<<<<< HEAD
                className="justify-self-end text-[9px] text-foam/30 hover:text-foam/60"
=======
                className="self-end text-[9px] text-foam/30 hover:text-foam/60"
>>>>>>> d49125042e280aa62183c07294f8b20bed463f3a
              >
                跳过 ›
              </button>
            )}
          </div>
<<<<<<< HEAD

          <div className="mt-2 text-center text-[8px] tracking-[0.16em] text-foam/20">
            点击空白处或按 ESC 结束对话
          </div>
        </div>
      </motion.section>
    </div>
=======
        </div>
      </DialogContent>
    </Dialog>
>>>>>>> d49125042e280aa62183c07294f8b20bed463f3a
  )
}
