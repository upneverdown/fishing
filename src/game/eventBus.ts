import type { BoatSkinId } from '@/game/shop/catalog'

export interface GameEventMap {
  'boss:defeated': { id: string; name: string; ultimate: boolean }
  'underwater:enter': { at: number }
  'underwater:time': { seconds: number }
  'boat:sailed': { meters: number; skin: BoatSkinId }
  'catch:junk': { defId: string; speed: number }
  'chest:opened': { id: string; reward: string }
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
