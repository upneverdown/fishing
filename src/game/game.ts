import * as THREE from 'three'
import { World } from '@/game/world/world'
import { Boat } from '@/game/entities/boat'
import { Otter } from '@/game/entities/otter'
import { FishingSystem } from '@/game/fishing/fishingSystem'
import { FloatingLeaves } from '@/game/fx/leaves'
import { SeasonFx } from '@/game/fx/seasonFx'
import { FactionAura } from '@/game/fx/factionAura'
import { FACTIONS, factionOf, type FactionId } from '@/game/cultivation/factions'
import { UnderwaterWorld } from '@/game/underwater/underwaterWorld'
import { UnderwaterPost } from '@/game/render/underwaterPost'
import { input } from '@/game/input'
import { bagCapacity, isModalOpen, maxHpFor, useGameStore } from '@/store/useGameStore'
import { gameEvents } from '@/game/eventBus'
import { AchievementManager } from '@/game/achievements/achievementManager'
import { CrewSystem } from '@/game/crew/crewSystem'
import { SeaEvents } from '@/game/events/seaEvents'
import { TreasureSystem } from '@/game/treasures/treasureSystem'
import { WakeSpray } from '@/game/fx/wakeSpray'
import { PlayerAvatar } from '@/game/player/playerAvatar'
import { playerSkinById } from '@/game/player/playerSkins'
import { DragonBoatRace, DRAGON_RACE_TIME } from '@/game/race/dragonBoatRace'
import {
  crewDamageMul,
  crewOxygenMul,
  crewRepairsHull,
  crewSpeedMul,
} from '@/game/crew/crew'
import {
  CAPTURE_TOOLS,
  toolById,
  toolCaptureChance,
  toolStats,
  trapOutcome,
} from '@/game/capture/tools'
import { variantById, variantStats } from '@/game/capture/variants'
import { CreatureSystem } from '@/game/creatures/creatureSystem'
import { CelestialScene, CELESTIAL_SPAWN } from '@/game/celestial/celestialScene'
import { AscensionGate } from '@/game/celestial/ascensionGate'
import { boatCanFly } from '@/game/shop/catalog'
import { CultivationManager, type CultivationPlayer } from '@/game/cultivation/cultivationManager'
import { SKILLS, realmAttackMul, realmSpeedMul, skillUnlocked } from '@/game/cultivation/realms'
import { SectHalls, SECT_ELDERS } from '@/game/sect/sectHalls'
import { ThunderLure } from '@/game/sect/thunderlure'
import { ContestArena, CONTEST_POINT } from '@/game/sect/contestArena'
import { equippedLevel, fishingBlessing, hasTechnique, FISH_XP_BY_RARITY } from '@/game/sect/blessings'
import { techniqueById, techniqueValue } from '@/game/sect/techniques'
import { CAMPFIRE_RADIUS, DockLife } from '@/game/world/dockLife'
import { weaponById } from '@/game/combat/weapons'
import { dayKey } from '@/game/economy/market'
import { audio } from '@/game/audio/gameAudio'
import {
  DOCK_POINT,
  MAX_WATER_DEPTH,
  SELL_RADIUS,
  SPAWN,
  WORLD_HALF,
  zoneAt,
} from '@/game/world/worldMap'
import { WATERS, canEnterWater, waterAt } from '@/game/world/waters'
import { SEASONS } from '@/game/world/seasons'
import {
  fishById,
  createCatch,
  pickFish,
  type FishDef,
} from '@/game/fishing/fishTable'
import { clamp } from '@/game/utils/math'
import type { Catch, MapZone, SeasonId, UnderwaterMode } from '@/types'

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
  readonly factionAura: FactionAura
  readonly underwaterWorld: UnderwaterWorld
  readonly creatures: CreatureSystem
  readonly cultivation: CultivationManager
  readonly dockLife: DockLife
  readonly post: UnderwaterPost
  readonly achievements = new AchievementManager()
  readonly crewSystem: CrewSystem
  readonly seaEvents: SeaEvents
  readonly treasures: TreasureSystem
  readonly avatar: PlayerAvatar
  readonly wakeSpray: WakeSpray
  readonly dragonRace: DragonBoatRace
  readonly celestial: CelestialScene
  readonly gate: AscensionGate
  readonly sectHalls: SectHalls
  readonly thunder: ThunderLure
  readonly contest: ContestArena

  /** 《天雷引》冷却 */
  private thunderCd = 0
  /** 《御剑飞行》是否已踏剑离水 */
  private swordFlight = false
  private thunderTarget = new THREE.Vector3()
  /** 大比：进场大字停留时间 */
  private contestEnterT = 0
  private contestClock = 0
  private contestHudTimer = 0
  private unsubRegister: (() => void) | null = null
  private unsubLeaveContest: (() => void) | null = null

  /** 通天河道上的进度 0~1 */
  private ascendT = 0
  /** >0 表示正处于白屏/穿云过渡中 */
  private crossTimer = 0
  private crossTotal = 0
  private crossApplied = false
  private travelTarget: MapZone | null = null
  private ascensionHudTimer = 0
  private celestialDoomTimer = 0
  private flightHover = 0
  private pathPoint = new THREE.Vector3()
  private unsubAscension: (() => void) | null = null
  private unsubSummon: (() => void) | null = null

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
  private auraCenter = new THREE.Vector3()

  private swimPos = new THREE.Vector3()
  private swimVel = new THREE.Vector3()
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
  private navTimer = 0
  private combatTarget = new THREE.Vector3()
  private cultPlayer: CultivationPlayer = {
    position: new THREE.Vector3(),
    forward: new THREE.Vector3(),
    busy: false,
    underwater: false,
  }
  private bubblePool = new THREE.Points(
    new THREE.BufferGeometry(),
    new THREE.PointsMaterial({
      color: '#c9f5ef',
      size: 0.09,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  )
  private bubbleLife: number[] = []
  private bubbleT = 0

  private weaponRig = new THREE.Group()
  private knifeModel = new THREE.Group()
  private gunModel = new THREE.Group()
  private muzzle = new THREE.Object3D()
  private muzzleFlash!: THREE.Mesh
  private muzzleLight = new THREE.PointLight('#ffd9a0', 0, 14, 2)
  private tracer!: THREE.Line
  private tracerGeo = new THREE.BufferGeometry()
  private rope!: THREE.Line
  private ropeGeo = new THREE.BufferGeometry()
  private ropeStart = new THREE.Vector3()
  private ropeEnd = new THREE.Vector3()
  private ropeT = 0
  private ropeHold = 0.55
  private ropeSegments = 18
  private weaponCooldown = 0
  private attackAnim = 0
  private switchAnim = 0
  private muzzleT = 0
  private tracerT = 0
  private lastWeaponId = ''
  private searchlight!: THREE.SpotLight
  private searchlightTarget = new THREE.Object3D()
  private lightBeam = new THREE.Group()
  private trawlNet = new THREE.Group()
  private trawlBase = new THREE.BufferGeometry()
  private trawlTimer = 0
  private radarTimer = 0
  private waterWarnT = 0
  private poseTimer = 0
  private repairTimer = 5
  private underwaterAccum = 0
  private sailAccum = 0
  private sailTimer = 0
  private lastRespawnToken = 0
  private boatSafe = new THREE.Vector3()
  private lastLockedWater: string | null = null

  private lastPrompt: string | null = null
  private lastNearDock = false
  private lastZone = ''
  private appliedBoat = ''
  private appliedRod = ''
  private appliedDecorations = ''
  private appliedSeason: SeasonId | '' = ''
  private appliedPlayerSkin = ''
  private appliedFaction: FactionId | null = null
  private lastUnderwater = false
  private autoLockedBossId = ''
  private raceSyncTimer = 0
  private lastHitAt = 0
  private impactToastTimer = 0
  private combatFaceTarget = new THREE.Vector3()
  private combatHasTarget = false

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
    this.factionAura = new FactionAura(this.scene)
    this.underwaterWorld = new UnderwaterWorld(this.scene, this.world)
    this.creatures = new CreatureSystem(this.scene, this.world)
    this.cultivation = new CultivationManager(this.scene, this.world, this.creatures)
    this.dockLife = new DockLife(this.scene)
    this.crewSystem = new CrewSystem(this.boat)
    this.seaEvents = new SeaEvents(this.scene, this.world, this.boat)
    this.treasures = new TreasureSystem(this.scene, this.world, this.boat)
    this.avatar = new PlayerAvatar(this.scene)
    this.wakeSpray = new WakeSpray()
    this.scene.add(this.wakeSpray.points)
    this.dragonRace = new DragonBoatRace(this.scene, (event, secondsLeft) => {
      const state = useGameStore.getState()
      if (event === 'start') {
        state.toast(`龙舟赛开始 · ${DRAGON_RACE_TIME} 秒内穿过全部光圈`, 'gold')
        return
      }
      if (event === 'finish') {
        state.completeDragonBoatRace(secondsLeft)
        gameEvents.emit('dragonboat:finish', { secondsLeft })
        return
      }
      state.toast('龙舟赛超时 · 回到起点再试一次', 'danger')
    })
    this.boat.setAnglerVisible(false)
    this.post = new UnderwaterPost()
    this.celestial = new CelestialScene(this.scene)
    this.gate = new AscensionGate(this.scene)
    this.sectHalls = new SectHalls(this.scene)
    this.thunder = new ThunderLure(this.scene)
    this.contest = new ContestArena(this.scene)
    this.world.setCelestialSurface((x, z, t) => this.celestial.surfaceAt(x, z, t))
    this.celestial.setRimTarget(this.boat.group)

    this.scene.add(this.camera)
    this.buildWeaponRig()
    this.buildSearchlight()
    this.buildBoundaryBuoys()
    this.buildTrawlNet()
    this.buildBubbleTrail()

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

    const saved = useGameStore.getState()
    if (saved.boatPose && this.world.depthAt(saved.boatPose.x, saved.boatPose.z) > 0.9) {
      this.boat.position.x = saved.boatPose.x
      this.boat.position.z = saved.boatPose.z
      this.boat.heading = saved.boatPose.heading
      this.boat.group.rotation.y = saved.boatPose.heading
    }
    this.lastRespawnToken = saved.respawnToken
    this.lastWeaponId = saved.equippedWeapon

    this.boat.update(0, 0, this.world, 0, 0, false)
    this.syncCosmetics(useGameStore.getState())
    this.syncSeason(useGameStore.getState(), true)
    this.unsubAscension = gameEvents.on('ascension:gate', () => this.openAscension())
    this.unsubSummon = gameEvents.on('celestial:summon', (event) =>
      this.onCelestialSummon(event.x, event.z),
    )
    this.unsubRegister = gameEvents.on('contest:register', () => this.startContest())
    this.unsubLeaveContest = gameEvents.on('contest:leave', () => this.leaveContest())
    if (saved.mapZone === 'celestial') this.applyZone('celestial', true)
    this.updateCamera(1, true)
    this.updateWeapon(0, saved, false, false)
  }

  private buildWeaponRig() {
    const steel = new THREE.MeshStandardMaterial({
      color: '#b9d2d8',
      roughness: 0.34,
      metalness: 0.55,
      flatShading: true,
    })
    const dark = new THREE.MeshStandardMaterial({
      color: '#2b3a3c',
      roughness: 0.72,
      metalness: 0.18,
      flatShading: true,
    })
    const gold = new THREE.MeshStandardMaterial({
      color: '#d8b45a',
      roughness: 0.4,
      metalness: 0.5,
      flatShading: true,
    })

    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.026, 0.22, 6), dark)
    handle.rotation.x = Math.PI / 2
    handle.position.z = 0.05
    const guard = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.02, 0.03), gold)
    guard.position.z = -0.07
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.012, 0.34), steel)
    blade.position.z = -0.26
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.032, 0.1, 4), steel)
    tip.rotation.x = -Math.PI / 2
    tip.position.z = -0.47
    this.knifeModel.add(handle, guard, blade, tip)
    this.knifeModel.position.set(0, -0.02, -0.12)
    this.knifeModel.rotation.set(0.1, 0.12, -0.16)
    this.weaponRig.add(this.knifeModel)

    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 0.2), dark)
    stock.position.z = 0.22
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.032, 0.62, 6), steel)
    body.rotation.x = Math.PI / 2
    body.position.z = -0.14
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.02, 0.5), gold)
    rail.position.set(0, 0.045, -0.16)
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.16, 0.06), dark)
    grip.position.set(0, -0.09, 0.14)
    grip.rotation.x = -0.28
    const reel = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.03, 10), gold)
    reel.rotation.x = Math.PI / 2
    reel.position.set(0, 0.02, 0.06)
    this.gunModel.add(stock, body, rail, grip, reel)
    this.muzzle.position.set(0, 0, -0.48)
    this.gunModel.add(this.muzzle)
    this.gunModel.position.set(0.03, 0.015, -0.2)
    this.gunModel.rotation.set(0.02, -0.04, 0.02)
    this.weaponRig.add(this.gunModel)

    this.muzzleFlash = new THREE.Mesh(
      new THREE.SphereGeometry(0.085, 7, 5),
      new THREE.MeshBasicMaterial({
        color: '#ffe2a8',
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    )
    this.muzzleFlash.visible = false
    this.muzzle.add(this.muzzleFlash)
    this.muzzle.add(this.muzzleLight)

    this.camera.add(this.weaponRig)
    this.weaponRig.position.set(0.32, -0.28, -0.62)
    this.weaponRig.rotation.set(0.04, -0.1, 0)
    this.weaponRig.visible = false

    this.tracerGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3))
    this.tracer = new THREE.Line(
      this.tracerGeo,
      new THREE.LineBasicMaterial({
        color: '#ffe2a8',
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    )
    this.tracer.visible = false
    this.tracer.frustumCulled = false
    this.scene.add(this.tracer)

    this.ropeGeo.setAttribute(
      'position',
      new THREE.BufferAttribute(new Float32Array((this.ropeSegments + 1) * 3), 3),
    )
    this.rope = new THREE.Line(
      this.ropeGeo,
      new THREE.LineBasicMaterial({
        color: '#e6c489',
        transparent: true,
        opacity: 0.9,
        depthWrite: false,
      }),
    )
    this.rope.visible = false
    this.rope.frustumCulled = false
    this.scene.add(this.rope)
  }

  private buildSearchlight() {
    this.searchlight = new THREE.SpotLight('#ffe7b8', 0, 65, 0.48, 0.55, 1.1)
    this.searchlight.castShadow = false
    this.scene.add(this.searchlight)
    this.scene.add(this.searchlightTarget)
    this.searchlight.target = this.searchlightTarget

    const beamGeo = new THREE.CylinderGeometry(0.18, 4.2, 26, 14, 1, true)
    const beamMat = new THREE.MeshBasicMaterial({
      color: '#ffe7b8',
      transparent: true,
      opacity: 0.09,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    })
    const beam = new THREE.Mesh(beamGeo, beamMat)
    beam.rotation.x = -Math.PI / 2 + 0.13
    beam.position.set(0, 0.7, -13.4)
    this.lightBeam.add(beam)
    const lamp = new THREE.Mesh(
      new THREE.CylinderGeometry(0.13, 0.15, 0.14, 8),
      new THREE.MeshStandardMaterial({
        color: '#ffe7b8',
        emissive: '#ffcf7a',
        emissiveIntensity: 1.6,
        roughness: 0.4,
      }),
    )
    lamp.rotation.x = Math.PI / 2
    lamp.position.set(0, 0.9, -1.2)
    this.lightBeam.add(lamp)
    this.lightBeam.visible = false
    this.boat.group.add(this.lightBeam)
  }

  private buildBoundaryBuoys() {
    const zones = WATERS.filter((w) => w.tier >= 2)
    const total = zones.length * 14
    const mesh = new THREE.InstancedMesh(
      new THREE.DodecahedronGeometry(0.32, 0),
      new THREE.MeshStandardMaterial({
        roughness: 0.5,
        emissive: '#ffffff',
        emissiveIntensity: 0.25,
        flatShading: true,
      }),
      total,
    )
    mesh.frustumCulled = false
    const dummy = new THREE.Object3D()
    const color = new THREE.Color()
    let index = 0
    for (const zone of zones) {
      color.set(zone.color)
      for (let i = 0; i < 14; i++) {
        const angle = (i / 14) * Math.PI * 2
        const x = zone.center.x + Math.cos(angle) * zone.radius * 0.96
        const z = zone.center.z + Math.sin(angle) * zone.radius * 0.96
        dummy.position.set(x, 0.18, z)
        dummy.scale.setScalar(0.85)
        dummy.updateMatrix()
        mesh.setMatrixAt(index, dummy.matrix)
        mesh.setColorAt(index, color)
        index++
      }
    }
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    this.scene.add(mesh)
  }

  private buildTrawlNet() {
    const points: number[] = []
    const cols = 7
    const rows = 6
    for (let x = 0; x < cols; x++) {
      for (let y = 0; y < rows; y++) {
        const px = (x / (cols - 1) - 0.5) * 3.1
        const py = (y / (rows - 1) - 0.5) * 2.2
        points.push(px, py, -Math.sin((y / (rows - 1)) * Math.PI) * 0.9 - 1.8)
      }
    }
    this.trawlBase.setAttribute('position', new THREE.Float32BufferAttribute(points, 3))
    const index: number[] = []
    for (let x = 0; x < cols - 1; x++) {
      for (let y = 0; y < rows - 1; y++) {
        const a = x * rows + y
        const b = (x + 1) * rows + y
        index.push(a, b, a + 1, b, b + 1, a + 1)
      }
    }
    this.trawlBase.setIndex(index)
    const geo = this.trawlBase.clone()
    const mesh = new THREE.Mesh(
      geo,
      new THREE.MeshBasicMaterial({
        color: '#9bc7b6',
        wireframe: true,
        transparent: true,
        opacity: 0.5,
        depthWrite: false,
      }),
    )
    this.trawlNet.add(mesh)
    this.trawlNet.position.set(0, 0.15, 2.4)
    this.trawlNet.rotation.x = 0.1
    this.trawlNet.visible = false
    this.boat.group.add(this.trawlNet)
  }

  private buildBubbleTrail() {
    const count = 48
    const positions = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) positions[i * 3 + 1] = -999
    this.bubblePool.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    this.bubblePool.frustumCulled = false
    this.bubblePool.visible = false
    this.bubbleLife = Array.from({ length: count }, () => 0)
    this.scene.add(this.bubblePool)
  }

  private updateBubbles(dt: number, active: boolean) {
    this.bubblePool.visible = active
    if (!active) return
    const attr = this.bubblePool.geometry.getAttribute('position') as THREE.BufferAttribute
    this.bubbleT -= dt
    if (this.bubbleT <= 0) {
      this.bubbleT = 0.09
      let index = this.bubbleLife.findIndex((life) => life <= 0)
      if (index < 0) index = Math.floor(Math.random() * this.bubbleLife.length)
      this.bubbleLife[index] = 1.6 + Math.random() * 1.4
      attr.setXYZ(
        index,
        this.swimPos.x + (Math.random() - 0.5) * 0.7,
        this.swimPos.y + 0.25,
        this.swimPos.z + (Math.random() - 0.5) * 0.7,
      )
    }
    for (let i = 0; i < this.bubbleLife.length; i++) {
      if (this.bubbleLife[i] <= 0) continue
      this.bubbleLife[i] -= dt
      let y = attr.getY(i) + dt * (0.55 + (i % 5) * 0.08)
      const x = attr.getX(i) + Math.sin(this.elapsed * 2 + i) * dt * 0.12
      const z = attr.getZ(i) + Math.cos(this.elapsed * 1.7 + i) * dt * 0.12
      if (this.bubbleLife[i] <= 0) y = -999
      attr.setXYZ(i, x, y, z)
    }
    attr.needsUpdate = true
    ;(this.bubblePool.material as THREE.PointsMaterial).opacity =
      0.34 + Math.min(0.3, this.oxygenValue < 30 ? 0.25 : 0.1)
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
    if (store.playerSkin !== this.appliedPlayerSkin) {
      const firstSync = this.appliedPlayerSkin === ''
      this.avatar.setSkin(store.playerSkin)
      this.appliedPlayerSkin = store.playerSkin
      if (!firstSync) store.toast(`已换上 ${playerSkinById(store.playerSkin).name}`, 'gold')
    }
    if (store.playerFaction !== this.appliedFaction) {
      this.appliedFaction = store.playerFaction
      const faction = store.playerFaction ? FACTIONS[store.playerFaction] : null
      this.avatar.setFaction(store.playerFaction)
      this.boat.setFaction(store.playerFaction)
      this.factionAura.setFaction(faction)
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
    this.boat.crewSpeedMul = crewSpeedMul(store.crew)
    this.boat.realmSpeedMul = realmSpeedMul(store.realm)
    this.syncCosmetics(store)
    this.syncSeason(store)
    this.renderer.toneMappingExposure =
      this.world.exposure *
      (1 - this.world.stormStrength * 0.42) *
      (1 - this.world.doomStrength * 0.22)

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
      this.crewSystem.update(dt, time)
      this.avatar.update(dt, this.boat, false, null)
      this.wakeSpray.update(dt)
      this.dragonRace.update(dt, time, 9999, 9999)
      this.updateCamera(dt, false)
      return
    }

    const modal = isModalOpen(store)
    const locked = store.inputLocked
    const ascending = this.gate.isActive || this.crossTimer > 0
    if (
      locked &&
      !this.creatures.introActive &&
      !this.cultivation.tribulating &&
      !ascending &&
      !this.travelTarget
    ) {
      store.setInputLocked(false)
    }

    input.update()
    if (modal || locked) input.clearQueued()

    if (store.respawnToken !== this.lastRespawnToken) {
      this.lastRespawnToken = store.respawnToken
      this.resetToDock()
    }
    if (store.hitAt !== this.lastHitAt) {
      this.lastHitAt = store.hitAt
      if (store.hitAt > 0) this.avatar.hit()
    }

    if (store.underwater) {
      this.updateUnderwater(dt, time, store, modal)
      this.syncCultivation(dt, time, store, modal, false)
      return
    }

    if (this.celestialDoomTimer > 0) {
      this.celestialDoomTimer -= dt
      if (this.celestialDoomTimer <= 0) this.world.setDoom(0)
    }

    if (ascending) {
      this.updateAscension(dt, time)
      return
    }

    this.syncZone(store)

    const fishingPhase = this.fishing.phase
    const fishingBusy = fishingPhase !== 'idle' && fishingPhase !== 'charging'
    const celestial = this.world.isCelestial
    const anchored =
      store.installedFacilities.includes('anchor') && Boolean(store.facilityActive.anchor)
    const allowMove = !modal && !locked && !fishingBusy && !anchored

    let throttle = input.throttle
    let steer = input.steer
    if (!allowMove) throttle = 0
    if (modal || locked || fishingBusy || anchored) steer = 0
    const boost = input.boost && allowMove && !store.underwater

    this.boatSafe.copy(this.boat.position)
    const prevX = this.boat.position.x
    const prevZ = this.boat.position.z
    const prevHeading = this.boat.heading

    this.boat.update(dt, time, this.world, throttle, steer, allowMove, boost)
    this.boat.setNight(
      SEASONS[store.season].period === 'night' || this.world.stormStrength > 0.45,
    )

    if (allowMove && store.boatSkin === 'pirate') {
      const moved = Math.hypot(this.boat.position.x - prevX, this.boat.position.z - prevZ)
      this.sailAccum += moved
      this.sailTimer += dt
      if (this.sailTimer >= 1) {
        if (this.sailAccum > 0.05) {
          gameEvents.emit('boat:sailed', { meters: this.sailAccum, skin: store.boatSkin })
        }
        this.sailAccum = 0
        this.sailTimer = 0
      }
    }

    this.repairTimer -= dt
    if (this.repairTimer <= 0) {
      this.repairTimer = 5
      if (crewRepairsHull(store.crew) && !store.dead && store.hp < maxHpFor(store.realm)) {
        store.healPlayer(2)
      }
    }
    this.crewSystem.update(dt, time)

    // 擂台上的心魔就是唯一目标：像打首领那样自动锁向，否则绕圈的身影根本砍不着
    const duelTarget =
      !store.underwater && store.contest?.phase === 'fighting' ? this.contest.opponentPosition : null
    if (duelTarget) this.combatFaceTarget.copy(duelTarget)
    const bossTarget = store.boss && !store.underwater
      ? this.creatures.bossPosition(store.boss.id, this.combatFaceTarget)
      : duelTarget
    this.combatHasTarget = Boolean(bossTarget)
    this.avatar.group.visible = !store.underwater
    this.avatar.update(dt, this.boat, allowMove && Math.abs(this.boat.speed) > 0.6, bossTarget)

    if (store.boss && !store.combatCamera && !this.autoLockedBossId) {
      const pos = this.creatures.bossPosition(store.boss.id, this.combatFaceTarget)
      if (pos) {
        const distance = Math.hypot(this.boat.position.x - pos.x, this.boat.position.z - pos.z)
        if (distance < 44) {
          this.autoLockedBossId = store.boss.id
          store.setCombatCamera(true)
          store.toast('进入战斗 · 镜头已锁定首领', 'info')
        }
      }
    }
    if (!store.boss) this.autoLockedBossId = ''

    const impact = this.boat.consumeImpact()
    this.impactToastTimer = Math.max(0, this.impactToastTimer - dt)
    if (impact > 0.3) {
      this.world.foam.wake(this.boat.position.x, this.boat.position.z, 1.2 + impact * 0.8)
      if (this.impactToastTimer <= 0) {
        this.impactToastTimer = 1.4
        store.toast('撞上障碍物 · 船身被弹开', 'danger')
      }
      gameEvents.emit('boat:collide', { power: impact })
    }

    if (celestial) {
      this.celestial.setRimTarget(this.boat.group)
      if (this.seaEvents.activeKind) this.seaEvents.cancel()
    } else {
      this.seaEvents.update(dt, time, {
        canSpawn:
          allowMove &&
          !modal &&
          !locked &&
          !store.boss &&
          !store.dead &&
          this.fishing.phase === 'idle',
        sailing: allowMove && Math.abs(this.boat.speed) > 0.9,
        paused: modal || locked,
      })
      this.treasures.updateSurface(dt, time, allowMove && !modal && !locked && !store.dead)
    }

    if (allowMove && !celestial) {
      const locked = canEnterWater(store.boatSkin, this.boat.position.x, this.boat.position.z)
      if (locked) {
        this.boat.position.x = prevX
        this.boat.position.z = prevZ
        this.boat.heading = prevHeading
        this.boat.speed = 0
        this.boat.group.rotation.y = prevHeading
        if (this.lastLockedWater !== locked.id) {
          this.lastLockedWater = locked.id
          store.toast(`${locked.name}需要更高等级的船 · 去船坞升级`, 'danger')
        }
        this.waterWarnT = 3.2
      } else if (this.waterWarnT <= 0) {
        this.lastLockedWater = null
      }
    }
    this.waterWarnT = Math.max(0, this.waterWarnT - dt)

    if (!celestial) {
      this.world.water.setContact(
        0,
        this.boat.position.x,
        this.boat.position.z,
        1.7,
        0.26 + Math.min(0.22, this.boat.speed * 0.035),
      )
    }
    this.fishing.update(dt, time)
    if (!celestial) {
      this.otter.update(
        dt,
        time,
        false,
        this.boat.position,
        this.boat.position,
        store.pet.affection,
        this.boat.heading,
      )
    }
    if (!modal && !this.cultivation.tribulating) {
      this.creatures.update(dt, time, {
        position: this.boat.position,
        underwater: false,
        dead: store.dead,
      })
      if (this.world.depthAt(this.boat.position.x, this.boat.position.z) < 0.9) {
        this.boat.position.x = this.boatSafe.x
        this.boat.position.z = this.boatSafe.z
      }
    }
    this.syncCultivation(dt, time, store, modal, fishingBusy)
    this.world.update(time, dt, this.boat.position)
    this.world.updateFoam(dt)
    this.underwaterWorld.updateAmbient(time, dt, this.boat.position)
    this.celestial.update(dt, time, this.boat.position)
    this.syncFlight(store)
    if (celestial) {
      this.seasonFx.setVisible(false)
    } else {
      this.dockLife.update(time, dt, this.boat.position)
      this.leaves.update(time, dt, this.boat.position)
      this.seasonFx.update(time, dt, this.boat.position)
      this.seasonFx.setVisible(true)
    }
    this.factionAura.update(time, dt, this.auraCenter.set(this.boat.position.x, this.boat.position.y + 0.9, this.boat.position.z))
    this.thunder.update(dt)
    this.thunderCd = Math.max(0, this.thunderCd - dt)
    this.sectHalls.update(time, dt)
    this.contest.ambient(time)
    this.updateContest(dt, time, store)
    if (this.swordFlight) {
      const alt = this.swordFlightAlt()
      if (alt <= 0) this.setSwordFlight(false)
      else this.boat.flyHeight = alt
    }

    this.wakeTimer -= dt
    if (!modal && !locked && allowMove && this.boat.speed > 1.5 && this.wakeTimer <= 0) {
      this.boat.getStern(this.stern)
      this.world.foam.wake(this.stern.x, this.stern.z, 0.7 + this.boat.speed * 0.12)
      if (store.boatSkin === 'pirate') {
        this.boat.getForward(this.forward)
        this.right.set(-this.forward.z, 0, this.forward.x)
        const bowX = this.boat.position.x + this.forward.x * 1.4
        const bowZ = this.boat.position.z + this.forward.z * 1.4
        this.world.foam.wake(
          bowX + this.right.x * 2.1,
          bowZ + this.right.z * 2.1,
          0.45 + this.boat.speed * 0.08,
        )
        this.world.foam.wake(
          bowX - this.right.x * 2.1,
          bowZ - this.right.z * 2.1,
          0.45 + this.boat.speed * 0.08,
        )
      }
      this.wakeTimer = 0.09
    }

    this.rippleTimer -= dt
    if (!modal && allowMove && this.boat.speed > 2.2 && this.rippleTimer <= 0) {
      this.boat.getStern(this.stern)
      this.world.foam.ripple(this.stern.x, this.stern.z, 0.85 + this.boat.speed * 0.05)
      this.rippleTimer = 0.48
    }

    this.boat.getStern(this.stern)
    this.boat.getForward(this.forward)
    this.right.set(-this.forward.z, 0, this.forward.x)
    if (!modal && !locked && allowMove) {
      this.wakeSpray.emit(
        this.stern,
        this.forward,
        this.right,
        Math.abs(this.boat.speed),
        this.boat.boostActive,
        dt,
      )
    }
    this.wakeSpray.update(dt)

    if (!celestial) this.dragonRace.update(dt, time, this.boat.position.x, this.boat.position.z)
    this.raceSyncTimer -= dt
    if (this.raceSyncTimer <= 0) {
      this.raceSyncTimer = 0.12
      const hud = this.dragonRace.active || store.dragonRace
        ? {
            active: this.dragonRace.active,
            passed: this.dragonRace.passed,
            total: this.dragonRace.total,
            timeLeft: Math.ceil(this.dragonRace.timeLeft),
            best: useGameStore.getState().dragonRaceBest,
          }
        : null
      const prev = store.dragonRace
      const changed =
        (!hud && prev) ||
        (hud &&
          (!prev ||
            prev.active !== hud.active ||
            prev.passed !== hud.passed ||
            prev.timeLeft !== hud.timeLeft ||
            prev.best !== hud.best))
      if (changed) store.setDragonRace(hud)
    }

    this.updateWeapon(dt, store, modal, fishingBusy)
    this.updateSearchlight(store)
    this.updateTrawl(dt, store, time)
    this.updateRadar(dt, store)
    this.persistPose(dt, store, allowMove)

    this.updateCamera(dt, false)
    this.updateStatus(dt, modal, false)
    this.updateNav(dt, store)
    if (!locked) {
      this.handleActions(store, modal)
      this.handleCombat(store, modal)
    }
  }

  // ------------------------------------------------------------- 飞升与天界

  /** 渡劫成功后：船头升起通天河道，强制逆流升空 */
  private openAscension() {
    if (this.gate.isActive) return
    const store = useGameStore.getState()
    // 飞升前必须先定仙魔，选定后 UI 会重新敲响这道门
    if (!store.playerFaction) {
      store.openFactionChoice()
      return
    }
    this.fishing.reset()
    this.boat.getForward(this.forward)
    this.gate.start(this.boat.position, this.forward)
    this.ascendT = 0
    this.crossTimer = 0
    this.travelTarget = null
    this.avatar.group.visible = false
    this.seaEvents.cancel()
    this.treasures.clearPrompt()
    store.setUnderwater(false)
    store.setBoss(null)
    store.setInputLocked(true)
    store.setAscension({ phase: 'sailing', progress: 0, altitude: 0 })
    store.toast('天界之门已开 · 逆流而上', 'gold')
  }

  private updateAscension(dt: number, time: number) {
    const store = useGameStore.getState()
    input.clearQueued()

    if (this.crossTimer > 0) {
      this.crossTimer -= dt
      const total = this.crossTotal || 1
      const elapsedRatio = 1 - Math.max(0, this.crossTimer) / total
      this.pushAscensionHud(dt, 'crossing', elapsedRatio)
      this.gate.update(dt, time)
      this.boat.update(dt, time, this.world, 0, 0, false)
      this.crewSystem.update(dt, time)
      this.world.update(time, dt, this.boat.position)
      this.world.updateFoam(dt)
      this.celestial.update(dt, time, this.boat.position)
      this.updateCamera(dt, false)
      if (!this.crossApplied && this.crossTimer <= total * 0.5) {
        this.crossApplied = true
        const target = this.travelTarget ?? 'celestial'
        this.travelTarget = null
        this.applyZone(target)
      }
      if (this.crossTimer <= 0) {
        this.crossApplied = false
        this.crossTotal = 0
        store.setAscension(null)
        store.setInputLocked(false)
        this.avatar.group.visible = !store.underwater
      }
      return
    }

    this.ascendT = Math.min(1, this.ascendT + dt / 9.5)
    this.gate.setProgress(this.ascendT)
    const point = this.gate.pointAt(this.ascendT, this.pathPoint)
    this.boat.position.x = point.x
    this.boat.position.z = point.z
    this.boat.heading = this.gate.heading
    this.boat.speed = 0
    this.world.setHover(point.y - this.world.rawWaveHeight(point.x, point.z, time), true)
    this.boat.update(dt, time, this.world, 0, 0, false)
    this.crewSystem.update(dt, time)
    this.gate.update(dt, time)
    this.world.update(time, dt, this.boat.position)
    this.world.updateFoam(dt)
    this.celestial.update(dt, time, this.boat.position)
    this.updateCamera(dt, false)
    this.pushAscensionHud(dt, 'sailing', this.ascendT)
    if (this.ascendT >= 1) {
      this.crossTimer = 2.1
      this.crossTotal = 2.1
      this.crossApplied = false
      store.toast('云海在脚下合拢 · 天界到了', 'gold')
    }
  }

  private pushAscensionHud(dt: number, phase: 'sailing' | 'crossing', progress: number) {
    this.ascensionHudTimer -= dt
    if (this.ascensionHudTimer > 0) return
    this.ascensionHudTimer = 0.06
    useGameStore.getState().setAscension({
      phase,
      progress,
      altitude: this.world.hoverAltitude,
    })
  }

  /** 快捷键 / 传送阵：在凡间海湾与天界云海之间往返 */
  private beginTravel(to: MapZone) {
    const store = useGameStore.getState()
    if (this.gate.isActive || this.crossTimer > 0) return
    if (to === 'celestial' && !store.ascended) {
      store.toast('凡躯未渡劫 · 天门不开', 'info')
      return
    }
    if (store.mapZone === to) {
      store.toast('已经在这张图上了', 'info')
      return
    }
    if (this.fishing.phase !== 'idle') {
      store.toast('先收线，再踏传送阵', 'info')
      return
    }
    this.travelTarget = to
    this.crossTimer = 1.5
    this.crossTotal = 1.5
    this.crossApplied = false
    store.setInputLocked(true)
    store.setAscension({ phase: 'crossing', progress: 1, altitude: this.world.hoverAltitude })
    store.toast(to === 'celestial' ? '传送阵亮起 · 前往天界' : '传送阵亮起 · 返回凡间', 'gold')
  }

  private applyZone(to: MapZone, immediate = false) {
    const store = useGameStore.getState()
    const celestial = to === 'celestial'
    if (!immediate && store.mapZone === to && this.world.isCelestial === celestial) return
    this.gate.stop()
    this.fishing.reset()
    this.seaEvents.cancel()
    this.treasures.clearPrompt()
    this.seaEvents.setVisible(!celestial)
    this.treasures.setVisible(!celestial)
    store.setMapZone(to)
    this.world.setCelestial(celestial, true)
    this.creatures.setZone(to)
    if (celestial) this.celestial.enter()
    else this.celestial.exit()
    const pose = celestial
      ? { x: CELESTIAL_SPAWN.x, z: CELESTIAL_SPAWN.z, heading: 0 }
      : { x: SPAWN.x, z: SPAWN.z, heading: SPAWN.heading }
    this.boat.position.set(pose.x, 0, pose.z)
    this.boat.heading = pose.heading
    this.boat.speed = 0
    this.boat.group.rotation.set(0, pose.heading, 0)
    this.world.setHover(0, true)
    this.boat.update(0, this.elapsed, this.world, 0, 0, false)
    this.swimPos.set(pose.x, -1.8, pose.z)
    this.swimVel.set(0, 0, 0)
    this.otter.group.visible = !celestial
    this.dockLife.group.visible = !celestial
    this.dragonRace.group.visible = !celestial
    this.sectHalls.setVisible(celestial)
    if (!celestial) this.setSwordFlight(false)
    if (!celestial && this.contest.active) {
      this.contest.end()
      store.setContest(null)
    }
    this.contest.setZoneVisible(celestial)
    this.leaves.setVisible(!celestial)
    this.seasonFx.setVisible(!celestial)
    this.avatar.group.visible = true
    this.captureFish = null
    this.lastLockedWater = null
    this.autoLockedBossId = ''
    this.ascendT = 0
    this.flightHover = 0
    store.setBoss(null)
    store.setRadarContacts([])
    store.setUnderwater(false)
    store.setZone(celestial ? '天界云海' : '老码头')
    store.setBoatPose({ x: pose.x, z: pose.z, heading: pose.heading })
    store.setCombatCamera(false)
    this.updateCamera(1, true)
    this.camPos.copy(this.camera.position)
    this.camera.getWorldDirection(this.viewDir)
    this.camLook.copy(this.camera.position).addScaledVector(this.viewDir, 6)
    gameEvents.emit('zone:changed', { zone: to })
    if (!immediate) {
      store.toast(
        celestial ? '天界云海 · 仙气裹住船身' : '回到凡间海湾 · 潮声依旧',
        'gold',
      )
    }
  }

  private syncZone(store: ReturnType<typeof useGameStore.getState>) {
    if (store.mapZone !== (this.world.isCelestial ? 'celestial' : 'mortal')) {
      this.applyZone(store.mapZone)
    }
  }

  /** 仙舟不沾水：航速越快，离云面越高 */
  private syncFlight(store: ReturnType<typeof useGameStore.getState>) {
    const flying = store.mapZone === 'celestial' && boatCanFly(store.boatSkin)
    const target = flying ? 2.4 + Math.min(4.2, Math.abs(this.boat.speed) * 0.62) : 0
    this.flightHover += (target - this.flightHover) * 0.08
    this.world.setHover(this.flightHover)
  }

  /** 《御剑飞行》：踏剑离水，凡间海域也能凌空虚渡 */
  private setSwordFlight(on: boolean) {
    this.swordFlight = on
    this.boat.flyHeight = on ? this.swordFlightAlt() : 0
  }

  private swordFlightAlt() {
    const store = useGameStore.getState()
    const level = equippedLevel(store, 'swordflight')
    const def = techniqueById('swordflight')
    return level > 0 && def ? techniqueValue(def, level) : 0
  }

  private toggleSwordFlight(store: ReturnType<typeof useGameStore.getState>) {
    if (!hasTechnique(store, 'swordflight')) {
      store.toast('尚未修习《御剑飞行》· 去宗门山门求法', 'info')
      return
    }
    const next = !this.swordFlight
    this.setSwordFlight(next)
    store.toast(
      next ? `御剑腾空 · 凌虚 ${this.swordFlightAlt().toFixed(1)} 丈` : '收剑落水 · 船身重新压住浪头',
      next ? 'gold' : 'info',
    )
    audio.snap()
  }

  /** 《天雷引》：朝准星指向的水面降雷，雷域内的鱼尽数麻倒进篓 */
  private castThunderLure(store: ReturnType<typeof useGameStore.getState>) {
    if (store.underwater) {
      store.toast('雷法要引天上的雷 · 先浮回水面', 'info')
      return
    }
    const level = equippedLevel(store, 'thunderlure')
    const def = techniqueById('thunderlure')
    if (!def || level <= 0) {
      store.toast('尚未修习《天雷引》· 去仙宗雷堂求法', 'info')
      return
    }
    if (this.fishing.phase !== 'idle') {
      store.toast('先收线，再引天雷', 'info')
      return
    }
    if (this.thunderCd > 0) {
      store.toast(`雷池尚未蓄满 · 还需 ${this.thunderCd.toFixed(1)} 秒`, 'info')
      return
    }

    const radius = techniqueValue(def, level)
    this.camera.getWorldDirection(this.viewDir)
    this.viewDir.y = 0
    if (this.viewDir.lengthSq() < 0.0001) this.boat.getForward(this.viewDir)
    this.viewDir.normalize()
    const reach = clamp(14 + Math.abs(this.boat.speed) * 2.2, 14, 36)
    const center = this.thunderTarget
      .copy(this.boat.position)
      .addScaledVector(this.viewDir, reach)

    this.thunder.strike(center, radius, 3)
    this.world.foam.splash(center.x, center.z, radius * 1.3, 2.2)
    this.world.foam.ripple(center.x, center.z, radius * 0.9)
    this.world.flashLightning(1.1)
    audio.thunder()
    this.thunderCd = 9

    const boltDamage = Math.round(
      24 * realmAttackMul(store.realm) * factionOf(store.playerFaction).attackMul,
    )
    const stunned = this.creatures.aoeHit(center, radius, boltDamage, 2.4, '天雷引')
    const scorched = this.contest.strike(center, radius, boltDamage)

    let bagged = 0
    const capacity = bagCapacity(store)
    for (const fish of this.underwaterWorld.catchableFish()) {
      if (store.bag.length >= capacity) break
      const p = fish.group.position
      if (Math.hypot(p.x - center.x, p.z - center.z) > radius) continue
      if (!this.thunderBagFish(fish)) continue
      bagged += 1
    }

    gameEvents.emit('thunderlure:strike', {
      x: center.x,
      z: center.z,
      radius,
      catches: bagged,
    })
    const total = bagged + stunned
    if (scorched) this.contestFeedback()
    store.toast(
      scorched
        ? `天雷落处 · 心魔被劈掉 ${boltDamage} 点道行`
        : total > 0
          ? `天雷落处 · 麻倒 ${total} 条，${bagged} 条直接进篓`
          : `天雷劈开水面 · 雷域 ${radius.toFixed(0)} 丈内空空如也`,
      scorched || total > 0 ? 'gold' : 'info',
    )
  }

  /** 雷域里的鱼没有挣扎的机会 */
  private thunderBagFish(fish: { group: THREE.Group; def: FishDef }) {
    const store = useGameStore.getState()
    const caught = createCatch(fish.def, 'net')
    if (!store.addCatch(caught, 'net')) return false
    this.underwaterWorld.removeFish(fish.group)
    store.setCaptureResult([caught])
    this.world.foam.splash(fish.group.position.x, fish.group.position.z, 4, 0.9)
    audio.caught()

    const blessing = fishingBlessing(store)
    if (blessing.absorbMul > 0) {
      const xp = Math.round(FISH_XP_BY_RARITY[caught.rarity] * blessing.absorbMul)
      if (store.gainCultivation(xp, '吸星大法')) store.toast('修为圆满 · 可渡下一次天劫', 'gold')
    }
    return true
  }

  /** 报名即被光幕卷上擂台：一局定胜负 */
  private startContest() {
    const store = useGameStore.getState()
    if (this.contest.active) return
    if (!store.playerFaction) {
      store.toast('尚未转职 · 无从代表宗门出战', 'info')
      return
    }
    if (this.gate.isActive || this.crossTimer > 0) return
    this.fishing.reset()
    this.seaEvents.cancel()
    this.setSwordFlight(false)
    store.setBoss(null)
    store.setUnderwater(false)
    this.boat.position.set(CONTEST_POINT.x, 0, CONTEST_POINT.z - 9)
    this.boat.heading = Math.PI
    this.boat.speed = 0
    this.boat.group.rotation.set(0, Math.PI, 0)
    this.contest.begin({ realm: store.realm, faction: store.playerFaction })
    this.contestEnterT = 2.8
    this.contestClock = 150
    store.setContest({
      phase: 'entering',
      opponent: this.contest.opponentName,
      faction: this.contest.opponentFaction,
      hp: this.contest.opponentHp,
      maxHp: this.contest.opponentMaxHp,
      seconds: this.contestClock,
      reward: null,
    })
    this.updateCamera(1, true)
  }

  /** 结算：胜则发贡献与宝箱，负则倒扣并送出场外 */
  private finishContest(won: boolean) {
    const store = useGameStore.getState()
    const opponent = this.contest.opponentName
    this.contest.freeze()
    let reward: string | null = null
    if (won) {
      const gained = 90 + store.realm * 30
      const roll = Math.random()
      if (roll < 0.4) {
        store.absorbCore('大比宝箱 · 龙筋内丹', 0)
        reward = `宗门贡献 +${gained} · 宝箱开出一枚内丹`
      } else if (roll < 0.75) {
        store.grantJade(18 + store.realm * 4, '大比宝箱 · 仙玉盈匣')
        reward = `宗门贡献 +${gained} · 宝箱开出仙玉`
      } else {
        store.addRelic('大比宝箱 · 玄冰鱼饵')
        reward = `宗门贡献 +${gained} · 宝箱稀有材料入囊`
      }
      store.grantContribution(gained, `力压心魔 · 贡献 +${gained}`)
    } else {
      const penalty = Math.min(store.contribution, 30 + store.realm * 6)
      if (penalty > 0) {
        store.spendContribution(penalty)
        reward = `倒扣宗门贡献 ${penalty} · 心魔未除`
      } else {
        reward = '贡献本就见底 · 只当挨了一场闷棍'
      }
    }
    store.recordContestResult(won, opponent)
    store.setContest({
      phase: won ? 'won' : 'lost',
      opponent,
      faction: this.contest.opponentFaction,
      hp: this.contest.opponentHp,
      maxHp: this.contest.opponentMaxHp,
      seconds: Math.round(this.contestClock),
      reward,
    })
  }

  /** 结算界面点「离场」：输赢都送回接引仙阵外 */
  private leaveContest() {
    const store = useGameStore.getState()
    this.contest.end()
    store.setContest(null)
    this.boat.position.set(CELESTIAL_SPAWN.x, 0, CELESTIAL_SPAWN.z)
    this.boat.speed = 0
    this.boat.group.rotation.set(0, 0, 0)
    this.updateCamera(1, true)
    if (!store.dead) store.healPlayer(Math.round(maxHpFor(store.realm) * 0.35))
    store.toast('光幕散去 · 擂台重归寂静', 'info')
  }

  /** 打中心魔：血条当场更新，镜像脚下炸开一团云气 */
  private contestFeedback() {
    const store = useGameStore.getState()
    const hud = store.contest
    if (!hud || hud.phase !== 'fighting') return
    store.setContest({ ...hud, hp: this.contest.opponentHp, maxHp: this.contest.opponentMaxHp })
    const mirror = this.contest.opponentPosition
    if (mirror) this.celestial.burst(mirror, 12)
  }

  private updateContest(dt: number, time: number, store: ReturnType<typeof useGameStore.getState>) {
    if (!this.contest.active) return
    const hud = store.contest
    if (!hud) return

    if (hud.phase === 'entering') {
      this.contestEnterT -= dt
      this.contest.update(dt, time, this.boat.position)
      if (this.contestEnterT <= 0) {
        store.setContest({ ...hud, phase: 'fighting' })
        store.toast(`${this.contest.opponentName}出手了 · 别客气`, 'danger')
      }
      return
    }

    if (hud.phase !== 'fighting') {
      this.contest.update(dt, time, this.boat.position)
      return
    }

    // 战斗中翻开背包/图鉴等于把擂台暂停，镜像不会趁你低头时下黑手
    if (store.underwater || isModalOpen(store)) return

    this.contestClock = Math.max(0, this.contestClock - dt)
    const tick = this.contest.update(dt, time, this.boat.position)

    if (tick.damage > 0) {
      const faction = factionOf(store.playerFaction)
      if (faction.dodgeChance > 0 && Math.random() < faction.dodgeChance) {
        store.toast(`${tick.label}扑了个空 · 仙诀闪避`, 'gold')
      } else {
        const dmg = Math.max(1, Math.round(tick.damage * faction.hurtMul))
        const left = store.hp - dmg
        // 擂台判负不走普通死亡：渔获不掉，只把人打到悬一线
        if (left <= 0) {
          store.setHp(1)
          this.finishContest(false)
          return
        }
        store.setHp(left)
        store.toast(
          `${tick.label}造成 ${dmg} 点伤害 · 生命 ${left}/${maxHpFor(store.realm)}`,
          'danger',
        )
      }
    }

    if (this.contest.opponentHp <= 0) {
      this.finishContest(true)
      return
    }
    if (this.contestClock <= 0) {
      // 时限到，按剩余生命判定胜负
      this.finishContest(this.contest.opponentHp / this.contest.opponentMaxHp < store.hp / maxHpFor(store.realm))
      return
    }

    this.contestHudTimer -= dt
    if (this.contestHudTimer <= 0) {
      this.contestHudTimer = 0.2
      store.setContest({
        ...hud,
        hp: this.contest.opponentHp,
        maxHp: this.contest.opponentMaxHp,
        seconds: Math.ceil(this.contestClock),
      })
    }
  }

  private onCelestialSummon(x: number, z: number) {
    const store = useGameStore.getState()
    this.boat.getForward(this.forward)
    this.pathPoint.set(x, this.world.waveHeight(x, z, this.elapsed), z)
    this.celestial.burst(this.pathPoint, 26)
    // 结界把场外雷暴挡在光幕之外，否则一场大比会被天雷金鳗直接判死
    if (this.contest.active) {
      store.toast('雷云劈在光幕上 · 擂台不接场外伤害', 'info')
      return
    }
    this.world.setDoom(0.6)
    this.celestialDoomTimer = 4.5
    store.damagePlayer(14, '天雷金鳗引来的雷暴')
    store.toast('雷云压顶 · 天雷在云海里翻涌', 'danger')
  }

  private syncCultivation(
    dt: number,
    time: number,
    store: ReturnType<typeof useGameStore.getState>,
    modal: boolean,
    fishingBusy: boolean,
  ) {
    const player = this.cultPlayer
    if (store.underwater) {
      player.position.copy(this.swimPos)
      this.boat.getForward(player.forward)
    } else {
      player.position.copy(this.boat.position)
      this.boat.getForward(player.forward)
    }
    player.underwater = store.underwater
    player.busy = modal || store.dead || store.inputLocked || fishingBusy
    this.cultivation.update(dt, time, player)
  }

  private enterUnderwater() {
    this.lastUnderwater = true
    this.oxygenValue = 100
    this.swimVel.set(0, 0, 0)
    input.clear()
    input.setLookEnabled(true)
    useGameStore.getState().setCombatCamera(false)
    this.avatar.group.visible = false
    gameEvents.emit('underwater:enter', { at: Date.now() })

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
    this.avatar.group.visible = true
    useGameStore.getState().setCaptureTarget(null)
    this.treasures.clearPrompt()
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
    const locked = store.inputLocked
    this.boat.update(dt, time, this.world, 0, 0, false)
    this.boat.setNight(
      SEASONS[store.season].period === 'night' || this.world.stormStrength > 0.45,
    )
    this.world.water.setContact(
      0,
      this.boat.position.x,
      this.boat.position.z,
      1.7,
      0.26 + Math.min(0.22, this.boat.speed * 0.035),
    )
    this.world.updateFoam(dt)
    this.underwaterWorld.update(time, dt, this.swimPos)
    this.updateBubbles(dt, true)
    this.otter.update(
      dt,
      time,
      true,
      this.boat.position,
      this.swimPos,
      store.pet.affection,
      this.swimYaw + Math.PI,
    )
    this.captureCooldown = Math.max(0, this.captureCooldown - dt)
    this.trapClock += dt
    this.syncTraps(store)
    this.collectNearbyTraps(store)
    this.treasures.updateUnderwater(dt, time, this.swimPos, store)
    this.seasonFx.setVisible(false)
    this.leaves.setVisible(false)

    if (!modal && !store.dead) {
      this.underwaterAccum += dt
      if (this.underwaterAccum >= 1) {
        gameEvents.emit('underwater:time', { seconds: Math.floor(this.underwaterAccum) })
        this.underwaterAccum -= Math.floor(this.underwaterAccum)
      }
    }
    this.repairTimer -= dt
    if (this.repairTimer <= 0) {
      this.repairTimer = 5
      if (crewRepairsHull(store.crew) && !store.dead && store.hp < maxHpFor(store.realm)) {
        store.healPlayer(2)
      }
    }
    this.crewSystem.update(dt, time)

    const mode = store.underwaterMode
    const look = input.consumeLook()
    if (mode === 'dive') {
      this.swimYaw += look.dx * 0.0032
      this.swimPitch = clamp(this.swimPitch - look.dy * 0.0032, -1.15, 1.15)
      this.moveDiver(dt, modal || locked)
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

    if (!modal) {
      this.creatures.update(dt, time, {
        position: this.swimPos,
        underwater: true,
        dead: store.dead,
      })
    }
    this.updateWeapon(dt, store, modal, false)
    this.updateSearchlight(store)
    this.updateTrawl(dt, store, time)
    this.updateRadar(dt, store)

    this.hudTimer -= dt
    if (this.hudTimer <= 0) {
      this.hudTimer = 0.12
      store.setDepth(clamp(-this.camera.position.y, 0, MAX_WATER_DEPTH))
      this.updateCaptureAim(store)
    }

    if (!modal) {
      const drain =
        (mode === 'dive' ? (input.sprint ? 3.1 : 1.55) : mode === 'follow' ? 1.05 : 0.9) *
        crewOxygenMul(store.crew)
      this.oxygenValue = Math.max(0, this.oxygenValue - drain * dt)
      store.setOxygen(this.oxygenValue)
      if (this.oxygenValue <= 0) {
        store.setUnderwater(false)
        store.toast('氧气耗尽，你被浪头推回了水面', 'danger')
        return
      }
    }

    this.updateStatus(dt, modal, true)
    this.updateNav(dt, store)
    if (!locked) {
      this.handleUnderwaterActions(store, modal)
      this.handleCombat(store, modal)
    }
  }

  private moveDiver(dt: number, modal: boolean) {
    const throttle = modal ? 0 : input.throttle
    const steer = modal ? 0 : input.steer
    const vertical = modal ? 0 : input.vertical
    const moving = Math.abs(throttle) + Math.abs(steer) + Math.abs(vertical) > 0.01
    const sprint = input.sprint && moving
    const speed = sprint ? 8.6 : 4.8
    const cosPitch = Math.cos(this.swimPitch)
    const sinPitch = Math.sin(this.swimPitch)
    const sin = Math.sin(this.swimYaw)
    const cos = Math.cos(this.swimYaw)

    // Look-relative 3D swim: W follows the camera pitch, A/D strafe on the horizontal plane.
    const targetX = (sin * cosPitch * throttle - cos * steer) * speed
    const targetZ = (cos * cosPitch * throttle + sin * steer) * speed
    const targetY = sinPitch * throttle * speed + vertical * (sprint ? 4.9 : 3.3)
    const buoyancy = Math.abs(vertical) < 0.01 ? 0.22 : 0

    const accel = 1 - Math.exp(-dt * (sprint ? 7.5 : 5))
    const lift = 1 - Math.exp(-dt * 3.4)
    this.swimVel.x += (targetX - this.swimVel.x) * accel
    this.swimVel.z += (targetZ - this.swimVel.z) * accel
    this.swimVel.y += (targetY + buoyancy - this.swimVel.y) * lift

    const nextX = clamp(this.swimPos.x + this.swimVel.x * dt, -WORLD_HALF + 5, WORLD_HALF - 5)
    const nextZ = clamp(this.swimPos.z + this.swimVel.z * dt, -WORLD_HALF + 5, WORLD_HALF - 5)
    if (this.world.depthAt(nextX, nextZ) > 0.55) {
      this.swimPos.x = nextX
      this.swimPos.z = nextZ
    } else {
      this.swimVel.x *= 0.2
      this.swimVel.z *= 0.2
    }

    const floor = this.world.depthAt(this.swimPos.x, this.swimPos.z)
    const surface = Math.min(-0.45, this.world.waveHeight(this.swimPos.x, this.swimPos.z, this.elapsed) - 0.4)
    const bottom = -Math.max(0.9, floor - 0.8)
    this.swimPos.y += this.swimVel.y * dt
    if (this.swimPos.y <= bottom) {
      this.swimPos.y = bottom
      this.swimVel.y = Math.max(0, this.swimVel.y)
    } else if (this.swimPos.y >= surface) {
      this.swimPos.y = surface
      this.swimVel.y = Math.min(0, this.swimVel.y)
    }
    // Gentle drag keeps the floaty buoyancy from building up speed.
    this.swimVel.multiplyScalar(Math.exp(-dt * 0.6))
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
    const store = useGameStore.getState()
    if (store.combatCamera && !store.boss) store.setCombatCamera(false)

    const forward = this.boat.getForward(this.forward)
    const back = this.back.copy(forward).negate()
    const right = this.right.set(-forward.z, 0, forward.x)
    const portrait = this.camera.aspect < 0.85
    let targetFov = portrait ? 58 : 48

    if (this.creatures.introActive && !store.underwater) {
      const focus = this.creatures.introFocus(this.combatTarget)
      const angle = Math.atan2(this.boat.position.x - focus.x, this.boat.position.z - focus.z)
      this.desired.set(
        focus.x + Math.sin(angle) * 20,
        Math.max(this.boat.position.y + 1.2, 8.8),
        focus.z + Math.cos(angle) * 20,
      )
      this.lookTarget.set(focus.x, Math.max(focus.y + 2.4, 0.8), focus.z)
      targetFov = portrait ? 66 : 56
    } else if (store.combatCamera && store.boss && !store.underwater) {
      const bossPos = this.creatures.bossPosition(store.boss.id, this.combatTarget)
      if (bossPos) {
        // Over-the-shoulder rig: sit behind the avatar, offset to the right, and look at the boss.
        const head = this.avatar.getHeadPosition(this.combatFaceTarget)
        const dx = head.x - bossPos.x
        const dz = head.z - bossPos.z
        const len = Math.max(6, Math.hypot(dx, dz))
        const nx = dx / len
        const nz = dz / len
        const shoulder = 0.9 + Math.max(0, this.boat.cameraScale - 1) * 1.2
        const sideX = -nz
        const sideZ = nx
        const backDist = 4.4 + Math.min(3.4, len * 0.05) + Math.max(0, this.boat.cameraScale - 1) * 3
        this.desired.set(
          head.x + nx * backDist + sideX * shoulder,
          head.y + 1.35 + Math.min(2.6, len * 0.05),
          head.z + nz * backDist + sideZ * shoulder,
        )
        this.lookTarget.copy(bossPos)
        this.lookTarget.y += 2.2 + Math.min(2.2, len * 0.04)
        targetFov = portrait ? 62 : 55
      } else {
        this.chaseTarget(portrait)
      }
    } else {
      this.chaseTarget(portrait)
    }

    if (immediate) {
      this.camPos.copy(this.desired)
      this.camLook.copy(this.lookTarget)
    } else {
      this.camPos.lerp(this.desired, 1 - Math.exp(-dt * 3.2))
      this.camLook.lerp(this.lookTarget, 1 - Math.exp(-dt * 4.6))
    }

    this.camera.position.copy(this.camPos)
    const shake = this.cultivation.cameraShake
    if (shake > 0.001) {
      this.camera.position.x += (Math.random() - 0.5) * shake * 0.9
      this.camera.position.y += (Math.random() - 0.5) * shake * 0.62
      this.camera.position.z += (Math.random() - 0.5) * shake * 0.9
    }
    this.camera.lookAt(this.camLook)

    if (Math.abs(this.camera.fov - targetFov) > 0.01) {
      this.camera.fov = THREE.MathUtils.damp(this.camera.fov, targetFov, 4, dt)
      this.camera.updateProjectionMatrix()
    }
  }

  private chaseTarget(portrait: boolean) {
    const forward = this.boat.getForward(this.forward)
    const right = this.right.set(-forward.z, 0, forward.x)
    const scale = this.boat.cameraScale
    this.desired
      .copy(this.boat.position)
      .addScaledVector(forward, -9.8 * scale)
      .addScaledVector(right, 4.2 * Math.min(scale, 1.2))
    this.desired.y = this.boat.position.y + (portrait ? 6.6 : 5.7) * scale
    this.lookTarget
      .copy(this.boat.position)
      .addScaledVector(forward, 2.6 * scale)
      .addScaledVector(right, 0.7 * scale)
    this.lookTarget.y += 0.95 * scale
  }

  private resolveInteract(store: ReturnType<typeof useGameStore.getState>) {
    if (store.underwater || this.fishing.phase !== 'idle') return null
    const boat = this.boat.position
    if (this.world.isCelestial) {
      const sect = this.sectHalls.nearestGate(boat)
      if (sect) {
        const elder = SECT_ELDERS[sect.faction]
        const allowed = sect.faction === store.playerFaction
        return {
          kind: 'sect' as const,
          id: sect.faction,
          prompt: allowed
            ? `${elder.role} · ${elder.name}在门前等你`
            : '山门光幕横亘 · 异宗门人不得擅入',
          label: allowed ? '入宗' : null,
        }
      }
      const merchant = this.celestial.merchantPosition
      const merchantDistance = Math.hypot(boat.x - merchant.x, boat.z - merchant.z)
      if (merchantDistance < 13) {
        return {
          kind: 'merchant' as const,
          id: null,
          prompt: '仙舟商舶 · 以天界渔换取仙舟云梭',
          label: '交易',
        }
      }
      const gate = this.celestial.gatePosition
      const gateDistance = Math.hypot(boat.x - gate.x, boat.z - gate.z)
      if (gateDistance < 15) {
        return {
          kind: 'portal' as const,
          id: null,
          prompt: '接引仙阵 · 传送回凡间海湾',
          label: '传送',
        }
      }
      const core = this.cultivation.nearestCore(boat)
      if (core) {
        return {
          kind: 'core' as const,
          id: null,
          prompt: `吸收${core.name} · 修为 +${core.xp}`,
          label: '吸收',
        }
      }
      const harvest = this.creatures.nearestHarvest(boat)
      if (harvest && harvest.distance < 20) {
        return {
          kind: 'harvest' as const,
          id: harvest.id,
          prompt: `收获 ${harvest.name} · 战利品 ¥${harvest.value}`,
          label: '收获',
        }
      }
      return null
    }
    const seaEvent = this.seaEvents.interactInfo()
    if (seaEvent) {
      return { kind: 'seaevent' as const, id: null, prompt: seaEvent.prompt, label: seaEvent.label }
    }
    const salvage = this.treasures.salvageInfo(boat)
    if (salvage) {
      return { kind: 'salvage' as const, id: null, prompt: salvage, label: '打捞' }
    }
    const core = this.cultivation.nearestCore(boat)
    if (core) {
      return {
        kind: 'core' as const,
        id: null,
        prompt: `吸收${core.name} · 修为 +${core.xp}`,
        label: '吸收',
      }
    }
    const harvest = this.creatures.nearestHarvest(boat)
    if (harvest && harvest.distance < 20) {
      return {
        kind: 'harvest' as const,
        id: harvest.id,
        prompt: `收获 ${harvest.name} · 战利品 ¥${harvest.value}`,
        label: '收获',
      }
    }
    const npc = this.dockLife.nearestNpc(boat)
    const fireDistance = this.dockLife.campfireDistance(boat)
    const nearFire = fireDistance < CAMPFIRE_RADIUS
    if (npc && (!nearFire || npc.distance <= fireDistance)) {
      return { kind: 'npc' as const, id: npc.id, prompt: `${npc.name} 似乎在等你搭话`, label: '交谈' }
    }
    if (nearFire) {
      return { kind: 'campfire' as const, id: null, prompt: '篝火 · 架起铁锅煮鱼', label: '烹饪' }
    }
    const distance = Math.hypot(boat.x - DOCK_POINT.x, boat.z - DOCK_POINT.z)
    if (distance < SELL_RADIUS) {
      if (store.bag.length === 0) {
        return {
          kind: 'market' as const,
          id: null,
          prompt: '鱼篓还是空的，划出去试试手气',
          label: null,
        }
      }
      const total = store.bag.reduce((sum, c) => sum + c.value, 0)
      return {
        kind: 'market' as const,
        id: null,
        prompt: `出售 ${store.bag.length} 条渔获 · ¥${total}`,
        label: '卖鱼',
      }
    }
    return null
  }

  private updateStatus(dt: number, modal: boolean, underwater: boolean) {
    this.statusTimer -= dt
    if (this.statusTimer > 0) return
    this.statusTimer = 0.25

    const store = useGameStore.getState()
    const zone = this.world.isCelestial
      ? '天界云海'
      : zoneAt(this.boat.position.x, this.boat.position.z)
    if (zone !== this.lastZone) {
      this.lastZone = zone
      store.setZone(zone)
    }

    const info = modal ? null : this.resolveInteract(store)
    const prompt = info?.prompt ?? null
    const label = info?.label ?? null
    const nearDock = info?.kind === 'market' && store.bag.length > 0
    if (nearDock !== this.lastNearDock) {
      this.lastNearDock = nearDock
      store.setNearDock(nearDock)
    }
    if (prompt !== this.lastPrompt) {
      this.lastPrompt = prompt
      store.setPrompt(prompt)
    }
    if (label !== store.interactLabel) store.setInteractLabel(label)
  }

  private resetToDock() {
    input.clear()
    this.cultivation.abort()
    this.gate.stop()
    this.crossTimer = 0
    this.crossTotal = 0
    this.crossApplied = false
    this.ascendT = 0
    this.travelTarget = null
    this.setSwordFlight(false)
    this.thunderCd = 0
    this.avatar.group.visible = true
    useGameStore.getState().setAscension(null)
    this.boat.position.set(SPAWN.x, 0, SPAWN.z)
    this.boat.heading = SPAWN.heading
    this.boat.speed = 0
    this.boat.group.rotation.set(0, SPAWN.heading, 0)
    this.swimPos.set(SPAWN.x, -1.8, SPAWN.z)
    this.swimVel.set(0, 0, 0)
    this.captureFish = null
    this.captureCooldown = 0
    this.updateCamera(1, true)
    this.camPos.copy(this.camera.position)
    this.camera.getWorldDirection(this.viewDir)
    this.camLook.copy(this.camera.position).addScaledVector(this.viewDir, 6)
    const store = useGameStore.getState()
    store.setBoatPose({ x: SPAWN.x, z: SPAWN.z, heading: SPAWN.heading })
    store.setBoss(null)
    store.setRadarContacts([])
    store.setInputLocked(false)
    store.setCombatCamera(false)
    this.lastLockedWater = null
    this.ropeT = 0
    this.rope.visible = false
    this.seaEvents.cancel()
    this.treasures.clearPrompt()
  }

  private updateWeapon(
    dt: number,
    store: ReturnType<typeof useGameStore.getState>,
    modal: boolean,
    fishingBusy: boolean,
  ) {
    this.weaponCooldown = Math.max(0, this.weaponCooldown - dt)
    this.attackAnim = Math.max(0, this.attackAnim - dt)
    this.switchAnim = Math.max(0, this.switchAnim - dt)
    this.muzzleT = Math.max(0, this.muzzleT - dt)
    this.tracerT = Math.max(0, this.tracerT - dt)
    this.muzzleFlash.visible = this.muzzleT > 0
    this.tracer.visible = this.tracerT > 0
    this.ropeT = Math.max(0, this.ropeT - dt)
    this.rope.visible = this.ropeT > 0
    if (this.rope.visible) this.updateRope()

    if (store.equippedWeapon !== this.lastWeaponId) {
      this.lastWeaponId = store.equippedWeapon
      this.switchAnim = 0.3
    }

    const active =
      store.started && !modal && !store.dead && !fishingBusy && !store.underwater
        ? true
        : store.started && !modal && !store.dead && store.underwater
    const thirdPerson = store.combatCamera && Boolean(store.boss) && !store.underwater
    this.weaponRig.visible = active && !thirdPerson
    if (!active || thirdPerson) return

    const isGun = store.equippedWeapon === 'speargun'
    this.knifeModel.visible = !isGun
    this.gunModel.visible = isGun

    const raise = this.switchAnim > 0 ? 1 - this.switchAnim / 0.3 : 1
    const bob = Math.sin(this.elapsed * 1.9) * 0.007 + Math.sin(this.elapsed * 4.3) * 0.003
    const sway = Math.cos(this.elapsed * 1.35) * 0.006
    this.weaponRig.position.set(
      0.32 + sway,
      -0.28 + bob - (1 - Math.min(1, raise * 1.8)) * 0.24,
      -0.62,
    )
    const recoil = this.attackAnim > 0 ? Math.sin((1 - this.attackAnim / 0.28) * Math.PI) : 0
    if (isGun) {
      this.gunModel.position.z = -0.2 + recoil * 0.07
      this.gunModel.rotation.x = 0.02 + recoil * 0.16
    } else {
      this.knifeModel.rotation.z = -0.16 - recoil * 0.75
      this.knifeModel.rotation.y = 0.12 + recoil * 0.35
      this.knifeModel.position.z = -0.12 - recoil * 0.16
    }
  }

  private updateSearchlight(store: ReturnType<typeof useGameStore.getState>) {
    const on =
      !store.underwater &&
      store.installedFacilities.includes('searchlight') &&
      Boolean(store.facilityActive.searchlight)
    this.lightBeam.visible = on
    this.searchlight.visible = on
    if (!on) {
      this.searchlight.intensity = 0
      return
    }
    const fwd = this.boat.getForward(this.forward)
    this.searchlight.position
      .copy(this.boat.position)
      .addScaledVector(fwd, -0.6)
      .setY(this.boat.position.y + 2.3)
    this.searchlightTarget.position
      .copy(this.boat.position)
      .addScaledVector(fwd, 28)
      .setY(0)
    this.searchlight.intensity = 320
  }

  private updateTrawl(
    dt: number,
    store: ReturnType<typeof useGameStore.getState>,
    time: number,
  ) {
    const active =
      !store.underwater &&
      store.activeTool === 'net' &&
      store.toolVariants.net === 'trawl'
    this.trawlNet.visible = active
    if (!active) {
      this.trawlTimer = 0
      return
    }
    const mesh = this.trawlNet.children[0] as THREE.Mesh
    const position = mesh.geometry.getAttribute('position') as THREE.BufferAttribute
    const base = this.trawlBase.getAttribute('position') as THREE.BufferAttribute
    for (let i = 0; i < position.count; i++) {
      const x = base.getX(i)
      const y = base.getY(i)
      const z = base.getZ(i)
      position.setZ(i, z + Math.sin(time * 5 + x * 2.4 + y * 1.6) * 0.09)
    }
    position.needsUpdate = true

    if (this.boat.speed < 1.2) return
    if (store.bag.length >= bagCapacity(store)) return
    if (store.tools.net.wear <= 0) return
    this.trawlTimer -= dt
    if (this.trawlTimer > 0) return
    this.trawlTimer = 4.4

    const stats = toolStats('net', store.tools.net.level)
    const variant = variantById('trawl')
    if (!variant) return
    const stern = this.boat.getStern(this.stern)
    const depth = this.world.depthAt(stern.x, stern.z)
    if (depth < 1.4) return
    if (Math.random() > 0.72) {
      store.toast('拖网从鱼群边擦过，什么都没兜到', 'info')
      return
    }
    const def = pickFish(depth, {
      season: store.season,
      period: SEASONS[store.season].period,
      bait: store.baitId,
      baitWear: store.baitWear,
      zone: waterAt(stern.x, stern.z)?.id ?? null,
    })
    const caught = this.scaleCatch(createCatch(def, 'net'), variant.valueMul)
    if (useGameStore.getState().addCatch(caught, 'net')) {
      store.wearTool('net', stats.wear * 0.32)
      store.toast(`拖网带回 ${def.name}`, 'gold')
      this.world.foam.wake(stern.x, stern.z, 1.2)
      audio.splash(0.35)
    }
  }

  private updateRadar(dt: number, store: ReturnType<typeof useGameStore.getState>) {
    this.radarTimer -= dt
    if (this.radarTimer > 0) return
    this.radarTimer = 0.65
    if (!store.installedFacilities.includes('fishfinder')) {
      if (store.radarContacts.length) store.setRadarContacts([])
      return
    }
    const origin = store.underwater ? this.swimPos : this.boat.position
    const heading = store.underwater ? this.swimYaw : this.boat.heading
    const sin = Math.sin(heading)
    const cos = Math.cos(heading)
    const contacts = this.creatures.contacts(origin)
    for (const contact of contacts) {
      const dx = contact.x - origin.x
      const dz = contact.z - origin.z
      contact.bearing = Math.atan2(dx * cos - dz * sin, -dx * sin - dz * cos)
    }
    const fishContacts = this.underwaterWorld
      .catchableFish()
      .map((fish) => {
        const dx = fish.group.position.x - origin.x
        const dz = fish.group.position.z - origin.z
        const distance = Math.hypot(dx, dz)
        return {
          dx,
          dz,
          distance,
          def: fish.def,
          y: fish.group.position.y,
        }
      })
      .filter((fish) => fish.distance < 58)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 7)
      .map((fish, index) => ({
        id: `fish-${index}`,
        x: origin.x + fish.dx,
        z: origin.z + fish.dz,
        depth: -fish.y,
        kind: 'fish' as const,
        label: fish.def.name,
        distance: fish.distance,
        bearing: Math.atan2(fish.dx * cos - fish.dz * sin, -fish.dx * sin - fish.dz * cos),
      }))
    store.setRadarContacts(
      [...contacts, ...fishContacts].sort((a, b) => a.distance - b.distance).slice(0, 12),
    )
  }

  private updateNav(dt: number, store: ReturnType<typeof useGameStore.getState>) {
    this.navTimer -= dt
    if (this.navTimer > 0) return
    this.navTimer = 0.14
    const underwater = store.underwater
    store.setNav({
      px: underwater ? this.swimPos.x : this.boat.position.x,
      pz: underwater ? this.swimPos.z : this.boat.position.z,
      heading: underwater ? this.swimYaw + Math.PI : this.boat.heading,
      underwater,
      boatX: this.boat.position.x,
      boatZ: this.boat.position.z,
      boatHeading: this.boat.heading,
      boss: this.creatures.navBoss(),
      npcs: this.dockLife.npcPositions(),
    })
  }

  private persistPose(
    dt: number,
    store: ReturnType<typeof useGameStore.getState>,
    allowMove: boolean,
  ) {
    this.poseTimer -= dt
    if (this.poseTimer > 0) return
    this.poseTimer = 4
    if (!allowMove) return
    const pose = store.boatPose
    if (
      pose &&
      Math.hypot(pose.x - this.boat.position.x, pose.z - this.boat.position.z) < 1.5 &&
      Math.abs(pose.heading - this.boat.heading) < 0.08
    ) {
      return
    }
    store.setBoatPose({
      x: this.boat.position.x,
      z: this.boat.position.z,
      heading: this.boat.heading,
    })
  }

  private scaleCatch(catchItem: Catch, mul: number) {
    if (mul >= 1) return catchItem
    return {
      ...catchItem,
      value: Math.max(1, Math.round(catchItem.value * mul)),
      unitPrice: Math.max(1, Math.round(catchItem.unitPrice * mul)),
    }
  }

  private handleCombat(
    store: ReturnType<typeof useGameStore.getState>,
    modal: boolean,
  ) {
    if (modal) return

    if (input.consumeKnife()) this.attackMelee()
    if (input.consumeGun()) this.attackRanged()

    if (input.consumeSkillWater()) this.cultivation.castWater(this.cultPlayer)
    if (input.consumeSkillSword()) this.cultivation.castSword(this.cultPlayer)

    if (input.consumeThunder()) this.castThunderLure(store)
    if (input.consumeFlight()) this.toggleSwordFlight(store)

    if (input.consumeAnchor()) {
      if (!store.installedFacilities.includes('anchor')) {
        store.toast('船上还没有锚，去船坞装一个', 'info')
      } else {
        store.toggleFacility('anchor')
      }
    }

    if (input.consumeLight()) {
      if (!store.installedFacilities.includes('searchlight')) {
        store.toast('先给船装一盏探照灯', 'info')
      } else {
        store.toggleFacility('searchlight')
      }
    }

    if (input.consumeGrill()) {
      if (store.underwater) {
        store.toast('浮回水面再开烤架', 'info')
      } else {
        store.grillCatch()
      }
    }

    if (input.consumeVariant()) store.cycleToolVariant()
  }

  private findBoatFish(range: number, minDot: number) {
    const store = useGameStore.getState()
    if (store.underwater) return null
    this.camera.getWorldDirection(this.viewDir)
    this.viewDir.y = 0
    if (this.viewDir.lengthSq() < 0.0001) return null
    this.viewDir.normalize()
    const origin = this.boat.position
    let best: { group: THREE.Group; def: FishDef; distance: number } | null = null
    let bestScore = -Infinity
    for (const fish of this.underwaterWorld.catchableFish()) {
      const dx = fish.group.position.x - origin.x
      const dz = fish.group.position.z - origin.z
      const distance = Math.hypot(dx, dz)
      if (distance < 0.6 || distance > range) continue
      const dot = (dx * this.viewDir.x + dz * this.viewDir.z) / distance
      if (dot < minDot) continue
      const score = dot * 3 - distance / Math.max(1, range)
      if (score > bestScore) {
        bestScore = score
        best = { group: fish.group, def: fish.def, distance }
      }
    }
    return best
  }

  private catchSurfaceFish(
    fish: { group: THREE.Group; def: FishDef },
    chance: number,
  ) {
    const store = useGameStore.getState()
    const capacity = bagCapacity(store)
    if (store.bag.length >= capacity) {
      store.toast('鱼篓满了，先回码头卸货', 'danger')
      return false
    }
    const x = fish.group.position.x
    const z = fish.group.position.z
    if (Math.random() > chance) {
      this.underwaterWorld.startleFish(fish.group)
      this.world.foam.splash(x, z, 3, 0.55)
      audio.splash(0.32)
      store.toast(`${fish.def.name}一摆尾钻进深水`, 'info')
      return false
    }
    const caught = createCatch(fish.def, 'harpoon')
    if (!useGameStore.getState().addCatch(caught, 'harpoon')) return false
    this.underwaterWorld.removeFish(fish.group)
    useGameStore.getState().setCaptureResult([caught])
    this.world.foam.splash(x, z, 4, 0.75)
    this.world.foam.ripple(x, z, 2.2)
    audio.caught()
    return true
  }

  /** 魔道吸血：命中才回血，向上取整保证一刀至少回 1 点 */
  private applyLeech(amount: number, label: string) {
    if (amount <= 0) return
    const store = useGameStore.getState()
    if (store.hp >= maxHpFor(store.realm)) return
    const healed = Math.min(Math.max(1, Math.round(amount)), maxHpFor(store.realm) - store.hp)
    store.healPlayer(healed)
    store.toast(`${label} · 生命 +${healed}`, 'gold')
  }

  private attackMelee() {
    const store = useGameStore.getState()
    const def = weaponById('knife')
    if (!def || store.dead || this.weaponCooldown > 0) return
    if (!store.ownedWeapons.includes('knife')) {
      store.toast('还没有渔刀，去渔具铺买一把', 'info')
      return
    }
    if (store.equippedWeapon !== 'knife') store.equipWeapon('knife')
    this.weaponCooldown = def.cooldown
    this.attackAnim = 0.28
    this.avatar.slash()
    this.camera.getWorldDirection(this.viewDir)
    const isOnBoat = !store.underwater
    const origin = isOnBoat ? this.boat.position.clone() : this.camera.position.clone()
    if (isOnBoat) {
      if (this.combatHasTarget) {
        this.avatar.getHeadPosition(origin)
        this.viewDir.copy(this.combatFaceTarget).sub(origin)
        this.viewDir.y = Math.max(-0.05, this.viewDir.y * 0.25)
        this.viewDir.normalize()
      } else {
        // Horizontal aim so the blade sweeps along the water surface from the deck.
        this.viewDir.y = 0
        this.viewDir.normalize()
        origin.y += 0.4
      }
    }
    const range = isOnBoat ? def.range + 4.6 : def.range
    const faction = factionOf(store.playerFaction)
    const damage = Math.round(
      def.damage * crewDamageMul(store.crew) * realmAttackMul(store.realm) * faction.attackMul,
    )
    const hits = this.creatures.meleeHit(origin, this.viewDir, range, damage)
    this.seaEvents.strike(origin, this.viewDir, range, damage)
    if (hits) this.applyLeech(damage * faction.lifesteal, '渔刀饮血')
    if (this.contest.strike(origin, range, damage, this.viewDir)) {
      this.applyLeech(damage * faction.lifesteal, '一刀斩向心魔')
      this.contestFeedback()
    }
    if (isOnBoat && !hits && !this.contest.active) {
      const fish = this.findBoatFish(range, 0.1)
      if (fish) this.catchSurfaceFish(fish, 0.62)
    }
    audio.snap()
  }

  private attackRanged() {
    const store = useGameStore.getState()
    const def = weaponById('speargun')
    if (!def || store.dead || this.weaponCooldown > 0) return
    if (!store.ownedWeapons.includes('speargun')) {
      store.toast('还没有鱼枪，去渔具铺买一把', 'info')
      return
    }
    if (store.equippedWeapon !== 'speargun') store.equipWeapon('speargun')
    if (!store.consumeAmmo('speargun')) return
    this.weaponCooldown = def.cooldown
    this.attackAnim = 0.28
    this.avatar.slash()
    this.camera.getWorldDirection(this.viewDir)
    const isOnBoat = !store.underwater
    const origin = this.camera.position.clone()
    if (isOnBoat && this.combatHasTarget) {
      this.avatar.getHeadPosition(origin)
      this.viewDir.copy(this.combatFaceTarget).sub(origin)
      this.viewDir.y = Math.max(-0.02, this.viewDir.y * 0.3)
      this.viewDir.normalize()
    }
    const faction = factionOf(store.playerFaction)
    const damage = Math.round(
      def.damage * crewDamageMul(store.crew) * realmAttackMul(store.realm) * faction.attackMul,
    )
    const hit = this.creatures.rayHit(origin, this.viewDir, def.range, damage)
    this.seaEvents.strike(origin, this.viewDir, def.range, damage)
    const pierced = this.contest.strike(origin, def.range, damage, this.viewDir)
    if (hit) this.applyLeech(damage * faction.lifesteal, '鱼枪饮血')
    if (hit) {
      this.showSpearRope(hit.point)
      this.flashMuzzle(hit.point)
      audio.snap()
      return
    }
    if (pierced) {
      this.applyLeech(damage * faction.lifesteal, '一枪钉穿心魔')
      const mirror = this.contest.opponentPosition
      if (mirror) {
        this.showSpearRope(mirror, 0.6)
        this.flashMuzzle(mirror)
      }
      this.contestFeedback()
      audio.snap()
      return
    }
    if (isOnBoat && !this.contest.active) {
      const fish = this.findBoatFish(def.range, 0.7)
      if (fish) {
        this.showSpearRope(fish.group.position, 0.6)
        this.flashMuzzle(fish.group.position)
        this.catchSurfaceFish(fish, 0.95)
        audio.snap()
        return
      }
    }
    const end = origin.addScaledVector(this.viewDir, def.range)
    this.flashMuzzle(end)
    audio.snap()
  }

  private flashMuzzle(end: THREE.Vector3) {
    const tip = this.muzzle.getWorldPosition(new THREE.Vector3())
    this.muzzleT = 0.07
    this.muzzleFlash.visible = true
    this.muzzleFlash.scale.setScalar(1 + Math.random() * 0.6)
    const attr = this.tracer.geometry.getAttribute('position') as THREE.BufferAttribute
    attr.setXYZ(0, tip.x, tip.y, tip.z)
    attr.setXYZ(1, end.x, end.y, end.z)
    attr.needsUpdate = true
    this.tracerT = 0.09
    this.tracer.visible = true
  }

  private showSpearRope(end: THREE.Vector3, hold = 0.55) {
    this.ropeEnd.copy(end)
    this.ropeHold = hold
    this.ropeT = hold
    this.rope.visible = true
  }

  private updateRope() {
    this.muzzle.getWorldPosition(this.ropeStart)
    const attr = this.rope.geometry.getAttribute('position') as THREE.BufferAttribute
    const age = 1 - this.ropeT / this.ropeHold
    const sag = 0.12 + Math.sin(Math.min(Math.PI, age * Math.PI * 1.4)) * 0.3
    const wobble = Math.sin(age * 46) * 0.035 * (1 - age)
    for (let i = 0; i <= this.ropeSegments; i++) {
      const t = i / this.ropeSegments
      const curve = Math.sin(Math.PI * t)
      attr.setXYZ(
        i,
        THREE.MathUtils.lerp(this.ropeStart.x, this.ropeEnd.x, t),
        THREE.MathUtils.lerp(this.ropeStart.y, this.ropeEnd.y, t) - curve * (sag + wobble),
        THREE.MathUtils.lerp(this.ropeStart.z, this.ropeEnd.z, t),
      )
    }
    attr.needsUpdate = true
    const material = this.rope.material as THREE.LineBasicMaterial
    material.opacity = 0.9 * Math.min(1, this.ropeT / 0.2)
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

    if (input.consumeSkin()) {
      if (this.fishing.phase === 'idle') {
        store.setSkinShopOpen(true)
      } else {
        store.toast('先收线，再进皮肤商店', 'info')
      }
    }

    if (input.consumeDive()) {
      if (store.boss) {
        store.toggleCombatCamera()
      } else if (this.world.isCelestial) {
        store.toast('天界只有云海 · 不必下潜', 'info')
      } else if (this.fishing.phase === 'idle') {
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

    if (input.consumeAchievements()) {
      store.toggleAchievements()
    }

    if (input.consumeCrew()) {
      store.setCrewOpen(true)
    }

    if (input.consumeZone()) {
      this.beginTravel(this.world.isCelestial ? 'mortal' : 'celestial')
    }

    if (input.consumeTool()) {
      if (
        !this.cultivation.absorbNearestCore(this.boat.position) &&
        this.fishing.phase === 'waiting'
      ) {
        this.fishing.twitch()
      }
    }

    if (input.consumeInteract()) {
      const info = this.resolveInteract(store)
      if (!info) {
        if (skillUnlocked(SKILLS[1], store.realm)) this.cultivation.castFire(this.cultPlayer)
        return
      }
      if (info.kind === 'sect') {
        if (this.fishing.phase !== 'idle') {
          store.toast('先收线，再入山门', 'info')
          return
        }
        if (info.id !== store.playerFaction) {
          store.toast('这道山门只渡自己门人 · 请回吧', 'danger')
          return
        }
        store.setSectAt(info.id as FactionId)
        return
      }
      if (info.kind === 'merchant') {
        if (this.fishing.phase !== 'idle') {
          store.toast('先收线，再与船灵交易', 'info')
          return
        }
        store.setShopOpen(true)
        return
      }
      if (info.kind === 'portal') {
        this.beginTravel(this.world.isCelestial ? 'mortal' : 'celestial')
        return
      }
      if (info.kind === 'seaevent') {
        this.seaEvents.interact()
        return
      }
      if (info.kind === 'salvage') {
        this.treasures.salvageNearest(store)
        return
      }
      if (info.kind === 'core') {
        this.cultivation.absorbNearestCore(this.boat.position)
        return
      }
      if (info.kind === 'harvest' && info.id) {
        this.creatures.harvestBoss(info.id, this.boat.position)
        return
      }
      if (info.kind === 'npc' && info.id) {
        store.openNpc(info.id)
        return
      }
      if (info.kind === 'campfire') {
        if (this.fishing.phase !== 'idle') {
          store.toast('先收线，再开火做饭', 'info')
          return
        }
        store.setCookingOpen(true)
        return
      }
      if (info.kind === 'market') {
        if (store.bag.length > 0) store.openMarket()
        else store.toast('鱼篓是空的，先去钓几条鱼吧')
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

    if (input.consumeSkin()) {
      store.toast('先浮回水面，再进皮肤商店', 'info')
    }

    if (input.consumeDive()) {
      store.setUnderwater(false)
      return
    }
    if (input.consumeTool()) {
      if (!this.treasures.tryOpenChest(this.swimPos, store)) store.cycleUnderwaterMode()
    }
    if (input.consumeBait()) {
      store.setBaitOpen(true)
    }
    if (input.consumeSeason()) {
      store.setSeasonOpen(true)
    }

    if (input.consumeAchievements()) {
      store.toggleAchievements()
    }

    if (input.consumeCrew()) {
      store.setCrewOpen(true)
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
    const variant =
      tool === 'harpoon' || tool === 'net'
        ? variantById(store.toolVariants[tool])
        : undefined
    const stats = variantStats(toolStats(tool, state.level), variant)
    const fish = this.findAimFish(stats.range)
    this.captureFish = fish
    const wearOk = state.wear > 0
    const ammoOk =
      !variant || variant.ammoMax === 0 || (store.variantAmmo[variant.id] ?? 0) > 0
    const capacity = bagCapacity(store)
    if (tool === 'trap') {
      store.setCaptureTarget({
        label: wearOk ? '布设鱼笼' : '鱼笼已损坏',
        distance: 0,
        ready: wearOk && this.captureCooldown <= 0,
      })
      return
    }
    if (!fish) {
      store.setCaptureTarget(
        variant && variant.damage >= 20
          ? {
              label: `${variant.name} · 对海怪开火`,
              distance: 0,
              ready: wearOk && ammoOk && this.captureCooldown <= 0,
            }
          : null,
      )
      return
    }
    store.setCaptureTarget({
      defId: fish.def.id,
      label: fish.def.name,
      distance: fish.distance,
      ready:
        wearOk &&
        ammoOk &&
        this.captureCooldown <= 0 &&
        fish.distance <= stats.range &&
        store.bag.length < capacity,
    })
  }

  private fireCapture(store: ReturnType<typeof useGameStore.getState>) {
    const tool = store.activeTool
    const def = toolById(tool)
    const state = store.tools[tool]
    const variant =
      tool === 'harpoon' || tool === 'net'
        ? variantById(store.toolVariants[tool])
        : undefined
    const stats = variantStats(toolStats(tool, state.level), variant)
    if (!def) return
    if (state.wear <= 0) {
      store.toast(`${def.name}已经损坏，回码头找阿岚修理`, 'danger')
      return
    }
    if (this.captureCooldown > 0) return
    const capacity = bagCapacity(store)
    if (store.bag.length >= capacity) {
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
      if (variant && variant.damage >= 20) {
        if (variant.ammoMax > 0 && !store.consumeVariantAmmo(variant.id)) return
        this.camera.getWorldDirection(this.viewDir)
        const center = this.camera.position
          .clone()
          .addScaledVector(this.viewDir, Math.min(stats.range, 14))
        this.captureCooldown = stats.cooldown
        store.wearTool(tool, stats.wear)
        this.flashMuzzle(center)
        const hits = this.creatures.aoeHit(
          center,
          tool === 'net' ? stats.radius : 4.5,
          variant.damage,
          variant.id === 'abyssNet' ? 3 : 0,
        )
        this.world.foam.splash(center.x, center.z, 5, 0.8)
        audio.splash(0.7)
        if (!hits) store.toast(`${variant.name}炸开一片水花，没有命中`, 'info')
        return
      }
      store.toast('准星里没有鱼，再游近一点', 'info')
      return
    }
    if (variant && variant.ammoMax > 0 && !store.consumeVariantAmmo(variant.id)) return
    this.captureCooldown = stats.cooldown
    store.wearTool(tool, stats.wear)

    if (tool === 'harpoon') {
      const depth = this.world.depthAt(fish.group.position.x, fish.group.position.z)
      let chance = toolCaptureChance('harpoon', fish.def, state.level, depth)
      if (variant?.drag) chance = Math.min(0.98, chance + 0.16)
      if (variant && variant.damage >= 20) {
        this.creatures.aoeHit(fish.group.position, 4.5, variant.damage)
        this.world.foam.splash(fish.group.position.x, fish.group.position.z, 6, 1)
      }
      if (variant?.drag) {
        this.flashMuzzle(fish.group.position)
        this.showSpearRope(fish.group.position, 0.7)
      }
      if (Math.random() <= chance) {
        const caught = this.scaleCatch(createCatch(fish.def, 'harpoon'), variant?.valueMul ?? 1)
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
    if (variant && variant.damage >= 20) {
      this.creatures.aoeHit(center, stats.radius, variant.damage, variant.id === 'abyssNet' ? 3 : 0)
      this.world.foam.ripple(center.x, center.z, stats.radius * 0.8)
      this.flashMuzzle(center)
    }
    const slots = Math.max(0, bagCapacity(store) - store.bag.length)
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
      const caught = this.scaleCatch(createCatch(target.def, 'net'), variant?.valueMul ?? 1)
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
    this.rope.geometry.dispose()
    ;(this.rope.material as THREE.Material).dispose()
    this.creatures.dispose()
    this.cultivation.dispose()
    this.dockLife.dispose(this.scene)
    this.crewSystem.dispose()
    this.seaEvents.dispose()
    this.treasures.dispose()
    this.avatar.dispose()
    this.wakeSpray.dispose()
    this.dragonRace.dispose()
    this.unsubAscension?.()
    this.unsubSummon?.()
    this.unsubRegister?.()
    this.unsubLeaveContest?.()
    this.celestial.dispose()
    this.sectHalls.dispose()
    this.thunder.dispose()
    this.contest.dispose()
    this.gate.dispose()
    this.achievements.dispose()
    this.post.dispose()
    this.seasonFx.dispose()
    this.factionAura.dispose()
    this.underwaterWorld.dispose()
    this.leaves.dispose()
    this.renderer.dispose()
  }
}
