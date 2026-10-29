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
import { AscensionOverlay } from '@/components/AscensionOverlay'
import { FactionChoiceOverlay } from '@/components/FactionChoiceOverlay'
import { SectDialog } from '@/components/SectDialog'
import { ContestOverlay } from '@/components/ContestOverlay'
import { DemonQuizOverlay } from '@/components/DemonQuizOverlay'
import { EpiphanyNotice } from '@/components/EpiphanyNotice'
import { VitalHud } from '@/components/VitalHud'
import { WeaponBar } from '@/components/WeaponBar'
import { useGameStore } from '@/store/useGameStore'
import { useIsTouch } from '@/hooks/useMediaQuery'

export default function App() {
  const isTouch = useIsTouch()
  const started = useGameStore((s) => s.started)
  const underwater = useGameStore((s) => s.underwater)
  const celestialZone = useGameStore((s) => s.mapZone === 'celestial')

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-abyss text-foreground">
      <GameCanvas />

      <div
        className={
          celestialZone
            ? 'pointer-events-none absolute inset-0 z-10 bg-[radial-gradient(ellipse_at_center,transparent_52%,rgba(96,52,10,0.26)_100%)]'
            : 'pointer-events-none absolute inset-0 z-10 bg-[radial-gradient(ellipse_at_center,transparent_46%,rgba(3,15,14,0.42)_100%)]'
        }
      />
      <div
        className={
          celestialZone
            ? 'pointer-events-none absolute inset-x-0 top-0 z-10 h-28 bg-gradient-to-b from-[#6a3d12]/45 to-transparent'
            : 'pointer-events-none absolute inset-x-0 top-0 z-10 h-28 bg-gradient-to-b from-abyss/55 to-transparent'
        }
      />
      <div
        className={
          celestialZone
            ? 'pointer-events-none absolute inset-x-0 bottom-0 z-10 h-32 bg-gradient-to-t from-[#6a3d12]/40 to-transparent'
            : 'pointer-events-none absolute inset-x-0 bottom-0 z-10 h-32 bg-gradient-to-t from-abyss/50 to-transparent'
        }
      />

      {started && (
        <>
          <Hud />
          <CombatHud />
          {!underwater && !celestialZone && <Minimap />}
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
          <AscensionOverlay />
          <FactionChoiceOverlay />
          <ContestOverlay />
          <DemonQuizOverlay />
          <EpiphanyNotice />
          <VitalHud />
          {!underwater && <WeaponBar />}
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
      <SectDialog />

      <AnimatePresence>
        {!started && <IntroScreen onStart={() => undefined} />}
      </AnimatePresence>
    </div>
  )
}
