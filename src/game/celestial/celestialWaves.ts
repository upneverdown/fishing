const TAU = Math.PI * 2

export interface CloudWave {
  dx: number
  dz: number
  length: number
  amplitude: number
  omega: number
  phase: number
}

/** surfaceAt() 与云海/叶海顶点位移共用同一组层结，船只才浮在视觉波峰上 */
export const CLOUD_WAVES: CloudWave[] = [
  { dx: 0.928, dz: 0.372, length: 54, amplitude: 0.28, omega: 0.22, phase: 0 },
  { dx: -0.461, dz: 0.887, length: 32, amplitude: 0.17, omega: 0.29, phase: 1.9 },
  { dx: 0.699, dz: -0.715, length: 17.5, amplitude: 0.12, omega: 0.38, phase: 4.2 },
]

export function celestialWaveGLSL(waves: CloudWave[] = CLOUD_WAVES) {
  return waves
    .map((wave) => {
      const k = TAU / wave.length
      return `
  {
    const vec2 D = vec2(${wave.dx.toFixed(6)}, ${wave.dz.toFixed(6)});
    const float K = ${k.toFixed(6)};
    const float A = ${wave.amplitude.toFixed(6)};
    const float PH = ${wave.phase.toFixed(6)};
    const float W = ${wave.omega.toFixed(6)};
    float ph = K * dot(D, p) + PH - W * uTime;
    disp += A * sin(ph);
    slope += A * K * D * cos(ph);
  }`
    })
    .join('\n')
}

export function celestialSurfaceHeight(x: number, z: number, time: number) {
  let height = 0
  for (const wave of CLOUD_WAVES) {
    const k = TAU / wave.length
    height +=
      wave.amplitude * Math.sin(k * (wave.dx * x + wave.dz * z) + wave.phase - wave.omega * time)
  }
  return height
}
