import * as THREE from 'three'

const furMat = new THREE.MeshStandardMaterial({ color: '#9a6b45', roughness: 0.92, flatShading: true })
const bellyMat = new THREE.MeshStandardMaterial({ color: '#d8bb92', roughness: 0.95, flatShading: true })
const darkMat = new THREE.MeshStandardMaterial({ color: '#2a2018', roughness: 0.6 })
const whiskerMat = new THREE.MeshStandardMaterial({ color: '#efe3cd', roughness: 0.8 })

export class Otter {
  readonly group = new THREE.Group()
  private target = new THREE.Vector3()
  private look = new THREE.Vector3()
  private tail = new THREE.Group()
  private body = new THREE.Group()
  private head = new THREE.Group()
  private bobPhase = Math.random() * Math.PI * 2

  constructor(scene: THREE.Scene) {
    this.group.visible = false
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
  ) {
    const unlocked = affection >= 25
    this.group.visible = unlocked
    if (!unlocked) return

    if (underwater) {
      this.target.set(diverPos.x + 1.4, diverPos.y - 0.55, diverPos.z + 1.1)
      this.group.position.lerp(this.target, 1 - Math.exp(-dt * 2.4))
    } else {
      this.target.set(boatPos.x - 1.6, boatPos.y + 0.06, boatPos.z - 1.2)
      const wave = Math.sin(time * 1.3 + this.bobPhase) * 0.06
      this.target.y += wave
      this.group.position.lerp(this.target, 1 - Math.exp(-dt * 1.8))
    }

    const speed = this.group.position.distanceToSquared(this.target)
    const wiggle = Math.sin(time * (underwater ? 5.2 : 2.6) + this.bobPhase) * (0.18 + Math.min(0.5, speed))
    this.tail.rotation.y = wiggle
    this.tail.rotation.x = Math.sin(time * 3 + this.bobPhase) * 0.12
    this.head.rotation.y = Math.sin(time * 0.8 + this.bobPhase) * 0.22
    this.head.rotation.x = underwater ? -0.08 : Math.sin(time * 1.7) * 0.08
    this.body.rotation.z = Math.sin(time * 1.5 + this.bobPhase) * 0.06
    this.look.copy(underwater ? diverPos : boatPos).sub(this.group.position)
    this.group.rotation.y = Math.atan2(this.look.x, this.look.z)
  }

  dispose(scene: THREE.Scene) {
    scene.remove(this.group)
  }
}
