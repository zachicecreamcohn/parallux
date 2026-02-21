export interface StageSize {
  widthFeet: number;
  widthInches: number;
  heightFeet: number;
  heightInches: number;
  gridSpacingFt: number;
}

export type Point = { x: number; y: number };

export interface GridOverlay {
  topLeft: Point;
  topRight: Point;
  bottomLeft: Point;
  bottomRight: Point;
}
export type FixtureChannelRole =
  | 'pan' | 'pan-fine'
  | 'tilt' | 'tilt-fine'
  | 'dimmer' | 'dimmer-fine'
  | 'shutter'
  | 'zoom' | 'zoom-fine'
  | 'red' | 'red-fine'
  | 'green' | 'green-fine'
  | 'blue' | 'blue-fine'
  | 'white' | 'white-fine'
  | 'iris' | 'iris-fine'
  | 'other';

export interface FixtureChannelDef {
  offset: number;
  role: FixtureChannelRole;
  label: string;
  defaultValue: number;
  standaloneValue: number;
  notes?: string;
}

export interface FixtureModeDef {
  channelCount: number;
  channels: FixtureChannelDef[];
}

export interface FixtureProfileDef {
  manufacturer: string;
  model: string;
  type: string;
  panRangeDegrees: number;
  tiltRangeDegrees: number;
  modes: Record<string, FixtureModeDef>;
}

export type FixtureLibrary = Record<string, FixtureProfileDef>;

export interface FixturePatch {
  channel: number;
  DMXUniverse: number;
  DMXAddress: number;
  fixtureTypeId: string;
  modeId: string;
  standalone: boolean;
}

export type PatchData = Record<string, FixturePatch>;

export interface ProjectData {
  projectName: string;
  patch: PatchData;
  stageSize?: StageSize;
  gridOverlay?: GridOverlay;


}

export const ProjectDataKeys: (keyof ProjectData)[] = ['projectName', 'patch', 'stageSize', 'gridOverlay'];

export type StoreUpdateEvent = {
  [K in keyof ProjectData]: { key: K; value: ProjectData[K] }
}[keyof ProjectData];

export interface GamepadState {
  rightStickX: number;
  rightStickY: number;
  leftStickY: number;
  r2: number;
  l2: number;
  dpadUp: boolean;
  dpadDown: boolean;
  aButton: boolean;
  bButton: boolean;
}

export interface FixtureState {
  panNorm: number;
  tiltNorm: number;
  zoomNorm: number;
  intensity: number;

}

export interface CrosshairPosition {
  x: number;
  y: number;
}
