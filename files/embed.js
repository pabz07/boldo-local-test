(function () {
  const S = window.aeoSettings || {};
  const CHAT = S.chat || {};
  const BTN  = S.button || {};
  const ANALYTICS = S.analytics || {};

  // ❗ Only disable analytics when explicitly set to false
  const analyticsDisabled = ANALYTICS.enabled === false;

  const BASE_URL =
    S.base_url ||
    (window.location.hostname === "localhost"
      ? "http://localhost:3000"
      : "https://aeo.press");

  const ORG_ID = S.organization_id ?? null;

  // ==========================
  // Analytics helper (edge_event)
  // ==========================
  function sendEdgeEvent(eventType, customData = {}) {
    
    if (analyticsDisabled) return;

    try {
      const payload = {
        path: window.location.href,
        http_status: 200,
        epoch_ms: Date.now(),
        user_agent: navigator.userAgent || "",
        referer: document.referrer || "",
        event_type: eventType,
        custom_data: Object.assign(
          {
            page_url: window.location.href,
            organization_id: ORG_ID,
            source: "embed.js",
          },
          customData || {}
        ),
      };

      const url = `${BASE_URL}/analytics/edge_event`;
      const body = JSON.stringify(payload);
      
      fetch(url, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "X-Auth": "EDGE_EVENT_SHARED_SECRET!!",
        },
        body,
        keepalive: true,
      }).catch(() => {});
    
    } catch (e) {
      console.warn("[aeo.embed] edge_event failed", e);
    }
  }

  window.__aeoSendEdgeEvent = sendEdgeEvent;

  // =====================
  // Early exits by toggle
  // =====================
  const chatEnabled   = CHAT.enabled === true;
  const buttonEnabled = BTN.enabled === true;

  // Base "view" event for the embed script itself
  sendEdgeEvent("edge_view", {
    chat_enabled: chatEnabled,
    site_search_enabled: !!(S.site_search && S.site_search.enabled === true),
  });

  // ==========================
  // CHAT WIDGET (floating UI)
  // ==========================
  if (chatEnabled) {
    const CONFIG = {
      BASE_URL,
      ORGANIZATION_ID: ORG_ID,
      CSS_PATH: S.css_path, // optional
      BUTTON_COLOR: CHAT.button_color || "#111",
      BUTTON_TEXT_COLOR: CHAT.button_text_color || "#fff",
      BUTTON_TEXT: CHAT.button_text || "Ask AI",
      INTRO_TEXT: CHAT.intro_text || "Hi, how can I help you today?",
      DESKTOP_WIDTH:  "480px",
      DESKTOP_HEIGHT: "820px",
      MOBILE_WIDTH:   "100vw",
      MOBILE_HEIGHT:  "80vh",
      BUTTON_POSITION: { bottom: "24px", right: "24px" }
    };

    function isMobile() { return window.innerWidth <= 600; }
    function setIframeStyles(iframe) {
      if (isMobile()) {
        iframe.style.width = CONFIG.MOBILE_WIDTH;
        iframe.style.height = CONFIG.MOBILE_HEIGHT;
        iframe.style.left = "0";
        iframe.style.right = "0";
        iframe.style.bottom = "0";
        iframe.style.top = "inherit";
        iframe.style.borderRadius = "0";
      } else {
        iframe.style.width = CONFIG.DESKTOP_WIDTH;
        iframe.style.height = CONFIG.DESKTOP_HEIGHT;
        iframe.style.left = "";
        iframe.style.right = CONFIG.BUTTON_POSITION.right;
        iframe.style.bottom = CONFIG.BUTTON_POSITION.bottom;
        iframe.style.top = "";
        iframe.style.borderRadius = "16px";
      }
    }
    function createButton({ color, text_color, text, position }) {
      const btn = document.createElement('button');
      btn.id = 'llmo-chat-button';
      btn.innerHTML = `<span class="ai-icon" style="height:30px;width:30px;display:flex;align-items:center;justify-content:center;margin:0;border-radius:100%;">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 113 113" fill="none" style="height:16px;width:16px;">
          <path d="M56.5686 0.627859C61.3394 0.627859 63.1685 26.4396 74.9331 38.2041C86.6976 49.9686 112.509 51.7978 112.509 56.5685C112.509 61.3393 86.6976 63.1685 74.933 74.933C63.1685 86.6975 61.3394 112.509 56.5686 112.509C51.7978 112.509 49.9687 86.6975 38.2042 74.933C26.4396 63.1685 0.627918 61.3393 0.62792 56.5685C0.627922 51.7978 26.4396 49.9686 38.2042 38.2041C49.9687 26.4396 51.7978 0.627859 56.5686 0.627859Z" fill="${text_color}"/>
        </svg>
      </span> ${text}`;
      btn.title = "Chat with AI";
      btn.type = "button";
      Object.assign(btn.style, {
        display: "flex", alignItems: "center", gap: "8px",
        backgroundColor: color, position: "fixed",
        bottom: position.bottom, right: position.right,
        zIndex: "9998", color: text_color, border: "none",
        boxShadow: "0 2px 16px #0001", borderRadius: "2px",
        fontSize: "15px", padding: "8px 18px 8px 12px", cursor: "pointer",
        letterSpacing: "1px", height: "46px", lineHeight: "0",
        filter: "brightness(100%)", transition: "background .15s, filter .15s"
      });
      btn.onmouseover = () => (btn.style.filter = "brightness(90%)");
      btn.onmouseout  = () => (btn.style.filter = "brightness(100%)");
      return btn;
    }
    function createIframe() {
      const iframe = document.createElement('iframe');
      iframe.id = 'llmo-chat-iframe';
      iframe.style.display = "none";
      iframe.style.position = "fixed";
      iframe.style.background = "#fff";
      iframe.style.zIndex = "9999";
      iframe.style.border = "none";
      iframe.style.boxShadow = "0 2px 24px #0002";
      iframe.style.transition = "all .3s cubic-bezier(.4,0,.2,1)";
      iframe.allow = "clipboard-write";
      setIframeStyles(iframe);
      return iframe;
    }

    const chatButton = createButton({
      color: CONFIG.BUTTON_COLOR,
      text_color: CONFIG.BUTTON_TEXT_COLOR,
      text: CONFIG.BUTTON_TEXT,
      position: CONFIG.BUTTON_POSITION
    });
    document.body.appendChild(chatButton);

    const iframe = createIframe();
    document.body.appendChild(iframe);

    window.addEventListener('resize', () => setIframeStyles(iframe));

    chatButton.addEventListener('click', function () {
      setIframeStyles(iframe);
      iframe.style.display = "block";
      chatButton.style.display = "none";
      if (isMobile()) document.body.style.overflow = "hidden";
      if (!iframe._injected) {
        const params = [
          `base_url=${encodeURIComponent(CONFIG.BASE_URL)}`,
          `organization_id=${encodeURIComponent(CONFIG.ORGANIZATION_ID)}`,
          `intro_text=${encodeURIComponent(CONFIG.INTRO_TEXT)}`
        ];
        if (CONFIG.CSS_PATH) params.push(`css=${encodeURIComponent(CONFIG.CSS_PATH)}`);
        iframe.src = `${CONFIG.BASE_URL}/widget?${params.join("&")}`;
        iframe._injected = true;
      }
    });

    window.addEventListener("message", function (event) {
      if (event.data === "llmo-close") {
        iframe.style.display = "none";
        chatButton.style.display = "flex";
        document.body.style.overflow = "";
      }
      // optional: chat history passthrough kept from your original code
      if (event.data && event.data.type === `llmo-chat-history-save-${CONFIG.ORGANIZATION_ID}`) {
        localStorage.setItem(`llmoChatHistory-${CONFIG.ORGANIZATION_ID}`, JSON.stringify(event.data.history));
        localStorage.setItem(`llmoChatHistoryExpiry-${CONFIG.ORGANIZATION_ID}`, Date.now().toString());
      }
      if (event.data && event.data.type === `llmo-chat-history-request-${CONFIG.ORGANIZATION_ID}`) {
        const history = localStorage.getItem(`llmoChatHistory-${CONFIG.ORGANIZATION_ID}`);
        const expiry = localStorage.getItem(`llmoChatHistoryExpiry-${CONFIG.ORGANIZATION_ID}`);
        const ONE_DAY_MS = 24 * 60 * 60 * 1000;
        let result = {};
        if (history && expiry && (Date.now() - Number(expiry) < ONE_DAY_MS)) {
          result = JSON.parse(history);
        }
        iframe.contentWindow?.postMessage({
          type: `llmo-chat-history-init-${CONFIG.ORGANIZATION_ID}`,
          history: result
        }, "*");
      }
    });
  }

  // =========================================
  // "CHAT WITH THIS PAGE IN CHATGPT" BUTTON(S)
  // =========================================
  if (buttonEnabled) {
    const selector = BTN.button_selector || ".ai-btns";
    const subdomain = BTN.subdomain || "ai";
    
    const containers = document.querySelectorAll(selector);

    if (containers.length) {
      const url = new URL(window.location.href);

      // Build path ending in .txt
      let path = url.pathname;
      if (path === "/") path = "/home.txt";
      else path += ".txt";

      // Force host to use desired subdomain
      const hostParts = url.hostname.split(".");
      const domain =
        hostParts.length > 2
          ? hostParts.slice(-2).join(".")
          : url.hostname;
      const host = `${subdomain}.${domain}`;

      const txtUrl = `${url.protocol}//${host}${path}`;

      const prompt = encodeURIComponent(
        `I would like to chat with the content on ${txtUrl}. Please start with a one-paragraph summary.`
      );
      const chatUrl = `https://chat.openai.com/?prompt=${prompt}`;

      containers.forEach((el) => {
        const link = document.createElement("a");
        link.href = chatUrl;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.innerText = "Chat with this page in ChatGPT";
        link.style.display = "inline-block";
        link.style.margin = "8px 0";
        link.classList.add("btn");
        el.appendChild(link);
      });
    }
  }
})();












(function () {
  const S = window.aeoSettings || {};
  const SITE = S.site_search || {};
  if (SITE.enabled !== true) return;

  // Re-use analytics helper from above IIFE (if available)
  const sendEdgeEvent = window.__aeoSendEdgeEvent || function () {};

  const BASE_URL =
    S.base_url ||
    (window.location.hostname === "localhost"
      ? "http://localhost:3000"
      : "https://aeo.press");

  const ORG_ID = S.organization_id ?? null;

  // ---------- Elements ----------
  const btn        = document.querySelector("#aeo-search-btn");
  const overlay    = document.querySelector("#aeo-site-search-overlay");
  const backdrop   = overlay?.querySelector(".aeo-search-backdrop");
  const closeBtns  = overlay?.querySelectorAll("[data-close='true']");
  const inputEl    = overlay?.querySelector("#aeo-overlay-input");
  const statusEl   = overlay?.querySelector("#aeo-status");
  const groupsEl   = overlay?.querySelector("#aeo-groups");
  const aiBox      = overlay?.querySelector("#aeo-ai-summary");
  const aiText     = overlay?.querySelector("#aeo-ai-summary-text");

  let aiLoader = null, aiErr = null, aiDotsTimer = null, aiDotsCount = 0, aiCta = null, slaterBtn = null;;

  if (aiBox) {
    // loader
    aiLoader = aiBox.querySelector("#aeo-ai-loading") || document.createElement("div");
    aiLoader.id = "aeo-ai-loading";
    aiLoader.setAttribute("role", "status");
    aiLoader.setAttribute("aria-live", "polite");
    aiLoader.style.display = "none";
    aiLoader.innerHTML = `
      <div class="aeo-ai-row">
        <div class="aeo-ai-spinner" aria-hidden="true"></div>
        <div class="aeo-ai-msg">AI is thinking...</div>
      </div>
    `;
    if (!aiLoader.parentNode) aiBox.appendChild(aiLoader);

    // error
    aiErr = aiBox.querySelector("#aeo-ai-error") || document.createElement("div");
    aiErr.id = "aeo-ai-error";
    aiErr.style.display = "none";
    aiErr.className = "aeo-error";
    if (!aiErr.parentNode) aiBox.appendChild(aiErr);

    aiCta = aiBox.querySelector("#aeo-ai-cta") || document.createElement("div");
    aiCta.id = "aeo-ai-cta";
    // aiCta.style.display = "none";
    aiCta.innerHTML = `
      <div class="aeo-ai-cta-wrap" role="note" aria-live="polite">
        <div class="aeo-ai-cta-title">Press <kbd>Enter</kbd> to start your AI search</div>
        <div class="aeo-ai-cta-sub">We’ll summarize the most relevant pages and surface AI matches.</div>
      </div>
    `;
    if (!aiCta.parentNode) aiBox.appendChild(aiCta);

    slaterBtn = aiBox.querySelector("#aeo-slater-btn") || document.createElement("a");
    slaterBtn.id = "aeo-slater-btn";
    slaterBtn.className = "aeo-slater-btn btn";
    slaterBtn.style.display = "none";
    slaterBtn.target = "_blank";
    slaterBtn.rel = "noopener";
    slaterBtn.textContent = SITE.button_text;
    if (!slaterBtn.parentNode) {
      const wrap = document.createElement("div");
      wrap.className = "aeo-ai-actions";
      wrap.appendChild(slaterBtn);
      aiBox.appendChild(wrap);
    }
  }

  // ---------- Helpers ----------
  const escHTML = (s = "") =>
    (s + "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  const setStatus = (msg, type = "loading") => {
    return // turn off status
    
    if (!statusEl) return;
    statusEl.textContent = msg;
    statusEl.className =
      type === "error"
        ? "aeo-error"
        : type === "empty"
        ? "aeo-empty"
        : "aeo-loading";
    statusEl.style.display = "block";
  };

  const clearStatus = () => {
    // if (statusEl) statusEl.style.display = "none";
  };

  const buildAIChatHref = (prompt, response) => {
    const u = new URL(`https://${S.organization_sub}.${S.organization_domain}`);
    u.searchParams.set("prompt", prompt || "");
    u.searchParams.set("response", response || "");
    return u.toString();
  };

  const clearResults = () => {
    if (groupsEl) groupsEl.innerHTML = "";
    if (aiBox) {
      aiBox.style.display = "none";
      if (aiText) aiText.textContent = "";
      if (aiLoader) aiLoader.style.display = "none";
      if (aiErr) aiErr.style.display = "none";
      if (slaterBtn) slaterBtn.style.display = "none";
      stopDots();
    }
  };

  const labelForGroupKey = (key) => {
    const map = {
      vector: "AI Matches",
      keyword: "Keyword Matches",
      results: "Results",
      other: "Other",
    };
    return map[key] || key.charAt(0).toUpperCase() + key.slice(1);
  };

  const renderGroup = (title, items) => {
    if (!items?.length) return "";
    const list = items
      .map((p) => {
        const safeTitle = escHTML(p.title || p.url || "");
        const safeUrl = escHTML(p.url || "");
        const text = p.snippet || p.summary || p.content || "";
        const safeText = escHTML(text);
        const hasScore =
          typeof p.percent === "number" && !Number.isNaN(p.percent);
        const scoreBadge = hasScore
          ? `<span class="aeo-score">${p.percent}%</span>`
          : "";
        return `
          <li class="aeo-result">
            <div class="aeo-result-header">
              <a class="aeo-result-link" href="${safeUrl}" target="_blank" rel="noopener">${safeTitle}</a>
              ${scoreBadge}
            </div>
            ${safeText ? `<div class="aeo-result-snippet">${safeText}</div>` : ""}
          </li>
        `;
      })
      .join("");

    return `
      <section class="aeo-group">
        <h5 class="aeo-group-title">${escHTML(title)}</h5>
        <ul class="aeo-results">${list}</ul>
      </section>
    `;
  };

  // ---------- Model + Drawing ----------
  const model = {
    summary: "",
    groups: { keyword: [], vector: [] },
    aiLoading: false,
    aiError: null,
    aiIdleCTA: false, // NEW
  };

  const startDots = () => {
    if (!aiLoader) return;
    stopDots();
    aiDotsCount = 0;
    const span = aiLoader.querySelector(".aeo-ai-dots");
    aiDotsTimer = setInterval(() => {
      aiDotsCount = (aiDotsCount + 1) % 4;
      if (span) span.textContent = ".".repeat(aiDotsCount) || "…";
    }, 400);
  };

  const stopDots = () => {
    if (aiDotsTimer) {
      clearInterval(aiDotsTimer);
      aiDotsTimer = null;
    }
  };

  const drawAI = () => {
    if (!aiBox) return;

    const hasSummary = !!model.summary?.trim();
    const shouldShow =
      model.aiLoading || model.aiError || hasSummary || model.aiIdleCTA;

      aiBox.style.display = shouldShow ? "block" : "none";

    // CTA visibility (only when idle: no loading, no error, no summary)
    if (aiCta) {
      aiCta.style.display =
        model.aiIdleCTA && !model.aiLoading && !model.aiError && !hasSummary
          ? "block"
          : "none";
    }

    // Loader
    if (aiLoader) {
      aiLoader.style.display = model.aiLoading ? "block" : "none";
      if (model.aiLoading) startDots(); else stopDots();
    }

    // Error
    if (aiErr) {
      if (model.aiError) {
        aiErr.style.display = "block";
        aiErr.textContent = model.aiError;
      } else {
        aiErr.style.display = "none";
        aiErr.textContent = "";
      }
    }

    // Summary text
    if (aiText) {
      if (!model.aiLoading && !model.aiError && hasSummary) {
        aiText.textContent = model.summary.trim();
      } else if (!model.aiLoading && !hasSummary) {
        aiText.textContent = "";
      } else if (model.aiLoading) {
        aiText.textContent = "";
      }
    }

    if (slaterBtn) {
      if (!model.aiLoading && !model.aiError && hasSummary) {
        const prompt = (inputEl?.value || "").trim();
        slaterBtn.href = buildAIChatHref(prompt, model.summary.trim());
        slaterBtn.style.display = "block";
      } else {
        slaterBtn.style.display = "none";
      }
    }
  };

  const draw = () => {
    // AI section
    drawAI();

    // Groups
    const order = ["vector", "keyword"];
    const sections = order
      .map((k) => renderGroup(labelForGroupKey(k), model.groups[k]))
      .filter(Boolean)
      .join("");

    if (!sections && !model.summary && !model.aiLoading && !model.aiError) {
      setStatus("No keywords found. Press enter for AI search", "empty");
      return;
    }

    clearStatus();
    if (groupsEl) groupsEl.innerHTML = sections;
  };

  // ---------- API ----------
  const search = async (query, mode, signal) => {
    const res = await fetch(`${BASE_URL}/api/site_searches`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal,
      body: JSON.stringify({ organization_id: ORG_ID, query, mode }),
    });
    if (!res.ok) throw new Error(`Search failed: ${res.status}`);
    return res.json();
  };

  // Abort controllers to cancel in-flight requests
  let kwController = null;
  let semController = null;

  // Track current query so we can reset sections on change
  let currentQuery = "";

  const resetForNewQuery = (q) => {
    currentQuery = q;
    model.summary = "";
    model.groups.vector = [];
    model.groups.keyword = [];
    // model.aiLoading = false;
    model.aiError = null;
    model.aiIdleCTA = true; // NEW: show CTA when there's a viable query
    clearResults();
    draw();
  };

  // ---------- Keyword (keyup) ----------
  const runKeyword = async (q) => {
    kwController?.abort();
    kwController = new AbortController();

    try {
      setStatus("Searching keywords…");
      const kw = await search(q, "keyword", kwController.signal);
      model.groups.keyword = kw.groups?.keyword || [];
      clearStatus();
      draw();

      // Analytics: keyword search
      sendEdgeEvent("site_search_keyword", {
        widget: "site_search",
        query: q,
        results_count: model.groups.keyword.length,
      });
    } catch (err) {
      if (err.name === "AbortError") return;
      console.warn("[aeo.site_search] keyword failed", err);
      setStatus("Keyword search failed.", "error");
      sendEdgeEvent("site_search_error", {
        widget: "site_search",
        mode: "keyword",
        query: q,
        message: (err && err.message) ? err.message.slice(0, 200) : "unknown",
      });
    }
  };

  // ---------- Semantic (enter) ----------
  const runSemantic = async (q) => {
    semController?.abort();
    semController = new AbortController();

    model.aiIdleCTA = false; // NEW: hide CTA once AI request starts
    model.aiLoading = true;
    model.aiError = null;
    model.summary = "";
    draw();

    try {
      const sem = await search(q, "semantic", semController.signal);
      model.summary = sem.summary || "";
      model.groups.vector = sem.groups?.vector || [];
      model.aiLoading = false;
      model.aiError = null;
      draw();

      // Analytics: semantic / AI search
      sendEdgeEvent("site_search_semantic", {
        widget: "site_search",
        query: q,
        vector_results_count: model.groups.vector.length,
        has_summary: !!model.summary,
      });
    } catch (err) {
      if (err.name === "AbortError") {
        model.aiLoading = false;
        model.aiError = "AI response canceled.";
        draw();
        sendEdgeEvent("site_search_error", {
          widget: "site_search",
          mode: "semantic",
          query: q,
          message: "aborted",
        });
        return;
      }
      console.warn("[aeo.site_search] semantic failed", err);
      model.aiLoading = false;
      model.aiError = "Semantic search failed.";
      draw();
      sendEdgeEvent("site_search_error", {
        widget: "site_search",
        mode: "semantic",
        query: q,
        message: (err && err.message) ? err.message.slice(0, 200) : "unknown",
      });
    }
  };

  // ---------- Debounce ----------
  const debounce = (fn, ms = 250) => {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), ms);
    };
  };
  const debouncedKeyword = debounce((q) => runKeyword(q), 250);

  // ---------- Overlay ----------
  const openOverlay = (prefill = "", source = "button") => {
    if (!overlay) return;
    overlay.classList.add("is-open");
    if (prefill) inputEl.value = prefill;
    setTimeout(() => inputEl?.focus(), 0);

    // Analytics: overlay opened
    sendEdgeEvent("site_search_open", {
      widget: "site_search",
      open_source: source,
    });
  };

  const closeOverlay = () => {
    overlay?.classList.remove("is-open");
    clearStatus();
  };

  btn?.addEventListener("click", () => openOverlay("", "button"));
  backdrop?.addEventListener("click", closeOverlay);
  closeBtns?.forEach((b) => b.addEventListener("click", closeOverlay));

  // Keyup → keyword search (when length >= 2)
  inputEl?.addEventListener("keyup", (e) => {
    const q = (inputEl.value || "").trim();
    if (e.key === "Enter" || e.key === "Escape") return;

    if (q.length >= 2) {
      if (q !== currentQuery) {
        resetForNewQuery(q); // will set aiIdleCTA = true
      } else {
        // same query, ensure CTA shows while user hasn't pressed Enter
        if (!model.aiLoading && !model.summary && !model.aiError) {
          model.aiIdleCTA = true;
          draw();
        }
      }
      debouncedKeyword(q);
    } else {
      if (q !== currentQuery) {
        resetForNewQuery(q); // sets aiIdleCTA based on length (will be false)
        setStatus("", "empty");
      } else {
        model.aiIdleCTA = false;
        draw();
      }
    }
  });


  // Enter → semantic search (only)
  inputEl?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const q = (inputEl.value || "").trim();
      if (!q) return;

      if (q !== currentQuery) resetForNewQuery(q);
      runSemantic(q);
    } else if (e.key === "Escape") {
      e.preventDefault();
      closeOverlay();
    }
  });

  // Optional: Cmd/Ctrl + K shortcut
  window.addEventListener("keydown", (e) => {
    const isMac = navigator.platform.toUpperCase().includes("MAC");
    if (
      (isMac && e.metaKey && e.key.toLowerCase() === "k") ||
      (!isMac && e.ctrlKey && e.key.toLowerCase() === "k")
    ) {
      e.preventDefault();
      openOverlay("", "shortcut");
    }
  });
})();
