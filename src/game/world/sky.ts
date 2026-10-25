import * as THREE from 'three'

export const SKY = {
  zenith: '#6fb3c4',
  horizon: '#d3e5dc',
  sun: '#ffe6bd',
  fog: '#b7dcd5',
}

const vertexShader = /* glsl */ `
  varying vec3 vDir;

  void main() {
    vDir = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const fragmentShader = /* glsl */ `
  #include <common>

  uniform float uTime;
  uniform vec3 uZenith;
  uniform vec3 uHorizon;
  uniform vec3 uSunColor;
  uniform vec3 uSunDir;

  varying vec3 vDir;

  float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  float vnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash21(i);
    float b = hash21(i + vec2(1.0, 0.0));
    float c = hash21(i + vec2(0.0, 1.0));
    float d = hash21(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }

  float fbm(vec2 p) {
    float v = 0.0;
    float amp = 0.5;
    for (int i = 0; i < 4; i++) {
      v += amp * vnoise(p);
      p *= 2.07;
      amp *= 0.5;
    }
    return v;
  }

  void main() {
    vec3 dir = normalize(vDir);
    float up = clamp(dir.y, 0.0, 1.0);
    vec3 col = mix(uHorizon, uZenith, pow(up, 0.62));

    float sunAmt = max(dot(dir, uSunDir), 0.0);
    col += uSunColor * pow(sunAmt, 9.0) * 0.34;
    col += uSunColor * pow(sunAmt, 360.0) * 4.2;
    col += uSunColor * pow(1.0 - up, 4.0) * pow(sunAmt, 2.0) * 0.1;

    vec2 cuv = dir.xz / max(dir.y + 0.2, 0.02);
    float cloudNoise = fbm(cuv * 0.55 + vec2(uTime * 0.004, uTime * 0.0015));
    float cloudMask =
      smoothstep(0.5, 0.78, cloudNoise) *
      smoothstep(0.02, 0.22, dir.y) *
      (1.0 - smoothstep(0.5, 0.95, dir.y));
    vec3 cloudColor = mix(uSunColor, vec3(1.0), 0.55);
    col = mix(col, cloudColor, cloudMask * 0.22);

    gl_FragColor = vec4(col, 1.0);

    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`

export function createSky(sunDirection: THREE.Vector3) {
  const geometry = new THREE.SphereGeometry(420, 40, 24)
  const material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      uTime: { value: 0 },
      uZenith: { value: new THREE.Color(SKY.zenith) },
      uHorizon: { value: new THREE.Color(SKY.horizon) },
      uSunColor: { value: new THREE.Color(SKY.sun) },
      uSunDir: { value: sunDirection.clone().normalize() },
    },
  })

  const mesh = new THREE.Mesh(geometry, material)
  mesh.renderOrder = -10
  mesh.frustumCulled = false
  return mesh
}
