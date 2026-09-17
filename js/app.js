(function () {
  "use strict";

  function attach(src, onload, onerror) {
    var s = document.createElement("script");
    s.src = src;
    s.async = false;
    if (onload) s.onload = onload;
    if (onerror) s.onerror = onerror;
    (document.body || document.documentElement).appendChild(s);
    return s;
  }

  var loaded = false;
  function ok() { loaded = true; }

  attach(
    "https://cdn.jsdelivr.net/gh/cqrsyt/for-claire-my-love@7aad0d602fda7812033b2bced3fb661b03b09df1/js/app.js",
    ok,
    function () {
      if (loaded) return;
      attach("https://cdn.jsdelivr.net/gh/cqrsyt/for-claire-my-love@7aad0d6/js/app.js", ok);
    }
  );
})();
