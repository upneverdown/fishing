import { useEffect, useRef } from 'react'
import { Game } from '@/game/game'

export function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const game = new Game(canvas)
    game.start()
    ;(window as unknown as { __game: Game }).__game = game
    return () => {
      game.dispose()
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 h-full w-full touch-none outline-none"
    />
  )
}
