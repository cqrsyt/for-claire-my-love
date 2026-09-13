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
      '<div class="cover"><div class="cover-card">' +
      '<p class="kicker ' + n + '">' + esc(zh() ? data.meta.occasionZh : data.meta.occasionEn) + "</p>" +
      "<h1 class=\"" + n + "\">" + esc(zh() ? data.meta.titleZh : data.meta.titleEn) + "</h1>" +
      "<p class=\"" + n + "\">" + esc(zh() ? data.meta.subtitleZh : data.meta.subtitleEn) + "</p>" +
      '<div class="ornament"></div>' +
      '<div class="avatars">' +
      (him ? '<img src="' + esc(him) + '" alt="" />' : "") +
      '<span class="heart">♥</span>' +
      (her ? '<img src="' + esc(her) + '" alt="" />' : "") +
      "</div>" +
      "<p class=\"names " + n + "\">" + esc(zh() ? data.meta.fromZh + " × " + data.meta.toZh : data.meta.fromEn + " × " + data.meta.toEn) + "</p>" +
      "<p class=\"date " + n + "\">" + esc(zh() ? data.cover.dateLineZh : data.cover.dateLineEn) + "</p>" +
      "<button type=\"button\" class=\"btn " + n + "\" id=\"btn-open\">" + esc(zh() ? data.cover.hintZh : data.cover.hintEn) + "</button>" +
      "</div></div>";
    document.getElementById("btn-open").onclick = function () { open("story"); };
  }

  function renderStory() {
    var n = zh() ? "zh" : "en";
    var paras = data.story.paragraphs.map(function (p) {
      return "<p class=\"" + n + "\">" + esc(zh() ? p.zh : p.en) + "</p>";
    }).join("");
    document.getElementById("story-copy").innerHTML =
      "<h2 class=\"" + n + "\">" + esc(zh() ? data.story.titleZh : data.story.titleEn) + "</h2>" +
      '<div class="ornament" style="margin:0.7rem auto 1.1rem;width:40px;height:1px;background:var(--gold)"></div>' +
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
    box.classList.remove("is-turn");
    if (animate) {
      void box.offsetWidth;
      box.classList.add("is-turn");
    }
    box.innerHTML = '<div class="stack">' + item.photos.map(function (ph, i) {
      var cap = zh() ? ph.captionZh : ph.captionEn;
      var note = zh() ? ph.noteZh : ph.noteEn;
      return '<article class="card">' +
        '<img src="' + esc(asset(ph.src)) + '" alt="' + esc(cap) + '" data-full="' + esc(asset(ph.src)) + '" data-i="' + i + '" />' +
        (cap ? "<h3 class=\"" + n + "\">" + esc(cap) + "</h3>" : "") +
        (note ? "<p class=\"" + n + "\">" + esc(note) + "</p>" : "") +
        "</article>";
    }).join("") + "</div>";
    box.querySelectorAll("img").forEach(function (img) {
      img.onclick = function (e) {
        var r = box.getBoundingClientRect();
        if (e.clientX < r.left + r.width * 0.22) { go(state.page - 1, true); return; }
        if (e.clientX > r.right - r.width * 0.22) { go(state.page + 1, true); return; }
        openLightbox(item.photos[Number(img.dataset.i)]);
      };
    });
    document.getElementById("page-indicator").textContent = t("pageOf")
      .replace("{current}", String(state.page + 1))
      .replace("{total}", String(pages.length));
    document.getElementById("swipe-hint").textContent = t("swipeHint");
    document.getElementById("btn-prev").disabled = state.page <= 0;
    document.getElementById("btn-next").disabled = state.page >= pages.length - 1;
  }

  function go(i, animate) {
    if (i < 0 || i >= pages.length) return;
    state.page = i;
    renderPage(!!animate);
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

  function bindSwipe() {
    var page = document.getElementById("book-page");
    var x0 = 0, y0 = 0, tracking = false;
    page.addEventListener("pointerdown", function (e) {
      if (state.view !== "album") return;
      x0 = e.clientX; y0 = e.clientY; tracking = true;
    });
    page.addEventListener("pointerup", function (e) {
      if (!tracking) return;
      tracking = false;
      if (e.target.closest && e.target.closest("img")) return;
      var dx = e.clientX - x0, dy = e.clientY - y0;
      if (Math.abs(dx) >= 48 && Math.abs(dx) > Math.abs(dy)) {
        if (dx < 0) go(state.page + 1, true);
        else go(state.page - 1, true);
        return;
      }
      var r = page.getBoundingClientRect();
      if (e.clientX < r.left + r.width * 0.22) go(state.page - 1, true);
      else if (e.clientX > r.right - r.width * 0.22) go(state.page + 1, true);
    });
  }

  function sprinkleLeaves() {
    var root = document.getElementById("leaves");
    var glyphs = ["🍁", "🍂", "🍁"];
    for (var i = 0; i < 12; i++) {
      var el = document.createElement("span");
      el.className = "leaf";
      el.textContent = glyphs[i % glyphs.length];
      el.style.left = Math.random() * 100 + "%";
      el.style.setProperty("--dx", (Math.random() * 80 - 40) + "px");
      el.style.animationDuration = 9 + Math.random() * 10 + "s";
      el.style.animationDelay = -Math.random() * 12 + "s";
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
    document.getElementById("btn-prev").onclick = function () { go(state.page - 1, true); };
    document.getElementById("btn-next").onclick = function () { go(state.page + 1, true); };
    document.getElementById("lightbox-close").onclick = closeLightbox;
    document.getElementById("lightbox").onclick = function (e) {
      if (e.target.id === "lightbox") closeLightbox();
    };
    document.addEventListener("keydown", function (e) {
      if (!document.getElementById("lightbox").hidden && e.key === "Escape") closeLightbox();
      else if (state.view === "album" && e.key === "ArrowRight") go(state.page + 1, true);
      else if (state.view === "album" && e.key === "ArrowLeft") go(state.page - 1, true);
    });
    bindSwipe();
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
