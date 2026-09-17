(function(){
  function run(){
    var parts = window.__CLAIRE_APP_B64 || [];
    var s = parts.join("");
    var code = atob(s);
    var el = document.createElement("script");
    el.text = code;
    document.head.appendChild(el);
  }
  var n = 5;
  var loaded = 0;
  for (var i = 0; i < n; i++) {
    (function(i){
      var s = document.createElement("script");
      s.src = "js/app.b64." + i + ".js?v=31";
      s.onload = function(){ loaded++; if (loaded === n) run(); };
      s.onerror = function(){ console.error("failed b64 part", i); };
      document.head.appendChild(s);
    })(i);
  }
})();
