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
    page: -1,
  };
  var glBook = null;
  var musicOn = true;
  var bgmArmed = false;
  var bgmFadeBound = false;
  var bgmLastT = 0;

  function helpers() {
    return { asset: asset, zh: zh };
  }

  function zh() { return state.lang !== "en"; }
  function t(key) { return data.ui[key + (zh() ? "Zh" : "En")]; }
  function daysTogether() {
    var hk = new Date(Date.now() + 8 * 3600 * 1000);
    var start = Date.UTC(2025, 6, 30);
    var today = Date.UTC(hk.getUTCFullYear(), hk.getUTCMonth(), hk.getUTCDate());
    return Math.max(1, Math.round((today - start) / 86400000) + 1);
  }
  function togetherLine() {
    var n = daysTogether();
    return zh() ? ("在一起第 " + n + " 天") : ("Day " + n);
  }
  function letterDateLine() {
    var hk = new Date(Date.now() + 8 * 3600 * 1000);
    var y = hk.getUTCFullYear();
    var m = hk.getUTCMonth() + 1;
    if (!zh()) {
      var enMonths = ["January","February","March","April","May","June","July","August","September","October","November","December"];
      return enMonths[hk.getUTCMonth()] + " " + y + " · Hong Kong";
    }
    var digits = "〇一二三四五六七八九";
    var year = String(y).split("").map(function (c) { return digits[Number(c)]; }).join("");
    var months = ["", "一", "二", "三", "四", "五", "六", "七", "八", "九", "十", "十一", "十二"];
    return year + "年" + months[m] + "月 · 香港";
  }
  function isTogetherAnniversary() {
    var hk = new Date(Date.now() + 8 * 3600 * 1000);
    return hk.getUTCMonth() === 6 && hk.getUTCDate() === 30;
  }
  function onEnd() { return state.view === "album" && state.page >= pages.length; }
  function onLetter() { return state.view === "album" && state.page < 0; }
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

  function bgmEl() {
    return document.getElementById("bgm");
  }

  function startBgm() {
    var a = bgmEl();
    if (!a || !musicOn) return;
    a.volume = 0.38;
    a.loop = true;
    bindBgmFade();
    var p = a.play();
    if (p && typeof p.catch === "function") {
      p.catch(function () {
        if (bgmArmed) return;
        var app = document.getElementById("app");
        if (!app) return;
        bgmArmed = true;
        app.addEventListener("click", function () {
          if (musicOn) a.play().catch(function () {});
        }, { once: true });
      });
    }
  }

  function syncMusicBtn() {
    var btn = document.getElementById("btn-music");
    if (!btn) return;
    btn.classList.toggle("is-on", musicOn);
    btn.setAttribute("aria-pressed", musicOn ? "true" : "false");
    var label = musicOn ? t("musicPause") : t("musicPlay");
    btn.setAttribute("aria-label", label);
    btn.setAttribute("title", label);
  }

  function toggleMusic() {
    var a = bgmEl();
    if (musicOn && a && a.paused) {
      a.volume = 0.38;
      a.play().catch(function () {});
      return;
    }
    musicOn = !musicOn;
    if (a) {
      a.volume = 0.38;
      if (musicOn) a.play().catch(function () {});
      else a.pause();
    }
    syncMusicBtn();
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

  function bindBgmFade() {
    var a = bgmEl();
    if (!a || bgmFadeBound) return;
    bgmFadeBound = true;
    a.addEventListener("timeupdate", function () {
      if (!musicOn || a.paused) return;
      var t = a.currentTime;
      var d = a.duration || 0;
      if (d && bgmLastT > d * 0.72 && t < 1.1) {
        a.volume = 0.05;
        var start = performance.now();
        function ramp(now) {
          if (!musicOn || a.paused) return;
          var k = Math.min(1, (now - start) / 520);
          a.volume = 0.05 + (0.38 - 0.05) * k;
          if (k < 1) requestAnimationFrame(ramp);
        }
        requestAnimationFrame(ramp);
      }
      bgmLastT = t;
    });
  }

  function dismissHint() {
    try { sessionStorage.setItem("claire-my-love-motif-hint", "1"); } catch (e) {}
    var hint = document.getElementById("motif-hint");
    if (hint) {
      hint.hidden = true;
      hint.setAttribute("aria-hidden", "true");
    }
  }

  function syncMotifHint() {
    var hint = document.getElementById("motif-hint");
    if (!hint) return;
    var seen = false;
    try { seen = sessionStorage.getItem("claire-my-love-motif-hint") === "1"; } catch (e) {}
    hint.textContent = t("motifHint");
    hint.className = "motif-hint " + (zh() ? "zh" : "en");
    hint.hidden = seen;
    hint.setAttribute("aria-hidden", seen ? "true" : "false");
  }

  function bindGate() {
    var form = document.getElementById("password-form");
    var input = document.getElementById("password-input");
    var err = document.getElementById("password-error");
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var a = bgmEl();
      if (a) {
        a.volume = 0.38;
        a.loop = true;
        a.play().catch(function () {});
      }
      shaHex(input.value || "").then(function (hex) {
        if (hex === (cfg.sitePasswordHash || "")) {
          reveal();
          boot();
          startBgm();
        } else {
          if (a) {
            a.pause();
            a.currentTime = 0;
          }
          err.hidden = false;
          input.value = "";
          input.focus();
        }
      }).catch(function () {
        if (a) {
          a.pause();
          a.currentTime = 0;
        }
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
    if (view === "album") renderPage(false);
    else {
      document.documentElement.classList.remove("webgl-book");
      document.documentElement.removeAttribute("data-chapter");
      updateBirthdayWish();
      syncControls();
    }
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
    document.querySelectorAll(".lang button").forEach(function (btn) {
      btn.textContent = zh() ? "EN" : "中文";
    });
    var labels = ["coverLabel", "storyLabel", "albumLabel"];
    document.querySelectorAll("#nav button").forEach(function (btn, i) {
      btn.textContent = t(labels[i]);
    });
    var seeUsBtn = document.getElementById("btn-see-us");
    if (seeUsBtn) {
      seeUsBtn.textContent = t("seeUs");
      seeUsBtn.className = "btn " + n;
    }
    document.title = (zh() ? data.meta.titleZh + " · " + data.meta.subtitleZh : data.meta.titleEn + " · " + data.meta.subtitleEn);
    syncMusicBtn();
    syncMotifHint();
    syncTurnHint();
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
      "<p class=\"together " + n + "\">" + esc(togetherLine()) + "</p>" +
      (isTogetherAnniversary() ? ("<p class=\"today-mark " + n + "\">" + esc(zh() ? data.cover.todayMarkZh : data.cover.todayMarkEn) + "</p>") : "") +
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
        state.page = -1;
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
    if (!document.getElementById("story-copy")) return;
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

  function renderLetterPage() {
    var n = zh() ? "zh" : "en";
    document.getElementById("chapter-header").innerHTML =
      "<h2 class=\"" + n + "\">" + esc(zh() ? data.story.titleZh : data.story.titleEn) + "</h2>" +
      "<p class=\"" + n + "\">" + esc(zh() ? "翻开后的第一页。下一页，是我们。" : "The first page. Next is us.") + "</p>";
    var box = document.getElementById("book-page");
    box.classList.remove("is-turn-next", "is-turn-prev", "is-end");
    box.classList.add("is-letter");
    var paras = data.story.paragraphs.map(function (p) {
      return "<p class=\"" + n + "\">" + esc(zh() ? p.zh : p.en) + "</p>";
    }).join("");
    box.innerHTML =
      '<article class="letter in-book">' +
      "<h2 class=\"" + n + "\">" + esc(zh() ? data.story.titleZh : data.story.titleEn) + "</h2>" +
      '<div class="letter-rule" aria-hidden="true"></div>' +
      "<p class=\"letter-greet " + n + "\">" + esc(zh() ? data.story.greetingZh : data.story.greetingEn) + "</p>" +
      paras +
      "<div class=\"dedication " + n + "\">" + esc(zh() ? data.meta.dedicationZh : data.meta.dedicationEn) + "</div>" +
      "<p class=\"letter-together " + n + "\">" + esc(togetherLine()) + "</p>" +
      "<p class=\"letter-place " + n + "\">" + esc(letterDateLine()) + "</p>" +
      "<p class=\"letter-sign " + n + "\">" + esc(zh() ? data.story.signZh : data.story.signEn) + "</p>" +
      '<p class="center"><button type="button" id="btn-see-us" class="btn ' + n + '">' + esc(t("seeUs")) + "</button></p>" +
      "</article>";
    var see = document.getElementById("btn-see-us");
    if (see) {
      see.onclick = function (ev) {
        if (ev && ev.stopPropagation) ev.stopPropagation();
        state.page = 0;
        open("album");
      };
    }
    document.getElementById("swipe-hint").textContent = t("swipeHint");
    syncTurnHint();
    document.documentElement.classList.remove("webgl-book");
    document.documentElement.removeAttribute("data-chapter");
    syncControls();
    updateBirthdayWish();
  }

  function renderEndPage() {
    var n = zh() ? "zh" : "en";
    var end = data.end || {};
    document.getElementById("chapter-header").innerHTML =
      "<h2 class=\"" + n + "\">" + esc(zh() ? end.titleZh : end.titleEn) + "</h2>" +
      "<p class=\"" + n + "\">" + esc(zh() ? end.kickerZh : end.kickerEn) + "</p>";
    var box = document.getElementById("book-page");
    box.classList.remove("is-turn-next", "is-turn-prev");
    box.classList.add("is-letter", "is-end");
    box.innerHTML =
      '<article class="letter in-book">' +
      "<h2 class=\"" + n + "\">" + esc(zh() ? end.titleZh : end.titleEn) + "</h2>" +
      "<div class=\"letter-rule\" aria-hidden=\"true\"></div>" +
      "<div class=\"end-avatars\" aria-hidden=\"true\">" +
      (data.meta.avatarHim ? "<img src=\"" + esc(asset(data.meta.avatarHim)) + "\" alt=\"\" />" : "") +
      "<span class=\"heart\">♥</span>" +
      (data.meta.avatarHer ? "<img src=\"" + esc(asset(data.meta.avatarHer)) + "\" alt=\"\" />" : "") +
      "</div>" +
      "<p class=\"letter-kicker " + n + "\">" + esc(zh() ? end.kickerZh : end.kickerEn) + "</p>" +
      "<p class=\"" + n + "\">" + esc(zh() ? end.bodyZh : end.bodyEn) + "</p>" +
      "<div class=\"dedication " + n + "\">" + esc(zh() ? end.closeZh : end.closeEn) + "</div>" +
      "<p class=\"letter-together " + n + "\">" + esc(togetherLine()) + "</p>" +
      "<p class=\"letter-place " + n + "\">" + esc(letterDateLine()) + "</p>" +
      "<p class=\"letter-sign " + n + "\">" + esc(zh() ? data.story.signZh : data.story.signEn) + "</p>" +
      "</article>";
    document.getElementById("swipe-hint").textContent = t("swipeHint");
    syncTurnHint();
    document.documentElement.classList.remove("webgl-book");
    document.documentElement.removeAttribute("data-chapter");
    syncControls();
    updateBirthdayWish();
  }

  function renderPage(animate) {
    if (state.page < 0) {
      renderLetterPage();
      return;
    }
    markTurned();
    if (state.page >= pages.length) {
      renderEndPage();
      return;
    }
    var item = pages[state.page];
    if (!item) return;
    var n = zh() ? "zh" : "en";
    var ch = item.chapter;
    document.getElementById("chapter-header").innerHTML =
      "<h2 class=\"" + n + "\">" + esc(zh() ? ch.titleZh : ch.titleEn) + "</h2>" +
      "<p class=\"" + n + "\">" + esc(zh() ? ch.introZh : ch.introEn) + "</p>";
    var box = document.getElementById("book-page");
    box.classList.remove("is-turn-next", "is-turn-prev", "is-letter", "is-end");
    box.innerHTML = '<div class="stack">' + item.photos.map(function (ph, i) {
      var cap = zh() ? ph.captionZh : ph.captionEn;
      var note = zh() ? ph.noteZh : ph.noteEn;
      return '<article class="card">' +
        '<img src="' + esc(asset(ph.src)) + '" alt="' + esc(cap) + '" data-i="' + i + '" />' +
        (cap ? "<h3 class=\"" + n + "\">" + esc(cap) + "</h3>" : "") +
        (note ? "<p class=\"" + n + "\">" + esc(note) + "</p>" : "") +
        "</article>";
    }).join("") + "</div>";
    document.getElementById("swipe-hint").textContent = t("swipeHint");
    syncTurnHint();
    syncControls();
    document.documentElement.setAttribute("data-chapter", ch.id || "");
    updateBirthdayWish();
    if (glBook && glBook.ready) {
      document.documentElement.classList.add("webgl-book");
      if (animate !== "gl-keep") glBook.show(item, pages[state.page + 1] || null, helpers());
      if (glBook.prefetch) {
        glBook.prefetch(pages[state.page + 2] || null, helpers());
        glBook.prefetch(pages[state.page - 1] || null, helpers());
      }
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

  function syncTurnHint() {
    var el = document.getElementById("swipe-hint");
    if (!el) return;
    var seen = false;
    try { seen = sessionStorage.getItem("claire-my-love-turned") === "1"; } catch (e) {}
    el.hidden = seen;
    el.setAttribute("aria-hidden", seen ? "true" : "false");
  }

  function markTurned() {
    try { sessionStorage.setItem("claire-my-love-turned", "1"); } catch (e) {}
    syncTurnHint();
  }

  function go(i, animate) {
    if (glBook && glBook.busy) return;
    if (i < -1 || i > pages.length || i === state.page) return;
    if (state.page < 0 || i < 0 || state.page >= pages.length || i >= pages.length) {
      state.page = i;
      renderPage(false);
      return;
    }
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
    var n = zh() ? "zh" : "en";
    document.getElementById("lightbox-img").src = asset(ph.src);
    var cap = document.getElementById("lightbox-caption");
    cap.textContent = zh() ? (ph.captionZh || "") : (ph.captionEn || "");
    cap.className = n;
    var note = document.getElementById("lightbox-note");
    if (note) {
      note.textContent = zh() ? (ph.noteZh || "") : (ph.noteEn || "");
      note.className = n;
      note.hidden = !note.textContent;
    }
    box.hidden = false;
  }
  function closeLightbox() {
    document.getElementById("lightbox").hidden = true;
  }

  function bindAlbumTurn() {
    var stage = document.getElementById("book-stage");
    var prev = document.getElementById("btn-prev");
    var next = document.getElementById("btn-next");
    var swipe = null;
    var skipClick = false;
    stage.addEventListener("touchstart", function (e) {
      var t = e.changedTouches && e.changedTouches[0];
      if (!t) return;
      var fromUi = e.target && e.target.closest && e.target.closest("button, a, select, input, label");
      swipe = { x: t.clientX, y: t.clientY, fromUi: !!fromUi };
    }, { passive: true });
    stage.addEventListener("touchend", function (e) {
      var start = swipe;
      swipe = null;
      if (!start || start.fromUi || state.view !== "album") return;
      var t = e.changedTouches && e.changedTouches[0];
      if (!t) return;
      var dx = t.clientX - start.x;
      var dy = t.clientY - start.y;
      if (Math.abs(dx) < 56 || Math.abs(dx) < Math.abs(dy) * 1.15) return;
      skipClick = true;
      if (dx < 0) {
        if (state.page < 0) go(0, true);
        else if (state.page < pages.length) go(state.page + 1, true);
      } else {
        if (state.page === 0) go(-1, true);
        else go(state.page - 1, true);
      }
    }, { passive: true });
    stage.addEventListener("click", function (e) {
      if (skipClick) { skipClick = false; return; }
      if (state.view !== "album") return;
      if (e.target && e.target.closest && e.target.closest("button, a, select, input, label")) return;
      var r = stage.getBoundingClientRect();
      var x = e.clientX - r.left;
      if (x < r.width * 0.28) {
        if (state.page < 0) return;
        go(state.page - 1, true);
        return;
      }
      if (x > r.width * 0.72) {
        if (state.page < 0) {
          go(0, true);
          return;
        }
        go(state.page + 1, true);
        return;
      }
      var img = e.target.closest ? e.target.closest("#book-page img") : null;
      if (!img) return;
      var item = pages[state.page];
      if (item) openLightbox(item.photos[Number(img.dataset.i)]);
    });
    prev.addEventListener("click", function () {
      go(state.page - 1, true);
    });
    next.addEventListener("click", function () {
      go(state.page < 0 ? 0 : state.page + 1, true);
    });
    var jump = document.getElementById("page-jump");
    if (jump && !jump._bound) {
      jump._bound = true;
      jump.addEventListener("change", function () {
        var v = jump.value;
        if (v === "letter") {
          state.page = -1;
          open("album");
          return;
        }
        if (v === "end") {
          state.page = pages.length;
          open("album");
          return;
        }
        var i = Number(v);
        if (glBook && glBook.busy) {
          jump.value = state.page < 0 ? "letter" : String(state.page);
          return;
        }
        if (state.view !== "album" || state.page < 0) {
          state.page = i;
          open("album");
          return;
        }
        go(i, true);
      });
    }
  }

  var MOTIF_FX = {
    tomato: ["🍅", "♥", "🍅", "✦", "♥", "🍅"],
    pepper: ["🫑", "✦", "·", "🫑", "✧", "·"],
    eggplant: ["🍆", "✦", "·", "✧", "🍆"],
    dog: ["🐕", "♥", "🐕", "♡", "✦", "🐕"],
    maple: ["🍁", "🍂", "🍁", "✿", "🍂", "🍁", "🍂"],
    flower: ["🌸", "✿", "❀", "🌼", "✦", "✿"],
    mist: ["✦", "✧", "·", "✦", "✧"],
    star: ["✦", "✧", "·", "♥", "✦"]
  };
  var foundKinds = {};
  var lastDog = 0;
  var wishOnce = false;

  function goldPageIndex() {
    for (var i = 0; i < pages.length; i++) {
      var photos = pages[i].photos || [];
      for (var j = 0; j < photos.length; j++) {
        if (/x-gold/.test(photos[j].src || "")) return i;
      }
    }
    return -1;
  }

  function fillChapterStrip() {
    var strip = document.getElementById("chapter-strip");
    if (!strip) return;
    var n = zh() ? "zh" : "en";
    if (strip.dataset.lang !== state.lang || !strip.childNodes.length) {
      strip.innerHTML = "";
      strip.dataset.lang = state.lang;
      function chip(label, key) {
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "chapter-chip";
        btn.dataset.key = key;
        btn.textContent = label;
        btn.onclick = function () {
          if (key === "letter") {
            state.page = -1;
            open("album");
            return;
          }
          if (key === "end") {
            state.page = pages.length;
            open("album");
            return;
          }
          var i = Number(key);
          if (state.view !== "album" || state.page < 0 || state.page >= pages.length) {
            state.page = i;
            open("album");
            return;
          }
          go(i, true);
        };
        strip.appendChild(btn);
      }
      chip(zh() ? "信" : "Letter", "letter");
      var idx = 0;
      data.chapters.forEach(function (ch) {
        chip(zh() ? ch.titleZh : ch.titleEn, String(idx));
        idx += (ch.pages || []).length;
      });
      chip(zh() ? "封底" : "End", "end");
    }
    var active = "letter";
    if (state.page >= pages.length) active = "end";
    else if (state.page >= 0) {
      var start = 0;
      data.chapters.forEach(function (ch) {
        var count = (ch.pages || []).length;
        if (state.page >= start && state.page < start + count) active = String(start);
        start += count;
      });
    }
    strip.querySelectorAll(".chapter-chip").forEach(function (btn) {
      btn.classList.toggle("is-on", btn.dataset.key === active);
      btn.className = "chapter-chip" + (btn.dataset.key === active ? " is-on" : "") + " " + n;
    });
    var onChip = strip.querySelector(".chapter-chip.is-on");
    if (onChip && onChip.scrollIntoView) {
      onChip.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
    }
  }

  function fillPageJump() {
    var sel = document.getElementById("page-jump");
    if (!sel) return;
    var current = state.page < 0 ? "letter" : (state.page >= pages.length ? "end" : String(state.page));
    if (sel.dataset.lang === state.lang && sel.options.length && sel.options[0] && sel.options[0].value === "letter" && sel.options[sel.options.length - 1].value === "end") {
      sel.value = current;
      sel.className = "page-jump " + (zh() ? "zh" : "en");
      return;
    }
    sel.dataset.lang = state.lang;
    sel.innerHTML = "";
    var letter = document.createElement("option");
    letter.value = "letter";
    letter.textContent = zh() ? "信 · 我们的故事" : "Letter · Our Story";
    sel.appendChild(letter);
    var idx = 0;
    data.chapters.forEach(function (ch) {
      var group = document.createElement("optgroup");
      group.label = zh() ? ch.titleZh : ch.titleEn;
      (ch.pages || []).forEach(function (pg) {
        var opt = document.createElement("option");
        opt.value = String(idx);
        var cap = pg.photos && pg.photos[0] ? (zh() ? pg.photos[0].captionZh : pg.photos[0].captionEn) : "";
        opt.textContent = (idx + 1) + (cap ? " · " + cap : "");
        group.appendChild(opt);
        idx += 1;
      });
      sel.appendChild(group);
    });
    var endOpt = document.createElement("option");
    endOpt.value = "end";
    endOpt.textContent = zh() ? "封底" : "The last page";
    sel.appendChild(endOpt);
    sel.value = current;
    sel.className = "page-jump " + (zh() ? "zh" : "en");
    sel.setAttribute("aria-label", zh() ? "选页" : "Jump to page");
  }

  function syncControls() {
    var n = zh() ? "zh" : "en";
    var prev = document.getElementById("btn-prev");
    var next = document.getElementById("btn-next");
    if (!prev || !next) return;
    prev.textContent = t("prev");
    next.textContent = t("next");
    prev.className = "ctrl " + n;
    next.className = "ctrl " + n;
    prev.disabled = state.page < 0;
    next.disabled = onEnd();
    fillPageJump();
    fillChapterStrip();
    syncNav();
  }

  function syncNav() {
    document.querySelectorAll("#nav button").forEach(function (btn) {
      var v = btn.dataset.view;
      var on = false;
      if (v === "cover") on = state.view === "cover";
      else if (v === "story") on = state.view === "album" && state.page < 0;
      else if (v === "album") on = state.view === "album" && state.page >= 0 && state.page < pages.length;
      btn.classList.toggle("active", on);
    });
  }

  function spawnBits(kind, x, y, extra) {
    var host = document.getElementById("motif-bits") || document.getElementById("leaves");
    if (!host) return;
    var glyphs = MOTIF_FX[kind] || ["✦"];
    var count = glyphs.length + (extra || 0);
    for (var i = 0; i < count; i++) {
      var angle = (Math.PI * 2 * i) / count + (Math.random() * 0.4 - 0.2);
      var dist = 28 + Math.random() * 42;
      if (kind === "mist" && i < 3) {
        var ring = document.createElement("span");
        ring.className = "motif-ring";
        ring.style.left = x + "px";
        ring.style.top = y + "px";
        ring.style.animationDelay = (i * 0.04) + "s";
        host.appendChild(ring);
        window.setTimeout(function (node) { node.remove(); }, 1400, ring);
        continue;
      }
      var bit = document.createElement("span");
      bit.className = "motif-bit is-" + kind;
      bit.textContent = glyphs[i % glyphs.length];
      bit.style.left = x + "px";
      bit.style.top = y + "px";
      bit.style.setProperty("--mx", Math.round(Math.cos(angle) * dist) + "px");
      bit.style.setProperty("--my", Math.round(Math.sin(angle) * dist - (kind === "maple" ? -40 : 36)) + "px");
      bit.style.setProperty("--d", (i * 0.04) + "s");
      bit.style.setProperty("--sz", (0.72 + Math.random() * 0.45) + "rem");
      host.appendChild(bit);
      window.setTimeout(function (node) { node.remove(); }, 1800, bit);
    }
  }

  function showerStars() {
    spawnBits("star", window.innerWidth / 2, window.innerHeight * 0.38, 14);
  }

  function showWish() {
    if (wishOnce) return;
    wishOnce = true;
    var el = document.getElementById("wish-toast");
    if (!el) return;
    var text = el.querySelector(".wish-text");
    if (text) {
      text.textContent = zh() ? "大宝，我在。" : "Da Bao, I am here.";
      text.className = "wish-text " + (zh() ? "zh" : "en");
    }
    el.hidden = false;
    el.classList.remove("is-on");
    void el.offsetWidth;
    el.classList.add("is-on");
    el.setAttribute("aria-hidden", "false");
    showerStars();
    window.setTimeout(function () {
      el.hidden = true;
      el.classList.remove("is-on");
      el.setAttribute("aria-hidden", "true");
    }, 3200);
  }

  function bindMotifs() {
    var row = document.getElementById("motif-row");
    if (!row || row._bound) return;
    row._bound = true;
    row.addEventListener("click", function (e) {
      var motif = e.target.closest && e.target.closest(".motif");
      if (!motif) return;
      dismissHint();
      var kind = motif.getAttribute("data-kind") || "star";
      motif.classList.remove("is-pop");
      void motif.offsetWidth;
      motif.classList.add("is-pop");
      motif.classList.add("is-found");
      var r = motif.getBoundingClientRect();
      spawnBits(kind, r.left + r.width / 2, r.top + r.height / 2);
      if (kind === "dog") {
        var now = Date.now();
        if (now - lastDog < 1100) {
          var gold = goldPageIndex();
          if (gold >= 0) {
            if (state.view !== "album") {
              state.page = gold;
              open("album");
            } else {
              go(gold, true);
            }
          }
        }
        lastDog = now;
      }
      foundKinds[kind] = true;
      if (Object.keys(foundKinds).length >= 7) {
        window.setTimeout(showWish, 280);
      }
    });
  }

  function sprinkleStars() {
    var root = document.getElementById("star-field");
    if (!root || root.childNodes.length) return;
    for (var i = 0; i < 28; i++) {
      var el = document.createElement("span");
      if (i % 7 === 0) {
        el.className = "is-glyph";
        el.textContent = "✦";
      }
      el.style.left = Math.random() * 100 + "%";
      el.style.top = Math.random() * 100 + "%";
      el.style.setProperty("--s", (1 + Math.random() * 2.4) + "px");
      el.style.setProperty("--d", (Math.random() * 7) + "s");
      el.style.setProperty("--dur", (2.2 + Math.random() * 3.6) + "s");
      root.appendChild(el);
    }
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
    var langBtn = document.getElementById("btn-lang");
    if (langBtn) {
      langBtn.onclick = function () { setLang(zh() ? "en" : "zh"); };
    }
    var musicBtn = document.getElementById("btn-music");
    if (musicBtn) {
      musicBtn.onclick = function () { toggleMusic(); };
    }
    document.querySelectorAll("#nav button").forEach(function (btn) {
      btn.onclick = function () {
        if (btn.dataset.view === "story") {
          state.page = -1;
          open("album");
          return;
        }
        if (btn.dataset.view === "album") {
          if (state.view === "cover") state.page = -1;
          else if (state.page < 0) state.page = 0;
          else if (state.page >= pages.length) state.page = pages.length - 1;
          else state.page = Math.min(state.page, pages.length - 1);
          open("album");
          return;
        }
        open(btn.dataset.view);
      };
    });
    var seeUs = document.getElementById("btn-see-us");
    if (seeUs) {
      seeUs.onclick = function () {
        state.page = 0;
        open("album");
      };
    }
    document.getElementById("lightbox-close").onclick = closeLightbox;
    document.getElementById("lightbox").onclick = function (e) {
      if (e.target.id === "lightbox") closeLightbox();
    };
    (function () {
      var box = document.getElementById("lightbox");
      var startY = null;
      box.addEventListener("touchstart", function (e) {
        var t = e.changedTouches && e.changedTouches[0];
        startY = t ? t.clientY : null;
      }, { passive: true });
      box.addEventListener("touchend", function (e) {
        var t = e.changedTouches && e.changedTouches[0];
        if (startY == null || !t) return;
        if (t.clientY - startY > 72) closeLightbox();
        startY = null;
      }, { passive: true });
    })();
    document.addEventListener("keydown", function (e) {
      var tag = e.target && e.target.tagName;
      if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return;
      if (!document.getElementById("lightbox").hidden) {
        if (e.key === "Escape") closeLightbox();
        return;
      }
      if (state.view !== "album") return;
      if (e.key === "ArrowLeft") {
        if (state.page === 0) go(-1, true);
        else go(state.page - 1, true);
      }
      if (e.key === "ArrowRight") {
        if (state.page < 0) go(0, true);
        else if (state.page < pages.length) go(state.page + 1, true);
      }
    });
    var host = document.getElementById("book-gl");
    if (window.ClaireWebGLBook && host) {
      glBook = window.ClaireWebGLBook.mount(host);
    }
    bindAlbumTurn();
    bindMotifs();
    sprinkleStars();
    fillPageJump();
    setLang(state.lang);
    syncMotifHint();
    open("cover");
    window.ClaireAlbum = { open: open, go: go };
  }

  sprinkleLeaves();
  if (unlocked()) {
    reveal();
    boot();
    startBgm();
  } else {
    bindGate();
  }
})();
