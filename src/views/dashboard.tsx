import { useCallback, useEffect, useRef, useState } from 'react';
import { Button, Group, Select, Stack, Text, Title } from '@mantine/core';
import { useStore } from '../context/StoreContext';
import CameraFeed from '../components/Dashboard/CameraFeed';
import StageSizeForm from '../components/Dashboard/StageSizeForm';
import { CalibrationPoint, CrosshairPosition, GamepadState, PatchData, StageSize } from '../shared/interfaces';
import { CalibrationScreenPoint } from '../components/Dashboard/gridUtils';

const DEFAULT_STAGE: StageSize = { widthFeet: 0, widthInches: 0, heightFeet: 0, heightInches: 0, gridSpacingFt: 1 };

const DEFAULT_GAMEPAD_STATE: GamepadState = {
  rightStickX: 0, rightStickY: 0, leftStickY: 0,
  r2: 0, l2: 0,
  dpadUp: false, dpadDown: false,
  aButton: false, bButton: false,
};

type CalibrationState =
  | { phase: 'idle' }
  | { phase: 'selectFixture' }
  | { phase: 'running'; fixtureId: string; pointIndex: number; points: CalibrationScreenPoint[]; lut: CalibrationPoint[] };

export default function Dashboard() {
  const [stageSize] = useStore('stageSize');
  const [patch] = useStore('patch');
  const [calibrationData, setCalibrationData] = useStore('calibrationData');
  const stage = (stageSize && Object.keys(stageSize).length > 0)
    ? stageSize as StageSize
    : DEFAULT_STAGE;

  const [crosshair, setCrosshair] = useState<CrosshairPosition | undefined>(undefined);
  const rafRef = useRef<number | null>(null);
  const [calibration, setCalibration] = useState<CalibrationState>({ phase: 'idle' });
  const calibrationRef = useRef(calibration);
  calibrationRef.current = calibration;

  const calibrationPointsRef = useRef<CalibrationScreenPoint[]>([]);
  const prevAButton = useRef(false);

  const handleCalibrationPointsReady = useCallback((points: CalibrationScreenPoint[]) => {
    calibrationPointsRef.current = points;
  }, []);

  const advanceCalibration = useCallback(async () => {
    const cal = calibrationRef.current;
    if (cal.phase !== 'running') return;

    const fixtureState = await window.api.control.getFixtureState(cal.fixtureId);
    if (!fixtureState) return;

    const currentPt = cal.points[cal.pointIndex];
    const newEntry: CalibrationPoint = {
      u: currentPt.u,
      v: currentPt.v,
      panNorm: fixtureState.panNorm,
      tiltNorm: fixtureState.tiltNorm,
    };
    const newLut = [...cal.lut, newEntry];

    const nextIndex = cal.pointIndex + 1;
    if (nextIndex >= cal.points.length) {
      // Calibration complete — save LUT
      const existing = (calibrationData && typeof calibrationData === 'object') ? calibrationData : {};
      setCalibrationData({ ...existing, [cal.fixtureId]: newLut } as any);
      window.api.control.setCalibrationTarget(null);
      window.api.control.setCalibrationFixture(null);
      setCalibration({ phase: 'idle' });
    } else {
      window.api.control.setCalibrationTarget({ u: cal.points[nextIndex].u, v: cal.points[nextIndex].v });
      setCalibration({ ...cal, pointIndex: nextIndex, lut: newLut });
    }
  }, [calibrationData, setCalibrationData]);

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

      // A-button edge detection for calibration advance
      const aPressed = state.aButton && !prevAButton.current;
      prevAButton.current = state.aButton;
      if (aPressed && calibrationRef.current.phase === 'running') {
        advanceCalibration();
      }
    };

    rafRef.current = requestAnimationFrame(loop);
    const unsub = window.api.control.onCrosshair((pos) => {
      setCrosshair(pos);
    });

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      unsub();
    };
  }, [advanceCalibration]);

  const startCalibration = (fixtureId: string) => {
    const points = calibrationPointsRef.current;
    if (points.length === 0) return;
    window.api.control.setCalibrationFixture(fixtureId);
    window.api.control.setCalibrationTarget({ u: points[0].u, v: points[0].v });
    setCalibration({ phase: 'running', fixtureId, pointIndex: 0, points, lut: [] });
  };

  const cancelCalibration = () => {
    window.api.control.setCalibrationTarget(null);
    window.api.control.setCalibrationFixture(null);
    setCalibration({ phase: 'idle' });
  };

  const patchData = (patch && typeof patch === 'object' ? patch : {}) as PatchData;
  const fixtureIds = Object.keys(patchData);

  const currentCalibrationPoint = calibration.phase === 'running'
    ? calibration.points[calibration.pointIndex]
    : null;

  const calibrationProgress = calibration.phase === 'running'
    ? `${calibration.pointIndex + 1}/${calibration.points.length}`
    : '';

  return (
    <div style={{ padding: '20px' }}>
      <Title order={3} mb="md">Dashboard</Title>
      <Stack gap="md">
        <CameraFeed
          stageSize={stage}
          crosshair={crosshair}
          calibrationPoint={currentCalibrationPoint}
          calibrationProgress={calibrationProgress}
          onCalibrationPointsReady={handleCalibrationPointsReady}
        />

        {/* Calibration controls */}
        {calibration.phase === 'idle' && fixtureIds.length > 0 && (
          <Button onClick={() => setCalibration({ phase: 'selectFixture' })} style={{ maxWidth: 200 }}>
            Calibrate
          </Button>
        )}

        {calibration.phase === 'selectFixture' && (
          <Group>
            <Select
              label="Select fixture to calibrate"
              placeholder="Choose fixture..."
              data={fixtureIds.map(id => ({ value: id, label: `Ch ${patchData[id].channel} — ${id}` }))}
              onChange={(val) => val && startCalibration(val)}
              style={{ maxWidth: 320 }}
            />
            <Button variant="subtle" onClick={() => setCalibration({ phase: 'idle' })}>
              Cancel
            </Button>
          </Group>
        )}

        {calibration.phase === 'running' && (
          <Group>
            <Text fw={600}>
              Calibrating fixture {calibration.fixtureId} — Point {calibration.pointIndex + 1} of {calibration.points.length}
            </Text>
            <Button onClick={advanceCalibration}>Next</Button>
            <Button variant="subtle" color="red" onClick={cancelCalibration}>Cancel</Button>
          </Group>
        )}

        <StageSizeForm />
      </Stack>
    </div>
  );
}