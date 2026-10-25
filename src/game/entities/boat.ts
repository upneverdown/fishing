import * as THREE from 'three'
import type { World } from '@/game/world/world'
import { SPAWN } from '@/game/world/worldMap'
import { clamp } from '@/game/utils/math'
import {
  BOAT_STYLES,
  DECORATIONS,
  ROD_SKINS,
  isDecoration,
  type BoatSkinId,
  type DecorationId,
  type RodSkinId,
} from '@/game/shop/catalog'

const hullMat = new THREE.MeshStandardMaterial({ color: '#8a5a37', roughness: 0.9, flatShading: true })
const hullInnerMat = new THREE.MeshStandardMaterial({ color: '#6b4526', roughness: 0.95, flatShading: true })
const trimMat = new THREE.MeshStandardMaterial({ color: '#c9945e', roughness: 0.85, flatShading: true })
const strawMat = new THREE.MeshStandardMaterial({ color: '#d8b978', roughness: 0.95, flatShading: true })
const postMat = new THREE.MeshStandardMaterial({ color: '#5b3f28', roughness: 1, flatShading: true })
const jacketMat = new THREE.MeshStandardMaterial({ color: '#bd6d44', roughness: 0.92, flatShading: true })
const skinMat = new THREE.MeshStandardMaterial({ color: '#e6b78c', roughness: 0.9 })

const speedHullMat = new THREE.MeshStandardMaterial({
  color: '#e4ede8',
  roughness: 0.48,
  metalness: 0.12,
  flatShading: true,
})
const speedDeckMat = new THREE.MeshStandardMaterial({
  color: '#c3d4cf',
  roughness: 0.72,
  flatShading: true,
})
const speedAccentMat = new THREE.MeshStandardMaterial({
  color: '#1f8a80',
  roughness: 0.5,
  metalness: 0.2,
  flatShading: true,
})
const glassMat = new THREE.MeshStandardMaterial({
  color: '#b8e6e0',
  roughness: 0.12,
  metalness: 0.3,
  transparent: true,
  opacity: 0.42,
})
const steelMat = new THREE.MeshStandardMaterial({
  color: '#93a6ad',
  roughness: 0.52,
  metalness: 0.35,
  flatShading: true,
})
const navyMat = new THREE.MeshStandardMaterial({
  color: '#3d525c',
  roughness: 0.7,
  metalness: 0.2,
  flatShading: true,
})
const patrolDeckMat = new THREE.MeshStandardMaterial({
  color: '#b6c2c3',
  roughness: 0.8,
  flatShading: true,
})
const subHullMat = new THREE.MeshStandardMaterial({
  color: '#2c3c40',
  roughness: 0.58,
  metalness: 0.25,
  flatShading: true,
})
const subDeckMat = new THREE.MeshStandardMaterial({
  color: '#1d2b2e',
  roughness: 0.85,
  flatShading: true,
})
const brassMat = new THREE.MeshStandardMaterial({
  color: '#d8b45a',
  roughness: 0.4,
  metalness: 0.55,
  flatShading: true,
})
const iceHullMat = new THREE.MeshStandardMaterial({
  color: '#31434c',
  roughness: 0.62,
  metalness: 0.3,
  flatShading: true,
})
const iceDeckMat = new THREE.MeshStandardMaterial({
  color: '#c9d8dc',
  roughness: 0.78,
  flatShading: true,
})
const iceAccentMat = new THREE.MeshStandardMaterial({
  color: '#e07a3f',
  roughness: 0.55,
  metalness: 0.15,
  flatShading: true,
})
const goldMat = new THREE.MeshStandardMaterial({
  color: '#d6a84a',
  roughness: 0.35,
  metalness: 0.6,
  flatShading: true,
})
const flagMat = new THREE.MeshStandardMaterial({
  color: '#e3554a',
  roughness: 0.85,
  side: THREE.DoubleSide,
  flatShading: true,
})
const ropeMat = new THREE.MeshStandardMaterial({ color: '#3a2a1c', roughness: 1 })
const bulbMat = new THREE.MeshStandardMaterial({
  color: '#ffe7b3',
  emissive: '#ffcf7a',
  emissiveIntensity: 1.6,
  roughness: 0.4,
})
const pirateHullMat = new THREE.MeshStandardMaterial({
  color: '#181a1f',
  roughness: 0.58,
  metalness: 0.24,
  flatShading: true,
})
const pirateDeckMat = new THREE.MeshStandardMaterial({
  color: '#3a2b21',
  roughness: 0.94,
  flatShading: true,
})
const pirateTrimMat = new THREE.MeshStandardMaterial({
  color: '#6b4726',
  roughness: 0.86,
  flatShading: true,
})
const sailMat = new THREE.MeshStandardMaterial({
  color: '#c9bfa8',
  roughness: 0.96,
  side: THREE.DoubleSide,
  flatShading: true,
})
const boneMat = new THREE.MeshStandardMaterial({
  color: '#e9e2cd',
  roughness: 0.72,
  flatShading: true,
})
const pirateLanternMat = new THREE.MeshStandardMaterial({
  color: '#ffca70',
  emissive: '#ff9d3c',
  emissiveIntensity: 1.8,
  roughness: 0.35,
})

function tatteredSail(width: number, height: number) {
  const shape = new THREE.Shape()
  shape.moveTo(-width / 2, 0)
  shape.lineTo(width / 2, 0)
  shape.lineTo(width / 2, -height * 0.68)
  const steps = 6
  for (let i = 1; i <= steps; i++) {
    const t = i / steps
    const dip = i % 2 === 0 ? 0.04 : 0.2
    shape.lineTo(width / 2 - width * t, -height * (0.68 + dip))
  }
  shape.lineTo(-width / 2, -height * 0.68)
  shape.closePath()
  return new THREE.ShapeGeometry(shape)
}

function limb(from: THREE.Vector3, to: THREE.Vector3, radius: number, material: THREE.Material) {
  const dir = to.clone().sub(from)
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.82, radius, dir.length(), 5),
    material,
  )
  mesh.position.copy(from).addScaledVector(dir, 0.5)
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize())
  mesh.castShadow = true
  return mesh
}

type Vec3 = [number, number, number]

interface BoatLayout {
  angler: Vec3
  rod: Vec3
  creel: Vec3
  creelVisible: boolean
  lantern: Vec3
  flag: Vec3
  figurehead: Vec3
  crate: Vec3
  garland: { x: number; y: number; zFrom: number; zTo: number }
  shadow: [number, number]
}

const LAYOUTS: Record<BoatSkinId, BoatLayout> = {
  rowboat: {
    angler: [0, 0, 0.58],
    rod: [0.46, 0.86, -0.28],
    creel: [-0.48, 0.5, 0.72],
    creelVisible: true,
    lantern: [0, 0.75, -1.78],
    flag: [0, 0.52, 1.42],
    figurehead: [0, 0.5, -1.98],
    crate: [0.52, 0.48, 1.16],
    garland: { x: 0.8, y: 0.66, zFrom: -1.2, zTo: 1.25 },
    shadow: [2.9, 4.9],
  },
  speedboat: {
    angler: [0, 0.18, 1.2],
    rod: [0.4, 1.0, 1.55],
    creel: [-0.5, 0.6, 1.8],
    creelVisible: true,
    lantern: [0, 0.82, -2.2],
    flag: [0, 0.58, 2.16],
    figurehead: [0, 0.6, -2.56],
    crate: [0.48, 0.6, 1.92],
    garland: { x: 0.9, y: 0.64, zFrom: -1.4, zTo: 2.0 },
    shadow: [2.5, 5.6],
  },
  patrol: {
    angler: [0, 0.18, 1.7],
    rod: [0.42, 1.06, 1.92],
    creel: [-0.56, 0.72, 2.0],
    creelVisible: true,
    lantern: [0, 0.8, -2.7],
    flag: [0, 0.62, 2.32],
    figurehead: [0, 0.7, -2.82],
    crate: [0.56, 0.7, 2.18],
    garland: { x: 1.0, y: 0.76, zFrom: -2.1, zTo: 2.2 },
    shadow: [3.0, 5.9],
  },
  submarine: {
    angler: [0.36, 0.32, 1.42],
    rod: [0.56, 1.2, -0.65],
    creel: [-0.44, 0.78, 1.55],
    creelVisible: true,
    lantern: [0, 1.46, 0.18],
    flag: [0, 0.84, 1.95],
    figurehead: [0, 0.64, -2.3],
    crate: [0.5, 0.8, 1.55],
    garland: { x: 0.62, y: 1.35, zFrom: -0.5, zTo: 0.85 },
    shadow: [2.2, 5.2],
  },
  icebreaker: {
    angler: [0, 0.2, 1.9],
    rod: [0.46, 1.08, 2.1],
    creel: [-0.6, 0.74, 2.2],
    creelVisible: true,
    lantern: [0, 0.92, -2.8],
    flag: [0, 0.66, 2.48],
    figurehead: [0, 0.74, -3.05],
    crate: [0.6, 0.74, 2.3],
    garland: { x: 1.08, y: 0.82, zFrom: -2.2, zTo: 2.3 },
    shadow: [3.3, 6.6],
  },
  pirate: {
    angler: [0, 0.38, 1.42],
    rod: [0.5, 1.24, -0.3],
    creel: [-0.58, 1.0, 1.46],
    creelVisible: true,
    lantern: [0, 1.6, 2.86],
    flag: [0, 1.34, 2.36],
    figurehead: [0, 1.02, -3.02],
    crate: [0.62, 0.9, 1.66],
    garland: { x: 1.22, y: 0.98, zFrom: -2.35, zTo: 2.55 },
    shadow: [4.0, 8.0],
  },
}

export class Boat {
  readonly group = new THREE.Group()
  speed = 0
  heading = SPAWN.heading
  rodLoad = 0
  crewSpeedMul = 1
  stormSpeedMul = 1

  private crewDeck: {
    y: number
    halfWidth: number
    halfLength: number
    crewZ: [number, number]
  } = { y: 0.14, halfWidth: 0.4, halfLength: 0.95, crewZ: [-1.35, -0.2] }

  private hullGroup = new THREE.Group()
  private oarLeft: THREE.Group | null = null
  private oarRight: THREE.Group | null = null
  private rowPhase = 0
  private rodTipObject = new THREE.Object3D()
  private rodPivot = new THREE.Group()
  private stern = new THREE.Object3D()
  private bobPhase = Math.random() * Math.PI * 2

  private anglerGroup = new THREE.Group()
  private creelGroup = new THREE.Group()
  private lanternGroup = new THREE.Group()
  private shadowMesh!: THREE.Mesh
  private decorations = new Map<DecorationId, THREE.Object3D>()
  private garlandBulbs: THREE.Mesh[] = []
  private garlandCords: THREE.Mesh[] = []

  private rodMaterial!: THREE.MeshStandardMaterial
  private gripMaterial!: THREE.MeshStandardMaterial
  private reelMaterial!: THREE.MeshStandardMaterial
  private accentMaterial!: THREE.MeshStandardMaterial

  private skinId: BoatSkinId = 'rowboat'
  private layout = LAYOUTS.rowboat
  private speedMul = 1
  private turnMul = 1
  private bobMul = 1
  private accelMul = 1
  private camScale = 1
  private hullHalfWidth = 0
  private hullHalfLength = 0
  private builtSkin: BoatSkinId | null = null
  private night = false
  private pirateLanternLight: THREE.PointLight | null = null
  private pirateLanternGlow: THREE.MeshStandardMaterial | null = null
  private pirateSails: THREE.Mesh[] = []

  constructor(scene: THREE.Scene) {
    this.group.add(this.hullGroup)
    this.buildRod()
    this.buildAngler()
    this.buildCreel()
    this.buildLantern()
    this.buildDecorations()
    this.buildShadow()

    this.stern.position.set(0, 0.3, 1.5)
    this.group.add(this.stern)

    this.setBoatSkin('rowboat')
    this.setRodSkin('classic')
    this.setDecorations([])

    this.group.position.set(SPAWN.x, 0, SPAWN.z)
    this.group.rotation.y = this.heading
    scene.add(this.group)
  }

  setBoatSkin(id: BoatSkinId) {
    const style = BOAT_STYLES.find((s) => s.id === id) ?? BOAT_STYLES[0]
    this.skinId = style.id
    this.layout = LAYOUTS[style.id]
    this.speedMul = style.speed
    this.turnMul = style.turn
    const feel = {
      rowboat: { bob: 1.35, accel: 0.82 },
      speedboat: { bob: 1.0, accel: 1.22 },
      patrol: { bob: 0.62, accel: 0.94 },
      submarine: { bob: 0.48, accel: 1.0 },
      icebreaker: { bob: 0.42, accel: 0.78 },
      pirate: { bob: 0.86, accel: 0.72 },
    }[style.id]
    this.bobMul = feel.bob
    this.accelMul = feel.accel
    this.camScale = style.id === 'pirate' ? 1.36 : 1
    this.hullHalfWidth = style.id === 'pirate' ? 1.42 : 0
    this.hullHalfLength = style.id === 'pirate' ? 3.15 : 0
    this.crewDeck = {
      rowboat: { y: 0.14, halfWidth: 0.4, halfLength: 0.95, crewZ: [-1.35, -0.2] as [number, number] },
      speedboat: { y: 0.5, halfWidth: 0.48, halfLength: 1.1, crewZ: [-0.85, 0.85] as [number, number] },
      patrol: { y: 0.66, halfWidth: 0.7, halfLength: 1.65, crewZ: [-1.25, 1.25] as [number, number] },
      submarine: { y: 0.84, halfWidth: 0.48, halfLength: 1.2, crewZ: [-0.9, 0.9] as [number, number] },
      icebreaker: { y: 0.7, halfWidth: 0.78, halfLength: 1.85, crewZ: [-1.4, 1.4] as [number, number] },
      pirate: { y: 0.78, halfWidth: 0.92, halfLength: 2.2, crewZ: [-1.75, 1.75] as [number, number] },
    }[style.id]

    if (this.builtSkin !== style.id) {
      this.rebuildHull(style.id)
      this.builtSkin = style.id
    }
    this.applyLayout()
  }

  setRodSkin(id: RodSkinId) {
    const skin = ROD_SKINS.find((s) => s.id === id) ?? ROD_SKINS[0]
    this.rodMaterial.color.set(skin.rod)
    this.rodMaterial.emissive.set(skin.glow)
    this.rodMaterial.emissiveIntensity = skin.glowIntensity * 0.25
    this.gripMaterial.color.set(skin.grip)
    this.reelMaterial.color.set(skin.reel)
    this.accentMaterial.color.set(skin.accent)
    this.accentMaterial.emissive.set(skin.glow)
    this.accentMaterial.emissiveIntensity = skin.glowIntensity
  }

  setDecorations(ids: readonly string[]) {
    const active = new Set(ids.filter(isDecoration))
    for (const deco of DECORATIONS) {
      const group = this.decorations.get(deco.id)
      if (group) group.visible = active.has(deco.id)
    }
  }

  private rebuildHull(id: BoatSkinId) {
    for (const child of [...this.hullGroup.children]) {
      this.hullGroup.remove(child)
      child.traverse((obj) => {
        if (obj instanceof THREE.Mesh) obj.geometry.dispose()
      })
    }
    this.oarLeft = null
    this.oarRight = null
    this.pirateLanternLight = null
    this.pirateLanternGlow = null
    this.pirateSails = []

    if (id === 'rowboat') this.buildRowboat()
    else if (id === 'speedboat') this.buildSpeedboat()
    else if (id === 'patrol') this.buildPatrolBoat()
    else if (id === 'icebreaker') this.buildIcebreaker()
    else if (id === 'submarine') this.buildSubmarine()
    else this.buildPirateShip()
  }

  private buildPirateShip() {
    const shape = new THREE.Shape()
    shape.moveTo(0, 3.5)
    shape.bezierCurveTo(0.92, 2.75, 1.24, 1.0, 1.26, -1.5)
    shape.quadraticCurveTo(1.26, -2.7, 0.94, -3.0)
    shape.lineTo(-0.94, -3.0)
    shape.quadraticCurveTo(-1.26, -2.7, -1.26, -1.5)
    shape.bezierCurveTo(-1.24, 1.0, -0.92, 2.75, 0, 3.5)

    const hullGeo = new THREE.ExtrudeGeometry(shape, {
      depth: 1.12,
      bevelEnabled: true,
      bevelThickness: 0.07,
      bevelSize: 0.07,
      bevelSegments: 2,
      curveSegments: 18,
      steps: 1,
    })
    hullGeo.rotateX(-Math.PI / 2)
    const hull = new THREE.Mesh(hullGeo, pirateHullMat)
    hull.position.y = -0.38
    hull.castShadow = true
    hull.receiveShadow = true
    this.hullGroup.add(hull)

    const rimShape = new THREE.Shape(shape.getPoints(30))
    const hole = shape
      .getPoints(30)
      .map((p) => new THREE.Vector2(p.x * 0.9, p.y * 0.92))
      .reverse()
    rimShape.holes.push(new THREE.Path(hole))
    const rimGeo = new THREE.ExtrudeGeometry(rimShape, {
      depth: 0.12,
      bevelEnabled: false,
      curveSegments: 26,
    })
    rimGeo.rotateX(-Math.PI / 2)
    const rim = new THREE.Mesh(rimGeo, pirateTrimMat)
    rim.position.y = 0.72
    rim.castShadow = true
    this.hullGroup.add(rim)

    const deckGeo = new THREE.ShapeGeometry(shape, 18)
    deckGeo.scale(0.84, 0.87, 1)
    deckGeo.rotateX(-Math.PI / 2)
    const deck = new THREE.Mesh(deckGeo, pirateDeckMat)
    deck.position.y = 0.78
    deck.receiveShadow = true
    this.hullGroup.add(deck)

    const sternCastle = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.62, 1.5), pirateHullMat)
    sternCastle.position.set(0, 1.08, 2.15)
    sternCastle.castShadow = true
    const sternTop = new THREE.Mesh(new THREE.BoxGeometry(2.14, 0.1, 1.62), pirateTrimMat)
    sternTop.position.set(0, 1.42, 2.15)
    this.hullGroup.add(sternCastle, sternTop)

    const bowDeck = new THREE.Mesh(new THREE.BoxGeometry(1.36, 0.09, 1.2), pirateTrimMat)
    bowDeck.position.set(0, 0.9, -2.42)
    bowDeck.rotation.x = -0.1
    this.hullGroup.add(bowDeck)

    for (const side of [-1, 1]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.12, 4.7), pirateTrimMat)
      rail.position.set(side * 1.16, 0.94, 0.05)
      this.hullGroup.add(rail)
      for (let i = 0; i < 5; i++) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.26, 4), pirateTrimMat)
        post.position.set(side * 1.16, 0.84, -1.9 + i * 1.0)
        this.hullGroup.add(post)
      }
      for (const z of [-1.35, 0.7]) {
        const cannon = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.115, 0.74, 7), navyMat)
        cannon.rotation.x = Math.PI / 2
        cannon.position.set(side * 0.98, 0.92, z)
        this.hullGroup.add(cannon)
        const port = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.2, 0.26), postMat)
        port.position.set(side * 1.22, 0.76, z)
        this.hullGroup.add(port)
      }
    }

    const masts: { z: number; height: number; radius: number }[] = [
      { z: -1.3, height: 3.4, radius: 0.06 },
      { z: 0.5, height: 5.4, radius: 0.075 },
      { z: 2.1, height: 3.9, radius: 0.055 },
    ]
    for (const spec of masts) {
      const mast = new THREE.Mesh(
        new THREE.CylinderGeometry(spec.radius * 0.7, spec.radius, spec.height, 6),
        postMat,
      )
      mast.position.set(0, 0.72 + spec.height / 2, spec.z)
      mast.castShadow = true
      this.hullGroup.add(mast)

      const yard = new THREE.Mesh(
        new THREE.CylinderGeometry(0.035, 0.04, 2.9, 5),
        pirateTrimMat,
      )
      yard.rotation.z = Math.PI / 2
      yard.position.set(0, 0.72 + spec.height * 0.78, spec.z)
      this.hullGroup.add(yard)

      const sail = new THREE.Mesh(tatteredSail(2.5, spec.height * 0.52), sailMat)
      sail.position.set(0, 0.72 + spec.height * 0.76, spec.z + 0.04)
      sail.castShadow = true
      this.hullGroup.add(sail)
      this.pirateSails.push(sail)
    }

    const flagShape = new THREE.Shape()
    flagShape.moveTo(0, 0)
    flagShape.lineTo(0.68, -0.12)
    flagShape.lineTo(0.3, -0.34)
    flagShape.lineTo(0.66, -0.46)
    flagShape.lineTo(0, -0.56)
    flagShape.closePath()
    const jollyRoger = new THREE.Mesh(
      new THREE.ShapeGeometry(flagShape),
      new THREE.MeshStandardMaterial({
        color: '#15171b',
        side: THREE.DoubleSide,
        roughness: 0.9,
        flatShading: true,
      }),
    )
    jollyRoger.position.set(0.02, 6.02, 0.52)
    this.hullGroup.add(jollyRoger)

    const skull = new THREE.Group()
    const cranium = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6), boneMat)
    cranium.scale.set(1, 1.05, 0.86)
    skull.add(cranium)
    const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.12, 0.16), boneMat)
    jaw.position.set(0, -0.2, 0.03)
    skull.add(jaw)
    for (const side of [-1, 1]) {
      const socket = new THREE.Mesh(
        new THREE.SphereGeometry(0.055, 6, 5),
        new THREE.MeshBasicMaterial({ color: '#0b0c0e' }),
      )
      socket.position.set(side * 0.075, 0.02, 0.16)
      skull.add(socket)
      const crossBone = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.42, 4), boneMat)
      crossBone.rotation.z = Math.PI / 2
      crossBone.position.set(side * 0.16, -0.18, 0.02)
      skull.add(crossBone)
    }
    skull.position.set(0, 1.12, -3.16)
    skull.rotation.x = -0.2
    skull.castShadow = true
    this.hullGroup.add(skull)

    const lanternBracket = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.5), pirateTrimMat)
    lanternBracket.position.set(0, 1.36, 3.02)
    this.hullGroup.add(lanternBracket)

    const lanternCage = new THREE.Group()
    const glow = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), pirateLanternMat)
    lanternCage.add(glow)
    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.14, 6), pirateTrimMat)
    cap.position.y = 0.21
    lanternCage.add(cap)
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 0.06, 6), pirateTrimMat)
    base.position.y = -0.2
    lanternCage.add(base)
    lanternCage.position.set(0, 1.62, 3.22)
    this.hullGroup.add(lanternCage)

    const lanternLight = new THREE.PointLight('#ffb15c', 10, 20, 2)
    lanternLight.position.copy(lanternCage.position)
    this.hullGroup.add(lanternLight)
    this.pirateLanternLight = lanternLight
    this.pirateLanternGlow = pirateLanternMat
    this.applyPirateLantern()

    const bowLight = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 4), bulbMat)
    bowLight.position.set(0, 1.02, -3.28)
    this.hullGroup.add(bowLight)
  }

  private applyPirateLantern() {
    if (this.pirateLanternLight) {
      this.pirateLanternLight.intensity = this.night ? 15 : 3
    }
    if (this.pirateLanternGlow) {
      this.pirateLanternGlow.emissiveIntensity = this.night ? 2.8 : 0.9
    }
  }

  setNight(night: boolean) {
    if (night === this.night) return
    this.night = night
    this.applyPirateLantern()
  }

  get cameraScale() {
    return this.camScale
  }

  private applyLayout() {
    const layout = this.layout
    this.anglerGroup.position.set(...layout.angler)
    this.rodPivot.position.set(...layout.rod)
    this.creelGroup.position.set(...layout.creel)
    this.creelGroup.visible = layout.creelVisible
    this.lanternGroup.position.set(...layout.lantern)
    this.decorations.get('flag')?.position.set(...layout.flag)
    this.decorations.get('figurehead')?.position.set(...layout.figurehead)
    this.decorations.get('crate')?.position.set(...layout.crate)
    this.shadowMesh.scale.set(layout.shadow[0] / 2.9, layout.shadow[1] / 4.9, 1)
    this.layoutGarland()
  }

  private layoutGarland() {
    const g = this.layout.garland
    for (let i = 0; i < this.garlandBulbs.length; i++) {
      const side = i < 6 ? -1 : 1
      const k = i % 6
      const t = k / 5
      const z = THREE.MathUtils.lerp(g.zFrom, g.zTo, t)
      this.garlandBulbs[i].position.set(side * g.x, g.y + Math.sin(t * Math.PI * 2) * 0.018, z)
    }
    const mid = (g.zFrom + g.zTo) / 2
    const length = Math.abs(g.zTo - g.zFrom)
    for (let i = 0; i < this.garlandCords.length; i++) {
      const side = i === 0 ? -1 : 1
      const cord = this.garlandCords[i]
      cord.position.set(side * g.x, g.y, mid)
      cord.rotation.x = Math.PI / 2
      cord.scale.set(1, length, 1)
    }
  }

  private buildRowboat() {
    const shape = new THREE.Shape()
    shape.moveTo(0, 2.05)
    shape.bezierCurveTo(0.74, 1.6, 0.96, 0.35, 0.88, -0.72)
    shape.quadraticCurveTo(0.72, -1.78, 0, -2.05)
    shape.quadraticCurveTo(-0.72, -1.78, -0.88, -0.72)
    shape.bezierCurveTo(-0.96, 0.35, -0.74, 1.6, 0, 2.05)

    const hullGeo = new THREE.ExtrudeGeometry(shape, {
      depth: 0.82,
      bevelEnabled: true,
      bevelThickness: 0.06,
      bevelSize: 0.05,
      bevelSegments: 2,
      curveSegments: 14,
      steps: 1,
    })
    hullGeo.rotateX(-Math.PI / 2)
    const hull = new THREE.Mesh(hullGeo, hullMat)
    hull.position.y = -0.3
    hull.castShadow = true
    hull.receiveShadow = true
    this.hullGroup.add(hull)

    const rimShape = new THREE.Shape(shape.getPoints(26))
    const hole = shape
      .getPoints(26)
      .map((p) => new THREE.Vector2(p.x * 0.9, p.y * 0.92))
      .reverse()
    rimShape.holes.push(new THREE.Path(hole))
    const rimGeo = new THREE.ExtrudeGeometry(rimShape, {
      depth: 0.12,
      bevelEnabled: false,
      curveSegments: 26,
    })
    rimGeo.rotateX(-Math.PI / 2)
    const rim = new THREE.Mesh(rimGeo, trimMat)
    rim.position.y = 0.46
    rim.castShadow = true
    this.hullGroup.add(rim)

    const floorGeo = new THREE.ShapeGeometry(shape, 14)
    floorGeo.scale(0.78, 0.78, 1)
    floorGeo.rotateX(-Math.PI / 2)
    const floor = new THREE.Mesh(floorGeo, hullInnerMat)
    floor.position.y = 0.14
    floor.receiveShadow = true
    this.hullGroup.add(floor)

    const bench1 = new THREE.Mesh(new THREE.BoxGeometry(1.52, 0.1, 0.34), trimMat)
    bench1.position.set(0, 0.42, 0.42)
    bench1.castShadow = true
    const bench2 = bench1.clone()
    bench2.position.z = -1.02
    this.hullGroup.add(bench1, bench2)

    const bowDeck = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.07, 0.72), trimMat)
    bowDeck.position.set(0, 0.52, -1.52)
    bowDeck.rotation.x = -0.12
    bowDeck.castShadow = true
    this.hullGroup.add(bowDeck)

    this.buildRowboatCanopy()
    this.buildRowboatOars()
  }

  private buildRowboatCanopy() {
    const canopy = new THREE.Group()
    canopy.position.set(0, 0.56, 0.9)

    const positions = [
      [-0.48, 0.94],
      [0.48, 0.94],
      [-0.48, 0.3],
      [0.48, 0.3],
    ]
    for (const [x, z] of positions) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.042, 0.9, 5), postMat)
      post.position.set(x, 0.42, z)
      post.castShadow = true
      canopy.add(post)
    }

    const roof = new THREE.Mesh(new THREE.ConeGeometry(0.68, 0.5, 4), strawMat)
    roof.position.y = 1.05
    roof.scale.z = 1.55
    roof.castShadow = true
    canopy.add(roof)

    const finial = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.16, 4), postMat)
    finial.position.y = 1.38
    canopy.add(finial)

    const roofTrim = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.74, 0.06, 4), postMat)
    roofTrim.scale.z = 1.55
    roofTrim.position.y = 0.83
    canopy.add(roofTrim)

    this.hullGroup.add(canopy)
  }

  private buildRowboatOars() {
    for (const side of [-1, 1]) {
      const pivot = new THREE.Group()
      pivot.position.set(side * 0.78, 0.62, 0.3)

      const shaft = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.055, 2.2), trimMat)
      shaft.position.z = 0.95
      shaft.castShadow = true

      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.035, 0.5), trimMat)
      blade.position.z = 1.95
      blade.castShadow = true

      pivot.add(shaft, blade)
      pivot.rotation.z = side * -0.16
      pivot.rotation.x = 0.12
      this.hullGroup.add(pivot)
      if (side < 0) this.oarLeft = pivot
      else this.oarRight = pivot
    }
  }

  private buildSpeedboat() {
    const shape = new THREE.Shape()
    shape.moveTo(0, 2.75)
    shape.bezierCurveTo(0.55, 2.05, 0.88, 0.6, 0.92, -1.2)
    shape.quadraticCurveTo(0.92, -2.1, 0.62, -2.32)
    shape.lineTo(-0.62, -2.32)
    shape.quadraticCurveTo(-0.92, -2.1, -0.92, -1.2)
    shape.bezierCurveTo(-0.88, 0.6, -0.55, 2.05, 0, 2.75)

    const hullGeo = new THREE.ExtrudeGeometry(shape, {
      depth: 0.78,
      bevelEnabled: true,
      bevelThickness: 0.05,
      bevelSize: 0.04,
      bevelSegments: 2,
      curveSegments: 16,
      steps: 1,
    })
    hullGeo.rotateX(-Math.PI / 2)
    const hull = new THREE.Mesh(hullGeo, speedHullMat)
    hull.position.y = -0.2
    hull.castShadow = true
    hull.receiveShadow = true
    this.hullGroup.add(hull)

    const rimShape = new THREE.Shape(shape.getPoints(28))
    const hole = shape
      .getPoints(28)
      .map((p) => new THREE.Vector2(p.x * 0.86, p.y * 0.9))
      .reverse()
    rimShape.holes.push(new THREE.Path(hole))
    const rimGeo = new THREE.ExtrudeGeometry(rimShape, {
      depth: 0.1,
      bevelEnabled: false,
      curveSegments: 24,
    })
    rimGeo.rotateX(-Math.PI / 2)
    const rim = new THREE.Mesh(rimGeo, speedAccentMat)
    rim.position.y = 0.58
    rim.castShadow = true
    this.hullGroup.add(rim)

    const deckGeo = new THREE.ShapeGeometry(shape, 16)
    deckGeo.scale(0.78, 0.8, 1)
    deckGeo.rotateX(-Math.PI / 2)
    const deck = new THREE.Mesh(deckGeo, speedDeckMat)
    deck.position.y = 0.6
    deck.receiveShadow = true
    this.hullGroup.add(deck)

    const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.46, 0.1), glassMat)
    windshield.position.set(0, 0.92, -0.92)
    windshield.rotation.x = 0.3
    this.hullGroup.add(windshield)

    for (const side of [-1, 1]) {
      const frame = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.52, 0.14), steelMat)
      frame.position.set(side * 0.68, 0.91, -0.9)
      frame.rotation.x = 0.3
      this.hullGroup.add(frame)
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.07, 3.1), speedAccentMat)
      rail.position.set(side * 0.9, 0.64, -0.15)
      this.hullGroup.add(rail)
    }

    const seat1 = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.12, 0.4), speedAccentMat)
    seat1.position.set(0, 0.68, -0.3)
    seat1.castShadow = true
    const seat2 = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.12, 0.42), speedDeckMat)
    seat2.position.set(0, 0.68, 0.75)
    seat2.castShadow = true
    const dash = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.16, 0.28), speedAccentMat)
    dash.position.set(0, 0.72, -0.65)
    this.hullGroup.add(seat1, seat2, dash)

    const motor = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.55, 0.42), navyMat)
    motor.position.set(0, 0.72, 2.14)
    motor.castShadow = true
    const cowl = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.16, 0.32), speedHullMat)
    cowl.position.set(0, 1.04, 2.14)
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.55, 6), steelMat)
    shaft.position.set(0, 0.28, 2.28)
    this.hullGroup.add(motor, cowl, shaft)

    const prop = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.025, 4, 8), brassMat)
    prop.position.set(0, 0.06, 2.32)
    prop.rotation.y = Math.PI / 2
    this.hullGroup.add(prop)

    const bowLight = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 4), brassMat)
    bowLight.position.set(0, 0.5, -2.44)
    this.hullGroup.add(bowLight)
  }

  private buildPatrolBoat() {
    const shape = new THREE.Shape()
    shape.moveTo(0, 3.0)
    shape.bezierCurveTo(0.62, 2.3, 1.0, 0.8, 1.02, -1.3)
    shape.quadraticCurveTo(1.02, -2.2, 0.7, -2.46)
    shape.lineTo(-0.7, -2.46)
    shape.quadraticCurveTo(-1.02, -2.2, -1.02, -1.3)
    shape.bezierCurveTo(-1.0, 0.8, -0.62, 2.3, 0, 3.0)

    const hullGeo = new THREE.ExtrudeGeometry(shape, {
      depth: 0.95,
      bevelEnabled: true,
      bevelThickness: 0.05,
      bevelSize: 0.05,
      bevelSegments: 2,
      curveSegments: 16,
      steps: 1,
    })
    hullGeo.rotateX(-Math.PI / 2)
    const hull = new THREE.Mesh(hullGeo, steelMat)
    hull.position.y = -0.3
    hull.castShadow = true
    hull.receiveShadow = true
    this.hullGroup.add(hull)

    const rimShape = new THREE.Shape(shape.getPoints(28))
    const hole = shape
      .getPoints(28)
      .map((p) => new THREE.Vector2(p.x * 0.9, p.y * 0.92))
      .reverse()
    rimShape.holes.push(new THREE.Path(hole))
    const rimGeo = new THREE.ExtrudeGeometry(rimShape, {
      depth: 0.1,
      bevelEnabled: false,
      curveSegments: 24,
    })
    rimGeo.rotateX(-Math.PI / 2)
    const rim = new THREE.Mesh(rimGeo, navyMat)
    rim.position.y = 0.64
    rim.castShadow = true
    this.hullGroup.add(rim)

    const deckGeo = new THREE.ShapeGeometry(shape, 16)
    deckGeo.scale(0.84, 0.86, 1)
    deckGeo.rotateX(-Math.PI / 2)
    const deck = new THREE.Mesh(deckGeo, patrolDeckMat)
    deck.position.y = 0.66
    deck.receiveShadow = true
    this.hullGroup.add(deck)

    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.66, 1.75), steelMat)
    cabin.position.set(0, 0.98, 0.42)
    cabin.castShadow = true
    const cabinRoof = new THREE.Mesh(new THREE.BoxGeometry(1.62, 0.08, 1.88), navyMat)
    cabinRoof.position.set(0, 1.34, 0.42)
    const windows = new THREE.Mesh(new THREE.BoxGeometry(1.53, 0.2, 0.5), glassMat)
    windows.position.set(0, 1.08, 0.05)
    this.hullGroup.add(cabin, cabinRoof, windows)

    const turret = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.42, 0.34, 8), navyMat)
    turret.position.set(0, 0.94, -1.78)
    turret.castShadow = true
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 1.25, 6), steelMat)
    barrel.rotation.x = Math.PI / 2
    barrel.position.set(0, 1.08, -2.38)
    this.hullGroup.add(turret, barrel)

    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, 2.25, 6), steelMat)
    mast.position.set(0, 2.28, 0.6)
    const crossbar = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.045, 0.045), navyMat)
    crossbar.position.set(0, 2.8, 0.6)
    const radar = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.24, 0.5), navyMat)
    radar.position.set(0, 3.08, 0.6)
    this.hullGroup.add(mast, crossbar, radar)

    for (const side of [-1, 1]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.08, 3.6), navyMat)
      rail.position.set(side * 1.0, 0.76, 0.1)
      this.hullGroup.add(rail)
    }
  }

  private buildSubmarine() {
    const hull = new THREE.Mesh(new THREE.CapsuleGeometry(0.62, 3.2, 4, 14), subHullMat)
    hull.rotation.x = Math.PI / 2
    hull.position.y = 0.28
    hull.castShadow = true
    hull.receiveShadow = true
    this.hullGroup.add(hull)

    const deck = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.06, 2.75), subDeckMat)
    deck.position.y = 0.84
    deck.receiveShadow = true
    this.hullGroup.add(deck)

    const tower = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.58, 1.3), subHullMat)
    tower.position.set(0, 1.12, 0.18)
    tower.castShadow = true
    const towerTop = new THREE.Mesh(new THREE.BoxGeometry(0.98, 0.08, 1.42), subDeckMat)
    towerTop.position.set(0, 1.45, 0.18)
    const towerWindow = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.14, 0.5), glassMat)
    towerWindow.position.set(0, 1.24, -0.28)
    this.hullGroup.add(tower, towerTop, towerWindow)

    const periscope = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.045, 0.95, 6), steelMat)
    periscope.position.set(0.2, 1.96, 0.18)
    const scopeHead = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.38, 6), steelMat)
    scopeHead.rotation.z = Math.PI / 2
    scopeHead.position.set(0.36, 2.42, 0.18)
    this.hullGroup.add(periscope, scopeHead)

    const plane = new THREE.Mesh(new THREE.BoxGeometry(2.25, 0.06, 0.42), subDeckMat)
    plane.position.set(0, 0.56, -1.5)
    this.hullGroup.add(plane)

    const rudder = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.64, 0.52), subDeckMat)
    rudder.position.set(0, 0.95, 2.1)
    this.hullGroup.add(rudder)

    for (const z of [-0.8, 0.8]) {
      const band = new THREE.Mesh(new THREE.TorusGeometry(0.633, 0.028, 5, 18), brassMat)
      band.position.set(0, 0.28, z)
      band.scale.y = 0.98
      this.hullGroup.add(band)
    }

    const prop = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.4, 6), brassMat)
    prop.rotation.x = -Math.PI / 2
    prop.position.set(0, 0.28, 2.5)
    this.hullGroup.add(prop)

    const bowLamp = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 4), brassMat)
    bowLamp.position.set(0, 0.74, -2.18)
    this.hullGroup.add(bowLamp)

    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.06, 0.6), subDeckMat)
    fin.position.set(0, 0.2, 1.9)
    this.hullGroup.add(fin)
  }

  private buildIcebreaker() {
    const shape = new THREE.Shape()
    shape.moveTo(0, 3.25)
    shape.bezierCurveTo(0.78, 2.5, 1.12, 0.9, 1.14, -1.4)
    shape.quadraticCurveTo(1.14, -2.35, 0.78, -2.58)
    shape.lineTo(-0.78, -2.58)
    shape.quadraticCurveTo(-1.14, -2.35, -1.14, -1.4)
    shape.bezierCurveTo(-1.12, 0.9, -0.78, 2.5, 0, 3.25)

    const hullGeo = new THREE.ExtrudeGeometry(shape, {
      depth: 1.0,
      bevelEnabled: true,
      bevelThickness: 0.06,
      bevelSize: 0.06,
      bevelSegments: 2,
      curveSegments: 16,
      steps: 1,
    })
    hullGeo.rotateX(-Math.PI / 2)
    const hull = new THREE.Mesh(hullGeo, iceHullMat)
    hull.position.y = -0.34
    hull.castShadow = true
    hull.receiveShadow = true
    this.hullGroup.add(hull)

    const rimShape = new THREE.Shape(shape.getPoints(28))
    const hole = shape
      .getPoints(28)
      .map((p) => new THREE.Vector2(p.x * 0.9, p.y * 0.92))
      .reverse()
    rimShape.holes.push(new THREE.Path(hole))
    const rimGeo = new THREE.ExtrudeGeometry(rimShape, { depth: 0.1, bevelEnabled: false, curveSegments: 24 })
    rimGeo.rotateX(-Math.PI / 2)
    const rim = new THREE.Mesh(rimGeo, iceAccentMat)
    rim.position.y = 0.68
    rim.castShadow = true
    this.hullGroup.add(rim)

    const deckGeo = new THREE.ShapeGeometry(shape, 16)
    deckGeo.scale(0.84, 0.86, 1)
    deckGeo.rotateX(-Math.PI / 2)
    const deck = new THREE.Mesh(deckGeo, iceDeckMat)
    deck.position.y = 0.7
    deck.receiveShadow = true
    this.hullGroup.add(deck)

    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.78, 1.9), iceDeckMat)
    cabin.position.set(0, 1.06, 0.34)
    cabin.castShadow = true
    const roof = new THREE.Mesh(new THREE.BoxGeometry(1.82, 0.1, 2.02), iceAccentMat)
    roof.position.set(0, 1.5, 0.34)
    const windows = new THREE.Mesh(new THREE.BoxGeometry(1.74, 0.22, 0.7), glassMat)
    windows.position.set(0, 1.18, -0.18)
    this.hullGroup.add(cabin, roof, windows)

    const bowPlate = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.5, 1.2), iceAccentMat)
    bowPlate.position.set(0, 0.42, -2.32)
    bowPlate.rotation.x = 0.22
    bowPlate.castShadow = true
    this.hullGroup.add(bowPlate)
    for (const side of [-1, 1]) {
      const edge = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.62, 1.4), steelMat)
      edge.position.set(side * 0.96, 0.26, -1.9)
      edge.rotation.y = side * -0.16
      this.hullGroup.add(edge)
    }

    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.06, 2.4, 6), steelMat)
    mast.position.set(0, 2.34, 0.7)
    const crossbar = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.05, 0.05), iceAccentMat)
    crossbar.position.set(0, 2.92, 0.7)
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.11, 7, 5), bulbMat)
    lamp.position.set(0, 3.6, 0.7)
    this.hullGroup.add(mast, crossbar, lamp)

    const lightBar = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.08, 0.12), bulbMat)
    lightBar.position.set(0, 1.58, -0.82)
    this.hullGroup.add(lightBar)

    for (const side of [-1, 1]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.09, 4.1), iceAccentMat)
      rail.position.set(side * 1.1, 0.82, 0.1)
      this.hullGroup.add(rail)
    }
  }

  private buildRod() {
    this.rodPivot.position.set(0.46, 0.86, -0.28)
    this.rodPivot.rotation.x = -0.95
    this.rodPivot.rotation.z = -0.12

    this.rodMaterial = new THREE.MeshStandardMaterial({ color: '#5d4229', roughness: 0.7 })
    this.gripMaterial = new THREE.MeshStandardMaterial({ color: '#5b3f28', roughness: 0.9 })
    this.reelMaterial = new THREE.MeshStandardMaterial({ color: '#c9945e', roughness: 0.5, metalness: 0.2 })
    this.accentMaterial = new THREE.MeshStandardMaterial({
      color: '#d8b978',
      roughness: 0.45,
      metalness: 0.3,
      emissive: '#000000',
      emissiveIntensity: 0,
    })

    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.026, 2.55, 5), this.rodMaterial)
    rod.position.y = 1.27
    rod.castShadow = true
    this.rodPivot.add(rod)

    const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.36, 6), this.gripMaterial)
    grip.position.y = 0.18
    this.rodPivot.add(grip)

    const reel = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.07, 10), this.reelMaterial)
    reel.rotation.z = Math.PI / 2
    reel.position.set(0.09, 0.44, 0)
    this.rodPivot.add(reel)

    const wraps = [
      { y: 0.55, r: 0.031 },
      { y: 1.15, r: 0.024 },
      { y: 1.75, r: 0.018 },
    ]
    for (const wrap of wraps) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(wrap.r, 0.008, 4, 8),
        this.accentMaterial,
      )
      ring.rotation.x = Math.PI / 2
      ring.position.y = wrap.y
      this.rodPivot.add(ring)
    }

    const tipBead = new THREE.Mesh(new THREE.SphereGeometry(0.016, 6, 4), this.accentMaterial)
    tipBead.position.y = 2.56
    this.rodPivot.add(tipBead)

    this.rodTipObject.position.set(0, 2.58, 0)
    this.rodPivot.add(this.rodTipObject)
    this.group.add(this.rodPivot)
  }

  private buildAngler() {
    const angler = this.anglerGroup
    angler.position.set(0, 0, 0.58)

    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.24, 0.52, 7), jacketMat)
    torso.position.set(0, 0.73, -0.02)
    torso.castShadow = true
    angler.add(torso)

    const shoulder = new THREE.Mesh(new THREE.SphereGeometry(0.21, 8, 6), jacketMat)
    shoulder.scale.set(1.15, 0.62, 0.9)
    shoulder.position.set(0, 0.94, -0.02)
    shoulder.castShadow = true
    angler.add(shoulder)

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.125, 9, 7), skinMat)
    head.position.set(0, 1.08, -0.02)
    head.castShadow = true
    angler.add(head)

    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.022, 10), strawMat)
    brim.position.set(0, 1.17, -0.02)
    angler.add(brim)

    const hat = new THREE.Mesh(new THREE.ConeGeometry(0.19, 0.15, 9), strawMat)
    hat.position.set(0, 1.235, -0.02)
    hat.castShadow = true
    angler.add(hat)

    const leftHand = new THREE.Vector3(-0.06, 0.86, -0.48)
    const rightHand = new THREE.Vector3(0.29, 0.83, -0.3)
    angler.add(limb(new THREE.Vector3(-0.18, 0.93, 0.03), leftHand, 0.055, jacketMat))
    angler.add(limb(new THREE.Vector3(0.18, 0.93, 0.03), rightHand, 0.055, jacketMat))
    angler.add(
      new THREE.Mesh(new THREE.SphereGeometry(0.06, 7, 5), skinMat).translateX(-0.06).translateY(0.86).translateZ(-0.48),
    )
    angler.add(
      new THREE.Mesh(new THREE.SphereGeometry(0.06, 7, 5), skinMat).translateX(0.29).translateY(0.83).translateZ(-0.3),
    )

    this.group.add(angler)
  }

  private buildCreel() {
    const creel = this.creelGroup
    creel.position.set(-0.48, 0.5, 0.72)

    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.14, 0.25, 8), strawMat)
    body.castShadow = true
    creel.add(body)

    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.022, 5, 10), postMat)
    rim.rotation.x = Math.PI / 2
    rim.position.y = 0.125
    creel.add(rim)

    const tail = new THREE.Mesh(
      new THREE.ConeGeometry(0.05, 0.22, 4),
      new THREE.MeshStandardMaterial({ color: '#cfd9d4', roughness: 0.5, flatShading: true }),
    )
    tail.position.set(0.04, 0.19, 0.02)
    tail.rotation.z = -0.5
    creel.add(tail)

    this.group.add(creel)
  }

  private buildLantern() {
    const lantern = new THREE.Mesh(
      new THREE.SphereGeometry(0.09, 8, 6),
      new THREE.MeshStandardMaterial({
        color: '#ffd98c',
        emissive: '#ffb347',
        emissiveIntensity: 1.8,
      }),
    )
    this.lanternGroup.add(lantern)

    const light = new THREE.PointLight('#ffb35c', 2.6, 8, 2)
    this.lanternGroup.add(light)
    this.group.add(this.lanternGroup)
  }

  private buildDecorations() {
    this.buildFlagDecoration()
    this.buildCrateDecoration()
    this.buildGarlandDecoration()
    this.buildFigureheadDecoration()
    for (const group of this.decorations.values()) {
      group.visible = false
      this.group.add(group)
    }
  }

  private buildFlagDecoration() {
    const group = new THREE.Group()
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.022, 1.05, 5), trimMat)
    pole.position.y = 0.52
    pole.castShadow = true
    group.add(pole)

    const shape = new THREE.Shape()
    shape.moveTo(0, 0)
    shape.lineTo(0.55, -0.1)
    shape.lineTo(0, -0.32)
    shape.closePath()
    const flag = new THREE.Mesh(new THREE.ShapeGeometry(shape), flagMat)
    flag.position.set(0.02, 1.02, 0)
    group.add(flag)

    const finial = new THREE.Mesh(new THREE.SphereGeometry(0.032, 6, 4), brassMat)
    finial.position.y = 1.06
    group.add(finial)

    this.decorations.set('flag', group)
  }

  private buildCrateDecoration() {
    const group = new THREE.Group()
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.32, 0.5), trimMat)
    box.position.y = 0.16
    box.castShadow = true
    group.add(box)

    for (const z of [-0.17, 0.17]) {
      const slat = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.36, 0.045), postMat)
      slat.position.set(0, 0.16, z)
      group.add(slat)
    }
    const lid = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.03, 0.54), postMat)
    lid.position.y = 0.33
    group.add(lid)

    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.24, 4), skinMat)
    tail.position.set(0.1, 0.38, -0.06)
    tail.rotation.z = 0.5
    group.add(tail)

    this.decorations.set('crate', group)
  }

  private buildGarlandDecoration() {
    const group = new THREE.Group()
    const bulbGeo = new THREE.SphereGeometry(0.045, 6, 5)
    for (let i = 0; i < 12; i++) {
      const bulb = new THREE.Mesh(bulbGeo, bulbMat)
      this.garlandBulbs.push(bulb)
      group.add(bulb)
    }
    for (let i = 0; i < 2; i++) {
      const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 1, 4), ropeMat)
      this.garlandCords.push(cord)
      group.add(cord)
    }
    this.decorations.set('garland', group)
  }

  private buildFigureheadDecoration() {
    const group = new THREE.Group()

    const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 0.18, 6), goldMat)
    pedestal.position.y = 0.05
    group.add(pedestal)

    const body = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), goldMat)
    body.scale.set(0.75, 0.72, 1.5)
    body.position.set(0, 0.24, -0.06)
    body.castShadow = true
    group.add(body)

    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.28, 4), goldMat)
    tail.rotation.x = Math.PI / 2
    tail.position.set(0, 0.24, 0.24)
    group.add(tail)

    for (const side of [-1, 1]) {
      const fin = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.2, 4), goldMat)
      fin.rotation.z = side * 0.9
      fin.position.set(side * 0.12, 0.24, 0.05)
      group.add(fin)
    }

    const eyeGeo = new THREE.SphereGeometry(0.018, 5, 4)
    const eyeMat = new THREE.MeshStandardMaterial({ color: '#1d2b2e', roughness: 0.4 })
    for (const side of [-1, 1]) {
      const eye = new THREE.Mesh(eyeGeo, eyeMat)
      eye.position.set(side * 0.075, 0.28, -0.25)
      group.add(eye)
    }

    this.decorations.set('figurehead', group)
  }

  private buildShadow() {
    const size = 128
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')!
    const gradient = ctx.createRadialGradient(size / 2, size / 2, size * 0.12, size / 2, size / 2, size / 2)
    gradient.addColorStop(0, 'rgba(4, 22, 24, 0.55)')
    gradient.addColorStop(0.55, 'rgba(4, 22, 24, 0.3)')
    gradient.addColorStop(1, 'rgba(4, 22, 24, 0)')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, size, size)

    const texture = new THREE.CanvasTexture(canvas)
    const shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(2.9, 4.9),
      new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        opacity: 0.75,
        depthWrite: false,
      }),
    )
    shadow.rotation.x = -Math.PI / 2
    shadow.position.y = -0.02
    shadow.renderOrder = 2
    this.shadowMesh = shadow
    this.group.add(shadow)
  }

  get position() {
    return this.group.position
  }

  get deck() {
    return this.crewDeck
  }

  getForward(out = new THREE.Vector3()) {
    return out.set(-Math.sin(this.heading), 0, -Math.cos(this.heading))
  }

  getStern(out = new THREE.Vector3()) {
    this.group.updateMatrixWorld()
    return this.stern.getWorldPosition(out)
  }

  getRodTip(out = new THREE.Vector3()) {
    this.group.updateMatrixWorld()
    return this.rodTipObject.getWorldPosition(out)
  }

  private canOccupy(x: number, z: number, world: World) {
    if (world.depthAt(x, z) <= 0.9) return false
    if (this.hullHalfLength <= 0) return true
    const fx = -Math.sin(this.heading)
    const fz = -Math.cos(this.heading)
    const rx = -fz
    const rz = fx
    const samples: [number, number][] = [
      [fx * this.hullHalfLength, fz * this.hullHalfLength],
      [-fx * this.hullHalfLength * 0.92, -fz * this.hullHalfLength * 0.92],
      [rx * this.hullHalfWidth, rz * this.hullHalfWidth],
      [-rx * this.hullHalfWidth, -rz * this.hullHalfWidth],
    ]
    for (const [ox, oz] of samples) {
      if (world.depthAt(x + ox, z + oz) <= 0.7) return false
    }
    return true
  }

  update(
    dt: number,
    time: number,
    world: World,
    throttle: number,
    steer: number,
    allowMove: boolean,
  ) {
    const canDrive = allowMove
    if (canDrive) {
      const speedBoost = this.crewSpeedMul * this.stormSpeedMul
      this.speed += throttle * 7.2 * this.speedMul * this.accelMul * speedBoost * dt
      this.speed *= Math.exp(-(Math.abs(throttle) < 0.05 ? 1.15 : 0.45) * dt)
      this.speed = clamp(this.speed, -2.7 * this.stormSpeedMul, 7.4 * this.speedMul * speedBoost)

      const speedFactor = 0.34 + Math.min(Math.abs(this.speed) / (6.2 * this.speedMul), 1) * 0.9
      const direction = this.speed < -0.15 ? -1 : 1
      // Screen-right steering must rotate toward +X when the chase camera sits behind the boat.
      this.heading -= steer * 1.45 * this.turnMul * dt * speedFactor * direction

      const forward = this.getForward()
      const step = this.speed * dt
      const nextX = this.position.x + forward.x * step
      const nextZ = this.position.z + forward.z * step

      if (this.canOccupy(nextX, nextZ, world)) {
        this.position.x = nextX
        this.position.z = nextZ
      } else if (this.canOccupy(this.position.x + forward.x * step, this.position.z, world)) {
        this.position.x += forward.x * step
        this.speed *= 0.55
      } else if (this.canOccupy(this.position.x, this.position.z + forward.z * step, world)) {
        this.position.z += forward.z * step
        this.speed *= 0.55
      } else {
        this.speed *= -0.22
      }
    } else {
      this.speed *= Math.exp(-4.5 * dt)
    }

    const wave = world.waveHeight(this.position.x, this.position.z, time)
    const bob = Math.sin(time * 1.15 + this.bobPhase)
    this.group.position.y = wave + 0.04 + bob * 0.032 * this.bobMul
    this.group.rotation.y = this.heading
    this.group.rotation.z =
      -steer * 0.07 + Math.sin(time * 1.35 + this.bobPhase) * 0.022 * this.bobMul
    this.group.rotation.x =
      bob * 0.018 * this.bobMul + clamp(this.speed * 0.006, -0.03, 0.04)

    if (this.oarLeft && this.oarRight) {
      const rowing = Math.abs(throttle) > 0.08 ? 1 : Math.min(Math.abs(this.speed) / 4, 0.35)
      this.rowPhase += dt * (1.6 + Math.abs(this.speed) * 2.1)
      const swing = Math.sin(this.rowPhase * 2.1) * 0.38 * rowing
      this.oarLeft.rotation.x = 0.12 + swing
      this.oarRight.rotation.x = 0.12 + swing
    }

    const chargeLean = clamp(this.speed * 0.01, -0.04, 0.05)
    this.rodPivot.rotation.x = -0.55 + chargeLean - this.rodLoad * 0.38
    this.rodPivot.rotation.z = -0.12 + this.rodLoad * 0.08

    for (let i = 0; i < this.pirateSails.length; i++) {
      const sail = this.pirateSails[i]
      const buff = Math.min(1, Math.abs(this.speed) / 6)
      sail.rotation.z =
        Math.sin(time * (1.15 + i * 0.12) + this.bobPhase + i * 1.4) * (0.02 + buff * 0.055)
      sail.rotation.y = Math.sin(time * 0.82 + i * 1.1) * (0.035 + buff * 0.03)
      sail.position.x = Math.sin(time * 1.6 + i * 2.1) * 0.02 * (0.4 + buff)
    }

    this.group.updateMatrixWorld(true)
  }
}
