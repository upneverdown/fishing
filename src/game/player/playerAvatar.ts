import * as THREE from 'three'
import type { Boat } from '@/game/entities/boat'
import { PLAYER_SKINS, playerSkinById, type PlayerSkinId } from './playerSkins'

const skinTone = new THREE.MeshStandardMaterial({ color: '#e6b78c', roughness: 0.9 })
const dark = new THREE.MeshStandardMaterial({ color: '#2c3436', roughness: 0.9, flatShading: true })

function limb(radius: number, length: number, material: THREE.Material) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.86, radius, length, 6), material)
  mesh.castShadow = true
  return mesh
}

export class PlayerAvatar {
  readonly group = new THREE.Group()

  private bodyMat = new THREE.MeshStandardMaterial({ color: '#b96b45', roughness: 0.88, flatShading: true })
  private trimMat = new THREE.MeshStandardMaterial({ color: '#e0b184', roughness: 0.85, flatShading: true })
  private hoodMat = new THREE.MeshStandardMaterial({ color: '#d7b271', roughness: 0.9, flatShading: true })
  private accentMat = new THREE.MeshStandardMaterial({
    color: '#6fe0cf',
    emissive: '#2f7a72',
    emissiveIntensity: 0.4,
    roughness: 0.6,
    flatShading: true,
  })

  private torso = new THREE.Group()
  private head = new THREE.Group()
  private leftArm = new THREE.Group()
  private rightArm = new THREE.Group()
  private leftLeg = new THREE.Group()
  private rightLeg = new THREE.Group()
  private accessories = new THREE.Group()

  private walkPhase = 0
  private slashTimer = 0
  private hitTimer = 0
  private idleTime = 0
  private facing = 0
  private skinId: PlayerSkinId = 'angler'

  constructor(scene: THREE.Scene) {
    this.group.add(this.torso)
    this.torso.position.y = 0.86

    const hips = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.2, 0.24), this.trimMat)
    hips.position.y = -0.1
    hips.castShadow = true
    this.torso.add(hips)

    const chest = new THREE.Mesh(new THREE.CapsuleGeometry(0.21, 0.34, 4, 8), this.bodyMat)
    chest.position.y = 0.22
    chest.scale.set(1.18, 1, 0.82)
    chest.castShadow = true
    this.torso.add(chest)

    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.05, 6, 12), this.trimMat)
    collar.rotation.x = Math.PI / 2
    collar.position.y = 0.44
    this.torso.add(collar)

    this.head.position.y = 0.52
    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.17, 12, 10), skinTone)
    skull.scale.set(1, 1.06, 0.96)
    skull.castShadow = true
    this.head.add(skull)

    const hood = new THREE.Mesh(
      new THREE.SphereGeometry(0.21, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.64),
      this.hoodMat,
    )
    hood.position.y = 0.05
    hood.rotation.x = -0.12
    hood.castShadow = true
    this.head.add(hood)

    for (const side of [-1, 1]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.023, 6, 5), dark)
      eye.position.set(side * 0.062, 0.015, -0.155)
      this.head.add(eye)
    }

    this.head.add(this.accessories)
    this.torso.add(this.head)

    for (const side of [-1, 1]) {
      const arm = side < 0 ? this.leftArm : this.rightArm
      arm.position.set(side * 0.25, 0.32, 0)
      const upper = limb(0.055, 0.28, this.bodyMat)
      upper.position.y = -0.14
      arm.add(upper)
      const hand = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 6), skinTone)
      hand.position.y = -0.3
      arm.add(hand)
      this.torso.add(arm)
    }

    for (const side of [-1, 1]) {
      const leg = side < 0 ? this.leftLeg : this.rightLeg
      leg.position.set(side * 0.1, 0.76, 0)
      const thigh = limb(0.07, 0.42, this.trimMat)
      thigh.position.y = -0.21
      leg.add(thigh)
      const boot = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.1, 0.24), dark)
      boot.position.set(0, -0.44, -0.03)
      boot.castShadow = true
      leg.add(boot)
      this.group.add(leg)
    }

    this.group.scale.setScalar(1.02)
    this.setSkin('angler')
    scene.add(this.group)
  }

  setSkin(id: PlayerSkinId) {
    this.skinId = id
    const skin = playerSkinById(id)
    this.bodyMat.color.set(skin.body)
    this.bodyMat.emissive.set(skin.accent)
    this.bodyMat.emissiveIntensity = 0.08
    this.trimMat.color.set(skin.trim)
    this.hoodMat.color.set(skin.hood)
    this.hoodMat.emissive.set(skin.accent)
    this.hoodMat.emissiveIntensity = 0.12
    this.accentMat.color.set(skin.accent)
    this.accentMat.emissive.set(skin.accent)
    this.buildAccessories(skin.accessory)
  }

  get skin() {
    return this.skinId
  }

  private buildAccessories(kind: (typeof PLAYER_SKINS)[number]['accessory']) {
    for (const child of [...this.accessories.children]) {
      this.accessories.remove(child)
      if (child instanceof THREE.Mesh) child.geometry.dispose()
    }
    if (kind === 'straw') {
      const brim = new THREE.Mesh(
        new THREE.CylinderGeometry(0.33, 0.34, 0.025, 16),
        new THREE.MeshStandardMaterial({ color: '#d8b978', roughness: 0.95, flatShading: true }),
      )
      brim.position.y = 0.13
      const crown = new THREE.Mesh(
        new THREE.ConeGeometry(0.17, 0.13, 12),
        new THREE.MeshStandardMaterial({ color: '#c9a668', roughness: 0.95, flatShading: true }),
      )
      crown.position.y = 0.2
      this.accessories.add(brim, crown)
    } else if (kind === 'dragon') {
      for (const side of [-1, 1]) {
        const horn = new THREE.Mesh(
          new THREE.ConeGeometry(0.045, 0.22, 6),
          new THREE.MeshStandardMaterial({ color: '#fff0b8', roughness: 0.7, flatShading: true }),
        )
        horn.position.set(side * 0.12, 0.22, 0.02)
        horn.rotation.z = side * 0.3
        this.accessories.add(horn)
      }
      const spike = new THREE.Mesh(
        new THREE.ConeGeometry(0.05, 0.16, 5),
        new THREE.MeshStandardMaterial({ color: '#ffb347', roughness: 0.6, flatShading: true }),
      )
      spike.position.set(0, 0.26, 0.12)
      spike.rotation.x = 0.3
      this.accessories.add(spike)
    } else if (kind === 'frog') {
      for (const side of [-1, 1]) {
        const eye = new THREE.Mesh(
          new THREE.SphereGeometry(0.085, 10, 8),
          new THREE.MeshStandardMaterial({ color: '#e9f7d0', roughness: 0.7, flatShading: true }),
        )
        eye.position.set(side * 0.13, 0.2, -0.04)
        const pupil = new THREE.Mesh(
          new THREE.SphereGeometry(0.032, 6, 5),
          new THREE.MeshStandardMaterial({ color: '#1c2a1c', roughness: 0.5 }),
        )
        pupil.position.set(side * 0.13, 0.2, -0.115)
        this.accessories.add(eye, pupil)
      }
    } else if (kind === 'cat') {
      for (const side of [-1, 1]) {
        const ear = new THREE.Mesh(
          new THREE.ConeGeometry(0.08, 0.18, 4),
          new THREE.MeshStandardMaterial({ color: '#f5b6cc', roughness: 0.85, flatShading: true }),
        )
        ear.position.set(side * 0.12, 0.22, 0.01)
        ear.rotation.z = side * 0.24
        this.accessories.add(ear)
      }
      const nose = new THREE.Mesh(
        new THREE.SphereGeometry(0.028, 6, 5),
        new THREE.MeshStandardMaterial({ color: '#ff7fa8', roughness: 0.6 }),
      )
      nose.position.set(0, -0.02, -0.168)
      this.accessories.add(nose)
    }
  }

  slash() {
    this.slashTimer = 0.42
  }

  hit() {
    this.hitTimer = 0.36
  }

  get isSlashing() {
    return this.slashTimer > 0
  }

  update(dt: number, boat: Boat, moving: boolean, target: THREE.Vector3 | null) {
    this.idleTime += dt
    const spot = boat.getPlayerSpot()
    this.group.position.set(spot.x, spot.y + 0.06, spot.z)

    let desired = boat.heading
    if (target) {
      const dx = target.x - this.group.position.x
      const dz = target.z - this.group.position.z
      desired = Math.atan2(-dx, -dz)
    }
    let delta = desired - this.facing
    while (delta > Math.PI) delta -= Math.PI * 2
    while (delta < -Math.PI) delta += Math.PI * 2
    const turnRate = target ? 7.5 : 5.2
    this.facing += delta * (1 - Math.exp(-dt * turnRate))
    this.group.rotation.y = this.facing

    const speed = Math.abs(boat.speed)
    const stride = Math.min(1, speed / 5)
    this.walkPhase += dt * (2.4 + speed * 1.3) * (moving ? 1 : 0.45)
    const swing = Math.sin(this.walkPhase) * (0.16 + stride * 0.42)

    this.leftLeg.rotation.x = swing
    this.rightLeg.rotation.x = -swing
    this.torso.position.y = 0.86 + Math.sin(this.idleTime * 2.1) * 0.012

    if (this.slashTimer > 0) {
      this.slashTimer = Math.max(0, this.slashTimer - dt)
      const t = 1 - this.slashTimer / 0.42
      const arc = Math.sin(t * Math.PI)
      this.rightArm.rotation.x = -2.5 * arc
      this.rightArm.rotation.z = 0.2 - arc * 0.7
      this.torso.rotation.y = -0.4 * arc + (1 - t) * 0.12
      this.leftArm.rotation.x = 0.35 * arc
    } else {
      this.rightArm.rotation.x = -swing * 0.7
      this.rightArm.rotation.z = 0.06
      this.leftArm.rotation.x = swing * 0.7
      this.leftArm.rotation.z = -0.06
      this.torso.rotation.y *= Math.exp(-dt * 8)
    }

    if (this.hitTimer > 0) {
      this.hitTimer = Math.max(0, this.hitTimer - dt)
      const k = this.hitTimer / 0.36
      this.torso.rotation.x = -0.28 * k
      this.bodyMat.emissiveIntensity = 0.08 + k * 0.9
      this.hoodMat.emissiveIntensity = 0.12 + k * 0.7
    } else {
      this.torso.rotation.x *= Math.exp(-dt * 9)
      this.bodyMat.emissiveIntensity = 0.08
      this.hoodMat.emissiveIntensity = 0.12
    }
  }

  getHeadPosition(out = new THREE.Vector3()) {
    this.group.updateMatrixWorld()
    return this.head.getWorldPosition(out)
  }

  dispose() {
    this.group.traverse((obj) => {
      if (obj instanceof THREE.Mesh) obj.geometry.dispose()
    })
    sceneRemove(this.group)
  }
}

function sceneRemove(group: THREE.Group) {
  group.removeFromParent()
}
