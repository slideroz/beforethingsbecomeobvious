(() => {
  const prefersReducedMotion =
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const page = document.querySelector(".page");
  const sections = Array.from(document.querySelectorAll(".section"));

  if (!page || sections.length === 0) return;

  let currentIndex = 0;
  let trainTimer = null;

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const TYPEWRITER = {
    totalDurationMs: 1000,
    startDelayMs: 0,
    punctuationPauseMs: 0,
    punctuationChars: ".,!?;:",
  };
  const TYPE_INSTANT = false;
  const TYPE_PAUSE_PUNCT = 1;
  const TYPE_PAUSE_COMMA = 1;
  const TYPE_PAUSE_SPACE = 1;

  const typewriterMap = new Map();

  const collectTextNodes = (root) => {
    const nodes = [];
    const showText = (window.NodeFilter && window.NodeFilter.SHOW_TEXT) || 4;
    const walker = document.createTreeWalker(root, showText, null);
    let node = walker.nextNode();
    while (node) {
      const text = node.nodeValue || "";
      const parentEl = node.parentElement;
      let shouldSkip = false;
      if (parentEl) {
        if (parentEl.closest) {
          shouldSkip = Boolean(parentEl.closest(".no-typewriter"));
        } else {
          let el = parentEl;
          while (el) {
            if (el.classList && el.classList.contains("no-typewriter")) {
              shouldSkip = true;
              break;
            }
            el = el.parentElement;
          }
        }
      }
      if (!shouldSkip && text.trim().length > 0) {
        nodes.push({ node, text });
      }
      node = walker.nextNode();
    }
    return nodes;
  };

  const buildCharSpans = (content) => {
    const nodes = collectTextNodes(content);
    const chars = [];
    let isFirstText = true;

    nodes.forEach(({ node, text }) => {
      let normalized = text;
      if (isFirstText) {
        normalized = normalized.replace(/^\\s+/, "");
        isFirstText = false;
      }
      const frag = document.createDocumentFragment();
      const run = document.createElement("span");
      run.className = "tw-run";

      for (const char of normalized) {
        const span = document.createElement("span");
        span.className = "tw-char";
        span.textContent = char;
        run.appendChild(span);
        chars.push({ span, char });
      }

      frag.appendChild(run);
      node.parentNode.replaceChild(frag, node);
    });

    return chars;
  };

  const ensureTypewriterState = (content) => {
    if (typewriterMap.has(content)) {
      const existing = typewriterMap.get(content);
      if (!existing.chars || existing.chars.length === 0) {
        existing.chars = buildCharSpans(content);
      }
      return existing;
    }
    const state = {
      chars: buildCharSpans(content),
      timer: null,
      fallbackTimer: null,
      raf: null,
      typing: false,
    };
    typewriterMap.set(content, state);
    return state;
  };

  const ensureCursor = (content) => {
    let cursor = content.querySelector(".type-cursor");
    if (!cursor) {
      cursor = document.createElement("span");
      cursor.className = "type-cursor";
      cursor.setAttribute("aria-hidden", "true");
      content.appendChild(cursor);
    }
    return cursor;
  };

  const setCursorPosition = (content, cursor, x, y, height) => {
    cursor.style.transform = `translate(${x}px, ${y}px)`;
    cursor.style.height = `${height}px`;
  };

  const placeCursorAtSpan = (span, cursor, content, side = "after") => {
    const rect = span.getBoundingClientRect();
    const contentRect = content.getBoundingClientRect();
    const x =
      side === "before"
        ? rect.left - contentRect.left
        : rect.right - contentRect.left;
    const y = rect.top - contentRect.top;
    setCursorPosition(content, cursor, x, y, rect.height);
  };

  const placeCursorAtStart = (content, cursor) => {
    const lineHeight = parseFloat(getComputedStyle(content).lineHeight) || 24;
    setCursorPosition(content, cursor, 0, 0, lineHeight);
  };

  const updateCursorForContent = (content) => {
    const state = ensureTypewriterState(content);
    const cursor = ensureCursor(content);
    if (state.chars.length === 0) {
      placeCursorAtStart(content, cursor);
      return;
    }
    let lastVisible = null;
    state.chars.forEach(({ span }) => {
      if (span.classList.contains("is-visible")) {
        lastVisible = span;
      }
    });
    if (lastVisible) {
      placeCursorAtSpan(lastVisible, cursor, content, "after");
    } else {
      placeCursorAtSpan(state.chars[0].span, cursor, content, "before");
    }
  };

  const fitSectionContent = (section) => {
    const content = section.querySelector(".content");
    if (!content) return;
    const header = document.querySelector(".header");
    const bo = document.querySelector(".bo");
    const headerBottom = header ? header.getBoundingClientRect().bottom : 0;
    const footerTop = bo ? bo.getBoundingClientRect().top : window.innerHeight;
    const topLimit = headerBottom + 50;
    const bottomLimit = footerTop - 50;
    const minScale = 0.5;
    let low = minScale;
    let high = 1;

    const fits = (scale) => {
      document.documentElement.style.setProperty("--section-scale", scale);
      const rect = content.getBoundingClientRect();
      return rect.top >= topLimit && rect.bottom <= bottomLimit;
    };

    if (fits(1)) return 1;

    for (let i = 0; i < 8; i += 1) {
      const mid = (low + high) / 2;
      if (fits(mid)) {
        low = mid;
      } else {
        high = mid;
      }
    }
    return low;
  };

  const fitAllSections = () => {
    let scale = 1;
    sections.forEach((section) => {
      const s = fitSectionContent(section);
      if (typeof s === "number") scale = Math.min(scale, s);
    });
    document.documentElement.style.setProperty("--section-scale", scale);
  };

  const setAllVisible = (state, visible) => {
    state.chars.forEach(({ span }) => {
      span.classList.toggle("is-visible", visible);
    });
  };

  const stopTyping = (content, fillFull = true) => {
    const state = ensureTypewriterState(content);
    const cursor = ensureCursor(content);
    state.typing = false;
    if (state.timer !== null) {
      clearTimeout(state.timer);
      state.timer = null;
    }
    if (state.fallbackTimer !== null) {
      clearTimeout(state.fallbackTimer);
      state.fallbackTimer = null;
    }
    if (state.raf !== null) {
      cancelAnimationFrame(state.raf);
      state.raf = null;
    }
    if (fillFull) setAllVisible(state, true);
    cursor.classList.remove("is-typing");
    cursor.classList.remove("is-done");
    if (state.chars.length > 0) {
      placeCursorAtSpan(
        state.chars[state.chars.length - 1].span,
        cursor,
        content,
        "after"
      );
    } else {
      placeCursorAtStart(content, cursor);
    }
  };

  const clearContent = (content) => {
    const state = ensureTypewriterState(content);
    const cursor = ensureCursor(content);
    if (state.timer !== null) {
      clearTimeout(state.timer);
      state.timer = null;
    }
    if (state.fallbackTimer !== null) {
      clearTimeout(state.fallbackTimer);
      state.fallbackTimer = null;
    }
    if (state.raf !== null) {
      cancelAnimationFrame(state.raf);
      state.raf = null;
    }
    state.typing = false;
    setAllVisible(state, false);
    cursor.classList.remove("is-typing");
    cursor.classList.remove("is-done");
    if (state.chars.length > 0) {
      placeCursorAtSpan(state.chars[0].span, cursor, content, "before");
    } else {
      placeCursorAtStart(content, cursor);
    }
  };

  const buildSchedule = (chars) => {
    const typedIndices = [];
    for (let i = 0; i < chars.length; i += 1) {
      const ch = chars[i].char || "";
      if (!/\s/.test(ch)) typedIndices.push(i);
    }

    const count = Math.max(typedIndices.length, 1);
    const baseSlot = TYPEWRITER.totalDurationMs / count;
    const schedule = new Array(count).fill(baseSlot);

    if (TYPEWRITER.punctuationPauseMs > 0) {
      const punctIndices = [];
      for (let i = 0; i < typedIndices.length; i += 1) {
        const ch = chars[typedIndices[i]].char || "";
        if (TYPEWRITER.punctuationChars.includes(ch)) {
          punctIndices.push(i);
        }
      }

      if (punctIndices.length > 0) {
        const extra = TYPEWRITER.punctuationPauseMs;
        const totalExtra = extra * punctIndices.length;
        const trim = totalExtra / count;
        for (let i = 0; i < count; i += 1) {
          schedule[i] = Math.max(0, schedule[i] - trim);
        }
        punctIndices.forEach((i) => {
          schedule[i] += extra;
        });
      }
    }

    return { schedule, typedIndices };
  };

  const typeContent = (content) => {
    const state = ensureTypewriterState(content);
    const cursor = ensureCursor(content);
    stopTyping(content, false);

    if (prefersReducedMotion) {
      setAllVisible(state, true);
      cursor.classList.remove("is-typing");
      return;
    }

    setAllVisible(state, false);
    cursor.classList.remove("is-done");
    cursor.classList.add("is-typing");
    state.typing = true;

    let charIndex = 0;
    const { schedule, typedIndices } = buildSchedule(state.chars);
    let lastRevealIndex = -1;
    let nextAt = performance.now() + TYPEWRITER.startDelayMs;

    const step = (now) => {
      if (!state.typing) return;

      if (charIndex < typedIndices.length && now >= nextAt) {
        let loops = 0;
        while (charIndex < typedIndices.length && now >= nextAt) {
          const currentIndex = typedIndices[charIndex];
          for (let i = lastRevealIndex + 1; i < currentIndex; i += 1) {
            state.chars[i].span.classList.add("is-visible");
          }
          const current = state.chars[currentIndex];
          current.span.classList.add("is-visible");
          lastRevealIndex = currentIndex;
          placeCursorAtSpan(current.span, cursor, content, "after");
          const slot = schedule[Math.max(0, charIndex)] || 0;
          nextAt += slot;
          charIndex += 1;
          loops += 1;
          if (loops > 2000) break;
        }
      }

      if (charIndex >= typedIndices.length) {
        state.typing = false;
        state.raf = null;
        cursor.classList.remove("is-typing");
        cursor.classList.add("is-done");
        for (let i = lastRevealIndex + 1; i < state.chars.length; i += 1) {
          state.chars[i].span.classList.add("is-visible");
        }
        if (state.chars.length > 0) {
          placeCursorAtSpan(
            state.chars[state.chars.length - 1].span,
            cursor,
            content,
            "after"
          );
        } else {
          placeCursorAtStart(content, cursor);
        }
        return;
      }

      state.raf = requestAnimationFrame(step);
    };

    if (state.chars.length > 0) {
      placeCursorAtSpan(state.chars[0].span, cursor, content, "before");
    } else {
      placeCursorAtStart(content, cursor);
    }
    state.raf = requestAnimationFrame(step);

    if (state.fallbackTimer !== null) clearTimeout(state.fallbackTimer);
    state.fallbackTimer = setTimeout(() => {
      const anyVisible = state.chars.some(({ span }) =>
        span.classList.contains("is-visible")
      );
      if (!anyVisible) {
        setAllVisible(state, true);
        state.typing = false;
        if (state.raf !== null) {
          cancelAnimationFrame(state.raf);
          state.raf = null;
        }
        cursor.classList.remove("is-typing");
        cursor.classList.add("is-done");
        if (state.chars.length > 0) {
          placeCursorAtSpan(
            state.chars[state.chars.length - 1].span,
            cursor,
            content,
            "after"
          );
        } else {
          placeCursorAtStart(content, cursor);
        }
      }
      state.fallbackTimer = null;
    }, 800);
  };

  const setActive = (index) => {
    currentIndex = clamp(index, 0, sections.length - 1);
    sections.forEach((section, i) => {
      section.classList.toggle("is-active", i === currentIndex);
    });

    sections.forEach((section, i) => {
      const content = section.querySelector(".content");
      if (!content) return;
      if (i === currentIndex) {
        typeContent(content);
      } else {
        clearContent(content);
      }
    });

    fitAllSections();
    updateViewportState();
  };

  const step = (dir) => {
    const nextIndex = clamp(currentIndex + dir, 0, sections.length - 1);
    if (nextIndex === currentIndex) return;
    setActive(nextIndex);
  };

  const startTrain = (dir) => {
    if (trainTimer !== null) return;
    trainTimer = setInterval(() => step(dir), 260);
  };

  const stopTrain = () => {
    if (trainTimer === null) return;
    clearInterval(trainTimer);
    trainTimer = null;
  };

  window.addEventListener("keydown", (e) => {
    if (
      e.key !== "ArrowDown" &&
      e.key !== "ArrowUp" &&
      e.key !== "ArrowLeft" &&
      e.key !== "ArrowRight"
    ) {
      return;
    }

    e.preventDefault();
    const dir =
      e.key === "ArrowDown" || e.key === "ArrowRight" ? 1 : -1;

    if (e.repeat) {
      startTrain(dir);
      return;
    }

    stopTrain();
    step(dir);
  });

  window.addEventListener("keyup", (e) => {
    if (
      e.key !== "ArrowDown" &&
      e.key !== "ArrowUp" &&
      e.key !== "ArrowLeft" &&
      e.key !== "ArrowRight"
    ) {
      return;
    }
    stopTrain();
  });

  window.addEventListener("blur", () => {
    stopTrain();
  });

  let touchStartY = 0;
  let touchStartX = 0;
  let touchActive = false;
  window.addEventListener("touchstart", (e) => {
    if (!e.touches || e.touches.length === 0) return;
    touchActive = true;
    touchStartY = e.touches[0].clientY;
    touchStartX = e.touches[0].clientX;
  });

  window.addEventListener("touchend", () => {
    touchActive = false;
  });

  let lastTouchAdvance = 0;
  const shouldAdvanceFromEvent = (e) => {
    const target = e.target;
    if (!target) return false;
    if (!target.closest) return false;
    if (!target.closest(".content")) return false;
    if (target.closest("a, button, input, textarea, select, label")) return false;
    return true;
  };

  page.addEventListener("touchend", (e) => {
    const touch = (e.changedTouches && e.changedTouches[0]) || null;
    if (!touch) return;

    const endX = touch.clientX;
    const endY = touch.clientY;
    const deltaX = endX - touchStartX;
    const deltaY = endY - touchStartY;
    const threshold = 40;
    let dir = 1;

    if (Math.abs(deltaX) >= threshold || Math.abs(deltaY) >= threshold) {
      const horizontal = Math.abs(deltaX) >= Math.abs(deltaY);
      if (horizontal) {
        dir = deltaX > 0 ? -1 : 1;
      } else {
        dir = deltaY > 0 ? -1 : 1;
      }
    }

    lastTouchAdvance = Date.now();
    step(dir);
  });

  page.addEventListener("click", (e) => {
    if (!shouldAdvanceFromEvent(e)) return;
    if (Date.now() - lastTouchAdvance < 350) return;
    step(1);
  });

  let wheelLock = false;
  let wheelAccum = 0;
  let wheelTimer = null;
  window.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      if (wheelLock) return;
      wheelAccum += e.deltaY;
      const threshold = 180;
      if (Math.abs(wheelAccum) >= threshold) {
        const dir = wheelAccum > 0 ? 1 : -1;
        step(dir);
        wheelLock = true;
        wheelAccum = 0;
        setTimeout(() => {
          wheelLock = false;
        }, 220);
      }
      if (wheelTimer) clearTimeout(wheelTimer);
      wheelTimer = setTimeout(() => {
        wheelAccum = 0;
      }, 200);
    },
    { passive: false }
  );

  window.addEventListener("resize", () => {
    const active = sections[currentIndex];
    if (!active) return;
    const content = active.querySelector(".content");
    if (!content) return;
    updateCursorForContent(content);
    fitAllSections();
    updateViewportState();
  });

  const updateViewportState = () => {
    const tooSmall = window.innerWidth <= 360 || window.innerHeight <= 450;
    document.body.classList.toggle("is-too-small", tooSmall);
  };


  updateViewportState();
  window.addEventListener("resize", updateViewportState);


  // Title click -> top
  const homeLink = document.getElementById("brandHomeLink");
  if (homeLink) {
    homeLink.addEventListener("click", (e) => {
      e.preventDefault();
      setActive(0);
    });
  }

  // BO reveal -> name -> revert
  const boNodes = Array.from(document.querySelectorAll(".bo"));
  const SHORT = "BO";
  const FULL = "OUSSAMA BENBILA";

  boNodes.forEach((bo) => {
    let scrambleTimer = null;
    let revertTimer = null;

  const setText = (text) => {
    bo.textContent = text;
  };

    const stopTimers = () => {
      if (scrambleTimer) cancelAnimationFrame(scrambleTimer);
      if (revertTimer) clearTimeout(revertTimer);
      scrambleTimer = null;
      revertTimer = null;
    };

    const shuffleToFull = () => {
      stopTimers();
      const letters = FULL.split("");
      const duration = 520;
      const start = performance.now();
      const easeInOut = (t) =>
        t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

      const frame = (now) => {
        const elapsed = now - start;
        const raw = Math.min(1, elapsed / duration);
        const eased = easeInOut(raw);
        const i = Math.round(eased * letters.length);
        const remaining = letters.slice(i);
        for (let j = remaining.length - 1; j > 0; j -= 1) {
          const k = Math.floor(Math.random() * (j + 1));
          [remaining[j], remaining[k]] = [remaining[k], remaining[j]];
        }
        const fixed = letters.slice(0, i).join("");
        setText(fixed + remaining.join(""));

        if (raw < 1) {
          scrambleTimer = requestAnimationFrame(frame);
        } else {
          stopTimers();
          setText(FULL);
        }
      };

      scrambleTimer = requestAnimationFrame(frame);
    };

    const revertToShort = () => {
      stopTimers();
      setText(SHORT);
    };

    bo.addEventListener("mouseenter", shuffleToFull);
    bo.addEventListener("click", shuffleToFull);
    bo.addEventListener("mouseleave", () => {
      revertTimer = setTimeout(revertToShort, 80);
    });
    bo.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        shuffleToFull();
      }
    });
    bo.addEventListener("blur", revertToShort);
  });

  if (prefersReducedMotion) {
    document.documentElement.classList.add("reduced-motion");
  }

  const shuffleWord = document.querySelector(".shuffle-word");
  if (shuffleWord && !prefersReducedMotion) {
    const original = shuffleWord.getAttribute("data-text") || shuffleWord.textContent || "";
    const letters = original.split("");
    let shuffleTimer = null;

    const setText = (text) => {
      shuffleWord.textContent = text;
    };

    const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    const randomChar = () =>
      ALPHABET[Math.floor(Math.random() * ALPHABET.length)];

    const shuffleOnce = () => {
      const arr = letters.slice();
      for (let i = 0; i < arr.length; i += 1) {
        if (Math.random() < 0.55) {
          arr[i] = randomChar();
        }
      }
      for (let i = arr.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr.join("");
    };

    const triggerShuffle = () => {
      const burst = 10 + Math.random() * 550;
      const startInterval = 40 + Math.random() * 100;
      const endInterval = 20 + Math.random() * 200;
      const start = performance.now();

      if (shuffleTimer) clearInterval(shuffleTimer);

      const tick = (now) => {
        const elapsed = now - start;
        const t = Math.min(1, elapsed / burst);
        const easeInOut = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        const currentInterval =
          startInterval + (endInterval - startInterval) * easeInOut;
        setText(shuffleOnce());
        shuffleTimer = setTimeout(() => tick(performance.now()), currentInterval);
        if (t >= 1) {
          clearTimeout(shuffleTimer);
          shuffleTimer = null;
          setText(original);
        }
      };

      tick(performance.now());
    };

    const schedule = () => {
      const delay = 5000 + Math.random() * 30000;
      setTimeout(() => {
        triggerShuffle();
        schedule();
      }, delay);
    };

    schedule();
  }

  if (prefersReducedMotion) {
    sections.forEach((section) => {
      const content = section.querySelector(".content");
      if (!content) return;
      const state = ensureTypewriterState(content);
      setAllVisible(state, true);
    });
  }

  setActive(0);
  fitAllSections();
})();
