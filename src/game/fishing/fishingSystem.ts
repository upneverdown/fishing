import * as THREE from 'three'
import type { Boat } from '@/game/entities/boat'
import type { World } from '@/game/world/world'
import { Bobber } from './bobber'
import { RARITY_ORDER, createCatch, pickFish, type FishDef } from './fishTable'
import { createJunk } from './junkTable'
import { baitById } from './baitTable'
import { SEASONS } from '@/game/world/seasons'
import { input } from '@/game/input'
import { gameEvents } from '@/game/eventBus'
import { isModalOpen, useGameStore } from '@/store/useGameStore'
import { clamp, lerp, randRange } from '@/game/utils/math'
import { audio } from '@/game/audio/gameAudio'
import { gearValue } from '@/game/gear/gear'
import { waterAt } from '@/game/world/waters'
import { realmAt } from '@/game/cultivation/realms'
import { FISH_XP_BY_RARITY, fishingBlessing } from '@/game/sect/blessings'
import type { Catch, FishingPhase } from '@/types'

const MIN_CAST = 7
const MAX_CAST = 27
const BITE_WINDOW = 1.35
const CHARGE_TIME = 1.15
const LINE_POINTS = 6

function lineFromPoints(
  points: number,
): THREE.Line<THREE.BufferGeometry, THREE.LineBasicMaterial> {
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(points * 3), 3))
  const material = new THREE.LineBasicMaterial({
    color: '#f3e8cf',
    transparent: true,
    opacity: 0.55,
  })
  return new THREE.Line(geometry, material)
}

export class FishingSystem {
  phase: FishingPhase = 'idle'

  private bobber: Bobber
  private line: THREE.Line<THREE.BufferGeometry, THREE.LineBasicMaterial>
  private aimLine: THREE.Line<THREE.BufferGeometry, THREE.LineBasicMaterial>
  private aimRing: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>

  private power = 0
  private castT = 0
  private castDuration = 0.7
  private castFrom = new THREE.Vector3()
  private anchor = new THREE.Vector3()
  private waitTime = 0
  private biteTime = 0
  private def: FishDef | null = null
  private castSpeed = 0

  private progress = 0
  private tension = 0
  private pulling = false
  private pullDuration = 0
  private nextPull = 2
  private hudTimer = 0

  private landedCatch: Catch | null = null
  private landedAdded = false
  private landTimer = 0
  private cardShown = false
  private bobRipple = 0
  private twitchT = 0

  private jumpMesh: THREE.Group | null = null
  private jumpT = 0
  private jumpFrom = new THREE.Vector3()
  private jumpTo = new THREE.Vector3()

  private tipVec = new THREE.Vector3()
  private midVec = new THREE.Vector3()
  private tmpVec = new THREE.Vector3()
  private boatFwd = new THREE.Vector3()

  constructor(
    private scene: THREE.Scene,
    private boat: Boat,
    private world: World,
  ) {
    this.bobber = new Bobber(scene)
    this.line = lineFromPoints(LINE_POINTS)
    this.line.visible = false
    scene.add(this.line)

    this.aimLine = lineFromPoints(20)
    this.aimLine.material.color = new THREE.Color('#f2c15c')
    this.aimLine.material.opacity = 0.5
    this.aimLine.visible = false
    scene.add(this.aimLine)

    this.aimRing = new THREE.Mesh(
      new THREE.RingGeometry(0.52, 0.72, 30),
      new THREE.MeshBasicMaterial({
        color: '#f2c15c',
        transparent: true,
        opacity: 0.55,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    )
    this.aimRing.rotation.x = -Math.PI / 2
    this.aimRing.visible = false
    this.aimRing.renderOrder = 4
    scene.add(this.aimRing)
  }

  private setPhase(phase: FishingPhase) {
    this.phase = phase
    useGameStore.getState().setPhase(phase)
  }

  private pickAt(depth: number) {
    const store = useGameStore.getState()
    return pickFish(depth, {
      season: store.season,
      period: SEASONS[store.season].period,
      bait: store.baitId,
      baitWear: store.baitWear,
      zone: waterAt(this.anchor.x, this.anchor.z)?.id ?? null,
      map: store.mapZone,
      luck: fishingBlessing(store).rareBoost,
    })
  }

  /** 抛竿落点：仙诀与阵营都会改写竿梢够到的距离 */
  private castDistance() {
    const store = useGameStore.getState()
    const raw = (MIN_CAST + (MAX_CAST - MIN_CAST) * this.power) * fishingBlessing(store).castMul
    return Math.min(MAX_CAST * 1.7, raw)
  }

  update(dt: number, time: number) {
    const store = useGameStore.getState()
    if (store.underwater) return

    if (this.phase === 'landed') {
      this.updateLanded(dt)
      return
    }

    if (isModalOpen(store)) return

    switch (this.phase) {
      case 'idle': {
        this.bobber.setVisible(false)
        this.line.visible = false
        if (input.consumeAction()) this.beginCharge()
        break
      }
      case 'charging': {
        this.power = Math.min(1, this.power + dt / (CHARGE_TIME * fishingBlessing(store).chargeMul))
        store.setPower(this.power)
        this.updateAim(time)
        if (!input.actionDown) this.cast(time)
        break
      }
      case 'casting': {
        this.updateCast(dt, time)
        break
      }
      case 'waiting': {
        if (input.consumeAction()) {
          store.toast('收回鱼线')
          this.reset()
          break
        }
        this.twitchT = Math.max(0, this.twitchT - dt)
        this.floatBobber(time, 0.04 - this.twitchT * 0.32, 0.03 + this.twitchT * 0.5)
        this.bobRipple -= dt
        if (this.bobRipple <= 0) {
          this.bobRipple = 1.7 + Math.random() * 1.4
          this.world.foam.ripple(this.anchor.x, this.anchor.z, 0.55)
        }
        this.waitTime -= dt * (1 + this.twitchT * 0.8)
        if (this.waitTime <= 0) this.startBite()
        break
      }
      case 'bite': {
        this.biteTime -= dt
        this.floatBobber(time, -0.28, 0.06)
        if (input.consumeAction()) {
          this.startFight()
          break
        }
        if (this.biteTime <= 0) {
          store.setBite(false)
          store.toast('鱼吐钩跑了…', 'info')
          this.world.foam.splash(this.anchor.x, this.anchor.z, 5, 0.7)
          audio.splash(0.45)
          this.def = this.pickAt(this.world.depthAt(this.anchor.x, this.anchor.z))
          this.waitTime = randRange(1.6, 3.2)
          this.setPhase('waiting')
          this.line.visible = true
        }
        break
      }
      case 'fight': {
        this.updateFight(dt, time)
        break
      }
    }

    this.boat.rodLoad =
      this.phase === 'charging'
        ? -this.power * 0.5
        : this.phase === 'fight'
          ? (this.tension / 100) * 1.15
          : 0

    this.updateLine(time)
  }

  private beginCharge() {
    this.power = 0.08
    this.setPhase('charging')
    this.aimLine.visible = true
    this.aimRing.visible = true
    useGameStore.getState().setPower(this.power)
  }

  private updateAim(time: number) {
    const fwd = this.boat.getForward(this.boatFwd)
    const dist = this.castDistance()
    const tx = this.boat.position.x + fwd.x * dist
    const tz = this.boat.position.z + fwd.z * dist
    const targetY = this.world.waveHeight(tx, tz, time) + 0.08
    const tip = this.boat.getRodTip(this.tipVec)

    const attr = this.aimLine.geometry.getAttribute('position') as THREE.BufferAttribute
    const arc = 2.6 + this.power * 2.4
    for (let i = 0; i < 20; i++) {
      const t = i / 19
      attr.setXYZ(
        i,
        lerp(tip.x, tx, t),
        lerp(tip.y, targetY, t) + Math.sin(Math.PI * t) * arc,
        lerp(tip.z, tz, t),
      )
    }
    attr.needsUpdate = true

    const valid = this.world.depthAt(tx, tz) > 0.35
    this.aimRing.position.set(tx, targetY - 0.02, tz)
    this.aimRing.rotation.z = time * 0.8
    const pulse = 1 + Math.sin(time * 5) * 0.07
    this.aimRing.scale.setScalar(pulse)
    this.aimRing.material.color.set(valid ? '#f2c15c' : '#e2685a')
  }

  private cast(time: number) {
    this.castSpeed = Math.abs(this.boat.speed)
    const fwd = this.boat.getForward(this.boatFwd)
    const dist = this.castDistance()
    this.anchor.set(
      this.boat.position.x + fwd.x * dist,
      0,
      this.boat.position.z + fwd.z * dist,
    )
    this.castFrom.copy(this.boat.getRodTip(this.tipVec))
    this.castT = 0
    this.castDuration = 0.52 + dist * 0.013
    this.bobber.setVisible(true)
    this.bobber.setPosition(this.castFrom.x, this.castFrom.y, this.castFrom.z)
    this.aimLine.visible = false
    this.aimRing.visible = false
    this.line.visible = true
    useGameStore.getState().setPower(0)
    this.setPhase('casting')
  }

  private updateCast(dt: number, time: number) {
    this.castT += dt / this.castDuration
    const t = Math.min(1, this.castT)
    const targetY = this.world.waveHeight(this.anchor.x, this.anchor.z, time) + 0.06
    const x = lerp(this.castFrom.x, this.anchor.x, t)
    const z = lerp(this.castFrom.z, this.anchor.z, t)
    const y = lerp(this.castFrom.y, targetY, t) + Math.sin(Math.PI * t) * 3.5
    this.bobber.setPosition(x, y, z)
    if (t < 1) return

    const depth = this.world.depthAt(this.anchor.x, this.anchor.z)
    if (depth < 0.35) {
      useGameStore.getState().toast('抛到岸上了，换个方向试试', 'danger')
      this.world.foam.splash(this.anchor.x, this.anchor.z, 4, 0.6)
      this.reset()
      return
    }

    this.world.foam.splash(this.anchor.x, this.anchor.z, 12, 1.2)
    this.world.foam.ripple(this.anchor.x, this.anchor.z, 2.2)
    audio.splash(1.05)

    const store = useGameStore.getState()
    const bait = baitById(store.baitId)
    const freshness = 0.35 + (store.baitWear / 100) * 0.65
    const waitFactor = bait ? 1 + (bait.waitFactor - 1) * freshness : 1
    const hookSpeed = gearValue('hook', store.gear.hook)
    this.def = this.pickAt(depth)
    this.waitTime =
      ((randRange(2.1, 5.0) + RARITY_ORDER.indexOf(this.def.rarity) * 0.12) * waitFactor *
        fishingBlessing(store).waitMul) /
      hookSpeed
    this.bobber.setBait(bait?.color ?? '#c9755d')
    store.wearBait(100 / Math.max(14, (bait?.durability ?? 90) / 2.6))
    this.bobber.setPosition(this.anchor.x, targetY, this.anchor.z)
    this.setPhase('waiting')
  }

  twitch() {
    if (this.phase !== 'waiting') return
    this.twitchT = 0.7
    this.waitTime = Math.max(0.3, this.waitTime - randRange(0.6, 1.6))
    this.world.foam.ripple(this.anchor.x, this.anchor.z, 0.9)
    this.world.foam.splash(this.anchor.x, this.anchor.z, 2.4, 0.35)
    audio.splash(0.22)
  }

  private startBite() {
    const store = useGameStore.getState()
    store.setBite(true)
    this.biteTime = BITE_WINDOW
    this.setPhase('bite')
    this.world.foam.splash(this.anchor.x, this.anchor.z, 7, 0.8)
    this.world.foam.ripple(this.anchor.x, this.anchor.z, 1.5)
    audio.bite()
  }

  private startFight() {
    const store = useGameStore.getState()
    store.setBite(false)
    this.progress = 14
    this.tension = 6
    this.pulling = false
    this.pullDuration = 0
    this.nextPull = randRange(1.1, 1.8)
    this.hudTimer = 0
    this.setPhase('fight')
    store.setFight({ progress: this.progress, tension: this.tension, pulling: false })
  }

  private updateFight(dt: number, time: number) {
    const store = useGameStore.getState()
    const def = this.def
    if (!def) {
      this.reset()
      return
    }
    const difficulty = def.difficulty

    this.nextPull -= dt
    if (!this.pulling && this.nextPull <= 0) {
      this.pulling = true
      this.pullDuration = randRange(0.62, 1.02)
      this.world.foam.splash(this.bobber.group.position.x, this.bobber.group.position.z, 6, 1)
      this.world.foam.ripple(this.bobber.group.position.x, this.bobber.group.position.z, 1.2)
    }
    if (this.pulling) {
      this.pullDuration -= dt
      if (this.pullDuration <= 0) {
        this.pulling = false
        this.nextPull = randRange(1.2, 2.2) / Math.max(0.8, difficulty)
      }
    }

    const holding = input.actionDown
    if (holding) audio.reel(this.tension)
    const lineMult = gearValue('line', store.gear.line)
    const rodMult = gearValue('rod', store.gear.rod)
    const tensionRate = ((holding ? 25 : -62) + (this.pulling ? 58 : 0)) * lineMult
    this.tension = clamp(this.tension + tensionRate * difficulty * dt, 0, 100)

    let progressRate = (holding ? 26 : -5) * rodMult * (1 - this.tension * 0.0032)
    if (this.pulling) progressRate -= holding ? 7 : 9
    this.progress = clamp(this.progress + progressRate * dt, 0, 100)

    const fwd = this.boat.getForward(this.boatFwd)
    const t = 0.1 + (this.progress / 100) * 0.82
    const targetX = this.boat.position.x + fwd.x * 4.6
    const targetZ = this.boat.position.z + fwd.z * 4.6
    const jitter = this.pulling ? 0.5 : 0.12
    const bx = lerp(this.anchor.x, targetX, t) + (Math.random() - 0.5) * jitter
    const bz = lerp(this.anchor.z, targetZ, t) + (Math.random() - 0.5) * jitter
    const wave = this.world.waveHeight(bx, bz, time)
    this.bobber.setPosition(bx, wave + 0.02 - (this.pulling ? 0.3 : 0), bz)

    this.world.foam.wake(bx, bz, 0.6)
    this.world.foam.wake(targetX, targetZ, 1.2)

    this.hudTimer += dt
    if (this.hudTimer >= 0.05) {
      this.hudTimer = 0
      store.setFight({ progress: this.progress, tension: this.tension, pulling: this.pulling })
    }

    if (this.tension >= 100) {
      store.setFight(null)
      store.toast('线绷断了，鱼跑了！', 'danger')
      this.world.foam.splash(bx, bz, 14, 1.5)
      audio.snap()
      this.reset()
      return
    }

    if (this.progress >= 100) {
      this.land(time)
    }
  }

  /** 魔道掠夺：别人眼里的垃圾，于我皆是战利品 */
  private plunderJunk(
    store: ReturnType<typeof useGameStore.getState>,
    junk: Catch,
  ) {
    const roll = Math.random()
    if (roll < 0.5) {
      const coins = 12 + Math.round(Math.random() * 40)
      store.grantMoney(coins, `掠夺 ${junk.name} · 残铁换得`)
      return
    }
    if (roll < 0.8) {
      store.grantContribution(5, '掠夺所得上交魔宗 · 贡献 +5')
      return
    }
    store.addRelic('血煞残晶')
    store.toast(`垃圾里捏出一枚血煞残晶 · ${junk.name}`, 'gold')
  }

  private land(time: number) {
    const store = useGameStore.getState()
    const def = this.def
    if (!def) return

    const junkChance = this.castSpeed >= 2 ? 0.5 : 0.07
    const caught = Math.random() < junkChance ? createJunk() : createCatch(def)
    const blessing = fishingBlessing(store)
    if (caught.junk && blessing.junkLoot) this.plunderJunk(store, caught)
    const added = store.addCatch(caught)
    if (!caught.junk) this.grantBoon(def)
    if (!caught.junk && added && blessing.absorbMul > 0) {
      const xp = Math.round(FISH_XP_BY_RARITY[caught.rarity] * blessing.absorbMul)
      if (store.gainCultivation(xp, '吸星大法')) store.toast('修为圆满 · 可渡下一次天劫', 'gold')
    }
    store.setFight(null)
    store.setBite(false)
    store.setPhase('landed')

    this.landedCatch = caught
    this.landedAdded = added
    this.landTimer = 0.55
    this.cardShown = false
    this.phase = 'landed'

    this.progress = 100
    this.boat.rodLoad = 0
    this.world.foam.splash(this.anchor.x, this.anchor.z, 16, 1.6)
    this.world.foam.ripple(this.anchor.x, this.anchor.z, 2.8)
    audio.caught()
    this.spawnJump()

    this.bobber.setVisible(false)
    this.line.visible = false
    this.hideAim()

    if (!added) {
      store.toast('鱼篓满了，这条鱼只能放回水里', 'danger')
    } else if (!caught.junk) {
      store.toast(`上鱼！${caught.name} · ${caught.kg}kg`, 'gold')
    }
    if (caught.junk && added) {
      gameEvents.emit('catch:junk', { defId: caught.defId, speed: this.castSpeed })
    }
  }

  /** 天界渔获的即时馈赠：仙玉、灌顶修为，以及会引来雷暴的两种意外 */
  private grantBoon(def: FishDef) {
    if (def.map !== 'celestial') return
    const store = useGameStore.getState()
    if (def.jade) store.grantJade(def.jade, `${def.name}化作仙玉`)

    let xp = def.xp ?? 0
    if (def.boon === 'xpPercent') {
      const need = realmAt(store.realm).requiredXp
      xp = Number.isFinite(need) ? Math.round(need * 0.5) : 3000
    }
    if (xp && store.gainCultivation(xp, `${def.name}灌顶`)) {
      gameEvents.emit('cultivation:ready', { source: def.name })
    }

    if (def.boon === 'relic') {
      store.addRelic('玄武甲')
      store.toast('玄冰仙龟留下一片玄武甲 · 已收入行囊', 'gold')
    }
    if (def.boon === 'summonEel') {
      gameEvents.emit('celestial:summon', { kind: 'stormeel', x: this.anchor.x, z: this.anchor.z })
    }
  }

  private spawnJump() {
    const group = new THREE.Group()
    const body = new THREE.Mesh(
      new THREE.SphereGeometry(0.26, 12, 8),
      new THREE.MeshStandardMaterial({ color: '#cfd9d4', roughness: 0.4, metalness: 0.3, flatShading: true }),
    )
    body.scale.set(1.7, 0.95, 0.7)
    const tail = new THREE.Mesh(
      new THREE.ConeGeometry(0.2, 0.36, 4),
      new THREE.MeshStandardMaterial({ color: '#aebbb8', roughness: 0.6, flatShading: true }),
    )
    tail.rotation.z = Math.PI / 2
    tail.position.x = -0.48
    group.add(body, tail)
    group.position.set(this.anchor.x, 0.1, this.anchor.z)
    group.rotation.y = Math.random() * Math.PI * 2
    this.scene.add(group)

    this.jumpMesh = group
    this.jumpT = 0
    this.jumpFrom.set(this.anchor.x, 0.15, this.anchor.z)
    const fwd = this.boat.getForward(this.tmpVec)
    this.jumpTo.set(
      this.boat.position.x + fwd.x * 2.4,
      1.1,
      this.boat.position.z + fwd.z * 2.4,
    )
  }

  private updateJump(dt: number) {
    if (!this.jumpMesh) return
    this.jumpT += dt / 0.85
    const t = Math.min(1, this.jumpT)
    this.jumpMesh.position.x = lerp(this.jumpFrom.x, this.jumpTo.x, t)
    this.jumpMesh.position.z = lerp(this.jumpFrom.z, this.jumpTo.z, t)
    this.jumpMesh.position.y = lerp(this.jumpFrom.y, this.jumpTo.y, t) + Math.sin(Math.PI * t) * 2.3
    this.jumpMesh.rotation.z = -Math.sin(Math.PI * t) * 0.9
    this.jumpMesh.rotation.y += dt * 3
    if (t >= 1) {
      this.world.foam.ripple(this.jumpTo.x, this.jumpTo.z, 1.8)
      this.scene.remove(this.jumpMesh)
      this.jumpMesh = null
    }
  }

  private updateLanded(dt: number) {
    const store = useGameStore.getState()
    this.updateJump(dt)

    this.landTimer -= dt
    if (!this.cardShown && this.landTimer <= 0 && this.landedCatch) {
      this.cardShown = true
      store.showCard(this.landedCatch, this.landedAdded)
    }
    if (this.cardShown && !store.card) {
      this.reset()
    }
  }

  private floatBobber(time: number, dip: number, noise: number) {
    const bob = Math.sin(time * 3.1) * 0.025
    const wave = this.world.waveHeight(this.anchor.x, this.anchor.z, time)
    this.bobber.setPosition(
      this.anchor.x + (Math.random() - 0.5) * noise * 0.25,
      wave + 0.05 + bob + dip,
      this.anchor.z + (Math.random() - 0.5) * noise * 0.25,
    )
  }

  private updateLine(time: number) {
    const active =
      this.bobber.group.visible &&
      (this.phase === 'casting' || this.phase === 'waiting' || this.phase === 'bite' || this.phase === 'fight')
    this.line.visible = active
    if (!active) return

    const tip = this.boat.getRodTip(this.tipVec)
    const bob = this.bobber.group.position
    const mid = this.midVec.copy(tip).add(bob).multiplyScalar(0.5)
    const dist = tip.distanceTo(bob)
    const fighting = this.phase === 'fight'
    const load = fighting ? this.tension / 100 : 0

    let sag = 0.25 + Math.min(1, dist * 0.05)
    if (fighting) {
      sag = 0.55 - load * 0.48
      const jitter = this.pulling ? 0.14 : 0.03 + load * 0.04
      mid.x += (Math.random() - 0.5) * jitter
      mid.z += (Math.random() - 0.5) * jitter
    }
    mid.y -= sag
    this.line.material.opacity = 0.5 + load * 0.42

    const wobble = fighting ? (this.pulling ? 0.045 : 0.012) : 0
    const attr = this.line.geometry.getAttribute('position') as THREE.BufferAttribute
    for (let i = 0; i < LINE_POINTS; i++) {
      const t = i / (LINE_POINTS - 1)
      const inv = 1 - t
      const x = inv * inv * tip.x + 2 * inv * t * mid.x + t * t * bob.x
      const y =
        inv * inv * tip.y + 2 * inv * t * mid.y + t * t * bob.y +
        Math.sin(t * 9 + time * 26) * wobble * t
      const z = inv * inv * tip.z + 2 * inv * t * mid.z + t * t * bob.z
      attr.setXYZ(i, x, y, z)
    }
    attr.needsUpdate = true
  }

  private hideAim() {
    this.aimLine.visible = false
    this.aimRing.visible = false
  }

  reset() {
    const store = useGameStore.getState()
    // 空竿记录：线真正下过水、最后却没带东西回来
    if (this.phase === 'waiting' || this.phase === 'bite' || this.phase === 'fight' || this.phase === 'landed') {
      const blank = this.phase !== 'landed' && !this.landedCatch
      gameEvents.emit('fish:blank', { blank, zone: store.mapZone })
    }
    this.phase = 'idle'
    this.bobber.setVisible(false)
    this.line.visible = false
    this.hideAim()
    this.def = null
    this.landedCatch = null
    this.landedAdded = false
    this.cardShown = false
    this.progress = 0
    this.tension = 0
    this.pulling = false
    this.power = 0
    this.boat.rodLoad = 0
    if (this.jumpMesh) {
      this.scene.remove(this.jumpMesh)
      this.jumpMesh = null
    }
    store.setPhase('idle')
    store.setPower(0)
    store.setFight(null)
    store.setBite(false)
  }

  debugGrantFish() {
    const store = useGameStore.getState()
    const def = this.pickAt(5.5)
    const caught = createCatch(def)
    const added = store.addCatch(caught)
    this.landedCatch = caught
    this.landedAdded = added
    this.cardShown = true
    this.phase = 'landed'
    store.setPhase('landed')
    store.showCard(caught, added)
    this.bobber.setVisible(false)
    this.line.visible = false
  }
}
