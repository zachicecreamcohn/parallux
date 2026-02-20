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
}

export const ProjectDataKeys: (keyof ProjectData)[] = ['projectName', 'patch'];

export type StoreUpdateEvent = {
  [K in keyof ProjectData]: { key: K; value: ProjectData[K] }
}[keyof ProjectData];
