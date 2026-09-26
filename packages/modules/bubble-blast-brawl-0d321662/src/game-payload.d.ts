export interface ArcadeHost {
  gameId: string; buildId: string;
  getAudioBus: () => { ctx: AudioContext; out: AudioNode };
  isMuted: () => boolean; setMuted: (muted: boolean) => void;
  subscribeMuted: (listener: () => void) => () => void;
  trackStat: (moduleId: string, metric: string, count?: number) => void;
  trackEvent: (name: string, params?: Record<string, string | number | boolean | undefined>) => void;
}
export declare function mount(container: HTMLElement, host: ArcadeHost): () => void;
