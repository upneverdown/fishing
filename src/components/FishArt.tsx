import { useId } from 'react'
import { RARITIES } from '@/game/fishing/fishTable'
import type { Rarity } from '@/types'

const SHAPES: Record<string, { stretch: number; belly: number }> = {
  puffer: { stretch: 0.84, belly: 1.18 },
  moonsturgeon: { stretch: 1.04, belly: 0.86 },
  redfin: { stretch: 1.02, belly: 0.9 },
  grasscarp: { stretch: 1.04, belly: 0.98 },
}

interface FishArtProps {
  rarity: Rarity
  defId?: string
  className?: string
  glow?: boolean
}

export function FishArt({ rarity, defId = '', className, glow = true }: FishArtProps) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '')
  const meta = RARITIES[rarity]
  const shape = SHAPES[defId] ?? { stretch: 1, belly: 1 }
  const body = `translate(66 45) scale(${shape.stretch} ${shape.belly}) translate(-66 -45)`

  return (
    <svg
      viewBox="0 0 140 90"
      role="img"
      aria-label="渔获插画"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id={`body-${uid}`} x1="66" y1="22" x2="70" y2="70" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={meta.color} stopOpacity="0.98" />
          <stop offset="0.52" stopColor={meta.color} stopOpacity="0.66" />
          <stop offset="1" stopColor="#09302f" stopOpacity="0.94" />
        </linearGradient>
        <linearGradient id={`tail-${uid}`} x1="6" y1="45" x2="30" y2="45" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={meta.color} stopOpacity="0.35" />
          <stop offset="1" stopColor={meta.color} stopOpacity="0.85" />
        </linearGradient>
        <radialGradient id={`halo-${uid}`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor={meta.color} stopOpacity="0.28" />
          <stop offset="0.7" stopColor={meta.color} stopOpacity="0.08" />
          <stop offset="1" stopColor={meta.color} stopOpacity="0" />
        </radialGradient>
      </defs>

      {glow && (
        <>
          <circle cx="72" cy="45" r="42" fill={`url(#halo-${uid})`} />
          <circle cx="72" cy="45" r="31" stroke={meta.color} strokeOpacity="0.22" strokeWidth="1" strokeDasharray="2 6" />
        </>
      )}

      <g transform={body}>
        <path
          d="M28 45C22 38 12 29 6 24C9 35 11 40 13 45C11 50 9 55 6 66C12 61 22 52 28 45Z"
          fill={`url(#tail-${uid})`}
          stroke="#f5efdf"
          strokeOpacity="0.4"
          strokeWidth="1.1"
          strokeLinejoin="round"
        />
        <path
          d="M48 30C58 15 78 13 90 23C77 21 62 25 54 33Z"
          fill={meta.color}
          fillOpacity="0.6"
          stroke="#f5efdf"
          strokeOpacity="0.34"
          strokeWidth="1"
          strokeLinejoin="round"
        />
        <path
          d="M62 61C69 73 79 76 87 69C78 71 69 68 64 60Z"
          fill={meta.color}
          fillOpacity="0.48"
          stroke="#f5efdf"
          strokeOpacity="0.3"
          strokeWidth="1"
          strokeLinejoin="round"
        />

        <path
          d="M24 45C30 28 52 21 74 25C98 29 114 37 120 45C114 53 98 61 74 65C52 69 30 62 24 45Z"
          fill={`url(#body-${uid})`}
          stroke="#08211f"
          strokeOpacity="0.45"
          strokeWidth="1.3"
        />

        <path
          d="M40 34C52 29 72 28 92 33C76 33 58 37 46 42C42 40 40 37 40 34Z"
          fill="#ffffff"
          fillOpacity="0.24"
        />

        <path d="M50 41C57 37 65 36 72 37" stroke="#ffffff" strokeOpacity="0.32" strokeWidth="1" strokeLinecap="round" />
        <path d="M54 49C62 45 70 44 78 45" stroke="#ffffff" strokeOpacity="0.26" strokeWidth="1" strokeLinecap="round" />
        <path d="M60 57C67 53 74 52 81 53" stroke="#ffffff" strokeOpacity="0.2" strokeWidth="1" strokeLinecap="round" />

        <path d="M95 31C89 38 89 52 95 59" stroke="#08211f" strokeOpacity="0.34" strokeWidth="1.2" strokeLinecap="round" />

        <path
          d="M86 48C94 57 104 60 107 55C99 51 94 47 86 47Z"
          fill={meta.color}
          fillOpacity="0.55"
          stroke="#f5efdf"
          strokeOpacity="0.3"
          strokeWidth="1"
          strokeLinejoin="round"
        />

        <circle cx="103" cy="39" r="4.6" fill="#f7f2e4" stroke="#08211f" strokeOpacity="0.4" strokeWidth="1" />
        <circle cx="104" cy="39" r="2.2" fill="#102724" />
        <circle cx="105.2" cy="37.8" r="0.8" fill="#f7f2e4" fillOpacity="0.9" />

        <path d="M117 45C119 46.6 119 47.6 117 49" stroke="#08211f" strokeOpacity="0.55" strokeWidth="1.2" strokeLinecap="round" />
      </g>

      <circle cx="23" cy="22" r="2" stroke={meta.color} strokeOpacity="0.5" strokeWidth="1" />
      <circle cx="16" cy="32" r="1.2" stroke={meta.color} strokeOpacity="0.36" strokeWidth="1" />
      <circle cx="120" cy="67" r="1.4" fill={meta.color} fillOpacity="0.4" />
    </svg>
  )
}
