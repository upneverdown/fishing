import { AnimatePresence, motion } from 'motion/react'
import { useGameStore } from '@/store/useGameStore'
import { SKILLS, realmAt } from '@/game/cultivation/realms'

const PHASE_TITLE = {
  gathering: '天劫将至',
  striking: '雷落沧海',
  burning: '浴火重生',
  ascended: '渡劫成功',
} as const

const PHASE_NOTE = {
  gathering: '四野无风 · 丹田内的修为开始翻涌',
  striking: '稳住道心，莫要被天雷劈散神魂',
  burning: '劫火焚尽凡胎，骨血里传出轰鸣',
  ascended: '',
} as const

export function TribulationOverlay() {
  const hud = useGameStore((s) => s.tribulation)
  const realm = useGameStore((s) => s.realm)
  if (!hud) return null

  const ascended = hud.phase === 'ascended'
  const unlocked = SKILLS.filter((skill) => skill.realmIndex === realm)
  const realmName = ascended ? realmAt(realm).name : hud.toName

  return (
    <div className="pointer-events-none absolute inset-0 z-[70] grid place-items-center overflow-hidden">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: ascended ? 0 : hud.phase === 'gathering' ? 0.5 : 0.82 }}
        transition={{ duration: 0.5 }}
        className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_18%,rgba(38,6,8,0.72)_78%,rgba(10,2,3,0.94)_100%)]"
      />
      {ascended && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.55 }}
          transition={{ duration: 0.4 }}
          className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,238,190,0.32),transparent_62%)]"
        />
      )}

      <AnimatePresence mode="wait">
        <motion.div
          key={hud.phase}
          initial={{ opacity: 0, y: 18, scale: 0.94 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -14, scale: 1.04 }}
          transition={{ type: 'spring', stiffness: 260, damping: 24 }}
          className="relative flex flex-col items-center px-6 text-center"
        >
          {!ascended && (
            <span className="text-[10px] uppercase tracking-[0.5em] text-[#ff9d8a]/80">
              {hud.fromName} · 圆满
            </span>
          )}
          <h2
            className={ascended ? 'mt-1 text-[26px] font-semibold tracking-[0.14em]' : 'mt-2 text-[24px] font-semibold tracking-[0.3em] text-[#ffe3d6]'}
            style={ascended ? { color: hud.color, textShadow: `0 0 28px ${hud.color}` } : undefined}
          >
            {PHASE_TITLE[hud.phase]}
          </h2>
          {PHASE_NOTE[hud.phase] && (
            <p className="mt-1.5 max-w-[24rem] text-[11.5px] leading-relaxed text-foam/65">
              {PHASE_NOTE[hud.phase]}
            </p>
          )}

          {hud.phase === 'striking' && (
            <div className="mt-3 flex items-center gap-1.5">
              {Array.from({ length: hud.totalBolts }, (_, i) => (
                <span
                  key={i}
                  className={
                    i < hud.bolt
                      ? 'size-2 rounded-full bg-[#ffe3d6] shadow-[0_0_12px_#ffb0a0]'
                      : 'size-2 rounded-full border border-[#ff9d8a]/45 bg-transparent'
                  }
                />
              ))}
              <span className="tnum ml-1 text-[10px] tracking-[0.2em] text-[#ff9d8a]/80">
                第 {hud.bolt} / {hud.totalBolts} 道天雷
              </span>
            </div>
          )}

          {ascended && (
            <>
              <p className="mt-2 text-[15px] tracking-wide text-foam">
                当前境界 · <span style={{ color: hud.color }}>{realmName}</span>
              </p>
              {unlocked.length > 0 && (
                <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5">
                  {unlocked.map((skill) => (
                    <span
                      key={skill.id}
                      className="flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px]"
                      style={{ borderColor: `${skill.color}66`, color: skill.color }}
                    >
                      <span className="rounded border border-current/35 px-1 text-[9.5px] font-bold">
                        {skill.key}
                      </span>
                      {skill.name}
                      <span className="text-[9px] text-foam/45">{skill.desc}</span>
                    </span>
                  ))}
                </div>
              )}
            </>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
