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

  // Spec 13: gettext msgctxt separator used for context-split keys
  // ("Open\u0004button"). The source-key map may contain contextual entries;
  // shape is inferred from the owning element and the contextual key is tried
  // before the plain key (which always exists — it maps to the majority-shape
  // translation).
  const CONTEXT_SEPARATOR = "\u0004";

  // Tag → shape mapping (mirror of shapeForTemplateTag for the tags the shape
  // model distinguishes; everything else is body).
  const TAG_SHAPES = {
    BUTTON: "button",
    A: "link",
    LABEL: "label",
    H1: "header", H2: "header", H3: "header", H4: "header", H5: "header", H6: "header",
  };

  // Attribute → shape mapping (mirror of the extraction attrShapes).
  const ATTR_SHAPES = {
    placeholder: "placeholder",
    title: "tooltip",
    "aria-label": "label",
    alt: "label",
  };

  function shapeForElement(el) {
    if (!el || el.nodeType !== 1 || !el.nodeName) return undefined;
    // Mirror shapeForTemplateTag fully: tags outside TAG_SHAPES carry the
    // DEFAULT "body" shape (extraction's fallback shape), so split body
    // translations are reachable. Safe for unsplit sources: the contextual
    // lookup misses and falls through to the plain key.
    return TAG_SHAPES[String(el.nodeName).toUpperCase()] || "body";
  }

  // Split a loaded bySource map into plain entries and contextual entries
  // (source -> { context: key }).
  function splitContextEntries(bySource) {
    const plain = {};
    const contextual = {};
    for (const [source, key] of Object.entries(bySource || {})) {
      const idx = source.indexOf(CONTEXT_SEPARATOR);
      if (idx === -1) {
        plain[source] = key;
      } else {
        const plainSource = source.slice(0, idx);
        const context = source.slice(idx + 1);
        if (!contextual[plainSource]) contextual[plainSource] = {};
        contextual[plainSource][context] = key;
      }
    }
    return { plain, contextual };
  }

  function normalize(text) {
    return String(text == null ? "" : text)
      .replace(/\s+/g, " ")
      .trim();
  }

  function buildPatternIndex(bySource) {
    const patterns = [];
    const placeholderRegex = /\{[A-Za-z0-9_]+\}/g;

    for (const [rawSource, key] of Object.entries(bySource)) {
      // Spec 13: contextual entries carry their context on the record; they
      // participate only when the caller's inferred shape matches.
      const sepIdx = rawSource.indexOf(CONTEXT_SEPARATOR);
      const source = sepIdx === -1 ? rawSource : rawSource.slice(0, sepIdx);
      const context = sepIdx === -1 ? undefined : rawSource.slice(sepIdx + 1);
      // A global regex is stateful: lastIndex survives across .test() calls, and
      // the skip paths below leave it mid-string. Reset per entry or later
      // entries are silently dropped.
      placeholderRegex.lastIndex = 0;
      if (!placeholderRegex.test(source)) continue;

      // Skip ICU arguments with commas (plural/select/number format).
      if (/\{[A-Za-z0-9_]+\s*,/.test(source)) continue;

      // Skip sources where two placeholders are separated only by whitespace.
      const segments = source.split(placeholderRegex);
      let hasAdjacentPlaceholders = false;
      for (let i = 1; i < segments.length - 1; i++) {
        if (!/\S/.test(segments[i])) {
          hasAdjacentPlaceholders = true;
          break;
        }
      }
      if (hasAdjacentPlaceholders) continue;

      // Build regex: escape literal segments, replace placeholders with captures.
      let regexStr = "^";
      const names = [];
      let placeholderIndex = 0;
      let lastIndex = 0;
      let match;

      placeholderRegex.lastIndex = 0;
      while ((match = placeholderRegex.exec(source)) !== null) {
        const literal = source.slice(lastIndex, match.index);
        regexStr += literal.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        // Word-boundary guard: when a placeholder butts directly against a
        // letter in the adjacent literal (e.g. "{seconds}s"), the capture must
        // not split a word. Without this, "^([\s\S]+?)s$" matches ANY text
        // ending in "s" ("grass" -> capture "gras" + literal "s") and the
        // injector rewrites unrelated DOM text through the translation
        // template (observed live: "GRASS" -> "GRAS S"). Values like "30s"
        // still match because "0" + "s" is not a letter-letter seam.
        const prevChar = match.index > 0 ? source[match.index - 1] : "";
        const nextChar = source[placeholderRegex.lastIndex] || "";
        const letterRe = /\p{L}/u;
        const head = letterRe.test(prevChar) ? "[^\\p{L}]" : "[\\s\\S]";
        if (letterRe.test(nextChar)) {
          regexStr += "(" + head + "[\\s\\S]*?[^\\p{L}]|[^\\p{L}])";
        } else {
          regexStr += "(" + head + "[\\s\\S]*?)";
        }
        names.push(match[0].slice(1, -1));
        lastIndex = placeholderRegex.lastIndex;
        placeholderIndex++;
      }
      regexStr += source.slice(lastIndex).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      regexStr += "$";

      // Anchor optimization: longest literal segment >= 3 chars.
      let anchor = null;
      for (const seg of segments) {
        const trimmed = seg.trim();
        if (trimmed.length >= 3 && (!anchor || trimmed.length > anchor.length)) {
          anchor = trimmed;
        }
      }

      patterns.push({ key, source, regex: new RegExp(regexStr, "u"), names, anchor, context });
    }

    // Contextual records first so a matching inferred shape wins over the
    // plain (majority) record; context-free callers skip them entirely.
    patterns.sort((a, b) => (a.context ? 0 : 1) - (b.context ? 0 : 1));
    return patterns;
  }

  // Build rich pattern index for messages with <n> tags (rich messages).
  function buildRichPatternIndex(bySource) {
    const richPatterns = [];
    const tagRegex = /<(\d+)>([^<]*)<\/\1>/g;

    for (const [source, key] of Object.entries(bySource)) {
      // Spec 13: contextual entries are skipped here — the plain (majority)
      // sibling always exists in bySource and covers rich matching.
      if (source.indexOf(CONTEXT_SEPARATOR) !== -1) continue;
      tagRegex.lastIndex = 0;
      if (!tagRegex.test(source)) continue;

      // Extract the structure: text runs and tag positions
      const structure = [];
      let lastIndex = 0;
      let match;
      tagRegex.lastIndex = 0;

      while ((match = tagRegex.exec(source)) !== null) {
        const textBefore = source.slice(lastIndex, match.index);
        const normalized = normalize(textBefore);
        if (normalized) structure.push({ type: 'text', value: normalized });
        structure.push({ type: 'tag', index: parseInt(match[1], 10), text: normalize(match[2]) });
        lastIndex = tagRegex.lastIndex;
      }
      const textAfter = source.slice(lastIndex);
      const normalizedAfter = normalize(textAfter);
      if (normalizedAfter) structure.push({ type: 'text', value: normalizedAfter });

      richPatterns.push({ key, source, structure });
    }

    return richPatterns;
  }

  // Shared ICU plural message parser using balanced-brace walker.
  // Returns { argName, categories } where categories is [{ type: 'exact', value, body } | { type: 'category', name, body }].
  // Returns null if the message is not a valid ICU plural message.
  function parseIcuPluralMessage(message) {
    const pluralRegex = /\{([a-zA-Z0-9_]+)\s*,\s*plural\s*,/i;
    const pluralMatch = pluralRegex.exec(message);
    if (!pluralMatch) return null;

    const argName = pluralMatch[1];
    const categories = [];

    // Parse categories with balanced brace handling (not flat [^}]*)
    let idx = pluralMatch.index + pluralMatch[0].length;
    const len = message.length;

    while (idx < len) {
      // Skip whitespace
      while (idx < len && /\s/.test(message[idx])) idx++;
      if (idx >= len) break;

      // Parse selector: =N or category name
      let selector = '';
      let isExact = false;
      if (message[idx] === '=') {
        isExact = true;
        idx++;
        while (idx < len && /\d/.test(message[idx])) selector += message[idx++];
      } else {
        while (idx < len && /\w/.test(message[idx])) selector += message[idx++];
      }

      // Skip whitespace before '{'
      while (idx < len && /\s/.test(message[idx])) idx++;
      if (idx >= len || message[idx] !== '{') break;
      idx++;

      // Parse body with balanced braces
      let body = '';
      let depth = 1;
      while (idx < len && depth > 0) {
        const ch = message[idx++];
        if (ch === '{') depth++;
        else if (ch === '}') depth--;
        if (depth > 0) body += ch;
      }

      // Add to categories
      if (selector) {
        if (isExact) {
          categories.push({ type: 'exact', value: parseInt(selector, 10), body });
        } else {
          categories.push({ type: 'category', name: selector, body });
        }
      }

      // Skip whitespace before next selector or end
      while (idx < len && /\s/.test(message[idx])) idx++;
    }

    return { argName, categories };
  }

  // Build plural pattern index for ICU plural messages.
  // Expands source-locale categories into match patterns with # as numeric placeholder.
  // Skips messages with nested braces or offset: (documented limitation).
  function buildPluralPatternIndex(bySource) {
    const pluralPatterns = [];

    for (const [source, key] of Object.entries(bySource)) {
      // Spec 13: contextual entries are skipped here — the plain (majority)
      // sibling always exists in bySource and covers plural matching.
      if (source.indexOf(CONTEXT_SEPARATOR) !== -1) continue;
      // Skip messages with nested braces or offset: (documented limitation)
      let braceDepth = 0;
      let hasNestedBraces = false;
      for (const c of source) {
        if (c === '{') braceDepth++;
        if (c === '}') braceDepth--;
        if (braceDepth > 2) {
          hasNestedBraces = true;
          break;
        }
      }
      if (hasNestedBraces || source.includes('offset:')) continue;

      // Use shared parser to extract categories
      const parsed = parseIcuPluralMessage(source);
      if (!parsed) continue;

      const { argName, categories } = parsed;

      // Compile category patterns with # as numeric placeholder
      const categoryPatterns = [];
      for (const cat of categories) {
        const body = cat.body;
        // Replace the argument name with # for pattern matching
        const pattern = body.replace(new RegExp(`\\{${argName}\\}`, 'g'), '#').trim();
        if (pattern) {
          // Escape regex metacharacters in the pattern
          const escapedPattern = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          // Precompile regex at index-build time
          // P2-2: allow multi-group separators ("1,234,567") — repeat the group.
          const regexStr = escapedPattern.replace(/#/g, '(\\d+(?:[.,]\\d+)*)');
          const regex = new RegExp(`^${regexStr}$`);
          if (cat.type === 'exact') {
            categoryPatterns.push({ type: 'exact', value: cat.value, pattern, regex });
          } else if (cat.type === 'category') {
            categoryPatterns.push({ type: 'category', name: cat.name, pattern, regex });
          }
        }
      }

      if (categoryPatterns.length > 0) {
        pluralPatterns.push({ key, source, argName, categoryPatterns });
      }
    }

    return pluralPatterns;
  }

  // Decide how to treat a text value on (re)visit. `current` is what is in
  // the DOM now, `original` what we first recorded, `applied` what we last
  // wrote. Returns { original } - the source text to translate - updating
  // semantics: if the DOM changed under us (current !== applied), the app
  // rendered NEW source text and it becomes the new original.
  function resolveSource(current, original, applied) {
    if (original === undefined) return { original: current, external: true };
    if (applied !== undefined && current !== applied) return { original: current, external: true };
    return { original, external: false };
  }

  // RTL base languages (BCP47 primary subtags). Kept deliberately small and
  // explicit; extend as locales are actually shipped.
  const RTL_LANGS = new Set(["ar", "he", "fa", "ur", "ps", "sd", "ug", "ckb", "dv", "yi"]);
  function isRtlLocale(locale) {
    return RTL_LANGS.has(String(locale || "").toLowerCase().split("-")[0]);
  }

  function pseudoize(text) {
    // Split on placeholders, keeping delimiters.
    const segments = text.split(/(\{[A-Za-z0-9_]+\})/);
    let result = "";
    let visibleLength = 0;

    for (const seg of segments) {
      if (/^\{[A-Za-z0-9_]+\}$/.test(seg)) {
        // Placeholder: pass through unchanged.
        result += seg;
      } else {
        // Literal segment: apply accent mapping.
        const accentMap = {
          a: "á", e: "é", i: "í", o: "ó", u: "ú", y: "ý", c: "ç", n: "ñ",
          A: "Á", E: "É", I: "Í", O: "Ó", U: "Ú", Y: "Ý", C: "Ç", N: "Ñ",
        };
        let accented = "";
        for (const ch of seg) {
          accented += accentMap[ch] || ch;
        }
        result += accented;
        visibleLength += seg.length;
      }
    }

    // Wrap in brackets and add padding.
    const padding = "·".repeat(Math.ceil(visibleLength * 0.3));
    return `⟦${result}${padding}⟧`;
  }

  function matchInterpolated(normalizedText, patternIndex, dict, context) {
    for (const record of patternIndex) {
      // Contextual records only match when the inferred shape agrees.
      if (record.context && record.context !== context) continue;
      if (record.anchor && !normalizedText.includes(record.anchor)) continue;

      const match = record.regex.exec(normalizedText);
      if (!match) continue;

      let template = dict[record.key];
      if (template === undefined) continue;

      // P0-1: Detect ICU-plural translations and delegate to plural-body rendering
      // instead of returning the raw ICU string to the DOM.
      const pluralRegex = /\{([a-zA-Z0-9_]+)\s*,\s*plural\s*,/i;
      const pluralMatch = pluralRegex.exec(template);
      if (pluralMatch) {
        // This is an ICU-plural translation - don't return raw, let matchNonIcuPluralText handle it
        return undefined;
      }

      // Substitute placeholders with captured values.
      let result = template;
      for (let i = 0; i < record.names.length; i++) {
        const name = record.names[i];
        const captured = match[i + 1];
        result = result.split("{" + name + "}").join(captured);
      }

      return result;
    }

    return undefined;
  }

  // Internal rich matcher that can see through per-segment translations.
  // Returns { key, template } or undefined. getText defaults to (node) => node.nodeValue.
  function matchRichRecord(element, richPatternIndex, dict, getText) {
    if (!element || !element.childNodes) return undefined;
    if (getText === undefined) getText = (node) => node.nodeValue;

    function collectElementText(node) {
      if (!node || !node.childNodes) return "";
      let out = "";
      for (const child of node.childNodes) {
        if (child.nodeType === 3) out += getText(child) || "";
        else if (child.nodeType === 1) out += collectElementText(child);
      }
      return normalize(out);
    }

    // Serialize the element's child structure
    const childStructure = [];
    for (const child of element.childNodes) {
      if (child.nodeType === 3) { // TEXT_NODE
        const text = normalize(getText(child));
        if (text) childStructure.push({ type: 'text', value: text });
      } else if (child.nodeType === 1) { // ELEMENT_NODE
        childStructure.push({ type: 'tag', index: childStructure.filter(s => s.type === 'tag').length, text: collectElementText(child) });
      }
    }

    // Try to match against rich patterns
    for (const record of richPatternIndex) {
      if (record.structure.length !== childStructure.length) continue;

      let match = true;
      for (let i = 0; i < record.structure.length; i++) {
        const expected = record.structure[i];
        const actual = childStructure[i];
        if (expected.type !== actual.type) {
          match = false;
          break;
        }
        if (expected.type === 'text' && expected.value !== actual.value) {
          match = false;
          break;
        }
        if (expected.type === 'tag' && expected.text && expected.text !== actual.text) {
          match = false;
          break;
        }
        // Tag indices must match in sequence
      }

      if (match) {
        const template = dict[record.key];
        if (template !== undefined) {
          return { key: record.key, template };
        }
      }
    }

    return undefined;
  }

  // Match rich messages with <n> tags against DOM structure.
  // Returns the translated message or undefined if no match.
  function matchRichMessage(element, richPatternIndex, dict) {
    return matchRichRecord(element, richPatternIndex, dict)?.template;
  }

  // Match plural text (e.g., "3 items") against ICU plural source patterns.
  // Returns the translated message or undefined if no match.
  // P2-3: Uses precompiled regex from index, caches PluralRules.
  const pluralRulesCache = new Map(); // locale -> Intl.PluralRules
  function getPluralRules(locale) {
    if (!pluralRulesCache.has(locale)) {
      pluralRulesCache.set(locale, new Intl.PluralRules(locale, { type: 'cardinal' }));
    }
    return pluralRulesCache.get(locale);
  }

  // Match non-ICU source patterns (e.g., "{count} files") with ICU-plural translations.
  // Spec 12b Phase D: handles automatic plural expansion from non-ICU sources.
  // P1-4: Precompile plural category index for each ICU-plural translation
  // P0-2 round-2 fix: content-address by template string (not key) to avoid locale-switch cache poisoning
  const pluralCategoryIndexCache = new Map(); // template -> { argName, categories: [{type, value/name, body}], allNames }

  function buildPluralCategoryIndex(template, key) {
    if (pluralCategoryIndexCache.has(template)) return pluralCategoryIndexCache.get(template);

    // Use shared parser to extract categories
    const parsed = parseIcuPluralMessage(template);
    if (!parsed) return null;

    const { argName, categories } = parsed;
    const index = { argName, categories };
    pluralCategoryIndexCache.set(template, index);
    return index;
  }

  function matchNonIcuPluralText(normalizedText, patternIndex, dict, locale, sourceLocale, context) {
    for (const record of patternIndex) {
      // Contextual records only match when the inferred shape agrees.
      if (record.context && record.context !== context) continue;
      if (record.anchor && !normalizedText.includes(record.anchor)) continue;

      const match = record.regex.exec(normalizedText);
      if (!match) continue;

      let template = dict[record.key];
      if (template === undefined) continue;

      // P1-4: Use precompiled category index
      const index = buildPluralCategoryIndex(template, record.key);
      if (!index) continue;

      const { argName, categories } = index;

      // Extract the number from the captured placeholder
      let numStr = null;
      for (let i = 0; i < record.names.length; i++) {
        if (record.names[i] === argName) {
          numStr = match[i + 1];
          break;
        }
      }
      if (!numStr) continue;

      // Parse the number (handle thousands separators based on source locale)
      if (getDecimalSeparator(sourceLocale) === ',') {
        numStr = numStr.replace(/\./g, '');
        numStr = numStr.replace(/,/g, '.');
      } else {
        numStr = numStr.replace(/,/g, '');
      }
      const number = parseFloat(numStr);
      if (isNaN(number)) continue;

      // Resolve target category: =N exact first, then PluralRules, then 'other'
      let targetBody = null;
      const exactMatch = categories.find(c => c.type === 'exact' && c.value === number);
      if (exactMatch) {
        targetBody = exactMatch.body;
      } else {
        let targetCategory = 'other';
        try {
          const pluralRules = getPluralRules(locale);
          targetCategory = pluralRules.select(number);
        } catch (e) {
          // Fallback to 'other' if locale is invalid
        }
        const catMatch = categories.find(c => c.type === 'category' && c.name === targetCategory);
        if (catMatch) {
          targetBody = catMatch.body;
        } else {
          const otherMatch = categories.find(c => c.type === 'category' && c.name === 'other');
          if (otherMatch) {
            targetBody = otherMatch.body;
          }
        }
      }

      if (!targetBody) continue;

      // P1-1 round-2 fix: marker dance ONCE around the # substitution, not per-name loop
      // Skip quoted '#' (ICU escaping: '#' inside quotes is literal)
      const quotedHashMarker = '\uE000'; // Private use character
      let result = targetBody.replace(/'#'/g, quotedHashMarker);

      // P1-4: Substitute all captured placeholders, not just the count
      for (let i = 0; i < record.names.length; i++) {
        const name = record.names[i];
        const captured = match[i + 1];
        if (captured !== undefined) {
          result = result.split(`{${name}}`).join(captured);
        }
      }

      // Substitute # with formatted number (quoted '#' is protected by marker)
      result = result.replace(/#/g, number.toLocaleString(locale));
      // Restore marker to literal '#' (apostrophes consumed per ICU)
      result = result.replace(new RegExp(quotedHashMarker, 'g'), '#');
      return result;
    }

    return undefined;
  }

  // P2-3: derive the decimal separator per source locale from Intl.NumberFormat
  // (cached), so nl-NL/pl-PL/sv-SE/uk-UA/it-IT/pt-BR sources parse correctly.
  // Falls back to a prefix list only when formatToParts is unavailable.
  const decimalSepCache = new Map(); // locale -> ',' or '.'
  function getDecimalSeparator(locale) {
    if (decimalSepCache.has(locale)) return decimalSepCache.get(locale);
    let sep = '.';
    try {
      const nf = new Intl.NumberFormat(locale);
      if (typeof nf.formatToParts === 'function') {
        const part = nf.formatToParts(1.1).find((p) => p.type === 'decimal');
        if (part) sep = part.value;
      } else if (/^(de|fr|es|ru|nl|pl|sv|uk|it|pt)\b/i.test(locale)) {
        sep = ',';
      }
    } catch (e) {
      sep = '.';
    }
    decimalSepCache.set(locale, sep);
    return sep;
  }

  function matchPluralText(normalizedText, pluralPatternIndex, dict, locale, sourceLocale) {
    for (const record of pluralPatternIndex) {
      const { key, source, argName, categoryPatterns } = record;

      // Try to match against each category pattern using precompiled regex
      for (const { type, value, name, pattern, regex } of categoryPatterns) {
        const match = normalizedText.match(regex);

        if (match) {
          // Extract number if pattern contains # (numeric capture)
          // P2-2: Strip thousands separators based on SOURCE locale, not target locale
          let numStr = match[1] || "";
          if (numStr) {
            // P2-3: decimal separator derived from the SOURCE locale via Intl.
            if (getDecimalSeparator(sourceLocale) === ',') {
              // Comma-decimal: 1.234,56 -> remove dots (thousands), comma -> dot
              numStr = numStr.replace(/\./g, '');
              numStr = numStr.replace(/,/g, '.');
            } else {
              // Dot-decimal: 1,234.56 -> remove commas (thousands), keep period
              numStr = numStr.replace(/,/g, '');
            }
          }
          const number = numStr ? parseFloat(numStr) : null;
          if (match[1] && isNaN(number)) continue;

          // Get the translation for this key
          const translated = dict[key];
          if (!translated) continue;

          // P2-4: Skip translations with nested braces (symmetric with source-side limitation)
          let braceDepth = 0;
          let hasNestedBraces = false;
          for (const c of translated) {
            if (c === '{') braceDepth++;
            if (c === '}') braceDepth--;
            if (braceDepth > 2) {
              hasNestedBraces = true;
              break;
            }
          }
          if (hasNestedBraces) continue;

          // Parse the translation to extract its categories using shared parser
          const parsedTranslation = parseIcuPluralMessage(translated);
          if (!parsedTranslation) continue;
          const translationCategories = parsedTranslation.categories;

          // Resolve target category: =N exact first, then PluralRules, then 'other'
          let targetBody = null;
          
          // If source pattern has no # (exact literal match), use the matching category directly
          if (number === null) {
            // Use the category that matched in the source
            if (type === 'exact') {
              const exactMatch = translationCategories.find(c => c.type === 'exact' && c.value === value);
              if (exactMatch) targetBody = exactMatch.body;
            } else if (type === 'category') {
              const catMatch = translationCategories.find(c => c.type === 'category' && c.name === name);
              if (catMatch) targetBody = catMatch.body;
            }
            // P2-1: Fall back to 'other' if the matched category is not in the translation
            if (!targetBody) {
              const otherMatch = translationCategories.find(c => c.type === 'category' && c.name === 'other');
              if (otherMatch) targetBody = otherMatch.body;
            }
          } else {
            // Check for exact =N match first
            const exactMatch = translationCategories.find(c => c.type === 'exact' && c.value === number);
            if (exactMatch) {
              targetBody = exactMatch.body;
            } else {
              // Resolve using cached Intl.PluralRules
              let targetCategory = 'other';
              try {
                const pluralRules = getPluralRules(locale);
                targetCategory = pluralRules.select(number);
              } catch (e) {
                // Fallback to 'other' if locale is invalid
              }

              // Find the category in the translation
              const catMatch = translationCategories.find(c => c.type === 'category' && c.name === targetCategory);
              if (catMatch) {
                targetBody = catMatch.body;
              } else {
                // Fallback to 'other' if resolved category not found
                const otherMatch = translationCategories.find(c => c.type === 'category' && c.name === 'other');
                if (otherMatch) {
                  targetBody = otherMatch.body;
                }
              }
            }
          }

          if (!targetBody) continue;

          // Substitute the number into the translated pattern if present. When the
          // source pattern matched an exact literal (=N, no # captured), the value
          // IS known — substitute it so a literal '#' never reaches the DOM (P2-1).
          // Only category patterns with no number keep the raw body.
          const knownNumber = number !== null ? number : (type === 'exact' ? value : null);
          const result = knownNumber !== null ? targetBody.replace(/#/g, knownNumber.toLocaleString(locale)) : targetBody;
          return result;
        }
      }
    }

    return undefined;
  }

  async function loadJson(url) {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
    return await res.json();
  }

  // Spec 18: persisted formats carry a top-level integer `schemaVersion`.
  // The injector must never white-screen a page over a version skew: a
  // newer-than-supported document logs a warning and is read best-effort.
  // The field is stripped so it is never mistaken for a locale entry.
  const SUPPORTED_SCHEMA_VERSION = 1;
  function sanitizeVersionedDoc(doc, label) {
    if (!doc || typeof doc !== "object" || Array.isArray(doc)) return doc;
    if (!("schemaVersion" in doc)) return doc;
    const version = doc.schemaVersion;
    if (typeof version === "number" && version > SUPPORTED_SCHEMA_VERSION) {
      console.warn(
        `Hedgeling: ${label} schemaVersion ${version} is newer than this injector supports (max ${SUPPORTED_SCHEMA_VERSION}) — reading best-effort. Update hedgeling-injector.js.`,
      );
    }
    const copy = {};
    for (const key of Object.keys(doc)) {
      if (key !== "schemaVersion") copy[key] = doc[key];
    }
    return copy;
  }

  function detectLocale() {
    const htmlLang = document.documentElement.getAttribute("lang");
    return htmlLang || navigator.language || "en-US";
  }

  // 1.0 resolution contract: exact locale -> progressively more generic
  // locale -> source text. Derived from the BCP47 tag by stripping subtags
  // from the right: "zh-Hans-CN" -> ["zh-Hans-CN", "zh-Hans", "zh"].
  function localeChain(locale) {
    const chain = [locale];
    let current = locale;
    for (;;) {
      const idx = current.lastIndexOf("-");
      if (idx <= 0) break;
      current = current.slice(0, idx);
      chain.push(current);
    }
    return chain;
  }

  // Effective dictionary for a locale: chain ancestors merged generic-first
  // so more specific entries win (fr-CA overrides fr overrides nothing).
  // Locale === sourceLocale keeps the historical empty dict (source text is
  // already in the DOM). Every matcher (plain, interpolated, rich, plural)
  // reads this one dict, so the whole injector inherits chain fallback.
  function resolveDict(bundle, locale, sourceLocale) {
    if (!bundle || locale === sourceLocale) return {};
    const merged = {};
    const chain = localeChain(locale);
    for (let i = chain.length - 1; i >= 0; i--) {
      const layer = chain[i] === sourceLocale ? undefined : bundle[chain[i]];
      if (layer) for (const key of Object.keys(layer)) merged[key] = layer[key];
    }
    return merged;
  }

  function createInjector(options) {
    const bundle = sanitizeVersionedDoc(options.bundle || {}, "bundle");
    let locale = options.locale || "en-US";
    const sourceLocale = options.sourceLocale || "en-US";
    const pseudo = options.pseudo || false;
    const initialChainDict = resolveDict(bundle, locale, sourceLocale);
    let dict = Object.keys(initialChainDict).length > 0 ? initialChainDict : options.dict || {};
    const sourceKeyMap = sanitizeVersionedDoc(options.sourceKeyMap || {}, "source key map");
    const rawBySource = (sourceKeyMap && sourceKeyMap.bySource) || {};
    // Spec 13: contextual keys indexed separately; plain lookups are untouched.
    const contextEntries = splitContextEntries(rawBySource);
    const bySource = contextEntries.plain;
    const contextualBySource = contextEntries.contextual;
    const translateMissing = typeof options.translateMissing === "function" ? options.translateMissing : null;
    // Cache of source-text -> translated (includes live-MT results).
    const cache = new Map();
    const pending = new Set();
    // Pattern index for interpolated text matching (locale-agnostic). Built
    // from the RAW map so contextual entries carry their context tags.
    const patterns = buildPatternIndex(rawBySource);
    // Rich pattern index for <n> tag messages (locale-agnostic).
    const richPatterns = buildRichPatternIndex(rawBySource);
    // Plural pattern index for ICU plural messages (locale-agnostic).
    const pluralPatterns = buildPluralPatternIndex(rawBySource);
    // In pseudo mode the "translation" of an interpolated source is its own
    // pseudoized form; precompute per pattern so lookup stays cheap.
    // Spec 20d: pseudo === "rtl" additionally wraps output in RIGHT-TO-LEFT
    // MARK characters (and forces dir="rtl" in applyAll) so teams can
    // smoke-test RTL layout without a real RTL locale.
    const pseudoizeText = (text) =>
      pseudo === "rtl" ? "\u200F" + pseudoize(text) + "\u200F" : pseudoize(text);
    const pseudoDict = {};
    if (pseudo) {
      for (const p of patterns) pseudoDict[p.key] = pseudoizeText(p.source);
    }
    // Original-text bookkeeping for idempotent re-translation.
    const originalText = new WeakMap();
    const lastApplied = new WeakMap();
    const originalAttrs = new WeakMap();
    const lastAppliedAttrs = new WeakMap();
    // Title bookkeeping (plain variables, not WeakMap since there's only one).
    let titleOriginal, titleApplied;
    // Shadow roots discovered before observe() runs; drained when observe() attaches.
    const pendingShadowRoots = new Set();
    // Rich-applied marker WeakMap keyed by element to prevent per-segment content-match fighting rich rewrites.
    const richApplied = new WeakMap(); // WeakMap<element, {key, textNodes, slotElements, originalValues}>
    // Companion Set for iteration in setLocale (WeakMap cannot be iterated)
    const richAppliedElements = new Set();

    function lookup(sourceText, context) {
      const normalized = normalize(sourceText);
      if (!normalized) return undefined;
      // Cache is keyed by (text, context): the same text may resolve to
      // different translations under different inferred shapes.
      const cacheKey = context ? normalized + CONTEXT_SEPARATOR + context : normalized;
      if (cache.has(cacheKey)) return cache.get(cacheKey);

      // Pseudo mode: pseudoize catalogued strings; leave gaps visibly untouched.
      if (pseudo) {
        if (bySource[normalized] || (contextualBySource[normalized] !== undefined)) {
          const result = pseudoizeText(normalized);
          cache.set(cacheKey, result);
          return result;
        }
        // Interpolated sources: reverse-match the pattern, pseudoize the SOURCE
        // template (pseudo needs no bundle), then substitute captures. The
        // pseudo dict maps key -> pseudoized source so matchInterpolated's
        // normal substitution path applies unchanged (placeholders survive
        // pseudoize verbatim).
        if (normalized.length <= 500) {
          const match = matchInterpolated(normalized, patterns, pseudoDict, context);
          if (match !== undefined) {
            if (cache.size > 5000) cache.clear();
            cache.set(cacheKey, match);
            return match;
          }
        }
        return undefined;
      }

      // Spec 13: contextual key first (inferred shape), plain key fallback —
      // the plain key maps to the majority-shape translation for split sources.
      let translated;
      if (context) {
        const contextualKey = contextualBySource[normalized] && contextualBySource[normalized][context];
        translated = contextualKey ? dict[contextualKey] : undefined;
      }
      if (translated === undefined) {
        const key = bySource[normalized];
        translated = key ? dict[key] : undefined;
      }
      if (translated !== undefined) {
        cache.set(cacheKey, translated);
        return translated;
      }
      // Try interpolated pattern match for placeholder-containing sources.
      if (normalized.length <= 500) {
        const patternMatch = matchInterpolated(normalized, patterns, dict, context);
        if (patternMatch !== undefined) {
          // Dynamic values make each rendered variant a distinct cache entry.
          // Guard against unbounded cache growth by clearing at 5000 entries.
          if (cache.size > 5000) cache.clear();
          cache.set(cacheKey, patternMatch);
          return patternMatch;
        }
      }
      // Try non-ICU plural pattern match (spec 12b Phase D): non-ICU source with ICU-plural translation.
      if (normalized.length <= 500) {
        const nonIcuPluralMatch = matchNonIcuPluralText(normalized, patterns, dict, locale, sourceLocale, context);
        if (nonIcuPluralMatch !== undefined) {
          if (cache.size > 5000) cache.clear();
          cache.set(cacheKey, nonIcuPluralMatch);
          return nonIcuPluralMatch;
        }
      }
      // Try plural pattern match for ICU plural messages.
      if (normalized.length <= 500) {
        const pluralMatch = matchPluralText(normalized, pluralPatterns, dict, locale, sourceLocale);
        if (pluralMatch !== undefined) {
          if (cache.size > 5000) cache.clear();
          cache.set(cacheKey, pluralMatch);
          return pluralMatch;
        }
      }
      return undefined;
    }

    function requestLive(sourceText, apply) {
      // Disabled in pseudo mode.
      if (pseudo || !translateMissing) return;
      const normalized = normalize(sourceText);
      if (!normalized || pending.has(normalized)) return;
      pending.add(normalized);
      Promise.resolve(translateMissing(normalized, locale))
        .then((result) => {
          if (typeof result === "string" && result) {
            cache.set(normalized, result);
            apply(result);
          }
        })
        .catch(() => {})
        .finally(() => pending.delete(normalized));
    }

    // Check if a node is inside an opted-out subtree (translate="no" or data-hl-skip)
    function isOptedOut(node) {
      let current = node;
      // In Node (test environment), document may not be defined
      const doc = typeof document !== 'undefined' ? document : null;
      const docElement = doc ? doc.documentElement : null;
      while (current && current !== doc && current !== docElement) {
        if (current.nodeType === 1) { // ELEMENT_NODE
          const translateAttr = current.getAttribute ? current.getAttribute("translate") : null;
          const skipAttr = current.getAttribute ? current.getAttribute("data-hl-skip") : null;
          if (translateAttr === "no" || skipAttr !== null) {
            return true;
          }
        }
        // Defensive: check if parentNode exists (test mocks may not have it)
        if (!current.parentNode) break;
        current = current.parentNode;
      }
      return false;
    }

    function translateTextNode(node) {
      const current = node.nodeValue;
      if (!current || !current.trim()) return;
      
      // Skip if inside opted-out subtree
      if (isOptedOut(node)) return;
      
      // Skip if parent is rich-applied (marker to prevent per-segment fighting rich rewrite)
      if (node.parentNode && richApplied.has(node.parentNode)) return;
      
      const { original } = resolveSource(current, originalText.get(node), lastApplied.get(node));
      originalText.set(node, original);
      // Spec 13: infer the shape from the owning element so a <button>Open</button>
      // resolves the button-context key while <p>Open</p> resolves body/plain.
      const translated = lookup(original, shapeForElement(node.parentNode));
      if (translated !== undefined) {
        const replacement = original.replace(original.trim(), translated);
        if (current !== replacement) {
          node.nodeValue = replacement;
          lastApplied.set(node, replacement);
        }
        return;
      }
      // Restore on source-locale miss.
      if (locale === sourceLocale) {
        if (current !== original) {
          node.nodeValue = original;
          lastApplied.set(node, original);
        }
        return;
      }
      requestLive(original, (result) => {
        const replacement = original.replace(original.trim(), result);
        if (node.nodeValue !== replacement) {
          node.nodeValue = replacement;
          lastApplied.set(node, replacement);
        }
      });
    }

    function translateAttributes(el) {
      if (!originalAttrs.has(el)) originalAttrs.set(el, new Map());
      if (!lastAppliedAttrs.has(el)) lastAppliedAttrs.set(el, new Map());
      const origAttrMap = originalAttrs.get(el);
      const appliedAttrMap = lastAppliedAttrs.get(el);

      for (const attr of TRANSLATABLE_ATTRS) {
        if (!el.hasAttribute(attr)) continue;
        const current = el.getAttribute(attr);
        const { original } = resolveSource(current, origAttrMap.get(attr), appliedAttrMap.get(attr));
        origAttrMap.set(attr, original);
        // Spec 13: attribute name determines the shape context.
        const translated = lookup(original, ATTR_SHAPES[attr]);
        if (translated !== undefined) {
          if (current !== translated) {
            el.setAttribute(attr, translated);
            appliedAttrMap.set(attr, translated);
          }
        } else {
          // Restore on source-locale miss.
          if (locale === sourceLocale) {
            if (current !== original) {
              el.setAttribute(attr, original);
              appliedAttrMap.set(attr, original);
            }
          } else {
            requestLive(original, (result) => {
              if (el.getAttribute(attr) !== result) {
                el.setAttribute(attr, result);
                appliedAttrMap.set(attr, result);
              }
            });
          }
        }
      }
    }

    function translateRichElement(el) {
      if (!el || !el.childNodes) return;
      if (!richPatterns.length) return;

      // Skip if inside opted-out subtree
      if (isOptedOut(el)) return;

      // Match using resolveSource to see through per-segment translations
      const getText = (node) => node.nodeType === 3
        ? resolveSource(node.nodeValue, originalText.get(node), lastApplied.get(node)).original
        : node.nodeValue;
      const match = matchRichRecord(el, richPatterns, dict, getText);
      if (match === undefined) return;
      const { key: matchedKey, template: translated } = match;

      // Record source text in originalText before any mutation (for snapshot and restore)
      // For untranslated nodes, originalText is empty, so use current nodeValue
      for (const child of el.childNodes) {
        if (child.nodeType === 3) {
          const resolved = getText(child);
          // Only set if not already set (don't overwrite if per-segment was already translated)
          if (originalText.get(child) === undefined) {
            originalText.set(child, resolved);
          }
        } else if (child.nodeType === 1 && child.childNodes.length === 1 && child.childNodes[0].nodeType === 3) {
          const textChild = child.childNodes[0];
          const resolved = getText(textChild);
          if (originalText.get(textChild) === undefined) {
            originalText.set(textChild, resolved);
          }
        }
      }

      // Parse the translated message into parts
      const tagRegex = /<(\d+)>([^<]*)<\/\1>/g;
      const parts = [];
      let lastIndex = 0;
      let tagMatch;
      tagRegex.lastIndex = 0;
      while ((tagMatch = tagRegex.exec(translated)) !== null) {
        const textBefore = translated.slice(lastIndex, tagMatch.index);
        if (textBefore) parts.push({ type: 'text', value: textBefore });
        parts.push({ type: 'tag', index: parseInt(tagMatch[1], 10), inner: tagMatch[2] });
        lastIndex = tagRegex.lastIndex;
      }
      const textAfter = translated.slice(lastIndex);
      if (textAfter) parts.push({ type: 'text', value: textAfter });

      // Snapshot the element's current children and their original values
      // Capture original order BEFORE any mutation (bug 1)
      const originalChildren = Array.from(el.childNodes);
      const textNodes = [];
      const slotElements = {};
      const originalValues = [];
      const slotTextOriginals = []; // For bug 3: restore slot element inner text
      let slotIndex = 0;
      for (const child of el.childNodes) {
        if (child.nodeType === 3) { // TEXT_NODE
          textNodes.push(child);
          // Record RESOLVED SOURCE text (sees through per-segment translations
          // and picks up externally-rewritten source, unlike stale originalText)
          originalValues.push(getText(child));
        } else if (child.nodeType === 1) { // ELEMENT_NODE
          slotElements[slotIndex++] = child;
          // If element has exactly one text child, record its original value (bug 3)
          if (child.childNodes.length === 1 && child.childNodes[0].nodeType === 3) {
            const textChild = child.childNodes[0];
            slotTextOriginals.push({ node: textChild, value: getText(textChild) });
          }
        }
      }
      // Freeze snapshot arrays before mutation (bug 2)
      const frozenTextNodes = [...textNodes];
      const frozenOriginalValues = [...originalValues];
      const frozenSlotTextOriginals = [...slotTextOriginals];

      // Helper to update text with bookkeeping
      const updateText = (node, value) => {
        const current = node.nodeValue;
        const { original } = resolveSource(current, originalText.get(node), lastApplied.get(node));
        originalText.set(node, original);
        if (current !== value) {
          node.nodeValue = value;
          lastApplied.set(node, value);
        }
      };

      // Rebuild child list in parts order
      let textNodeIndex = 0;
      const newChildren = [];
      const createdTextNodes = []; // Local list for created nodes (bug 2)
      for (const part of parts) {
        if (part.type === 'text') {
          // Reuse existing text node if available, create new one if needed
          let textNode = frozenTextNodes[textNodeIndex];
          if (!textNode) {
            textNode = document.createTextNode('');
            createdTextNodes.push(textNode);
          }
          updateText(textNode, part.value);
          newChildren.push(textNode);
          textNodeIndex++;
        } else if (part.type === 'tag') {
          const slotEl = slotElements[part.index];
          if (slotEl) {
            // Move element into position
            newChildren.push(slotEl);
            // If element has exactly one text child, translate its inner text
            if (slotEl.childNodes.length === 1 && slotEl.childNodes[0].nodeType === 3) {
              updateText(slotEl.childNodes[0], part.inner);
            }
          }
        }
      }

      // Apply the new child order by DOM moves (unconditional - appendChild moves if already in tree)
      for (const child of newChildren) {
        el.appendChild(child);
      }
      // Remove any leftover children by identity (not by lastChild-popping)
      const newChildrenSet = new Set(newChildren);
      const toRemove = [];
      for (const child of el.childNodes) {
        if (!newChildrenSet.has(child)) {
          toRemove.push(child);
        }
      }
      for (const child of toRemove) {
        el.removeChild(child);
      }

      // Mark element as rich-applied with snapshot for setLocale re-apply
      richApplied.set(el, { key: matchedKey, textNodes: frozenTextNodes, slotElements, originalValues: frozenOriginalValues, originalChildren, slotTextOriginals: frozenSlotTextOriginals });
      richAppliedElements.add(el);
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
      const node = root && root.nodeType ? root : (typeof document !== "undefined" ? document.body : null);
      if (!node) return;

      // Node constants - use hardcoded values for Node.js compatibility
      const TEXT_NODE = 3;
      const ELEMENT_NODE = 1;
      const DOCUMENT_NODE = 9;

      if (node.nodeType === TEXT_NODE) {
        translateTextNode(node);
        return;
      }
      // 11 = DOCUMENT_FRAGMENT_NODE: shadow roots walk like elements.
      if (node.nodeType !== ELEMENT_NODE && node.nodeType !== DOCUMENT_NODE && node.nodeType !== 11) return;

      // Opt-out gate for the walk ROOT itself (and its ancestors): the TreeWalker
      // filter below never applies to the walk root, and the root's descendants
      // don't carry the attribute themselves, so without this gate an added
      // element with translate="no"/data-hl-skip (or inside such a subtree)
      // would be fully translated. Interior pruning stays in the filter.
      if (isOptedOut(node)) return;

      // In Node.js test environment, document might be mocked or NodeFilter unavailable
      if (typeof document === "undefined" || typeof document.createTreeWalker !== "function" || typeof NodeFilter === "undefined") {
        // Fallback for Node.js tests: manually walk the tree
        function walkRecursive(n) {
          if (!n) return;
          if (n.nodeType === TEXT_NODE) {
            const parentTag = n.parentNode && n.parentNode.nodeName;
            if (parentTag !== "SCRIPT" && parentTag !== "STYLE") translateTextNode(n);
          } else if (n.nodeType === ELEMENT_NODE) {
            const translateAttr = n.getAttribute ? n.getAttribute("translate") : null;
            const skipAttr = n.getAttribute ? n.getAttribute("data-hl-skip") : null;
            if (translateAttr === "no" || skipAttr !== null) {
              return; // Skip subtree
            }
            translateAttributes(n);
            if (n.shadowRoot) {
              walkRecursive(n.shadowRoot);
              applyDataHKeyed(n.shadowRoot);
              pendingShadowRoots.add(n.shadowRoot);
              observeRoot(n.shadowRoot);
            }
            if (n.childNodes) {
              for (const child of n.childNodes) {
                walkRecursive(child);
              }
            }
          }
        }
        walkRecursive(node);
        return;
      }

      const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, {
        acceptNode: function(node) {
          if (node.nodeType === TEXT_NODE) {
            // Skip script/style content.
            const parentTag = node.parentNode && node.parentNode.nodeName;
            if (parentTag === "SCRIPT" || parentTag === "STYLE") {
              return NodeFilter.FILTER_REJECT;
            }
            return NodeFilter.FILTER_ACCEPT;
          } else if (node.nodeType === ELEMENT_NODE) {
            // Skip subtrees marked with translate="no" or data-hl-skip
            const translateAttr = node.getAttribute("translate");
            const skipAttr = node.getAttribute("data-hl-skip");
            if (translateAttr === "no" || skipAttr !== null) {
              return NodeFilter.FILTER_REJECT; // Prune entire subtree
            }
            return NodeFilter.FILTER_ACCEPT;
          }
          return NodeFilter.FILTER_SKIP;
        }
      });
      
      let current = walker.currentNode;
      while (current) {
        if (current.nodeType === TEXT_NODE) {
          translateTextNode(current);
        } else if (current.nodeType === ELEMENT_NODE) {
          translateAttributes(current);
          // Try rich message translation for any element (structure match is the filter)
          translateRichElement(current);
          // Recurse into open shadow roots. Closed shadow roots are unreachable by design.
          if (current.shadowRoot) {
            walk(current.shadowRoot);
            applyDataHKeyed(current.shadowRoot);
            pendingShadowRoots.add(current.shadowRoot);
            observeRoot(current.shadowRoot);
          }
        }
        current = walker.nextNode();
      }
    }

    function applyAll() {
      applyDataHKeyed(document);
      walk(document.body);
      // Translate document.title using the same bookkeeping as text nodes.
      if (typeof document !== "undefined" && document.title) {
        const current = document.title;
        const { original } = resolveSource(current, titleOriginal, titleApplied);
        titleOriginal = original;
        const translated = lookup(original);
        if (translated !== undefined) {
          const replacement = original.replace(original.trim(), translated);
          if (current !== replacement) {
            document.title = replacement;
            titleApplied = replacement;
          }
        } else if (locale === sourceLocale) {
          if (current !== original) {
            document.title = original;
            titleApplied = original;
          }
        }
      }
      // Set lang/dir on documentElement unless opted out. Pseudo-RTL forces
      // dir="rtl" (spec 20d).
      if (typeof document !== "undefined" && options.manageDocumentLang !== false) {
        document.documentElement.lang = locale;
        document.documentElement.dir = pseudo === "rtl" || isRtlLocale(locale) ? "rtl" : "ltr";
      }
    }

    function setLocale(next) {
      locale = next;
      dict = resolveDict(bundle, next, sourceLocale);
      cache.clear();
      // Re-apply rich messages from original snapshots
      if (typeof document !== "undefined") {
        for (const el of richAppliedElements) {
          if (!el.parentNode) {
            // Element removed from document; drop it
            richAppliedElements.delete(el);
            continue;
          }
          const snapshot = richApplied.get(el);
          if (!snapshot) continue;

          // Restore original structure and text from snapshot
          const { textNodes, slotElements, originalValues, originalChildren, slotTextOriginals } = snapshot;

          // Apply original order from snapshot (bug 1 fix: use originalChildren, not current DOM)
          for (const child of originalChildren) {
            el.appendChild(child);
          }
          // Remove extras by identity
          const originalChildrenSet = new Set(originalChildren);
          const toRemove = [];
          for (const child of el.childNodes) {
            if (!originalChildrenSet.has(child)) {
              toRemove.push(child);
            }
          }
          for (const child of toRemove) {
            el.removeChild(child);
          }
          // Restore original text values (bug 2 fix: use frozen arrays)
          for (let i = 0; i < textNodes.length; i++) {
            if (textNodes[i] && originalValues[i] !== undefined) {
              textNodes[i].nodeValue = originalValues[i];
            }
          }
          // Restore slot element inner text (bug 3 fix)
          for (const entry of slotTextOriginals) {
            if (entry.node && entry.value !== undefined) {
              entry.node.nodeValue = entry.value;
            }
          }
          // Delete richApplied WeakMap entry (bug 4 fix)
          richApplied.delete(el);
        }
        // Clear the Set
        richAppliedElements.clear();
        applyAll();
      }
    }

    // One-way locale sync from the @hedgeling/i18n runtime store: the store's
    // setLocale dispatches "hedgeling:locale" on document. The injector's own
    // setLocale does NOT dispatch, so there is no feedback loop.
    function onLocaleEvent(e) {
      const next = e && e.detail && e.detail.locale;
      if (typeof next === "string" && next !== locale) setLocale(next);
    }
    if (typeof document !== "undefined" && typeof document.addEventListener === "function") {
      document.addEventListener("hedgeling:locale", onLocaleEvent);
    }

    let observer = null;
    let observedRoots = new WeakSet();
    function observeRoot(root) {
      // applyAll() can walk shadow roots before observe() has created the
      // observer (or when the host opts out with observe: false). Do NOT
      // mark the root observed in that case, so a later observe() attaches.
      if (!observer) return;
      if (observedRoots.has(root)) return;
      observedRoots.add(root);
      observer.observe(root, {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: true,
        attributeFilter: TRANSLATABLE_ATTRS,
      });
    }
    function observe() {
      if (observer || typeof MutationObserver === "undefined") return;
      let scheduled = false;
      // Accumulate every delivered batch. Records delivered while a flush is
      // pending must NOT be dropped: in high-frequency-mutation apps (e.g. a
      // canvas game updating its HUD every frame) the one-shot mutation that
      // sets a dynamic, translatable string can arrive in any batch, and
      // dropping it would leave that text permanently untranslated.
      let queued = [];
      // Observer feedback loop: our own writes fire characterData mutations.
      // On revisit current === applied, so resolveSource keeps the original
      // and the write is skipped (current === replacement). No loop.
      const flush = () => {
        scheduled = false;
        const batch = queued;
        queued = [];
        for (const m of batch) {
          for (const added of m.addedNodes) {
            // walk() gates opted-out roots itself (text nodes funnel through
            // translateTextNode -> isOptedOut, elements through the root gate).
            walk(added);
          }
          if (m.type === "characterData") {
            // Skip if target is inside opted-out subtree
            if (!isOptedOut(m.target)) translateTextNode(m.target);
          }
          if (m.type === "attributes" && m.target.nodeType === Node.ELEMENT_NODE && !isOptedOut(m.target)) {
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
      observeRoot(document.body);
      for (const root of pendingShadowRoots) observeRoot(root);
      pendingShadowRoots.clear();
    }

    function disconnect() {
      if (observer) observer.disconnect();
      observer = null;
      observedRoots = new WeakSet();
      if (typeof document !== "undefined" && typeof document.removeEventListener === "function") {
        document.removeEventListener("hedgeling:locale", onLocaleEvent);
      }
    }

    const result = { applyAll, observe, disconnect, setLocale };
    // Test-only surface: export translate functions when running in Node.
    if (typeof window === "undefined") {
      result.translateTextNode = translateTextNode;
      result.translateAttributes = translateAttributes;
      result.translateRichElement = translateRichElement;
      result.walk = walk;
    }
    return result;
  }

  // Node-only export so the pure matching logic is unit-testable; the
  // browser path is unaffected (module is undefined there).
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { normalize, buildPatternIndex, matchInterpolated, resolveSource, isRtlLocale, pseudoize, createInjector, buildRichPatternIndex, matchRichMessage, buildPluralPatternIndex, matchPluralText, matchNonIcuPluralText, sanitizeVersionedDoc, localeChain, resolveDict };
  }

  if (typeof window !== "undefined") {
    window.Hedgeling = {
      async init(options) {
        options = options || {};
        const bundleUrl = options.bundleUrl || "/hedgeling-bundle.json";
        const sourceKeyMapUrl = options.sourceKeyMapUrl || "/hedgeling-source-key-map.json";
        const locale = options.locale || detectLocale();

        // In pseudo mode, skip bundle fetch (not needed).
        let bundle = {};
        if (!options.pseudo) {
          try {
            bundle = await loadJson(bundleUrl);
          } catch (err) {
            // Failed bundle fetch must not kill the injector; data-h/pseudo/live-MT still useful.
            console.warn(`Hedgeling: failed to load bundle from ${bundleUrl}`, err);
            bundle = {};
          }
        }
        let sourceKeyMap = { bySource: {} };
        try {
          sourceKeyMap = await loadJson(sourceKeyMapUrl);
        } catch {
          // Source key map is optional; data-h keyed elements still work without it.
        }

        const injector = createInjector({
          bundle,
          locale,
          sourceLocale: options.sourceLocale,
          sourceKeyMap,
          translateMissing: options.translateMissing,
          pseudo: options.pseudo,
          manageDocumentLang: options.manageDocumentLang,
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
  }
})();
