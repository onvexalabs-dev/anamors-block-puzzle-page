// Language auto-detection (German/English) with manual override.
(function () {
  var root = document.documentElement;
  root.classList.add("js");
  function pick() {
    var q = new URLSearchParams(location.search).get("lang");
    if (q === "de" || q === "en") return q;
    try {
      var s = localStorage.getItem("abp-lang");
      if (s === "de" || s === "en") return s;
    } catch (e) {}
    var n = (navigator.language || "en").toLowerCase();
    return n.indexOf("de") === 0 ? "de" : "en";
  }
  function apply(l) {
    root.classList.remove("lang-en", "lang-de");
    root.classList.add("lang-" + l);
    root.setAttribute("lang", l);
    var bs = document.querySelectorAll(".lang button");
    for (var i = 0; i < bs.length; i++) {
      bs[i].setAttribute("aria-pressed", bs[i].dataset.set === l ? "true" : "false");
    }
    var t = document.querySelector('meta[name="title-' + l + '"]');
    if (t) document.title = t.content;
  }
  apply(pick());
  document.addEventListener("DOMContentLoaded", function () {
    apply(pick());
    var bs = document.querySelectorAll(".lang button");
    for (var i = 0; i < bs.length; i++) {
      bs[i].addEventListener("click", function () {
        var l = this.dataset.set;
        try { localStorage.setItem("abp-lang", l); } catch (e) {}
        apply(l);
      });
    }
  });
})();
