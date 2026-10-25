import { useEffect, useState } from 'react'
import { useGameStore } from '@/store/useGameStore'

export function LightningOverlay() {
  const lightningAt = useGameStore((s) => s.lightningAt)
  const underwater = useGameStore((s) => s.underwater)
  const [flash, setFlash] = useState(0)

  useEffect(() => {
    if (!lightningAt) return
    setFlash(lightningAt)
    const timer = window.setTimeout(() => setFlash(0), 620)
    return () => window.clearTimeout(timer)
  }, [lightningAt])

  if (!flash || underwater) return null

  return (
    <div
      key={flash}
      className="lightning-flash pointer-events-none fixed inset-0 z-[66] bg-[radial-gradient(ellipse_at_50%_-10%,rgba(244,253,255,0.98),rgba(186,231,255,0.55)_36%,rgba(150,205,235,0.08)_68%,transparent_82%)]"
    />
  )
}
