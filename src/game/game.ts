import * as THREE from 'three'
import { World } from '@/game/world/world'
import { Boat } from '@/game/entities/boat'
import { Otter } from '@/game/entities/otter'
import { FishingSystem } from '@/game/fishing/fishingSystem'
import { FloatingLeaves } from '@/game/fx/leaves'
import { SeasonFx } from '@/game/fx/seasonFx'
import { UnderwaterWorld } from '@/game/underwater/underwaterWorld'
import { UnderwaterPost } from '@/game/render/underwaterPost'
import { input } from '@/game/input'
import { BAG_CAPACITY, isModalOpen, useGameStore } from '@/store/useGameStore'
import {
  CAPTURE_TOOLS,
  toolById,
  toolCaptureChance,
  toolStats,
  trapOutcome,
} from '@/game/capture/tools'
import { dayKey } from '@/game/economy/market'
import { audio } from '@/game/audio/gameAudio'
import {
  DOCK_POINT,
  MAX_WATER_DEPTH,
  SELL_RADIUS,
  WORLD_HALF,
  zoneAt,
} from '@/game/world/worldMap'
import { SEASONS } from '@/game/world/seasons'
import { fishById, createCatch, type FishDef } from '@/game/fishing/fishTable'
import { clamp } from '@/game/utils/math'
import type { SeasonId, UnderwaterMode } from '@/types'

export class Game {
  readonly renderer: THREE.WebGLRenderer
  readonly scene = new THREE.Scene()
  readonly camera: THREE.PerspectiveCamera
  readonly world: World
  readonly boat: Boat
  readonly otter: Otter
  readonly fishing: FishingSystem
  readonly leaves: FloatingLeaves
  readonly seasonFx: SeasonFx
  readonly underwaterWorld: UnderwaterWorld
  readonly post: UnderwaterPost

  private raf = 0
  private disposed = false
  private lastTime = 0
  private elapsed = 0
  private wakeTimer = 0
  private rippleTimer = 0
  private statusTimer = 0
  private hudTimer = 0

  private camPos = new THREE.Vector3()
  private camLook = new THREE.Vector3()
  private desired = new THREE.Vector3()
  private lookTarget = new THREE.Vector3()
  private forward = new THREE.Vector3()
  private back = new THREE.Vector3()
  private right = new THREE.Vector3()
  private stern = new THREE.Vector3()
  private viewDir = new THREE.Vector3()

  private swimPos = new THREE.Vector3()
  private swimYaw = 0
  private swimPitch = 0
  private followYaw = 0
  private followPitch = 0.05
  private orbitAngle = 0
  private orbitPitch = 0
  private oxygenValue = 100
  private underwaterTarget = new THREE.Vector3()
  private underwaterLook = new THREE.Vector3()
  private raycaster = new THREE.Raycaster()
  private pointerNdc = new THREE.Vector2()
  private centerNdc = new THREE.Vector2()
  private aimVec = new THREE.Vector3()
  private aimTo = new THREE.Vector3()
  private captureFish: { group: THREE.Group; def: FishDef; distance: number } | null = null
  private captureCooldown = 0
  private trapMeshes = new Map<string, THREE.Group>()
  private trapClock = 0
  private sunWorld = new THREE.Vector3()
  private sunUv = new THREE.Vector2(0.5, 0.9)
  private bufferSize = new THREE.Vector2()

  private lastPrompt: string | null = null
  private lastNearDock = false
  private lastZone = ''
  private appliedBoat = ''
  private appliedRod = ''
  private appliedDecorations = ''
  private appliedSeason: SeasonId | '' = ''
  private lastUnderwater = false

  constructor(private canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
    })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFShadowMap
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.08

    this.camera = new THREE.PerspectiveCamera(48, 1, 0.1, 500)

    this.world = new World(this.scene)
    this.boat = new Boat(this.scene)
    this.otter = new Otter(this.scene)
    this.fishing = new FishingSystem(this.scene, this.boat, this.world)
    this.leaves = new FloatingLeaves(this.scene, this.world)
    this.seasonFx = new SeasonFx(this.scene)
    this.underwaterWorld = new UnderwaterWorld(this.scene, this.world)
    this.post = new UnderwaterPost()

    useGameStore.setState({
      phase: 'idle',
      power: 0,
      fight: null,
      bite: false,
      prompt: null,
      card: null,
      cardAdded: false,
      marketOpen: false,
      bagOpen: false,
      shopOpen: false,
      baitOpen: false,
      seasonOpen: false,
      underwater: false,
      oxygen: 100,
      depth: 0,
      observedFish: null,
    })

    input.attach(canvas)
    input.setLookEnabled(false)
    this.handleResize()
    window.addEventListener('resize', this.handleResize)
    this.canvas.addEventListener('contextmenu', this.preventContext)

    this.boat.update(0, 0, this.world, 0, 0, false)
    this.syncCosmetics(useGameStore.getState())
    this.syncSeason(useGameStore.getState(), true)
    this.updateCamera(1, true)
  }

  private syncCosmetics(store: ReturnType<typeof useGameStore.getState>) {
    if (store.boatSkin !== this.appliedBoat) {
      this.boat.setBoatSkin(store.boatSkin)
      this.appliedBoat = store.boatSkin
    }
    if (store.rodSkin !== this.appliedRod) {
      this.boat.setRodSkin(store.rodSkin)
      this.appliedRod = store.rodSkin
    }
    const decoKey = store.decorations.join(',')
    if (decoKey !== this.appliedDecorations) {
      this.boat.setDecorations(store.decorations)
      this.appliedDecorations = decoKey
    }
  }

  private syncSeason(store: ReturnType<typeof useGameStore.getState>, immediate = false) {
    if (store.season === this.appliedSeason) return
    this.appliedSeason = store.season
    this.world.setSeason(store.season, immediate)
    this.underwaterWorld.setSeason(store.season)
    this.seasonFx.setSeason(SEASONS[store.season].particle)
    this.leaves.setSeason(store.season)
  }

  private preventContext = (e: Event) => e.preventDefault()

  private handleResize = () => {
    const width = window.innerWidth
    const height = window.innerHeight
    this.renderer.setSize(width, height)
    this.camera.aspect = width / height
    this.camera.fov = width / height < 0.85 ? 58 : 48
    this.camera.updateProjectionMatrix()
    this.renderer.getDrawingBufferSize(this.bufferSize)
    this.post.setSize(this.bufferSize.x, this.bufferSize.y)
  }

  start() {
    this.lastTime = performance.now()
    this.loop()
  }

  private loop = () => {
    if (this.disposed) return
    this.raf = requestAnimationFrame(this.loop)
    const now = performance.now()
    const dt = Math.min((now - this.lastTime) / 1000, 0.05)
    this.lastTime = now
    this.elapsed += dt
    this.update(dt, this.elapsed)

    const store = useGameStore.getState()
    if (store.underwater) {
      this.post.render(this.renderer, this.scene, this.camera, {
        time: this.elapsed,
        depth: clamp(-this.camera.position.y / MAX_WATER_DEPTH, 0, 1),
        oxygen: this.oxygenValue / 100,
        exposure: this.world.exposure,
        fisheye: store.underwaterMode === 'follow' ? 0.22 : store.underwaterMode === 'orbit' ? 0.1 : 0.16,
        sunUv: this.sunUv,
        sunVisible: this.sunVisible(),
      })
    } else {
      this.renderer.render(this.scene, this.camera)
    }
  }

  private sunVisible() {
    this.camera.getWorldDirection(this.viewDir)
    this.sunWorld.copy(this.camera.position).addScaledVector(this.world.sunDirection, 80)
    this.underwaterLook.copy(this.sunWorld).sub(this.camera.position)
    if (this.underwaterLook.dot(this.viewDir) <= 0) return 0
    this.sunWorld.project(this.camera)
    if (
      this.sunWorld.z > 1 ||
      Math.abs(this.sunWorld.x) > 1.45 ||
      Math.abs(this.sunWorld.y) > 1.45
    ) {
      return 0
    }
    this.sunUv.set(this.sunWorld.x * 0.5 + 0.5, this.sunWorld.y * 0.5 + 0.5)
    const depth = clamp(-this.camera.position.y / MAX_WATER_DEPTH, 0, 1)
    return clamp(1 - depth * 0.45, 0.15, 1)
  }

  private update(dt: number, time: number) {
    const store = useGameStore.getState()
    this.syncCosmetics(store)
    this.syncSeason(store)
    this.renderer.toneMappingExposure = this.world.exposure

    if (store.underwater !== this.lastUnderwater) {
      if (store.underwater) this.enterUnderwater()
      else this.exitUnderwater()
    }

    if (!store.started) {
      input.update()
      input.clearQueued()
      this.boat.update(dt, time, this.world, 0, 0, false)
      this.world.update(time, dt, this.boat.position)
      this.world.updateFoam(dt)
      this.leaves.update(time, dt, this.boat.position)
      this.seasonFx.update(time, dt, this.boat.position)
      this.updateCamera(dt, false)
      return
    }

    const modal = isModalOpen(store)

    input.update()
    if (modal) input.clearQueued()

    if (store.underwater) {
      this.updateUnderwater(dt, time, store, modal)
      return
    }

    const fishingPhase = this.fishing.phase
    const fishingBusy = fishingPhase !== 'idle' && fishingPhase !== 'charging'
    const allowMove = !modal && !fishingBusy

    let throttle = input.throttle
    let steer = input.steer
    if (!allowMove) throttle = 0
    if (modal || fishingBusy) steer = 0

    this.boat.update(dt, time, this.world, throttle, steer, allowMove)
    this.world.water.setContact(
      0,
      this.boat.position.x,
      this.boat.position.z,
      1.7,
      0.26 + Math.min(0.22, this.boat.speed * 0.035),
    )
    this.fishing.update(dt, time)
    this.otter.update(dt, time, false, this.boat.position, this.boat.position, store.pet.affection)
    this.world.update(time, dt, this.boat.position)
    this.world.updateFoam(dt)
    this.leaves.update(time, dt, this.boat.position)
    this.seasonFx.update(time, dt, this.boat.position)
    this.seasonFx.setVisible(true)

    this.wakeTimer -= dt
    if (!modal && allowMove && this.boat.speed > 1.5 && this.wakeTimer <= 0) {
      this.boat.getStern(this.stern)
      this.world.foam.wake(this.stern.x, this.stern.z, 0.7 + this.boat.speed * 0.12)
      this.wakeTimer = 0.09
    }

    this.rippleTimer -= dt
    if (!modal && allowMove && this.boat.speed > 2.2 && this.rippleTimer <= 0) {
      this.boat.getStern(this.stern)
      this.world.foam.ripple(this.stern.x, this.stern.z, 0.85 + this.boat.speed * 0.05)
      this.rippleTimer = 0.48
    }

    this.updateCamera(dt, false)
    this.updateStatus(dt, modal, false)
    this.handleActions(store, modal)
  }

  private enterUnderwater() {
    this.lastUnderwater = true
    this.oxygenValue = 100
    input.clear()
    input.setLookEnabled(true)

    const fwd = this.boat.getForward(this.forward)
    this.swimYaw = Math.atan2(fwd.x, fwd.z)
    this.swimPitch = -0.05
    this.swimPos.copy(this.boat.position).addScaledVector(fwd, -4.2)
    this.swimPos.y = -1.8
    this.followYaw = 0
    this.followPitch = 0.05
    this.orbitAngle = Math.atan2(
      this.camera.position.x - this.boat.position.x,
      this.camera.position.z - this.boat.position.z,
    )
    this.orbitPitch = 0
    this.camPos.copy(this.camera.position)
    this.camera.getWorldDirection(this.viewDir)
    this.camLook.copy(this.camera.position).addScaledVector(this.viewDir, 6)

    this.world.setUnderwater(true)
    this.underwaterWorld.setVisible(true)
    this.seasonFx.setVisible(false)
    this.leaves.setVisible(false)
    this.world.setDiveLightPosition(this.swimPos)
    useGameStore.getState().setObservedFish(null)
    useGameStore.getState().setCaptureTarget(null)
    this.captureCooldown = 0
  }

  private exitUnderwater() {
    this.lastUnderwater = false
    input.setLookEnabled(false)
    input.clear()
    this.world.setUnderwater(false)
    this.underwaterWorld.setVisible(false)
    this.seasonFx.setVisible(true)
    this.leaves.setVisible(true)
    this.oxygenValue = 100
    useGameStore.getState().setCaptureTarget(null)
    this.camPos.copy(this.camera.position)
    this.camera.getWorldDirection(this.viewDir)
    this.camLook.copy(this.camera.position).addScaledVector(this.viewDir, 6)
  }

  private updateUnderwater(
    dt: number,
    time: number,
    store: ReturnType<typeof useGameStore.getState>,
    modal: boolean,
  ) {
    this.boat.update(dt, time, this.world, 0, 0, false)
    this.world.water.setContact(
      0,
      this.boat.position.x,
      this.boat.position.z,
      1.7,
      0.26 + Math.min(0.22, this.boat.speed * 0.035),
    )
    this.world.updateFoam(dt)
    this.underwaterWorld.update(time, dt, this.swimPos)
    this.otter.update(dt, time, true, this.boat.position, this.swimPos, store.pet.affection)
    this.captureCooldown = Math.max(0, this.captureCooldown - dt)
    this.trapClock += dt
    this.syncTraps(store)
    this.collectNearbyTraps(store)
    this.seasonFx.setVisible(false)
    this.leaves.setVisible(false)

    const mode = store.underwaterMode
    const look = input.consumeLook()
    if (mode === 'dive') {
      this.swimYaw += look.dx * 0.0032
      this.swimPitch = clamp(this.swimPitch - look.dy * 0.0032, -1.15, 1.15)
      this.moveDiver(dt, modal)
      this.camera.position.lerp(this.swimPos, 1 - Math.exp(-dt * 14))
      this.camera.position.y += Math.sin(time * 1.15) * 0.035
      this.lookTarget
        .set(
          Math.sin(this.swimYaw) * Math.cos(this.swimPitch),
          Math.sin(this.swimPitch),
          Math.cos(this.swimYaw) * Math.cos(this.swimPitch),
        )
        .multiplyScalar(7)
        .add(this.camera.position)
      this.camLook.lerp(this.lookTarget, 1 - Math.exp(-dt * 18))
      this.camera.lookAt(this.camLook)
    } else if (mode === 'follow') {
      this.followYaw += look.dx * 0.004
      this.followPitch = clamp(this.followPitch - look.dy * 0.003, -0.55, 0.85)
      this.updateFollowCamera(dt, time)
    } else {
      this.orbitAngle += look.dx * 0.004 + dt * 0.14
      this.orbitPitch = clamp(this.orbitPitch - look.dy * 0.003, -0.55, 0.6)
      this.updateOrbitCamera(dt)
    }

    this.camera.getWorldDirection(this.viewDir)
    this.underwaterTarget.copy(this.camera.position).addScaledVector(this.viewDir, 5)
    this.underwaterTarget.y += 1.2
    this.world.setDiveLightPosition(this.underwaterTarget)
    this.world.update(time, dt, this.camera.position)
    this.updateUnderwaterFov(dt, mode)

    this.hudTimer -= dt
    if (this.hudTimer <= 0) {
      this.hudTimer = 0.12
      store.setDepth(clamp(-this.camera.position.y, 0, MAX_WATER_DEPTH))
      this.updateCaptureAim(store)
    }

    if (!modal) {
      const drain = mode === 'dive' ? (input.sprint ? 3.1 : 1.55) : mode === 'follow' ? 1.05 : 0.9
      this.oxygenValue = Math.max(0, this.oxygenValue - drain * dt)
      store.setOxygen(this.oxygenValue)
      if (this.oxygenValue <= 0) {
        store.setUnderwater(false)
        store.toast('氧气耗尽，你被浪头推回了水面', 'danger')
        return
      }
    }

    this.updateStatus(dt, modal, true)
    this.handleUnderwaterActions(store, modal)
  }

  private moveDiver(dt: number, modal: boolean) {
    const throttle = modal ? 0 : input.throttle
    const steer = modal ? 0 : input.steer
    const vertical = modal ? 0 : input.vertical
    const moving = Math.abs(throttle) + Math.abs(steer) + Math.abs(vertical) > 0.01
    const sprint = input.sprint && moving
    const speed = sprint ? 8.4 : 4.6

    const sin = Math.sin(this.swimYaw)
    const cos = Math.cos(this.swimYaw)
    const dx = (sin * throttle + cos * steer) * speed * dt
    const dz = (cos * throttle - sin * steer) * speed * dt
    const nextX = clamp(this.swimPos.x + dx, -WORLD_HALF + 5, WORLD_HALF - 5)
    const nextZ = clamp(this.swimPos.z + dz, -WORLD_HALF + 5, WORLD_HALF - 5)

    const depthHere = this.world.depthAt(nextX, nextZ)
    if (depthHere > 0.55) {
      this.swimPos.x = nextX
      this.swimPos.z = nextZ
    }

    const floor = this.world.depthAt(this.swimPos.x, this.swimPos.z)
    const surface = Math.min(-0.45, this.world.waveHeight(this.swimPos.x, this.swimPos.z, this.elapsed) - 0.4)
    const bottom = -Math.max(0.9, floor - 0.8)
    this.swimPos.y = clamp(this.swimPos.y + vertical * (sprint ? 4.6 : 2.8) * dt, bottom, surface)
  }

  private nearestFish() {
    const groups = this.underwaterWorld.fishGroups
    let best: THREE.Group | null = null
    let bestDist = Infinity
    const from = this.camera.position
    for (const group of groups) {
      const d = group.position.distanceToSquared(from)
      if (d < bestDist) {
        bestDist = d
        best = group
      }
    }
    return best
  }

  private updateFollowCamera(dt: number, time: number) {
    const fish = this.nearestFish()
    if (!fish) {
      this.updateOrbitCamera(dt)
      return
    }
    const radius = 3.5 - Math.abs(this.followPitch) * 1.1
    const angle = fish.rotation.y + Math.PI + this.followYaw
    const desired = this.desired.set(
      fish.position.x + Math.sin(angle) * radius,
      fish.position.y + 1.05 + this.followPitch * 2.6,
      fish.position.z + Math.cos(angle) * radius,
    )
    const wave = this.world.waveHeight(desired.x, desired.z, time)
    desired.y = Math.min(desired.y, wave - 0.5)
    const floor = this.world.depthAt(desired.x, desired.z)
    desired.y = Math.max(desired.y, -Math.max(0.9, floor - 0.7))

    this.camera.position.lerp(desired, 1 - Math.exp(-dt * 3.6))
    this.viewDir.set(Math.sin(fish.rotation.y), 0, Math.cos(fish.rotation.y))
    this.lookTarget.copy(fish.position).addScaledVector(this.viewDir, 1.4)
    this.lookTarget.y += 0.15
    this.camLook.lerp(this.lookTarget, 1 - Math.exp(-dt * 4.5))
    this.camera.lookAt(this.camLook)
  }

  private updateOrbitCamera(dt: number) {
    const radius = 12.5
    const desired = this.desired.set(
      this.boat.position.x + Math.sin(this.orbitAngle) * radius,
      clamp(this.boat.position.y - 3.4 + this.orbitPitch * 4.5, -9.4, -0.7),
      this.boat.position.z + Math.cos(this.orbitAngle) * radius,
    )
    this.camera.position.lerp(desired, 1 - Math.exp(-dt * 2.8))
    this.lookTarget.copy(this.boat.position)
    this.lookTarget.y -= 0.6
    this.camLook.lerp(this.lookTarget, 1 - Math.exp(-dt * 3.4))
    this.camera.lookAt(this.camLook)
  }

  private updateUnderwaterFov(dt: number, mode: UnderwaterMode) {
    const target = mode === 'follow' ? 68 : mode === 'orbit' ? 60 : 64
    const next = THREE.MathUtils.damp(this.camera.fov, target, 4, dt)
    if (Math.abs(next - this.camera.fov) > 0.01) {
      this.camera.fov = next
      this.camera.updateProjectionMatrix()
    }
  }

  private updateCamera(dt: number, immediate: boolean) {
    const forward = this.boat.getForward(this.forward)
    const back = this.back.copy(forward).negate()
    const right = this.right.set(-forward.z, 0, forward.x)
    const portrait = this.camera.aspect < 0.85

    this.desired.copy(this.boat.position).addScaledVector(back, 9.8).addScaledVector(right, 4.2)
    this.desired.y = this.boat.position.y + (portrait ? 6.6 : 5.7)

    this.lookTarget
      .copy(this.boat.position)
      .addScaledVector(forward, 2.6)
      .addScaledVector(right, 0.7)
    this.lookTarget.y += 0.95

    if (immediate) {
      this.camPos.copy(this.desired)
      this.camLook.copy(this.lookTarget)
    } else {
      this.camPos.lerp(this.desired, 1 - Math.exp(-dt * 3.2))
      this.camLook.lerp(this.lookTarget, 1 - Math.exp(-dt * 4.6))
    }

    this.camera.position.copy(this.camPos)
    this.camera.lookAt(this.camLook)

    const targetFov = portrait ? 58 : 48
    if (!this.lastUnderwater && Math.abs(this.camera.fov - targetFov) > 0.01) {
      this.camera.fov = THREE.MathUtils.damp(this.camera.fov, targetFov, 4, dt)
      this.camera.updateProjectionMatrix()
    }
  }

  private updateStatus(dt: number, modal: boolean, underwater: boolean) {
    this.statusTimer -= dt
    if (this.statusTimer > 0) return
    this.statusTimer = 0.25

    const store = useGameStore.getState()
    const zone = zoneAt(this.boat.position.x, this.boat.position.z)
    if (zone !== this.lastZone) {
      this.lastZone = zone
      store.setZone(zone)
    }

    const distance = Math.hypot(
      this.boat.position.x - DOCK_POINT.x,
      this.boat.position.z - DOCK_POINT.z,
    )
    const canTrade =
      !underwater &&
      distance < SELL_RADIUS &&
      this.fishing.phase === 'idle' &&
      !modal

    const nearDock = canTrade && store.bag.length > 0
    if (nearDock !== this.lastNearDock) {
      this.lastNearDock = nearDock
      store.setNearDock(nearDock)
    }

    let prompt: string | null = null
    if (canTrade) {
      if (store.bag.length === 0) {
        prompt = '鱼篓还是空的，划出去试试手气'
      } else {
        const total = store.bag.reduce((sum, c) => sum + c.value, 0)
        prompt = `出售 ${store.bag.length} 条渔获 · ¥${total}`
      }
    }

    if (prompt !== this.lastPrompt) {
      this.lastPrompt = prompt
      store.setPrompt(prompt)
    }
  }

  private handleActions(store: ReturnType<typeof useGameStore.getState>, modal: boolean) {
    if (modal) return

    const slot = input.consumeSlot()
    if (slot && CAPTURE_TOOLS[slot - 1]) {
      store.setActiveTool(CAPTURE_TOOLS[slot - 1].id)
    }

    if (input.consumeTown()) {
      if (this.fishing.phase === 'idle') {
        store.setTownOpen(true)
      } else {
        store.toast('先收线，再回码头', 'info')
      }
    }

    if (input.consumeBag()) {
      if (this.fishing.phase === 'idle') {
        store.setBagOpen(true)
      } else {
        store.toast('先收线，再打开鱼篓')
      }
    }

    if (input.consumeShop()) {
      if (this.fishing.phase === 'idle') {
        store.setShopOpen(true)
      } else {
        store.toast('先收线，再逛船坞')
      }
    }

    if (input.consumeDive()) {
      if (this.fishing.phase === 'idle') {
        store.setUnderwater(true)
      } else {
        store.toast('先收线，再潜下水', 'info')
      }
    }

    if (input.consumeBait()) {
      if (this.fishing.phase === 'idle') {
        store.setBaitOpen(true)
      } else {
        store.toast('先收线，再换鱼饵', 'info')
      }
    }

    if (input.consumeSeason()) {
      if (this.fishing.phase === 'idle') {
        store.setSeasonOpen(true)
      } else {
        store.toast('先收线，再切换季节', 'info')
      }
    }

    if (input.consumeTool() && this.fishing.phase === 'waiting') {
      this.fishing.twitch()
    }

    if (input.consumeInteract()) {
      const distance = Math.hypot(
        this.boat.position.x - DOCK_POINT.x,
        this.boat.position.z - DOCK_POINT.z,
      )
      if (
        distance < SELL_RADIUS &&
        this.fishing.phase === 'idle' &&
        store.bag.length > 0
      ) {
        store.openMarket()
      } else if (distance < SELL_RADIUS && store.bag.length === 0) {
        store.toast('鱼篓是空的，先去钓几条鱼吧')
      }
    }
  }

  private handleUnderwaterActions(
    store: ReturnType<typeof useGameStore.getState>,
    modal: boolean,
  ) {
    if (modal) return

    const slot = input.consumeSlot()
    if (slot && CAPTURE_TOOLS[slot - 1]) {
      store.setActiveTool(CAPTURE_TOOLS[slot - 1].id)
      this.captureCooldown = 0
    }

    if (input.consumeTown()) {
      store.toast('先浮回水面，再回码头', 'info')
    }

    if (input.consumeDive()) {
      store.setUnderwater(false)
      return
    }
    if (input.consumeTool()) {
      store.cycleUnderwaterMode()
    }
    if (input.consumeBait()) {
      store.setBaitOpen(true)
    }
    if (input.consumeSeason()) {
      store.setSeasonOpen(true)
    }

    if (input.consumeInteract()) {
      this.fireCapture(store)
      return
    }

    const click = input.consumeClick()
    if (!click) return

    if (this.captureFish) {
      this.fireCapture(store)
      return
    }

    const rect = this.canvas.getBoundingClientRect()
    this.pointerNdc.set(
      ((click.x - rect.left) / rect.width) * 2 - 1,
      -((click.y - rect.top) / rect.height) * 2 + 1,
    )
    this.raycaster.setFromCamera(this.pointerNdc, this.camera)
    const hits = this.raycaster.intersectObjects(this.underwaterWorld.fishGroups, true)
    const defId = hits[0]?.object.userData.defId as string | undefined
    const def = defId ? fishById(defId) : undefined
    if (def) {
      store.setObservedFish(def.id)
      store.toast(`观察 · ${def.name}`, 'info')
    } else {
      store.setObservedFish(null)
    }
  }

  private findAimFish(range: number) {
    this.camera.getWorldDirection(this.viewDir)
    let best: { group: THREE.Group; def: FishDef; distance: number } | null = null
    let bestScore = -Infinity
    for (const fish of this.underwaterWorld.catchableFish()) {
      this.aimTo.copy(fish.group.position).sub(this.camera.position)
      const distance = this.aimTo.length()
      if (distance < 0.5 || distance > range * 1.6) continue
      const dot = this.aimTo.divideScalar(distance).dot(this.viewDir)
      if (dot < 0.9) continue
      const score = dot * 2 - distance * 0.02
      if (score > bestScore) {
        bestScore = score
        best = { group: fish.group, def: fish.def, distance }
      }
    }
    return best
  }

  private updateCaptureAim(store: ReturnType<typeof useGameStore.getState>) {
    const tool = store.activeTool
    const state = store.tools[tool]
    const stats = toolStats(tool, state.level)
    const fish = this.findAimFish(stats.range)
    this.captureFish = fish
    const wearOk = state.wear > 0
    if (tool === 'trap') {
      store.setCaptureTarget({
        label: wearOk ? '布设鱼笼' : '鱼笼已损坏',
        distance: 0,
        ready: wearOk && this.captureCooldown <= 0,
      })
      return
    }
    if (!fish) {
      store.setCaptureTarget(null)
      return
    }
    store.setCaptureTarget({
      defId: fish.def.id,
      label: fish.def.name,
      distance: fish.distance,
      ready:
        wearOk &&
        this.captureCooldown <= 0 &&
        fish.distance <= stats.range &&
        store.bag.length < BAG_CAPACITY,
    })
  }

  private fireCapture(store: ReturnType<typeof useGameStore.getState>) {
    const tool = store.activeTool
    const def = toolById(tool)
    const state = store.tools[tool]
    const stats = toolStats(tool, state.level)
    if (!def) return
    if (state.wear <= 0) {
      store.toast(`${def.name}已经损坏，回码头找阿岚修理`, 'danger')
      return
    }
    if (this.captureCooldown > 0) return
    if (store.bag.length >= BAG_CAPACITY) {
      store.toast('鱼篓满了，先回码头卸货', 'danger')
      return
    }

    if (tool === 'trap') {
      this.camera.getWorldDirection(this.viewDir)
      const dist = Math.min(stats.range, 8)
      const px = this.camera.position.x + this.viewDir.x * dist
      const pz = this.camera.position.z + this.viewDir.z * dist
      const depth = this.world.depthAt(px, pz)
      if (depth < 1.1) {
        store.toast('这里太浅，鱼笼放不稳', 'info')
        return
      }
      const outcome = trapOutcome(depth, store.season, state.level, stats.capacity)
      const ok = store.addTrap({
        x: px,
        y: -Math.max(0.65, depth - 0.45),
        z: pz,
        placedAt: Date.now(),
        readyAt: Date.now() + stats.waitMs,
        depth,
        outcome,
      })
      if (!ok) return
      this.captureCooldown = stats.cooldown
      store.wearTool(tool, stats.wear)
      return
    }

    const fish = this.findAimFish(stats.range)
    if (!fish) {
      store.toast('准星里没有鱼，再游近一点', 'info')
      return
    }
    this.captureCooldown = stats.cooldown
    store.wearTool(tool, stats.wear)

    if (tool === 'harpoon') {
      const depth = this.world.depthAt(fish.group.position.x, fish.group.position.z)
      const chance = toolCaptureChance('harpoon', fish.def, state.level, depth)
      if (Math.random() <= chance) {
        const caught = createCatch(fish.def, 'harpoon')
        const added = store.addCatch(caught, 'harpoon')
        if (added) {
          this.underwaterWorld.removeFish(fish.group)
          store.setCaptureResult([caught])
          audio.caught()
          audio.splash(0.35)
        }
      } else {
        this.underwaterWorld.startleFish(fish.group)
        audio.splash(0.28)
        store.toast(`${fish.def.name}一摆尾躲开了`, 'info')
      }
      return
    }

    const center = fish.group.position
    const targets = this.underwaterWorld
      .catchableFish()
      .map((f) => ({
        ...f,
        d: f.group.position.distanceTo(center),
      }))
      .filter((f) => f.d <= stats.radius)
      .sort((a, b) => a.d - b.d)
    const slots = Math.max(0, BAG_CAPACITY - store.bag.length)
    const limit = Math.min(stats.capacity, slots)
    const capturedList: ReturnType<typeof createCatch>[] = []
    for (const target of targets) {
      if (capturedList.length >= limit) break
      const depth = this.world.depthAt(target.group.position.x, target.group.position.z)
      const chance = toolCaptureChance('net', target.def, state.level, depth)
      if (Math.random() > chance) {
        this.underwaterWorld.startleFish(target.group)
        continue
      }
      const caught = createCatch(target.def, 'net')
      const added = useGameStore.getState().addCatch(caught, 'net')
      if (!added) continue
      this.underwaterWorld.removeFish(target.group)
      capturedList.push(caught)
    }
    if (capturedList.length > 0) {
      store.setCaptureResult(capturedList)
      audio.caught()
      audio.splash(0.6)
    } else {
      store.toast('网里只兜到一团水草', 'info')
      audio.splash(0.3)
    }
  }

  private buildTrapMesh() {
    const group = new THREE.Group()
    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(0.85, 0.6, 1.15),
      new THREE.MeshStandardMaterial({
        color: '#c9945e',
        wireframe: true,
        transparent: true,
        opacity: 0.85,
      }),
    )
    const base = new THREE.Mesh(
      new THREE.BoxGeometry(0.9, 0.06, 1.2),
      new THREE.MeshStandardMaterial({ color: '#6b4526', roughness: 0.9, flatShading: true }),
    )
    base.position.y = -0.29
    const float = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 7, 5),
      new THREE.MeshStandardMaterial({
        color: '#f2c15c',
        emissive: '#f2c15c',
        emissiveIntensity: 0.5,
        roughness: 0.4,
      }),
    )
    float.position.y = 0.46
    const rope = new THREE.Mesh(
      new THREE.CylinderGeometry(0.012, 0.012, 0.36, 4),
      new THREE.MeshStandardMaterial({ color: '#3a2a1c' }),
    )
    rope.position.y = 0.28
    group.add(frame, base, float, rope)
    group.userData.float = float
    return group
  }

  private syncTraps(store: ReturnType<typeof useGameStore.getState>) {
    const seen = new Set<string>()
    for (const trap of store.traps) {
      seen.add(trap.id)
      let mesh = this.trapMeshes.get(trap.id)
      if (!mesh) {
        mesh = this.buildTrapMesh()
        mesh.position.set(trap.x, trap.y, trap.z)
        this.scene.add(mesh)
        this.trapMeshes.set(trap.id, mesh)
      }
      const ready = Date.now() >= trap.readyAt
      const float = mesh.userData.float as THREE.Mesh
      const material = float.material as THREE.MeshStandardMaterial
      material.color.set(ready ? '#6fe0cf' : '#f2c15c')
      material.emissive.set(ready ? '#6fe0cf' : '#f2c15c')
      material.emissiveIntensity = ready ? 1.1 + Math.sin(this.trapClock * 4) * 0.4 : 0.45
      mesh.rotation.y += 0.0035
    }
    for (const [id, mesh] of this.trapMeshes) {
      if (seen.has(id)) continue
      this.scene.remove(mesh)
      mesh.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose()
          const mat = child.material as THREE.Material
          mat.dispose()
        }
      })
      this.trapMeshes.delete(id)
    }
  }

  private collectNearbyTraps(store: ReturnType<typeof useGameStore.getState>) {
    const now = Date.now()
    for (const trap of store.traps) {
      if (now < trap.readyAt) continue
      const distance = Math.hypot(
        this.swimPos.x - trap.x,
        this.swimPos.y - trap.y,
        this.swimPos.z - trap.z,
      )
      if (distance > 4.2) continue
      store.collectTrap(trap.id)
      break
    }
  }

  dispose() {
    this.disposed = true
    cancelAnimationFrame(this.raf)
    window.removeEventListener('resize', this.handleResize)
    this.canvas.removeEventListener('contextmenu', this.preventContext)
    input.detach()
    this.otter.dispose(this.scene)
    for (const mesh of this.trapMeshes.values()) {
      this.scene.remove(mesh)
      mesh.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose()
          ;(child.material as THREE.Material).dispose()
        }
      })
    }
    this.trapMeshes.clear()
    this.post.dispose()
    this.seasonFx.dispose()
    this.underwaterWorld.dispose()
    this.leaves.dispose()
    this.renderer.dispose()
  }
}
