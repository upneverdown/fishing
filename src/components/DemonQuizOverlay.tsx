import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Brain, Delete, Eraser, Gem, Scroll, Sparkles, Swords } from 'lucide-react'
import { gameEvents } from '@/game/eventBus'
import { useGameStore, type DemonHud } from '@/store/useGameStore'
import { cn } from '@/lib/utils'

const DIGITS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0']
const LETTER_ROWS = [
  ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
  ['z', 'x', 'c', 'v', 'b', 'n', 'm'],
]
const SYMBOLS = ['+', '-', '*', '/', '=', '^', '(', ')', 'π', '²', 'ˣ']

const INK = '#b06cff'

function Key({
  label,
  onTap,
  tone = 'ink',
  wide,
}: {
  label: string
  onTap: (value: string) => void
  tone?: 'ink' | 'gold' | 'muted'
  wide?: boolean
}) {
  return (
    <button
      type="button"
      onClick={() => onTap(label)}
      className={cn(
        'rounded-md border py-1 text-[12px] font-semibold leading-none transition-transform active:scale-[0.94]',
        wide ? 'min-w-[52px] px-2' : 'min-w-[24px] px-1',
        tone === 'gold' && 'border-gold/40 bg-gold/14 text-gold hover:bg-gold/24',
        tone === 'muted' && 'border-foam/12 bg-foam/6 text-foam/55 hover:bg-foam/14',
        tone === 'ink' && 'border-[#b06cff]/28 bg-[#1a0f26]/80 text-[#e6d2ff] hover:bg-[#2b1740]',
      )}
    >
      {label}
    </button>
  )
}

function DemonBar({ hud }: { hud: DemonHud }) {
  const ratio = hud.maxHp > 0 ? Math.max(0, Math.min(1, hud.hp / hud.maxHp)) : 0
  return (
    <div className="pointer-events-none absolute inset-x-0 top-16 z-[70] flex justify-center px-4">
      <div
        className="glass w-full max-w-[430px] rounded-2xl px-4 py-2.5"
        style={{ borderColor: `${INK}55` }}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <Brain className="size-4 shrink-0" style={{ color: INK }} />
            <span className="truncate text-[13px] font-semibold text-foam">{hud.bossName}</span>
            <span className="shrink-0 rounded-full bg-[#b06cff]/16 px-1.5 py-0.5 text-[9px] text-[#dcc4ff]">
              物理攻击无效
            </span>
          </div>
          <span className="tnum shrink-0 text-[11px] text-foam/45">
            {Math.ceil(hud.hp)} / {hud.maxHp}
          </span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-foam/10">
          <div
            className="h-full rounded-full transition-[width] duration-200 ease-out"
            style={{
              width: `${ratio * 100}%`,
              background: `linear-gradient(90deg, ${INK}, #6a2ea0)`,
              boxShadow: `0 0 16px ${INK}88`,
            }}
          />
        </div>
        <div className="mt-1.5 flex items-center gap-1.5">
          {Array.from({ length: 4 }, (_, i) => (
            <span
              key={i}
              className={cn(
                'size-1.5 rounded-full',
                ratio <= 1 - i * 0.3 ? 'bg-[#e6d2ff]' : 'bg-foam/15',
              )}
            />
          ))}
          <span className="ml-auto text-[9.5px] text-foam/35">每答对一题掉三成药力</span>
        </div>
      </div>
    </div>
  )
}

function IntroCard() {
  return (
    <div className="pointer-events-none absolute inset-0 z-[86] flex flex-col items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 1, 0.35, 1, 0.7, 1] }}
        transition={{ duration: 2.1, times: [0, 0.18, 0.36, 0.58, 0.78, 1] }}
        className="text-center"
      >
        <div className="text-[11px] tracking-[0.55em] text-[#c8a6ff]/60">心 魔 空 间</div>
        <div
          className="mt-3 text-[32px] font-bold leading-tight tracking-[0.16em] sm:text-[44px]"
          style={{
            background: 'linear-gradient(180deg, #f0e2ff, #8f4fd8)',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            color: 'transparent',
            textShadow: '0 0 40px rgba(0,0,0,0.6)',
          }}
        >
          笔迹压过海面
        </div>
        <p className="mt-3 text-[11.5px] leading-relaxed text-foam/50">
          刀剑在这里没有分量 · 只有算式能伤它
        </p>
      </motion.div>
    </div>
  )
}

function ResultCard({ hud }: { hud: DemonHud }) {
  const won = hud.phase === 'win'
  const leave = () => gameEvents.emit('demon:dismiss', { won })
  return (
    <div className="absolute inset-0 z-[86] flex items-center justify-center bg-abyss/74 px-4 backdrop-blur-sm">
      <motion.section
        initial={{ opacity: 0, y: 24, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 26 }}
        className="w-full max-w-sm rounded-2xl border bg-[#150c1e]/96 px-4 pb-4 pt-5 shadow-[0_30px_90px_-30px_rgba(0,0,0,0.95)]"
        style={{ borderColor: `${won ? '#f2c15c' : INK}55` }}
      >
        <div className="flex items-center justify-center gap-2">
          {won ? (
            <Gem className="size-5 text-gold" />
          ) : (
            <Scroll className="size-5" style={{ color: INK }} />
          )}
          <h2
            className="text-[19px] font-semibold tracking-[0.14em]"
            style={{ color: won ? '#f2c15c' : INK }}
          >
            {won ? '心魔散了' : '算不过它'}
          </h2>
        </div>
        <p className="mt-2 text-center text-[11px] leading-relaxed text-foam/55">
          {won
            ? '涂鸦小鬼被最后一道算式抹平，墨色缩成一枚内丹。'
            : '墨点糊住了题面，心魔在身后笑出了声。'}
        </p>
        {hud.reward && (
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-gold/10 px-3 py-2 text-[11px] text-gold">
            {won ? <Sparkles className="size-3.5" /> : <Swords className="size-3.5" />}
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
          {won ? '拾起内丹 · 回到海面' : '退出心魔空间'}
        </button>
      </motion.section>
    </div>
  )
}

const TYPABLE = /^[0-9a-zA-Z+\-*/=^()π²ˣ偶奇增减极值点·×］|（）]$/

export function DemonQuizOverlay() {
  const hud = useGameStore((s) => s.demon)
  const hp = useGameStore((s) => s.hp)
  const [typed, setTyped] = useState('')
  const [flash, setFlash] = useState<'none' | 'good' | 'bad'>('none')

  const quiz = hud?.quiz ?? null
  const round = hud?.round ?? 0
  const phase = hud?.phase ?? 'intro'
  const extraKeys = useMemo(() => quiz?.extraKeys ?? [], [quiz])

  // 只跟着题号走：倒计时每 0.2 秒刷一次 HUD，不能顺手把玩家敲的字清空
  useEffect(() => {
    setTyped('')
    const current = useGameStore.getState().demon
    if (!current || current.phase !== 'quiz') {
      setFlash('none')
      return
    }
    setFlash(round > 1 ? (current.lastCorrect ? 'good' : 'bad') : 'none')
    const id = window.setTimeout(() => setFlash('none'), 620)
    return () => window.clearTimeout(id)
  }, [round])

  const submit = (value: string) => {
    const current = useGameStore.getState().demon
    if (!current || current.phase !== 'quiz' || !current.quiz) return
    const trimmed = value.trim()
    if (!trimmed) return
    gameEvents.emit('demon:answer', { value: trimmed, timeout: false })
  }

  const append = (value: string) => setTyped((prev) => (prev.length >= 12 ? prev : prev + value))

  // 桌面端直接敲键盘作答
  useEffect(() => {
    if (phase !== 'quiz') return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Enter') {
        submit(typed)
        return
      }
      if (event.key === 'Backspace') {
        setTyped((prev) => prev.slice(0, -1))
        return
      }
      if (event.key === 'Escape') {
        gameEvents.emit('demon:dismiss', { won: false })
        return
      }
      if (event.key.length === 1 && TYPABLE.test(event.key)) append(event.key)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [phase, typed])

  if (!hud) return null

  const seconds = Math.max(0, Math.ceil(hud.seconds))
  const urgent = seconds <= 5

  return (
    <>
      <div className="pointer-events-none absolute inset-0 z-[84]">
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse at center, rgba(6,2,12,0.08) 0%, rgba(6,2,12,0.58) 58%, rgba(4,1,9,0.92) 100%)',
          }}
        />
        <AnimatePresence>
          {flash !== 'none' && (
            <motion.div
              key={`${flash}-${round}`}
              initial={{ opacity: 0.85 }}
              animate={{ opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6 }}
              className="absolute inset-0"
              style={{
                background:
                  flash === 'good'
                    ? 'radial-gradient(circle at 50% 62%, rgba(242,193,92,0.5), rgba(242,193,92,0) 62%)'
                    : 'radial-gradient(circle at 50% 62%, rgba(176,108,255,0.45), rgba(176,108,255,0) 62%)',
              }}
            />
          )}
        </AnimatePresence>
      </div>

      <div className="absolute inset-x-0 bottom-0 z-[85] flex justify-center px-3 pb-3 sm:pb-5">
        <AnimatePresence mode="wait">
          {hud.phase === 'intro' && <IntroCard key="intro" />}
          {(hud.phase === 'win' || hud.phase === 'lose') && <ResultCard key="result" hud={hud} />}
          {hud.phase === 'quiz' && quiz && (
            <motion.div
              key={`quiz-${round}`}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ type: 'spring', stiffness: 320, damping: 28 }}
              className="w-full max-w-[430px] rounded-2xl border px-3.5 pb-3 pt-2.5 shadow-[0_26px_80px_-26px_rgba(0,0,0,0.95)]"
              style={{
                borderColor: urgent ? 'rgba(226,104,90,0.55)' : `${INK}55`,
                background: 'rgba(14,7,20,0.93)',
              }}
            >
              <div className="flex items-center justify-between text-[10px] tracking-[0.2em] text-[#c8a6ff]/55">
                <span>第 {hud.round} 问 · {quiz.tag}</span>
                <span
                  className={cn(
                    'tnum rounded-full px-2 py-0.5 text-[12px] font-bold',
                    urgent ? 'bg-destructive/18 text-destructive' : 'bg-[#b06cff]/14 text-[#dcc4ff]',
                  )}
                >
                  {seconds}s
                </span>
              </div>

              <div className="mt-1.5 text-center">
                <div
                  className="text-[19px] font-bold leading-snug tracking-[0.02em] text-[#f0e2ff] sm:text-[21px]"
                  style={{ textShadow: `0 0 26px ${INK}66` }}
                >
                  {quiz.formula}
                </div>
                <div className="mt-0.5 text-[10.5px] text-foam/55">
                  {quiz.question} · <span className="italic text-[#c8a6ff]/45">心魔低语：{quiz.hint}</span>
                </div>
              </div>

              <div className="mt-2 flex h-9 items-center justify-between gap-2 rounded-xl border border-foam/12 bg-black/35 px-3">
                <span className="tnum flex-1 truncate text-[16px] text-foam">
                  {typed || <span className="text-foam/25">作答处</span>}
                </span>
                <span className="text-[10px] text-foam/30">
                  生命 {Math.max(0, Math.round(hp))}
                </span>
              </div>

              <div className="mt-2 flex flex-wrap justify-center gap-1">
                {DIGITS.map((k) => (
                  <Key key={k} label={k} onTap={append} />
                ))}
              </div>
              <div className="mt-1 flex flex-col items-center gap-1">
                {LETTER_ROWS.map((row) => (
                  <div key={row.join('')} className="flex flex-wrap justify-center gap-1">
                    {row.map((k) => (
                      <Key
                        key={k}
                        label={k}
                        onTap={append}
                      />
                    ))}
                  </div>
                ))}
              </div>
              <div className="mt-1 flex flex-wrap justify-center gap-1">
                {SYMBOLS.map((k) => (
                  <Key
                    key={k}
                    label={k}
                    tone="muted"
                    onTap={append}
                  />
                ))}
              </div>
              {extraKeys.length > 0 && (
                <div className="mt-1 flex flex-wrap justify-center gap-1">
                  {extraKeys.map((k) => (
                    <Key
                      key={k}
                      label={k}
                      tone="gold"
                      wide
                      onTap={append}
                    />
                  ))}
                </div>
              )}

              <div className="mt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setTyped((p) => p.slice(0, -1))}
                  className="flex items-center gap-1 rounded-lg border border-foam/12 bg-foam/6 px-2.5 py-1.5 text-[11px] text-foam/65 hover:bg-foam/12"
                >
                  <Delete className="size-3.5" />
                  退格
                </button>
                <button
                  type="button"
                  onClick={() => setTyped('')}
                  className="flex items-center gap-1 rounded-lg border border-foam/12 bg-foam/6 px-2.5 py-1.5 text-[11px] text-foam/65 hover:bg-foam/12"
                >
                  <Eraser className="size-3.5" />
                  清空
                </button>
                <button
                  type="button"
                  onClick={() => submit(typed)}
                  className="flex-1 rounded-lg bg-[#b06cff]/22 py-1.5 text-[12.5px] font-semibold tracking-[0.1em] text-[#efdcff] transition-transform active:scale-[0.99] hover:bg-[#b06cff]/32"
                >
                  落笔作答
                </button>
                <button
                  type="button"
                  onClick={() => gameEvents.emit('demon:dismiss', { won: false })}
                  className="rounded-lg border border-foam/12 px-2.5 py-1.5 text-[11px] text-foam/45 hover:bg-foam/10"
                >
                  逃跑
                </button>
              </div>
              <div className="mt-1.5 text-center text-[9.5px] text-foam/28">
                键盘也可直接输入 · Enter 落笔 · Esc 退出心魔空间
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {hud.phase === 'quiz' && <DemonBar hud={hud} />}
    </>
  )
}
