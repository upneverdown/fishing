import { gameEvents } from '@/game/eventBus'
import { useGameStore } from '@/store/useGameStore'

const JUNK_SPEED = 2

/**
 * Achievements are advanced exclusively by EventBus messages. No per-frame
 * polling or achievement traversal happens in the game loop.
 */
export class AchievementManager {
  private offs: (() => void)[] = []

  constructor() {
    this.offs = [
      gameEvents.on('boss:defeated', (event) => {
        if (event.ultimate) this.advance('dragon_slayer', 1)
      }),
      gameEvents.on('underwater:time', ({ seconds }) => {
        this.advance('deep_fear', seconds)
      }),
      gameEvents.on('boat:sailed', ({ meters, skin }) => {
        if (skin === 'pirate') this.advance('pirate_veteran', meters)
      }),
      gameEvents.on('catch:junk', ({ speed }) => {
        if (speed >= JUNK_SPEED) this.advance('air_force_commander', 1)
      }),
      gameEvents.on('underwater:enter', () => {
        this.advance('first_dive', 1)
      }),
      gameEvents.on('chest:opened', () => {
        this.advance('treasure_hunter', 1)
      }),
      gameEvents.on('dragonboat:finish', () => {
        this.advance('dragon_boat', 1)
      }),
    ]
  }

  private advance(id: string, amount: number) {
    useGameStore.getState().advanceAchievement(id, amount)
  }

  dispose() {
    for (const off of this.offs) off()
    this.offs = []
  }
}
