export type Seg = { i: number; s: number; e: number; t: string };
export type Clip = {
  id: string;
  title: string;
  summary: string;
  tags: string[];
  start: number;
  end: number;
  duration: number;
  url: string;
  thumb: string;
};
export type ProcessResult = {
  publicId: string;
  mediaUrl: string;
  duration: number;
  clips: Clip[];
  reel: string;

  picks: Pick[];
  thumb: string;
  segs: Seg[];
  stats: {
    totalSegments: number;
    totalWords: number;
    chaptersCount: number;
    highlightsCount: number;
    elapsedSeconds: string;
  };
};
export type SearchItem = {
  id: string;
  url: string;
  topic: string;
  summary: string;
  start: string;
  tags: string[];
  duration: number;
  thumb: string;
};
export type Pick = { start: number; end: number };

