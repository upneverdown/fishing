import * as THREE from 'three'

/**
 * 通天河道：渡劫成功后在船头升起的 ascending 光河。
 * 船被强制牵引着沿河道上行，末端是天界之门。
 */
const CHANNEL_LENGTH = 232
const CHANNEL_WIDTH = 13
const TOP_ALTITUDE = 62

/** 河道升空曲线：先平缓，越接近天门越陡 */
export function ascensionRamp(t: number) {
  const k = Math.min(1, Math.max(0, t))
  return TOP_ALTITUDE * k * k
}

/** 船头朝向 -> 河道偏航角，使河道局部 -Z 方向与船的前进方向一致 */
export function ascensionHeading(forward: THREE.Vector3) {
  return Math.atan2(-forward.x, -forward.z)
}

const ribbonVertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const ribbonFragmentShader = /* glsl */ `
  uniform float uTime;
  uniform float uProgress;
  varying vec2 vUv;

  void main() {
    float t = vUv.y;
    float across = abs(vUv.x - 0.5) * 2.0;

    vec3 base = mix(vec3(0.42, 0.78, 1.0), vec3(0.74, 0.54, 1.0), smoothstep(0.12, 0.95, t));

    float streak = pow(0.5 + 0.5 * sin(t * 56.5 - uTime * 7.2), 6.0);
    float bands = 0.28 + 0.18 * sin(t * 26.0 + uTime * 0.7 + across * 3.0);
    float columns = pow(1.0 - across, 1.6) * (0.30 + 0.42 * sin(across * 12.0 + uTime));
    float core = pow(1.0 - across, 3.0);
    float rails = smoothstep(0.72, 0.93, across) * (1.0 - smoothstep(0.94, 1.0, across));

    // 船已爬过的河段在身后散去，前方一路亮到天门
    float ahead = smoothstep(uProgress - 0.13, uProgress - 0.03, t);
    float alpha = (bands + streak * 0.9 + columns * 0.5 + rails * 1.4 + core * 0.8) * ahead;

    vec3 color = base;
    color += streak * vec3(0.55, 0.75, 0.95);
    color += rails * vec3(0.85, 0.95, 1.0);
    color += core * vec3(0.30, 0.42, 0.62);
    gl_FragColor = vec4(color, clamp(alpha, 0.0, 1.0) * 0.82);
  }
`

const MIST_COUNT = 240

export class AscensionGate {
  readonly group = new THREE.Group()

  private ribbon: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>
  private pillars: THREE.InstancedMesh<THREE.CylinderGeometry, THREE.MeshStandardMaterial>
  private portal: THREE.Group
  private portalRing: THREE.Mesh<THREE.TorusGeometry, THREE.MeshStandardMaterial>
  private portalDisc: THREE.Mesh<THREE.CircleGeometry, THREE.MeshBasicMaterial>
  private portalLight: THREE.PointLight
  private mist: THREE.Points<THREE.BufferGeometry, THREE.PointsMaterial>
  private mistPos: Float32Array
  private mistRise: Float32Array
  private dummy = new THREE.Object3D()
  private headingValue = 0
  private origin = new THREE.Vector3()
  private _progress = -1
  private _active = false

  constructor(scene: THREE.Scene) {
    this.group.visible = false
    scene.add(this.group)

    const geo = new THREE.PlaneGeometry(CHANNEL_WIDTH, CHANNEL_LENGTH, 10, 170)
    geo.rotateX(-Math.PI / 2)
    geo.translate(0, 0, -CHANNEL_LENGTH / 2)
    const position = geo.attributes.position as THREE.BufferAttribute
    for (let i = 0; i < position.count; i++) {
      position.setY(i, ascensionRamp(-position.getZ(i) / CHANNEL_LENGTH))
    }
    position.needsUpdate = true
    geo.computeVertexNormals()

    this.ribbon = new THREE.Mesh(
      geo,
      new THREE.ShaderMaterial({
        vertexShader: ribbonVertexShader,
        fragmentShader: ribbonFragmentShader,
        uniforms: { uTime: { value: 0 }, uProgress: { value: 0 } },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      }),
    )
    this.ribbon.frustumCulled = false
    this.group.add(this.ribbon)

    this.pillars = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(0.34, 0.62, 5.4, 6),
      new THREE.MeshStandardMaterial({
        color: '#bfe6ff',
        emissive: '#5fd8ff',
        emissiveIntensity: 1.15,
        roughness: 0.42,
        transparent: true,
        opacity: 0.72,
      }),
      30,
    )
    this.pillars.castShadow = false
    this.pillars.frustumCulled = false
    this.group.add(this.pillars)
    this.layoutPillars()

    this.portalRing = new THREE.Mesh(
      new THREE.TorusGeometry(15, 1.5, 12, 42),
      new THREE.MeshStandardMaterial({
        color: '#ffe6b0',
        emissive: '#ffc466',
        emissiveIntensity: 2.2,
        roughness: 0.3,
        metalness: 0.4,
      }),
    )
    this.portalDisc = new THREE.Mesh(
      new THREE.CircleGeometry(14.4, 48),
      new THREE.MeshBasicMaterial({
        color: '#fff6e6',
        transparent: true,
        opacity: 0.6,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    )
    this.portalLight = new THREE.PointLight('#ffe2ab', 26, 70, 2)
    this.portal = new THREE.Group()
    this.portal.add(this.portalRing, this.portalDisc, this.portalLight)
    this.portal.position.set(0, ascensionRamp(1) + 4, -CHANNEL_LENGTH)
    this.group.add(this.portal)

    this.mistPos = new Float32Array(MIST_COUNT * 3)
    this.mistRise = new Float32Array(MIST_COUNT)
    for (let i = 0; i < MIST_COUNT; i++) this.seedMist(i, true)
    const mistGeo = new THREE.BufferGeometry()
    mistGeo.setAttribute('position', new THREE.BufferAttribute(this.mistPos, 3))
    this.mist = new THREE.Points(
      mistGeo,
      new THREE.PointsMaterial({
        color: '#dff4ff',
        size: 0.85,
        transparent: true,
        opacity: 0.55,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        sizeAttenuation: true,
      }),
    )
    this.mist.frustumCulled = false
    this.group.add(this.mist)
  }

  get isActive() {
    return this._active
  }

  get progress() {
    return this._progress
  }

  get heading() {
    return this.headingValue
  }

  start(origin: THREE.Vector3, forward: THREE.Vector3) {
    this.headingValue = ascensionHeading(forward)
    this.origin.copy(origin)
    this.group.position.copy(origin)
    this.group.rotation.set(0, this.headingValue, 0)
    this.group.visible = true
    this._active = true
    this._progress = 0
    this.ribbon.material.uniforms.uProgress.value = 0
    for (let i = 0; i < MIST_COUNT; i++) this.seedMist(i, true)
    this.mist.geometry.attributes.position.needsUpdate = true
  }

  stop() {
    this._active = false
    this._progress = -1
    this.group.visible = false
  }

  /** 河道上 t∈[0,1] 处的世界坐标 */
  pointAt(t: number, out: THREE.Vector3) {
    const k = Math.min(1, Math.max(0, t))
    const localZ = -k * CHANNEL_LENGTH
    const sin = Math.sin(this.headingValue)
    const cos = Math.cos(this.headingValue)
    out.set(
      this.origin.x + localZ * sin,
      this.origin.y + ascensionRamp(k),
      this.origin.z + localZ * cos,
    )
    return out
  }

  /** 船已爬到的河段比例：身后的河光随之散去 */
  setProgress(t: number) {
    this._progress = Math.min(1, Math.max(0, t))
  }

  update(dt: number, time: number) {
    if (!this._active) return
    const uniforms = this.ribbon.material.uniforms
    uniforms.uTime.value = time
    uniforms.uProgress.value = this._progress
    this.portalRing.rotation.z = time * 0.55
    this.portalDisc.rotation.z = -time * 0.22
    this.portal.scale.setScalar(1 + Math.sin(time * 1.9) * 0.05)

    for (let i = 0; i < MIST_COUNT; i++) {
      const index = i * 3
      this.mistPos[index + 1] += this.mistRise[i] * dt
      this.mistPos[index] += Math.sin(time * 0.8 + i) * dt * 0.7
      this.mistPos[index + 2] += dt * 3.4
      const t = -this.mistPos[index + 2] / CHANNEL_LENGTH
      if (this.mistPos[index + 1] > ascensionRamp(Math.min(1, Math.max(0, t))) + 9 || t > 1) {
        this.seedMist(i, false)
      }
    }
    this.mist.geometry.attributes.position.needsUpdate = true
  }

  dispose() {
    this.ribbon.geometry.dispose()
    this.ribbon.material.dispose()
    this.pillars.geometry.dispose()
    this.pillars.material.dispose()
    this.portalRing.geometry.dispose()
    this.portalRing.material.dispose()
    this.portalDisc.geometry.dispose()
    this.portalDisc.material.dispose()
    this.mist.geometry.dispose()
    this.mist.material.dispose()
    this.group.removeFromParent()
  }

  private seedMist(i: number, spread: boolean) {
    const t = spread ? Math.random() : Math.random() * 0.2
    this.mistPos[i * 3] = (Math.random() - 0.5) * CHANNEL_WIDTH * 1.2
    this.mistPos[i * 3 + 1] = ascensionRamp(t) + 0.4 + Math.random() * 3.2
    this.mistPos[i * 3 + 2] = -t * CHANNEL_LENGTH
    this.mistRise[i] = 0.9 + Math.random() * 2.4
  }

  private layoutPillars() {
    const perSide = this.pillars.count / 2
    for (let i = 0; i < this.pillars.count; i++) {
      const side = i < perSide ? -1 : 1
      const n = i < perSide ? i : i - perSide
      const t = n / (perSide - 1)
      const z = -t * (CHANNEL_LENGTH - 14) - 7
      this.dummy.position.set(side * (CHANNEL_WIDTH / 2 + 1.7), ascensionRamp(t) + 2.2, z)
      this.dummy.rotation.set(side * 0.1, t * 2.2, 0)
      const scale = 1 - t * 0.32
      this.dummy.scale.set(scale, 1 + t * 0.7, scale)
      this.dummy.updateMatrix()
      this.pillars.setMatrixAt(i, this.dummy.matrix)
    }
    this.pillars.instanceMatrix.needsUpdate = true
  }
}

export const ASCENSION_CHANNEL_LENGTH = CHANNEL_LENGTH
export const ASCENSION_TOP_ALTITUDE = TOP_ALTITUDE
