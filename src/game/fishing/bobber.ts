import * as THREE from 'three'

export class Bobber {
  readonly group = new THREE.Group()
  private bait: THREE.Mesh<THREE.SphereGeometry, THREE.MeshStandardMaterial>

  constructor(scene: THREE.Scene) {
    const body = new THREE.Mesh(
      new THREE.SphereGeometry(0.15, 12, 10),
      new THREE.MeshStandardMaterial({ color: '#f5f2e8', roughness: 0.5 }),
    )
    body.position.y = 0.04

    const cap = new THREE.Mesh(
      new THREE.SphereGeometry(0.152, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55),
      new THREE.MeshStandardMaterial({ color: '#dd5b4a', roughness: 0.5 }),
    )
    cap.position.y = 0.05

    const antenna = new THREE.Mesh(
      new THREE.CylinderGeometry(0.014, 0.02, 0.32, 6),
      new THREE.MeshStandardMaterial({ color: '#dd5b4a', roughness: 0.6 }),
    )
    antenna.position.y = 0.24

    const tip = new THREE.Mesh(
      new THREE.SphereGeometry(0.035, 8, 6),
      new THREE.MeshStandardMaterial({ color: '#f2c15c', emissive: '#f2c15c', emissiveIntensity: 0.4 }),
    )
    tip.position.y = 0.4

    this.bait = new THREE.Mesh(
      new THREE.SphereGeometry(0.055, 8, 6),
      new THREE.MeshStandardMaterial({
        color: '#c9755d',
        roughness: 0.45,
        emissive: '#5a2418',
        emissiveIntensity: 0.35,
      }),
    )
    this.bait.scale.set(1.5, 0.85, 0.85)
    this.bait.position.set(0, -0.13, 0.02)

    this.group.add(body, cap, antenna, tip, this.bait)
    this.group.visible = false
    scene.add(this.group)
  }

  setBait(color: string) {
    this.bait.material.color.set(color)
    this.bait.material.emissive.set(color)
    this.bait.material.emissiveIntensity = 0.18
  }

  setPosition(x: number, y: number, z: number) {
    this.group.position.set(x, y, z)
  }

  setVisible(visible: boolean) {
    this.group.visible = visible
  }
}
