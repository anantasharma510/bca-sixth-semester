import type { MediaTypeValue } from 'expo-media-library';

export type PostCreationStage = 'media' | 'caption';

export type SelectedMediaType = 'image' | 'video';

export interface DeviceMediaAsset {
  id: string;
  uri: string;
  filename?: string | null;
  mediaType: MediaTypeValue;
  width: number;
  height: number;
  duration?: number;
  creationTime?: number;
}

export interface SelectedMediaItem {
  id: string;
  displayUri: string;
  localUri: string;
  filename?: string | null;
  mediaType: SelectedMediaType;
  width: number;
  height: number;
  duration?: number;
  order: number;
}


