import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Sparkles, Target, Trophy } from 'lucide-react'
import { useGameStore } from '@/store/useGameStore'

/** 球场比分：只要靠近或站在场上就挂一块小牌 */
function PitchScore() {
  const pitch = useGameStore((s) => s.pitch)
  const visible = Boolean(pitch && (pitch.near || pitch.onFoot))

  return (
    <AnimatePresence>
      {visible && pitch && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.35 }}
          className="pointer-events-none absolute inset-x-0 top-[9.2rem] z-[73] flex flex-col items-center gap-1.5 px-4"
        >
          <div className="flex items-center gap-2 rounded-full border border-[#9dffc4]/35 bg-[#06301f]/78 px-3.5 py-1.5 backdrop-blur-sm shadow-[0_0_24px_rgba(90,255,160,0.18)]">
            <Target className="size-3.5 text-[#8dffc0]" />
            <span className="font-serif text-[11.5px] tracking-[0.16em] text-[#e9fff0]">
              仙庭球场
            </span>
            <span className="tnum flex items-center gap-1 rounded-full bg-[#0f5a3a] px-2 py-0.5 text-[10px] font-semibold text-[#9dffc4]">
              <Trophy className="size-3" /> {pitch.score}
            </span>
            <span className="text-[10px] tracking-[0.1em] text-[#a8ffca]/75">
              {pitch.onFoot ? 'F 回船' : 'F 下船踢球'}
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/** 进球：屏幕中间炸出一行金字 */
function GoalBanner() {
  const goalAt = useGameStore((s) => s.pitch?.goalAt ?? 0)
  const [show, setShow] = useState(0)

  useEffect(() => {
    if (!goalAt) return
    setShow(goalAt)
    const timer = setTimeout(() => setShow(0), 2800)
    return () => clearTimeout(timer)
  }, [goalAt])

  return (
    <AnimatePresence>
      {show > 0 && (
        <motion.div
          key={show}
          initial={{ opacity: 0, scale: 0.6, filter: 'blur(8px)' }}
          animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
          exit={{ opacity: 0, scale: 1.12, filter: 'blur(6px)' }}
          transition={{ type: 'spring', stiffness: 220, damping: 18 }}
          className="pointer-events-none absolute inset-x-0 top-[32%] z-[78] flex flex-col items-center gap-2"
        >
          <span className="h-px w-32 bg-gradient-to-r from-transparent via-[#ffe9a8]/70 to-transparent" />
          <p
            className="font-serif text-[40px] leading-none tracking-[0.2em] text-[#fff6d6] sm:text-[54px]"
            style={{ textShadow: '0 0 22px rgba(255,220,120,0.9), 0 0 64px rgba(255,180,60,0.6)' }}
          >
            进球！
          </p>
          <p
            className="flex items-center gap-1.5 text-[12px] tracking-[0.18em] text-[#b8ffd4]"
            style={{ textShadow: '0 0 14px rgba(86,255,160,0.65)' }}
          >
            <Sparkles className="size-3.5" />
            自增 +3 层 · 金币 +1200
          </p>
          <span className="h-px w-32 bg-gradient-to-r from-transparent via-[#ffe9a8]/45 to-transparent" />
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/** 胖猪彩蛋：横冲直撞时的红色警告 */
function CameoBanner() {
  const cameoAt = useGameStore((s) => s.pitch?.cameoAt ?? 0)
  const [show, setShow] = useState(0)

  useEffect(() => {
    if (!cameoAt) return
    setShow(cameoAt)
    const timer = setTimeout(() => setShow(0), 3200)
    return () => clearTimeout(timer)
  }, [cameoAt])

  return (
    <AnimatePresence>
      {show > 0 && (
        <motion.div
          key={show}
          initial={{ opacity: 0, x: -40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 40 }}
          transition={{ type: 'spring', stiffness: 260, damping: 22 }}
          className="pointer-events-none absolute inset-x-0 top-[22%] z-[77] flex justify-center px-6"
        >
          <div className="flex items-center gap-2 rounded-full border border-[#ff9a7a]/45 bg-[#3a1008]/85 px-4 py-1.5 shadow-[0_0_30px_rgba(255,120,80,0.35)] backdrop-blur-sm">
            <span className="size-2 animate-pulse rounded-full bg-[#ff6a4a]" />
            <span
              className="font-serif text-[13px] tracking-[0.16em] text-[#ffd7c6]"
              style={{ textShadow: '0 0 12px rgba(255,110,70,0.75)' }}
            >
              胖猪大王冲进场内 · 躲开！
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export function SkyPitchOverlay() {
  return (
    <>
      <PitchScore />
      <GoalBanner />
      <CameoBanner />
    </>
  )
}
