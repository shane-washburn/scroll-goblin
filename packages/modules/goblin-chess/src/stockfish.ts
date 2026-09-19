import type { Mode } from './game';
export class Engine {
  private worker: Worker;
  private waiters = new Set<{ test: (line: string) => boolean; resolve: (line: string) => void; reject: (error: Error) => void; timer: ReturnType<typeof setTimeout> }>();
  readonly ready: Promise<string>;
  constructor(private mode: Exclude<Mode, 'chaos'>) {
    this.worker = new Worker(`/chess/engine/stockfish-19-${mode === 'hard' ? 'single' : 'lite-single'}.js`);
    this.worker.onmessage = (event) => {
      for (const line of String(event.data).split('\n')) for (const w of this.waiters) if (w.test(line)) {
        clearTimeout(w.timer); this.waiters.delete(w); w.resolve(line);
      }
    };
    this.worker.onerror = () => this.fail('Stockfish could not load. Check your connection and retry.');
    this.ready = this.wait(line => line === 'uciok', 120000).then(async () => {
      this.send('setoption name Hash value 32');
      this.send(`setoption name Skill Level value ${mode === 'easy' ? 0 : mode === 'medium' ? 5 : 20}`);
      this.send('setoption name UCI_LimitStrength value false');
      const ready = this.wait(line => line === 'readyok', 30000);
      this.send('isready'); return ready;
    });
    this.send('uci');
  }
  private send(command: string) { this.worker.postMessage(command); }
  private wait(test: (line: string) => boolean, ms: number): Promise<string> {
    return new Promise((resolve, reject) => {
      const w = { test, resolve, reject, timer: setTimeout(() => { this.waiters.delete(w); reject(new Error('Stockfish timed out. Retry the turn.')); }, ms) };
      this.waiters.add(w);
    });
  }
  async move(fen: string): Promise<string> {
    await this.ready;
    this.send(`position fen ${fen}`);
    const result = this.wait(line => line.startsWith('bestmove '), 15000);
    this.send(this.mode === 'easy' ? 'go depth 1' : this.mode === 'medium' ? 'go depth 5 movetime 1200' : 'go movetime 5000');
    return (await result).split(' ')[1];
  }
  private fail(message: string) { for (const w of this.waiters) { clearTimeout(w.timer); w.reject(new Error(message)); } this.waiters.clear(); }
  dispose() { this.fail('Engine stopped.'); this.worker.terminate(); }
}
