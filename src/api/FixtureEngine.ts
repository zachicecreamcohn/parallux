import { PatchData, GamepadState, FixtureState, CrosshairPosition, FixtureLibrary, FixtureChannelDef, FixtureChannelRole } from '../shared/interfaces';
import { SacnSender } from './SacnSender';


const TICK_MS = 25;
const DELTA_SCALE = 0.005;
const DPAD_STEP = 0.031
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

const MOTION_ROLES: FixtureChannelRole[] = ['pan', 'pan-fine', 'tilt', 'tilt-fine', 'zoom', 'zoom-fine', 'iris', 'iris-fine', 'dimmer', 'dimmer-fine'];

function findChannel(channels: FixtureChannelDef[], role: FixtureChannelRole): FixtureChannelDef | undefined {
  return channels.find(c => c.role === role);
}

function writeChannel(payload: { [channel: number]: number }, base: number, ch: FixtureChannelDef | undefined, fineCh: FixtureChannelDef | undefined, norm: number): void {
  if (!ch) return;
  const value16 = Math.round(norm * 65535);
  payload[base + ch.offset - 1] = (value16 >> 8) & 0xff;
  if (fineCh) {
    payload[base + fineCh.offset - 1] = value16 & 0xff;
  }
}

export class FixtureEngine {
  private states = new Map<string, FixtureState>();
  private patch: PatchData;
  private fixtureLibrary: FixtureLibrary;
  private lastGamepadState: GamepadState = { ...DEFAULT_GAMEPAD };

  private intervalId: ReturnType<typeof setInterval> | null = null;
  private readonly sacnSender: SacnSender;

  private readonly onCrosshair: (pos: CrosshairPosition) => void;

  constructor(patch: PatchData, fixtureLibrary: FixtureLibrary, onCrosshair: (pos: CrosshairPosition) => void) {
    this.patch = patch;
    this.fixtureLibrary = fixtureLibrary;
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

  updateFixtureLibrary(library: FixtureLibrary): void {
    this.fixtureLibrary = library;
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
      if (gp.r2 < CLUTCH_THRESHOLD) {
        this.states.set(id, state);
        continue;
      }

      state.panNorm = clamp(state.panNorm + curve(gp.rightStickX) * DELTA_SCALE);
      state.tiltNorm = clamp(state.tiltNorm + curve(gp.rightStickY) * DELTA_SCALE);
      state.zoomNorm = clamp(state.zoomNorm + curve(gp.leftStickY) * DELTA_SCALE);

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

      const profile = this.fixtureLibrary[fixture.fixtureTypeId];
      const mode = profile?.modes[fixture.modeId];
      if (!profile || !mode) {
        console.warn(`FixtureEngine: unknown fixture profile "${fixture.fixtureTypeId}" / mode "${fixture.modeId}" for fixture ${id}`);
        continue;
      }
      const channels = mode.channels;

      writeChannel(payload, base, findChannel(channels, 'pan'), findChannel(channels, 'pan-fine'), state.panNorm);
      writeChannel(payload, base, findChannel(channels, 'tilt'), findChannel(channels, 'tilt-fine'), state.tiltNorm);
      writeChannel(payload, base, findChannel(channels, 'zoom'), findChannel(channels, 'zoom-fine'), state.zoomNorm);
      writeChannel(payload, base, findChannel(channels, 'iris'), findChannel(channels, 'iris-fine'), state.zoomNorm);

      const outputIntensity = state.intensity * (1 - gp.l2);
      writeChannel(payload, base, findChannel(channels, 'dimmer'), findChannel(channels, 'dimmer-fine'), outputIntensity);

      if (fixture.standalone) {
        for (const ch of channels) {
          if (!MOTION_ROLES.includes(ch.role)) {
            payload[base + ch.offset - 1] = ch.standaloneValue;
          }
        }
      }
    }

    this.sacnSender.send(universePayloads);
  }
}
