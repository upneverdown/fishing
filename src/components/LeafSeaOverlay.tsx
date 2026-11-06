import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Leaf, Sprout } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useGameStore } from '@/store/useGameStore'

/** 叶海的治愈氛围：四边柔和的绿色暗角，像被一片叶子轻轻包住 */
function LeafVignette() {
  const inside = useGameStore((s) => s.leafSea?.inside ?? false)
  return (
    <div
      className="pointer-events-none absolute inset-0 z-[61] transition-opacity duration-[1400ms]"
      style={{
        opacity: inside ? 1 : 0,
        background:
          'radial-gradient(ellipse at 50% 46%, rgba(40,150,96,0) 38%, rgba(30,130,82,0.16) 68%, rgba(8,62,38,0.5) 100%)',
        boxShadow: inside ? 'inset 0 0 190px 40px rgba(24,120,72,0.3)' : 'none',
      }}
    />
  )
}

/** 顶上那行仙气飘字：只在刚得祝福时浮出来 */
function BlessingVerse() {
  const grantedAt = useGameStore((s) => s.zizen?.grantedAt ?? 0)
  const [verseAt, setVerseAt] = useState(0)

  useEffect(() => {
    if (!grantedAt) {
      setVerseAt(0)
      return
    }
    setVerseAt(grantedAt)
    const timer = setTimeout(() => setVerseAt(0), 6800)
    return () => clearTimeout(timer)
  }, [grantedAt])

  return (
    <AnimatePresence>
      {verseAt > 0 && (
        <motion.div
          key={verseAt}
          initial={{ opacity: 0, y: -14, filter: 'blur(6px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          exit={{ opacity: 0, y: -10, filter: 'blur(6px)' }}
          transition={{ duration: 1.1, ease: 'easeOut' }}
          className="pointer-events-none absolute inset-x-0 top-[7.4rem] z-[72] flex flex-col items-center gap-1 px-6 text-center"
        >
          <span className="h-px w-24 bg-gradient-to-r from-transparent via-[#8dffc0]/60 to-transparent" />
          <p
            className="font-serif text-[15px] tracking-[0.32em] text-[#ddffe8] sm:text-[17px]"
            style={{ textShadow: '0 0 18px rgba(86,255,160,0.75), 0 0 42px rgba(46,190,120,0.45)' }}
          >
            涵川降灵，生生不息
          </p>
          <p
            className="font-serif text-[12px] tracking-[0.26em] text-[#a8ffca]/85 sm:text-[13px]"
            style={{ textShadow: '0 0 14px rgba(86,255,160,0.6)' }}
          >
            获得【自增】祝福
          </p>
          <span className="h-px w-24 bg-gradient-to-r from-transparent via-[#8dffc0]/40 to-transparent" />
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/** 叶海回春与【自增】层数的常驻小牌 */
function LeafStatus() {
  const inside = useGameStore((s) => s.leafSea?.inside ?? false)
  const zizen = useGameStore((s) => s.zizen)
  if (!inside && !zizen) return null

  const stacks = zizen?.stacks ?? 0
  const pct = Math.round(stacks * 1)

  return (
    <div className="pointer-events-none absolute inset-x-0 top-[3.7rem] z-[71] flex flex-col items-center gap-1.5 px-4">
      {inside && (
        <div className="flex items-center gap-1.5 rounded-full border border-[#6fe0a3]/35 bg-[#062b1c]/72 px-3 py-1 backdrop-blur-sm">
          <Leaf className="size-3.5 text-[#8dffc0]" />
          <span className="text-[10.5px] tracking-[0.12em] text-[#d6ffe4]">
            叶海 · 生命每息回春
          </span>
          <span className="tnum rounded-full bg-[#0f5a3a] px-1.5 py-0.5 text-[9.5px] text-[#9dffc4]">
            5%/秒
          </span>
        </div>
      )}
      {zizen && (
        <div
          className={cn(
            'flex flex-col items-center gap-1 rounded-2xl border px-3.5 py-1.5 backdrop-blur-sm',
            stacks >= (zizen.max ?? 20)
              ? 'border-[#b8ffcf] bg-[#063a23]/85 shadow-[0_0_26px_rgba(90,255,160,0.45)]'
              : 'border-[#6fe0a3]/40 bg-[#062b1c]/78',
          )}
        >
          <div className="flex items-center gap-2">
            <Sprout className="size-4 text-[#8dffc0]" />
            <span className="font-serif text-[12px] tracking-[0.18em] text-[#e9fff0]">
              自增
            </span>
            <span className="tnum text-[11px] font-semibold text-[#a8ffca]">
              {stacks}
              <span className="text-[9px] text-[#a8ffca]/55"> / {zizen.max ?? 20} 层</span>
            </span>
            <span className="tnum rounded-full bg-[#0f5a3a] px-1.5 py-0.5 text-[9.5px] text-[#9dffc4]">
              攻 · 防 · 速 +{pct}%
            </span>
          </div>
          <div className="h-[3px] w-40 overflow-hidden rounded-full bg-[#0b3a26]">
            {stacks >= (zizen.max ?? 20) ? (
              <div className="h-full w-full rounded-full bg-[#8dffc0]" />
            ) : (
              <motion.div
                key={stacks}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 5, ease: 'linear' }}
                className="h-full origin-left rounded-full bg-gradient-to-r from-[#3fd082] to-[#b6ffd2]"
              />
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export function LeafSeaOverlay() {
  return (
    <>
      <LeafVignette />
      <LeafStatus />
      <BlessingVerse />
    </>
  )
}
