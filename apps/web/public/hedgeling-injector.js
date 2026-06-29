// Hedgeling i18n injector (framework-agnostic runtime fallback)
//
// Translates rendered DOM by CONTENT MATCH against the bundle, so it works for any
// framework's output and for dynamic / data-driven / API strings that the build-time
// auto-wrap can't see -- as long as the source English string is in the bundle.
//
// It also re-applies on DOM mutations (MutationObserver) and can call an optional
// live machine-translation hook for cache misses.
//
// Inputs:
// - hedgeling-bundle.json:         { "<locale>": { "<md5key>": "<translated>" }, ... }
// - hedgeling-source-key-map.json: { "bySource": { "<normalized source>": "<md5key>" } }
//
// Backward compatible: still honors elements pre-annotated with data-h="<md5>".

(function () {
  const TRANSLATABLE_ATTRS = ["placeholder", "alt", "title", "aria-label"];

  function normalize(text) {
    return String(text == null ? "" : text)
      .replace(/\s+/g, " ")
      .trim();
  }

  async function loadJson(url) {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
    return await res.json();
  }

  function detectLocale() {
    const htmlLang = document.documentElement.getAttribute("lang");
    return htmlLang || navigator.language || "en-US";
  }

  function createInjector(options) {
    const dict = options.dict || {};
    const bySource = (options.sourceKeyMap && options.sourceKeyMap.bySource) || {};
    const translateMissing = typeof options.translateMissing === "function" ? options.translateMissing : null;
    // Cache of source-text -> translated (includes live-MT results).
    const cache = new Map();
    const pending = new Set();

    function lookup(sourceText) {
      const normalized = normalize(sourceText);
      if (!normalized) return undefined;
      if (cache.has(normalized)) return cache.get(normalized);
      const key = bySource[normalized];
      const translated = key ? dict[key] : undefined;
      if (translated !== undefined) {
        cache.set(normalized, translated);
        return translated;
      }
      return undefined;
    }

    function requestLive(sourceText, apply) {
      if (!translateMissing) return;
      const normalized = normalize(sourceText);
      if (!normalized || pending.has(normalized)) return;
      pending.add(normalized);
      Promise.resolve(translateMissing(normalized, options.locale))
        .then((result) => {
          if (typeof result === "string" && result) {
            cache.set(normalized, result);
            apply(result);
          }
        })
        .catch(() => {})
        .finally(() => pending.delete(normalized));
    }

    function translateTextNode(node) {
      const raw = node.nodeValue;
      if (!raw || !raw.trim()) return;
      const translated = lookup(raw);
      if (translated !== undefined) {
        if (node.nodeValue !== translated) node.nodeValue = raw.replace(raw.trim(), translated);
        return;
      }
      requestLive(raw, (result) => {
        node.nodeValue = raw.replace(raw.trim(), result);
      });
    }

    function translateAttributes(el) {
      for (const attr of TRANSLATABLE_ATTRS) {
        if (!el.hasAttribute(attr)) continue;
        const value = el.getAttribute(attr);
        const translated = lookup(value);
        if (translated !== undefined) {
          if (value !== translated) el.setAttribute(attr, translated);
        } else {
          requestLive(value, (result) => el.setAttribute(attr, result));
        }
      }
    }

    function applyDataHKeyed(root) {
      const scope = root && root.querySelectorAll ? root : document;
      for (const el of scope.querySelectorAll("[data-h]")) {
        const key = el.getAttribute("data-h");
        const translated = key ? dict[key] : undefined;
        if (translated === undefined) continue;
        if (el.hasAttribute("placeholder")) el.setAttribute("placeholder", translated);
        else if (el.hasAttribute("alt")) el.setAttribute("alt", translated);
        else el.textContent = translated;
      }
    }

    function walk(root) {
      const node = root && root.nodeType ? root : document.body;
      if (!node) return;

      if (node.nodeType === Node.TEXT_NODE) {
        translateTextNode(node);
        return;
      }
      if (node.nodeType !== Node.ELEMENT_NODE && node.nodeType !== Node.DOCUMENT_NODE) return;

      const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
      let current = walker.currentNode;
      while (current) {
        if (current.nodeType === Node.TEXT_NODE) {
          // Skip script/style content.
          const parentTag = current.parentNode && current.parentNode.nodeName;
          if (parentTag !== "SCRIPT" && parentTag !== "STYLE") translateTextNode(current);
        } else if (current.nodeType === Node.ELEMENT_NODE) {
          translateAttributes(current);
        }
        current = walker.nextNode();
      }
    }

    function applyAll() {
      applyDataHKeyed(document);
      walk(document.body);
    }

    let observer = null;
    function observe() {
      if (observer || typeof MutationObserver === "undefined") return;
      let scheduled = false;
      // Accumulate every delivered batch. Records delivered while a flush is
      // pending must NOT be dropped: in high-frequency-mutation apps (e.g. a
      // canvas game updating its HUD every frame) the one-shot mutation that
      // sets a dynamic, translatable string can arrive in any batch, and
      // dropping it would leave that text permanently untranslated.
      let queued = [];
      const flush = () => {
        scheduled = false;
        const batch = queued;
        queued = [];
        for (const m of batch) {
          for (const added of m.addedNodes) walk(added);
          if (m.type === "characterData") translateTextNode(m.target);
          if (m.type === "attributes" && m.target.nodeType === Node.ELEMENT_NODE) {
            translateAttributes(m.target);
          }
        }
      };
      observer = new MutationObserver((mutations) => {
        for (const m of mutations) queued.push(m);
        if (scheduled) return;
        scheduled = true;
        requestAnimationFrame(flush);
      });
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: true,
        attributeFilter: TRANSLATABLE_ATTRS,
      });
    }

    function disconnect() {
      if (observer) observer.disconnect();
      observer = null;
    }

    return { applyAll, observe, disconnect };
  }

  window.Hedgeling = {
    async init(options) {
      options = options || {};
      const bundleUrl = options.bundleUrl || "/hedgeling-bundle.json";
      const sourceKeyMapUrl = options.sourceKeyMapUrl || "/hedgeling-source-key-map.json";
      const locale = options.locale || detectLocale();

      const bundle = await loadJson(bundleUrl);
      let sourceKeyMap = { bySource: {} };
      try {
        sourceKeyMap = await loadJson(sourceKeyMapUrl);
      } catch {
        // Source key map is optional; data-h keyed elements still work without it.
      }

      const injector = createInjector({
        dict: bundle[locale] || {},
        sourceKeyMap,
        locale,
        translateMissing: options.translateMissing,
      });

      const run = () => {
        injector.applyAll();
        if (options.observe !== false) injector.observe();
      };
      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", run, { once: true });
      } else {
        run();
      }
      return injector;
    },
  };
})();

