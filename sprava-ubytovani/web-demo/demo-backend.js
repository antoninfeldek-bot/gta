"use strict";
/* Webová ukázka: věrný přepis server.py do JavaScriptu.
   Běží celé v prohlížeči, data se ukládají jen do prohlížeče návštěvníka (localStorage).
   Plná verze se serverem a databází je server.py. */
(function () {
  // ------------------------------------------------------------ SHA-256 (sync)
  function sha256(ascii) {
    const K = [], H = [];
    let n = 2, c = 0;
    const isP = x => { for (let i = 2; i * i <= x; i++) if (x % i === 0) return false; return true; };
    while (c < 64) { if (isP(n)) { if (c < 8) H[c] = (Math.pow(n, 1 / 2) * 2 ** 32) | 0; K[c++] = (Math.pow(n, 1 / 3) * 2 ** 32) | 0; } n++; }
    const bytes = new TextEncoder().encode(ascii);
    const l = bytes.length, words = [];
    for (let i = 0; i < l; i++) words[i >> 2] |= bytes[i] << ((3 - (i % 4)) * 8);
    words[l >> 2] |= 0x80 << ((3 - (l % 4)) * 8);
    const total = (((l + 8) >> 6) + 1) * 16;
    for (let i = words.length; i < total; i++) words[i] = words[i] | 0;
    words[total - 1] = l * 8;
    const h = H.slice();
    const r = (x, k) => (x >>> k) | (x << (32 - k));
    for (let j = 0; j < total; j += 16) {
      const w = words.slice(j, j + 16);
      let [a, b, cc, d, e, f, g, hh] = h;
      for (let i = 0; i < 64; i++) {
        if (i >= 16) {
          const w15 = w[i - 15], w2 = w[i - 2];
          w[i] = (w[i - 16] + (r(w15, 7) ^ r(w15, 18) ^ (w15 >>> 3)) + w[i - 7] + (r(w2, 17) ^ r(w2, 19) ^ (w2 >>> 10))) | 0;
        }
        const t1 = (hh + (r(e, 6) ^ r(e, 11) ^ r(e, 25)) + ((e & f) ^ (~e & g)) + K[i] + w[i]) | 0;
        const t2 = ((r(a, 2) ^ r(a, 13) ^ r(a, 22)) + ((a & b) ^ (a & cc) ^ (b & cc))) | 0;
        hh = g; g = f; f = e; e = (d + t1) | 0; d = cc; cc = b; b = a; a = (t1 + t2) | 0;
      }
      [a, b, cc, d, e, f, g, hh].forEach((v, i) => h[i] = (h[i] + v) | 0);
    }
    return h.map(v => (v >>> 0).toString(16).padStart(8, "0")).join("");
  }

  // ------------------------------------------------------------ dates
  const pad = n => String(n).padStart(2, "0");
  const iso = d => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
  const parseD = s => { const [y, m, d] = s.slice(0, 10).split("-").map(Number); return new Date(Date.UTC(y, m - 1, d)); };
  const todayD = () => { const n = new Date(); return new Date(Date.UTC(n.getFullYear(), n.getMonth(), n.getDate())); };
  const addDays = (d, k) => new Date(d.getTime() + k * 864e5);
  const days = (a, b) => Math.round((b - a) / 864e5);
  const addMonths = (d, k) => {
    const m = d.getUTCMonth() + k, y = d.getUTCFullYear() + Math.floor(m / 12), mm = ((m % 12) + 12) % 12;
    const last = new Date(Date.UTC(y, mm + 1, 0)).getUTCDate();
    return new Date(Date.UTC(y, mm, Math.min(d.getUTCDate(), last)));
  };
  const nowIso = () => { const n = new Date(); return `${n.getFullYear()}-${pad(n.getMonth() + 1)}-${pad(n.getDate())}T${pad(n.getHours())}:${pad(n.getMinutes())}:${pad(n.getSeconds())}`; };
  const round = x => Math.round(x * 100) / 100;

  // ------------------------------------------------------------ state
  const KEY = "sprava-ubytovani-demo-v1";
  const TABLES = ["users", "properties", "user_properties", "units", "persons", "stays", "payments", "expenses",
    "cash_transfers", "cash_closings", "approvals", "belongings", "room_entries", "audit"];
  let S;
  const fresh = () => { const s = { settings: { expense_limit: "2000", cash_tolerance: "50", rate_tolerance_pct: "10" }, sessions: {}, seq: {} }; TABLES.forEach(t => s[t] = []); return s; };
  function insert(t, row) { S.seq[t] = (S.seq[t] || 0) + 1; row.id = S.seq[t]; S[t].push(row); return row; }
  const get = (t, id) => S[t].find(r => r.id === Number(id));
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch { } };
  const setting = k => Number(S.settings[k]);

  class ApiError extends Error { constructor(m, code = 400) { super(m); this.code = code; } }

  // ------------------------------------------------------------ audit chain
  function entryHash(prev, ts, uid, uname, action, entity, eid, det) {
    return sha256([prev, ts, uid ?? "None", uname, action, entity ?? "None", eid ?? "None", det].join("|"));
  }
  function audit(user, action, entity = null, entityId = null, details = {}) {
    const last = S.audit[S.audit.length - 1];
    const prev = last ? last.hash : "GENESIS";
    const ts = S._ts || nowIso();
    const uid = user ? user.id : null, uname = user ? user.username : "system";
    const det = JSON.stringify(Object.fromEntries(Object.keys(details).sort().map(k => [k, details[k]])));
    insert("audit", { ts, user_id: uid, username: uname, action, entity, entity_id: entityId, details: det, prev_hash: prev,
      hash: entryHash(prev, ts, uid, uname, action, entity, entityId, det) });
  }
  function verifyAudit() {
    let prev = "GENESIS", count = 0;
    for (const r of S.audit) {
      const h = entryHash(prev, r.ts, r.user_id, r.username, r.action, r.entity, r.entity_id, r.details);
      if (r.prev_hash !== prev || r.hash !== h) return { ok: false, broken_at: r.id, checked: count };
      prev = r.hash; count++;
    }
    const byYear = {};
    S.payments.forEach(p => { const [y, n] = p.receipt_no.split("-"); (byYear[y] = byYear[y] || []).push(+n); });
    const gaps = [];
    for (const [y, nums] of Object.entries(byYear)) {
      const set = new Set(nums), max = Math.max(...nums), missing = [];
      for (let i = 1; i <= max; i++) if (!set.has(i)) missing.push(i);
      if (missing.length) gaps.push({ year: y, missing: missing.slice(0, 50) });
    }
    return { ok: true, checked: count, last_hash: prev, receipt_gaps: gaps };
  }

  // ------------------------------------------------------------ business
  const allowed = u => u.role === "owner" ? S.properties.map(p => p.id) : S.user_properties.filter(x => x.user_id === u.id).map(x => x.property_id);
  const checkProp = (u, pid) => { if (!allowed(u).includes(Number(pid))) throw new ApiError("K tomuto objektu nemáte přístup", 403); };
  const need = (b, ...ks) => ks.forEach(k => { if (b[k] == null || b[k] === "") throw new ApiError("Chybí pole: " + k); });
  const num = (v, name = "částka", positive = true) => {
    const x = round(parseFloat(v));
    if (isNaN(x)) throw new ApiError("Neplatná " + name);
    if (positive && x <= 0) throw new ApiError(name[0].toUpperCase() + name.slice(1) + " musí být kladná");
    return x;
  };
  const occupiedCount = uid => S.stays.filter(s => s.unit_id === uid && !s.checkout_date).length;

  function stayExpected(st, upto) {
    const start = parseD(st.start_date);
    upto = upto || todayD();
    const ended = st.checkout_date && parseD(st.checkout_date) <= upto;
    let end = st.checkout_date ? parseD(st.checkout_date) : upto;
    if (end > upto) end = upto;
    if (end < start) return [0, 0];
    if (st.rate_type === "night") {
      const n = ended ? Math.max(1, days(start, end)) : days(start, end) + 1;
      return [round(n * st.rate), n];
    }
    const limit = ended ? end : addDays(end, 1);
    let k = 0;
    while (addMonths(start, k) < limit) k++;
    k = Math.max(k, 1);
    return [round(k * st.rate), k];
  }
  const refKind = p => p.kind === "storno" ? get("payments", p.ref_payment_id)?.kind : p.kind;
  const stayPaid = id => round(S.payments.filter(p => p.stay_id === id && refKind(p) === "rent").reduce((a, p) => a + p.amount, 0));
  const depositHeld = id => round(S.payments.filter(p => p.stay_id === id && ["deposit", "deposit_refund"].includes(refKind(p))).reduce((a, p) => a + p.amount, 0));
  function stayRow(s) {
    const p = get("persons", s.person_id), u = get("units", s.unit_id), pr = get("properties", u.property_id);
    return { ...s, person_name: p.name, person_phone: p.phone, unit_name: u.name, property_id: u.property_id, property_name: pr.name, property_type: pr.type };
  }
  function enrich(s) {
    const st = stayRow(s);
    const [exp, n] = stayExpected(st);
    st.expected = exp; st.periods = n; st.paid = stayPaid(st.id);
    st.balance = round(exp - st.paid); st.deposit_held = depositHeld(st.id); st.active = !st.checkout_date;
    return st;
  }
  function nextReceipt() {
    const y = todayD().getUTCFullYear();
    const nums = S.payments.filter(p => p.receipt_no.startsWith(y + "-")).map(p => +p.receipt_no.split("-")[1]);
    return `${y}-${String((nums.length ? Math.max(...nums) : 0) + 1).padStart(6, "0")}`;
  }
  function insertPayment(user, kind, pid, amount, method, stayId = null, personId = null, note = "", ref = null, pdate = null) {
    const p = insert("payments", { receipt_no: nextReceipt(), kind, property_id: Number(pid), stay_id: stayId, person_id: personId,
      date: pdate || iso(todayD()), amount, method, note, ref_payment_id: ref, created_by: user.id, created_at: S._ts || nowIso() });
    audit(user, "payment_" + kind, "payment", p.id, { receipt: p.receipt_no, amount, method, stay: stayId, note, ref });
    return { ...p };
  }
  function cashState(pid) {
    const sum = a => a.reduce((x, r) => x + r.amount, 0);
    const inc = sum(S.payments.filter(p => p.property_id === pid && p.method === "cash"));
    const exp = sum(S.expenses.filter(e => e.property_id === pid && e.method === "cash" && e.status === "approved"));
    const pend = sum(S.expenses.filter(e => e.property_id === pid && e.method === "cash" && e.status === "pending"));
    const tr = sum(S.cash_transfers.filter(t => t.property_id === pid));
    const closings = S.cash_closings.filter(c => c.property_id === pid);
    const diffs = closings.reduce((a, c) => a + c.difference, 0);
    return { property_id: pid, income_cash: round(inc), expenses_cash: round(exp), pending_cash_expenses: round(pend), transfers: round(tr),
      differences_total: round(diffs), expected: round(inc - exp - tr + diffs), last_closing: closings[closings.length - 1] || null };
  }
  function requestApproval(user, type, payload, summary) {
    const a = insert("approvals", { type, payload, summary, status: "pending", requested_by: user.id, requested_at: S._ts || nowIso(),
      decided_by: null, decided_at: null, decision_note: "" });
    audit(user, "approval_request", "approval", a.id, { type, summary, ...payload });
    return a.id;
  }
  function executeApproval(a, owner) {
    const p = a.payload;
    if (a.type === "payment_storno") {
      const o = get("payments", p.payment_id);
      if (S.payments.some(x => x.ref_payment_id === o.id && x.kind === "storno")) throw new ApiError("Platba už byla stornována");
      insertPayment(owner, "storno", o.property_id, -o.amount, o.method, o.stay_id, o.person_id, `Storno dokladu ${o.receipt_no}: ${p.reason}`, o.id);
    } else if (a.type === "deposit_refund") {
      const st = stayRow(get("stays", p.stay_id));
      const held = depositHeld(st.id);
      if (p.amount > held + 0.001) throw new ApiError(`Na kauci je jen ${held} Kč`);
      insertPayment(owner, "deposit_refund", st.property_id, -p.amount, p.method, st.id, st.person_id, "Vrácení kauce: " + (p.reason || ""));
    } else if (a.type === "expense") {
      const e = get("expenses", p.expense_id);
      if (e.method === "cash" && e.amount > cashState(e.property_id).expected + 0.001)
        throw new ApiError("V pokladně podle evidence není na tento hotovostní výdaj dost peněz – zamítněte ho nebo nejdřív zkontrolujte pokladnu");
      e.status = "approved";
    } else if (a.type === "rate_discount") {
      get("stays", p.stay_id).rate = p.rate;
    }
  }

  // ------------------------------------------------------------ routes
  const R = [];
  const route = (m, pat, fn, opt = {}) => R.push({ m, parts: pat.split("/").filter(Boolean), fn, owner: !!opt.owner, auth: opt.auth !== false });
  const userName = id => get("users", id)?.name || "";
  const propName = id => get("properties", id)?.name || "";
  const byIdDesc = (a, b) => b.id - a.id;

  route("POST", "/api/login", (u, b) => {
    const usr = S.users.find(x => x.username === b.username && x.active);
    if (!usr || usr.password !== b.password) throw new ApiError("Špatné jméno nebo heslo", 401);
    const tok = "t" + Math.random().toString(36).slice(2) + Date.now().toString(36);
    S.sessions[tok] = usr.id;
    audit(usr, "login");
    return { token: tok };
  }, { auth: false });
  route("POST", "/api/logout", u => { audit(u, "logout"); return { ok: true }; });
  route("GET", "/api/me", u => ({ id: u.id, username: u.username, name: u.name, role: u.role, must_change_pw: 0, properties: allowed(u) }));
  route("POST", "/api/me/password", (u, b) => {
    need(b, "old", "new");
    if (b.old !== u.password) throw new ApiError("Staré heslo nesouhlasí");
    if (b.new.length < 8) throw new ApiError("Heslo musí mít aspoň 8 znaků");
    u.password = b.new; audit(u, "password_change", "user", u.id); return { ok: true };
  });

  route("GET", "/api/users", () => S.users.map(x => ({ id: x.id, username: x.username, name: x.name, role: x.role, active: x.active,
    properties: S.user_properties.filter(p => p.user_id === x.id).map(p => p.property_id) })), { owner: true });
  route("POST", "/api/users", (u, b) => {
    need(b, "username", "name", "password", "role");
    if (b.password.length < 8) throw new ApiError("Heslo musí mít aspoň 8 znaků");
    if (S.users.some(x => x.username === b.username)) throw new ApiError("Uživatel už existuje");
    const n = insert("users", { username: b.username, name: b.name, role: b.role, password: b.password, active: 1 });
    (b.properties || []).forEach(pid => S.user_properties.push({ user_id: n.id, property_id: Number(pid) }));
    audit(u, "user_create", "user", n.id, { username: b.username, role: b.role, properties: b.properties || [] });
    return { id: n.id };
  }, { owner: true });
  route("PUT", "/api/users/:id", (u, b, q, id) => {
    const x = get("users", id); if (!x) throw new ApiError("Nenalezeno", 404);
    if ("active" in b) { if (x.id === u.id && !b.active) throw new ApiError("Nemůžete zablokovat sami sebe"); x.active = b.active ? 1 : 0; }
    if ("properties" in b) { S.user_properties = S.user_properties.filter(p => p.user_id !== x.id); b.properties.forEach(pid => S.user_properties.push({ user_id: x.id, property_id: Number(pid) })); }
    if (b.password) { if (b.password.length < 8) throw new ApiError("Heslo musí mít aspoň 8 znaků"); x.password = b.password; b = { ...b, password: "***" }; }
    audit(u, "user_update", "user", x.id, b); return { ok: true };
  }, { owner: true });

  route("GET", "/api/settings", () => ({ ...S.settings }));
  route("PUT", "/api/settings", (u, b) => {
    for (const [k, v] of Object.entries(b)) if (k in S.settings) {
      const old = S.settings[k]; S.settings[k] = String(num(v, k, false)); audit(u, "setting_change", null, null, { key: k, old, new: v });
    }
    return { ok: true };
  }, { owner: true });

  function properties(u) {
    const active = S.stays.filter(s => !s.checkout_date).map(enrich);
    return S.properties.filter(p => allowed(u).includes(p.id)).map(p => {
      let beds = 0, occ = 0;
      const units = S.units.filter(x => x.property_id === p.id).sort((a, b) => a.name.localeCompare(b.name)).map(x => {
        const stays = active.filter(s => s.unit_id === x.id);
        const un = { ...x, stays, occupied: stays.length, debt: round(stays.reduce((a, s) => a + Math.max(0, s.balance), 0)) };
        if (!un.maintenance) { beds += un.capacity; occ += Math.min(un.occupied, un.capacity); }
        return un;
      });
      return { ...p, units, capacity: beds, occupied: occ };
    });
  }
  route("GET", "/api/properties", u => properties(u));
  route("POST", "/api/properties", (u, b) => { need(b, "name", "type"); const p = insert("properties", { name: b.name, type: b.type, address: b.address || "" }); audit(u, "property_create", "property", p.id, b); return { id: p.id }; }, { owner: true });
  route("POST", "/api/units", (u, b) => {
    need(b, "property_id", "name", "kind");
    const x = insert("units", { property_id: Number(b.property_id), name: b.name, kind: b.kind, capacity: parseInt(b.capacity || 1), price_night: num(b.price_night || 0, "cena", false), price_month: num(b.price_month || 0, "cena", false), maintenance: 0, note: b.note || "" });
    audit(u, "unit_create", "unit", x.id, b); return { id: x.id };
  }, { owner: true });
  route("PUT", "/api/units/:id", (u, b, q, id) => {
    const un = get("units", id); if (!un) throw new ApiError("Nenalezeno", 404);
    checkProp(u, un.property_id);
    const ownerF = ["name", "kind", "capacity", "price_night", "price_month"];
    if (u.role !== "owner" && ownerF.some(f => f in b && b[f] != un[f])) throw new ApiError("Ceny, kapacitu a názvy může měnit jen majitel", 403);
    const ch = {};
    ["maintenance", "note", ...ownerF].forEach(f => { if (f in b && b[f] != un[f]) { ch[f] = { old: un[f], new: b[f] }; un[f] = b[f]; } });
    audit(u, "unit_update", "unit", un.id, ch); return { ok: true };
  });

  route("GET", "/api/persons", (u, b, q) => {
    const t = (q.q || "").toLowerCase();
    return S.persons.filter(p => [p.name, p.id_doc, p.phone].some(x => (x || "").toLowerCase().includes(t))).sort((a, b) => a.name.localeCompare(b.name, "cs")).slice(0, 200);
  });
  route("POST", "/api/persons", (u, b) => {
    need(b, "name");
    const p = insert("persons", { name: b.name, id_doc: b.id_doc || "", birth: b.birth || "", phone: b.phone || "", email: b.email || "", note: b.note || "", created_at: S._ts || nowIso() });
    audit(u, "person_create", "person", p.id, { name: b.name }); return { id: p.id };
  });
  route("PUT", "/api/persons/:id", (u, b, q, id) => {
    const p = get("persons", id); if (!p) throw new ApiError("Nenalezeno", 404);
    const ch = {};
    ["name", "id_doc", "birth", "phone", "email", "note"].forEach(f => { if (f in b && b[f] !== p[f]) { ch[f] = { old: p[f], new: b[f] }; p[f] = b[f]; } });
    audit(u, "person_update", "person", p.id, ch); return { ok: true };
  });
  route("GET", "/api/persons/:id", (u, b, q, id) => {
    const p = get("persons", id); if (!p) throw new ApiError("Nenalezeno", 404);
    const ids = allowed(u);
    return { ...p,
      stays: S.stays.filter(s => s.person_id === p.id).map(enrich).filter(s => ids.includes(s.property_id)).sort((a, b) => b.start_date.localeCompare(a.start_date)),
      payments: S.payments.filter(x => x.person_id === p.id && ids.includes(x.property_id)).sort(byIdDesc),
      belongings: S.belongings.filter(x => x.person_id === p.id).sort(byIdDesc) };
  });

  function stays(u, q) {
    const ids = allowed(u), status = q.status || "active";
    return S.stays.map(enrich).filter(s => ids.includes(s.property_id) &&
      (status === "active" ? !s.checkout_date : status === "ended" ? !!s.checkout_date : true))
      .sort((a, b) => (!!a.checkout_date - !!b.checkout_date) || b.start_date.localeCompare(a.start_date)).slice(0, 500);
  }
  route("GET", "/api/stays", (u, b, q) => stays(u, q));
  route("POST", "/api/stays", (u, b) => {
    need(b, "unit_id", "person_id", "start_date", "rate_type");
    const un = get("units", b.unit_id); if (!un) throw new ApiError("Pokoj neexistuje");
    checkProp(u, un.property_id);
    if (un.maintenance) throw new ApiError("Pokoj je v údržbě");
    if (occupiedCount(un.id) >= un.capacity) throw new ApiError("Pokoj je plně obsazen");
    if (S.stays.some(s => s.person_id === Number(b.person_id) && !s.checkout_date)) throw new ApiError("Osoba už má aktivní pobyt – nejdřív ji odhlaste");
    const list = b.rate_type === "night" ? un.price_night : un.price_month;
    const rate = num(b.rate ?? list, "cena");
    const deposit = num(b.deposit || 0, "kauce", false);
    const needsOk = !!list && u.role !== "owner" && rate < list * (1 - setting("rate_tolerance_pct") / 100);
    const st = insert("stays", { unit_id: un.id, person_id: Number(b.person_id), start_date: b.start_date, planned_end: b.planned_end || null, checkout_date: null,
      rate_type: b.rate_type, rate: needsOk ? list : rate, deposit, note: b.note || "", created_by: u.id, created_at: S._ts || nowIso() });
    audit(u, "checkin", "stay", st.id, { unit: un.name, person: Number(b.person_id), rate, list_price: list, rate_type: b.rate_type });
    let msg = "Ubytováno.";
    if (needsOk) {
      requestApproval(u, "rate_discount", { stay_id: st.id, rate, list_price: list }, `Sleva pro pobyt #${st.id} (${un.name}): ${rate} Kč místo ceníkových ${list} Kč`);
      msg += ` Sleva pod ceník šla ke schválení majiteli – do té doby platí ceník ${list} Kč.`;
    }
    return { id: st.id, message: msg };
  });
  route("POST", "/api/stays/:id/checkout", (u, b, q, id) => {
    const s = get("stays", id); if (!s || s.checkout_date) throw new ApiError("Pobyt není aktivní");
    checkProp(u, stayRow(s).property_id);
    const d = b.date || iso(todayD());
    if (parseD(d) < parseD(s.start_date)) throw new ApiError("Datum odhlášení je před začátkem pobytu");
    s.checkout_date = d;
    const st = enrich(s);
    audit(u, "checkout", "stay", s.id, { date: d, balance: st.balance, deposit_held: st.deposit_held, room_check: b.room_check || "" });
    return st;
  });
  route("POST", "/api/stays/:id/rate", (u, b, q, id) => {
    const s = get("stays", id); if (!s) throw new ApiError("Nenalezeno", 404);
    const st = stayRow(s); checkProp(u, st.property_id);
    const rate = num(b.rate, "cena");
    if (u.role === "owner") { audit(u, "rate_change", "stay", s.id, { old: s.rate, new: rate }); s.rate = rate; return { message: "Cena změněna." }; }
    requestApproval(u, "rate_discount", { stay_id: s.id, rate, list_price: s.rate }, `Změna ceny pobytu #${s.id} (${st.unit_name}, ${st.person_name}): ${s.rate} → ${rate} Kč`);
    return { message: "Změna ceny odeslána ke schválení majiteli." };
  });
  route("POST", "/api/stays/:id/deposit_refund", (u, b, q, id) => {
    const st = stayRow(get("stays", id)); checkProp(u, st.property_id);
    const amount = num(b.amount);
    if (amount > depositHeld(st.id) + 0.001) throw new ApiError("Částka je vyšší než složená kauce");
    requestApproval(u, "deposit_refund", { stay_id: st.id, amount, method: b.method || "cash", reason: b.reason || "" }, `Vrácení kauce ${amount} Kč – ${st.person_name} (${st.unit_name})`);
    return { message: "Žádost o vrácení kauce odeslána majiteli." };
  });

  route("GET", "/api/payments", (u, b, q) => {
    const ids = allowed(u), from = q.from || "0000", to = q.to || "9999";
    return S.payments.filter(p => ids.includes(p.property_id) && p.date >= from && p.date <= to).sort(byIdDesc).slice(0, 1000).map(p => ({
      ...p, person_name: get("persons", p.person_id)?.name || null, created_by_name: userName(p.created_by), property_name: propName(p.property_id),
      storno_receipt: S.payments.find(x => x.ref_payment_id === p.id && x.kind === "storno")?.receipt_no || null }));
  });
  route("POST", "/api/payments", (u, b) => {
    need(b, "amount", "method", "kind");
    if (!["rent", "deposit", "other"].includes(b.kind)) throw new ApiError("Neplatný druh platby");
    const amount = num(b.amount);
    let pid, personId = b.person_id || null, stayId = b.stay_id ? Number(b.stay_id) : null;
    if (stayId) { const st = get("stays", stayId); if (!st) throw new ApiError("Pobyt neexistuje"); const r = stayRow(st); pid = r.property_id; personId = r.person_id; }
    else { need(b, "property_id"); if (b.kind !== "other") throw new ApiError("Platba nájmu/kauce musí být k pobytu"); pid = Number(b.property_id); }
    checkProp(u, pid);
    return insertPayment(u, b.kind, pid, amount, b.method, stayId, personId, b.note || "", null, b._date);
  });
  route("POST", "/api/payments/:id/storno", (u, b, q, id) => {
    need(b, "reason");
    const p = get("payments", id);
    if (!p || ["storno", "deposit_refund"].includes(p.kind)) throw new ApiError("Tuto platbu nelze stornovat");
    checkProp(u, p.property_id);
    if (S.payments.some(x => x.ref_payment_id === p.id && x.kind === "storno") || S.approvals.some(a => a.type === "payment_storno" && a.status === "pending" && a.payload.payment_id === p.id))
      throw new ApiError("Storno už existuje nebo čeká na schválení");
    const aid = requestApproval(u, "payment_storno", { payment_id: p.id, reason: b.reason }, `Storno dokladu ${p.receipt_no} na ${p.amount} Kč – důvod: ${b.reason}`);
    if (u.role === "owner") { decide(u, { approve: true, note: "Storno provedl majitel" }, {}, aid); return { message: "Stornováno." }; }
    return { message: "Storno odesláno ke schválení majiteli." };
  });

  route("GET", "/api/expenses", u => {
    const ids = allowed(u);
    return S.expenses.filter(e => ids.includes(e.property_id)).sort(byIdDesc).map(e => ({ ...e, created_by_name: userName(e.created_by), property_name: propName(e.property_id) }));
  });
  route("POST", "/api/expenses", (u, b) => {
    need(b, "property_id", "amount", "category", "description", "method");
    checkProp(u, b.property_id);
    const amount = num(b.amount), limit = setting("expense_limit");
    const status = u.role === "owner" || amount <= limit ? "approved" : "pending";
    if (b.method === "cash" && status === "approved" && u.role !== "owner" && amount > cashState(Number(b.property_id)).expected)
      throw new ApiError("V pokladně podle evidence není tolik hotovosti");
    const e = insert("expenses", { property_id: Number(b.property_id), date: b.date || iso(todayD()), amount, category: b.category, description: b.description,
      method: b.method, supplier: b.supplier || "", doc_no: b.doc_no || "", status, created_by: u.id, created_at: S._ts || nowIso() });
    audit(u, "expense_create", "expense", e.id, { amount, category: b.category, description: b.description, method: b.method, status, doc_no: b.doc_no || "" });
    if (status === "pending") { requestApproval(u, "expense", { expense_id: e.id }, `Výdaj ${amount} Kč – ${b.category}: ${b.description}`); return { id: e.id, message: `Výdaj nad ${limit} Kč čeká na schválení majitelem.` }; }
    return { id: e.id, message: "Výdaj zapsán." };
  });

  route("GET", "/api/cash", u => allowed(u).map(pid => ({ ...cashState(pid), property_name: propName(pid),
    closings: S.cash_closings.filter(c => c.property_id === pid).sort(byIdDesc).slice(0, 30).map(c => ({ ...c, user_name: userName(c.created_by) })),
    transfers_list: S.cash_transfers.filter(t => t.property_id === pid).sort(byIdDesc).slice(0, 30).map(t => ({ ...t, user_name: userName(t.created_by) })) })));
  route("POST", "/api/cash/closing", (u, b) => {
    need(b, "property_id", "counted");
    const pid = Number(b.property_id); checkProp(u, pid);
    const counted = num(b.counted, "částka", false), cs = cashState(pid), diff = round(counted - cs.expected);
    if (Math.abs(diff) > setting("cash_tolerance") && !b.note) throw new ApiError(`Rozdíl ${diff} Kč je nad tolerancí – napište vysvětlení do poznámky`);
    const c = insert("cash_closings", { property_id: pid, expected: cs.expected, counted, difference: diff, note: b.note || "", created_by: u.id, created_at: S._ts || nowIso() });
    audit(u, "cash_closing", "cash_closing", c.id, { property: pid, expected: cs.expected, counted, difference: diff });
    return { expected: cs.expected, counted, difference: diff };
  });
  route("POST", "/api/cash/transfer", (u, b) => {
    need(b, "property_id", "amount", "received_by");
    const pid = Number(b.property_id); checkProp(u, pid);
    const amount = num(b.amount);
    if (amount > cashState(pid).expected + 0.001) throw new ApiError("V pokladně podle evidence není tolik hotovosti");
    const t = insert("cash_transfers", { property_id: pid, date: iso(todayD()), amount, received_by: b.received_by, note: b.note || "", created_by: u.id, created_at: S._ts || nowIso() });
    audit(u, "cash_transfer", "cash_transfer", t.id, { property: pid, amount, received_by: b.received_by });
    return { ok: true };
  });

  route("GET", "/api/approvals", u => S.approvals.filter(a => u.role === "owner" || a.requested_by === u.id)
    .sort((a, b) => ((a.status !== "pending") - (b.status !== "pending")) || b.id - a.id)
    .map(a => ({ ...a, requested_by_name: userName(a.requested_by), decided_by_name: a.decided_by ? userName(a.decided_by) : null })));
  function decide(u, b, q, id) {
    const a = get("approvals", id);
    if (!a || a.status !== "pending") throw new ApiError("Žádost už byla vyřízena");
    const ok = !!b.approve;
    if (ok) executeApproval(a, u);
    else if (a.type === "expense") get("expenses", a.payload.expense_id).status = "rejected";
    Object.assign(a, { status: ok ? "approved" : "rejected", decided_by: u.id, decided_at: S._ts || nowIso(), decision_note: b.note || "" });
    audit(u, "approval_" + a.status, "approval", a.id, { type: a.type, summary: a.summary });
    return { ok: true };
  }
  route("POST", "/api/approvals/:id/decide", decide, { owner: true });

  route("GET", "/api/belongings", () => S.belongings.slice().sort((a, b) => (!!a.returned_at - !!b.returned_at) || b.id - a.id).map(x => ({
    ...x, person_name: get("persons", x.person_id)?.name || null, unit_name: get("units", x.unit_id)?.name || null,
    received_by_name: userName(x.received_by), returned_by_name: x.returned_by ? userName(x.returned_by) : null })));
  route("POST", "/api/belongings", (u, b) => {
    need(b, "description", "reason", "witness");
    const x = insert("belongings", { person_id: b.person_id ? Number(b.person_id) : null, unit_id: b.unit_id ? Number(b.unit_id) : null, description: b.description,
      reason: b.reason, witness: b.witness, received_by: u.id, received_at: S._ts || nowIso(), returned_to: null, returned_by: null, returned_at: null, return_witness: null });
    audit(u, "belonging_receive", "belonging", x.id, b); return { id: x.id };
  });
  route("POST", "/api/belongings/:id/return", (u, b, q, id) => {
    need(b, "returned_to", "witness");
    const x = get("belongings", id); if (!x || x.returned_at) throw new ApiError("Věc už byla vydána");
    Object.assign(x, { returned_to: b.returned_to, returned_by: u.id, returned_at: nowIso(), return_witness: b.witness });
    audit(u, "belonging_return", "belonging", x.id, b); return { ok: true };
  });

  route("GET", "/api/entries", u => {
    const ids = allowed(u);
    return S.room_entries.map(e => { const un = get("units", e.unit_id); return { ...e, unit_name: un.name, property_id: un.property_id, property_name: propName(un.property_id), user_name: userName(e.user_id) }; })
      .filter(e => ids.includes(e.property_id)).sort(byIdDesc);
  });
  route("POST", "/api/entries", (u, b) => {
    need(b, "unit_id", "reason");
    const un = get("units", b.unit_id); checkProp(u, un.property_id);
    if (occupiedCount(un.id) && !b.tenant_present && !b.witness) throw new ApiError("Do obsazeného pokoje bez přítomnosti nájemníka jen se svědkem");
    const e = insert("room_entries", { unit_id: un.id, user_id: u.id, entered_at: b.entered_at || nowIso(), reason: b.reason, witness: b.witness || "",
      tenant_present: b.tenant_present ? 1 : 0, tenant_notified: b.tenant_notified ? 1 : 0, note: b.note || "" });
    audit(u, "room_entry", "unit", un.id, b); return { id: e.id };
  });

  function monthReport(ids, ym) {
    const [y, m] = ym.split("-").map(Number);
    const start = new Date(Date.UTC(y, m - 1, 1)), end = addDays(addMonths(start, 1), -1);
    const s0 = iso(start), s1 = iso(end), td = todayD();
    return ids.map(pid => {
      let expected = 0;
      S.stays.map(stayRow).filter(st => st.property_id === pid && st.start_date <= s1 && (!st.checkout_date || st.checkout_date >= s0)).forEach(st => {
        const upto = end < td ? end : td;
        if (upto < start) return;
        const a = stayExpected(st, upto)[0];
        const bb = parseD(st.start_date) < start ? stayExpected(st, addDays(start, -1))[0] : 0;
        expected += a - bb;
      });
      const inM = S.payments.filter(p => p.property_id === pid && p.date >= s0 && p.date <= s1);
      const paid = inM.filter(p => refKind(p) === "rent").reduce((a, p) => a + p.amount, 0);
      const other = inM.filter(p => refKind(p) === "other").reduce((a, p) => a + p.amount, 0);
      const ex = S.expenses.filter(e => e.property_id === pid && e.status === "approved" && e.date >= s0 && e.date <= s1);
      const cats = {};
      ex.forEach(e => cats[e.category] = (cats[e.category] || 0) + e.amount);
      const exp = ex.reduce((a, e) => a + e.amount, 0);
      return { property_id: pid, property_name: propName(pid), expected: round(expected), paid_rent: round(paid), other_income: round(other), expenses: round(exp),
        profit: round(paid + other - exp), expenses_by_category: Object.entries(cats).map(([category, s]) => ({ category, s })) };
    });
  }
  route("GET", "/api/report", (u, b, q) => { const ym = q.month || iso(todayD()).slice(0, 7); return { month: ym, rows: monthReport(allowed(u), ym) }; });
  route("GET", "/api/dashboard", u => {
    const ids = allowed(u), props = properties(u);
    const debts = stays(u, { status: "all" }).filter(s => s.balance > 0.5).sort((a, b) => b.balance - a.balance);
    const cash = ids.map(pid => ({ ...cashState(pid), property_name: propName(pid) }));
    const alerts = [];
    const dayAgo = Date.now() - 864e5;
    cash.forEach(c => {
      const last = c.last_closing;
      const moved = S.payments.some(p => p.property_id === c.property_id && p.method === "cash" && p.created_at > (last ? last.created_at : ""));
      if (moved && (!last || new Date(last.created_at).getTime() < dayAgo)) alerts.push({ level: "warn", text: `${c.property_name}: pokladna nebyla uzavřena přes 24 h` });
      if (last && Math.abs(last.difference) > setting("cash_tolerance")) alerts.push({ level: "bad", text: `${c.property_name}: poslední uzávěrka s rozdílem ${last.difference} Kč` });
    });
    const pend = u.role === "owner" ? S.approvals.filter(a => a.status === "pending").length : 0;
    if (pend) alerts.push({ level: "warn", text: `${pend} žádostí čeká na vaše schválení` });
    const since = new Date(Date.now() - 7 * 864e5).toISOString().slice(0, 19);
    const stornos = S.payments.filter(p => p.kind === "storno" && p.created_at >= since && ids.includes(p.property_id)).length;
    if (stornos >= 3) alerts.push({ level: "bad", text: `${stornos} storen plateb za posledních 7 dní – zkontrolujte` });
    const ent = S.room_entries.filter(e => e.entered_at >= since && !e.tenant_present && ids.includes(get("units", e.unit_id).property_id)).length;
    if (ent) alerts.push({ level: "info", text: `${ent}× vstup do pokoje bez přítomnosti nájemníka za 7 dní` });
    return {
      properties: props.map(p => ({ id: p.id, name: p.name, type: p.type, capacity: p.capacity, occupied: p.occupied })),
      debt_total: round(debts.reduce((a, s) => a + s.balance, 0)), debts: debts.slice(0, 15),
      overdue_count: debts.filter(s => s.active && s.rate_type === "month" && s.balance >= s.rate).length,
      cash, alerts, month: monthReport(ids, iso(todayD()).slice(0, 7)),
      deposits_held: round(S.payments.filter(p => ids.includes(p.property_id) && ["deposit", "deposit_refund"].includes(refKind(p))).reduce((a, p) => a + p.amount, 0)),
    };
  });

  route("GET", "/api/audit", (u, b, q) => {
    const t = (q.q || "").toLowerCase(), lim = Math.min(+(q.limit || 300), 5000);
    return S.audit.filter(r => !t || [r.action, r.username, r.details].some(x => (x || "").toLowerCase().includes(t))).slice().reverse().slice(0, lim);
  }, { owner: true });
  route("GET", "/api/audit/verify", u => { const r = verifyAudit(); audit(u, "audit_verify", null, null, { ok: r.ok, checked: r.checked }); return r; }, { owner: true });
  route("GET", "/api/backup", () => { throw new ApiError("Zálohy dělá plná verze programu (server.py). Webová ukázka ukládá data jen do vašeho prohlížeče."); }, { owner: true });
  // jen pro ukázku: simulace podvodníka, který přepíše databázi mimo program
  route("POST", "/api/demo/tamper", () => {
    const victim = S.audit.find(r => r.action.startsWith("payment_rent"));
    if (!victim) throw new ApiError("Zatím tu není žádná platba k podvržení");
    victim.details = victim.details.replace(/"amount":\s*[\d.]+/, '"amount":100');
    S.payments.find(p => p.id === victim.entity_id).amount = 100;
    return { message: `Simulováno: někdo přímo v databázi snížil platbu (záznam #${victim.id}) na 100 Kč. Teď klikněte na „Ověřit neporušenost“.` };
  }, { owner: true });
  route("POST", "/api/demo/reset", () => { S = buildSeed(); return { ok: true }; }, { auth: false });

  // ------------------------------------------------------------ dispatcher
  function handle(path, method, body, token) {
    const [p, qs] = path.split("?");
    const q = Object.fromEntries(new URLSearchParams(qs || ""));
    const parts = p.split("/").filter(Boolean);
    for (const r of R) {
      if (r.m !== method || r.parts.length !== parts.length) continue;
      let ok = true, id;
      r.parts.forEach((a, i) => { if (a.startsWith(":")) { if (!/^\d+$/.test(parts[i])) ok = false; else id = +parts[i]; } else if (a !== parts[i]) ok = false; });
      if (!ok) continue;
      const snapshot = JSON.stringify(S);
      try {
        const user = get("users", S.sessions[token]);
        if (r.auth && !(user && user.active)) throw new ApiError("Nepřihlášen", 401);
        if (r.owner && user.role !== "owner") throw new ApiError("Jen pro majitele", 403);
        const data = JSON.parse(JSON.stringify(r.fn(user, body || {}, q, id) ?? null));
        if (method !== "GET" || path.startsWith("/api/audit/verify")) save();
        return { status: 200, data };
      } catch (e) {
        S = JSON.parse(snapshot);
        if (e instanceof ApiError) {
          if (e.code === 401 && r.parts[1] === "login") { audit(null, "login_failed", null, null, { username: (body || {}).username || "" }); save(); }
          return { status: e.code, data: { error: e.message } };
        }
        console.error(e);
        return { status: 500, data: { error: "Interní chyba: " + e.message } };
      }
    }
    return { status: 404, data: { error: "Neznámá adresa" } };
  }

  // ------------------------------------------------------------ demo data
  function buildSeed() {
    S = fresh();
    const td = todayD(), D = k => iso(addDays(td, k));
    const at = (k, h = 10) => { S._ts = `${D(k)}T${pad(h)}:${pad((k * 7 + 60) % 60)}:00`; };
    at(-75, 8);
    const owner = insert("users", { username: "majitel", name: "Majitel", role: "owner", password: "majitel", active: 1 });
    audit(null, "system_init", null, null, { msg: "Vytvořen účet majitel" });
    const P = (name, type) => insert("properties", { name, type, address: "" }).id;
    const hostel = P("Ubytovna", "hostel"), hotel = P("Hotel", "hotel"), flats = P("Byty", "apartments");
    const U = (pid, name, kind, cap, n, m) => insert("units", { property_id: pid, name, kind, capacity: cap, price_night: n, price_month: m, maintenance: 0, note: "" });
    for (let i = 1; i <= 20; i++) U(hostel, "U" + pad(i), "single", 1, 350, 6500);
    for (let i = 21; i <= 50; i++) U(hostel, "U" + pad(i), "double", 2, 280, 5000);
    for (let i = 1; i <= 6; i++) U(hotel, "H" + i, "room", 2, 1490, 0);
    for (let i = 1; i <= 45; i++) U(flats, "B" + pad(i), "apartment", 1, 0, 12000);
    audit(null, "seed", null, null, { msg: "Založeny objekty: Ubytovna 50 pokojů, Hotel 6 pokojů, Byty 45" });
    const call = (u, m, path, body) => { const r = handle(path, m, body, tokFor(u)); if (r.status !== 200) throw new Error(path + ": " + r.data.error); return r.data; };
    const toks = {};
    const tokFor = u => { if (!toks[u.id]) { toks[u.id] = "seed" + u.id; S.sessions[toks[u.id]] = u.id; } return toks[u.id]; };
    at(-74, 9);
    call(owner, "POST", "/api/users", { username: "spravce", name: "Pepa Správce", password: "spravce12", role: "manager", properties: [hostel, flats] });
    const mgr = S.users[1]; mgr.password = "spravce";
    const unitBy = n => S.units.find(x => x.name === n).id;
    const names = ["Jan Novák", "Petr Svoboda", "Marek Dvořák", "Oleksandr Kovalenko", "Tomáš Černý", "Lukáš Procházka", "Ivan Melnyk", "Jiří Kučera",
      "Andrea Veselá", "Martin Horák", "Pavel Němec", "Kateřina Marková", "Radek Pokorný", "Viktor Bondar", "Eva Králová", "Josef Růžička",
      "Lenka Benešová", "Michal Fiala", "Simona Šťastná", "David Sedláček", "Roman Doležal", "Hana Zemanová"];
    const persons = names.map((n, i) => { at(-72 + i, 9); return call(mgr, "POST", "/api/persons", { name: n, id_doc: (203000000 + i * 7919).toString(), phone: "+420 7" + (31000000 + i * 4471) }).id; });
    let pi = 0;
    const stay = (u, unit, start, rt, opts = {}) => { at(start, 11); const r = call(u, "POST", "/api/stays", { unit_id: unitBy(unit), person_id: persons[pi++], start_date: D(start), rate_type: rt, deposit: opts.deposit || 0, ...opts.body }); return r.id; };
    const pay = (u, sid, amount, day, method = "cash", kind = "rent", note = "") => { at(day, 14); return call(u, "POST", "/api/payments", { kind, stay_id: sid, amount, method, note, _date: D(day) }); };
    // Ubytovna – měsíční i noční
    const s1 = stay(mgr, "U01", -60, "month"); pay(mgr, s1, 6500, -60); pay(mgr, s1, 6500, -30); pay(mgr, s1, 6500, 0);
    const s2 = stay(mgr, "U02", -45, "month"); pay(mgr, s2, 6500, -45); pay(mgr, s2, 3000, -14);
    const s3 = stay(mgr, "U05", -20, "night"); pay(mgr, s3, 350 * 14, -20);
    const s4 = stay(mgr, "U21", -50, "month"); pay(mgr, s4, 5000, -50); pay(mgr, s4, 5000, -20, "bank");
    const s5 = stay(mgr, "U21", -50, "month"); pay(mgr, s5, 5000, -50); pay(mgr, s5, 5000, -20);
    const s6 = stay(mgr, "U22", -10, "night"); pay(mgr, s6, 280 * 7, -10);
    const s7 = stay(mgr, "U23", -35, "month", { body: { rate: 4000 } }); pay(mgr, s7, 4000, -35); pay(mgr, s7, 4000, -5);
    const s8 = stay(mgr, "U30", -3, "night"); pay(mgr, s8, 840, -3);
    const s9 = stay(mgr, "U31", -25, "month"); pay(mgr, s9, 5000, -25);
    const s10 = stay(mgr, "U12", -40, "month"); pay(mgr, s10, 6500, -40);
    at(-8, 9); call(mgr, "POST", `/api/stays/${s10}/checkout`, { date: D(-8), room_check: "Pokoj v pořádku, vráceny 2 klíče" });
    // Hotel – majitel
    const h1 = stay(owner, "H2", -2, "night"); pay(owner, h1, 1490 * 2, -2, "card");
    const h2 = stay(owner, "H4", -1, "night"); pay(owner, h2, 1490, -1, "card");
    // Byty – kauce a nájem převodem
    const b = [];
    [["B01", -70], ["B02", -65], ["B03", -40], ["B07", -55], ["B12", -20], ["B15", -62]].forEach(([u, d], i) => {
      const sid = stay(mgr, u, d, "month", { deposit: 24000 }); b.push(sid);
      pay(mgr, sid, 24000, d, "bank", "deposit", "Kauce při podpisu smlouvy");
      const months = Math.ceil(-d / 30.4) + (i === 2 ? -1 : 0);
      for (let k = 0; k < months; k++) pay(mgr, sid, 12000, d + k * 30, "bank", "rent", "Nájem");
    });
    // výdaje
    at(-30, 15); call(mgr, "POST", "/api/expenses", { property_id: hostel, date: D(-30), amount: 860, category: "Úklid a drogerie", description: "Čisticí prostředky, toaletní papír", method: "cash", supplier: "Makro", doc_no: "UC-4471" });
    at(-18, 15); call(mgr, "POST", "/api/expenses", { property_id: hostel, date: D(-18), amount: 1450, category: "Opravy a údržba", description: "Výměna baterie ve sprše U21", method: "cash", supplier: "Hornbach", doc_no: "UC-8812" });
    at(-12, 10); call(owner, "POST", "/api/expenses", { property_id: flats, date: D(-12), amount: 18500, category: "Opravy a údržba", description: "Oprava střechy nad B07", method: "bank", supplier: "Střechy Novotný s.r.o.", doc_no: "FV-2026-118" });
    at(-2, 16); call(mgr, "POST", "/api/expenses", { property_id: hostel, date: D(-2), amount: 6900, category: "Vybavení", description: "Pračka do prádelny", method: "cash", supplier: "Datart", doc_no: "UC-9930" });
    // pokladna
    at(-15, 19); let cs = cashState(hostel); call(mgr, "POST", "/api/cash/closing", { property_id: hostel, counted: cs.expected });
    at(-14, 9); call(mgr, "POST", "/api/cash/transfer", { property_id: hostel, amount: 20000, received_by: "Majitel – převzal osobně" });
    at(-1, 19); cs = cashState(hostel); call(mgr, "POST", "/api/cash/closing", { property_id: hostel, counted: cs.expected - 500, note: "Nevím, kde je rozdíl – přepočítám zítra" });
    // storno čekající na schválení
    at(-1, 12); const lastPay = S.payments.filter(p => p.stay_id === s6)[0];
    call(mgr, "POST", `/api/payments/${lastPay.id}/storno`, { reason: "Host prý platil omylem dvakrát" });
    // úschova a vstupy
    at(-8, 10); call(mgr, "POST", "/api/belongings", { person_id: persons[9], unit_id: unitBy("U12"), description: "Taška s oblečením, rychlovarná konvice, nabíječka Samsung", reason: "Věci zůstaly po odchodu nájemníka", witness: "Marie Uklízečka" });
    at(-4, 10); call(mgr, "POST", "/api/belongings", { person_id: persons[3], unit_id: unitBy("U05"), description: "Obálka s hotovostí 4 200 Kč (spočítáno ve dvou), cestovní pas UA", reason: "Nájemník požádal o úschovu", witness: "Karel Údržbář" });
    at(-6, 13); call(mgr, "POST", "/api/entries", { unit_id: unitBy("U21"), entered_at: `${D(-6)}T13:10`, reason: "Oprava / údržba", tenant_present: true, tenant_notified: true, note: "Výměna sprchové baterie" });
    at(-3, 9); call(mgr, "POST", "/api/entries", { unit_id: unitBy("U02"), entered_at: `${D(-3)}T09:40`, reason: "Havárie (voda, požár…)", witness: "Karel Údržbář", tenant_notified: false, note: "Teklo do pokoje pod ním, zavřen ventil" });
    delete S._ts; S.sessions = {};
    return S;
  }

  try { S = JSON.parse(localStorage.getItem(KEY) || "null"); } catch { S = null; }
  if (!S || !S.audit) { buildSeed(); save(); }
  window.DEMO_API = handle;
  window.DEMO_RESET = () => { buildSeed(); save(); };
})();
