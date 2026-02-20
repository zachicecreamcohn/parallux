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
export type SizeMode = 'iris' | 'zoom';

export interface FixturePatch {
  channel: number;
  DMXUniverse: number;
  DMXAddress: number;
  panChannels: number[];
  tiltChannels: number[];
  zoomChannels: number[];
  irisChannels: number[];
  intensityChannels: number[];
  sizeMode: SizeMode;
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
