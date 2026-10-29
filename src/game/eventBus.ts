import type { MapZone, Rarity } from '@/types'
import type { BoatSkinId } from '@/game/shop/catalog'
import type { FactionId } from '@/game/cultivation/factions'
import type { TechniqueId } from '@/game/sect/techniques'

export interface GameEventMap {
  'boss:defeated': { id: string; name: string; ultimate: boolean }
  'underwater:enter': { at: number }
  'underwater:time': { seconds: number }
  'boat:sailed': { meters: number; skin: BoatSkinId }
  'catch:junk': { defId: string; speed: number }
  'chest:opened': { id: string; reward: string }
  'dragonboat:start': { at: number }
  'dragonboat:finish': { secondsLeft: number }
  'crew:catch': { crewName: string; fishName: string; coins: number }
  'boat:collide': { power: number }
  'boss:core': { kind: string; name: string; x: number; z: number }
  'cultivation:ready': { source: string }
  'celestial:summon': { kind: string; x: number; z: number }
  'zone:changed': { zone: MapZone }
  'ascension:gate': { at: number }
  'ascension:done': { to: MapZone }
  'faction:chosen': { faction: FactionId }
  'sect:tithe': { defId: string; rarity: Rarity; contribution: number }
  'sect:learn': { technique: TechniqueId; level: number }
  'thunderlure:strike': { x: number; z: number; radius: number; catches: number }
  'contest:win': { opponent: string }
  'contest:loss': { opponent: string }
  'contest:register': { faction: FactionId }
  'contest:leave': { won: boolean }
  'fish:blank': { blank: boolean; zone: MapZone }
  'driedfish:made': { count: number }
  'driedfish:eaten': { heal: number }
  'demon:answer': { value: string; timeout: boolean }
  'demon:dismiss': { won: boolean }
  'demon:win': { rounds: number }
  'demon:loss': Record<string, never>
}

type Handler<T> = (payload: T) => void
type AnyHandler = (payload: never) => void

class TypedEventBus {
  private handlers = new Map<keyof GameEventMap, Set<AnyHandler>>()

  on<K extends keyof GameEventMap>(event: K, handler: Handler<GameEventMap[K]>) {
    let set = this.handlers.get(event)
    if (!set) {
      set = new Set()
      this.handlers.set(event, set)
    }
    set.add(handler as unknown as AnyHandler)
    return () => {
      set.delete(handler as unknown as AnyHandler)
      if (set.size === 0) this.handlers.delete(event)
    }
  }

  emit<K extends keyof GameEventMap>(event: K, payload: GameEventMap[K]) {
    const set = this.handlers.get(event)
    if (!set) return
    for (const handler of [...set]) {
      ;(handler as unknown as Handler<GameEventMap[K]>)(payload)
    }
  }

  clear() {
    this.handlers.clear()
  }
}

export const gameEvents = new TypedEventBus()
