"use strict";
var ClaireWebGLNS = (() => {
  var __create = Object.create;
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getProtoOf = Object.getPrototypeOf;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __commonJS = (cb, mod) => function __require() {
    try {
      return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
    } catch (e) {
      throw mod = 0, e;
    }
  };
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
    // If the importer is in node compatibility mode or this is not an ESM
    // file that has been converted to a CommonJS file using a Babel-
    // compatible transform (i.e. "__esModule" has not been set), then set
    // "default" to the CommonJS "module.exports" for node compatibility.
    isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
    mod
  ));
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // ../tmp/three-shim.cjs
  var require_three_shim = __commonJS({
    "../tmp/three-shim.cjs"(exports, module) {
      module.exports = window.THREE;
    }
  });

  // src/lib/webgl-book.ts
  var webgl_book_exports = {};
  __export(webgl_book_exports, {
    mountWebGLBook: () => mountWebGLBook
  });
  var THREE = __toESM(require_three_shim(), 1);
  var TEX_W = 1024;
  var TEX_H = 1376;
  var SEG_X = 42;
  var SEG_Y = 28;
  var CACHE_MAX = 16;
  var DURATION = 1.28;
  var REST_X = 0.03;
  var REST_Y = -0.06;
  var REST_Z = 4e-3;
  var IDLE = 0.048;
  function applyQuality() {
    const mobile = typeof window !== "undefined" && window.innerWidth < 720;
    TEX_W = mobile ? 1280 : 1536;
    TEX_H = mobile ? 1720 : 2064;
    SEG_X = mobile ? 28 : 36;
    SEG_Y = mobile ? 18 : 24;
    CACHE_MAX = mobile ? 8 : 10;
  }
  function easePaper(t) {
    const x = Math.min(1, Math.max(0, t));
    const s = x * x * (3 - 2 * x);
    return s * (1 - 0.1 * Math.sin(x * Math.PI));
  }
  function reducedMotion() {
    return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  }
  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.decoding = "async";
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("img"));
      img.src = src;
    });
  }
  function liftPhoto(img) {
    const iw = Math.max(1, Math.round("width" in img ? Number(img.width) : TEX_W));
    const ih = Math.max(1, Math.round("height" in img ? Number(img.height) : TEX_H));
    const c = document.createElement("canvas");
    c.width = iw;
    c.height = ih;
    const x = c.getContext("2d", { willReadFrequently: true });
    if (!x) return c;
    x.imageSmoothingEnabled = true;
    x.imageSmoothingQuality = "high";
    x.drawImage(img, 0, 0, iw, ih);
    if (typeof window !== "undefined" && window.innerWidth < 720) return c;
    if (iw * ih > 12e5) return c;
    let data;
    try {
      data = x.getImageData(0, 0, iw, ih);
    } catch {
      return c;
    }
    const px = data.data;
    let sum = 0;
    let n = 0;
    for (let i = 0; i < px.length; i += 48) {
      sum += 0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2];
      n += 1;
    }
    const avg = sum / Math.max(1, n);
    const gain = avg < 18 ? 2.2 : avg < 168 ? Math.min(2.2, 168 / Math.max(avg, 14)) : 1;
    if (gain > 1.04) {
      for (let i = 0; i < px.length; i += 4) {
        px[i] = Math.min(255, px[i] * gain);
        px[i + 1] = Math.min(255, px[i + 1] * gain);
        px[i + 2] = Math.min(255, px[i + 2] * gain);
      }
      x.putImageData(data, 0, 0);
    }
    return c;
  }
  function roundImage(ctx, img, x, y, w, h, r) {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
    ctx.clip();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, x, y, w, h);
    ctx.restore();
  }
  function wrapText(ctx, text, x, y, maxW, lineH, maxLines) {
    const chars = String(text);
    let line = "";
    let n = 0;
    for (let i = 0; i < chars.length; i++) {
      const test = line + chars[i];
      if (ctx.measureText(test).width > maxW && line) {
        ctx.fillText(line, x, y + n * lineH);
        line = chars[i];
        n += 1;
        if (n >= maxLines) {
          ctx.fillText("\u2026", x, y + n * lineH);
          return;
        }
      } else {
        line = test;
      }
    }
    if (line) ctx.fillText(line, x, y + n * lineH);
  }
  function sharpMap(tex) {
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.generateMipmaps = false;
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.anisotropy = 1;
    tex.needsUpdate = true;
    return tex;
  }
  function paintPaper(ctx) {
    ctx.fillStyle = "#fffefb";
    ctx.fillRect(0, 0, TEX_W, TEX_H);
    const g = ctx.createLinearGradient(0, 0, 56, 0);
    g.addColorStop(0, "rgba(197,208,220,0.07)");
    g.addColorStop(1, "rgba(254,252,248,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 56, TEX_H);
    ctx.fillStyle = "rgba(197,208,220,0.05)";
    ctx.fillRect(TEX_W - 18, 0, 18, TEX_H);
    ctx.save();
    ctx.strokeStyle = "rgba(210,218,226,0.22)";
    ctx.lineWidth = 2;
    ctx.strokeRect(40, 40, TEX_W - 80, TEX_H - 80);
    ctx.strokeStyle = "rgba(210,218,226,0.1)";
    ctx.lineWidth = 1;
    ctx.strokeRect(48, 48, TEX_W - 96, TEX_H - 96);
    ctx.restore();
    ctx.save();
    ctx.globalAlpha = 0.12;
    ctx.font = '28px "Ma Shan Zheng", KaiTi, serif';
    ctx.fillStyle = "#8a97a6";
    ctx.fillText("\u{1F345}", 36, 64);
    ctx.fillText("\u{1F341}", TEX_W - 70, 70);
    ctx.fillText("\u{1F415}", 40, TEX_H - 48);
    ctx.fillText("\u{1F338}", TEX_W - 72, TEX_H - 52);
    ctx.restore();
    ctx.save();
    ctx.globalAlpha = 0.08;
    for (let i = 0; i < 52; i++) {
      const x = (i * 97 + 41) % TEX_W;
      const y = (i * 173 + 29) % TEX_H;
      ctx.fillStyle = i % 3 === 0 ? "#8a97a6" : "#c5d0dc";
      ctx.fillRect(x, y, i % 5 === 0 ? 2 : 1, 1);
    }
    ctx.restore();
  }
  function pageKey(item, zh) {
    if (!item || !item.photos.length) return zh ? "paper-zh" : "paper-en";
    return (zh ? "zh|" : "en|") + item.photos.map((p) => p.src).join(",");
  }
  async function composePage(item, helpers) {
    const canvas = document.createElement("canvas");
    canvas.width = TEX_W;
    canvas.height = TEX_H;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("2d");
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    paintPaper(ctx);
    try {
      if (document.fonts?.load) {
        const sample = "\u5199\u7ED9\u79CB\u7136 Claire";
        await Promise.race([
          Promise.all([
            document.fonts.load('64px "Ma Shan Zheng"', sample),
            document.fonts.load('italic 48px "Cormorant Garamond"', sample),
            document.fonts.ready
          ]),
          new Promise((resolve) => window.setTimeout(resolve, 1200))
        ]);
      }
    } catch {
    }
    const photos = item?.photos ?? [];
    const scale = TEX_W / 1024;
    const pad = Math.round(64 * scale);
    const innerW = TEX_W - pad * 2;
    const top = Math.round(72 * scale);
    const bottom = Math.round(78 * scale);
    const available = TEX_H - top - bottom;
    const n = Math.max(1, photos.length);
    const gap = Math.round(28 * scale);
    const slotH = n === 1 ? available * 0.9 : (available - gap * (n - 1)) / n;
    const zh = helpers.zh();
    for (let i = 0; i < photos.length; i++) {
      const ph = photos[i];
      const y0 = top + i * (slotH + gap);
      const caption = zh ? ph.captionZh : ph.captionEn;
      const note = zh ? ph.noteZh : ph.noteEn;
      const textH = caption || note ? note ? Math.round(118 * scale) : Math.round(64 * scale) : Math.round(18 * scale);
      const maxH = Math.max(Math.round(160 * scale), slotH - textH);
      try {
        const raw = await loadImage(helpers.asset(ph.src));
        const img = liftPhoto(raw);
        const iw = "width" in img ? Number(img.width) : TEX_W;
        const ih = "height" in img ? Number(img.height) : TEX_H;
        const s = Math.min(innerW / iw, maxH / ih);
        const dw = iw * s;
        const dh = ih * s;
        const dx = (TEX_W - dw) / 2;
        const dy = y0 + Math.max(0, (maxH - dh) * 0.28);
        roundImage(ctx, img, dx, dy, dw, dh, Math.round(16 * scale));
        ctx.textAlign = "center";
        ctx.textBaseline = "alphabetic";
        if (caption) {
          ctx.fillStyle = "#5a6570";
          ctx.font = zh ? `${Math.round(40 * scale)}px "Ma Shan Zheng", KaiTi, serif` : `italic ${Math.round(32 * scale)}px "Cormorant Garamond", Georgia, serif`;
          ctx.fillText(caption, TEX_W / 2, dy + dh + Math.round(50 * scale));
        }
        if (note) {
          ctx.fillStyle = "#8a97a6";
          ctx.font = zh ? `${Math.round(26 * scale)}px "Ma Shan Zheng", KaiTi, serif` : `italic ${Math.round(22 * scale)}px "Cormorant Garamond", Georgia, serif`;
          wrapText(
            ctx,
            note,
            TEX_W / 2,
            dy + dh + (caption ? Math.round(88 * scale) : Math.round(52 * scale)),
            innerW - Math.round(24 * scale),
            Math.round(34 * scale),
            2
          );
        }
      } catch {
        ctx.fillStyle = "rgba(197,208,220,0.35)";
        ctx.fillRect(pad, y0, innerW, maxH);
      }
    }
    return sharpMap(new THREE.CanvasTexture(canvas));
  }
  function paperTexture() {
    const canvas = document.createElement("canvas");
    canvas.width = TEX_W;
    canvas.height = TEX_H;
    const ctx = canvas.getContext("2d");
    paintPaper(ctx);
    ctx.save();
    ctx.globalAlpha = 0.2;
    ctx.fillStyle = "#9aa8b8";
    ctx.font = '36px "Ma Shan Zheng", KaiTi, serif';
    ctx.textAlign = "center";
    ctx.fillText("\u5199\u7ED9\u79CB\u7136", TEX_W / 2, TEX_H / 2);
    ctx.restore();
    return sharpMap(new THREE.CanvasTexture(canvas));
  }
  function shadowTexture() {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext("2d");
    const g = ctx.createLinearGradient(0, 0, 256, 0);
    g.addColorStop(0, "rgba(138, 155, 176, 0.28)");
    g.addColorStop(0.32, "rgba(138, 155, 176, 0.1)");
    g.addColorStop(0.72, "rgba(138, 155, 176, 0.03)");
    g.addColorStop(1, "rgba(138, 155, 176, 0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 64);
    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
  }
  function groundTexture() {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext("2d");
    const g = ctx.createRadialGradient(128, 128, 8, 128, 128, 118);
    g.addColorStop(0, "rgba(168, 181, 196, 0.16)");
    g.addColorStop(0.4, "rgba(168, 181, 196, 0.06)");
    g.addColorStop(1, "rgba(168, 181, 196, 0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 256);
    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
  }
  function edgeTexture() {
    const canvas = document.createElement("canvas");
    canvas.width = 24;
    canvas.height = 256;
    const ctx = canvas.getContext("2d");
    for (let x = 0; x < 24; x++) {
      ctx.fillStyle = x % 2 === 0 ? "#e8edf3" : "#f6f2ea";
      ctx.fillRect(x, 0, 1, 256);
    }
    return sharpMap(new THREE.CanvasTexture(canvas));
  }
  function backFrom(front) {
    const canvas = document.createElement("canvas");
    canvas.width = TEX_W;
    canvas.height = TEX_H;
    const ctx = canvas.getContext("2d");
    paintPaper(ctx);
    ctx.fillStyle = "rgba(232, 237, 243, 0.55)";
    ctx.fillRect(0, 0, 22, TEX_H);
    for (let y = 96; y < TEX_H - 80; y += 42) {
      ctx.fillStyle = "rgba(197, 208, 220, 0.22)";
      ctx.fillRect(64, y, TEX_W - 128, 2);
    }
    return sharpMap(new THREE.CanvasTexture(canvas));
  }
  function deform(geo, progress) {
    const pos = geo.attributes.position;
    const orig = geo.userData.orig;
    const W = geo.userData.W;
    const H = geo.userData.H;
    const t = Math.min(1.08, Math.max(0, progress));
    const fold = Math.min(1, t);
    const thetaMax = fold * Math.PI;
    const bulge = Math.sin(fold * Math.PI);
    const halfH = H * 0.5;
    for (let i = 0; i < pos.count; i++) {
      const ox = orig[i * 3];
      const oy = orig[i * 3 + 1];
      const u = Math.min(1, Math.max(0, ox / W));
      let theta = thetaMax * Math.pow(u, 0.64);
      theta *= 1 + 0.22 * bulge * (oy / halfH);
      const lift = bulge * 0.078 * W * Math.sin(u * Math.PI);
      const wave = bulge * 0.012 * W * Math.sin(oy / halfH * Math.PI) * Math.sin(u * Math.PI);
      pos.setXYZ(i, ox * Math.cos(theta), oy, ox * Math.sin(theta) + lift + wave);
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
  }
  function mountWebGLBook(container) {
    if (typeof window === "undefined") return null;
    applyQuality();
    const canvas = document.createElement("canvas");
    const glOpts = { alpha: true, antialias: true, premultipliedAlpha: true };
    const context = canvas.getContext("webgl2", glOpts) || canvas.getContext("webgl", glOpts);
    if (!context) return null;
    const renderer = new THREE.WebGLRenderer({
      canvas,
      context,
      alpha: true,
      antialias: true,
      powerPreference: "high-performance"
    });
    renderer.setPixelRatio(Math.min(2.25, window.devicePixelRatio || 1));
    renderer.setClearColor(16644853, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NoToneMapping;
    canvas.className = "book-gl-canvas";
    canvas.setAttribute("aria-hidden", "true");
    canvas.style.pointerEvents = "none";
    canvas.style.position = "absolute";
    canvas.style.inset = "0";
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.zIndex = "4";
    canvas.style.display = "block";
    canvas.style.opacity = "0";
    canvas.style.transition = "opacity 0.55s cubic-bezier(0.22, 1, 0.36, 1)";
    container.appendChild(canvas);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(30, 1, 0.05, 20);
    const book = new THREE.Group();
    scene.add(book);
    scene.add(new THREE.HemisphereLight(16776182, 14147303, 0.52));
    scene.add(new THREE.AmbientLight(16775924, 0.58));
    const key = new THREE.DirectionalLight(16775408, 0.36);
    key.position.set(0.55, 0.9, 1.15);
    scene.add(key);
    const fill = new THREE.DirectionalLight(15002353, 0.18);
    fill.position.set(-0.85, 0.28, 0.75);
    scene.add(fill);
    const rim = new THREE.DirectionalLight(16777215, 0.1);
    rim.position.set(-0.15, 0.35, -1.05);
    scene.add(rim);
    const curlLight = new THREE.PointLight(16774890, 0, 2.8, 1.7);
    scene.add(curlLight);
    let W = 1;
    let H = 1.28;
    const geo = new THREE.PlaneGeometry(1, 1, SEG_X, SEG_Y);
    const underGeo = new THREE.PlaneGeometry(1, 1, 1, 1);
    const backGeo = new THREE.PlaneGeometry(1, 1, SEG_X, SEG_Y);
    const paper = paperTexture();
    const frontMat = new THREE.MeshBasicMaterial({
      map: paper,
      side: THREE.FrontSide,
      toneMapped: false
    });
    const backMat = new THREE.MeshBasicMaterial({
      map: paper,
      color: 16776697,
      side: THREE.BackSide,
      toneMapped: false
    });
    const underMat = new THREE.MeshBasicMaterial({
      map: paper,
      toneMapped: false
    });
    const stackMat = new THREE.MeshBasicMaterial({
      color: 16776697,
      toneMapped: false
    });
    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTexture(),
      transparent: true,
      opacity: 0,
      depthWrite: false,
      toneMapped: false
    });
    const edgeMat = new THREE.MeshBasicMaterial({
      map: edgeTexture(),
      toneMapped: false
    });
    const flip = new THREE.Mesh(geo, frontMat);
    const flipBack = new THREE.Mesh(geo, backMat);
    const under = new THREE.Mesh(underGeo, underMat);
    under.position.z = -6e-3;
    const shade = new THREE.Mesh(underGeo, shadowMat);
    shade.position.z = -28e-4;
    const stack = new THREE.Mesh(backGeo.clone(), stackMat);
    stack.position.set(0.012, -0.01, -0.018);
    const spine = new THREE.Mesh(
      new THREE.BoxGeometry(0.03, 1, 0.04),
      new THREE.MeshBasicMaterial({
        color: 15659766,
        toneMapped: false
      })
    );
    const edge = new THREE.Mesh(new THREE.BoxGeometry(0.015, 1, 0.05), edgeMat);
    const groundMat = new THREE.MeshBasicMaterial({
      map: groundTexture(),
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
      toneMapped: false
    });
    const ground = new THREE.Mesh(new THREE.CircleGeometry(0.72, 40), groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(0.52, -0.7, 0.01);
    const fadeMat = new THREE.MeshBasicMaterial({
      map: paper,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      toneMapped: false
    });
    const fadeMesh = new THREE.Mesh(underGeo, fadeMat);
    fadeMesh.position.z = 2e-3;
    fadeMesh.visible = false;
    book.add(stack, under, shade, flipBack, flip, fadeMesh, spine, edge);
    const cache = /* @__PURE__ */ new Map();
    const backCache = /* @__PURE__ */ new Map();
    let disposed = false;
    let raf = 0;
    let progress = 0;
    let last = 0;
    let peekTarget = 0;
    let peekCurrent = 0;
    let wantArrive = false;
    let dragging = false;
    let dragDir = "next";
    let hintOn = true;
    let idlePhase = 0;
    const api = {
      ready: true,
      busy: false
    };
    function layoutGeometry() {
      geo.copy(new THREE.PlaneGeometry(W, H, SEG_X, SEG_Y));
      geo.translate(W / 2, 0, 0);
      const orig = geo.attributes.position.array.slice(0);
      geo.userData.orig = orig;
      geo.userData.W = W;
      geo.userData.H = H;
      underGeo.copy(new THREE.PlaneGeometry(W, H, 1, 1));
      underGeo.translate(W / 2, 0, 0);
      stack.geometry.dispose();
      stack.geometry = new THREE.PlaneGeometry(W, H, 1, 1);
      stack.geometry.translate(W / 2, 0, 0);
      stack.position.set(0.01, -0.012, -0.02);
      spine.geometry.dispose();
      spine.geometry = new THREE.BoxGeometry(0.028, H * 0.96, 0.05);
      spine.position.set(-0.012, 0, -0.01);
      edge.geometry.dispose();
      edge.geometry = new THREE.BoxGeometry(0.016, H * 0.97, 0.052);
      edge.position.set(W + 8e-3, -4e-3, -0.024);
      ground.position.set(W * 0.52, -H * 0.52, 0.02);
      ground.scale.set(W * 1.08, 1, 0.42);
      deform(geo, progress);
    }
    function frameCamera() {
      const rect = container.getBoundingClientRect();
      const width = Math.max(1, rect.width);
      const height = Math.max(1, rect.height);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      W = 1;
      H = TEX_H / TEX_W;
      layoutGeometry();
      camera.fov = 30;
      const vFov = camera.fov * Math.PI / 180;
      const pad = 1.06;
      const distH = H * 0.5 * pad / Math.tan(vFov / 2);
      const distW = W * 0.5 * pad / (Math.tan(vFov / 2) * camera.aspect);
      const dist = Math.max(distH, distW);
      camera.position.set(W * 0.46, 0.08, dist);
      camera.lookAt(W * 0.5, -0.02, 0);
      camera.updateProjectionMatrix();
      if (!api.busy) book.rotation.set(REST_X, REST_Y, REST_Z);
    }
    function renderOnce() {
      deform(geo, progress);
      renderer.render(scene, camera);
    }
    function stopLoop() {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    }
    function applyShade(ridge) {
      const k = Math.sin(Math.min(1, Math.max(0, ridge)) * Math.PI);
      shadowMat.opacity = 0.26 * k;
      shade.scale.set(0.22 + 0.78 * k, 1, 1);
      curlLight.intensity = 0.85 * k;
      curlLight.position.set(
        W * Math.cos(ridge * Math.PI) * 0.58,
        H * 0.12,
        W * Math.sin(ridge * Math.PI) * 0.72
      );
    }
    async function texFor(item, helpers) {
      const k = pageKey(item, helpers.zh());
      const hit = cache.get(k);
      if (hit) return hit;
      const made = await composePage(item, helpers);
      cache.set(k, made);
      if (cache.size > CACHE_MAX) {
        for (const [key2, tex] of cache) {
          if (tex === frontMat.map || tex === underMat.map || tex === backMat.map) continue;
          tex.dispose();
          cache.delete(key2);
          const bk = "back|" + key2;
          backCache.get(bk)?.dispose();
          backCache.delete(bk);
          if (cache.size <= CACHE_MAX) break;
        }
      }
      return made;
    }
    function setMaps(front, underMap, frontKey) {
      frontMat.map = front;
      frontMat.needsUpdate = true;
      underMat.map = underMap;
      underMat.needsUpdate = true;
      const bk = "back|" + frontKey;
      let back = backCache.get(bk);
      if (!back) {
        back = backFrom(front);
        backCache.set(bk, back);
      }
      backMat.map = back;
      backMat.needsUpdate = true;
    }
    function restPose() {
      book.rotation.set(REST_X, REST_Y, REST_Z);
      curlLight.intensity = 0;
      shadowMat.opacity = 0;
      shade.scale.set(1, 1, 1);
    }
    function lerpRest(fromX, fromY, ms) {
      return new Promise((resolve) => {
        const start = performance.now();
        const tick = (now) => {
          if (disposed) {
            resolve();
            return;
          }
          const k = Math.min(1, (now - start) / ms);
          const s = 1 - (1 - k) * (1 - k);
          book.rotation.x = fromX + (REST_X - fromX) * s;
          book.rotation.y = fromY + (REST_Y - fromY) * s;
          renderer.render(scene, camera);
          if (k < 1) raf = requestAnimationFrame(tick);
          else {
            raf = 0;
            resolve();
          }
        };
        raf = requestAnimationFrame(tick);
      });
    }
    function tickPeek() {
      if (disposed || api.busy || dragging) {
        raf = 0;
        return;
      }
      if (hintOn && peekTarget <= IDLE + 2e-3) {
        idlePhase += 0.018;
        peekTarget = IDLE + 0.016 * (0.5 + 0.5 * Math.sin(idlePhase));
      }
      peekCurrent += (peekTarget - peekCurrent) * 0.16;
      if (Math.abs(peekTarget - peekCurrent) < 15e-4) peekCurrent = peekTarget;
      progress = peekCurrent;
      deform(geo, progress);
      const k = Math.min(1, progress / 0.18);
      shadowMat.opacity = 0.14 * k;
      shade.scale.set(0.35 + 0.4 * k, 1, 1);
      curlLight.intensity = 0.55 * k;
      curlLight.position.set(W * 0.78, H * 0.1, 0.14);
      renderer.render(scene, camera);
      raf = requestAnimationFrame(tickPeek);
    }
    function startHint() {
      if (disposed || reducedMotion()) return;
      hintOn = true;
      peekTarget = IDLE;
      if (!raf) raf = requestAnimationFrame(tickPeek);
    }
    function animateProgress(from, to, ms) {
      return new Promise((resolve) => {
        const start = performance.now();
        const tick = (now) => {
          if (disposed) {
            resolve();
            return;
          }
          const k = Math.min(1, (now - start) / ms);
          const e = easePaper(k);
          progress = from + (to - from) * e;
          deform(geo, progress);
          const ridge = Math.min(1, dragDir === "next" ? progress : 1 - progress);
          applyShade(ridge);
          const bounce = Math.sin(e * Math.PI);
          book.rotation.y = REST_Y + bounce * (dragDir === "next" ? -0.14 : 0.12);
          renderer.render(scene, camera);
          if (k < 1) raf = requestAnimationFrame(tick);
          else {
            raf = 0;
            resolve();
          }
        };
        raf = requestAnimationFrame(tick);
      });
    }
    function fadeIn(from, to, ms) {
      return new Promise((resolve) => {
        fadeMesh.visible = true;
        const start = performance.now();
        const tick = (now) => {
          if (disposed) {
            resolve();
            return;
          }
          const k = Math.min(1, (now - start) / ms);
          const s = 1 - (1 - k) * (1 - k);
          fadeMat.opacity = from + (to - from) * s;
          renderer.render(scene, camera);
          if (k < 1) raf = requestAnimationFrame(tick);
          else {
            raf = 0;
            resolve();
          }
        };
        raf = requestAnimationFrame(tick);
      });
    }
    api.show = async (current, next, helpers) => {
      if (disposed) return;
      document.documentElement.classList.add("webgl-book");
      canvas.style.transition = "opacity 0.55s cubic-bezier(0.22, 1, 0.36, 1)";
      canvas.style.opacity = "1";
      if (api.busy) return;
      const [front, underTex] = await Promise.all([
        texFor(current, helpers),
        texFor(next, helpers)
      ]);
      if (disposed) return;
      stopLoop();
      progress = 0;
      peekTarget = 0;
      peekCurrent = 0;
      const hadPage = frontMat.map != null && frontMat.map !== paper;
      if (hadPage && !reducedMotion()) {
        fadeMat.map = front;
        fadeMat.needsUpdate = true;
        fadeMat.opacity = 0;
        await fadeIn(0, 1, 420);
        if (disposed) return;
        setMaps(front, underTex, pageKey(current, helpers.zh()));
        fadeMat.opacity = 0;
        fadeMesh.visible = false;
        applyShade(0);
        restPose();
        progress = IDLE;
        peekCurrent = IDLE;
        peekTarget = IDLE;
        deform(geo, progress);
        renderOnce();
        startHint();
      } else {
        setMaps(front, underTex, pageKey(current, helpers.zh()));
        applyShade(0);
        canvas.style.opacity = "1";
        progress = IDLE;
        peekCurrent = IDLE;
        if (wantArrive && !reducedMotion()) {
          wantArrive = false;
          book.rotation.set(REST_X + 0.06, REST_Y - 0.1, REST_Z);
          deform(geo, progress);
          renderOnce();
          await lerpRest(book.rotation.x, book.rotation.y, 720);
        } else {
          restPose();
          deform(geo, progress);
          renderOnce();
        }
        startHint();
      }
    };
    api.flip = async (from, to, dir, helpers, underPage) => {
      if (disposed) return;
      document.documentElement.classList.add("webgl-book");
      if (reducedMotion()) {
        await api.show(to, underPage, helpers);
        return;
      }
      api.busy = true;
      peekTarget = 0;
      peekCurrent = 0;
      try {
        const reveal = dir === "next" ? to : from;
        const frontItem = dir === "next" ? from : to;
        const [front, underTex] = await Promise.all([
          texFor(frontItem, helpers),
          texFor(reveal, helpers)
        ]);
        if (disposed) return;
        setMaps(front, underTex, pageKey(frontItem, helpers.zh()));
        const fromP = dir === "next" ? 0 : 1;
        const toP = dir === "next" ? 1 : 0;
        progress = fromP;
        deform(geo, progress);
        last = performance.now();
        const start = last;
        const rock = dir === "next" ? -0.22 : 0.2;
        await new Promise((resolve) => {
          const tick = (now) => {
            if (disposed) {
              resolve();
              return;
            }
            const dt = Math.min(0.1, (now - last) / 1e3);
            last = now;
            const t = Math.min(1, (now - start) / (DURATION * 1e3) || dt);
            const e = easePaper(t);
            progress = fromP + (toP - fromP) * e;
            deform(geo, progress);
            const bounce = Math.sin(e * Math.PI);
            const kick = Math.sin(e * Math.PI * 2) * 0.035;
            book.rotation.y = REST_Y + bounce * rock + kick;
            book.rotation.x = REST_X + bounce * 0.085;
            const ridge = dir === "next" ? Math.min(1, progress) : Math.min(1, 1 - progress);
            applyShade(ridge);
            renderer.render(scene, camera);
            if (t < 1) {
              raf = requestAnimationFrame(tick);
            } else {
              raf = 0;
              resolve();
            }
          };
          raf = requestAnimationFrame(tick);
        });
        progress = 0;
        const [restFront, restUnder] = await Promise.all([
          texFor(to, helpers),
          texFor(underPage, helpers)
        ]);
        if (disposed) return;
        setMaps(restFront, restUnder, pageKey(to, helpers.zh()));
        const y0 = book.rotation.y;
        const x0 = book.rotation.x;
        applyShade(0);
        deform(geo, IDLE);
        canvas.style.opacity = "1";
        await lerpRest(x0, y0, 280);
        restPose();
        progress = IDLE;
        peekCurrent = IDLE;
        peekTarget = IDLE;
        deform(geo, progress);
        renderer.render(scene, camera);
      } catch {
        progress = 0;
        restPose();
        deform(geo, 0);
        try {
          await api.show(to, underPage, helpers);
        } catch {
          document.documentElement.classList.add("webgl-book");
          renderOnce();
        }
      } finally {
        api.busy = false;
        startHint();
      }
    };
    api.peek = (amount) => {
      if (disposed || api.busy || dragging || reducedMotion()) return;
      peekTarget = amount > 0.01 ? Math.min(0.2, amount) : IDLE;
      if (!raf) raf = requestAnimationFrame(tickPeek);
    };
    api.beginDrag = async (dir, current, other, helpers) => {
      if (disposed || api.busy || reducedMotion()) return;
      dragging = true;
      dragDir = dir;
      hintOn = false;
      stopLoop();
      const frontItem = dir === "next" ? current : other;
      const reveal = dir === "next" ? other : current;
      const [front, underTex] = await Promise.all([
        texFor(frontItem, helpers),
        texFor(reveal, helpers)
      ]);
      if (disposed || !dragging) return;
      setMaps(front, underTex, pageKey(frontItem, helpers.zh()));
      progress = dir === "next" ? IDLE : 1 - IDLE;
      peekCurrent = progress;
      deform(geo, progress);
      renderOnce();
    };
    api.dragTo = (amount) => {
      if (disposed || !dragging) return;
      const t = Math.max(0, Math.min(1, amount));
      progress = dragDir === "next" ? Math.max(IDLE, t) : Math.min(1 - IDLE, 1 - t);
      peekCurrent = progress;
      deform(geo, progress);
      const ridge = dragDir === "next" ? progress : 1 - progress;
      applyShade(ridge);
      book.rotation.y = REST_Y + Math.sin(ridge * Math.PI) * (dragDir === "next" ? -0.16 : 0.14);
      renderer.render(scene, camera);
    };
    api.endDrag = async (helpers, to, under2) => {
      if (disposed || !dragging) return false;
      dragging = false;
      const commit = dragDir === "next" ? progress > 0.3 : progress < 0.7;
      if (!commit) {
        const back = dragDir === "next" ? IDLE : 1 - IDLE;
        await animateProgress(progress, back, 320);
        restPose();
        progress = IDLE;
        peekCurrent = IDLE;
        startHint();
        return false;
      }
      if (!to) return true;
      api.busy = true;
      const finish = dragDir === "next" ? 1 : 0;
      await animateProgress(progress, finish, 480);
      if (disposed) return false;
      const [front, underTex] = await Promise.all([
        texFor(to, helpers),
        texFor(under2, helpers)
      ]);
      setMaps(front, underTex, pageKey(to, helpers.zh()));
      restPose();
      progress = IDLE;
      peekCurrent = IDLE;
      peekTarget = IDLE;
      deform(geo, progress);
      canvas.style.opacity = "1";
      renderOnce();
      api.busy = false;
      startHint();
      return true;
    };
    api.close = async () => {
      if (disposed) return;
      api.busy = true;
      dragging = false;
      hintOn = false;
      stopLoop();
      const start = performance.now();
      const y0 = book.rotation.y;
      const x0 = book.rotation.x;
      const p0 = progress || IDLE;
      canvas.style.transition = "none";
      await new Promise((resolve) => {
        const tick = (now) => {
          if (disposed) {
            resolve();
            return;
          }
          const t = Math.min(1, (now - start) / 780);
          const e = easePaper(t);
          progress = p0 + (0.22 - p0) * e;
          book.rotation.y = y0 + (-1.08 - y0) * e;
          book.rotation.x = x0 + (0.1 - x0) * e;
          canvas.style.opacity = String(1 - e);
          deform(geo, progress);
          applyShade(progress);
          renderer.render(scene, camera);
          if (t < 1) raf = requestAnimationFrame(tick);
          else {
            raf = 0;
            resolve();
          }
        };
        raf = requestAnimationFrame(tick);
      });
      document.documentElement.classList.remove("webgl-book");
      restPose();
      progress = 0;
      api.busy = false;
    };
    api.arrive = () => {
      wantArrive = true;
    };
    api.resize = () => {
      if (disposed) return;
      frameCamera();
      renderOnce();
    };
    api.prefetch = (item, helpers) => {
      if (disposed || !item) return;
      void texFor(item, helpers);
    };
    api.destroy = () => {
      disposed = true;
      document.documentElement.classList.remove("webgl-book");
      stopLoop();
      cache.forEach((tex) => tex.dispose());
      cache.clear();
      backCache.forEach((tex) => tex.dispose());
      backCache.clear();
      geo.dispose();
      underGeo.dispose();
      frontMat.dispose();
      backMat.dispose();
      underMat.dispose();
      stackMat.dispose();
      shadowMat.dispose();
      edgeMat.dispose();
      fadeMat.dispose();
      groundMat.dispose();
      paper.dispose();
      renderer.dispose();
      canvas.remove();
    };
    frameCamera();
    renderOnce();
    const ro = new ResizeObserver(() => api.resize());
    ro.observe(container);
    const originalDestroy = api.destroy;
    api.destroy = () => {
      ro.disconnect();
      originalDestroy();
    };
    return api;
  }
  return __toCommonJS(webgl_book_exports);
})();
window.ClaireWebGLBook={mount:function(el){return ClaireWebGLNS.mountWebGLBook(el);}};
