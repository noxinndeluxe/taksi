/* =============================================================
   TAKSİ ÇAĞIR – DEMO MODU
   firebase-config.js doldurulmamışsa (veya adrese ?demo=1 eklenirse)
   sayfalar Firebase yerine bu sahte altyapıyla çalışır.
   Veriler sadece bu tarayıcıda (localStorage) tutulur; aynı tarayıcıda
   açılan yolcu / durak / yönetim sekmeleri birbirini canlı görür.
   Demo girişleri (panel.html):  admin@demo.com / 123456   ·   durak@demo.com / 123456
   ============================================================= */
(function () {
  "use strict";
  var KEY = "taksi_demo_db", UKEY = "taksi_demo_users";
  var now = function () { return Date.now(); };
  var rnd = function () { return Math.random().toString(36).slice(2, 10); };
  var clone = function (v) { return v == null ? null : JSON.parse(JSON.stringify(v)); };

  function seed() {
    var t = now();
    return {
      adminler: { "demo-admin": true },
      kullanicilar: { "demo-durak-user": { durakId: "demo-durak", eposta: "durak@demo.com", olusturma: t } },
      duraklar: { "demo-durak": { ad: "Konaklı Taksi (Demo)", telefon: "0242 000 00 00", aktif: true, olusturma: t } },
      noktalar: { "demo-durak": {
        n1: { ad: "Noxinn Deluxe Hotel – Lobi", aciklama: "Ana giriş", olusturma: t, ucretler: {
          u00: { hedef: "Konaklı Merkez", ucret: 250, sira: 0 },
          u01: { hedef: "Alanya Merkez / Kleopatra", ucret: 600, sira: 1 },
          u02: { hedef: "Gazipaşa Havalimanı (GZP)", ucret: 2200, sira: 2 },
          u03: { hedef: "Antalya Havalimanı (AYT)", ucret: 4500, sira: 3 } } },
        n2: { ad: "Konaklı Çarşı", olusturma: t }
      } },
      araclar: { "demo-durak": {
        "07ABC123": { plaka: "07 ABC 123", sofor: "Ahmet Yılmaz", son: t },
        "07TK4567": { plaka: "07 TK 4567", sofor: "Mehmet Kaya", son: t - 1000 }
      } }
    };
  }
  function seedUsers() {
    return {
      "admin@demo.com": { uid: "demo-admin", pw: "123456" },
      "durak@demo.com": { uid: "demo-durak-user", pw: "123456" }
    };
  }
  function load() {
    try { var s = localStorage.getItem(KEY); if (s) return JSON.parse(s) || {}; } catch (e) {}
    var d = seed(); try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) {}
    return d;
  }
  function loadUsers() {
    try { var s = localStorage.getItem(UKEY); if (s) return JSON.parse(s) || {}; } catch (e) {}
    var u = seedUsers(); try { localStorage.setItem(UKEY, JSON.stringify(u)); } catch (e) {}
    return u;
  }
  var tree = load();

  /* ---------- Veri ağacı ---------- */
  function parts(p) { return String(p || "").split("/").filter(Boolean); }
  function getAt(p) {
    var n = tree, ks = parts(p);
    for (var i = 0; i < ks.length; i++) { if (n == null || typeof n !== "object") return null; n = n[ks[i]]; }
    return n === undefined ? null : n;
  }
  function resolve(v) {
    if (v && typeof v === "object") {
      if (v[".sv"] === "timestamp") return now();
      var o = {}, any = false;
      for (var k in v) { var r = resolve(v[k]); if (r !== null && r !== undefined) { o[k] = r; any = true; } }
      return any ? o : null;
    }
    return v === undefined ? null : v;
  }
  function prune(n) {
    if (!n || typeof n !== "object") return n;
    for (var k in n) {
      if (n[k] && typeof n[k] === "object") { prune(n[k]); if (!Object.keys(n[k]).length) delete n[k]; }
    }
    return n;
  }
  function setAt(p, v) {
    v = resolve(v);
    var ks = parts(p);
    if (!ks.length) { tree = v || {}; return; }
    var n = tree;
    for (var i = 0; i < ks.length - 1; i++) {
      if (n[ks[i]] == null || typeof n[ks[i]] !== "object") n[ks[i]] = {};
      n = n[ks[i]];
    }
    if (v === null) delete n[ks[ks.length - 1]]; else n[ks[ks.length - 1]] = v;
    prune(tree);
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(tree)); } catch (e) {} notify(); }

  /* ---------- Referans / sorgu ---------- */
  function ref(db, path) { var ks = parts(path); return { path: ks.join("/"), key: ks.length ? ks[ks.length - 1] : null }; }
  function query(r) { return { path: r.path, key: r.key, cs: Array.prototype.slice.call(arguments, 1) }; }
  function orderByChild(k) { return { t: "o", k: k }; }
  function startAt(v) { return { t: "s", v: v }; }
  function valueFor(r) {
    if (r.path === ".info/serverTimeOffset") return 0;
    if (r.path === ".info/connected") return true;
    var v = clone(getAt(r.path));
    if (r.cs && v && typeof v === "object") {
      var ok = null, sv = null;
      r.cs.forEach(function (c) { if (c.t === "o") ok = c.k; if (c.t === "s") sv = c.v; });
      if (ok && sv !== null) {
        var o = {};
        for (var k in v) if (v[k] && v[k][ok] >= sv) o[k] = v[k];
        v = Object.keys(o).length ? o : null;
      }
    }
    return v;
  }
  function snap(key, v) {
    var c = clone(v);
    return { key: key, exists: function () { return c !== null; }, val: function () { return clone(c); } };
  }

  var listeners = [];
  function fire(l) {
    var v = valueFor(l.r), s = JSON.stringify(v);
    if (s === l.last) return;
    l.last = s;
    try { l.cb(snap(l.r.key, v)); } catch (e) { console.error(e); }
  }
  function notify() { listeners.slice().forEach(fire); }
  window.addEventListener("storage", function (e) {
    if (e.key === KEY) { tree = load(); notify(); }
  });

  function onValue(r, cb) {
    var l = { r: r, cb: cb, last: undefined };
    listeners.push(l);
    setTimeout(function () { if (listeners.indexOf(l) >= 0) fire(l); }, 0);
    return function () { var i = listeners.indexOf(l); if (i >= 0) listeners.splice(i, 1); };
  }
  function get(r) { return Promise.resolve(snap(r.key, valueFor(r))); }
  function set(r, v) { setAt(r.path, v); save(); return Promise.resolve(); }
  function update(r, obj) {
    for (var k in obj) setAt((r.path ? r.path + "/" : "") + k, obj[k]);
    save(); return Promise.resolve();
  }
  function remove(r) { return set(r, null); }
  function push(r, v) {
    var key = "-D" + now().toString(36) + rnd();
    var child = { path: (r.path ? r.path + "/" : "") + key, key: key };
    var p = v === undefined ? Promise.resolve(child) : set(child, v).then(function () { return child; });
    p.key = key; p.path = child.path;
    return p;
  }
  function runTransaction(r, fn) {
    var res = fn(clone(getAt(r.path)));
    if (res === undefined) return Promise.resolve({ committed: false, snapshot: snap(r.key, getAt(r.path)) });
    setAt(r.path, res); save();
    return Promise.resolve({ committed: true, snapshot: snap(r.key, getAt(r.path)) });
  }
  function serverTimestamp() { return { ".sv": "timestamp" }; }

  /* ---------- Oturum ---------- */
  var auths = {};
  function authKey(name) { return "taksi_demo_auth_" + name + "_" + location.pathname; }
  function initializeApp(cfg, name) { return { name: name || "[DEFAULT]" }; }
  function getDatabase() { return {}; }
  function getAuth(app) {
    var name = (app && app.name) || "[DEFAULT]";
    if (!auths[name]) {
      var u = null; try { u = JSON.parse(localStorage.getItem(authKey(name))); } catch (e) {}
      auths[name] = { name: name, currentUser: u, subs: [] };
    }
    return auths[name];
  }
  function setUser(a, u) {
    a.currentUser = u;
    try { if (u) localStorage.setItem(authKey(a.name), JSON.stringify(u)); else localStorage.removeItem(authKey(a.name)); } catch (e) {}
    a.subs.slice().forEach(function (cb) { setTimeout(function () { cb(u); }, 0); });
  }
  function onAuthStateChanged(a, cb) {
    a.subs.push(cb);
    setTimeout(function () { if (a.subs.indexOf(cb) >= 0) cb(a.currentUser); }, 0);
    return function () { var i = a.subs.indexOf(cb); if (i >= 0) a.subs.splice(i, 1); };
  }
  function err(code) { var e = new Error(code); e.code = code; return e; }
  function signInAnonymously(a) {
    var u = { uid: "anon-" + rnd(), isAnonymous: true };
    setUser(a, u); return Promise.resolve({ user: u });
  }
  function signInWithEmailAndPassword(a, email, pw) {
    var users = loadUsers(), r = users[String(email).toLowerCase()];
    if (!r || r.pw !== pw) return Promise.reject(err("auth/invalid-credential"));
    var u = { uid: r.uid, email: String(email).toLowerCase(), isAnonymous: false };
    setUser(a, u); return Promise.resolve({ user: u });
  }
  function createUserWithEmailAndPassword(a, email, pw) {
    var users = loadUsers(), e = String(email).toLowerCase();
    if (users[e]) return Promise.reject(err("auth/email-already-in-use"));
    if (String(pw).length < 6) return Promise.reject(err("auth/weak-password"));
    var uid = "u-" + rnd(); users[e] = { uid: uid, pw: pw };
    localStorage.setItem(UKEY, JSON.stringify(users));
    var u = { uid: uid, email: e, isAnonymous: false };
    setUser(a, u); return Promise.resolve({ user: u });
  }
  function signOut(a) { setUser(a, null); return Promise.resolve(); }
  function deleteUser(u) {
    var users = loadUsers();
    for (var e in users) if (users[e].uid === u.uid) delete users[e];
    localStorage.setItem(UKEY, JSON.stringify(users));
    for (var n in auths) if (auths[n].currentUser && auths[n].currentUser.uid === u.uid) setUser(auths[n], null);
    return Promise.resolve();
  }
  function sendPasswordResetEmail() { return Promise.resolve(); }
  function goOffline() {}
  function goOnline() {}

  /* ---------- Demo şeridi ---------- */
  function reset() {
    if (!confirm("Demo verileri sıfırlansın mı? (Tüm demo çağrıları, duraklar ve kullanıcılar başlangıç haline döner)")) return;
    Object.keys(localStorage).forEach(function (k) { if (k.indexOf("taksi_") === 0) localStorage.removeItem(k); });
    location.reload();
  }
  function banner(extraHtml) {
    var b = document.createElement("div");
    b.style.cssText = "position:fixed;left:10px;bottom:10px;z-index:9999;background:#FFC20E;color:#111;font:600 12px/1.4 system-ui,Arial,sans-serif;padding:8px 10px;border-radius:10px;box-shadow:0 4px 16px rgba(0,0,0,.35);max-width:calc(100vw - 20px);display:flex;gap:10px;align-items:center;flex-wrap:wrap";
    b.innerHTML = "<span>🧪 <b>DEMO MODU</b> · veriler sadece bu tarayıcıda</span>" + (extraHtml ? "<span>" + extraHtml + "</span>" : "") +
      "<button type='button' style='border:1px solid #111;background:#fff;border-radius:6px;padding:3px 8px;font:inherit;cursor:pointer'>Sıfırla</button>";
    b.querySelector("button").onclick = reset;
    document.body.appendChild(b);
  }

  window.DemoFB = {
    initializeApp: initializeApp, getAuth: getAuth, getDatabase: getDatabase,
    onAuthStateChanged: onAuthStateChanged, signInAnonymously: signInAnonymously,
    signInWithEmailAndPassword: signInWithEmailAndPassword, createUserWithEmailAndPassword: createUserWithEmailAndPassword,
    signOut: signOut, deleteUser: deleteUser, sendPasswordResetEmail: sendPasswordResetEmail,
    ref: ref, get: get, set: set, update: update, remove: remove, push: push, onValue: onValue,
    query: query, orderByChild: orderByChild, startAt: startAt, runTransaction: runTransaction,
    serverTimestamp: serverTimestamp, goOffline: goOffline, goOnline: goOnline,
    banner: banner, reset: reset
  };
})();
