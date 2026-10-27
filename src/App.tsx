import { AnimatePresence } from 'motion/react'
import { GameCanvas } from '@/components/GameCanvas'
import { Hud } from '@/components/Hud'
import { CombatHud } from '@/components/CombatHud'
import { Minimap } from '@/components/Minimap'
import { PromptBar } from '@/components/PromptBar'
import { PowerMeter } from '@/components/PowerMeter'
import { FightOverlay } from '@/components/FightOverlay'
import { BiteAlert } from '@/components/BiteAlert'
import { Toasts } from '@/components/Toasts'
import { DesktopHints } from '@/components/DesktopHints'
import { TouchControls } from '@/components/TouchControls'
import { UnderwaterHud } from '@/components/UnderwaterHud'
import { IntroScreen } from '@/components/IntroScreen'
import { FishCardDialog } from '@/components/FishCardDialog'
import { MarketDialog } from '@/components/MarketDialog'
import { BagDialog } from '@/components/BagDialog'
import { ShipyardDialog } from '@/components/ShipyardDialog'
import { BaitPickerDialog } from '@/components/BaitPickerDialog'
import { SeasonPickerDialog } from '@/components/SeasonPickerDialog'
import { TownDialog } from '@/components/TownDialog'
import { NpcDialog } from '@/components/NpcDialog'
import { CaptureResultDialog } from '@/components/CaptureResultDialog'
import { RareMoment } from '@/components/RareMoment'
import { CookingSystem } from '@/components/CookingSystem'
import { LightningOverlay } from '@/components/LightningOverlay'
import { AchievementToast } from '@/components/AchievementToast'
import { AchievementsPanel } from '@/components/AchievementsPanel'
import { CrewPanel } from '@/components/CrewPanel'
import { PlayerSkinShop } from '@/components/PlayerSkinShop'
import { DragonRaceHud } from '@/components/DragonRaceHud'
import { CrewCatchNotice } from '@/components/CrewCatchNotice'
import { SeaEventHud } from '@/components/SeaEventHud'
import { CultivationHud } from '@/components/CultivationHud'
import { TribulationOverlay } from '@/components/TribulationOverlay'
import { useGameStore } from '@/store/useGameStore'
import { useIsTouch } from '@/hooks/useMediaQuery'

export default function App() {
  const isTouch = useIsTouch()
  const started = useGameStore((s) => s.started)
  const underwater = useGameStore((s) => s.underwater)

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-abyss text-foreground">
      <GameCanvas />

      <div className="pointer-events-none absolute inset-0 z-10 bg-[radial-gradient(ellipse_at_center,transparent_46%,rgba(3,15,14,0.42)_100%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-28 bg-gradient-to-b from-abyss/55 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-32 bg-gradient-to-t from-abyss/50 to-transparent" />

      {started && (
        <>
          <Hud />
          <CombatHud />
          {!underwater && <Minimap />}
          {!underwater && (
            <>
              <PromptBar />
              <PowerMeter />
              <FightOverlay />
              <BiteAlert />
            </>
          )}
          <Toasts />
          <AchievementToast />
          <SeaEventHud />
          <DragonRaceHud />
          <CrewCatchNotice />
          <CultivationHud />
          <TribulationOverlay />
          {underwater ? (
            <UnderwaterHud />
          ) : isTouch ? (
            <TouchControls />
          ) : (
            <DesktopHints />
          )}
        </>
      )}

      <FishCardDialog />
      <MarketDialog />
      <BagDialog />
      <ShipyardDialog />
      <BaitPickerDialog />
      <SeasonPickerDialog />
      <TownDialog />
      <NpcDialog />
      <CaptureResultDialog />
      <RareMoment />
      <CookingSystem />
      <LightningOverlay />
      <AchievementsPanel />
      <CrewPanel />
      <PlayerSkinShop />

      <AnimatePresence>
        {!started && <IntroScreen onStart={() => undefined} />}
      </AnimatePresence>
    </div>
  )
}
