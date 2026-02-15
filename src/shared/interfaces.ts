export interface ProjectData {
  projectName: string;
}

export const ProjectDataKeys: (keyof ProjectData)[] = ['projectName'];

export type StoreUpdateEvent = {
  [K in keyof ProjectData]: { key: K; value: ProjectData[K] }
}[keyof ProjectData];
