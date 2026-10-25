import * as THREE from 'three'

const furMat = new THREE.MeshStandardMaterial({ color: '#9a6b45', roughness: 0.92, flatShading: true })
const bellyMat = new THREE.MeshStandardMaterial({ color: '#d8bb92', roughness: 0.95, flatShading: true })
const darkMat = new THREE.MeshStandardMaterial({ color: '#2a2018', roughness: 0.6 })
const whiskerMat = new THREE.MeshStandardMaterial({ color: '#efe3cd', roughness: 0.8 })

const FOLLOW_DISTANCE = 2.15
const TELEPORT_DISTANCE = 16

export class Otter {
  readonly group = new THREE.Group()
  private target = new THREE.Vector3()
  private previous = new THREE.Vector3()
  private tail = new THREE.Group()
  private body = new THREE.Group()
  private head = new THREE.Group()
  private earL!: THREE.Mesh
  private earR!: THREE.Mesh
  private bobPhase = Math.random() * Math.PI * 2
  private yaw = 0
  private initialized = false

  constructor(scene: THREE.Scene) {
    this.group.visible = true
    scene.add(this.group)

    const torso = new THREE.Mesh(new THREE.SphereGeometry(0.32, 10, 8), furMat)
    torso.scale.set(1, 0.86, 1.75)
    this.body.add(torso)

    const belly = new THREE.Mesh(new THREE.SphereGeometry(0.26, 9, 7), bellyMat)
    belly.scale.set(0.82, 0.62, 1.3)
    belly.position.y = -0.12
    this.body.add(belly)

    this.head.position.set(0, 0.16, 0.52)
    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.23, 10, 8), furMat)
    skull.scale.set(1, 0.92, 0.95)
    this.head.add(skull)

    const snout = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), bellyMat)
    snout.position.set(0, -0.06, 0.19)
    snout.scale.set(1.1, 0.8, 0.9)
    this.head.add(snout)

    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.045, 6, 5), darkMat)
    nose.position.set(0, -0.04, 0.29)
    this.head.add(nose)

    for (const side of [-1, 1]) {
      const ear = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 5), furMat)
      ear.position.set(side * 0.16, 0.17, 0.02)
      this.head.add(ear)
      if (side < 0) this.earL = ear
      else this.earR = ear
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 5), darkMat)
      eye.position.set(side * 0.1, 0.06, 0.17)
      this.head.add(eye)
      for (let i = 0; i < 2; i++) {
        const whisker = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.22, 3), whiskerMat)
        whisker.rotation.z = Math.PI / 2
        whisker.rotation.y = side * (0.5 + i * 0.35)
        whisker.position.set(side * 0.13, -0.05 + i * 0.035, 0.17)
        this.head.add(whisker)
      }
      const paw = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 5), furMat)
      paw.scale.set(0.9, 0.7, 1.2)
      paw.position.set(side * 0.22, -0.16, 0.26)
      this.body.add(paw)
    }
    this.body.add(this.head)

    this.tail.position.set(0, -0.04, -0.52)
    const tailA = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.14, 0.5, 6), furMat)
    tailA.rotation.x = Math.PI / 2
    tailA.position.z = -0.22
    this.tail.add(tailA)
    const tailTip = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.34, 6), furMat)
    tailTip.rotation.x = -Math.PI / 2
    tailTip.position.z = -0.56
    this.tail.add(tailTip)
    this.body.add(this.tail)

    this.group.add(this.body)
    this.group.scale.setScalar(0.82)
  }

  update(
    dt: number,
    time: number,
    underwater: boolean,
    boatPos: THREE.Vector3,
    diverPos: THREE.Vector3,
    affection: number,
    heading: number,
  ) {
    const anchor = underwater ? diverPos : boatPos
    const behindX = Math.sin(heading) * FOLLOW_DISTANCE
    const behindZ = Math.cos(heading) * FOLLOW_DISTANCE
    const idleBob = Math.sin(time * 2.05 + this.bobPhase) * 0.045

    this.target.set(
      anchor.x + behindX,
      anchor.y + (underwater ? -0.46 : -0.04) + idleBob,
      anchor.z + behindZ,
    )

    if (!this.initialized || this.group.position.distanceTo(this.target) > TELEPORT_DISTANCE) {
      this.group.position.copy(this.target)
      this.previous.copy(this.target)
      this.initialized = true
    }

    const distance = this.group.position.distanceTo(this.target)
    const rate = distance > 5 ? 7.4 : distance > 2 ? 4.2 : underwater ? 3 : 2.4
    const catchUp = distance > 9 ? 1.6 : 1
    this.previous.copy(this.group.position)
    this.group.position.lerp(this.target, 1 - Math.exp(-dt * rate * catchUp))

    const vx = this.group.position.x - this.previous.x
    const vz = this.group.position.z - this.previous.z
    const moving = Math.hypot(vx, vz) > 0.012
    const faceX = moving ? vx : anchor.x - this.group.position.x
    const faceZ = moving ? vz : anchor.z - this.group.position.z
    if (Math.abs(faceX) + Math.abs(faceZ) > 0.0005) {
      const desiredYaw = Math.atan2(faceX, faceZ)
      let delta = desiredYaw - this.yaw
      while (delta > Math.PI) delta -= Math.PI * 2
      while (delta < -Math.PI) delta += Math.PI * 2
      this.yaw += delta * (1 - Math.exp(-dt * 7))
      this.group.rotation.y = this.yaw
    }

    const excited = Math.min(1, affection / 100)
    const wag = (moving ? 1.4 : 0.55) + excited * 0.45
    this.tail.rotation.y = Math.sin(time * (underwater ? 6.4 : 3.4) + this.bobPhase) * 0.34 * wag
    this.tail.rotation.x = Math.sin(time * 2.6 + this.bobPhase) * 0.14
    this.head.rotation.y = Math.sin(time * 0.72 + this.bobPhase) * 0.2
    this.head.rotation.x = underwater ? -0.1 : Math.sin(time * 1.55 + this.bobPhase) * 0.06
    this.body.rotation.z = Math.sin(time * 1.45 + this.bobPhase) * 0.055
    this.body.rotation.x = underwater
      ? Math.sin(time * 2.1 + this.bobPhase) * 0.05
      : Math.sin(time * 1.2 + this.bobPhase) * 0.025
    this.body.position.y = Math.sin(time * 2.05 + this.bobPhase) * 0.035

    const earTwitch = Math.sin(time * 2.9 + this.bobPhase) * 0.12
    if (this.earL) this.earL.scale.y = 0.9 + earTwitch
    if (this.earR) this.earR.scale.y = 0.9 - earTwitch * 0.7
  }

  dispose(scene: THREE.Scene) {
    scene.remove(this.group)
  }
}
