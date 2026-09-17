(function () {
  "use strict";

  var phone = false;
  try {
    phone = window.matchMedia && window.matchMedia("(max-width: 720px)").matches;
  } catch (e) {}

  if (phone) {
    var append = document.head.appendChild.bind(document.head);
    document.head.appendChild = function (node) {
      if (node && node.src && /three\.min\.js|webgl-book\.js/.test(node.src || "")) {
        return node;
      }
      return append(node);
    };
  }

  var style = document.createElement("style");
  style.textContent =
    ".cover-open-wrap{position:relative;z-index:12;margin:1.05rem 0 0;pointer-events:auto}" +
    ".cover-open-wrap .btn-open{min-width:12rem;min-height:48px;pointer-events:auto}" +
    ".letter-go{margin:.7rem 0 1rem}" +
    ".letter-go .btn{min-width:12rem}" +
    "@media (max-width:720px){.music-vol-wrap{display:none!important}}";
  document.head.appendChild(style);

  function placeOpen() {
    var btn = document.getElementById("btn-open");
    var book = document.getElementById("cover-book");
    if (!btn || !book) return;
    if (btn.parentElement && btn.parentElement.classList.contains("cover-open-wrap")) return;
    var cover = book.parentElement && book.parentElement.parentElement;
    if (!cover) return;
    var wrap = document.createElement("p");
    wrap.className = "cover-open-wrap";
    if (btn.parentNode) btn.parentNode.removeChild(btn);
    wrap.appendChild(btn);
    cover.appendChild(wrap);
  }

  function placeSeeUs() {
    var see = document.getElementById("btn-see-us");
    var greet = document.querySelector(".letter-greet");
    if (!see || !greet) return;
    if (see.parentElement && see.parentElement.classList.contains("letter-go")) return;
    var wrap = document.createElement("p");
    wrap.className = "center letter-go";
    greet.parentNode.insertBefore(wrap, greet.nextSibling);
    wrap.appendChild(see);
  }

  function tick() {
    placeOpen();
    placeSeeUs();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", tick);
  } else {
    tick();
  }
  setInterval(tick, 400);
})();
