import { AnimatePresence, motion } from 'motion/react'
import { Wind, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useGameStore } from '@/store/useGameStore'

/** 魔气压场：整块屏幕染紫，狂暴了再狠一档 */
function DemonVeil() {
  const pig = useGameStore((s) => s.pig)
  if (!pig) return null
  const rushing = pig.phase === 'rushing'
  const opacity = rushing ? 0.44 : pig.enraged ? 0.4 : 0.22
  return (
    <div
      className="pointer-events-none absolute inset-0 z-[62] transition-opacity duration-700"
      style={{
        opacity,
        background: pig.enraged
          ? 'radial-gradient(ellipse at 50% 44%,rgba(120,40,200,0.12) 0%,rgba(96,26,168,0.44) 58%,rgba(48,8,90,0.8) 100%)'
          : 'radial-gradient(ellipse at 50% 42%,rgba(70,24,120,0.08) 0%,rgba(72,22,128,0.3) 56%,rgba(30,4,58,0.66) 100%)',
      }}
    />
  )
}

/** 两记杀招的倒计时：冲撞看车道，震荡看起跳 */
function OmenMeter() {
  const pig = useGameStore((s) => s.pig)
  const underwater = useGameStore((s) => s.underwater)
  const depth = useGameStore((s) => s.depth)
  if (!pig || pig.phase === 'slain') return null

  const dived = underwater && depth > 1.6
  const soon = pig.charging || pig.chargeIn <= 2 || pig.stompIn <= 2
  const rushing = pig.phase === 'rushing'

  return (
    <div className="pointer-events-none absolute inset-x-0 top-[19.4rem] z-[70] flex flex-col items-center gap-1.5 px-4">
      <div
        className={cn(
          'flex items-center gap-2 rounded-full border px-3.5 py-1.5 backdrop-blur-sm transition-all duration-300',
          soon
            ? 'border-[#b06cff] bg-[#180428]/85 shadow-[0_0_26px_rgba(150,70,255,0.5)]'
            : 'border-[#b06cff]/35 bg-[#120322]/72',
        )}
      >
        <Wind
          className={cn(
            'size-4',
            pig.charging ? 'animate-pulse text-[#d9a6ff]' : 'text-[#c48aff]/70',
          )}
        />
        <span className="tnum text-[12px] font-semibold tracking-[0.12em] text-[#efdcff]">
          {rushing
            ? '胖猪大王正在狂奔过来'
            : pig.charging
              ? '野蛮冲撞 · 让开那条直线'
              : `下一记野蛮冲撞 ${Math.ceil(Math.max(0, pig.chargeIn))} 秒`}
        </span>
        <span className="tnum rounded-full bg-[#2a0f45] px-2 py-0.5 text-[10px] text-[#d6aaff]">
          {pig.stomping
            ? '震荡正在推开'
            : pig.stompIn <= 0
              ? '践踏蓄力'
              : `震荡 ${Math.ceil(pig.stompIn)} 秒`}
        </span>
        {pig.enraged && (
          <span className="rounded-full bg-[#3c0a52] px-2 py-0.5 text-[10px] text-[#ffb1f0]">
            狂暴 · 两招密一倍
          </span>
        )}
      </div>
      <span
        className={cn(
          'flex items-center gap-1 text-[11px]',
          soon && !dived ? 'text-[#e9c4ff]' : 'text-foam/35',
        )}
      >
        <Zap className="size-3" />
        {dived
          ? '已潜进浪底 · 震荡从头顶推开'
          : '魔气震荡落地前 · 空格起跳，或按 V 潜下去'}
      </span>
      <AnimatePresence>
        {pig.stomping && (
          <motion.span
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="rounded-full border border-[#b06cff]/45 bg-[#1b0530]/80 px-3 py-1 text-[10.5px] tracking-[0.1em] text-[#e3c9ff]"
          >
            紫色的环从他蹄下往外推 · 环到跟前那一瞬腾空就算躲开
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  )
}

export function PigOverlay() {
  return (
    <>
      <DemonVeil />
      <OmenMeter />
    </>
  )
}
