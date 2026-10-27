export type PlayerSkinId = 'angler' | 'nailong' | 'nailwa' | 'pangmao'

export type PlayerAccessory = 'straw' | 'dragon' | 'frog' | 'cat'

export interface PlayerSkinDef {
  id: PlayerSkinId
  name: string
  tagline: string
  price: number
  body: string
  trim: string
  hood: string
  accent: string
  accessory: PlayerAccessory
}

export const PLAYER_SKINS: PlayerSkinDef[] = [
  {
    id: 'angler',
    name: '海湾渔夫',
    tagline: '旧夹克、草帽和一身晒出来的咸味，老码头最熟悉的样子。',
    price: 0,
    body: '#b96b45',
    trim: '#e0b184',
    hood: '#d7b271',
    accent: '#6fe0cf',
    accessory: 'straw',
  },
  {
    id: 'nailong',
    name: '奶龙',
    tagline: '嫩黄色的小龙连帽衫，帽角上还留着两颗没长硬的乳牙。',
    price: 500,
    body: '#f2cf52',
    trim: '#fff0b8',
    hood: '#f7dc74',
    accent: '#ffb347',
    accessory: 'dragon',
  },
  {
    id: 'nailwa',
    name: '奶蛙',
    tagline: '一身青草绿，头顶两只圆眼睛，蹲在船头像刚跳上来的。',
    price: 800,
    body: '#6cc35c',
    trim: '#d6f4a8',
    hood: '#86d46f',
    accent: '#b8f28f',
    accessory: 'frog',
  },
  {
    id: 'pangmao',
    name: '胖猫',
    tagline: '樱花粉的软乎乎的连帽衫，猫耳朵会跟着船一起晃。',
    price: 1000,
    body: '#efa1bd',
    trim: '#ffe0eb',
    hood: '#f5b6cc',
    accent: '#ff7fa8',
    accessory: 'cat',
  },
]

const PLAYER_SKIN_MAP = new Map<PlayerSkinId, PlayerSkinDef>(
  PLAYER_SKINS.map((skin) => [skin.id, skin]),
)

export function isPlayerSkin(id: string): id is PlayerSkinId {
  return PLAYER_SKIN_MAP.has(id as PlayerSkinId)
}

export function playerSkinById(id: string): PlayerSkinDef {
  return PLAYER_SKIN_MAP.get(id as PlayerSkinId) ?? PLAYER_SKINS[0]
}
