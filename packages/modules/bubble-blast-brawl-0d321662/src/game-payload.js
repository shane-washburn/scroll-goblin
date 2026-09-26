// packages/core/src/wrapper.ts
var GoblinWrapper = class {
  width = 360;
  height = 640;
  root;
  canvas;
  ctx;
  tapListeners = /* @__PURE__ */ new Set();
  pauseListeners = /* @__PURE__ */ new Set();
  muteListeners = /* @__PURE__ */ new Set();
  pauseButton;
  muteButton;
  pauseOverlay;
  isPaused = false;
  isMuted = false;
  disposed = false;
  arcadeTheme;
  constructor(container, options = {}) {
    this.arcadeTheme = options.theme === "arcade";
    this.root = document.createElement("div");
    Object.assign(this.root.style, {
      position: "relative",
      width: "100%",
      maxWidth: "360px",
      aspectRatio: "9 / 16",
      margin: "0 auto",
      overflow: "hidden",
      borderRadius: "22px",
      background: "#100c21",
      isolation: "isolate",
      touchAction: "none",
      fontFamily: "ui-rounded, system-ui, sans-serif",
      color: "#fff",
      ...this.arcadeTheme ? {
        background: "#FFFFFF",
        color: "#000000",
        border: "4px solid #000000",
        borderRadius: "4px",
        boxShadow: "4px 4px 0 #000000",
        boxSizing: "border-box",
        fontFamily: '"Space Mono", "Courier New", monospace',
        aspectRatio: "auto"
      } : {}
    });
    this.canvas = document.createElement("canvas");
    const ratio = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
    this.canvas.width = this.width * ratio;
    this.canvas.height = this.height * ratio;
    this.canvas.setAttribute("aria-label", options.label ?? "Scroll Goblin game. Tap to play.");
    this.canvas.setAttribute("role", "img");
    Object.assign(this.canvas.style, { display: "block", width: "100%", height: this.arcadeTheme ? "auto" : "100%", touchAction: "none" });
    const ctx = this.canvas.getContext("2d", { alpha: false });
    if (!ctx) throw new Error("This browser does not support Canvas2D.");
    this.ctx = ctx;
    this.ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    this.root.append(this.canvas);
    this.pauseOverlay = document.createElement("div");
    this.pauseOverlay.textContent = "PAUSED";
    this.pauseOverlay.setAttribute("aria-live", "polite");
    Object.assign(this.pauseOverlay.style, {
      position: "absolute",
      inset: "0",
      display: "none",
      alignItems: "center",
      justifyContent: "center",
      background: "#100c21c9",
      fontSize: "30px",
      fontWeight: "900",
      letterSpacing: "4px",
      pointerEvents: "none",
      ...this.arcadeTheme ? {
        background: "#FFFFFFed",
        color: "#000000",
        fontFamily: '"Archivo Black", Impact, sans-serif',
        letterSpacing: "1px"
      } : {}
    });
    this.root.append(this.pauseOverlay);
    const controls = document.createElement("div");
    Object.assign(controls.style, { position: "absolute", top: "10px", right: "10px", display: "flex", gap: "6px" });
    this.pauseButton = this.controlButton("Pause", () => {
      this.paused = !this.paused;
    });
    this.muteButton = this.controlButton("Mute", () => {
      this.muted = !this.muted;
    });
    controls.append(this.pauseButton, this.muteButton);
    this.root.append(controls);
    this.muted = options.muted ?? false;
    this.canvas.addEventListener("pointerdown", this.handlePointer);
    document.addEventListener("visibilitychange", this.handleVisibility);
    container.append(this.root);
  }
  get paused() {
    return this.isPaused;
  }
  set paused(value) {
    if (this.disposed || this.isPaused === value) return;
    this.isPaused = value;
    this.pauseButton.textContent = value ? "Resume" : "Pause";
    this.pauseButton.setAttribute("aria-pressed", String(value));
    this.pauseOverlay.style.display = value ? "flex" : "none";
    for (const listener of this.pauseListeners) listener(value);
  }
  get muted() {
    return this.isMuted;
  }
  set muted(value) {
    if (this.disposed) return;
    this.isMuted = value;
    this.muteButton.textContent = value ? "Unmute" : "Mute";
    this.muteButton.setAttribute("aria-pressed", String(value));
    for (const listener of this.muteListeners) listener(value);
  }
  onTap(listener) {
    this.tapListeners.add(listener);
    return () => {
      this.tapListeners.delete(listener);
    };
  }
  onPause(listener) {
    this.pauseListeners.add(listener);
    return () => {
      this.pauseListeners.delete(listener);
    };
  }
  onMute(listener) {
    this.muteListeners.add(listener);
    return () => {
      this.muteListeners.delete(listener);
    };
  }
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.canvas.removeEventListener("pointerdown", this.handlePointer);
    document.removeEventListener("visibilitychange", this.handleVisibility);
    this.tapListeners.clear();
    this.pauseListeners.clear();
    this.muteListeners.clear();
    this.root.remove();
  }
  handlePointer = (event) => {
    if (this.paused || this.disposed || event.button > 0) return;
    event.preventDefault();
    const bounds = this.canvas.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    const tap = {
      x: Math.max(0, Math.min(this.width, (event.clientX - bounds.left) * this.width / bounds.width)),
      y: Math.max(0, Math.min(this.height, (event.clientY - bounds.top) * this.height / bounds.height)),
      pointerType: event.pointerType || "mouse"
    };
    for (const listener of this.tapListeners) listener(tap);
  };
  handleVisibility = () => {
    if (document.hidden) this.paused = true;
  };
  controlButton(label, action) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.setAttribute("aria-pressed", "false");
    Object.assign(button.style, {
      background: "#221b39e8",
      color: "#fff",
      border: "1px solid #5d526e",
      borderRadius: "14px",
      padding: "8px 10px",
      minHeight: "36px",
      font: "600 11px system-ui, sans-serif",
      cursor: "pointer",
      touchAction: "manipulation",
      ...this.arcadeTheme ? {
        background: "#FFFFFF",
        color: "#000000",
        border: "2px solid #000000",
        borderRadius: "4px",
        boxShadow: "2px 2px 0 #000000",
        minHeight: "44px",
        minWidth: "44px",
        font: '700 12px "Space Mono", "Courier New", monospace'
      } : {}
    });
    button.addEventListener("click", action);
    return button;
  }
};

// packages/core/src/juice.ts
function breathe(time, amount = 0.045, speed = 4, offset = 0) {
  const wave = Math.sin(time * speed + offset) * Math.min(0.3, Math.max(0, amount));
  return { x: 1 + wave, y: 1 - wave };
}
var JuiceEngine = class {
  reducedMotion;
  maxParticles;
  sparks = [];
  labels = [];
  shakeTime = 0;
  shakeDuration = 1;
  shakePower = 0;
  frozenTime = 0;
  offset = { x: 0, y: 0 };
  constructor(options = {}) {
    this.reducedMotion = options.reducedMotion ?? (typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches);
    this.maxParticles = Math.max(1, Math.min(300, options.maxParticles ?? 180));
  }
  get frozen() {
    return this.frozenTime > 0;
  }
  get shakeOffset() {
    return this.offset;
  }
  breathe(time, amount = 0.045, speed = 4, offset = 0) {
    return breathe(time, this.reducedMotion ? amount * 0.2 : amount, speed, offset);
  }
  screenShake(power = 5, duration = 0.16) {
    if (this.reducedMotion) return;
    this.shakePower = Math.max(0, Math.min(16, power));
    this.shakeDuration = Math.max(0.01, Math.min(0.5, duration));
    this.shakeTime = this.shakeDuration;
  }
  hitstop(duration = 0.035) {
    this.frozenTime = Math.max(this.frozenTime, Math.max(0, Math.min(0.15, duration)));
  }
  particles(x, y, options = {}) {
    const count = Math.max(0, Math.min(this.maxParticles, Math.floor((options.count ?? 16) * (this.reducedMotion ? 0.25 : 1))));
    const speed = Math.max(0, Math.min(1e3, options.speed ?? 160));
    const lifetime = Math.max(0.05, Math.min(3, options.lifetime ?? 0.55));
    const available = Math.max(0, this.maxParticles - count);
    if (this.sparks.length > available) this.sparks.splice(0, this.sparks.length - available);
    for (let index = 0; index < count; index++) {
      const angle = Math.random() * Math.PI * 2;
      const velocity = speed * (0.3 + Math.random() * 0.7);
      this.sparks.push({
        x,
        y,
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity,
        life: lifetime,
        maxLife: lifetime,
        color: options.color ?? "#d9ff75",
        radius: 2 + Math.random() * 3
      });
    }
  }
  floatText(text, x, y, color = "#fff") {
    if (this.labels.length >= 24) this.labels.shift();
    this.labels.push({ text: text.slice(0, 60), x, y, color, life: 0.85 });
  }
  update(deltaSeconds) {
    const dt = Math.max(0, Math.min(0.1, deltaSeconds));
    this.frozenTime = Math.max(0, this.frozenTime - dt);
    this.shakeTime = Math.max(0, this.shakeTime - dt);
    const power = this.shakePower * this.shakeTime / this.shakeDuration;
    this.offset.x = (Math.random() - 0.5) * power;
    this.offset.y = (Math.random() - 0.5) * power;
    for (const spark of this.sparks) {
      spark.life -= dt;
      spark.x += spark.vx * dt;
      spark.y += spark.vy * dt;
      spark.vy += 210 * dt;
    }
    this.sparks = this.sparks.filter((spark) => spark.life > 0);
    for (const label of this.labels) {
      label.life -= dt;
      if (!this.reducedMotion) label.y -= 45 * dt;
    }
    this.labels = this.labels.filter((label) => label.life > 0);
  }
  draw(ctx) {
    ctx.save();
    for (const spark of this.sparks) {
      ctx.globalAlpha = Math.min(1, spark.life / spark.maxLife);
      ctx.fillStyle = spark.color;
      ctx.beginPath();
      ctx.arc(spark.x, spark.y, spark.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.font = "900 19px system-ui, sans-serif";
    ctx.textAlign = "center";
    for (const label of this.labels) {
      ctx.globalAlpha = Math.min(1, label.life * 3);
      ctx.fillStyle = label.color;
      ctx.strokeStyle = "#100c21";
      ctx.lineWidth = 4;
      ctx.strokeText(label.text, label.x, label.y);
      ctx.fillText(label.text, label.x, label.y);
    }
    ctx.restore();
  }
  dispose() {
    this.sparks.length = 0;
    this.labels.length = 0;
    this.shakeTime = this.frozenTime = 0;
    this.offset = { x: 0, y: 0 };
  }
};

// packages/core/src/audio.ts
var ProceduralAudio = class {
  context;
  master;
  voices = /* @__PURE__ */ new Set();
  maxVoices;
  volume;
  isMuted;
  disposed = false;
  getAudioBus;
  ownsContext = false;
  constructor(options = {}) {
    this.maxVoices = Math.max(1, Math.min(16, Math.floor(options.maxVoices ?? 8)));
    this.volume = Math.max(0, Math.min(0.5, options.volume ?? 0.15));
    this.isMuted = options.muted ?? false;
    this.getAudioBus = options.getAudioBus;
    document.addEventListener("pointerdown", this.handleGesture, { passive: true });
    document.addEventListener("keydown", this.handleGesture);
  }
  get muted() {
    return this.isMuted;
  }
  set muted(value) {
    this.isMuted = value;
    if (this.master && this.context) {
      this.master.gain.setTargetAtTime(value ? 0 : this.volume, this.context.currentTime, 0.01);
    }
  }
  async resume() {
    if (this.disposed || this.isMuted) return;
    try {
      if (!this.context) {
        const borrowed = this.getAudioBus?.();
        if (borrowed) this.context = borrowed.ctx;
        else {
          const Context = window.AudioContext ?? window.webkitAudioContext;
          if (!Context) return;
          this.context = new Context();
          this.ownsContext = true;
        }
        this.master = this.context.createGain();
        this.master.gain.value = this.volume;
        this.master.connect(borrowed?.out ?? this.context.destination);
      }
      if (this.context.state === "suspended") await this.context.resume();
    } catch {
    }
  }
  play(patch = {}) {
    if (this.disposed || this.isMuted) return;
    void this.resume();
    const context = this.context;
    if (!context || !this.master || context.state === "closed") return;
    if (this.voices.size >= this.maxVoices) {
      const oldest = this.voices.values().next().value;
      if (oldest) this.stopVoice(oldest);
    }
    const frequency = clamp(patch.frequency ?? 440, 30, 8e3);
    const duration = clamp(patch.duration ?? 0.12, 0.025, 1.5);
    const attack = clamp(patch.attack ?? 4e-3, 1e-3, duration * 0.4);
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const now = context.currentTime;
    const voice = { oscillator, gain };
    this.voices.add(voice);
    oscillator.type = patch.type ?? "triangle";
    oscillator.frequency.setValueAtTime(frequency, now);
    oscillator.frequency.exponentialRampToValueAtTime(clamp(patch.endFrequency ?? frequency * 1.4, 30, 8e3), now + duration);
    gain.gain.setValueAtTime(1e-4, now);
    gain.gain.exponentialRampToValueAtTime(clamp(patch.volume ?? 0.6, 1e-3, 1), now + attack);
    gain.gain.exponentialRampToValueAtTime(1e-4, now + duration);
    oscillator.connect(gain);
    gain.connect(this.master);
    oscillator.onended = () => {
      this.voices.delete(voice);
      oscillator.disconnect();
      gain.disconnect();
    };
    oscillator.start(now);
    oscillator.stop(now + duration + 0.02);
  }
  coin(pitch = 1) {
    this.play({ frequency: 600 * pitch, endFrequency: 1150 * pitch, duration: 0.11, type: "square", volume: 0.35 });
  }
  bump(pitch = 1) {
    this.play({ frequency: 180 * pitch, endFrequency: 70 * pitch, duration: 0.1, type: "triangle" });
  }
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    document.removeEventListener("pointerdown", this.handleGesture);
    document.removeEventListener("keydown", this.handleGesture);
    for (const voice of [...this.voices]) this.stopVoice(voice);
    this.master?.disconnect();
    if (this.ownsContext && this.context && this.context.state !== "closed") void this.context.close().catch(() => {
    });
    this.context = void 0;
    this.master = void 0;
  }
  handleGesture = () => {
    void this.resume();
  };
  stopVoice(voice) {
    this.voices.delete(voice);
    voice.oscillator.onended = null;
    try {
      voice.oscillator.stop();
    } catch {
    }
    voice.oscillator.disconnect();
    voice.gain.disconnect();
  }
};
function clamp(value, minimum, maximum) {
  return Number.isFinite(value) ? Math.max(minimum, Math.min(maximum, value)) : minimum;
}

// packages/core/src/telemetry.ts
var TelemetryClient = class {
  state = { score: 0, phase: "ready", inputCount: 0 };
  logs = [];
  options;
  runId = null;
  runStart = null;
  dirty = true;
  disposed = false;
  timer;
  restoreConsole = [];
  constructor(options = {}) {
    this.options = options;
    window.__goblinState = this.state;
    this.captureConsole();
    window.addEventListener("error", this.handleError);
    window.addEventListener("unhandledrejection", this.handleRejection);
    window.addEventListener("message", this.handleMessage);
    this.timer = setInterval(() => {
      if (this.dirty) this.flush();
    }, 500);
    this.emit("game_loaded");
  }
  get snapshot() {
    return { ...this.state };
  }
  get currentRunId() {
    return this.runId;
  }
  getLogs() {
    return [...this.logs];
  }
  updateState(patch) {
    if (this.disposed) return;
    const next = { ...this.state };
    for (const [key, value] of Object.entries(patch).slice(0, 40)) {
      if (key.length > 64 || ["__proto__", "constructor", "prototype"].includes(key)) continue;
      if (!(key in next) && Object.keys(next).length >= 40) continue;
      if ((key === "score" || key === "inputCount") && typeof value !== "number") continue;
      if (key === "phase" && typeof value !== "string") continue;
      if (typeof value === "string") next[key] = value.slice(0, 256);
      else if (typeof value === "number" && Number.isFinite(value)) next[key] = value;
      else if (typeof value === "boolean" || value === null) next[key] = value;
    }
    this.state = next;
    window.__goblinState = this.state;
    this.dirty = true;
  }
  startRun(payload = {}) {
    if (this.disposed) return "";
    if (this.runStart !== null) return this.runId;
    this.runId = typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
    this.runStart = performance.now();
    this.updateState({ phase: "playing", score: 0, inputCount: 0, runId: this.runId });
    this.emit("run_started", payload);
    return this.runId;
  }
  endRun(score, payload = {}) {
    if (this.runStart === null) return;
    const duration = (performance.now() - this.runStart) / 1e3;
    this.updateState({ phase: "ended", score });
    this.emit("run_ended", { ...payload, score: this.state.score, duration });
    this.runStart = null;
  }
  replayClicked() {
    this.emit("replay_clicked");
  }
  flush() {
    if (this.disposed) return;
    this.dirty = false;
    if (window.parent !== window) {
      window.parent.postMessage({ type: "goblin:diagnostics", logs: this.getLogs(), snapshot: this.snapshot }, this.options.parentOrigin ?? "*");
    }
  }
  dispose() {
    if (this.disposed) return;
    this.flush();
    this.disposed = true;
    clearInterval(this.timer);
    window.removeEventListener("error", this.handleError);
    window.removeEventListener("unhandledrejection", this.handleRejection);
    window.removeEventListener("message", this.handleMessage);
    for (const restore of this.restoreConsole.reverse()) restore();
    if (window.__goblinState === this.state) delete window.__goblinState;
  }
  emit(event, extra = {}) {
    if (this.disposed) return;
    const payload = {
      ...extra,
      gameId: this.options.gameId ?? "preview",
      buildId: this.options.buildId ?? null,
      runId: this.runId,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    };
    window.dispatchEvent(new CustomEvent("goblin_telemetry", { detail: { event, payload } }));
    this.appendLog(`telemetry ${event} ${JSON.stringify(payload)}`);
    if (window.parent !== window) {
      window.parent.postMessage({ type: "goblin:telemetry", event, payload }, this.options.parentOrigin ?? "*");
    }
    this.flush();
  }
  appendLog(message) {
    this.logs.push(message.slice(0, 1500));
    if (this.logs.length > 50) this.logs.splice(0, this.logs.length - 50);
    this.dirty = true;
  }
  captureConsole() {
    const methods = ["log", "info", "warn", "error", "debug"];
    for (const method of methods) {
      const original = console[method];
      const replacement = (...values) => {
        original.apply(console, values);
        this.appendLog(`${method}: ${values.map(formatLog).join(" ")}`);
      };
      console[method] = replacement;
      this.restoreConsole.push(() => {
        if (console[method] === replacement) console[method] = original;
      });
    }
  }
  handleError = (event) => {
    this.appendLog(`uncaught: ${event.message} ${event.filename}:${event.lineno}:${event.colno}`);
    this.flush();
  };
  handleRejection = (event) => {
    this.appendLog(`unhandledrejection: ${formatLog(event.reason)}`);
    this.flush();
  };
  handleMessage = (event) => {
    if (event.source !== window.parent || event.data?.type !== "goblin:request-diagnostics") return;
    if (this.options.parentOrigin && this.options.parentOrigin !== "*" && event.origin !== this.options.parentOrigin) return;
    this.flush();
  };
};
function formatLog(value) {
  if (value instanceof Error) return `${value.name}: ${value.message} ${value.stack ?? ""}`.slice(0, 1500);
  if (typeof value === "string") return value.slice(0, 1500);
  try {
    return (JSON.stringify(logValue(value, 0, /* @__PURE__ */ new WeakSet())) ?? String(value)).slice(0, 1500);
  } catch {
    return "[unserializable value]";
  }
}
function logValue(value, depth, seen) {
  if (typeof value === "string") return value.slice(0, 300);
  if (typeof value === "bigint") return String(value);
  if (typeof value === "function") return "[function]";
  if (typeof value !== "object" || value === null) return value;
  if (seen.has(value)) return "[circular]";
  if (depth >= 2) return Array.isArray(value) ? "[array]" : "[object]";
  seen.add(value);
  const output = {};
  for (const key of Object.keys(value).slice(0, 12)) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    output[key] = descriptor && "value" in descriptor ? logValue(descriptor.value, depth + 1, seen) : "[getter]";
  }
  return output;
}

// packages/arcade/src/runtime.ts
var constructing = null;
var mounted = false;
function scope() {
  if (!constructing) throw new Error("Create core components synchronously inside the game mount function.");
  return constructing;
}
function disposeScope(current) {
  for (const cleanup of current.cleanup.splice(0).reverse()) {
    try {
      cleanup();
    } catch (error) {
      console.error("Arcade game cleanup failed", error);
    }
  }
}
var GoblinWrapper2 = class extends GoblinWrapper {
  constructor(container, options = {}) {
    const current = scope();
    super(container, { ...options, muted: current.host.isMuted() });
    current.cleanup.push(() => this.dispose());
    let syncing = false;
    const unsubscribe = current.host.subscribeMuted(() => {
      if (this.muted === current.host.isMuted()) return;
      syncing = true;
      try {
        this.muted = current.host.isMuted();
      } finally {
        syncing = false;
      }
    });
    const localMute = this.onMute((muted) => {
      if (!syncing && current.host.isMuted() !== muted) current.host.setMuted(muted);
    });
    current.cleanup.push(unsubscribe, localMute);
  }
};
var ProceduralAudio2 = class extends ProceduralAudio {
  constructor(options = {}) {
    const current = scope();
    super({ ...options, muted: current.host.isMuted(), getAudioBus: current.host.getAudioBus });
    current.cleanup.push(() => this.dispose());
    current.cleanup.push(current.host.subscribeMuted(() => {
      this.muted = current.host.isMuted();
    }));
  }
};
var TelemetryClient2 = class extends TelemetryClient {
  constructor(options = {}) {
    const current = scope();
    super({ ...options, gameId: current.host.gameId, buildId: current.host.buildId, parentOrigin: window.location.origin });
    current.cleanup.push(() => this.dispose());
  }
};
var JuiceEngine2 = class extends JuiceEngine {
  constructor(options = {}) {
    const current = scope();
    super(options);
    current.cleanup.push(() => this.dispose());
  }
};
function attachTelemetry(current) {
  const started = /* @__PURE__ */ new Set();
  const ended = /* @__PURE__ */ new Set();
  const replayed = /* @__PURE__ */ new Set();
  const onTelemetry = (event) => {
    const detail = event.detail;
    if (!detail || typeof detail !== "object") return;
    const { event: name, payload } = detail;
    if (!payload || typeof payload !== "object") return;
    const data = payload;
    if (data.gameId !== current.host.gameId || data.buildId !== current.host.buildId || typeof data.runId !== "string" || data.runId.length < 1 || data.runId.length > 128) return;
    const params = {
      module_id: current.host.gameId,
      studio_build_id: current.host.buildId,
      run_id: data.runId
    };
    let metric;
    if (name === "run_started" && !started.has(data.runId)) {
      if (started.size >= 1e3) return;
      started.add(data.runId);
      metric = "runs";
    } else if (name === "run_ended" && started.has(data.runId) && !ended.has(data.runId)) {
      if (typeof data.score !== "number" || !Number.isFinite(data.score) || typeof data.duration !== "number" || !Number.isFinite(data.duration) || data.duration < 0 || data.duration > 3600) return;
      ended.add(data.runId);
      params.score = data.score;
      params.duration_seconds = data.duration;
      metric = "completions";
    } else if (name === "replay_clicked" && ended.has(data.runId) && !replayed.has(data.runId)) {
      replayed.add(data.runId);
      metric = "replays";
    } else return;
    try {
      current.host.trackStat(current.host.gameId, metric);
      current.host.trackEvent(`studio_${name}`, params);
    } catch {
    }
  };
  window.addEventListener("goblin_telemetry", onTelemetry);
  return () => window.removeEventListener("goblin_telemetry", onTelemetry);
}
function mountInArcade(mountGame, container, host) {
  if (mounted || constructing) throw new Error("Only one mounted instance of this game is supported.");
  const current = { host, cleanup: [] };
  mounted = true;
  constructing = current;
  current.cleanup.push(attachTelemetry(current));
  let disposeGame;
  try {
    disposeGame = mountGame(container);
    if (typeof disposeGame !== "function") throw new Error("Game mount must return a disposal function.");
  } catch (error) {
    disposeScope(current);
    mounted = false;
    throw error;
  } finally {
    constructing = null;
  }
  let disposed = false;
  return () => {
    if (disposed) return;
    disposed = true;
    try {
      disposeGame();
    } finally {
      disposeScope(current);
      mounted = false;
    }
  };
}

// generated:game.ts
var W = 360;
var H = 640;
var RUN_SECONDS = 35;
var MAX_CHARGE = 1.2;
function mount(container) {
  const wrapper = new GoblinWrapper2(container, {
    theme: "arcade",
    label: "Bubble Blast Brawl. Tap to start. Hold to inflate a bubble, release to launch. Tap left or right to steer movement."
  });
  const ctx = wrapper.ctx;
  const juice = new JuiceEngine2();
  const audio = new ProceduralAudio2({ volume: 0.16, muted: wrapper.muted });
  const telemetry = new TelemetryClient2({ gameId: "bubble-blast-brawl" });
  let disposed = false;
  let raf = 0;
  let nowTime = performance.now();
  let phase = "menu";
  let score = 0;
  let inputCount = 0;
  let elapsed = 0;
  let level = 1;
  let arenaType = "basic";
  let endReason = "timeOut";
  let npcShootCd = 1.1;
  let statePulse = 999;
  let arenaSeed = Math.random() * 1e9 | 0;
  let holdingPointer = false;
  let holdSoundPulse = 0;
  const player = { x: 92, y: 540, vx: 92, dir: 1, health: 100, trapped: false, trapTimer: 0, charging: false, charge: 0 };
  const npc = { x: 270, y: 220, vx: -82, dir: -1, health: 100, trapped: false, trapTimer: 0, charging: false, charge: 0 };
  let bubbles = [];
  let obstacles = [];
  const dust = Array.from({ length: 36 }, (_, i) => ({
    x: i * 47 % W,
    y: 148 + i * 79 % (H - 188),
    s: 1 + i % 3,
    o: 0.11 + i % 5 * 0.03
  }));
  const clamp2 = (v, a, b) => Math.max(a, Math.min(b, v));
  function rng(seed) {
    let s = (seed ^ 2654435769) >>> 0;
    return () => {
      s = 1664525 * s + 1013904223 >>> 0;
      return s / 4294967296;
    };
  }
  function updateState(force = false) {
    if (!force && statePulse <= 0.22) return;
    statePulse = 0;
    const livePhase = wrapper.paused ? "paused" : phase;
    telemetry.updateState({
      score,
      phase: livePhase,
      inputCount,
      gameTime: Math.round(elapsed * 10) / 10,
      playerHealth: Math.round(player.health),
      npcHealth: Math.round(npc.health),
      currentLevel: level
    });
  }
  function randomizePositions(seedOffset) {
    const r = rng(arenaSeed + seedOffset);
    player.x = 64 + r() * 88;
    npc.x = W - 64 - r() * 88;
    player.vx = (86 + r() * 18) * (r() > 0.5 ? 1 : -1);
    npc.vx = -(78 + r() * 22) * (r() > 0.4 ? 1 : -1);
    player.dir = player.vx >= 0 ? 1 : -1;
    npc.dir = npc.vx >= 0 ? 1 : -1;
  }
  function overlapsAny(a, list) {
    for (const b of list) {
      if (a.x < b.x + b.w + 10 && a.x + a.w + 10 > b.x && a.y < b.y + b.h + 10 && a.y + a.h + 10 > b.y) return true;
    }
    return false;
  }
  function spawnObstacles(forLevel) {
    const r = rng(arenaSeed + forLevel * 1337);
    const out = [];
    const count = forLevel === 1 ? 5 + (r() * 3 | 0) : forLevel === 2 ? 8 + (r() * 4 | 0) : 12 + (r() * 4 | 0);
    const tries = count * 14;
    for (let i = 0; i < tries && out.length < count; i++) {
      const w = forLevel === 1 ? 42 + r() * 54 : forLevel === 2 ? 48 + r() * 60 : 54 + r() * 66;
      const h = 12 + r() * (forLevel === 3 ? 18 : 14);
      const x = 18 + r() * (W - w - 36);
      const yMin = forLevel === 1 ? 250 : forLevel === 2 ? 220 : 196;
      const yMax = forLevel === 1 ? 470 : 492;
      const y = yMin + r() * (yMax - yMin);
      const candidate = { x, y, w, h };
      const nearPlayerLane = y > 500 && x < 145;
      const nearNpcLane = y < 225 && x > 215;
      if (nearPlayerLane || nearNpcLane) continue;
      if (overlapsAny(candidate, out)) continue;
      out.push(candidate);
    }
    obstacles = out;
    arenaType = obstacles.length > 0 ? "obstacles" : "basic";
  }
  function resetRun() {
    score = 0;
    elapsed = 0;
    level = 1;
    arenaSeed = Math.random() * 1e9 | 0;
    npc.health = 100;
    player.health = 100;
    randomizePositions(11);
    player.trapped = false;
    npc.trapped = false;
    player.trapTimer = 0;
    npc.trapTimer = 0;
    player.charging = false;
    npc.charging = false;
    player.charge = 0;
    npc.charge = 0;
    bubbles = [];
    npcShootCd = 0.9 + Math.random() * 0.5;
    spawnObstacles(1);
  }
  function addScore(delta, x, y, color, text) {
    score += delta;
    juice.floatText(text, x, y, color);
    if (delta > 0) audio.coin(Math.pow(1.05, level - 1) * (delta >= 10 ? 1.06 : 0.95));
    else audio.bump(0.82);
    updateState(true);
  }
  function tapFeedback(x, y, good) {
    juice.particles(x, y, {
      count: good ? 10 : 6,
      color: good ? "#00BFFF" : "#FF6EC7",
      speed: good ? 130 : 90,
      lifetime: 0.4
    });
    audio.play({ frequency: good ? 420 : 260, endFrequency: good ? 580 : 220, type: "triangle", duration: 0.06, volume: 0.38 });
  }
  function launchBubble(from, owner) {
    const p = clamp2(from.charge / MAX_CHARGE, 0.15, 1);
    const r = 10 + p * 26;
    const speed = owner === "player" ? 180 : 165 + (level - 1) * 28;
    const vyAim = owner === "player" ? -0.65 : 0.68;
    bubbles.push({
      x: from.x + from.dir * (18 + r * 0.1),
      y: from.y - 18,
      vx: from.dir * speed,
      vy: speed * vyAim,
      r,
      owner,
      life: 0,
      bounces: 0
    });
    from.charging = false;
    from.charge = 0;
    juice.particles(from.x, from.y - 18, { count: 14, color: "#39FF14", speed: 140, lifetime: 0.45 });
    audio.play({ frequency: 650, endFrequency: 380, type: "sine", duration: 0.09, volume: 0.5 });
  }
  function startRun() {
    phase = "playing";
    resetRun();
    telemetry.startRun({ arenaType });
    updateState(true);
    telemetry.flush();
  }
  function acceptTap(x, y) {
    inputCount++;
    tapFeedback(x, y, true);
    updateState(true);
  }
  function onPlayPress(x, y) {
    if (phase !== "playing" || wrapper.paused) return;
    acceptTap(x, y);
    player.dir = x < W * 0.5 ? -1 : 1;
    player.vx = Math.abs(player.vx) * player.dir;
    if (!player.trapped) {
      player.charging = true;
      player.charge = 0.01;
      holdSoundPulse = 0;
      juice.particles(player.x, player.y - 20, { count: 8, color: "#00BFFF", speed: 70, lifetime: 0.35 });
      audio.play({
        frequency: 220 * Math.pow(1.05, level - 1),
        endFrequency: 620 * Math.pow(1.05, level - 1),
        type: "triangle",
        duration: 0.16,
        volume: 0.42
      });
    }
  }
  function onPlayRelease() {
    if (phase !== "playing" || wrapper.paused) return;
    if (player.charging) launchBubble(player, "player");
  }
  function onMenuTap(x, y) {
    if (phase === "menu") {
      acceptTap(x, y);
      startRun();
      return;
    }
    if (phase === "gameOver") {
      telemetry.replayClicked();
      acceptTap(x, y);
      startRun();
    }
  }
  function circleRectHit(c, o) {
    const cx = clamp2(c.x, o.x, o.x + o.w);
    const cy = clamp2(c.y, o.y, o.y + o.h);
    const dx = c.x - cx;
    const dy = c.y - cy;
    return dx * dx + dy * dy <= c.r * c.r;
  }
  function popBubble(index, color) {
    const b = bubbles[index];
    if (!b) return;
    juice.particles(b.x, b.y, { count: 18, color, speed: 170, lifetime: 0.5 });
    juice.screenShake(3.5, 0.12);
    audio.play({ frequency: 240, endFrequency: 80, type: "square", duration: 0.07, volume: 0.48 });
    bubbles.splice(index, 1);
  }
  function registerBounce(index) {
    const b = bubbles[index];
    if (!b) return true;
    b.bounces += 1;
    juice.particles(b.x, b.y, { count: 6, color: b.owner === "player" ? "#00BFFF" : "#FF6EC7", speed: 85, lifetime: 0.24 });
    audio.play({ frequency: 210, endFrequency: 170, type: "triangle", duration: 0.03, volume: 0.2 });
    if (b.bounces >= 3) {
      popBubble(index, "#FF9100");
      return true;
    }
    return false;
  }
  function hitActor(actor, amount, isPlayer) {
    actor.health = Math.max(0, actor.health - amount);
    actor.trapped = true;
    actor.trapTimer = 1.1;
    if (isPlayer) {
      addScore(-5, actor.x, actor.y - 30, "#FF003C", "-5");
      juice.screenShake(6, 0.16);
      audio.bump(0.74);
    } else {
      addScore(5, actor.x, actor.y - 32, "#39FF14", "+5");
      audio.bump(0.88);
    }
  }
  function levelCheck() {
    const next = clamp2(Math.floor(elapsed / 15) + 1, 1, 3);
    if (next === level) return;
    level = next;
    spawnObstacles(level);
    if (level === 2 && npc.health < 120) npc.health = 120;
    if (level === 3 && npc.health < 150) npc.health = 150;
    juice.floatText(`LEVEL ${level}!`, W * 0.5, 166, "#FFEA00");
    juice.particles(W * 0.5, 150, { count: 24, color: "#FFEA00", speed: 150, lifetime: 0.65 });
    audio.play({
      frequency: 280 * Math.pow(1.05, level - 1),
      endFrequency: 520 * Math.pow(1.05, level - 1),
      type: "triangle",
      duration: 0.2,
      volume: 0.45
    });
    updateState(true);
  }
  function endRun(reason) {
    if (phase === "gameOver") return;
    phase = "gameOver";
    endReason = reason;
    holdingPointer = false;
    player.charging = false;
    telemetry.endRun(score, { activeDuration: elapsed, winState: reason });
    updateState(true);
    telemetry.flush();
  }
  function steerNpc(dt, speedScale) {
    const baseTarget = player.x + player.vx * 0.18;
    let target = baseTarget;
    for (const b of bubbles) {
      if (b.owner !== "player") continue;
      const futureX = b.x + b.vx * 0.32;
      const futureY = b.y + b.vy * 0.32;
      const danger = Math.hypot(futureX - npc.x, futureY - npc.y);
      if (danger < 130 + b.r * 0.5 && futureY > 150 && futureY < 520) {
        target += (npc.x - futureX >= 0 ? 1 : -1) * (58 + b.r * 0.6);
      }
    }
    for (const o of obstacles) {
      if (npc.y > o.y - 42 && npc.y < o.y + o.h + 42 && npc.x > o.x - 8 && npc.x < o.x + o.w + 8) {
        target += npc.x < o.x + o.w * 0.5 ? -70 : 70;
      }
    }
    target = clamp2(target, 28, W - 28);
    const desiredDir = target < npc.x ? -1 : 1;
    npc.dir = desiredDir;
    const desiredV = (78 + (level - 1) * 22) * speedScale * desiredDir;
    npc.vx += (desiredV - npc.vx) * clamp2(dt * 4.8, 0, 1);
  }
  function update(dt) {
    juice.update(dt);
    statePulse += dt;
    if (phase !== "playing" || juice.frozen) return;
    elapsed = Math.min(RUN_SECONDS, elapsed + dt);
    levelCheck();
    const pSpeed = 1 + (level - 1) * 0.08;
    const nSpeed = 1 + (level - 1) * 0.15;
    const nShot = 1 + (level - 1) * 0.2;
    if (player.charging) {
      player.charge = Math.min(MAX_CHARGE, player.charge + dt);
      holdSoundPulse -= dt;
      if (holdSoundPulse <= 0) {
        holdSoundPulse = 0.14;
        const p = player.charge / MAX_CHARGE;
        audio.play({
          frequency: (240 + p * 220) * Math.pow(1.05, level - 1),
          endFrequency: 280 + p * 260,
          type: "triangle",
          duration: 0.05,
          volume: 0.16
        });
      }
    }
    if (!player.trapped) player.x += player.vx * pSpeed * dt;
    if (!npc.trapped) {
      steerNpc(dt, nSpeed);
      npc.x += npc.vx * dt;
    }
    if (player.x < 24 || player.x > W - 24) {
      player.x = clamp2(player.x, 24, W - 24);
      player.vx *= -1;
      player.dir *= -1;
    }
    if (npc.x < 24 || npc.x > W - 24) {
      npc.x = clamp2(npc.x, 24, W - 24);
      npc.vx *= -1;
      npc.dir *= -1;
    }
    if (player.trapped) {
      player.trapTimer -= dt;
      if (player.trapTimer <= 0) player.trapped = false;
    }
    if (npc.trapped) {
      npc.trapTimer -= dt;
      if (npc.trapTimer <= 0) npc.trapped = false;
    }
    npcShootCd -= dt * nShot;
    if (!npc.trapped && npcShootCd <= 0) {
      const leadX = player.x + player.vx * 0.25;
      npc.dir = leadX < npc.x ? -1 : 1;
      npc.charge = 0.4 + Math.random() * 0.75;
      launchBubble(npc, "npc");
      npcShootCd = 1.28 - (level - 1) * 0.19 + Math.random() * 0.42;
    }
    for (let i = bubbles.length - 1; i >= 0; i--) {
      const b = bubbles[i];
      if (!b) continue;
      b.life += dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      let bounced = false;
      if (b.x < b.r || b.x > W - b.r) {
        b.x = clamp2(b.x, b.r, W - b.r);
        b.vx *= -1;
        bounced = true;
      }
      if (b.y < 150 + b.r || b.y > H - 28 - b.r) {
        b.y = clamp2(b.y, 150 + b.r, H - 28 - b.r);
        b.vy *= -1;
        bounced = true;
      }
      for (const o of obstacles) {
        if (circleRectHit(b, o)) {
          const cx = o.x + o.w * 0.5;
          const cy = o.y + o.h * 0.5;
          const dx = b.x - cx;
          const dy = b.y - cy;
          if (Math.abs(dx / o.w) > Math.abs(dy / o.h)) b.vx *= -1;
          else b.vy *= -1;
          b.x += b.vx * dt * 1.4;
          b.y += b.vy * dt * 1.4;
          bounced = true;
          break;
        }
      }
      if (bounced && registerBounce(i)) continue;
      if (b.life > 6.2) bubbles.splice(i, 1);
    }
    for (let i = bubbles.length - 1; i >= 0; i--) {
      const b = bubbles[i];
      if (!b) continue;
      if (b.owner === "player") {
        const dn = Math.hypot(b.x - npc.x, b.y - npc.y);
        if (dn < b.r + 18) {
          if (!npc.trapped) {
            npc.trapped = true;
            npc.trapTimer = 1 + b.r * 0.05;
            addScore(5, npc.x, npc.y - 30, "#39FF14", "+5");
            audio.bump(0.9);
          } else {
            npc.health = Math.max(0, npc.health - 25);
            addScore(10, npc.x, npc.y - 48, "#00BFFF", "+10");
            juice.hitstop(0.03);
            juice.screenShake(7, 0.16);
            if (npc.health <= 0) addScore(50, npc.x, npc.y - 66, "#FFEA00", "+50");
          }
          popBubble(i, "#00BFFF");
          continue;
        }
      } else {
        const dp = Math.hypot(b.x - player.x, b.y - player.y);
        if (dp < b.r + 18) {
          hitActor(player, 20, true);
          popBubble(i, "#FF003C");
          continue;
        }
      }
    }
    for (let i = bubbles.length - 1; i >= 0; i--) {
      const a = bubbles[i];
      if (!a) continue;
      for (let j = i - 1; j >= 0; j--) {
        const b = bubbles[j];
        if (!b || a.owner === b.owner) continue;
        if (Math.hypot(a.x - b.x, a.y - b.y) < a.r + b.r) {
          const hi = i > j ? i : j;
          const lo = i > j ? j : i;
          popBubble(hi, "#FF6EC7");
          popBubble(lo, "#FF6EC7");
          break;
        }
      }
    }
    if (score >= 90 || npc.health <= 0) endRun("win");
    else if (player.health <= 0) endRun("loss");
    else if (elapsed >= RUN_SECONDS) endRun("timeOut");
    updateState();
  }
  function drawChar(f, body, accent, t, isNpc) {
    const b = juice.breathe(t, 0.04, 4, f.x * 0.01);
    ctx.save();
    ctx.translate(f.x, f.y);
    ctx.scale(b.x, b.y);
    ctx.fillStyle = "#0000001f";
    ctx.beginPath();
    ctx.ellipse(0, 24, 20, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = body;
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-18, -24);
    ctx.quadraticCurveTo(-24, -4, -18, 16);
    ctx.quadraticCurveTo(0, 28, 18, 16);
    ctx.quadraticCurveTo(24, -4, 18, -24);
    ctx.quadraticCurveTo(0, -34, -18, -24);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.ellipse(-7, -9, 7, 8, 0, 0, Math.PI * 2);
    ctx.ellipse(8, -10, 7, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#000";
    ctx.beginPath();
    ctx.arc(-7 + f.dir * 2, -9, 2.2, 0, Math.PI * 2);
    ctx.arc(8 + f.dir * 2, -10, 2.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = accent;
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(-11, 2, 22, 9, 4);
    ctx.fill();
    ctx.stroke();
    if (isNpc) {
      ctx.fillStyle = "#FF003C";
      ctx.beginPath();
      ctx.moveTo(-11, -25);
      ctx.lineTo(-2, -34);
      ctx.lineTo(3, -24);
      ctx.fill();
    } else {
      ctx.fillStyle = "#00BFFF";
      ctx.beginPath();
      ctx.moveTo(11, -24);
      ctx.lineTo(18, -32);
      ctx.lineTo(21, -20);
      ctx.fill();
    }
    if (f.charging) {
      ctx.strokeStyle = "#00BFFF";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, -6, 20 + f.charge / MAX_CHARGE * 14, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (f.trapped) {
      ctx.strokeStyle = "#00BFFF";
      ctx.fillStyle = "rgba(0,191,255,0.16)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, -6, 30, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }
  function drawPanel(x, y, w, h, fill) {
    ctx.fillStyle = fill;
    ctx.fillRect(x + 4, y + 4, w, h);
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 3;
    ctx.fillStyle = fill;
    ctx.fillRect(x, y, w, h);
    ctx.strokeRect(x, y, w, h);
  }
  function drawBackground() {
    ctx.fillStyle = "#f6f6f6";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 74, W, 4);
    ctx.fillRect(0, 146, W, 4);
    ctx.fillStyle = "#e9e9e9";
    ctx.fillRect(0, 150, W, H - 150);
    for (const d of dust) {
      ctx.fillStyle = `rgba(0,0,0,${d.o})`;
      ctx.fillRect(d.x, d.y, d.s, d.s);
    }
  }
  function draw() {
    drawBackground();
    ctx.save();
    ctx.translate(juice.shakeOffset.x, juice.shakeOffset.y);
    drawPanel(12, 152, W - 24, H - 176, "#efefef");
    drawPanel(18, 18, 126, 48, "#ffffff");
    ctx.fillStyle = "#000";
    ctx.font = '900 18px "Archivo Black", Impact, sans-serif';
    ctx.textAlign = "left";
    ctx.fillText(String(score).padStart(3, "0"), 28, 49);
    ctx.font = '700 10px "Space Mono", "Courier New", monospace';
    ctx.fillText("SCORE", 92, 49);
    drawPanel(150, 18, 86, 48, "#ffffff");
    ctx.fillStyle = "#000";
    ctx.font = '900 20px "Archivo Black", Impact, sans-serif';
    ctx.fillText(`${Math.max(0, Math.ceil(RUN_SECONDS - elapsed))}s`, 160, 49);
    drawPanel(242, 18, 100, 48, "#ffffff");
    ctx.fillStyle = "#000";
    ctx.font = '900 16px "Archivo Black", Impact, sans-serif';
    ctx.fillText(`L${level}`, 250, 49);
    ctx.font = '700 10px "Space Mono", "Courier New", monospace';
    ctx.fillText(`P${Math.round(player.health)} N${Math.round(npc.health)}`, 272, 49);
    for (const o of obstacles) {
      drawPanel(o.x, o.y, o.w, o.h, "#ffffff");
      ctx.fillStyle = "#39FF14";
      ctx.fillRect(o.x + 5, o.y + 5, Math.max(8, o.w - 10), 4);
    }
    for (const b of bubbles) {
      ctx.fillStyle = b.owner === "player" ? "rgba(0,191,255,0.24)" : "rgba(255,110,199,0.24)";
      ctx.strokeStyle = "#000";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(b.x - b.r * 0.35, b.y - b.r * 0.35, Math.max(2, b.r * 0.18), 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#000";
      ctx.font = '700 9px "Space Mono", "Courier New", monospace';
      ctx.textAlign = "center";
      ctx.fillText(String(Math.max(0, 3 - b.bounces)), b.x, b.y + 3);
    }
    drawChar(npc, "#FF6EC7", "#FF003C", elapsed, true);
    drawChar(player, "#39FF14", "#00BFFF", elapsed, false);
    if (phase === "menu") {
      drawPanel(30, 210, W - 60, 238, "#ffffff");
      ctx.fillStyle = "#000";
      ctx.textAlign = "center";
      ctx.font = '900 28px "Archivo Black", Impact, sans-serif';
      ctx.fillText("BUBBLE BLAST", W / 2, 255);
      ctx.fillText("BRAWL", W / 2, 289);
      ctx.font = '700 13px "Space Mono", "Courier New", monospace';
      ctx.fillText("Hold to inflate. Release to launch.", W / 2, 332);
      ctx.fillText("Tap left/right to steer movement.", W / 2, 354);
      ctx.fillText("Bubbles pop after 3 bounces.", W / 2, 376);
      ctx.fillText("Random terrain every round.", W / 2, 398);
      drawPanel(74, 413, W - 148, 24, "#39FF14");
      ctx.fillStyle = "#000";
      ctx.font = '900 14px "Archivo Black", Impact, sans-serif';
      ctx.fillText("TAP TO START", W / 2, 430);
    }
    if (phase === "gameOver") {
      drawPanel(42, 238, W - 84, 168, "#ffffff");
      ctx.fillStyle = endReason === "win" ? "#39FF14" : "#FF003C";
      ctx.font = '900 26px "Archivo Black", Impact, sans-serif';
      ctx.textAlign = "center";
      ctx.fillText(endReason === "win" ? "YOU WIN!" : endReason === "loss" ? "YOU LOSE" : "TIME UP", W / 2, 282);
      ctx.fillStyle = "#000";
      ctx.font = '900 16px "Archivo Black", Impact, sans-serif';
      ctx.fillText(`SCORE ${score}`, W / 2, 318);
      ctx.font = '700 13px "Space Mono", "Courier New", monospace';
      ctx.fillText("Tap to replay", W / 2, 350);
    }
    juice.draw(ctx);
    ctx.restore();
  }
  const offTap = wrapper.onTap(({ x, y }) => onMenuTap(x, y));
  const offMute = wrapper.onMute((muted) => {
    audio.muted = muted;
    telemetry.updateState({ score, phase: wrapper.paused ? "paused" : phase, inputCount });
  });
  const offPause = wrapper.onPause((paused) => {
    telemetry.updateState({ score, phase: paused ? "paused" : phase, inputCount });
    telemetry.flush();
  });
  function pointerDown(ev) {
    if (phase !== "playing" || wrapper.paused) return;
    holdingPointer = true;
    const rect = wrapper.canvas.getBoundingClientRect();
    const x = (ev.clientX - rect.left) / rect.width * W;
    const y = (ev.clientY - rect.top) / rect.height * H;
    onPlayPress(x, y);
  }
  function pointerUp() {
    if (!holdingPointer) return;
    holdingPointer = false;
    onPlayRelease();
  }
  wrapper.canvas.addEventListener("pointerdown", pointerDown);
  wrapper.canvas.addEventListener("pointerup", pointerUp);
  wrapper.canvas.addEventListener("pointercancel", pointerUp);
  wrapper.canvas.addEventListener("pointerleave", pointerUp);
  window.addEventListener("pointerup", pointerUp);
  function tick(t) {
    if (disposed) return;
    const dt = Math.min(0.05, Math.max(0, (t - nowTime) / 1e3));
    nowTime = t;
    if (!wrapper.paused) update(dt);
    else juice.update(dt);
    draw();
    raf = requestAnimationFrame(tick);
  }
  spawnObstacles(1);
  updateState(true);
  draw();
  telemetry.flush();
  raf = requestAnimationFrame(tick);
  return () => {
    if (disposed) return;
    disposed = true;
    cancelAnimationFrame(raf);
    wrapper.canvas.removeEventListener("pointerdown", pointerDown);
    wrapper.canvas.removeEventListener("pointerup", pointerUp);
    wrapper.canvas.removeEventListener("pointercancel", pointerUp);
    wrapper.canvas.removeEventListener("pointerleave", pointerUp);
    window.removeEventListener("pointerup", pointerUp);
    offTap();
    offMute();
    offPause();
    telemetry.dispose();
    juice.dispose();
    audio.dispose();
    wrapper.dispose();
  };
}

// arcade-entry.ts
function mount2(container, host) {
  return mountInArcade(mount, container, host);
}
export {
  mount2 as mount
};
