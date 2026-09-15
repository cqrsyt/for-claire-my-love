(function (root) {
  "use strict";

  var TEX_W = 1024;
  var TEX_H = 1376;
  var SEG_X = 42;
  var SEG_Y = 28;
  var DURATION = 1.08;

  function easePaper(t) {
    var x = Math.min(1, Math.max(0, t));
    return x * x * (3 - 2 * x) * (1 - 0.12 * Math.sin(x * Math.PI));
  }

  function reducedMotion() {
    return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function canWebGL() {
    try {
      var c = document.createElement("canvas");
      return !!(c.getContext("webgl2") || c.getContext("webgl"));
    } catch (e) {
      return false;
    }
  }

  function loadImage(src) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = function () { resolve(img); };
      img.onerror = function () { reject(new Error("img")); };
      img.src = src;
    });
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
    ctx.drawImage(img, x, y, w, h);
    ctx.restore();
  }

  function wrapText(ctx, text, x, y, maxW, lineH, maxLines) {
    var chars = String(text);
    var line = "";
    var n = 0;
    var i;
    for (i = 0; i < chars.length; i++) {
      var test = line + chars[i];
      if (ctx.measureText(test).width > maxW && line) {
        ctx.fillText(line, x, y + n * lineH);
        line = chars[i];
        n += 1;
        if (n >= maxLines) {
          ctx.fillText("…", x, y + n * lineH);
          return;
        }
      } else {
        line = test;
      }
    }
    if (line) ctx.fillText(line, x, y + n * lineH);
  }

  function paintPaper(ctx) {
    ctx.fillStyle = "#fefcf8";
    ctx.fillRect(0, 0, TEX_W, TEX_H);
    var g = ctx.createLinearGradient(0, 0, 56, 0);
    g.addColorStop(0, "rgba(197,208,220,0.07)");
    g.addColorStop(1, "rgba(254,252,248,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 56, TEX_H);
    ctx.fillStyle = "rgba(197,208,220,0.05)";
    ctx.fillRect(TEX_W - 18, 0, 18, TEX_H);
    ctx.save();
    ctx.strokeStyle = "rgba(184,195,208,0.32)";
    ctx.lineWidth = 2;
    ctx.strokeRect(40, 40, TEX_W - 80, TEX_H - 80);
    ctx.strokeStyle = "rgba(184,195,208,0.16)";
    ctx.lineWidth = 1;
    ctx.strokeRect(48, 48, TEX_W - 96, TEX_H - 96);
    ctx.restore();
    ctx.save();
    ctx.globalAlpha = 0.12;
    ctx.font = '28px "Ma Shan Zheng", KaiTi, serif';
    ctx.fillStyle = "#8a97a6";
    ctx.fillText("🍅", 36, 64);
    ctx.fillText("🍁", TEX_W - 70, 70);
    ctx.fillText("🐕", 40, TEX_H - 48);
    ctx.fillText("🌸", TEX_W - 72, TEX_H - 52);
    ctx.restore();
  }

  function pageKey(item, zh) {
    if (!item || !item.photos || !item.photos.length) return zh ? "paper-zh" : "paper-en";
    return (zh ? "zh|" : "en|") + item.photos.map(function (p) { return p.src; }).join(",");
  }

  function composePage(THREE, item, helpers) {
    var canvas = document.createElement("canvas");
    canvas.width = TEX_W;
    canvas.height = TEX_H;
    var ctx = canvas.getContext("2d");
    paintPaper(ctx);
    var ready = Promise.resolve();
    if (document.fonts && document.fonts.load) {
      ready = Promise.all([
        document.fonts.load('40px "Ma Shan Zheng"'),
        document.fonts.load('italic 32px "Cormorant Garamond"')
      ]).catch(function () {});
    } else if (document.fonts && document.fonts.ready) {
      ready = document.fonts.ready.catch(function () {});
    }
    return ready.then(function () {
      var photos = (item && item.photos) || [];
      var pad = 78;
      var innerW = TEX_W - pad * 2;
      var top = 88;
      var available = TEX_H - top - 90;
      var n = Math.max(1, photos.length);
      var gap = 32;
      var slotH = n === 1 ? available * 0.86 : (available - gap * (n - 1)) / n;
      var zh = helpers.zh();
      var chain = Promise.resolve();
      photos.forEach(function (ph, i) {
        chain = chain.then(function () {
          var y0 = top + i * (slotH + gap);
          var caption = zh ? ph.captionZh : ph.captionEn;
          var note = zh ? ph.noteZh : ph.noteEn;
          var textH = caption || note ? (note ? 118 : 64) : 18;
          var maxH = Math.max(160, slotH - textH);
          return loadImage(helpers.asset(ph.src)).then(function (img) {
            var s = Math.min(innerW / img.width, maxH / img.height);
            var dw = img.width * s;
            var dh = img.height * s;
            var dx = (TEX_W - dw) / 2;
            var dy = y0 + Math.max(0, (maxH - dh) * 0.35);
            roundImage(ctx, img, dx, dy, dw, dh, 18);
            ctx.textAlign = "center";
            ctx.textBaseline = "alphabetic";
            if (caption) {
              ctx.fillStyle = "#3a4450";
              ctx.font = zh
                ? '40px "Ma Shan Zheng", KaiTi, serif'
                : 'italic 32px "Cormorant Garamond", Georgia, serif';
              ctx.fillText(caption, TEX_W / 2, dy + dh + 50);
            }
            if (note) {
              ctx.fillStyle = "#8a97a6";
              ctx.font = zh
                ? '26px "Ma Shan Zheng", KaiTi, serif'
                : 'italic 22px "Cormorant Garamond", Georgia, serif';
              wrapText(ctx, note, TEX_W / 2, dy + dh + (caption ? 88 : 52), innerW - 24, 34, 2);
            }
          }).catch(function () {
            ctx.fillStyle = "rgba(197,208,220,0.35)";
            ctx.fillRect(pad, y0, innerW, maxH);
          });
        });
      });
      return chain;
    }).then(function () {
      var tex = new THREE.CanvasTexture(canvas);
      if (THREE.SRGBColorSpace) tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 8;
      tex.needsUpdate = true;
      return tex;
    });
  }

  function paperTexture(THREE) {
    var canvas = document.createElement("canvas");
    canvas.width = TEX_W;
    canvas.height = TEX_H;
    var ctx = canvas.getContext("2d");
    paintPaper(ctx);
    ctx.save();
    ctx.globalAlpha = 0.2;
    ctx.fillStyle = "#9aa8b8";
    ctx.font = '36px "Ma Shan Zheng", KaiTi, serif';
    ctx.textAlign = "center";
    ctx.fillText("写给秋然", TEX_W / 2, TEX_H / 2);
    ctx.restore();
    var tex = new THREE.CanvasTexture(canvas);
    if (THREE.SRGBColorSpace) tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    return tex;
  }

  function deform(geo, progress) {
    var pos = geo.attributes.position;
    var orig = geo.userData.orig;
    var W = geo.userData.W;
    var H = geo.userData.H;
    var t = Math.min(1, Math.max(0, progress));
    var thetaMax = t * Math.PI;
    var bulge = Math.sin(t * Math.PI);
    var halfH = H * 0.5;
    var i, ox, oy, u, theta, lift;
    for (i = 0; i < pos.count; i++) {
      ox = orig[i * 3];
      oy = orig[i * 3 + 1];
      u = Math.min(1, Math.max(0, ox / W));
      theta = thetaMax * Math.pow(u, 0.68);
      theta *= 1 + 0.14 * bulge * (oy / halfH);
      lift = bulge * 0.045 * W * Math.sin(u * Math.PI);
      pos.setXYZ(i, ox * Math.cos(theta), oy, ox * Math.sin(theta) + lift);
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
  }

  function mount(container) {
    var THREE = root.THREE;
    if (!THREE || !container || !canWebGL()) return null;

    var canvas = document.createElement("canvas");
    var glOpts = { alpha: true, antialias: true, premultipliedAlpha: true };
    var context = canvas.getContext("webgl2", glOpts) || canvas.getContext("webgl", glOpts);
    if (!context) return null;
    var renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      context: context,
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.setClearColor(0x000000, 0);
    if (THREE.SRGBColorSpace) renderer.outputColorSpace = THREE.SRGBColorSpace;
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
    container.appendChild(canvas);

    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(30, 1, 0.05, 20);
    var book = new THREE.Group();
    scene.add(book);
    scene.add(new THREE.HemisphereLight(0xfffbf6, 0xf4f6f9, 1.35));
    scene.add(new THREE.AmbientLight(0xfffaf4, 1.15));
    var key = new THREE.DirectionalLight(0xffffff, 1.15);
    key.position.set(0.35, 0.95, 1.45);
    scene.add(key);
    var fill = new THREE.DirectionalLight(0xffffff, 0.72);
    fill.position.set(-0.7, 0.4, 0.95);
    scene.add(fill);
    var curlLight = new THREE.PointLight(0xfff8f0, 0.0, 3.4, 2);
    scene.add(curlLight);

    var W = 1;
    var H = 1.28;
    var geo = new THREE.PlaneGeometry(1, 1, SEG_X, SEG_Y);
    var underGeo = new THREE.PlaneGeometry(1, 1, 1, 1);
    var paper = paperTexture(THREE);
    var frontMat = new THREE.MeshBasicMaterial({
      map: paper, side: THREE.FrontSide, toneMapped: false,
    });
    var backMat = new THREE.MeshBasicMaterial({
      color: 0xfaf6ef, side: THREE.BackSide, toneMapped: false,
    });
    var underMat = new THREE.MeshBasicMaterial({
      map: paper, toneMapped: false,
    });
    var stackMat = new THREE.MeshBasicMaterial({
      color: 0xf7f3ec, toneMapped: false,
    });
    var flip = new THREE.Mesh(geo, frontMat);
    var flipBack = new THREE.Mesh(geo, backMat);
    var under = new THREE.Mesh(underGeo, underMat);
    under.position.z = -0.006;
    var stackGeo = new THREE.PlaneGeometry(1, 1, 1, 1);
    var stack = new THREE.Mesh(stackGeo, stackMat);
    stack.position.set(0.012, -0.01, -0.018);
    var spine = new THREE.Mesh(
      new THREE.BoxGeometry(0.03, 1, 0.04),
      new THREE.MeshBasicMaterial({ color: 0xc5d0dc, toneMapped: false })
    );
    book.add(stack);
    book.add(under);
    book.add(flipBack);
    book.add(flip);
    book.add(spine);

    var cache = {};
    var cacheOrder = [];
    var disposed = false;
    var busy = false;
    var raf = 0;
    var progress = 0;
    var last = 0;

    function layoutGeometry() {
      geo.copy(new THREE.PlaneGeometry(W, H, SEG_X, SEG_Y));
      geo.translate(W / 2, 0, 0);
      geo.userData.orig = geo.attributes.position.array.slice(0);
      geo.userData.W = W;
      geo.userData.H = H;
      underGeo.copy(new THREE.PlaneGeometry(W, H, 1, 1));
      underGeo.translate(W / 2, 0, 0);
      stack.geometry.dispose();
      stack.geometry = new THREE.PlaneGeometry(W, H, 1, 1);
      stack.geometry.translate(W / 2, 0, 0);
      spine.geometry.dispose();
      spine.geometry = new THREE.BoxGeometry(0.028, H * 0.96, 0.05);
      spine.position.set(-0.012, 0, -0.01);
      deform(geo, progress);
    }

    function frameCamera() {
      var rect = container.getBoundingClientRect();
      var width = Math.max(1, rect.width);
      var height = Math.max(1, rect.height);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      W = 1;
      H = TEX_H / TEX_W;
      layoutGeometry();
      camera.fov = 28;
      var vFov = (camera.fov * Math.PI) / 180;
      var pad = 1.05;
      var distH = (H * 0.5 * pad) / Math.tan(vFov / 2);
      var distW = (W * 0.5 * pad) / (Math.tan(vFov / 2) * camera.aspect);
      var dist = Math.max(distH, distW);
      camera.position.set(W * 0.5, 0, dist);
      camera.lookAt(W * 0.5, 0, 0);
      camera.updateProjectionMatrix();
      book.rotation.set(0.02, -0.03, 0);
    }

    function renderOnce() {
      deform(geo, progress);
      renderer.render(scene, camera);
    }

    function stopLoop() {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    }

    function texFor(item, helpers) {
      var k = pageKey(item, helpers.zh());
      if (cache[k]) return Promise.resolve(cache[k]);
      return composePage(THREE, item, helpers).then(function (made) {
        cache[k] = made;
        cacheOrder.push(k);
        if (cacheOrder.length > 10) {
          var first = cacheOrder.shift();
          if (first && first !== k && cache[first]) {
            cache[first].dispose();
            delete cache[first];
          }
        }
        return made;
      });
    }

    function setMaps(front, underMap) {
      frontMat.map = front;
      frontMat.needsUpdate = true;
      underMat.map = underMap;
      underMat.needsUpdate = true;
      backMat.map = paper;
      backMat.needsUpdate = true;
    }

    var api = {
      ready: true,
      get busy() { return busy; },
      show: function (current, next, helpers) {
        if (disposed) return Promise.resolve();
        stopLoop();
        busy = false;
        progress = 0;
        return Promise.all([texFor(current, helpers), texFor(next, helpers)]).then(function (pair) {
          if (disposed) return;
          setMaps(pair[0], pair[1]);
          book.rotation.set(0.02, -0.03, 0);
          curlLight.intensity = 0;
          renderOnce();
        });
      },
      flip: function (from, to, dir, helpers, underPage) {
        if (disposed) return Promise.resolve();
        if (reducedMotion()) return api.show(to, underPage, helpers);
        busy = true;
        var reveal = dir === "next" ? to : from;
        var sheet = dir === "next" ? from : to;
        return Promise.all([texFor(sheet, helpers), texFor(reveal, helpers)]).then(function (pair) {
          if (disposed) { busy = false; return; }
          setMaps(pair[0], pair[1]);
          var fromP = dir === "next" ? 0 : 1;
          var toP = dir === "next" ? 1 : 0;
          progress = fromP;
          deform(geo, progress);
          last = performance.now();
          var start = last;
          var rock = dir === "next" ? -0.16 : 0.14;
          return new Promise(function (resolve) {
            function tick(now) {
              if (disposed) { resolve(); return; }
              last = now;
              var t = Math.min(1, (now - start) / (DURATION * 1000));
              var e = easePaper(t);
              progress = fromP + (toP - fromP) * e;
              deform(geo, progress);
              book.rotation.y = -0.03 + Math.sin(e * Math.PI) * rock;
              book.rotation.x = 0.02 + Math.sin(e * Math.PI) * 0.05;
              var ridge = dir === "next" ? progress : 1 - progress;
              curlLight.intensity = 0.55 * Math.sin(ridge * Math.PI);
              curlLight.position.set(
                W * Math.cos(ridge * Math.PI) * 0.55,
                H * 0.15,
                W * Math.sin(ridge * Math.PI) * 0.7
              );
              renderer.render(scene, camera);
              if (t < 1) raf = requestAnimationFrame(tick);
              else { raf = 0; resolve(); }
            }
            raf = requestAnimationFrame(tick);
          });
        }).then(function () {
          progress = 0;
          return Promise.all([texFor(to, helpers), texFor(underPage, helpers)]);
        }).then(function (pair) {
          if (disposed) { busy = false; return; }
          setMaps(pair[0], pair[1]);
          book.rotation.set(0.02, -0.03, 0);
          curlLight.intensity = 0;
          deform(geo, 0);
          renderer.render(scene, camera);
          busy = false;
        }).catch(function () {
          busy = false;
        });
      },
      resize: function () {
        if (disposed) return;
        frameCamera();
        renderOnce();
      },
      destroy: function () {
        disposed = true;
        stopLoop();
        Object.keys(cache).forEach(function (k) { cache[k].dispose(); });
        geo.dispose();
        underGeo.dispose();
        frontMat.dispose();
        backMat.dispose();
        underMat.dispose();
        stackMat.dispose();
        paper.dispose();
        renderer.dispose();
        canvas.remove();
      },
    };

    frameCamera();
    renderOnce();
    var ro = null;
    if (window.ResizeObserver) {
      ro = new ResizeObserver(function () { api.resize(); });
      ro.observe(container);
    } else {
      window.addEventListener("resize", api.resize);
    }
    var originalDestroy = api.destroy;
    api.destroy = function () {
      if (ro) ro.disconnect();
      else window.removeEventListener("resize", api.resize);
      originalDestroy();
    };
    document.documentElement.classList.add("webgl-book");
    return api;
  }

  root.ClaireWebGLBook = { mount: mount };
})(window);
