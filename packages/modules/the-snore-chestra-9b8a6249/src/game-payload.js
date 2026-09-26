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
      boxSizing: "border-box",
      margin: "0 auto",
      overflow: "hidden",
      borderRadius: "22px",
      background: "#100c21",
      isolation: "isolate",
      fontFamily: "ui-rounded, system-ui, sans-serif",
      color: "#fff",
      ...this.arcadeTheme ? {
        background: "#FFFFFF",
        color: "#000000",
        border: "4px solid #000000",
        borderRadius: "4px",
        boxShadow: "4px 4px 0 #000000",
        fontFamily: '"Space Mono", "Courier New", monospace'
      } : {}
    });
    const surface = document.createElement("div");
    surface.setAttribute("data-goblin-surface", "");
    Object.assign(surface.style, { position: "relative", width: "100%", aspectRatio: "9 / 16", overflow: "hidden" });
    this.root.append(surface);
    this.canvas = document.createElement("canvas");
    const ratio = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
    this.canvas.width = this.width * ratio;
    this.canvas.height = this.height * ratio;
    this.canvas.setAttribute("aria-label", options.label ?? "Scroll Goblin game. Tap to play.");
    this.canvas.setAttribute("role", "img");
    Object.assign(this.canvas.style, { display: "block", width: "100%", height: "auto", touchAction: "none" });
    const ctx = this.canvas.getContext("2d", { alpha: false });
    if (!ctx) throw new Error("This browser does not support Canvas2D.");
    this.ctx = ctx;
    this.ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    surface.append(this.canvas);
    this.pauseOverlay = document.createElement("div");
    this.pauseOverlay.textContent = "PAUSED";
    this.pauseOverlay.setAttribute("data-goblin-pause-overlay", "");
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
    surface.append(this.pauseOverlay);
    const controls = document.createElement("div");
    controls.setAttribute("data-goblin-controls", "");
    controls.setAttribute("role", "group");
    controls.setAttribute("aria-label", "Game controls");
    Object.assign(controls.style, {
      display: "flex",
      justifyContent: "flex-end",
      gap: "8px",
      padding: "10px",
      boxSizing: "border-box",
      background: "#100c21",
      borderTop: "1px solid #3e3354",
      ...this.arcadeTheme ? { background: "#FFFFFF", borderTop: "2px solid #000000" } : {}
    });
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
      minHeight: "44px",
      minWidth: "44px",
      boxSizing: "border-box",
      font: "600 11px system-ui, sans-serif",
      cursor: "pointer",
      touchAction: "manipulation",
      ...this.arcadeTheme ? {
        background: "#FFFFFF",
        color: "#000000",
        border: "2px solid #000000",
        borderRadius: "4px",
        boxShadow: "2px 2px 0 #000000",
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
var RUN_SECONDS = 40;
var BASE_SPAWN_INTERVAL = 1.05;
var BASE_SPEED = 66;
var CENTER_X = 180;
var CENTER_Y = 360;
var SNORE_COOLDOWN_SECONDS = 0.5;
function mount(container) {
  const wrapper = new GoblinWrapper2(container, {
    theme: "arcade",
    label: "The Snore-chestra: Tap to fire directional snore waves from center and clear distractions before they reach the top. Survive 40 seconds."
  });
  const { ctx, width, height } = wrapper;
  const juice = new JuiceEngine2({ maxParticles: 220 });
  const audio = new ProceduralAudio2({ volume: 0.16, muted: wrapper.muted });
  const telemetry = new TelemetryClient2({ gameId: "the-snore-chestra" });
  let disposed = false;
  let frame = 0;
  let lastTime = performance.now();
  let time = 0;
  let phase = "title";
  let sleepPoints = 0;
  let inputCount = 0;
  let activeDuration = 0;
  let distractionsCleared = 0;
  let distractionsMissed = 0;
  let level = 1;
  let spawnTimer = 0;
  let hudTimer = 0;
  let snoreCooldown = 0;
  const distractions = [];
  const ripples = [];
  function clamp2(v, a, b) {
    return Math.max(a, Math.min(b, v));
  }
  function angleWrap(a) {
    let out = a;
    while (out > Math.PI) out -= Math.PI * 2;
    while (out < -Math.PI) out += Math.PI * 2;
    return out;
  }
  function currentLevel(elapsed) {
    if (elapsed >= 30) return 3;
    if (elapsed >= 15) return 2;
    return 1;
  }
  function levelPitch() {
    return Math.pow(1.05, level - 1);
  }
  function speedMultiplier() {
    if (level === 2) return 1.1;
    if (level === 3) return 1.2;
    return 1;
  }
  function spawnInterval() {
    if (level === 2) return BASE_SPAWN_INTERVAL / 1.2;
    if (level === 3) return BASE_SPAWN_INTERVAL / 1.4;
    return BASE_SPAWN_INTERVAL;
  }
  function updateTelemetry() {
    telemetry.updateState({
      score: sleepPoints,
      phase,
      inputCount,
      activeDuration: Math.round(activeDuration * 100) / 100,
      distractionsCleared,
      distractionsMissed,
      level
    });
  }
  function spawnDistraction() {
    const kindRoll = Math.random();
    const kind = kindRoll < 0.34 ? "siren" : kindRoll < 0.67 ? "dog" : "phone";
    const x = 34 + Math.random() * (width - 68);
    const speed = BASE_SPEED * (0.86 + Math.random() * 0.35);
    const drift = (Math.random() * 2 - 1) * 22;
    distractions.push({
      x,
      y: height + 24,
      vx: drift,
      vy: speed,
      r: 16 + Math.random() * 5,
      kind,
      seed: Math.random() * 1e3
    });
  }
  function startRun() {
    phase = "playing";
    sleepPoints = 100;
    activeDuration = 0;
    distractionsCleared = 0;
    distractionsMissed = 0;
    level = 1;
    spawnTimer = 0;
    hudTimer = 0;
    snoreCooldown = 0;
    distractions.length = 0;
    ripples.length = 0;
    telemetry.startRun({ targetDuration: RUN_SECONDS });
    updateTelemetry();
  }
  function finishRun() {
    if (phase !== "playing") return;
    phase = "game_over";
    telemetry.endRun(sleepPoints, {
      activeDuration: Math.round(activeDuration * 100) / 100,
      distractionsCleared,
      distractionsMissed,
      level,
      inputCount
    });
    juice.screenShake(6, 0.18);
    juice.particles(width / 2, 200, {
      count: juice.reducedMotion ? 20 : 52,
      color: sleepPoints > 0 ? "#39FF14" : "#FF003C",
      speed: 190,
      lifetime: 0.8
    });
    audio.play({
      frequency: sleepPoints > 0 ? 420 : 180,
      endFrequency: sleepPoints > 0 ? 820 : 90,
      type: "triangle",
      duration: 0.3,
      volume: 0.7
    });
    updateTelemetry();
    telemetry.flush();
  }
  function emitSnoreTapFeedback(angle) {
    const p = levelPitch();
    const burstX = CENTER_X + Math.cos(angle) * 36;
    const burstY = CENTER_Y + Math.sin(angle) * 36;
    juice.particles(burstX, burstY, {
      count: juice.reducedMotion ? 8 : 16,
      color: "#00BFFF",
      speed: 140,
      lifetime: 0.42
    });
    juice.screenShake(2.2, 0.08);
    audio.play({
      frequency: 150 * p,
      endFrequency: 108 * p,
      type: "triangle",
      duration: 0.17,
      attack: 0.01,
      volume: 0.55
    });
  }
  function addRipple(angle) {
    ripples.push({
      x: CENTER_X,
      y: CENTER_Y,
      radius: 6,
      maxRadius: 196,
      age: 0,
      life: 0.46,
      angle,
      spread: 0.34,
      thickness: 18
    });
  }
  function tapAngle(x, y) {
    const dx = x - CENTER_X;
    const dy = y - CENTER_Y;
    if (Math.abs(dx) + Math.abs(dy) < 1e-3) return -Math.PI / 2;
    return Math.atan2(dy, dx);
  }
  function tryEmitSnore(x, y) {
    if (snoreCooldown > 0) return false;
    snoreCooldown = SNORE_COOLDOWN_SECONDS;
    const angle = tapAngle(x, y);
    emitSnoreTapFeedback(angle);
    addRipple(angle);
    return true;
  }
  const offMute = wrapper.onMute((muted) => {
    audio.muted = muted;
    telemetry.updateState({ muted, score: sleepPoints, phase, inputCount });
  });
  const offPause = wrapper.onPause((paused) => {
    telemetry.updateState({ paused, score: sleepPoints, phase, inputCount });
    telemetry.flush();
  });
  const offTap = wrapper.onTap(({ x, y }) => {
    inputCount += 1;
    if (phase === "title") {
      startRun();
      tryEmitSnore(x, y);
      updateTelemetry();
      telemetry.flush();
      return;
    }
    if (phase === "game_over") {
      telemetry.replayClicked();
      phase = "title";
      sleepPoints = 0;
      level = 1;
      snoreCooldown = 0;
      distractions.length = 0;
      ripples.length = 0;
      tryEmitSnore(x, y);
      updateTelemetry();
      telemetry.flush();
      return;
    }
    if (phase === "playing") {
      if (tryEmitSnore(x, y)) updateTelemetry();
    }
  });
  function drawOutlinedCircle(x, y, r, fill) {
    ctx.fillStyle = fill;
    ctx.strokeStyle = "#0c0f17";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  function drawSiren(d) {
    ctx.save();
    ctx.translate(d.x, d.y);
    ctx.rotate(Math.sin(time * 3 + d.seed) * 0.15);
    drawOutlinedCircle(0, 0, d.r, "#f6f8ff");
    ctx.fillStyle = "#FF003C";
    ctx.strokeStyle = "#0c0f17";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(-d.r * 0.56, -d.r * 0.38, d.r * 1.12, d.r * 0.9, 5);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#FFEA00";
    ctx.beginPath();
    ctx.arc(0, -d.r * 0.1, d.r * 0.18, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  function drawDog(d) {
    ctx.save();
    ctx.translate(d.x, d.y);
    ctx.rotate(Math.sin(time * 2.6 + d.seed) * 0.12);
    drawOutlinedCircle(0, 0, d.r, "#f6f8ff");
    ctx.fillStyle = "#8B4513";
    ctx.strokeStyle = "#0c0f17";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(-d.r * 0.42, -d.r * 0.3, d.r * 0.33, 0, Math.PI * 2);
    ctx.arc(d.r * 0.42, -d.r * 0.3, d.r * 0.33, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#0c0f17";
    ctx.beginPath();
    ctx.arc(-d.r * 0.26, -d.r * 0.05, d.r * 0.12, 0, Math.PI * 2);
    ctx.arc(d.r * 0.26, -d.r * 0.05, d.r * 0.12, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.roundRect(-d.r * 0.34, d.r * 0.18, d.r * 0.68, d.r * 0.26, 6);
    ctx.fill();
    ctx.restore();
  }
  function drawPhone(d) {
    ctx.save();
    ctx.translate(d.x, d.y);
    ctx.rotate(Math.sin(time * 3.5 + d.seed) * 0.2);
    drawOutlinedCircle(0, 0, d.r, "#f6f8ff");
    ctx.fillStyle = "#00BFFF";
    ctx.strokeStyle = "#0c0f17";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(-d.r * 0.48, -d.r * 0.68, d.r * 0.96, d.r * 1.36, 5);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#EAEAEA";
    ctx.beginPath();
    ctx.roundRect(-d.r * 0.35, -d.r * 0.45, d.r * 0.7, d.r * 0.72, 3);
    ctx.fill();
    ctx.fillStyle = "#0c0f17";
    ctx.beginPath();
    ctx.arc(0, d.r * 0.42, d.r * 0.08, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  function drawSleeper() {
    const b = juice.breathe(time, 0.025, 3.2, 0);
    ctx.save();
    ctx.translate(CENTER_X, CENTER_Y);
    ctx.scale(b.x, b.y);
    ctx.fillStyle = "#f4f7ff";
    ctx.strokeStyle = "#11131b";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(-76, -52, 152, 114, 28);
    ctx.fill();
    ctx.stroke();
    const quilt = ctx.createLinearGradient(-54, 0, 54, 38);
    quilt.addColorStop(0, "#6eea89");
    quilt.addColorStop(1, "#39FF14");
    ctx.fillStyle = quilt;
    ctx.beginPath();
    ctx.roundRect(-54, -16, 108, 56, 24);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#11131b";
    ctx.beginPath();
    ctx.arc(-24, -12, 6, 0, Math.PI * 2);
    ctx.arc(24, -12, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#11131b";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, 14, 16, 0.1, Math.PI - 0.1);
    ctx.stroke();
    ctx.fillStyle = "#00BFFF";
    ctx.font = '700 13px "Space Mono", "Courier New", monospace';
    ctx.textAlign = "center";
    ctx.fillText("Z z", 0, -34);
    ctx.restore();
  }
  function update(dt) {
    time += dt;
    juice.update(dt);
    if (snoreCooldown > 0) snoreCooldown = Math.max(0, snoreCooldown - dt);
    for (let i = ripples.length - 1; i >= 0; i--) {
      const r = ripples[i];
      r.age += dt;
      const t = clamp2(r.age / r.life, 0, 1);
      r.radius = 8 + (r.maxRadius - 8) * t;
      if (t >= 1) ripples.splice(i, 1);
    }
    if (phase !== "playing" || juice.frozen) return;
    activeDuration += dt;
    const oldLevel = level;
    level = currentLevel(activeDuration);
    if (level !== oldLevel) {
      juice.floatText(level === 2 ? "LEVEL 2" : "LEVEL 3", width / 2, 140, "#FF9100");
      juice.particles(width / 2, 150, {
        count: juice.reducedMotion ? 10 : 26,
        color: "#FF9100",
        speed: 170,
        lifetime: 0.5
      });
      audio.bump(levelPitch());
      updateTelemetry();
    }
    spawnTimer += dt;
    const interval = spawnInterval();
    while (spawnTimer >= interval) {
      spawnTimer -= interval;
      spawnDistraction();
    }
    const spd = speedMultiplier();
    for (let i = distractions.length - 1; i >= 0; i--) {
      const d = distractions[i];
      d.y -= d.vy * dt * spd;
      d.x += d.vx * dt;
      if (d.x < 20 || d.x > width - 20) d.vx *= -1;
      d.x = clamp2(d.x, 18, width - 18);
      if (d.y < 12) {
        distractions.splice(i, 1);
        distractionsMissed += 1;
        sleepPoints = Math.max(0, sleepPoints - 10);
        juice.particles(d.x, 22, {
          count: juice.reducedMotion ? 6 : 14,
          color: "#FF003C",
          speed: 120,
          lifetime: 0.35
        });
        audio.play({
          frequency: 120,
          endFrequency: 70,
          type: "sawtooth",
          duration: 0.13,
          volume: 0.5
        });
        updateTelemetry();
      }
    }
    for (let i = distractions.length - 1; i >= 0; i--) {
      const d = distractions[i];
      let hit = false;
      for (let j = 0; j < ripples.length; j++) {
        const r = ripples[j];
        const dx = d.x - r.x;
        const dy = d.y - r.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 2) continue;
        const a = Math.atan2(dy, dx);
        const da = Math.abs(angleWrap(a - r.angle));
        const spread = r.spread + d.r / Math.max(50, dist);
        const radialOk = dist >= r.radius - r.thickness && dist <= r.radius + d.r + r.thickness * 0.35;
        if (da <= spread && radialOk) {
          hit = true;
          break;
        }
      }
      if (hit) {
        distractions.splice(i, 1);
        distractionsCleared += 1;
        juice.particles(d.x, d.y, {
          count: juice.reducedMotion ? 8 : 20,
          color: "#39FF14",
          speed: 180,
          lifetime: 0.46
        });
        juice.floatText("shhh", d.x, d.y - 12, "#00BFFF");
        audio.coin(levelPitch());
        updateTelemetry();
      }
    }
    hudTimer += dt;
    if (hudTimer >= 0.5) {
      hudTimer = 0;
      updateTelemetry();
    }
    if (sleepPoints <= 0 || activeDuration >= RUN_SECONDS) finishRun();
  }
  function drawHud() {
    const hudX = 12;
    const hudY = 56;
    const hudW = 200;
    const hudH = 90;
    ctx.fillStyle = "#fefefe";
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(hudX, hudY, hudW, hudH, 8);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#000000";
    ctx.textAlign = "left";
    ctx.font = '900 14px "Archivo Black", Impact, sans-serif';
    ctx.fillText("THE SNORE-CHESTRA", hudX + 10, hudY + 23);
    ctx.font = '700 13px "Space Mono", "Courier New", monospace';
    ctx.fillText(`SLEEP ${String(sleepPoints).padStart(3, "0")}`, hudX + 10, hudY + 45);
    const t = phase === "playing" ? Math.max(0, Math.ceil(RUN_SECONDS - activeDuration)) : RUN_SECONDS;
    ctx.fillText(`TIME ${String(t).padStart(2, "0")}s`, hudX + 10, hudY + 63);
    ctx.fillText(`LV ${level}`, hudX + 145, hudY + 45);
    ctx.fillStyle = "#EAEAEA";
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(hudX + 10, hudY + 70, hudW - 20, 12, 5);
    ctx.fill();
    ctx.stroke();
    const p = clamp2(phase === "playing" ? activeDuration / RUN_SECONDS : 0, 0, 1);
    ctx.fillStyle = p < 0.75 ? "#39FF14" : "#FF9100";
    ctx.beginPath();
    ctx.roundRect(hudX + 12, hudY + 72, (hudW - 24) * p, 8, 4);
    ctx.fill();
  }
  function drawBackground() {
    const sky = ctx.createLinearGradient(0, 0, 0, height);
    sky.addColorStop(0, "#1d2431");
    sky.addColorStop(1, "#2b3344");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, width, height);
    for (let i = 0; i < 24; i++) {
      const x = (i * 41.7 + 17) % width;
      const y = 120 + i * 59.3 % 500;
      const tw = 0.1 + (Math.sin(time + i * 0.9) + 1) * 0.08;
      ctx.fillStyle = `rgba(255,255,255,${tw.toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(x, y, 1 + i % 3 * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "#d7dce8";
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(12, 112, width - 24, height - 124, 8);
    ctx.fill();
    ctx.stroke();
    const floor = ctx.createLinearGradient(0, 470, 0, height);
    floor.addColorStop(0, "#b9c3d6");
    floor.addColorStop(1, "#8e9ab0");
    ctx.fillStyle = floor;
    ctx.fillRect(16, 470, width - 32, height - 130);
    ctx.fillStyle = "#9eabc1";
    ctx.globalAlpha = 0.3;
    for (let i = 0; i < 8; i++) {
      ctx.fillRect(18 + i * 42, 474, 22, 150);
    }
    ctx.globalAlpha = 1;
  }
  function drawRipple(r) {
    const alpha = 1 - r.age / r.life;
    const start = r.angle - r.spread;
    const end = r.angle + r.spread;
    ctx.strokeStyle = `rgba(0,191,255,${alpha.toFixed(3)})`;
    ctx.lineWidth = 5;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.arc(r.x, r.y, r.radius, start, end);
    ctx.stroke();
    ctx.strokeStyle = `rgba(57,255,20,${(alpha * 0.55).toFixed(3)})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(r.x, r.y, Math.max(0, r.radius - r.thickness * 0.35), start, end);
    ctx.stroke();
  }
  function render() {
    drawBackground();
    ctx.save();
    ctx.translate(juice.shakeOffset.x, juice.shakeOffset.y);
    ctx.fillStyle = "rgba(0,0,0,0.17)";
    ctx.beginPath();
    ctx.ellipse(CENTER_X, CENTER_Y + 68, 100, 20, 0, 0, Math.PI * 2);
    ctx.fill();
    drawSleeper();
    for (const r of ripples) drawRipple(r);
    for (const d of distractions) {
      if (d.kind === "siren") drawSiren(d);
      else if (d.kind === "dog") drawDog(d);
      else drawPhone(d);
    }
    if (phase === "title") {
      ctx.fillStyle = "#FFFFFF";
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.roundRect(28, 466, width - 56, 126, 8);
      ctx.fill();
      ctx.stroke();
      ctx.textAlign = "center";
      ctx.fillStyle = "#000000";
      ctx.font = '900 28px "Archivo Black", Impact, sans-serif';
      ctx.fillText("TAP TO DOZE", width / 2, 502);
      ctx.font = '700 13px "Space Mono", "Courier New", monospace';
      ctx.fillText("Snore wave starts at center, aims at tap.", width / 2, 527);
      ctx.fillText("Clear sirens, dogs, and phones.", width / 2, 547);
      ctx.fillText("Misses cost 10 sleep. Survive 40s.", width / 2, 567);
    } else if (phase === "game_over") {
      ctx.fillStyle = "#FFFFFF";
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.roundRect(40, 478, width - 80, 108, 8);
      ctx.fill();
      ctx.stroke();
      ctx.textAlign = "center";
      ctx.fillStyle = "#000000";
      ctx.font = '900 24px "Archivo Black", Impact, sans-serif';
      ctx.fillText(sleepPoints > 0 ? "YOU SLEPT!" : "WIDE AWAKE!", width / 2, 510);
      ctx.font = '700 14px "Space Mono", "Courier New", monospace';
      ctx.fillText(`FINAL SLEEP: ${sleepPoints}`, width / 2, 535);
      ctx.fillText("Tap to return to title", width / 2, 560);
    }
    if (wrapper.paused) {
      ctx.fillStyle = "rgba(0,0,0,0.45)";
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = "#FFFFFF";
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.roundRect(88, 290, 184, 66, 8);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#000000";
      ctx.textAlign = "center";
      ctx.font = '900 24px "Archivo Black", Impact, sans-serif';
      ctx.fillText("PAUSED", width / 2, 332);
    }
    drawHud();
    juice.draw(ctx);
    ctx.restore();
  }
  function tick(now) {
    if (disposed) return;
    const dt = Math.min(0.05, Math.max(0, (now - lastTime) / 1e3));
    lastTime = now;
    if (!wrapper.paused) update(dt);
    render();
    frame = requestAnimationFrame(tick);
  }
  updateTelemetry();
  render();
  telemetry.flush();
  frame = requestAnimationFrame(tick);
  return () => {
    if (disposed) return;
    disposed = true;
    cancelAnimationFrame(frame);
    offTap();
    offMute();
    offPause();
    juice.dispose();
    audio.dispose();
    telemetry.dispose();
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
