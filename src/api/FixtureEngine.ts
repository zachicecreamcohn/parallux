import { PatchData, GamepadState, FixtureState, CrosshairPosition, FixtureLibrary, FixtureChannelDef, FixtureChannelRole, CalibrationData, CalibrationLUT } from '../shared/interfaces';
import { SacnSender } from './SacnSender';


const TICK_MS = 25;
const DELTA_SCALE = 0.015;
const DPAD_STEP = 0.008
const CLUTCH_THRESHOLD = 0.1;

const KILL_FADE_RATE = 1 / (0.15 / (TICK_MS / 1000));
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

/** Bilinear interpolation lookup in a 5×5 calibration LUT.
 *  Given a crosshair position (u, v) in [0,1], finds the surrounding
 *  4 calibration points and interpolates the pan/tilt DMX values. */
function lookupLUT(lut: CalibrationLUT, u: number, v: number): { pan: number; tilt: number } | null {
  if (lut.length === 0) return null;

  // Determine grid size (assumes square grid)
  const gridSize = Math.round(Math.sqrt(lut.length));
  if (gridSize * gridSize !== lut.length) return null;

  const maxIdx = gridSize - 1;
  const col = u * maxIdx;
  const row = v * maxIdx;

  const col0 = Math.max(0, Math.min(maxIdx - 1, Math.floor(col)));
  const row0 = Math.max(0, Math.min(maxIdx - 1, Math.floor(row)));
  const col1 = col0 + 1;
  const row1 = row0 + 1;

  const s = col - col0;
  const t = row - row0;

  const tl = lut[row0 * gridSize + col0];
  const tr = lut[row0 * gridSize + col1];
  const bl = lut[row1 * gridSize + col0];
  const br = lut[row1 * gridSize + col1];

  if (!tl || !tr || !bl || !br) return null;

  const topPan = tl.panNorm + (tr.panNorm - tl.panNorm) * s;
  const botPan = bl.panNorm + (br.panNorm - bl.panNorm) * s;
  const pan = topPan + (botPan - topPan) * t;

  const topTilt = tl.tiltNorm + (tr.tiltNorm - tl.tiltNorm) * s;
  const botTilt = bl.tiltNorm + (br.tiltNorm - bl.tiltNorm) * s;
  const tilt = topTilt + (botTilt - topTilt) * t;

  return { pan, tilt };
}
export class FixtureEngine {
  private states = new Map<string, FixtureState>();
  private patch: PatchData;
  private fixtureLibrary: FixtureLibrary;
  private lastGamepadState: GamepadState = { ...DEFAULT_GAMEPAD };

  private intervalId: ReturnType<typeof setInterval> | null = null;
  private readonly sacnSender: SacnSender;

  private readonly onCrosshair: (pos: CrosshairPosition) => void;
  private calibrationFixtureId: string | null = null;
  private calibrationData: CalibrationData = {};
  private crosshairPos = { x: 0.5, y: 0.5 };
  private calibrationTarget: { u: number; v: number } | null = null;
  private killFade = 1.0;

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
  updateCalibrationData(data: CalibrationData): void {
    this.calibrationData = data;
  }
  setGamepadState(state: GamepadState): void {
    this.lastGamepadState = state;
  }
  setCalibrationFixture(id: string | null): void {
    this.calibrationFixtureId = id;
    if (!id) this.calibrationTarget = null;
  }

  setCalibrationTarget(target: { u: number; v: number } | null): void {
    this.calibrationTarget = target;
  }

  getFixtureState(id: string): FixtureState | undefined {
    return this.states.get(id);
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

    // Ramp kill fade: L2 pressed → fade toward 0, released → fade toward 1
    if (gp.l2 >= CLUTCH_THRESHOLD) {
      this.killFade = clamp(this.killFade - KILL_FADE_RATE);
    } else {
      this.killFade = clamp(this.killFade + KILL_FADE_RATE);
    }
    // Update shared crosshair position (stage target)
    if (gp.r2 >= CLUTCH_THRESHOLD && !this.calibrationFixtureId) {
      this.crosshairPos.x = clamp(this.crosshairPos.x + curve(gp.rightStickX) * DELTA_SCALE);
      this.crosshairPos.y = clamp(this.crosshairPos.y + curve(gp.rightStickY) * DELTA_SCALE);
    }

    for (const [id, state] of this.states) {
      if (this.calibrationFixtureId && id !== this.calibrationFixtureId) {
        continue;
      }

      // During calibration: direct joystick control of this fixture's raw pan/tilt
      if (this.calibrationFixtureId) {
        if (gp.r2 >= CLUTCH_THRESHOLD) {
          state.panNorm = clamp(state.panNorm + curve(gp.rightStickX) * DELTA_SCALE);
          state.tiltNorm = clamp(state.tiltNorm + curve(gp.rightStickY) * DELTA_SCALE);
          state.zoomNorm = clamp(state.zoomNorm + curve(gp.leftStickY) * DELTA_SCALE);
        }
      } else if (gp.r2 >= CLUTCH_THRESHOLD) {
        // Normal mode: zoom still per-fixture
        state.zoomNorm = clamp(state.zoomNorm + curve(gp.leftStickY) * DELTA_SCALE);
      }

      if (gp.aButton && !this.calibrationFixtureId) {
        state.intensity = 1.0;
      } else if (gp.bButton && !this.calibrationFixtureId) {
        state.intensity = 0.0;
      } else if (gp.dpadUp) {
        state.intensity = clamp(state.intensity + DPAD_STEP);
      } else if (gp.dpadDown) {
        state.intensity = clamp(state.intensity - DPAD_STEP);
      }

      this.states.set(id, state);
    }

    if (this.calibrationFixtureId && this.calibrationTarget) {
      this.onCrosshair({ x: this.calibrationTarget.u, y: this.calibrationTarget.v });
    } else if (!this.calibrationFixtureId) {
      this.onCrosshair({ x: this.crosshairPos.x, y: this.crosshairPos.y });
    }

    const universePayloads = new Map<number, { [channel: number]: number }>();

    for (const [id, state] of this.states) {
      const fixture = this.patch[id];
      if (!fixture) continue;

      const { DMXUniverse, DMXAddress } = fixture;
      const base = DMXAddress;
      if (!universePayloads.has(DMXUniverse)) {
        universePayloads.set(DMXUniverse, {});
      }
      const payload = universePayloads.get(DMXUniverse);
      if (!payload) continue;

      const profile = this.fixtureLibrary[fixture.fixtureTypeId];
      const mode = profile?.modes[fixture.modeId];
      if (!profile || !mode) {
        continue;
      }
      const channels = mode.channels;

      // Determine pan/tilt: use LUT if available (and not calibrating), else raw
      let dmxPan = state.panNorm;
      let dmxTilt = state.tiltNorm;

      if (!this.calibrationFixtureId) {
        const lut = this.calibrationData[id];
        if (lut && lut.length > 0) {
          const mapped = lookupLUT(lut, this.crosshairPos.x, this.crosshairPos.y);
          if (mapped) {
            dmxPan = mapped.pan;
            dmxTilt = mapped.tilt;
          }
        } else {
          // No LUT: use crosshair position directly as pan/tilt
          dmxPan = this.crosshairPos.x;
          dmxTilt = this.crosshairPos.y;
        }
      }

      writeChannel(payload, base, findChannel(channels, 'pan'), findChannel(channels, 'pan-fine'), dmxPan);
      writeChannel(payload, base, findChannel(channels, 'tilt'), findChannel(channels, 'tilt-fine'), dmxTilt);
      writeChannel(payload, base, findChannel(channels, 'zoom'), findChannel(channels, 'zoom-fine'), state.zoomNorm);
      writeChannel(payload, base, findChannel(channels, 'iris'), findChannel(channels, 'iris-fine'), state.zoomNorm);

      const isCalibrationOther = this.calibrationFixtureId && id !== this.calibrationFixtureId;
      const outputIntensity = isCalibrationOther ? 0 : state.intensity * this.killFade;
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
