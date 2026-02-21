import { PatchData, GamepadState, FixtureState, CrosshairPosition } from '../shared/interfaces';
import { SacnSender } from './SacnSender';


const TICK_MS = 25;
const DELTA_SCALE = 0.005;
const DPAD_STEP = 0.05;
const CLUTCH_THRESHOLD = 0.1;

const SACN_PRIORITY = 150;

const DEFAULT_STATE: FixtureState = {
  panNorm: 0.5,
  tiltNorm: 0.5,
  zoomNorm: 0.5,
  intensity: 1.0,

};

const DEFAULT_GAMEPAD: GamepadState = {
  rightStickX: 0,
  rightStickY: 0,
  leftStickY: 0,
  r2: 0,
  l2: 0,
  dpadUp: false,
  dpadDown: false,
  aButton: false,
  bButton: false,
};

function curve(x: number): number {
  return x * Math.pow(Math.abs(x), 1.2);
}

function clamp(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function writePayload(payload: { [channel: number]: number }, baseAddress: number, channels: number[], norm: number): void {
  if (channels.length === 0) return;
  const value16 = Math.round(norm * 65535);
  const coarse = (value16 >> 8) & 0xff;
  const fine = value16 & 0xff;
  payload[baseAddress + channels[0]] = coarse;
  if (channels[1] !== undefined) {
    payload[baseAddress + channels[1]] = fine;
  }
}

export class FixtureEngine {
  private states = new Map<string, FixtureState>();
  private patch: PatchData;
  private lastGamepadState: GamepadState = { ...DEFAULT_GAMEPAD };

  private intervalId: ReturnType<typeof setInterval> | null = null;
  private readonly sacnSender: SacnSender;

  private readonly onCrosshair: (pos: CrosshairPosition) => void;

  constructor(patch: PatchData, onCrosshair: (pos: CrosshairPosition) => void) {
    this.patch = patch;
    this.onCrosshair = onCrosshair;
    this.sacnSender = new SacnSender({ priority: SACN_PRIORITY, useUnicastDestination: '127.0.0.1' });
    for (const id of Object.keys(patch)) {
      this.states.set(id, { ...DEFAULT_STATE });
    }
  }

  updatePatch(patch: PatchData): void {
    const next = new Map<string, FixtureState>();
    for (const id of Object.keys(patch)) {
      next.set(id, this.states.get(id) ?? { ...DEFAULT_STATE });
    }
    this.states = next;
    this.patch = patch;
  }

  setGamepadState(state: GamepadState): void {
    this.lastGamepadState = state;
  }


  start(): void {
    if (this.intervalId !== null) return;
    this.intervalId = setInterval(() => this.tick(), TICK_MS);
  }

  stop(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.sacnSender.destroy();
  }

  private tick(): void {
    const gp = this.lastGamepadState;

    for (const [id, state] of this.states) {
      if (gp.r2 >= CLUTCH_THRESHOLD) {
        state.panNorm = clamp(state.panNorm + curve(gp.rightStickX) * DELTA_SCALE);
        state.tiltNorm = clamp(state.tiltNorm + curve(gp.rightStickY) * DELTA_SCALE);
        state.zoomNorm = clamp(state.zoomNorm + curve(gp.leftStickY) * DELTA_SCALE);
      }

      if (gp.aButton) {
        state.intensity = 1.0;
      } else if (gp.bButton) {
        state.intensity = 0.0;
      } else if (gp.dpadUp) {
        state.intensity = clamp(state.intensity + DPAD_STEP);
      } else if (gp.dpadDown) {
        state.intensity = clamp(state.intensity - DPAD_STEP);
      }


      this.states.set(id, state);
    }

    const fixtureList = [...this.states.values()];
    if (fixtureList.length > 0) {
      const meanPan = fixtureList.reduce((s, f) => s + f.panNorm, 0) / fixtureList.length;
      const meanTilt = fixtureList.reduce((s, f) => s + f.tiltNorm, 0) / fixtureList.length;
      this.onCrosshair({ x: meanPan, y: meanTilt });
    }

    const universePayloads = new Map<number, { [channel: number]: number }>();

    for (const [id, state] of this.states) {
      const fixture = this.patch[id];
      if (!fixture) continue;

      const { DMXUniverse, DMXAddress } = fixture;
      const base = DMXAddress - 1;
      if (!universePayloads.has(DMXUniverse)) {
        universePayloads.set(DMXUniverse, {});
      }
      const payload = universePayloads.get(DMXUniverse);
      if (!payload) continue;

      writePayload(payload, base, fixture.panChannels, state.panNorm);
      writePayload(payload, base, fixture.tiltChannels, state.tiltNorm);

      const sizeChannels = fixture.sizeMode === 'zoom' ? fixture.zoomChannels : fixture.irisChannels;
      writePayload(payload, base, sizeChannels, state.zoomNorm);

      const outputIntensity = state.intensity * (1 - gp.l2);
      writePayload(payload, base, fixture.intensityChannels, outputIntensity);
    }

    this.sacnSender.send(universePayloads);
  }
}