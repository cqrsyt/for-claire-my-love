(function () {
  "use strict";

  var data = window.ALBUM_DATA;
  var cfg = window.SITE_CONFIG || {};
  var base = cfg.basePath && cfg.basePath !== "./" ? (cfg.basePath.endsWith("/") ? cfg.basePath : cfg.basePath + "/") : "";
  var pages = [];
  data.chapters.forEach(function (ch) {
    ch.pages.forEach(function (pg) {
      pages.push({ chapter: ch, photos: pg.photos || [] });
    });
  });

  var state = {
    lang: localStorage.getItem("claire-my-love-lang") || "zh",
    view: "cover",
    page: 0,
  };
  var glBook = null;

  function helpers() {
    return { asset: asset, zh: zh };
  }

  function zh() { return state.lang !== "en"; }
  function t(key) { return data.ui[key + (zh() ? "Zh" : "En")]; }
  function asset(src) {
    if (!src) return "";
    if (/^https?:/i.test(src)) return src;
    return base + String(src).replace(/^\//, "");
  }
  function esc(s) {
    return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function shaHex(val) {
    if (!(window.crypto && crypto.subtle && typeof crypto.subtle.digest === "function") && window.ClaireSha256) {
      return Promise.resolve(window.ClaireSha256(val));
    }
    return crypto.subtle.digest("SHA-256", new TextEncoder().encode(val)).then(function (buf) {
      return Array.from(new Uint8Array(buf)).map(function (x) { return x.toString(16).padStart(2, "0"); }).join("");
    }).catch(function () {
      return window.ClaireSha256 ? window.ClaireSha256(val) : Promise.reject();
    });
  }

  function unlocked() {
    try { return sessionStorage.getItem(cfg.passwordStorageKey || "claire-my-love-unlocked") === "1"; }
    catch (e) { return false; }
  }

  function reveal() {
    try { sessionStorage.setItem(cfg.passwordStorageKey || "claire-my-love-unlocked", "1"); } catch (e) {}
    document.body.classList.remove("locked");
    var gate = document.getElementById("password-gate");
    if (gate) gate.remove();
    var app = document.getElementById("app");
    app.hidden = false;
    app.classList.add("is-on");
  }

  function bindGate() {
    var form = document.getElementById("password-form");
    var input = document.getElementById("password-input");
    var err = document.getElementById("password-error");
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      shaHex(input.value || "").then(function (hex) {
        if (hex === (cfg.sitePasswordHash || "")) {
          reveal();
          boot();
        } else {
          err.hidden = false;
          input.value = "";
          input.focus();
        }
      }).catch(function () {
        err.hidden = false;
      });
    });
    setTimeout(function () { if (input) input.focus(); }, 40);
  }

  function open(view) {
    state.view = view;
    document.documentElement.setAttribute("data-screen", view);
    document.querySelectorAll(".view").forEach(function (el) {
      el.classList.toggle("active", el.dataset.view === view);
    });
    document.querySelectorAll("#nav button").forEach(function (btn) {
      btn.classList.toggle("active", btn.dataset.view === view);
    });
    if (view === "album") renderPage(false);
    else updateBirthdayWish();
    if (view === "cover") {
      var book = document.getElementById("cover-book");
      var openBtn = document.getElementById("btn-open");
      if (book) book.classList.remove("is-open");
      if (openBtn) openBtn.disabled = false;
    }
    window.scrollTo(0, 0);
  }

  function setLang(lang) {
    state.lang = lang;
    localStorage.setItem("claire-my-love-lang", lang);
    document.documentElement.lang = lang === "en" ? "en" : "zh-Hans";
    document.documentElement.setAttribute("data-lang", lang);
    document.querySelectorAll(".lang button").forEach(function (btn) {
      btn.classList.toggle("active", btn.dataset.lang === lang);
    });
    renderChrome();
    renderCover();
    renderStory();
    if (state.view === "album") renderPage(false);
  }

  function renderChrome() {
    var n = zh() ? "zh" : "en";
    document.getElementById("brand-title").textContent = zh() ? data.meta.titleZh : data.meta.titleEn;
    document.getElementById("brand-title").className = "brand-title " + n;
    document.getElementById("brand-sub").textContent = zh() ? data.meta.subtitleZh : data.meta.subtitleEn;
    document.getElementById("brand-sub").className = "brand-sub " + n;
    var labels = ["coverLabel", "storyLabel", "albumLabel"];
    document.querySelectorAll("#nav button").forEach(function (btn, i) {
      btn.textContent = t(labels[i]);
    });
    document.getElementById("btn-see-us").textContent = t("seeUs");
    document.getElementById("btn-see-us").className = "btn " + n;
    document.title = (zh() ? data.meta.titleZh + " · " + data.meta.subtitleZh : data.meta.titleEn + " · " + data.meta.subtitleEn);
  }

  function renderCover() {
    var n = zh() ? "zh" : "en";
    var him = asset(data.meta.avatarHim);
    var her = asset(data.meta.avatarHer);
    document.getElementById("view-cover").innerHTML =
      '<div class="cover">' +
      '<div class="cover-stage">' +
      '<div class="cover-book" id="cover-book">' +
      '<div class="cover-stack" aria-hidden="true"></div>' +
      '<div class="cover-spine" aria-hidden="true"></div>' +
      '<div class="cover-leaf" id="cover-leaf">' +
      '<div class="cover-face cover-face-front">' +
      '<div class="cover-plate" aria-hidden="true"></div>' +
      '<p class="kicker ' + n + '">' + esc(zh() ? data.meta.occasionZh : data.meta.occasionEn) + "</p>" +
      "<h1 class=\"" + n + "\">" + esc(zh() ? data.meta.titleZh : data.meta.titleEn) + "</h1>" +
      "<p class=\"cover-sub " + n + "\">" + esc(zh() ? data.meta.subtitleZh : data.meta.subtitleEn) + "</p>" +
      '<div class="cover-ornament" aria-hidden="true"></div>' +
      '<div class="avatars">' +
      (him ? '<img src="' + esc(him) + '" alt="" />' : "") +
      '<span class="heart" aria-hidden="true">♥</span>' +
      (her ? '<img src="' + esc(her) + '" alt="" />' : "") +
      "</div>" +
      "<p class=\"names " + n + "\">" + esc(zh() ? data.meta.fromZh + " × " + data.meta.toZh : data.meta.fromEn + " × " + data.meta.toEn) + "</p>" +
      "<p class=\"date " + n + "\">" + esc(zh() ? data.cover.dateLineZh : data.cover.dateLineEn) + "</p>" +
      "<button type=\"button\" class=\"btn-open " + n + "\" id=\"btn-open\">" + esc(zh() ? data.cover.hintZh : data.cover.hintEn) + "</button>" +
      "</div>" +
      '<div class="cover-face cover-face-back" aria-hidden="true"></div>' +
      "</div></div></div></div>";
    bindCoverOpen();
  }

  function bindCoverOpen() {
    var btn = document.getElementById("btn-open");
    var book = document.getElementById("cover-book");
    var leaf = document.getElementById("cover-leaf");
    if (!btn || !book || !leaf) return;
    btn.onclick = function () {
      if (book.classList.contains("is-open")) return;
      var entered = false;
      function enterAlbum() {
        if (entered) return;
        entered = true;
        state.page = 0;
        open("album");
      }
      btn.disabled = true;
      book.classList.add("is-open");
      var fallback = setTimeout(enterAlbum, 1200);
      leaf.addEventListener("transitionend", function onEnd(e) {
        if (e.target !== leaf) return;
        if (e.propertyName && e.propertyName.indexOf("transform") === -1) return;
        leaf.removeEventListener("transitionend", onEnd);
        clearTimeout(fallback);
        enterAlbum();
      });
    };
  }

  function renderStory() {
    var n = zh() ? "zh" : "en";
    var paras = data.story.paragraphs.map(function (p) {
      return "<p class=\"" + n + "\">" + esc(zh() ? p.zh : p.en) + "</p>";
    }).join("");
    document.getElementById("story-copy").innerHTML =
      "<h2 class=\"" + n + "\">" + esc(zh() ? data.story.titleZh : data.story.titleEn) + "</h2>" +
      '<div class="letter-rule" aria-hidden="true"></div>' +
      paras +
      "<div class=\"dedication " + n + "\">" + esc(zh() ? data.meta.dedicationZh : data.meta.dedicationEn) + "</div>";
  }

  function renderPage(animate) {
    var item = pages[state.page];
    if (!item) return;
    var n = zh() ? "zh" : "en";
    var ch = item.chapter;
    document.getElementById("chapter-header").innerHTML =
      "<h2 class=\"" + n + "\">" + esc(zh() ? ch.titleZh : ch.titleEn) + "</h2>" +
      "<p class=\"" + n + "\">" + esc(zh() ? ch.introZh : ch.introEn) + "</p>";
    var box = document.getElementById("book-page");
    box.classList.remove("is-turn-next", "is-turn-prev", "is-letter");
    box.innerHTML = '<div class="stack">' + item.photos.map(function (ph, i) {
      var cap = zh() ? ph.captionZh : ph.captionEn;
      var note = zh() ? ph.noteZh : ph.noteEn;
      return '<article class="card">' +
        '<img src="' + esc(asset(ph.src)) + '" alt="' + esc(cap) + '" data-i="' + i + '" />' +
        (cap ? "<h3 class=\"" + n + "\">" + esc(cap) + "</h3>" : "") +
        (note ? "<p class=\"" + n + "\">" + esc(note) + "</p>" : "") +
        "</article>";
    }).join("") + "</div>";
    document.getElementById("page-indicator").textContent = t("pageOf")
      .replace("{current}", String(state.page + 1))
      .replace("{total}", String(pages.length));
    document.getElementById("swipe-hint").textContent = t("swipeHint");
    document.getElementById("btn-prev").textContent = t("prev");
    document.getElementById("btn-next").textContent = t("next");
    document.getElementById("btn-prev").className = "ctrl " + n;
    document.getElementById("btn-next").className = "ctrl " + n;
    document.getElementById("btn-prev").disabled = state.page <= 0;
    document.getElementById("btn-next").disabled = state.page >= pages.length - 1;
    updateBirthdayWish();
    if (glBook && glBook.ready) {
      if (animate !== "gl-keep") glBook.show(item, pages[state.page + 1] || null, helpers());
      return;
    }
    if (animate) {
      void box.offsetWidth;
      box.classList.add(animate === "prev" ? "is-turn-prev" : "is-turn-next");
    }
  }

  function updateBirthdayWish() {
    var el = document.getElementById("bday-wish");
    if (!el) return;
    var n = state.page + 1;
    var on = state.view === "album" && (n === 9 || n === 22);
    if (!on) {
      el.hidden = true;
      el.classList.remove("is-on");
      el.setAttribute("aria-hidden", "true");
      return;
    }
    el.hidden = false;
    el.setAttribute("aria-hidden", "false");
    el.classList.remove("is-on");
    void el.offsetWidth;
    el.classList.add("is-on");
    var text = el.querySelector(".bday-text");
    if (text) {
      text.textContent = zh() ? "祝大宝生日快乐" : "Happy birthday, Da Bao";
      text.className = "bday-text " + (zh() ? "zh" : "en");
    }
  }

  function go(i, animate) {
    if (glBook && glBook.busy) return;
    if (i < 0 || i >= pages.length || i === state.page) return;
    var dir = i < state.page ? "prev" : "next";
    var from = pages[state.page];
    var to = pages[i];
    state.page = i;
    if (glBook && glBook.ready && animate) {
      renderPage("gl-keep");
      glBook.flip(from, to, dir, helpers(), pages[i + 1] || null);
      var album = document.querySelector(".album-book");
      if (album) {
        album.classList.remove("is-flipping-next", "is-flipping-prev");
        void album.offsetWidth;
        album.classList.add(dir === "prev" ? "is-flipping-prev" : "is-flipping-next");
      }
      return;
    }
    renderPage(animate ? dir : false);
  }

  function openLightbox(ph) {
    if (!ph) return;
    var box = document.getElementById("lightbox");
    document.getElementById("lightbox-img").src = asset(ph.src);
    document.getElementById("lightbox-caption").textContent = zh() ? (ph.captionZh || "") : (ph.captionEn || "");
    box.hidden = false;
  }
  function closeLightbox() {
    document.getElementById("lightbox").hidden = true;
  }

  function bindAlbumTurn() {
    var stage = document.getElementById("book-stage");
    var prev = document.getElementById("btn-prev");
    var next = document.getElementById("btn-next");
    stage.addEventListener("click", function (e) {
      if (state.view !== "album") return;
      var r = stage.getBoundingClientRect();
      var x = e.clientX - r.left;
      if (x < r.width * 0.28) {
        go(state.page - 1, true);
        return;
      }
      if (x > r.width * 0.72) {
        go(state.page + 1, true);
        return;
      }
      var img = e.target.closest ? e.target.closest("#book-page img") : null;
      if (!img) return;
      var item = pages[state.page];
      if (item) openLightbox(item.photos[Number(img.dataset.i)]);
    });
    prev.addEventListener("click", function () { go(state.page - 1, true); });
    next.addEventListener("click", function () { go(state.page + 1, true); });
  }

  function bindMotifs() {
    var row = document.getElementById("motif-row");
    if (!row || row._bound) return;
    row._bound = true;
    row.addEventListener("click", function (e) {
      var motif = e.target.closest && e.target.closest(".motif");
      if (!motif) return;
      var icon = motif.querySelector(".i");
      var glyph = icon && !icon.classList.contains("mist") ? (icon.textContent || "✦") : "✦";
      motif.classList.remove("is-pop");
      void motif.offsetWidth;
      motif.classList.add("is-pop");
      var host = document.getElementById("leaves");
      if (!host) return;
      var r = motif.getBoundingClientRect();
      for (var i = 0; i < 5; i++) {
        var bit = document.createElement("span");
        bit.className = "motif-bit";
        bit.textContent = glyph;
        bit.style.left = r.left + r.width / 2 + "px";
        bit.style.top = r.top + "px";
        bit.style.setProperty("--mx", Math.round(Math.random() * 56 - 28) + "px");
        host.appendChild(bit);
        window.setTimeout(function (node) { node.remove(); }, 900, bit);
      }
    });
  }

  function sprinkleLeaves() {
    var root = document.getElementById("leaves");
    var glyphs = ["🍁", "🍂", "🌸", "✿", "❀", "🌼"];
    for (var i = 0; i < 16; i++) {
      var el = document.createElement("span");
      el.className = "leaf";
      el.textContent = glyphs[i % glyphs.length];
      el.style.left = Math.random() * 100 + "%";
      el.style.setProperty("--dx", (Math.random() * 90 - 45) + "px");
      el.style.animationDuration = 10 + Math.random() * 12 + "s";
      el.style.animationDelay = -Math.random() * 14 + "s";
      el.style.fontSize = (0.7 + Math.random() * 0.55) + "rem";
      root.appendChild(el);
    }
  }

  function boot() {
    document.querySelectorAll(".lang button").forEach(function (btn) {
      btn.onclick = function () { setLang(btn.dataset.lang); };
    });
    document.querySelectorAll("#nav button").forEach(function (btn) {
      btn.onclick = function () {
        if (btn.dataset.view === "album") state.page = Math.min(state.page, pages.length - 1);
        open(btn.dataset.view);
      };
    });
    document.getElementById("btn-see-us").onclick = function () {
      state.page = 0;
      open("album");
    };
    document.getElementById("lightbox-close").onclick = closeLightbox;
    document.getElementById("lightbox").onclick = function (e) {
      if (e.target.id === "lightbox") closeLightbox();
    };
    document.addEventListener("keydown", function (e) {
      if (!document.getElementById("lightbox").hidden && e.key === "Escape") closeLightbox();
    });
    var host = document.getElementById("book-gl");
    if (window.ClaireWebGLBook && host) {
      glBook = window.ClaireWebGLBook.mount(host);
    }
    bindAlbumTurn();
    bindMotifs();
    setLang(state.lang);
    open("cover");
    window.ClaireAlbum = { open: open, go: go };
  }

  sprinkleLeaves();
  if (unlocked()) {
    reveal();
    boot();
  } else {
    bindGate();
  }
})();
