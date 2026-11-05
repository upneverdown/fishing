import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Megaphone, X, Zap } from 'lucide-react'
import type { Game } from '@/game/game'
import { cn } from '@/lib/utils'
import { useGameStore } from '@/store/useGameStore'

function liveGame() {
  return (window as unknown as { __game?: Game }).__game ?? null
}

/** 全服公告式的大字报：黄达鑫来了和被打下去了都走这里 */
function ServerNotice() {
  const notice = useGameStore((s) => s.notice)
  const dismiss = useGameStore((s) => s.dismissNotice)

  return (
    <div className="pointer-events-none absolute inset-x-0 top-[16%] z-[84] flex justify-center px-4">
      <AnimatePresence mode="popLayout">
        {notice && (
          <motion.div
            key={notice.id}
            initial={{ opacity: 0, y: -26, scale: 0.9, filter: 'blur(8px)' }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -18, scale: 0.96, filter: 'blur(6px)' }}
            transition={{ type: 'spring', stiffness: 260, damping: 24 }}
            className="pointer-events-auto relative w-full max-w-[440px] overflow-hidden rounded-2xl border border-[#ff5a4a]/55 bg-[#170406]/88 px-4 py-3 shadow-[0_20px_70px_-22px_rgba(180,20,10,0.8)] backdrop-blur-md"
          >
            <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_50%_0%,rgba(255,86,64,0.3),transparent_66%)]" />
            <div className="flex items-center gap-2">
              <Megaphone className="size-4 text-[#ff8a72]" />
              <span className="text-[12px] font-semibold uppercase tracking-[0.42em] text-[#ffb4a2]">
                {notice.title}
              </span>
              <button
                onClick={dismiss}
                className="ml-auto rounded p-1 text-foam/35 transition-colors hover:text-foam"
              >
                <X className="size-3.5" />
              </button>
            </div>
            <div className="mt-2 space-y-1">
              {notice.lines.map((line) => (
                <p
                  key={line}
                  className="text-[12.5px] leading-relaxed text-[#ffe3dc]"
                  style={{ textShadow: '0 0 16px rgba(255,90,74,0.45)' }}
                >
                  {line}
                </p>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/** 血雾滤镜：天劫压场时整块屏幕发红，狂暴了再狠一档 */
function BloodVeil() {
  const huang = useGameStore((s) => s.huang)
  if (!huang) return null
  const rising = huang.phase === 'rising'
  const opacity = rising ? 0.5 : huang.enraged ? 0.42 : 0.26
  return (
    <div
      className="pointer-events-none absolute inset-0 z-[64] transition-opacity duration-700"
      style={{
        opacity,
        background: huang.enraged
          ? 'radial-gradient(ellipse at 50% 42%,rgba(190,16,10,0.1) 0%,rgba(158,10,6,0.42) 58%,rgba(96,4,2,0.78) 100%)'
          : 'radial-gradient(ellipse at 50% 40%,rgba(120,10,6,0.08) 0%,rgba(122,10,8,0.3) 56%,rgba(72,4,4,0.66) 100%)',
      }}
    />
  )
}

/** 灭世雷暴的倒计时与生门提示 */
function DoomMeter() {
  const huang = useGameStore((s) => s.huang)
  const underwater = useGameStore((s) => s.underwater)
  const depth = useGameStore((s) => s.depth)
  if (!huang || huang.phase !== 'fight') return null

  const sheltered = underwater && depth > 7.2
  const soon = huang.warming || huang.doomIn <= 3

  return (
    <div className="pointer-events-none absolute inset-x-0 top-[21rem] z-[70] flex flex-col items-center gap-1.5 px-4 sm:top-[11.4rem]">
      <div
        className={cn(
          'flex items-center gap-2 rounded-full border px-3.5 py-1.5 backdrop-blur-sm transition-all duration-300',
          huang.warming
            ? 'border-[#ff5a4a] bg-[#2a0705]/85 shadow-[0_0_26px_rgba(255,70,50,0.5)]'
            : 'border-[#ff5a4a]/35 bg-[#1a0504]/72',
        )}
      >
        <Zap
          className={cn(
            'size-4',
            huang.warming ? 'animate-pulse text-[#ff7a62]' : 'text-[#ff9a82]/70',
          )}
        />
        <span className="tnum text-[12px] font-semibold tracking-[0.12em] text-[#ffd0c4]">
          {huang.warming ? '灭世雷暴落下' : `下一记灭世雷暴 ${Math.ceil(huang.doomIn)} 秒`}
        </span>
        {huang.safeZones > 0 && (
          <span className="tnum rounded-full bg-[#0d2a16] px-2 py-0.5 text-[10px] text-[#7dffb0]">
            生门 {huang.safeZones} 处
          </span>
        )}
        {huang.enraged && (
          <span className="rounded-full bg-[#3a0705] px-2 py-0.5 text-[10px] text-[#ffb1a0]">
            狂暴 · 雷电密一倍
          </span>
        )}
      </div>
      <span className={cn('text-[11px]', soon && !sheltered ? 'text-[#ffb9aa]' : 'text-foam/35')}>
        {sheltered
          ? '已贴住海底最深处 · 雷劈不到这里'
          : '躲进发光的绿色生门 · 或潜到七丈半以下的海底'}
      </span>
    </div>
  )
}

/** 屏幕右下角那个不像按钮的按钮：偶尔亮一下，其余时间和背景糊在一起 */
function EdgeSummon() {
  const huang = useGameStore((s) => s.huang)
  const boss = useGameStore((s) => s.boss)
  const started = useGameStore((s) => s.started)
  const dead = useGameStore((s) => s.dead)
  const [hover, setHover] = useState(false)
  const [blip, setBlip] = useState(false)

  useEffect(() => {
    const id = window.setInterval(() => {
      setBlip(true)
      window.setTimeout(() => setBlip(false), 1400)
    }, 6400)
    return () => window.clearInterval(id)
  }, [])

  if (!started || dead || huang || boss) return null
  const glowing = hover || blip

  return (
    <button
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={() => liveGame()?.summonHuang('屏幕角落的雷纹')}
      aria-label="召唤黄达鑫"
      className={cn(
        'absolute bottom-3 right-3 z-[74] flex size-8 items-center justify-center rounded-full transition-all duration-500',
        glowing
          ? 'border border-[#ff6a52]/70 bg-[#2a0705]/80 text-[#ff8f76] shadow-[0_0_18px_rgba(255,80,50,0.5)]'
          : 'border border-transparent text-[#ff8f76]/15',
      )}
    >
      <Zap className="size-3.5" />
    </button>
  )
}

export function HuangOverlay() {
  return (
    <>
      <BloodVeil />
      <DoomMeter />
      <ServerNotice />
      <EdgeSummon />
    </>
  )
}
