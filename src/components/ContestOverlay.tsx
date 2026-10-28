import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Gem, Scroll, Sparkles, Swords, Trophy } from 'lucide-react'
import { FACTIONS } from '@/game/cultivation/factions'
import { gameEvents } from '@/game/eventBus'
import { useGameStore, type ContestHud } from '@/store/useGameStore'
import { cn } from '@/lib/utils'

function useCountdown(seconds: number, running: boolean) {
  const [left, setLeft] = useState(seconds)
  useEffect(() => {
    setLeft(seconds)
    if (!running) return
    const id = window.setInterval(() => setLeft((prev) => Math.max(0, prev - 1)), 1000)
    return () => window.clearInterval(id)
  }, [seconds, running])
  return left
}

function OpponentBar({ hud }: { hud: ContestHud }) {
  const def = FACTIONS[hud.faction]
  const ratio = hud.maxHp > 0 ? Math.max(0, Math.min(1, hud.hp / hud.maxHp)) : 0
  return (
    <div className="pointer-events-none absolute inset-x-0 top-20 z-[70] flex justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: -18 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -14 }}
        transition={{ type: 'spring', stiffness: 320, damping: 28 }}
        className="glass w-full max-w-[420px] rounded-2xl px-4 py-3 shadow-[0_18px_60px_-20px_rgba(0,0,0,0.9)]"
        style={{ borderColor: `${def.color}55` }}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <Swords className="size-4 shrink-0" style={{ color: def.color }} />
            <span className="truncate text-[13px] font-semibold text-foam">{hud.opponent}</span>
            <span
              className="shrink-0 rounded-full px-1.5 py-0.5 text-[9px]"
              style={{ background: def.soft, color: def.color }}
            >
              {def.name}
            </span>
          </div>
          <span className="tnum shrink-0 text-[11px] text-foam/45">
            {Math.ceil(hud.hp)} / {hud.maxHp}
          </span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-foam/10">
          <div
            className="h-full rounded-full transition-[width] duration-150 ease-out"
            style={{
              width: `${ratio * 100}%`,
              background: `linear-gradient(90deg, ${def.color}, ${def.accent})`,
              boxShadow: `0 0 14px ${def.glow}`,
            }}
          />
        </div>
        <div className="mt-1.5 flex items-center justify-between text-[9.5px] text-foam/35">
          <span>心魔镜像 · 境界与你相同</span>
          <span className="tnum">J 近身 · K 远射 · U 天雷 · O 御剑</span>
        </div>
      </motion.div>
    </div>
  )
}

function EnterCard({ hud }: { hud: ContestHud }) {
  const mine = useGameStore((s) => s.playerFaction)
  const def = FACTIONS[hud.faction]
  const own = mine ? FACTIONS[mine] : def
  return (
    <div className="pointer-events-none absolute inset-0 z-[86] flex flex-col items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.86 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 1.05 }}
        transition={{ type: 'spring', stiffness: 240, damping: 22 }}
        className="text-center"
      >
        <div className="text-[11px] tracking-[0.5em] text-foam/40">宗 门 大 比</div>
        <div
          className="mt-3 text-[34px] font-bold leading-tight tracking-[0.14em] sm:text-[46px]"
          style={{
            background: `linear-gradient(180deg, ${own.color}, ${def.color})`,
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            color: 'transparent',
            textShadow: '0 0 42px rgba(0,0,0,0.55)',
          }}
        >
          仙魔大比
          <br />
          胜者为王！
        </div>
        <div className="mt-4 flex items-center justify-center gap-3 text-[12px]">
          <span style={{ color: own.color }}>{own.name}</span>
          <span className="text-foam/25">对战</span>
          <span style={{ color: def.color }}>{hud.opponent}</span>
        </div>
      </motion.div>
    </div>
  )
}

function ResultCard({ hud }: { hud: ContestHud }) {
  const won = hud.phase === 'won'
  const def = FACTIONS[hud.faction]
  const leave = () => gameEvents.emit('contest:leave', { won })
  return (
    <div className="absolute inset-0 z-[86] flex items-center justify-center bg-abyss/72 px-4 backdrop-blur-sm">
      <motion.section
        initial={{ opacity: 0, y: 26, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 26 }}
        className="w-full max-w-sm overflow-hidden rounded-2xl border bg-[#08202a]/96 px-4 pb-4 pt-5 shadow-[0_30px_90px_-30px_rgba(0,0,0,0.95)]"
        style={{ borderColor: `${won ? '#f2c15c' : def.color}55` }}
      >
        <div className="flex items-center justify-center gap-2">
          {won ? (
            <Trophy className="size-5 text-gold" />
          ) : (
            <Sparkles className="size-5" style={{ color: def.color }} />
          )}
          <h2
            className="text-[19px] font-semibold tracking-[0.14em]"
            style={{ color: won ? '#f2c15c' : def.color }}
          >
            {won ? '力压心魔' : '败于己心'}
          </h2>
        </div>
        <p className="mt-2 text-center text-[11px] leading-relaxed text-foam/55">
          {won
            ? `${hud.opponent}化作一缕元气被你收进丹田。`
            : `${hud.opponent}的最后一击把你掀出光幕。`}
        </p>
        {hud.reward && (
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-gold/10 px-3 py-2 text-[11px] text-gold">
            {won ? <Gem className="size-3.5" /> : <Scroll className="size-3.5" />}
            <span className="flex-1">{hud.reward}</span>
          </div>
        )}
        <button
          type="button"
          onClick={leave}
          className={cn(
            'mt-4 w-full rounded-lg py-2 text-[12.5px] font-semibold tracking-[0.12em] transition-transform active:scale-[0.99]',
            won ? 'bg-gold/18 text-gold hover:bg-gold/26' : 'bg-foam/8 text-foam/75 hover:bg-foam/14',
          )}
        >
          {won ? '接过宝箱 · 走下擂台' : '离场养伤 · 改日再战'}
        </button>
      </motion.section>
    </div>
  )
}

export function ContestOverlay() {
  const contest = useGameStore((s) => s.contest)
  const fighting = contest?.phase === 'fighting'
  const seconds = contest?.seconds ?? 0
  const left = useCountdown(seconds, fighting)

  if (!contest) return null

  return (
    <>
      <AnimatePresence>
        {contest.phase === 'entering' && <EnterCard key="enter" hud={contest} />}
      </AnimatePresence>
      {fighting && (
        <>
          <OpponentBar hud={contest} />
          <div className="pointer-events-none absolute inset-x-0 top-6 z-[70] flex justify-center">
            <span className="tnum rounded-full bg-black/45 px-3 py-1 text-[12px] font-semibold tracking-[0.2em] text-foam/70">
              {String(Math.floor(left / 60)).padStart(2, '0')}:
              {String(left % 60).padStart(2, '0')}
            </span>
          </div>
        </>
      )}
      <AnimatePresence>
        {(contest.phase === 'won' || contest.phase === 'lost') && (
          <ResultCard key="result" hud={contest} />
        )}
      </AnimatePresence>
    </>
  )
}
