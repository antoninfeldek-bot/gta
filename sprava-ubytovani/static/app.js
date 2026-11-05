"use strict";
// ---------------------------------------------------------------- utilities
const $ = (s, el = document) => el.querySelector(s);
const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const kc = n => (Number(n) || 0).toLocaleString("cs-CZ", { maximumFractionDigits: 2 }) + " Kč";
const dt = s => s ? new Date(s.length <= 10 ? s + "T00:00" : s).toLocaleDateString("cs-CZ") : "";
const dtt = s => s ? new Date(s).toLocaleString("cs-CZ", { dateStyle: "short", timeStyle: "short" }) : "";
const todayIso = () => new Date().toISOString().slice(0, 10);
const METHOD = { cash: "Hotově", bank: "Převodem", card: "Kartou" };
const KIND = { rent: "Nájem/ubytování", deposit: "Kauce", deposit_refund: "Vrácení kauce", storno: "Storno", other: "Ostatní příjem" };
const PTYPE = { hostel: "Ubytovna", hotel: "Hotel", apartments: "Byty" };
const UKIND = { single: "1lůžkový", double: "2lůžkový", room: "Pokoj", apartment: "Byt" };
const APPR = { payment_storno: "Storno platby", deposit_refund: "Vrácení kauce", expense: "Výdaj", rate_discount: "Sleva / změna ceny" };
const EXP_CAT = ["Opravy a údržba", "Úklid a drogerie", "Energie", "Materiál", "Vybavení", "Služby", "Poplatky", "Ostatní"];

let TOKEN = localStorage.getItem("token") || "";
let ME = null, PROPS = [], CACHE = {};

async function api(path, opts = {}) {
  const r = await fetch(path, {
    method: opts.method || (opts.body ? "POST" : "GET"),
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + TOKEN },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const data = await r.json().catch(() => ({ error: "Chybná odpověď serveru" }));
  if (r.status === 401 && path !== "/api/login") { logoutLocal(); throw new Error(data.error); }
  if (!r.ok) throw new Error(data.error || "Chyba");
  return data;
}
function toast(msg, ms = 3500) { const t = $("#toast"); t.textContent = msg; t.classList.remove("hidden"); clearTimeout(t._h); t._h = setTimeout(() => t.classList.add("hidden"), ms); }
function closeModal() { $("#modal").classList.add("hidden"); }
$("#modal").addEventListener("click", e => { if (e.target.id === "modal") closeModal(); });

/** Otevře formulář v modálním okně. fields: [{n,l,t,opts,req,v,help}] */
function form(title, fields, onSubmit, { submit = "Uložit", intro = "" } = {}) {
  const f = fields.map(x => {
    const req = x.req ? "required" : "";
    const v = x.v ?? "";
    if (x.t === "html") return x.html;
    if (x.t === "select") return `<label>${esc(x.l)}<select name="${x.n}" ${req}>${x.opts.map(o => `<option value="${esc(o[0])}" ${String(o[0]) === String(v) ? "selected" : ""}>${esc(o[1])}</option>`).join("")}</select>${x.help ? `<span class="small">${esc(x.help)}</span>` : ""}</label>`;
    if (x.t === "textarea") return `<label>${esc(x.l)}<textarea name="${x.n}" rows="3" ${req}>${esc(v)}</textarea></label>`;
    if (x.t === "check") return `<label class="chk"><input type="checkbox" name="${x.n}" ${v ? "checked" : ""}> ${esc(x.l)}</label>`;
    return `<label>${esc(x.l)}<input name="${x.n}" type="${x.t || "text"}" value="${esc(v)}" ${x.t === "number" ? 'step="0.01"' : ""} ${req}>${x.help ? `<span class="small">${esc(x.help)}</span>` : ""}</label>`;
  }).join("");
  $("#modalBody").innerHTML = `<h3>${esc(title)}</h3>${intro}<form id="mf">${f}<p id="mfErr" class="err"></p>
    <div class="row"><button class="btn primary">${esc(submit)}</button><button type="button" class="btn" onclick="closeModal()">Zrušit</button></div></form>`;
  $("#modal").classList.remove("hidden");
  const el = $("#mf");
  el.querySelector("input,select,textarea")?.focus();
  el.onsubmit = async e => {
    e.preventDefault();
    const data = {};
    for (const x of fields) {
      if (!x.n) continue;
      const inp = el.elements[x.n];
      data[x.n] = x.t === "check" ? inp.checked : inp.value;
    }
    try { const btn = el.querySelector(".primary"); btn.disabled = true; await onSubmit(data); closeModal(); }
    catch (err) { $("#mfErr").textContent = err.message; el.querySelector(".primary").disabled = false; }
  };
}
function table(cols, rows, { onClick, empty = "Žádné záznamy" } = {}) {
  if (!rows.length) return `<p class="muted">${empty}</p>`;
  const id = "t" + Math.random().toString(36).slice(2);
  setTimeout(() => {
    if (!onClick) return;
    document.querySelectorAll(`#${id} tr[data-i]`).forEach(tr => tr.onclick = e => { if (!e.target.closest("button")) onClick(rows[tr.dataset.i]); });
  });
  return `<div class="tablewrap"><table id="${id}"><thead><tr>${cols.map(c => `<th class="${c.num ? "num" : ""}">${esc(c.l)}</th>`).join("")}</tr></thead>
    <tbody>${rows.map((r, i) => `<tr data-i="${i}" class="${onClick ? "click" : ""}">${cols.map(c => `<td class="${c.num ? "num" : ""}">${c.f ? c.f(r) : esc(r[c.k])}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
}
const propOpts = () => PROPS.map(p => [p.id, p.name]);
const propName = id => PROPS.find(p => p.id == id)?.name || "";
const isOwner = () => ME?.role === "owner";

// ---------------------------------------------------------------- routing
const PAGES = [
  ["prehled", "Přehled", viewDashboard],
  ["pokoje", "Obsazenost", viewRooms],
  ["pobyty", "Pobyty a nájemníci", viewStays],
  ["osoby", "Osoby", viewPersons],
  ["platby", "Platby a doklady", viewPayments],
  ["vydaje", "Výdaje", viewExpenses],
  ["pokladna", "Pokladna", viewCash],
  ["schvalovani", "Schvalování", viewApprovals],
  ["uschova", "Úschova věcí", viewBelongings],
  ["vstupy", "Vstupy do pokojů", viewEntries],
  ["vykazy", "Finanční výkazy", viewReports],
  ["audit", "Audit (kontrola)", viewAudit, true],
  ["nastaveni", "Uživatelé a nastavení", viewSettings, true],
];
let pendingCount = 0;
function renderNav() {
  const cur = location.hash.slice(1) || "prehled";
  $("#nav").innerHTML = PAGES.filter(p => !p[3] || isOwner()).map(p =>
    `<a href="#${p[0]}" class="${p[0] === cur ? "on" : ""}">${p[1]}${p[0] === "schvalovani" && pendingCount ? `<span class="badge">${pendingCount}</span>` : ""}</a>`).join("");
}
async function route() {
  const cur = location.hash.slice(1) || "prehled";
  const page = PAGES.find(p => p[0] === cur) || PAGES[0];
  $(".side").classList.remove("open");
  $("#title").textContent = page[1];
  $("#actions").innerHTML = "";
  renderNav();
  $("#view").innerHTML = `<p class="muted">Načítám…</p>`;
  try { await page[2]($("#view")); } catch (e) { $("#view").innerHTML = `<div class="alert bad">${esc(e.message)}</div>`; }
}
window.addEventListener("hashchange", route);
$("#menuBtn").onclick = () => $(".side").classList.toggle("open");
const reload = () => route();
function actions(btns) {
  $("#actions").innerHTML = `<div class="row">${btns.map((b, i) => `<button class="btn ${b[2] || ""}" data-a="${i}">${esc(b[0])}</button>`).join("")}</div>`;
  btns.forEach((b, i) => $(`#actions [data-a="${i}"]`).onclick = b[1]);
}

// ---------------------------------------------------------------- auth
function logoutLocal() { TOKEN = ""; localStorage.removeItem("token"); $("#app").classList.add("hidden"); $("#login").classList.remove("hidden"); }
$("#loginForm").onsubmit = async e => {
  e.preventDefault();
  const fd = new FormData(e.target);
  try {
    const r = await api("/api/login", { body: { username: fd.get("username"), password: fd.get("password") } });
    TOKEN = r.token; localStorage.setItem("token", TOKEN); $("#loginErr").textContent = ""; e.target.reset(); start();
  } catch (err) { $("#loginErr").textContent = err.message; }
};
function changePassword(forced) {
  form(forced ? "Nastavte si vlastní heslo" : "Změna hesla", [
    { n: "old", l: "Současné heslo", t: "password", req: 1 },
    { n: "new", l: "Nové heslo (min. 8 znaků)", t: "password", req: 1 },
    { n: "new2", l: "Nové heslo znovu", t: "password", req: 1 },
  ], async d => {
    if (d.new !== d.new2) throw new Error("Hesla se neshodují");
    await api("/api/me/password", { body: d }); toast("Heslo změněno"); if (forced) start();
  }, { intro: forced ? `<p class="muted">Z bezpečnostních důvodů si před prací nastavte vlastní heslo.</p>` : "" });
}
async function start() {
  try { ME = await api("/api/me"); } catch { return logoutLocal(); }
  $("#login").classList.add("hidden"); $("#app").classList.remove("hidden");
  $("#who").innerHTML = `${esc(ME.name)} <span class="muted">(${ME.role === "owner" ? "majitel" : "správce"})</span><br>
    <a onclick="changePassword()">Změnit heslo</a> · <a id="lo">Odhlásit</a>`;
  $("#lo").onclick = async () => { await api("/api/logout", { body: {} }).catch(() => {}); logoutLocal(); };
  if (ME.must_change_pw) { $("#view").innerHTML = ""; return changePassword(true); }
  PROPS = await api("/api/properties");
  if (isOwner()) pendingCount = (await api("/api/approvals")).filter(a => a.status === "pending").length;
  route();
}

// ---------------------------------------------------------------- dashboard
async function viewDashboard(v) {
  const d = await api("/api/dashboard");
  const m = d.month.reduce((a, r) => ({ expected: a.expected + r.expected, paid: a.paid + r.paid_rent + r.other_income, exp: a.exp + r.expenses }), { expected: 0, paid: 0, exp: 0 });
  const cashTotal = d.cash.reduce((a, c) => a + c.expected, 0);
  v.innerHTML = `
  ${d.alerts.map(a => `<div class="alert ${a.level}">${esc(a.text)}</div>`).join("") || `<div class="alert ok">Vše v pořádku – žádná upozornění.</div>`}
  <div class="grid g4 mb">
    ${d.properties.map(p => `<div class="card stat"><div class="l">${esc(p.name)} – obsazenost</div>
      <div class="v">${p.occupied} / ${p.capacity}</div><div class="bar"><i style="width:${p.capacity ? p.occupied / p.capacity * 100 : 0}%"></i></div></div>`).join("")}
  </div>
  <div class="grid g4 mb">
    <div class="card stat"><div class="l">Předpis tento měsíc</div><div class="v">${kc(m.expected)}</div></div>
    <div class="card stat"><div class="l">Vybráno tento měsíc</div><div class="v">${kc(m.paid)}</div></div>
    <div class="card stat"><div class="l">Výdaje tento měsíc</div><div class="v">${kc(m.exp)}</div></div>
    <div class="card stat"><div class="l">Celkové dluhy nájemníků</div><div class="v" style="color:var(--bad)">${kc(d.debt_total)}</div></div>
    <div class="card stat"><div class="l">Hotovost v pokladnách (dle evidence)</div><div class="v">${kc(cashTotal)}</div></div>
    <div class="card stat"><div class="l">Držené kauce</div><div class="v">${kc(d.deposits_held)}</div></div>
  </div>
  <div class="grid g2">
    <div class="card"><h3>Největší dlužníci</h3>${table([
      { l: "Osoba", f: r => esc(r.person_name) + (r.active ? "" : ` <span class="pill">odhlášen</span>`) },
      { l: "Pokoj", f: r => esc(r.property_name + " " + r.unit_name) },
      { l: "Dluh", num: 1, f: r => `<b style="color:var(--bad)">${kc(r.balance)}</b>` }], d.debts, { onClick: stayDetail, empty: "Nikdo nedluží." })}</div>
    <div class="card"><h3>Tento měsíc podle objektů</h3>${table([
      { l: "Objekt", k: "property_name" }, { l: "Předpis", num: 1, f: r => kc(r.expected) },
      { l: "Vybráno", num: 1, f: r => kc(r.paid_rent + r.other_income) }, { l: "Výdaje", num: 1, f: r => kc(r.expenses) },
      { l: "Zisk", num: 1, f: r => `<b>${kc(r.profit)}</b>` }], d.month)}</div>
  </div>`;
}

// ---------------------------------------------------------------- rooms
let roomProp = null;
async function viewRooms(v) {
  PROPS = await api("/api/properties");
  if (!PROPS.length) { v.innerHTML = `<p class="muted">Nemáte přidělený žádný objekt.</p>`; return; }
  roomProp = PROPS.find(p => p.id === roomProp?.id) || PROPS[0];
  const p = roomProp;
  if (isOwner()) actions([["+ Přidat pokoj/byt", () => addUnit(p)]]);
  v.innerHTML = `<div class="tabs">${PROPS.map(x => `<button class="btn ${x.id === p.id ? "on" : ""}" data-p="${x.id}">${esc(x.name)} (${x.occupied}/${x.capacity})</button>`).join("")}</div>
    <p class="small muted mb"><span class="pill ok">volno</span> <span class="pill warn">částečně</span> <span class="pill info">obsazeno</span> <span class="pill bad">dluh</span> <span class="pill">údržba</span></p>
    <div class="rooms">${p.units.map(u => {
      const cls = u.maintenance ? "maint" : u.occupied === 0 ? "free" : u.occupied < u.capacity ? "part" : "full";
      return `<div class="room ${cls} ${u.debt > 0 ? "debt" : ""}" data-u="${u.id}"><b>${esc(u.name)}</b>
        <div class="s">${UKIND[u.kind] || esc(u.kind)} · ${u.occupied}/${u.capacity}</div>
        <div class="s">${u.stays.map(s => esc(s.person_name.split(" ").slice(-1)[0])).join(", ")}</div>
        ${u.debt > 0 ? `<div class="s" style="color:var(--bad)">${kc(u.debt)}</div>` : ""}</div>`;
    }).join("")}</div>`;
  v.querySelectorAll("[data-p]").forEach(b => b.onclick = () => { roomProp = PROPS.find(x => x.id == b.dataset.p); viewRooms(v); });
  v.querySelectorAll("[data-u]").forEach(b => b.onclick = () => unitDetail(p.units.find(u => u.id == b.dataset.u), p));
}
function addUnit(p) {
  form("Nový pokoj / byt – " + p.name, [
    { n: "name", l: "Označení", req: 1 },
    { n: "kind", l: "Typ", t: "select", opts: Object.entries(UKIND) },
    { n: "capacity", l: "Počet lůžek / nájemníků", t: "number", v: 1 },
    { n: "price_night", l: "Cena za noc (za lůžko)", t: "number", v: 0 },
    { n: "price_month", l: "Cena za měsíc (za lůžko / byt)", t: "number", v: 0 },
  ], async d => { await api("/api/units", { body: { ...d, property_id: p.id } }); toast("Přidáno"); reload(); });
}
function unitDetail(u, p) {
  $("#modalBody").innerHTML = `<h3>${esc(p.name)} – ${esc(u.name)}</h3>
    <p class="muted">${UKIND[u.kind] || esc(u.kind)}, ${u.capacity} lůžek · ceník: ${kc(u.price_night)}/noc, ${kc(u.price_month)}/měsíc
    ${u.maintenance ? ` · <span class="pill">v údržbě</span>` : ""}</p>
    ${u.stays.length ? table([{ l: "Nájemník", k: "person_name" }, { l: "Od", f: r => dt(r.start_date) },
      { l: "Saldo", num: 1, f: r => r.balance > 0 ? `<b style="color:var(--bad)">dluh ${kc(r.balance)}</b>` : `<span style="color:var(--ok)">${r.balance < 0 ? "přeplatek " + kc(-r.balance) : "OK"}</span>` }],
      u.stays, { onClick: s => { closeModal(); stayDetail(s); } }) : `<p>Pokoj je volný.</p>`}
    <div class="row" style="margin-top:12px">
      ${!u.maintenance && u.occupied < u.capacity ? `<button class="btn primary" id="ciBtn">Ubytovat</button>` : ""}
      <button class="btn" id="enBtn">Zapsat vstup do pokoje</button>
      <button class="btn" id="mtBtn">${u.maintenance ? "Ukončit údržbu" : "Dát do údržby"}</button>
      ${isOwner() ? `<button class="btn" id="edBtn">Upravit ceník</button>` : ""}
      <button class="btn ghost" onclick="closeModal()">Zavřít</button></div>`;
  $("#modal").classList.remove("hidden");
  $("#ciBtn") && ($("#ciBtn").onclick = () => checkin(u, p));
  $("#enBtn").onclick = () => roomEntry(u.id);
  $("#mtBtn").onclick = async () => { await api(`/api/units/${u.id}`, { method: "PUT", body: { maintenance: u.maintenance ? 0 : 1 } }); closeModal(); reload(); };
  $("#edBtn") && ($("#edBtn").onclick = () => form("Upravit " + u.name, [
    { n: "name", l: "Označení", v: u.name }, { n: "capacity", l: "Kapacita", t: "number", v: u.capacity },
    { n: "price_night", l: "Cena za noc", t: "number", v: u.price_night }, { n: "price_month", l: "Cena za měsíc", t: "number", v: u.price_month },
  ], async d => { await api(`/api/units/${u.id}`, { method: "PUT", body: { name: d.name, capacity: +d.capacity, price_night: +d.price_night, price_month: +d.price_month } }); toast("Uloženo"); reload(); }));
}

// ---------------------------------------------------------------- check-in
async function pickPerson() {
  const persons = await api("/api/persons");
  return [["", "— nová osoba (vyplňte níže) —"], ...persons.map(p => [p.id, p.name + (p.id_doc ? ` (${p.id_doc})` : "")])];
}
async function checkin(u, p) {
  const opts = await pickPerson();
  const monthly = p.type === "apartments";
  form(`Ubytovat – ${p.name} ${u.name}`, [
    { n: "person_id", l: "Existující osoba", t: "select", opts },
    { t: "html", html: `<div class="f2">` },
    { n: "name", l: "Jméno a příjmení (nová osoba)" }, { n: "id_doc", l: "Číslo OP / pasu" },
    { n: "phone", l: "Telefon" }, { n: "birth", l: "Datum narození", t: "date" },
    { t: "html", html: `</div><div class="f2">` },
    { n: "start_date", l: "Od", t: "date", v: todayIso(), req: 1 },
    { n: "planned_end", l: "Plánovaný konec (nepovinné)", t: "date" },
    { n: "rate_type", l: "Platí", t: "select", v: monthly ? "month" : "night", opts: [["night", "za noc"], ["month", "za měsíc"]] },
    { n: "rate", l: "Cena (prázdné = ceník)", t: "number", help: `Ceník: ${kc(u.price_night)}/noc, ${kc(u.price_month)}/měs.` },
    { n: "deposit", l: "Kauce (požadovaná)", t: "number", v: monthly ? u.price_month : 0 },
    { n: "deposit_paid", l: "Kauci platí teď", t: "select", opts: [["", "ne"], ["cash", "ano – hotově"], ["bank", "ano – převodem"]] },
    { t: "html", html: `</div>` },
    { n: "note", l: "Poznámka", t: "textarea" },
  ], async d => {
    let pid = d.person_id;
    if (!pid) {
      if (!d.name) throw new Error("Vyberte osobu nebo vyplňte jméno nové osoby");
      pid = (await api("/api/persons", { body: { name: d.name, id_doc: d.id_doc, phone: d.phone, birth: d.birth } })).id;
    }
    const body = { unit_id: u.id, person_id: +pid, start_date: d.start_date, planned_end: d.planned_end, rate_type: d.rate_type, deposit: d.deposit || 0, note: d.note };
    if (d.rate) body.rate = +d.rate;
    const r = await api("/api/stays", { body });
    if (d.deposit_paid && +d.deposit > 0) {
      const pay = await api("/api/payments", { body: { kind: "deposit", stay_id: r.id, amount: +d.deposit, method: d.deposit_paid, note: "Kauce při nástupu" } });
      printReceipt(pay);
    }
    toast(r.message, 6000); reload();
  }, { submit: "Ubytovat" });
}

// ---------------------------------------------------------------- stays
async function viewStays(v) {
  const status = v.dataset.status || "active";
  const rows = await api("/api/stays?status=" + status);
  v.innerHTML = `<div class="tabs">${[["active", "Aktuální"], ["ended", "Ukončené"], ["all", "Vše"]].map(t => `<button class="btn ${t[0] === status ? "on" : ""}" data-s="${t[0]}">${t[1]}</button>`).join("")}</div>
    <div class="card">${table([
      { l: "Nájemník", k: "person_name" }, { l: "Objekt", k: "property_name" }, { l: "Pokoj", k: "unit_name" },
      { l: "Od", f: r => dt(r.start_date) }, { l: "Do", f: r => r.checkout_date ? dt(r.checkout_date) : r.planned_end ? `<span class="muted">plán ${dt(r.planned_end)}</span>` : "" },
      { l: "Cena", num: 1, f: r => kc(r.rate) + (r.rate_type === "night" ? "/noc" : "/měs") },
      { l: "Předpis", num: 1, f: r => kc(r.expected) }, { l: "Zaplaceno", num: 1, f: r => kc(r.paid) },
      { l: "Saldo", num: 1, f: r => r.balance > 0.5 ? `<b style="color:var(--bad)">−${kc(r.balance)}</b>` : `<span style="color:var(--ok)">${r.balance < -0.5 ? "+" + kc(-r.balance) : "OK"}</span>` },
    ], rows, { onClick: stayDetail })}</div>`;
  v.querySelectorAll("[data-s]").forEach(b => b.onclick = () => { v.dataset.status = b.dataset.s; viewStays(v); });
}
async function stayDetail(s) {
  const person = await api(`/api/persons/${s.person_id}`);
  const st = person.stays.find(x => x.id === s.id) || s;
  const pays = person.payments.filter(p => p.stay_id === st.id);
  $("#modalBody").innerHTML = `<h3>${esc(st.person_name)} – ${esc(st.property_name)} ${esc(st.unit_name)}</h3>
    <p class="muted">Od ${dt(st.start_date)}${st.checkout_date ? " do " + dt(st.checkout_date) : ""} · ${kc(st.rate)} ${st.rate_type === "night" ? "za noc" : "za měsíc"} ·
      ${st.periods} ${st.rate_type === "night" ? "nocí" : "měsíců"}</p>
    <div class="grid g4 mb">
      <div class="card stat"><div class="l">Předpis</div><div class="v">${kc(st.expected)}</div></div>
      <div class="card stat"><div class="l">Zaplaceno</div><div class="v">${kc(st.paid)}</div></div>
      <div class="card stat"><div class="l">${st.balance > 0 ? "Dluží" : "Přeplatek"}</div><div class="v" style="color:${st.balance > 0.5 ? "var(--bad)" : "var(--ok)"}">${kc(Math.abs(st.balance))}</div></div>
      <div class="card stat"><div class="l">Kauce složena</div><div class="v">${kc(st.deposit_held)}</div><div class="small muted">požadováno ${kc(st.deposit)}</div></div>
    </div>
    <h3>Platby k pobytu</h3>
    ${table([{ l: "Doklad", k: "receipt_no" }, { l: "Datum", f: r => dt(r.date) }, { l: "Druh", f: r => KIND[r.kind] }, { l: "Způsob", f: r => METHOD[r.method] }, { l: "Částka", num: 1, f: r => kc(r.amount) }], pays)}
    <div class="row" style="margin-top:12px">
      <button class="btn primary" id="payBtn">Přijmout platbu</button>
      ${st.active ? `<button class="btn" id="coBtn">Odhlásit (konec pobytu)</button><button class="btn" id="rtBtn">Změnit cenu</button>` : ""}
      ${st.deposit_held > 0 ? `<button class="btn" id="drBtn">Vrátit kauci</button>` : ""}
      <button class="btn ghost" onclick="closeModal()">Zavřít</button></div>`;
  $("#modal").classList.remove("hidden");
  $("#payBtn").onclick = () => takePayment(st);
  $("#coBtn") && ($("#coBtn").onclick = () => form("Odhlášení – " + st.person_name, [
    { n: "date", l: "Datum odchodu", t: "date", v: todayIso(), req: 1 },
    { n: "room_check", l: "Stav pokoje při předání (vybavení, škody, klíče)", t: "textarea", req: 1 },
  ], async d => {
    const r = await api(`/api/stays/${st.id}/checkout`, { body: d });
    toast(r.balance > 0.5 ? `Odhlášeno. POZOR: zůstává dluh ${kc(r.balance)}` : "Odhlášeno.", 7000); reload();
  }, { intro: st.balance > 0.5 ? `<div class="alert bad">Nájemník dluží ${kc(st.balance)}. Dluh zůstane evidován i po odhlášení.</div>` : "" }));
  $("#rtBtn") && ($("#rtBtn").onclick = () => form("Změna ceny", [{ n: "rate", l: "Nová cena", t: "number", v: st.rate, req: 1 }],
    async d => { toast((await api(`/api/stays/${st.id}/rate`, { body: d })).message); reload(); },
    { intro: isOwner() ? "" : `<p class="muted">Změnu ceny schvaluje majitel.</p>` }));
  $("#drBtn") && ($("#drBtn").onclick = () => form("Vrácení kauce", [
    { n: "amount", l: "Částka k vrácení", t: "number", v: st.deposit_held, req: 1 },
    { n: "method", l: "Způsob", t: "select", opts: Object.entries(METHOD) },
    { n: "reason", l: "Důvod / srážky (škody, dluh…)", t: "textarea" },
  ], async d => { toast((await api(`/api/stays/${st.id}/deposit_refund`, { body: d })).message); reload(); },
    { intro: `<p class="muted">Vrácení kauce vždy schvaluje majitel – teprve pak se vydá peníze.</p>` }));
}
function takePayment(st) {
  form(`Platba – ${st.person_name}`, [
    { n: "kind", l: "Za co", t: "select", opts: [["rent", "Nájem / ubytování"], ["deposit", "Kauce"]] },
    { n: "amount", l: "Částka", t: "number", v: st.balance > 0 ? st.balance : st.rate, req: 1 },
    { n: "method", l: "Způsob", t: "select", opts: Object.entries(METHOD) },
    { n: "note", l: "Poznámka (např. za období)" },
  ], async d => { const p = await api("/api/payments", { body: { ...d, stay_id: st.id } }); toast("Přijato – doklad " + p.receipt_no); printReceipt(p); reload(); },
  { submit: "Přijmout a vystavit doklad" });
}
function printReceipt(p) {
  const w = window.open("", "_blank", "width=420,height=560");
  if (!w) return;
  w.document.write(`<html><head><title>Doklad ${esc(p.receipt_no)}</title><style>body{font:14px system-ui;padding:20px}td{padding:4px 8px}</style></head><body>
    <h2>Příjmový doklad č. ${esc(p.receipt_no)}</h2>
    <table><tr><td>Objekt</td><td>${esc(propName(p.property_id))}</td></tr><tr><td>Datum</td><td>${dt(p.date)}</td></tr>
    <tr><td>Druh</td><td>${KIND[p.kind]}</td></tr><tr><td>Způsob</td><td>${METHOD[p.method]}</td></tr>
    <tr><td>Částka</td><td><b>${kc(p.amount)}</b></td></tr><tr><td>Poznámka</td><td>${esc(p.note)}</td></tr>
    <tr><td>Přijal</td><td>${esc(ME.name)}</td></tr></table>
    <p style="margin-top:40px">Podpis plátce: ____________ &nbsp; Podpis příjemce: ____________</p>
    <p style="font-size:11px;color:#666">Doklad je evidován v systému a nelze jej smazat. Na každou platbu musí být vystaven doklad.</p>
    <script>print()<\/script></body></html>`);
}

// ---------------------------------------------------------------- persons
async function viewPersons(v) {
  actions([["+ Nová osoba", () => editPerson({})]]);
  const term = v.dataset.q || "";
  const rows = await api("/api/persons?q=" + encodeURIComponent(term));
  v.innerHTML = `<div class="row mb"><input id="pq" placeholder="Hledat jméno, doklad, telefon…" value="${esc(term)}" style="padding:7px 9px;border:1px solid var(--line);border-radius:7px;min-width:260px;background:var(--card);color:var(--ink)"></div>
    <div class="card">${table([{ l: "Jméno", k: "name" }, { l: "Doklad", k: "id_doc" }, { l: "Narozen", f: r => dt(r.birth) }, { l: "Telefon", k: "phone" }, { l: "Poznámka", k: "note" }],
    rows, { onClick: personDetail })}</div>`;
  const pq = $("#pq"); pq.onchange = () => { v.dataset.q = pq.value; viewPersons(v); };
}
function editPerson(p) {
  form(p.id ? "Upravit osobu" : "Nová osoba", [
    { n: "name", l: "Jméno a příjmení", v: p.name, req: 1 }, { n: "id_doc", l: "Číslo OP / pasu", v: p.id_doc },
    { n: "birth", l: "Datum narození", t: "date", v: p.birth }, { n: "phone", l: "Telefon", v: p.phone },
    { n: "email", l: "E-mail", v: p.email }, { n: "note", l: "Poznámka", t: "textarea", v: p.note },
  ], async d => { await api(p.id ? `/api/persons/${p.id}` : "/api/persons", { method: p.id ? "PUT" : "POST", body: d }); toast("Uloženo"); reload(); });
}
async function personDetail(p0) {
  const p = await api(`/api/persons/${p0.id}`);
  $("#modalBody").innerHTML = `<h3>${esc(p.name)}</h3><p class="muted">${esc(p.id_doc)} · ${esc(p.phone)} · ${esc(p.email)}</p>
    <h3>Pobyty</h3>${table([{ l: "Pokoj", f: r => esc(r.property_name + " " + r.unit_name) }, { l: "Od", f: r => dt(r.start_date) }, { l: "Do", f: r => dt(r.checkout_date) },
      { l: "Saldo", num: 1, f: r => r.balance > 0.5 ? `<b style="color:var(--bad)">−${kc(r.balance)}</b>` : "OK" }], p.stays, { onClick: s => { closeModal(); stayDetail(s); } })}
    <h3>Věci v úschově</h3>${table([{ l: "Věc", k: "description" }, { l: "Přijato", f: r => dtt(r.received_at) }, { l: "Stav", f: r => r.returned_at ? "vydáno " + dtt(r.returned_at) : `<span class="pill warn">v úschově</span>` }], p.belongings)}
    <div class="row" style="margin-top:12px"><button class="btn" id="epBtn">Upravit údaje</button><button class="btn ghost" onclick="closeModal()">Zavřít</button></div>`;
  $("#modal").classList.remove("hidden");
  $("#epBtn").onclick = () => editPerson(p);
}

// ---------------------------------------------------------------- payments
async function viewPayments(v) {
  const month = v.dataset.m || todayIso().slice(0, 7);
  const [y, m] = month.split("-").map(Number);
  const last = new Date(y, m, 0).getDate();
  const rows = await api(`/api/payments?from=${month}-01&to=${month}-${String(last).padStart(2, "0")}`);
  actions([["+ Ostatní příjem", () => form("Ostatní příjem (bez pobytu)", [
    { n: "property_id", l: "Objekt", t: "select", opts: propOpts() }, { n: "amount", l: "Částka", t: "number", req: 1 },
    { n: "method", l: "Způsob", t: "select", opts: Object.entries(METHOD) }, { n: "note", l: "Za co", req: 1 },
  ], async d => { const p = await api("/api/payments", { body: { ...d, kind: "other" } }); printReceipt(p); reload(); })]]);
  const sum = k => rows.filter(r => r.method === k).reduce((a, r) => a + r.amount, 0);
  v.innerHTML = `<div class="row mb"><label class="muted">Měsíc <input type="month" id="pm" value="${month}"></label>
    <span class="pill">hotově ${kc(sum("cash"))}</span><span class="pill">převodem ${kc(sum("bank"))}</span><span class="pill">kartou ${kc(sum("card"))}</span></div>
    <p class="small muted">Platby nelze upravit ani smazat. Chybu opravíte stornem, které schvaluje majitel. Čísla dokladů jdou souvisle za sebou.</p>
    <div class="card">${table([
      { l: "Doklad", k: "receipt_no" }, { l: "Datum", f: r => dt(r.date) }, { l: "Objekt", k: "property_name" }, { l: "Plátce", k: "person_name" },
      { l: "Druh", f: r => KIND[r.kind] + (r.storno_receipt ? ` <span class="pill bad">stornováno ${esc(r.storno_receipt)}</span>` : "") },
      { l: "Způsob", f: r => METHOD[r.method] }, { l: "Částka", num: 1, f: r => kc(r.amount) }, { l: "Zapsal", k: "created_by_name" },
      { l: "", f: r => ["rent", "deposit", "other"].includes(r.kind) && !r.storno_receipt ? `<button class="btn sm danger" data-st="${r.id}">Storno</button> <button class="btn sm" data-pr="${r.id}">Tisk</button>` : "" },
    ], rows)}</div>`;
  $("#pm").onchange = e => { v.dataset.m = e.target.value; viewPayments(v); };
  v.querySelectorAll("[data-st]").forEach(b => b.onclick = () => form("Storno platby", [{ n: "reason", l: "Důvod storna", t: "textarea", req: 1 }],
    async d => { toast((await api(`/api/payments/${b.dataset.st}/storno`, { body: d })).message); reload(); }));
  v.querySelectorAll("[data-pr]").forEach(b => b.onclick = () => printReceipt(rows.find(r => r.id == b.dataset.pr)));
}

// ---------------------------------------------------------------- expenses
async function viewExpenses(v) {
  const rows = await api("/api/expenses");
  const st = await api("/api/settings");
  actions([["+ Nový výdaj", () => form("Nový výdaj", [
    { n: "property_id", l: "Objekt", t: "select", opts: propOpts() },
    { t: "html", html: `<div class="f2">` },
    { n: "date", l: "Datum", t: "date", v: todayIso(), req: 1 }, { n: "amount", l: "Částka", t: "number", req: 1 },
    { n: "category", l: "Kategorie", t: "select", opts: EXP_CAT.map(c => [c, c]) }, { n: "method", l: "Placeno", t: "select", opts: Object.entries(METHOD) },
    { n: "supplier", l: "Dodavatel" }, { n: "doc_no", l: "Číslo účtenky / faktury", req: 1 },
    { t: "html", html: `</div>` },
    { n: "description", l: "Co bylo koupeno / opraveno", t: "textarea", req: 1 },
  ], async d => { toast((await api("/api/expenses", { body: d })).message, 5000); reload(); },
  { intro: `<p class="muted">Výdaje nad ${kc(st.expense_limit)} schvaluje majitel. Účtenku si uschovejte – číslo dokladu je povinné.</p>` })]]);
  const S = { pending: `<span class="pill warn">čeká</span>`, approved: `<span class="pill ok">schváleno</span>`, rejected: `<span class="pill bad">zamítnuto</span>` };
  v.innerHTML = `<div class="card">${table([
    { l: "Datum", f: r => dt(r.date) }, { l: "Objekt", k: "property_name" }, { l: "Kategorie", k: "category" }, { l: "Popis", k: "description" },
    { l: "Dodavatel", k: "supplier" }, { l: "Doklad", k: "doc_no" }, { l: "Placeno", f: r => METHOD[r.method] },
    { l: "Částka", num: 1, f: r => kc(r.amount) }, { l: "Stav", f: r => S[r.status] }, { l: "Zapsal", k: "created_by_name" }], rows)}</div>`;
}

// ---------------------------------------------------------------- cash
async function viewCash(v) {
  const rows = await api("/api/cash");
  v.innerHTML = `<p class="muted">Systém sám počítá, kolik hotovosti má být v pokladně (příjmy hotově − výdaje hotově − odvody). Při uzávěrce správce peníze fyzicky spočítá a zadá skutečnou částku.
     Každý rozdíl se trvale zapíše a majitel ho vidí.</p>` + rows.map(c => `
    <div class="card mb"><div class="row" style="justify-content:space-between"><h3>${esc(c.property_name)}</h3>
      <div class="row"><button class="btn primary" data-close="${c.property_id}">Uzávěrka pokladny</button><button class="btn" data-tr="${c.property_id}">Odvod hotovosti</button></div></div>
      <div class="grid g4 mb">
        <div class="stat"><div class="l">Má být v pokladně</div><div class="v">${kc(c.expected)}</div></div>
        <div class="stat"><div class="l">Příjmy hotově celkem</div><div class="v">${kc(c.income_cash)}</div></div>
        <div class="stat"><div class="l">Výdaje hotově</div><div class="v">${kc(c.expenses_cash)}</div>${c.pending_cash_expenses ? `<div class="small muted">+ ${kc(c.pending_cash_expenses)} čeká na schválení</div>` : ""}</div>
        <div class="stat"><div class="l">Manka / přebytky celkem</div><div class="v" style="color:${c.differences_total < 0 ? "var(--bad)" : "inherit"}">${kc(c.differences_total)}</div></div>
      </div>
      <div class="grid g2"><div><h3>Uzávěrky</h3>${table([{ l: "Kdy", f: r => dtt(r.created_at) }, { l: "Kdo", k: "user_name" }, { l: "Mělo být", num: 1, f: r => kc(r.expected) },
        { l: "Spočítáno", num: 1, f: r => kc(r.counted) }, { l: "Rozdíl", num: 1, f: r => Math.abs(r.difference) < 0.01 ? "0" : `<b style="color:var(--bad)">${kc(r.difference)}</b>` }, { l: "Pozn.", k: "note" }], c.closings)}</div>
      <div><h3>Odvody hotovosti</h3>${table([{ l: "Datum", f: r => dt(r.date) }, { l: "Částka", num: 1, f: r => kc(r.amount) }, { l: "Převzal", k: "received_by" }, { l: "Předal", k: "user_name" }], c.transfers_list)}</div></div>
    </div>`).join("");
  v.querySelectorAll("[data-close]").forEach(b => b.onclick = () => form("Uzávěrka pokladny – " + propName(b.dataset.close), [
    { n: "counted", l: "Skutečně spočítaná hotovost v pokladně", t: "number", req: 1 },
    { n: "note", l: "Poznámka (povinná při rozdílu)", t: "textarea" },
  ], async d => {
    const r = await api("/api/cash/closing", { body: { ...d, property_id: +b.dataset.close } });
    toast(Math.abs(r.difference) < 0.01 ? "Pokladna sedí." : `Rozdíl ${kc(r.difference)} byl zaevidován.`, 6000); reload();
  }, { intro: `<p class="muted">Nejdřív peníze spočítejte, teprve potom se dozvíte, kolik mělo být. Tak se nedá „dopočítat“ k očekávané částce.</p>` }));
  v.querySelectorAll("[data-tr]").forEach(b => b.onclick = () => form("Odvod hotovosti – " + propName(b.dataset.tr), [
    { n: "amount", l: "Částka", t: "number", req: 1 }, { n: "received_by", l: "Kdo peníze převzal (jméno) / vklad na účet", req: 1 }, { n: "note", l: "Poznámka" },
  ], async d => { await api("/api/cash/transfer", { body: { ...d, property_id: +b.dataset.tr } }); toast("Odvod zapsán"); reload(); }));
}

// ---------------------------------------------------------------- approvals
async function viewApprovals(v) {
  const rows = await api("/api/approvals");
  pendingCount = isOwner() ? rows.filter(a => a.status === "pending").length : 0; renderNav();
  const S = { pending: `<span class="pill warn">čeká</span>`, approved: `<span class="pill ok">schváleno</span>`, rejected: `<span class="pill bad">zamítnuto</span>` };
  v.innerHTML = `<p class="muted">${isOwner() ? "Operace, u kterých je riziko zneužití, se provedou až po vašem schválení." : "Vaše žádosti, které čekají na majitele."}</p>
    <div class="card">${table([{ l: "Kdy", f: r => dtt(r.requested_at) }, { l: "Typ", f: r => APPR[r.type] || r.type }, { l: "Popis", k: "summary" }, { l: "Žadatel", k: "requested_by_name" },
      { l: "Stav", f: r => S[r.status] + (r.decided_by_name ? `<div class="small muted">${esc(r.decided_by_name)} ${dtt(r.decided_at)} ${esc(r.decision_note)}</div>` : "") },
      { l: "", f: r => isOwner() && r.status === "pending" ? `<div class="row"><button class="btn sm primary" data-ok="${r.id}">Schválit</button><button class="btn sm danger" data-no="${r.id}">Zamítnout</button></div>` : "" }], rows)}</div>`;
  const decide = (id, approve) => form(approve ? "Schválit" : "Zamítnout", [{ n: "note", l: "Poznámka" }],
    async d => { await api(`/api/approvals/${id}/decide`, { body: { approve, note: d.note } }); toast("Vyřízeno"); reload(); }, { submit: approve ? "Schválit" : "Zamítnout" });
  v.querySelectorAll("[data-ok]").forEach(b => b.onclick = () => decide(b.dataset.ok, true));
  v.querySelectorAll("[data-no]").forEach(b => b.onclick = () => decide(b.dataset.no, false));
}

// ---------------------------------------------------------------- belongings
async function viewBelongings(v) {
  const rows = await api("/api/belongings");
  actions([["+ Převzít věc do úschovy", async () => {
    const opts = await pickPerson();
    const units = PROPS.flatMap(p => p.units.map(u => [u.id, p.name + " " + u.name]));
    form("Převzetí věci do úschovy", [
      { n: "person_id", l: "Komu věc patří", t: "select", opts: [["", "— neznámý majitel / nalezeno —"], ...opts.slice(1)] },
      { n: "unit_id", l: "Odkud (pokoj)", t: "select", opts: [["", "—"], ...units] },
      { n: "description", l: "Přesný popis věcí (co, kolik, stav, sériová čísla, peníze spočítat!)", t: "textarea", req: 1 },
      { n: "reason", l: "Důvod převzetí", t: "select", opts: [["Nájemník požádal o úschovu", "Nájemník požádal o úschovu"], ["Věci zůstaly po odchodu nájemníka", "Věci zůstaly po odchodu"], ["Nalezená věc", "Nalezená věc"], ["Vyklizení pokoje", "Vyklizení pokoje"], ["Jiný", "Jiný"]] },
      { n: "witness", l: "Svědek (jméno) – povinné", req: 1 },
    ], async d => { await api("/api/belongings", { body: d }); toast("Zapsáno do úschovy"); reload(); },
    { intro: `<p class="muted">Každou převzatou věc přesně popište za přítomnosti svědka. Záznam nelze smazat ani přepsat a vydat jej lze jen jednou.</p>` });
  }]]);
  v.innerHTML = `<div class="card">${table([
    { l: "Převzato", f: r => dtt(r.received_at) }, { l: "Majitel věci", f: r => esc(r.person_name || "neznámý") }, { l: "Pokoj", k: "unit_name" },
    { l: "Popis", k: "description" }, { l: "Důvod", k: "reason" }, { l: "Převzal / svědek", f: r => esc(r.received_by_name) + " / " + esc(r.witness) },
    { l: "Stav", f: r => r.returned_at ? `vydáno ${dtt(r.returned_at)}<div class="small muted">komu: ${esc(r.returned_to)}, svědek ${esc(r.return_witness)}</div>` : `<button class="btn sm" data-ret="${r.id}">Vydat</button>` },
  ], rows)}</div>`;
  v.querySelectorAll("[data-ret]").forEach(b => b.onclick = () => form("Vydání věci", [
    { n: "returned_to", l: "Komu vydáno (jméno, číslo dokladu)", req: 1 }, { n: "witness", l: "Svědek", req: 1 },
  ], async d => { await api(`/api/belongings/${b.dataset.ret}/return`, { body: d }); toast("Vydáno"); reload(); }));
}

// ---------------------------------------------------------------- room entries
function roomEntry(unitId) {
  const units = PROPS.flatMap(p => p.units.map(u => [u.id, p.name + " " + u.name]));
  form("Záznam o vstupu do pokoje", [
    { n: "unit_id", l: "Pokoj", t: "select", opts: units, v: unitId },
    { n: "entered_at", l: "Kdy", t: "datetime-local", v: new Date(Date.now() - new Date().getTimezoneOffset() * 6e4).toISOString().slice(0, 16) },
    { n: "reason", l: "Důvod vstupu", t: "select", opts: [["Oprava / údržba", "Oprava / údržba"], ["Úklid", "Úklid"], ["Kontrola stavu", "Kontrola stavu"], ["Havárie (voda, požár…)", "Havárie"], ["Odečet energií", "Odečet energií"], ["Jiný", "Jiný"]] },
    { n: "tenant_present", l: "Nájemník byl přítomen", t: "check" },
    { n: "tenant_notified", l: "Nájemník byl předem informován", t: "check" },
    { n: "witness", l: "Svědek (povinné, pokud nájemník nebyl přítomen)" },
    { n: "note", l: "Co se v pokoji dělo", t: "textarea" },
  ], async d => { await api("/api/entries", { body: d }); toast("Vstup zapsán"); if (location.hash === "#vstupy") reload(); });
}
async function viewEntries(v) {
  actions([["+ Zapsat vstup", () => roomEntry()]]);
  const rows = await api("/api/entries");
  v.innerHTML = `<p class="muted">Každý vstup personálu do obsazeného pokoje se musí zapsat. Bez přítomnosti nájemníka jen se svědkem. Záznamy nelze mazat.</p>
    <div class="card">${table([{ l: "Kdy", f: r => dtt(r.entered_at) }, { l: "Pokoj", f: r => esc(r.property_name + " " + r.unit_name) }, { l: "Kdo", k: "user_name" },
      { l: "Důvod", k: "reason" }, { l: "Nájemník", f: r => r.tenant_present ? `<span class="pill ok">přítomen</span>` : `<span class="pill warn">nepřítomen</span>` + (r.tenant_notified ? " informován" : "") },
      { l: "Svědek", k: "witness" }, { l: "Poznámka", k: "note" }], rows)}</div>`;
}

// ---------------------------------------------------------------- reports
async function viewReports(v) {
  const month = v.dataset.m || todayIso().slice(0, 7);
  const r = await api("/api/report?month=" + month);
  const tot = r.rows.reduce((a, x) => ({ e: a.e + x.expected, p: a.p + x.paid_rent, o: a.o + x.other_income, x: a.x + x.expenses, z: a.z + x.profit }), { e: 0, p: 0, o: 0, x: 0, z: 0 });
  actions([["Tisk", () => print()]]);
  v.innerHTML = `<div class="row mb"><label class="muted">Měsíc <input type="month" id="rm" value="${month}"></label></div>
    <div class="card mb">${table([{ l: "Objekt", k: "property_name" }, { l: "Předpis nájmů", num: 1, f: x => kc(x.expected) }, { l: "Vybráno nájmů", num: 1, f: x => kc(x.paid_rent) },
      { l: "Úspěšnost výběru", num: 1, f: x => x.expected ? Math.round(x.paid_rent / x.expected * 100) + " %" : "—" },
      { l: "Ostatní příjmy", num: 1, f: x => kc(x.other_income) }, { l: "Výdaje", num: 1, f: x => kc(x.expenses) }, { l: "Zisk", num: 1, f: x => `<b>${kc(x.profit)}</b>` }],
      [...r.rows, { property_name: "CELKEM", expected: tot.e, paid_rent: tot.p, other_income: tot.o, expenses: tot.x, profit: tot.z }])}</div>
    <div class="grid g2">${r.rows.map(x => `<div class="card"><h3>Výdaje – ${esc(x.property_name)}</h3>${table([{ l: "Kategorie", k: "category" }, { l: "Částka", num: 1, f: c => kc(c.s) }], x.expenses_by_category, { empty: "Bez výdajů" })}</div>`).join("")}</div>
    <p class="small muted">Předpis = kolik měli nájemníci za měsíc zaplatit podle skutečně evidovaných pobytů. Vybráno = přijaté platby nájmu (po odečtení storen). Velký rozdíl mezi nimi znamená dluhy nebo nezaevidované platby.</p>`;
  $("#rm").onchange = e => { v.dataset.m = e.target.value; viewReports(v); };
}

// ---------------------------------------------------------------- audit
async function viewAudit(v) {
  const term = v.dataset.q || "";
  const rows = await api("/api/audit?limit=500&q=" + encodeURIComponent(term));
  actions([["Ověřit neporušenost", async () => {
    const r = await api("/api/audit/verify");
    const gaps = r.receipt_gaps?.length ? ` POZOR: chybí čísla dokladů: ${r.receipt_gaps.map(g => g.year + ": " + g.missing.join(", ")).join("; ")}` : " Řada dokladů je souvislá.";
    $("#verifyRes").innerHTML = r.ok ? `<div class="alert ok">Záznamy jsou neporušené (${r.checked} záznamů ověřeno).${esc(gaps)}<br><span class="small">Kontrolní otisk: <code>${esc(r.last_hash)}</code> – poznamenejte si ho; pokud ho příště nenajdete v historii, data byla podvržena.</span></div>`
      : `<div class="alert bad">NARUŠENO! Záznam č. ${r.broken_at} byl změněn mimo systém. Data mohla být zfalšována – obnovte zálohu a prověřte, kdo měl přístup k počítači.</div>`;
  }, "primary"], ["Zálohovat databázi", async () => { const r = await api("/api/backup"); toast("Záloha uložena: " + r.file, 7000); }]]);
  v.innerHTML = `<div id="verifyRes"></div>
    <p class="muted">Kompletní neměnitelná historie všech akcí. Každý záznam je kryptograficky svázaný s předchozím – smazání nebo změna kteréhokoli z nich se při ověření odhalí.</p>
    <div class="row mb"><input id="aq" placeholder="Hledat (akce, uživatel, obsah)…" value="${esc(term)}" style="padding:7px 9px;border:1px solid var(--line);border-radius:7px;min-width:260px;background:var(--card);color:var(--ink)"></div>
    <div class="card">${table([{ l: "#", k: "id" }, { l: "Čas", f: r => dtt(r.ts) }, { l: "Uživatel", k: "username" }, { l: "Akce", f: r => `<b>${esc(r.action)}</b>` },
      { l: "Objekt", f: r => esc((r.entity || "") + (r.entity_id ? " #" + r.entity_id : "")) }, { l: "Detail", f: r => `<code>${esc(r.details)}</code>` }], rows)}</div>`;
  const aq = $("#aq"); aq.onchange = () => { v.dataset.q = aq.value; viewAudit(v); };
}

// ---------------------------------------------------------------- settings
async function viewSettings(v) {
  const [users, st] = await Promise.all([api("/api/users"), api("/api/settings")]);
  const allProps = await api("/api/properties");
  const propChecks = sel => allProps.map(p => ({ n: "p" + p.id, l: p.name, t: "check", v: sel.includes(p.id) }));
  const readProps = d => allProps.filter(p => d["p" + p.id]).map(p => p.id);
  actions([["+ Nový uživatel", () => form("Nový uživatel", [
    { n: "name", l: "Jméno", req: 1 }, { n: "username", l: "Přihlašovací jméno", req: 1 }, { n: "password", l: "Počáteční heslo (min. 8 znaků)", req: 1 },
    { n: "role", l: "Role", t: "select", opts: [["manager", "Správce (omezená práva)"], ["owner", "Majitel (plná práva)"]] },
    { t: "html", html: `<p class="small muted">Objekty, ke kterým má správce přístup:</p>` }, ...propChecks([]),
  ], async d => { await api("/api/users", { body: { ...d, properties: readProps(d) } }); toast("Uživatel vytvořen"); reload(); }), "primary"],
  ["+ Nový objekt", () => form("Nový objekt", [{ n: "name", l: "Název", req: 1 }, { n: "type", l: "Typ", t: "select", opts: Object.entries(PTYPE) }, { n: "address", l: "Adresa" }],
    async d => { await api("/api/properties", { body: d }); PROPS = await api("/api/properties"); toast("Objekt vytvořen"); reload(); })]]);
  v.innerHTML = `<div class="grid g2">
    <div class="card"><h3>Uživatelé</h3>${table([{ l: "Jméno", k: "name" }, { l: "Login", k: "username" }, { l: "Role", f: r => r.role === "owner" ? "majitel" : "správce" },
      { l: "Objekty", f: r => r.role === "owner" ? "vše" : esc(r.properties.map(propName).join(", ") || "žádné") },
      { l: "Stav", f: r => r.active ? `<span class="pill ok">aktivní</span>` : `<span class="pill bad">zablokován</span>` }], users, {
      onClick: u => form("Upravit " + u.name, [
        { n: "active", l: "Účet aktivní", t: "check", v: u.active }, { n: "password", l: "Nové heslo (nechte prázdné = beze změny)" },
        { t: "html", html: `<p class="small muted">Přístup k objektům:</p>` }, ...propChecks(u.properties),
      ], async d => { await api(`/api/users/${u.id}`, { method: "PUT", body: { active: d.active, password: d.password, properties: readProps(d) } }); toast("Uloženo"); reload(); }),
    })}</div>
    <div class="card"><h3>Pravidla (pojistky)</h3><form id="sf">
      <label>Výdaje nad tuto částku schvaluje majitel (Kč)<input name="expense_limit" type="number" value="${esc(st.expense_limit)}"></label>
      <label>Tolerovaný rozdíl v pokladně bez vysvětlení (Kč)<input name="cash_tolerance" type="number" value="${esc(st.cash_tolerance)}"></label>
      <label>Sleva pod ceník nad tolik % jde ke schválení<input name="rate_tolerance_pct" type="number" value="${esc(st.rate_tolerance_pct)}"></label>
      <button class="btn primary">Uložit pravidla</button></form>
      <p class="small muted">Každá změna pravidel se zapisuje do auditu.</p></div></div>`;
  $("#sf").onsubmit = async e => { e.preventDefault(); const fd = Object.fromEntries(new FormData(e.target)); await api("/api/settings", { method: "PUT", body: fd }); toast("Pravidla uložena"); };
}

if (TOKEN) start(); else logoutLocal();
