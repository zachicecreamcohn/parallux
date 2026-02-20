import { useEffect, useRef, useState } from 'react';
import { Stack, Title } from '@mantine/core';
import { useStore } from '../context/StoreContext';
import CameraFeed from '../components/Dashboard/CameraFeed';
import StageSizeForm from '../components/Dashboard/StageSizeForm';
import { CrosshairPosition, GamepadState, StageSize } from '../shared/interfaces';

const DEFAULT_STAGE: StageSize = { widthFeet: 0, widthInches: 0, heightFeet: 0, heightInches: 0, gridSpacingFt: 1 };

const DEFAULT_GAMEPAD_STATE: GamepadState = {
  rightStickX: 0, rightStickY: 0, leftStickY: 0,
  r2: 0, l2: 0,
  dpadUp: false, dpadDown: false,
  aButton: false, bButton: false,
};

export default function Dashboard() {
  const [stageSize] = useStore('stageSize');
  const stage = (stageSize && Object.keys(stageSize).length > 0)
    ? stageSize as StageSize
    : DEFAULT_STAGE;

  const [crosshair, setCrosshair] = useState<CrosshairPosition | undefined>(undefined);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    let lastTick = 0;

    const loop = () => {
      rafRef.current = requestAnimationFrame(loop);
      const now = Date.now();
      if (now - lastTick < 25) return;
      lastTick = now;

      const gp = navigator.getGamepads()[0];
      const state: GamepadState = gp ? {
        rightStickX: gp.axes[2] ?? 0,
        rightStickY: gp.axes[3] ?? 0,
        leftStickY: gp.axes[1] ?? 0,
        r2: gp.buttons[7]?.value ?? 0,
        l2: gp.buttons[6]?.value ?? 0,
        dpadUp: gp.buttons[12]?.pressed ?? false,
        dpadDown: gp.buttons[13]?.pressed ?? false,
        aButton: gp.buttons[0]?.pressed ?? false,
        bButton: gp.buttons[1]?.pressed ?? false,
      } : DEFAULT_GAMEPAD_STATE;

      window.api.control.sendGamepadState(state);

    }

    rafRef.current = requestAnimationFrame(loop);
    const unsub = window.api.control.onCrosshair((pos) => {
      setCrosshair(pos);
    });

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      unsub();
    };
  }, []);

  return (
    <div style={{ padding: '20px' }}>
      <Title order={3} mb="md">Dashboard</Title>
      <Stack gap="md">
        <CameraFeed stageSize={stage} crosshair={crosshair} />
        <StageSizeForm />
      </Stack>
    </div>
  );
}
