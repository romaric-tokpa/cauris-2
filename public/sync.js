/* ============================================================
   Cauris — couche de synchronisation Turso <-> client
   ------------------------------------------------------------
   Objectif : garder le client d'origine (app.js) intact, mais
   remplacer le stockage localStorage par une persistance serveur.

   Au démarrage :
     1. GET /api/bootstrap  -> { seed, state }
     2. window.MACAISSE = seed         (cycle d'origine)
     3. On remplit localStorage avec l'état serveur (source de vérité)
     4. On "wrappe" localStorage.setItem/removeItem : toute écriture
        d'une clé applicative est répliquée vers Turso (POST/DELETE)
     5. On injecte app.js, qui démarre en lisant l'état déjà en place.

   Correspondance des clés :
     localStorage "macaisse-cycles-v1"  <->  serveur "cycles"
     localStorage "macaisse-m-<id>"      <->  serveur "m-<id>"
   ============================================================ */
(function () {
  "use strict";

  var PREFIX = "macaisse-";
  var CYCLES_LS = "macaisse-cycles-v1";

  // localStorage key -> clé serveur (ou null si non synchronisée)
  function serverKey(lsKey) {
    if (lsKey === CYCLES_LS) return "cycles";
    if (lsKey.indexOf("macaisse-m-") === 0) return "m-" + lsKey.slice("macaisse-m-".length);
    return null; // autres clés macaisse-* héritées : locales uniquement
  }
  function lsKeyFor(srvKey) {
    if (srvKey === "cycles") return CYCLES_LS;
    if (srvKey.indexOf("m-") === 0) return "macaisse-m-" + srvKey.slice(2);
    return null;
  }

  function hideBoot() {
    var b = document.getElementById("cauris-boot");
    if (b) {
      b.classList.add("hide");
      setTimeout(function () {
        if (b.parentNode) b.parentNode.removeChild(b);
      }, 350);
    }
  }
  function fatal(msg) {
    var b = document.getElementById("cauris-boot");
    if (b) {
      b.textContent = msg;
      b.style.color = "#c0392b";
    }
  }

  /* ---------- file d'attente de synchronisation (débounce par clé) ---------- */
  var pending = {}; // srvKey -> "put" | "del"
  var timer = null;
  var inflight = 0;

  function scheduleFlush() {
    if (timer) return;
    timer = setTimeout(flush, 180);
  }

  function flush() {
    timer = null;
    var keys = Object.keys(pending);
    keys.forEach(function (srvKey) {
      var action = pending[srvKey];
      delete pending[srvKey];
      if (action === "del") {
        inflight++;
        fetch("/api/state?key=" + encodeURIComponent(srvKey), {
          method: "DELETE",
          credentials: "same-origin",
          keepalive: true,
        })
          .then(handleAuth)
          .catch(noop)
          .finally(function () {
            inflight--;
          });
      } else {
        var lsKey = lsKeyFor(srvKey);
        var raw = lsKey ? window.__caurisRealGetItem.call(localStorage, lsKey) : null;
        var value = null;
        try {
          value = raw != null ? JSON.parse(raw) : null;
        } catch (e) {
          value = null;
        }
        inflight++;
        fetch("/api/state", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: srvKey, value: value }),
          keepalive: true,
        })
          .then(handleAuth)
          .catch(noop)
          .finally(function () {
            inflight--;
          });
      }
    });
  }

  function handleAuth(res) {
    if (res && res.status === 401) {
      window.location.href = "/login";
    }
    return res;
  }
  function noop() {}

  // Filet de sécurité : forcer un envoi avant fermeture de l'onglet.
  window.addEventListener("beforeunload", function () {
    if (timer) {
      clearTimeout(timer);
      flush();
    }
  });

  /* ---------- wrapping de localStorage ---------- */
  function installStorageProxy() {
    var proto = window.Storage && window.Storage.prototype;
    if (!proto) return;
    window.__caurisRealSetItem = proto.setItem;
    window.__caurisRealGetItem = proto.getItem;
    window.__caurisRealRemoveItem = proto.removeItem;

    proto.setItem = function (key, val) {
      window.__caurisRealSetItem.call(this, key, val);
      if (this === window.localStorage) {
        var sk = serverKey(key);
        if (sk) {
          pending[sk] = "put";
          scheduleFlush();
        }
      }
    };
    proto.removeItem = function (key) {
      window.__caurisRealRemoveItem.call(this, key);
      if (this === window.localStorage) {
        var sk = serverKey(key);
        if (sk) {
          pending[sk] = "del";
          scheduleFlush();
        }
      }
    };
  }

  /* ---------- hydratation ---------- */
  function hydrate(state) {
    // Purge des clés applicatives locales : Turso fait autorité.
    var toRemove = [];
    for (var i = 0; i < localStorage.length; i++) {
      var k = localStorage.key(i);
      if (k && k.indexOf(PREFIX) === 0) toRemove.push(k);
    }
    toRemove.forEach(function (k) {
      window.__caurisRealRemoveItem.call(localStorage, k);
    });

    // Réécriture depuis l'état serveur (sans redéclencher la synchro).
    Object.keys(state || {}).forEach(function (srvKey) {
      var lsKey = lsKeyFor(srvKey);
      if (!lsKey) return;
      var v = state[srvKey];
      if (v == null) return;
      window.__caurisRealSetItem.call(localStorage, lsKey, JSON.stringify(v));
    });
  }

  function injectLogout() {
    var tabs = document.querySelector(".topbar .tabs");
    if (!tabs || document.querySelector(".cauris-logout-tab")) return;
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "cauris-logout-tab";
    btn.title = "Se déconnecter";
    btn.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
      'stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>' +
      '<polyline points="16 17 21 12 16 7"></polyline>' +
      '<line x1="21" y1="12" x2="9" y2="12"></line></svg><span>Déconnexion</span>';
    btn.addEventListener("click", function () {
      btn.disabled = true;
      fetch("/api/logout", { method: "POST", credentials: "same-origin" })
        .catch(noop)
        .finally(function () {
          window.location.href = "/login";
        });
    });
    tabs.appendChild(btn);
  }

  function loadApp() {
    var s = document.createElement("script");
    s.src = "/app.js";
    s.onload = function () {
      injectLogout();
      hideBoot();
    };
    s.onerror = function () {
      fatal("Impossible de charger l'application.");
    };
    document.body.appendChild(s);
  }

  function boot() {
    installStorageProxy();
    fetch("/api/bootstrap", { credentials: "same-origin" })
      .then(function (res) {
        if (res.status === 401) {
          window.location.href = "/login";
          return null;
        }
        if (!res.ok) throw new Error("bootstrap " + res.status);
        return res.json();
      })
      .then(function (data) {
        if (!data) return;
        window.MACAISSE = data.seed;
        hydrate(data.state);
        loadApp();
      })
      .catch(function (err) {
        console.error("[Cauris] bootstrap échoué", err);
        fatal("Connexion aux données impossible. Réessayez.");
      });
  }

  boot();
})();
