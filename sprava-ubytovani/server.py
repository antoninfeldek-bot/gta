#!/usr/bin/env python3
"""
Správa ubytování – systém pro ubytovnu, hotel a pronájem bytů.

Spuštění:   python server.py            (otevře http://localhost:8080)
            python server.py --port 9000
Bez externích knihoven – jen Python 3.9+.

Pojistky proti zneužití (stručně, podrobně v README):
  * finanční záznamy a auditní log NELZE upravit ani smazat (hlídají to triggery v databázi),
  * auditní log je řetězený hashem SHA-256 – jakýkoli zásah do souboru databáze se pozná,
  * příjmové doklady mají souvislou číselnou řadu bez děr,
  * storno platby, vrácení kauce a větší výdaje schvaluje majitel,
  * dlužné částky počítá systém sám z pobytů (správce nemůže "ztratit" tržbu),
  * pokladna se uzavírá spočítáním hotovosti – rozdíl (manko) se trvale eviduje,
  * vstupy do pokojů nájemníků a úschova jejich věcí se zapisují i se svědkem,
  * správce vidí jen objekty, které mu majitel přidělil.
"""
import argparse
import hashlib
import hmac
import json
import os
import secrets
import shutil
import sqlite3
import sys
import threading
import webbrowser
from datetime import date, datetime, timedelta
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

BASE_DIR = os.path.dirname(os.path.abspath(sys.argv[0] if getattr(sys, "frozen", False) else __file__))
STATIC_DIR = os.path.join(getattr(sys, "_MEIPASS", BASE_DIR), "static")
DB_PATH = os.environ.get("SPRAVA_DB", os.path.join(BASE_DIR, "data.db"))
SESSION_HOURS = 12
DB_LOCK = threading.RLock()


# --------------------------------------------------------------------------- DB
SCHEMA = """
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY, username TEXT UNIQUE NOT NULL, name TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('owner','manager')),
  pw_hash TEXT NOT NULL, salt TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 1,
  must_change_pw INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, user_id INTEGER NOT NULL, expires TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS properties (
  id INTEGER PRIMARY KEY, name TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('hostel','hotel','apartments')), address TEXT DEFAULT '');
CREATE TABLE IF NOT EXISTS user_properties (user_id INTEGER, property_id INTEGER, PRIMARY KEY(user_id, property_id));
CREATE TABLE IF NOT EXISTS units (
  id INTEGER PRIMARY KEY, property_id INTEGER NOT NULL REFERENCES properties(id),
  name TEXT NOT NULL, kind TEXT NOT NULL, capacity INTEGER NOT NULL DEFAULT 1,
  price_night REAL NOT NULL DEFAULT 0, price_month REAL NOT NULL DEFAULT 0,
  maintenance INTEGER NOT NULL DEFAULT 0, note TEXT DEFAULT '');
CREATE TABLE IF NOT EXISTS persons (
  id INTEGER PRIMARY KEY, name TEXT NOT NULL, id_doc TEXT DEFAULT '', birth TEXT DEFAULT '',
  phone TEXT DEFAULT '', email TEXT DEFAULT '', note TEXT DEFAULT '', created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS stays (
  id INTEGER PRIMARY KEY, unit_id INTEGER NOT NULL REFERENCES units(id),
  person_id INTEGER NOT NULL REFERENCES persons(id),
  start_date TEXT NOT NULL, planned_end TEXT, checkout_date TEXT,
  rate_type TEXT NOT NULL CHECK(rate_type IN ('night','month')), rate REAL NOT NULL,
  deposit REAL NOT NULL DEFAULT 0, note TEXT DEFAULT '',
  created_by INTEGER, created_at TEXT NOT NULL);
-- Platby: jen přidávání. Storno = nový záznam se zápornou částkou.
CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY, receipt_no TEXT UNIQUE NOT NULL,
  kind TEXT NOT NULL CHECK(kind IN ('rent','deposit','deposit_refund','storno','other')),
  property_id INTEGER NOT NULL, stay_id INTEGER, person_id INTEGER,
  date TEXT NOT NULL, amount REAL NOT NULL, method TEXT NOT NULL CHECK(method IN ('cash','bank','card')),
  note TEXT DEFAULT '', ref_payment_id INTEGER, created_by INTEGER NOT NULL, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS expenses (
  id INTEGER PRIMARY KEY, property_id INTEGER NOT NULL, date TEXT NOT NULL, amount REAL NOT NULL,
  category TEXT NOT NULL, description TEXT NOT NULL, method TEXT NOT NULL CHECK(method IN ('cash','bank','card')),
  supplier TEXT DEFAULT '', doc_no TEXT DEFAULT '',
  status TEXT NOT NULL CHECK(status IN ('pending','approved','rejected')),
  created_by INTEGER NOT NULL, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS cash_transfers (
  id INTEGER PRIMARY KEY, property_id INTEGER NOT NULL, date TEXT NOT NULL, amount REAL NOT NULL,
  received_by TEXT NOT NULL, note TEXT DEFAULT '', created_by INTEGER NOT NULL, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS cash_closings (
  id INTEGER PRIMARY KEY, property_id INTEGER NOT NULL, expected REAL NOT NULL, counted REAL NOT NULL,
  difference REAL NOT NULL, note TEXT DEFAULT '', created_by INTEGER NOT NULL, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS approvals (
  id INTEGER PRIMARY KEY, type TEXT NOT NULL, payload TEXT NOT NULL, summary TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', requested_by INTEGER NOT NULL, requested_at TEXT NOT NULL,
  decided_by INTEGER, decided_at TEXT, decision_note TEXT DEFAULT '');
CREATE TABLE IF NOT EXISTS belongings (
  id INTEGER PRIMARY KEY, person_id INTEGER, unit_id INTEGER, description TEXT NOT NULL,
  reason TEXT NOT NULL, witness TEXT NOT NULL, received_by INTEGER NOT NULL, received_at TEXT NOT NULL,
  returned_to TEXT, returned_by INTEGER, returned_at TEXT, return_witness TEXT);
CREATE TABLE IF NOT EXISTS room_entries (
  id INTEGER PRIMARY KEY, unit_id INTEGER NOT NULL, user_id INTEGER NOT NULL, entered_at TEXT NOT NULL,
  reason TEXT NOT NULL, witness TEXT DEFAULT '', tenant_present INTEGER NOT NULL DEFAULT 0,
  tenant_notified INTEGER NOT NULL DEFAULT 0, note TEXT DEFAULT '');
CREATE TABLE IF NOT EXISTS audit (
  id INTEGER PRIMARY KEY, ts TEXT NOT NULL, user_id INTEGER, username TEXT, action TEXT NOT NULL,
  entity TEXT, entity_id INTEGER, details TEXT, prev_hash TEXT NOT NULL, hash TEXT NOT NULL);

-- Nezměnitelnost: tyto tabulky nejde přepsat ani mazat
CREATE TRIGGER IF NOT EXISTS audit_no_update BEFORE UPDATE ON audit BEGIN SELECT RAISE(ABORT,'audit je neměnný'); END;
CREATE TRIGGER IF NOT EXISTS audit_no_delete BEFORE DELETE ON audit BEGIN SELECT RAISE(ABORT,'audit je neměnný'); END;
CREATE TRIGGER IF NOT EXISTS pay_no_update BEFORE UPDATE ON payments BEGIN SELECT RAISE(ABORT,'platby nelze měnit – použijte storno'); END;
CREATE TRIGGER IF NOT EXISTS pay_no_delete BEFORE DELETE ON payments BEGIN SELECT RAISE(ABORT,'platby nelze mazat – použijte storno'); END;
CREATE TRIGGER IF NOT EXISTS closing_no_update BEFORE UPDATE ON cash_closings BEGIN SELECT RAISE(ABORT,'uzávěrky jsou neměnné'); END;
CREATE TRIGGER IF NOT EXISTS closing_no_delete BEFORE DELETE ON cash_closings BEGIN SELECT RAISE(ABORT,'uzávěrky jsou neměnné'); END;
CREATE TRIGGER IF NOT EXISTS transfer_no_update BEFORE UPDATE ON cash_transfers BEGIN SELECT RAISE(ABORT,'odvody jsou neměnné'); END;
CREATE TRIGGER IF NOT EXISTS transfer_no_delete BEFORE DELETE ON cash_transfers BEGIN SELECT RAISE(ABORT,'odvody jsou neměnné'); END;
CREATE TRIGGER IF NOT EXISTS entries_no_update BEFORE UPDATE ON room_entries BEGIN SELECT RAISE(ABORT,'záznamy o vstupu jsou neměnné'); END;
CREATE TRIGGER IF NOT EXISTS entries_no_delete BEFORE DELETE ON room_entries BEGIN SELECT RAISE(ABORT,'záznamy o vstupu jsou neměnné'); END;
CREATE TRIGGER IF NOT EXISTS exp_no_delete BEFORE DELETE ON expenses BEGIN SELECT RAISE(ABORT,'výdaje nelze mazat'); END;
CREATE TRIGGER IF NOT EXISTS exp_only_status BEFORE UPDATE ON expenses
  WHEN NEW.amount != OLD.amount OR NEW.date != OLD.date OR NEW.property_id != OLD.property_id
    OR NEW.method != OLD.method OR NEW.description != OLD.description OR OLD.status != 'pending'
  BEGIN SELECT RAISE(ABORT,'výdaj lze jen schválit/zamítnout'); END;
CREATE TRIGGER IF NOT EXISTS bel_no_delete BEFORE DELETE ON belongings BEGIN SELECT RAISE(ABORT,'úschovu nelze mazat'); END;
CREATE TRIGGER IF NOT EXISTS bel_return_once BEFORE UPDATE ON belongings
  WHEN OLD.returned_at IS NOT NULL OR NEW.description != OLD.description OR NEW.received_at != OLD.received_at
  BEGIN SELECT RAISE(ABORT,'úschovu lze jen jednou vydat'); END;
CREATE TRIGGER IF NOT EXISTS stays_no_delete BEFORE DELETE ON stays BEGIN SELECT RAISE(ABORT,'pobyty nelze mazat'); END;
"""

DEFAULT_SETTINGS = {
    "expense_limit": "2000",       # výdaje nad tuto částku schvaluje majitel
    "cash_tolerance": "50",        # tolerovaný rozdíl v pokladně
    "rate_tolerance_pct": "10",    # sleva proti ceníku nad X % jde ke schválení
}


def now_iso():
    return datetime.now().isoformat(timespec="seconds")


def today():
    return date.today()


def connect():
    conn = sqlite3.connect(DB_PATH, check_same_thread=False, isolation_level=None)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys=ON")
    conn.execute("PRAGMA journal_mode=WAL")
    return conn


DB = None


def q(sql, params=()):
    return [dict(r) for r in DB.execute(sql, params).fetchall()]


def q1(sql, params=()):
    r = DB.execute(sql, params).fetchone()
    return dict(r) if r else None


def setting(key):
    r = q1("SELECT value FROM settings WHERE key=?", (key,))
    return float(r["value"]) if r else float(DEFAULT_SETTINGS[key])


def hash_pw(pw, salt=None):
    salt = salt or secrets.token_hex(16)
    h = hashlib.pbkdf2_hmac("sha256", pw.encode(), salt.encode(), 200_000).hex()
    return h, salt


# ------------------------------------------------------------------ audit chain
def _entry_hash(prev, ts, uid, username, action, entity, entity_id, details):
    payload = "|".join(str(x) for x in (prev, ts, uid, username, action, entity, entity_id, details))
    return hashlib.sha256(payload.encode()).hexdigest()


def audit(user, action, entity=None, entity_id=None, details=None):
    last = q1("SELECT hash FROM audit ORDER BY id DESC LIMIT 1")
    prev = last["hash"] if last else "GENESIS"
    ts = now_iso()
    uid = user["id"] if user else None
    uname = user["username"] if user else "system"
    det = json.dumps(details or {}, ensure_ascii=False, sort_keys=True)
    h = _entry_hash(prev, ts, uid, uname, action, entity, entity_id, det)
    DB.execute("INSERT INTO audit(ts,user_id,username,action,entity,entity_id,details,prev_hash,hash) VALUES(?,?,?,?,?,?,?,?,?)",
               (ts, uid, uname, action, entity, entity_id, det, prev, h))


def verify_audit():
    prev = "GENESIS"
    count = 0
    for r in DB.execute("SELECT * FROM audit ORDER BY id"):
        h = _entry_hash(prev, r["ts"], r["user_id"], r["username"], r["action"], r["entity"], r["entity_id"], r["details"])
        if r["prev_hash"] != prev or r["hash"] != h:
            return {"ok": False, "broken_at": r["id"], "checked": count}
        prev = r["hash"]
        count += 1
    # Kontrola souvislé řady dokladů
    gaps = []
    by_year = {}
    for r in q("SELECT receipt_no FROM payments"):
        y, n = r["receipt_no"].split("-")
        by_year.setdefault(y, []).append(int(n))
    for y, nums in by_year.items():
        nums.sort()
        expected = list(range(1, nums[-1] + 1))
        missing = sorted(set(expected) - set(nums))
        if missing:
            gaps.append({"year": y, "missing": missing[:50]})
    return {"ok": True, "checked": count, "last_hash": prev, "receipt_gaps": gaps}


# ---------------------------------------------------------------- init / seed
def init_db():
    global DB
    DB = connect()
    DB.executescript(SCHEMA)
    for k, v in DEFAULT_SETTINGS.items():
        DB.execute("INSERT OR IGNORE INTO settings(key,value) VALUES(?,?)", (k, v))
    if not q1("SELECT id FROM users LIMIT 1"):
        h, s = hash_pw("majitel")
        DB.execute("INSERT INTO users(username,name,role,pw_hash,salt,must_change_pw) VALUES(?,?,?,?,?,1)",
                   ("majitel", "Majitel", "owner", h, s))
        audit(None, "system_init", details={"msg": "Vytvořen účet majitel/majitel"})
    if not q1("SELECT id FROM properties LIMIT 1"):
        seed_properties()


def seed_properties():
    cur = DB.execute("INSERT INTO properties(name,type,address) VALUES('Ubytovna','hostel','')")
    pid = cur.lastrowid
    for i in range(1, 21):
        DB.execute("INSERT INTO units(property_id,name,kind,capacity,price_night,price_month) VALUES(?,?,?,?,?,?)",
                   (pid, f"U{i:02d}", "single", 1, 350, 6500))
    for i in range(21, 51):
        DB.execute("INSERT INTO units(property_id,name,kind,capacity,price_night,price_month) VALUES(?,?,?,?,?,?)",
                   (pid, f"U{i:02d}", "double", 2, 280, 5000))
    cur = DB.execute("INSERT INTO properties(name,type,address) VALUES('Hotel','hotel','')")
    pid = cur.lastrowid
    for i in range(1, 7):
        DB.execute("INSERT INTO units(property_id,name,kind,capacity,price_night,price_month) VALUES(?,?,?,?,?,?)",
                   (pid, f"H{i}", "room", 2, 1490, 0))
    cur = DB.execute("INSERT INTO properties(name,type,address) VALUES('Byty','apartments','')")
    pid = cur.lastrowid
    for i in range(1, 46):
        DB.execute("INSERT INTO units(property_id,name,kind,capacity,price_night,price_month) VALUES(?,?,?,?,?,?)",
                   (pid, f"B{i:02d}", "apartment", 1, 0, 12000))
    audit(None, "seed", details={"msg": "Založeny objekty: Ubytovna 50 pokojů, Hotel 6 pokojů, Byty 45"})


# ------------------------------------------------------------------- business
def parse_d(s):
    return datetime.strptime(s[:10], "%Y-%m-%d").date()


def add_months(d, k):
    m = d.month - 1 + k
    y = d.year + m // 12
    m = m % 12 + 1
    import calendar
    day = min(d.day, calendar.monthrange(y, m)[1])
    return date(y, m, day)


def stay_expected(st, upto=None):
    """Kolik měl host zaplatit od začátku pobytu do dneška / do odhlášení. Počítá systém – nelze ovlivnit."""
    start = parse_d(st["start_date"])
    upto = upto or today()
    if st["checkout_date"]:
        end = parse_d(st["checkout_date"])
        if end > upto:
            end = upto
    else:
        end = upto
    if end < start:
        return 0.0, 0
    if st["rate_type"] == "night":
        if st["checkout_date"] and parse_d(st["checkout_date"]) <= upto:
            n = max(1, (end - start).days)
        else:
            n = (end - start).days + 1  # včetně dnešní noci
        return round(n * st["rate"], 2), n
    # měsíční nájem: platí se každý započatý měsíc
    k = 0
    limit = end if (st["checkout_date"] and parse_d(st["checkout_date"]) <= upto) else end + timedelta(days=1)
    while add_months(start, k) < limit:
        k += 1
    k = max(k, 1)
    return round(k * st["rate"], 2), k


def stay_paid(stay_id):
    r = q1("SELECT COALESCE(SUM(amount),0) s FROM payments WHERE stay_id=? AND kind IN ('rent','storno') "
           "AND (kind='rent' OR ref_payment_id IN (SELECT id FROM payments WHERE kind='rent'))", (stay_id,))
    return round(r["s"], 2)


def stay_deposit_held(stay_id):
    r = q1("SELECT COALESCE(SUM(amount),0) s FROM payments WHERE stay_id=? AND (kind IN ('deposit','deposit_refund') "
           "OR (kind='storno' AND ref_payment_id IN (SELECT id FROM payments WHERE kind='deposit')))", (stay_id,))
    return round(r["s"], 2)


def enrich_stay(st):
    exp, units = stay_expected(st)
    paid = stay_paid(st["id"])
    st["expected"] = exp
    st["periods"] = units
    st["paid"] = paid
    st["balance"] = round(exp - paid, 2)  # kladné = dluh
    st["deposit_held"] = stay_deposit_held(st["id"])
    st["active"] = st["checkout_date"] is None
    return st


STAY_SELECT = """SELECT s.*, p.name person_name, p.phone person_phone, u.name unit_name, u.property_id,
  pr.name property_name, pr.type property_type
  FROM stays s JOIN persons p ON p.id=s.person_id JOIN units u ON u.id=s.unit_id JOIN properties pr ON pr.id=u.property_id"""


def next_receipt_no():
    y = today().year
    r = q1("SELECT receipt_no FROM payments WHERE receipt_no LIKE ? ORDER BY receipt_no DESC LIMIT 1", (f"{y}-%",))
    n = int(r["receipt_no"].split("-")[1]) + 1 if r else 1
    return f"{y}-{n:06d}"


def insert_payment(user, kind, property_id, amount, method, stay_id=None, person_id=None, note="", ref=None, pdate=None):
    no = next_receipt_no()
    cur = DB.execute("INSERT INTO payments(receipt_no,kind,property_id,stay_id,person_id,date,amount,method,note,ref_payment_id,created_by,created_at)"
                     " VALUES(?,?,?,?,?,?,?,?,?,?,?,?)",
                     (no, kind, property_id, stay_id, person_id, pdate or today().isoformat(), amount, method, note, ref, user["id"], now_iso()))
    audit(user, "payment_" + kind, "payment", cur.lastrowid,
          {"receipt": no, "amount": amount, "method": method, "stay": stay_id, "note": note, "ref": ref})
    return q1("SELECT * FROM payments WHERE id=?", (cur.lastrowid,))


def cash_state(property_id):
    inc = q1("SELECT COALESCE(SUM(amount),0) s FROM payments WHERE property_id=? AND method='cash'", (property_id,))["s"]
    exp = q1("SELECT COALESCE(SUM(amount),0) s FROM expenses WHERE property_id=? AND method='cash' AND status='approved'", (property_id,))["s"]
    pend = q1("SELECT COALESCE(SUM(amount),0) s FROM expenses WHERE property_id=? AND method='cash' AND status='pending'", (property_id,))["s"]
    tr = q1("SELECT COALESCE(SUM(amount),0) s FROM cash_transfers WHERE property_id=?", (property_id,))["s"]
    diffs = q1("SELECT COALESCE(SUM(difference),0) s FROM cash_closings WHERE property_id=?", (property_id,))["s"]
    expected = round(inc - exp - tr + diffs, 2)
    last = q1("SELECT * FROM cash_closings WHERE property_id=? ORDER BY id DESC LIMIT 1", (property_id,))
    return {"property_id": property_id, "income_cash": inc, "expenses_cash": exp, "pending_cash_expenses": pend,
            "transfers": tr, "differences_total": round(diffs, 2), "expected": expected, "last_closing": last}


def execute_approval(appr, owner):
    p = json.loads(appr["payload"])
    t = appr["type"]
    if t == "payment_storno":
        orig = q1("SELECT * FROM payments WHERE id=?", (p["payment_id"],))
        if q1("SELECT id FROM payments WHERE ref_payment_id=? AND kind='storno'", (orig["id"],)):
            raise ApiError("Platba už byla stornována")
        insert_payment(owner, "storno", orig["property_id"], -orig["amount"], orig["method"], orig["stay_id"],
                       orig["person_id"], f"Storno dokladu {orig['receipt_no']}: {p['reason']}", orig["id"])
    elif t == "deposit_refund":
        st = q1(STAY_SELECT + " WHERE s.id=?", (p["stay_id"],))
        held = stay_deposit_held(st["id"])
        if p["amount"] > held + 0.001:
            raise ApiError(f"Na kauci je jen {held} Kč")
        insert_payment(owner, "deposit_refund", st["property_id"], -p["amount"], p["method"], st["id"], st["person_id"],
                       f"Vrácení kauce: {p.get('reason','')}")
    elif t == "expense":
        e = q1("SELECT * FROM expenses WHERE id=?", (p["expense_id"],))
        if e["method"] == "cash" and e["amount"] > cash_state(e["property_id"])["expected"] + 0.001:
            raise ApiError("V pokladně podle evidence není na tento hotovostní výdaj dost peněz – zamítněte ho nebo nejdřív zkontrolujte pokladnu")
        DB.execute("UPDATE expenses SET status='approved' WHERE id=?", (p["expense_id"],))
    elif t == "rate_discount":
        DB.execute("UPDATE stays SET rate=? WHERE id=?", (p["rate"], p["stay_id"]))
    else:
        raise ApiError("Neznámý typ žádosti")


def request_approval(user, typ, payload, summary):
    cur = DB.execute("INSERT INTO approvals(type,payload,summary,requested_by,requested_at) VALUES(?,?,?,?,?)",
                     (typ, json.dumps(payload, ensure_ascii=False), summary, user["id"], now_iso()))
    audit(user, "approval_request", "approval", cur.lastrowid, {"type": typ, "summary": summary, **payload})
    return cur.lastrowid


# ----------------------------------------------------------------------- API
class ApiError(Exception):
    def __init__(self, msg, code=400):
        super().__init__(msg)
        self.code = code


ROUTES = []


def route(method, pattern, auth=True, owner=False):
    parts = pattern.strip("/").split("/")

    def deco(fn):
        ROUTES.append((method, parts, fn, auth, owner))
        return fn
    return deco


def allowed_props(user):
    if user["role"] == "owner":
        return [r["id"] for r in q("SELECT id FROM properties")]
    return [r["property_id"] for r in q("SELECT property_id FROM user_properties WHERE user_id=?", (user["id"],))]


def check_prop(user, pid):
    if int(pid) not in allowed_props(user):
        raise ApiError("K tomuto objektu nemáte přístup", 403)


def in_clause(ids):
    return "(" + ",".join(str(int(i)) for i in ids) + ")" if ids else "(-1)"


def need(body, *keys):
    for k in keys:
        if body.get(k) in (None, ""):
            raise ApiError(f"Chybí pole: {k}")


def num(v, name="částka", positive=True):
    try:
        x = round(float(v), 2)
    except (TypeError, ValueError):
        raise ApiError(f"Neplatná {name}")
    if positive and x <= 0:
        raise ApiError(f"{name.capitalize()} musí být kladná")
    return x


# --- auth
@route("POST", "/api/login", auth=False)
def login(user, body, qs):
    u = q1("SELECT * FROM users WHERE username=? AND active=1", (body.get("username", ""),))
    if not u or not hmac.compare_digest(hash_pw(body.get("password", ""), u["salt"])[0], u["pw_hash"]):
        raise ApiError("Špatné jméno nebo heslo", 401)
    token = secrets.token_urlsafe(32)
    DB.execute("INSERT INTO sessions VALUES(?,?,?)", (token, u["id"], (datetime.now() + timedelta(hours=SESSION_HOURS)).isoformat()))
    audit(u, "login")
    return {"token": token}


@route("POST", "/api/logout")
def logout(user, body, qs):
    DB.execute("DELETE FROM sessions WHERE user_id=?", (user["id"],))
    audit(user, "logout")
    return {"ok": True}


@route("GET", "/api/me")
def me(user, body, qs):
    return {k: user[k] for k in ("id", "username", "name", "role", "must_change_pw")} | {"properties": allowed_props(user)}


@route("POST", "/api/me/password")
def change_pw(user, body, qs):
    need(body, "old", "new")
    if hash_pw(body["old"], user["salt"])[0] != user["pw_hash"]:
        raise ApiError("Staré heslo nesouhlasí")
    if len(body["new"]) < 8:
        raise ApiError("Heslo musí mít aspoň 8 znaků")
    h, s = hash_pw(body["new"])
    DB.execute("UPDATE users SET pw_hash=?, salt=?, must_change_pw=0 WHERE id=?", (h, s, user["id"]))
    audit(user, "password_change", "user", user["id"])
    return {"ok": True}


# --- users (owner)
@route("GET", "/api/users", owner=True)
def users_list(user, body, qs):
    rows = q("SELECT id,username,name,role,active FROM users ORDER BY id")
    for r in rows:
        r["properties"] = [x["property_id"] for x in q("SELECT property_id FROM user_properties WHERE user_id=?", (r["id"],))]
    return rows


@route("POST", "/api/users", owner=True)
def users_create(user, body, qs):
    need(body, "username", "name", "password", "role")
    if body["role"] not in ("owner", "manager"):
        raise ApiError("Neplatná role")
    if len(body["password"]) < 8:
        raise ApiError("Heslo musí mít aspoň 8 znaků")
    h, s = hash_pw(body["password"])
    try:
        cur = DB.execute("INSERT INTO users(username,name,role,pw_hash,salt,must_change_pw) VALUES(?,?,?,?,?,1)",
                         (body["username"], body["name"], body["role"], h, s))
    except sqlite3.IntegrityError:
        raise ApiError("Uživatel už existuje")
    for pid in body.get("properties", []):
        DB.execute("INSERT INTO user_properties VALUES(?,?)", (cur.lastrowid, int(pid)))
    audit(user, "user_create", "user", cur.lastrowid, {"username": body["username"], "role": body["role"], "properties": body.get("properties", [])})
    return {"id": cur.lastrowid}


@route("PUT", "/api/users/:id", owner=True)
def users_update(user, body, qs, id):
    u = q1("SELECT * FROM users WHERE id=?", (id,))
    if not u:
        raise ApiError("Nenalezeno", 404)
    if "active" in body:
        if int(id) == user["id"] and not body["active"]:
            raise ApiError("Nemůžete zablokovat sami sebe")
        DB.execute("UPDATE users SET active=? WHERE id=?", (1 if body["active"] else 0, id))
        if not body["active"]:
            DB.execute("DELETE FROM sessions WHERE user_id=?", (id,))
    if "properties" in body:
        DB.execute("DELETE FROM user_properties WHERE user_id=?", (id,))
        for pid in body["properties"]:
            DB.execute("INSERT INTO user_properties VALUES(?,?)", (id, int(pid)))
    if body.get("password"):
        if len(body["password"]) < 8:
            raise ApiError("Heslo musí mít aspoň 8 znaků")
        h, s = hash_pw(body["password"])
        DB.execute("UPDATE users SET pw_hash=?, salt=?, must_change_pw=1 WHERE id=?", (h, s, id))
        body = {**body, "password": "***"}
    audit(user, "user_update", "user", int(id), body)
    return {"ok": True}


# --- settings
@route("GET", "/api/settings")
def settings_get(user, body, qs):
    return {r["key"]: r["value"] for r in q("SELECT * FROM settings")}


@route("PUT", "/api/settings", owner=True)
def settings_put(user, body, qs):
    for k, v in body.items():
        if k in DEFAULT_SETTINGS:
            old = q1("SELECT value FROM settings WHERE key=?", (k,))
            DB.execute("UPDATE settings SET value=? WHERE key=?", (str(num(v, k, positive=False)), k))
            audit(user, "setting_change", details={"key": k, "old": old["value"] if old else None, "new": v})
    return {"ok": True}


# --- properties / units
@route("GET", "/api/properties")
def properties(user, body, qs):
    ids = allowed_props(user)
    props = q(f"SELECT * FROM properties WHERE id IN {in_clause(ids)} ORDER BY id")
    active = q(STAY_SELECT + " WHERE s.checkout_date IS NULL")
    by_unit = {}
    for st in active:
        by_unit.setdefault(st["unit_id"], []).append(enrich_stay(st))
    for p in props:
        p["units"] = q("SELECT * FROM units WHERE property_id=? ORDER BY name", (p["id"],))
        beds = occ = 0
        for un in p["units"]:
            un["stays"] = by_unit.get(un["id"], [])
            un["occupied"] = len(un["stays"])
            un["debt"] = round(sum(max(0, s["balance"]) for s in un["stays"]), 2)
            if not un["maintenance"]:
                beds += un["capacity"]
                occ += min(un["occupied"], un["capacity"])
        p["capacity"] = beds
        p["occupied"] = occ
    return props


@route("POST", "/api/properties", owner=True)
def property_create(user, body, qs):
    need(body, "name", "type")
    cur = DB.execute("INSERT INTO properties(name,type,address) VALUES(?,?,?)", (body["name"], body["type"], body.get("address", "")))
    audit(user, "property_create", "property", cur.lastrowid, body)
    return {"id": cur.lastrowid}


@route("POST", "/api/units", owner=True)
def unit_create(user, body, qs):
    need(body, "property_id", "name", "kind")
    cur = DB.execute("INSERT INTO units(property_id,name,kind,capacity,price_night,price_month,note) VALUES(?,?,?,?,?,?,?)",
                     (body["property_id"], body["name"], body["kind"], int(body.get("capacity", 1)),
                      num(body.get("price_night", 0), "cena", False), num(body.get("price_month", 0), "cena", False), body.get("note", "")))
    audit(user, "unit_create", "unit", cur.lastrowid, body)
    return {"id": cur.lastrowid}


@route("PUT", "/api/units/:id")
def unit_update(user, body, qs, id):
    un = q1("SELECT * FROM units WHERE id=?", (id,))
    if not un:
        raise ApiError("Nenalezeno", 404)
    check_prop(user, un["property_id"])
    owner_fields = ["name", "kind", "capacity", "price_night", "price_month"]
    if user["role"] != "owner" and any(f in body and body[f] != un[f] for f in owner_fields):
        raise ApiError("Ceny, kapacitu a názvy může měnit jen majitel", 403)
    changes = {}
    for f in ["maintenance", "note"] + owner_fields:
        if f in body and body[f] != un[f]:
            changes[f] = {"old": un[f], "new": body[f]}
            DB.execute(f"UPDATE units SET {f}=? WHERE id=?", (body[f], id))
    audit(user, "unit_update", "unit", int(id), changes)
    return {"ok": True}


# --- persons
@route("GET", "/api/persons")
def persons(user, body, qs):
    term = "%" + qs.get("q", [""])[0] + "%"
    return q("SELECT * FROM persons WHERE name LIKE ? OR id_doc LIKE ? OR phone LIKE ? ORDER BY name LIMIT 200", (term, term, term))


@route("POST", "/api/persons")
def person_create(user, body, qs):
    need(body, "name")
    cur = DB.execute("INSERT INTO persons(name,id_doc,birth,phone,email,note,created_at) VALUES(?,?,?,?,?,?,?)",
                     (body["name"], body.get("id_doc", ""), body.get("birth", ""), body.get("phone", ""),
                      body.get("email", ""), body.get("note", ""), now_iso()))
    audit(user, "person_create", "person", cur.lastrowid, {"name": body["name"]})
    return {"id": cur.lastrowid}


@route("PUT", "/api/persons/:id")
def person_update(user, body, qs, id):
    p = q1("SELECT * FROM persons WHERE id=?", (id,))
    if not p:
        raise ApiError("Nenalezeno", 404)
    changes = {}
    for f in ("name", "id_doc", "birth", "phone", "email", "note"):
        if f in body and body[f] != p[f]:
            changes[f] = {"old": p[f], "new": body[f]}
            DB.execute(f"UPDATE persons SET {f}=? WHERE id=?", (body[f], id))
    audit(user, "person_update", "person", int(id), changes)
    return {"ok": True}


@route("GET", "/api/persons/:id")
def person_detail(user, body, qs, id):
    p = q1("SELECT * FROM persons WHERE id=?", (id,))
    if not p:
        raise ApiError("Nenalezeno", 404)
    ids = allowed_props(user)
    p["stays"] = [enrich_stay(s) for s in q(STAY_SELECT + f" WHERE s.person_id=? AND u.property_id IN {in_clause(ids)} ORDER BY s.start_date DESC", (id,))]
    p["payments"] = q(f"SELECT * FROM payments WHERE person_id=? AND property_id IN {in_clause(ids)} ORDER BY id DESC", (id,))
    p["belongings"] = q("SELECT * FROM belongings WHERE person_id=? ORDER BY id DESC", (id,))
    return p


# --- stays
@route("GET", "/api/stays")
def stays(user, body, qs):
    ids = allowed_props(user)
    status = qs.get("status", ["active"])[0]
    where = f" WHERE u.property_id IN {in_clause(ids)}"
    if status == "active":
        where += " AND s.checkout_date IS NULL"
    elif status == "ended":
        where += " AND s.checkout_date IS NOT NULL"
    if qs.get("property"):
        where += " AND u.property_id=%d" % int(qs["property"][0])
    return [enrich_stay(s) for s in q(STAY_SELECT + where + " ORDER BY s.checkout_date IS NOT NULL, s.start_date DESC LIMIT 500")]


@route("POST", "/api/stays")
def stay_create(user, body, qs):
    need(body, "unit_id", "person_id", "start_date", "rate_type")
    un = q1("SELECT * FROM units WHERE id=?", (body["unit_id"],))
    if not un:
        raise ApiError("Pokoj neexistuje")
    check_prop(user, un["property_id"])
    if un["maintenance"]:
        raise ApiError("Pokoj je v údržbě")
    occ = q1("SELECT COUNT(*) c FROM stays WHERE unit_id=? AND checkout_date IS NULL", (un["id"],))["c"]
    if occ >= un["capacity"]:
        raise ApiError("Pokoj je plně obsazen")
    if q1("SELECT id FROM stays WHERE person_id=? AND checkout_date IS NULL", (body["person_id"],)):
        raise ApiError("Osoba už má aktivní pobyt – nejdřív ji odhlaste")
    rt = body["rate_type"]
    list_price = un["price_night"] if rt == "night" else un["price_month"]
    rate = num(body.get("rate", list_price), "cena")
    parse_d(body["start_date"])
    deposit = num(body.get("deposit", 0) or 0, "kauce", False)
    needs_ok = bool(list_price) and user["role"] != "owner" and rate < list_price * (1 - setting("rate_tolerance_pct") / 100)
    cur = DB.execute("INSERT INTO stays(unit_id,person_id,start_date,planned_end,rate_type,rate,deposit,note,created_by,created_at)"
                     " VALUES(?,?,?,?,?,?,?,?,?,?)",
                     (un["id"], body["person_id"], body["start_date"], body.get("planned_end") or None, rt,
                      list_price if needs_ok else rate, deposit, body.get("note", ""), user["id"], now_iso()))
    sid = cur.lastrowid
    audit(user, "checkin", "stay", sid, {"unit": un["name"], "person": body["person_id"], "rate": rate, "list_price": list_price, "rate_type": rt})
    msg = "Ubytováno."
    if needs_ok:
        request_approval(user, "rate_discount", {"stay_id": sid, "rate": rate, "list_price": list_price},
                         f"Sleva pro pobyt #{sid} ({un['name']}): {rate} Kč místo ceníkových {list_price} Kč")
        msg += f" Sleva pod ceník šla ke schválení majiteli – do té doby platí ceník {list_price} Kč."
    return {"id": sid, "message": msg}


@route("POST", "/api/stays/:id/checkout")
def stay_checkout(user, body, qs, id):
    st = q1(STAY_SELECT + " WHERE s.id=?", (id,))
    if not st or st["checkout_date"]:
        raise ApiError("Pobyt není aktivní")
    check_prop(user, st["property_id"])
    d = body.get("date") or today().isoformat()
    if parse_d(d) < parse_d(st["start_date"]):
        raise ApiError("Datum odhlášení je před začátkem pobytu")
    DB.execute("UPDATE stays SET checkout_date=? WHERE id=?", (d, id))
    st = enrich_stay(q1(STAY_SELECT + " WHERE s.id=?", (id,)))
    audit(user, "checkout", "stay", int(id), {"date": d, "balance": st["balance"], "deposit_held": st["deposit_held"],
                                               "room_check": body.get("room_check", "")})
    return st


@route("POST", "/api/stays/:id/rate")
def stay_rate(user, body, qs, id):
    st = q1(STAY_SELECT + " WHERE s.id=?", (id,))
    if not st:
        raise ApiError("Nenalezeno", 404)
    check_prop(user, st["property_id"])
    rate = num(body.get("rate"), "cena")
    if user["role"] == "owner":
        DB.execute("UPDATE stays SET rate=? WHERE id=?", (rate, id))
        audit(user, "rate_change", "stay", int(id), {"old": st["rate"], "new": rate})
        return {"message": "Cena změněna."}
    request_approval(user, "rate_discount", {"stay_id": int(id), "rate": rate, "list_price": st["rate"]},
                     f"Změna ceny pobytu #{id} ({st['unit_name']}, {st['person_name']}): {st['rate']} → {rate} Kč")
    return {"message": "Změna ceny odeslána ke schválení majiteli."}


@route("POST", "/api/stays/:id/deposit_refund")
def stay_deposit_refund(user, body, qs, id):
    st = q1(STAY_SELECT + " WHERE s.id=?", (id,))
    check_prop(user, st["property_id"])
    amount = num(body.get("amount"))
    if amount > stay_deposit_held(st["id"]) + 0.001:
        raise ApiError("Částka je vyšší než složená kauce")
    request_approval(user, "deposit_refund", {"stay_id": st["id"], "amount": amount, "method": body.get("method", "cash"),
                                              "reason": body.get("reason", "")},
                     f"Vrácení kauce {amount} Kč – {st['person_name']} ({st['unit_name']})")
    return {"message": "Žádost o vrácení kauce odeslána majiteli."}


# --- payments
@route("GET", "/api/payments")
def payments(user, body, qs):
    ids = allowed_props(user)
    frm = qs.get("from", ["0000"])[0]
    to = qs.get("to", ["9999"])[0]
    return q(f"""SELECT pa.*, pe.name person_name, us.name created_by_name, pr.name property_name,
                 (SELECT receipt_no FROM payments x WHERE x.ref_payment_id=pa.id AND x.kind='storno') storno_receipt
                 FROM payments pa LEFT JOIN persons pe ON pe.id=pa.person_id LEFT JOIN users us ON us.id=pa.created_by
                 JOIN properties pr ON pr.id=pa.property_id
                 WHERE pa.property_id IN {in_clause(ids)} AND pa.date>=? AND pa.date<=? ORDER BY pa.id DESC LIMIT 1000""", (frm, to))


@route("POST", "/api/payments")
def payment_create(user, body, qs):
    need(body, "amount", "method", "kind")
    if body["kind"] not in ("rent", "deposit", "other"):
        raise ApiError("Neplatný druh platby")
    amount = num(body["amount"])
    stay_id = body.get("stay_id")
    person_id = body.get("person_id")
    if stay_id:
        st = q1(STAY_SELECT + " WHERE s.id=?", (stay_id,))
        if not st:
            raise ApiError("Pobyt neexistuje")
        pid, person_id = st["property_id"], st["person_id"]
    else:
        need(body, "property_id")
        if body["kind"] != "other":
            raise ApiError("Platba nájmu/kauce musí být k pobytu")
        pid = int(body["property_id"])
    check_prop(user, pid)
    pay = insert_payment(user, body["kind"], pid, amount, body["method"], stay_id, person_id, body.get("note", ""))
    return pay


@route("POST", "/api/payments/:id/storno")
def payment_storno(user, body, qs, id):
    need(body, "reason")
    p = q1("SELECT * FROM payments WHERE id=?", (id,))
    if not p or p["kind"] in ("storno", "deposit_refund"):
        raise ApiError("Tuto platbu nelze stornovat")
    check_prop(user, p["property_id"])
    if q1("SELECT id FROM payments WHERE ref_payment_id=? AND kind='storno'", (id,)) or \
       q1("SELECT id FROM approvals WHERE type='payment_storno' AND status='pending' AND json_extract(payload,'$.payment_id')=?", (int(id),)):
        raise ApiError("Storno už existuje nebo čeká na schválení")
    aid = request_approval(user, "payment_storno", {"payment_id": int(id), "reason": body["reason"]},
                           f"Storno dokladu {p['receipt_no']} na {p['amount']} Kč – důvod: {body['reason']}")
    if user["role"] == "owner":
        decide(user, {"approve": True, "note": "Storno provedl majitel"}, {}, aid)
        return {"message": "Stornováno."}
    return {"message": "Storno odesláno ke schválení majiteli."}


# --- expenses
@route("GET", "/api/expenses")
def expenses(user, body, qs):
    ids = allowed_props(user)
    return q(f"""SELECT e.*, u.name created_by_name, p.name property_name FROM expenses e
                 LEFT JOIN users u ON u.id=e.created_by JOIN properties p ON p.id=e.property_id
                 WHERE e.property_id IN {in_clause(ids)} ORDER BY e.id DESC LIMIT 1000""")


@route("POST", "/api/expenses")
def expense_create(user, body, qs):
    need(body, "property_id", "amount", "category", "description", "method")
    check_prop(user, body["property_id"])
    amount = num(body["amount"])
    limit = setting("expense_limit")
    status = "approved" if (user["role"] == "owner" or amount <= limit) else "pending"
    if body["method"] == "cash" and status == "approved" and user["role"] != "owner":
        cs = cash_state(int(body["property_id"]))
        if amount > cs["expected"]:
            raise ApiError("V pokladně podle evidence není tolik hotovosti")
    cur = DB.execute("INSERT INTO expenses(property_id,date,amount,category,description,method,supplier,doc_no,status,created_by,created_at)"
                     " VALUES(?,?,?,?,?,?,?,?,?,?,?)",
                     (body["property_id"], body.get("date") or today().isoformat(), amount, body["category"], body["description"],
                      body["method"], body.get("supplier", ""), body.get("doc_no", ""), status, user["id"], now_iso()))
    eid = cur.lastrowid
    audit(user, "expense_create", "expense", eid, {"amount": amount, "category": body["category"], "description": body["description"],
                                                   "method": body["method"], "status": status, "doc_no": body.get("doc_no", "")})
    if status == "pending":
        request_approval(user, "expense", {"expense_id": eid}, f"Výdaj {amount} Kč – {body['category']}: {body['description']}")
        return {"id": eid, "message": f"Výdaj nad {limit:.0f} Kč čeká na schválení majitelem."}
    return {"id": eid, "message": "Výdaj zapsán."}


# --- cash
@route("GET", "/api/cash")
def cash(user, body, qs):
    out = []
    for pid in allowed_props(user):
        cs = cash_state(pid)
        cs["property_name"] = q1("SELECT name FROM properties WHERE id=?", (pid,))["name"]
        cs["closings"] = q("SELECT c.*, u.name user_name FROM cash_closings c LEFT JOIN users u ON u.id=c.created_by "
                           "WHERE property_id=? ORDER BY c.id DESC LIMIT 30", (pid,))
        cs["transfers_list"] = q("SELECT t.*, u.name user_name FROM cash_transfers t LEFT JOIN users u ON u.id=t.created_by "
                                 "WHERE property_id=? ORDER BY t.id DESC LIMIT 30", (pid,))
        out.append(cs)
    return out


@route("POST", "/api/cash/closing")
def cash_closing(user, body, qs):
    need(body, "property_id", "counted")
    pid = int(body["property_id"])
    check_prop(user, pid)
    counted = num(body["counted"], "částka", False)
    cs = cash_state(pid)
    diff = round(counted - cs["expected"], 2)
    if abs(diff) > setting("cash_tolerance") and not body.get("note"):
        raise ApiError(f"Rozdíl {diff} Kč je nad tolerancí – napište vysvětlení do poznámky")
    cur = DB.execute("INSERT INTO cash_closings(property_id,expected,counted,difference,note,created_by,created_at) VALUES(?,?,?,?,?,?,?)",
                     (pid, cs["expected"], counted, diff, body.get("note", ""), user["id"], now_iso()))
    audit(user, "cash_closing", "cash_closing", cur.lastrowid, {"property": pid, "expected": cs["expected"], "counted": counted, "difference": diff})
    return {"expected": cs["expected"], "counted": counted, "difference": diff}


@route("POST", "/api/cash/transfer")
def cash_transfer(user, body, qs):
    need(body, "property_id", "amount", "received_by")
    pid = int(body["property_id"])
    check_prop(user, pid)
    amount = num(body["amount"])
    if amount > cash_state(pid)["expected"] + 0.001:
        raise ApiError("V pokladně podle evidence není tolik hotovosti")
    cur = DB.execute("INSERT INTO cash_transfers(property_id,date,amount,received_by,note,created_by,created_at) VALUES(?,?,?,?,?,?,?)",
                     (pid, today().isoformat(), amount, body["received_by"], body.get("note", ""), user["id"], now_iso()))
    audit(user, "cash_transfer", "cash_transfer", cur.lastrowid, {"property": pid, "amount": amount, "received_by": body["received_by"]})
    return {"ok": True}


# --- approvals
@route("GET", "/api/approvals")
def approvals(user, body, qs):
    where = "" if user["role"] == "owner" else f" WHERE a.requested_by={int(user['id'])}"
    return q(f"""SELECT a.*, u.name requested_by_name, d.name decided_by_name FROM approvals a
                 LEFT JOIN users u ON u.id=a.requested_by LEFT JOIN users d ON d.id=a.decided_by{where}
                 ORDER BY a.status!='pending', a.id DESC LIMIT 300""")


@route("POST", "/api/approvals/:id/decide", owner=True)
def decide(user, body, qs, id):
    a = q1("SELECT * FROM approvals WHERE id=?", (id,))
    if not a or a["status"] != "pending":
        raise ApiError("Žádost už byla vyřízena")
    approve = bool(body.get("approve"))
    if approve:
        execute_approval(a, user)
    elif a["type"] == "expense":
        DB.execute("UPDATE expenses SET status='rejected' WHERE id=?", (json.loads(a["payload"])["expense_id"],))
    DB.execute("UPDATE approvals SET status=?, decided_by=?, decided_at=?, decision_note=? WHERE id=?",
               ("approved" if approve else "rejected", user["id"], now_iso(), body.get("note", ""), id))
    audit(user, "approval_" + ("approved" if approve else "rejected"), "approval", int(id), {"type": a["type"], "summary": a["summary"]})
    return {"ok": True}


# --- belongings (úschova věcí nájemníků)
@route("GET", "/api/belongings")
def belongings(user, body, qs):
    return q("""SELECT b.*, p.name person_name, u.name unit_name, r.name received_by_name, rb.name returned_by_name
                FROM belongings b LEFT JOIN persons p ON p.id=b.person_id LEFT JOIN units u ON u.id=b.unit_id
                LEFT JOIN users r ON r.id=b.received_by LEFT JOIN users rb ON rb.id=b.returned_by
                ORDER BY b.returned_at IS NOT NULL, b.id DESC LIMIT 500""")


@route("POST", "/api/belongings")
def belonging_create(user, body, qs):
    need(body, "description", "reason", "witness")
    cur = DB.execute("INSERT INTO belongings(person_id,unit_id,description,reason,witness,received_by,received_at) VALUES(?,?,?,?,?,?,?)",
                     (body.get("person_id") or None, body.get("unit_id") or None, body["description"], body["reason"],
                      body["witness"], user["id"], now_iso()))
    audit(user, "belonging_receive", "belonging", cur.lastrowid, body)
    return {"id": cur.lastrowid}


@route("POST", "/api/belongings/:id/return")
def belonging_return(user, body, qs, id):
    need(body, "returned_to", "witness")
    b = q1("SELECT * FROM belongings WHERE id=?", (id,))
    if not b or b["returned_at"]:
        raise ApiError("Věc už byla vydána")
    DB.execute("UPDATE belongings SET returned_to=?, returned_by=?, returned_at=?, return_witness=? WHERE id=?",
               (body["returned_to"], user["id"], now_iso(), body["witness"], id))
    audit(user, "belonging_return", "belonging", int(id), body)
    return {"ok": True}


# --- room entries
@route("GET", "/api/entries")
def entries(user, body, qs):
    ids = allowed_props(user)
    return q(f"""SELECT e.*, u.name unit_name, us.name user_name, p.name property_name FROM room_entries e
                 JOIN units u ON u.id=e.unit_id JOIN properties p ON p.id=u.property_id LEFT JOIN users us ON us.id=e.user_id
                 WHERE u.property_id IN {in_clause(ids)} ORDER BY e.id DESC LIMIT 500""")


@route("POST", "/api/entries")
def entry_create(user, body, qs):
    need(body, "unit_id", "reason")
    un = q1("SELECT * FROM units WHERE id=?", (body["unit_id"],))
    check_prop(user, un["property_id"])
    occupied = q1("SELECT COUNT(*) c FROM stays WHERE unit_id=? AND checkout_date IS NULL", (un["id"],))["c"]
    if occupied and not body.get("tenant_present") and not body.get("witness"):
        raise ApiError("Do obsazeného pokoje bez přítomnosti nájemníka jen se svědkem")
    cur = DB.execute("INSERT INTO room_entries(unit_id,user_id,entered_at,reason,witness,tenant_present,tenant_notified,note) VALUES(?,?,?,?,?,?,?,?)",
                     (un["id"], user["id"], body.get("entered_at") or now_iso(), body["reason"], body.get("witness", ""),
                      1 if body.get("tenant_present") else 0, 1 if body.get("tenant_notified") else 0, body.get("note", "")))
    audit(user, "room_entry", "unit", un["id"], body)
    return {"id": cur.lastrowid}


# --- dashboard / reports
def month_range(ym):
    y, m = map(int, ym.split("-"))
    start = date(y, m, 1)
    end = add_months(start, 1) - timedelta(days=1)
    return start, end


def month_report(ids, ym):
    start, end = month_range(ym)
    rows = []
    for pid in ids:
        pr = q1("SELECT * FROM properties WHERE id=?", (pid,))
        # předpis za měsíc = rozdíl "měl zaplatit do konce měsíce" a "do konce minulého"
        expected = 0.0
        for st in q(STAY_SELECT + " WHERE u.property_id=? AND s.start_date<=? AND (s.checkout_date IS NULL OR s.checkout_date>=?)",
                    (pid, end.isoformat(), start.isoformat())):
            upto = min(end, today())
            if upto < start:
                continue
            a, _ = stay_expected(st, upto)
            b, _ = stay_expected(st, start - timedelta(days=1)) if parse_d(st["start_date"]) < start else (0, 0)
            expected += a - b
        paid = q1("SELECT COALESCE(SUM(amount),0) s FROM payments WHERE property_id=? AND date BETWEEN ? AND ? AND "
                  "(kind='rent' OR (kind='storno' AND ref_payment_id IN (SELECT id FROM payments WHERE kind='rent')))",
                  (pid, start.isoformat(), end.isoformat()))["s"]
        other = q1("SELECT COALESCE(SUM(amount),0) s FROM payments WHERE property_id=? AND date BETWEEN ? AND ? AND "
                   "(kind='other' OR (kind='storno' AND ref_payment_id IN (SELECT id FROM payments WHERE kind='other')))",
                   (pid, start.isoformat(), end.isoformat()))["s"]
        exp = q1("SELECT COALESCE(SUM(amount),0) s FROM expenses WHERE property_id=? AND status='approved' AND date BETWEEN ? AND ?",
                 (pid, start.isoformat(), end.isoformat()))["s"]
        bycat = q("SELECT category, SUM(amount) s FROM expenses WHERE property_id=? AND status='approved' AND date BETWEEN ? AND ? GROUP BY category",
                  (pid, start.isoformat(), end.isoformat()))
        rows.append({"property_id": pid, "property_name": pr["name"], "expected": round(expected, 2), "paid_rent": round(paid, 2),
                     "other_income": round(other, 2), "expenses": round(exp, 2), "profit": round(paid + other - exp, 2),
                     "expenses_by_category": bycat})
    return rows


@route("GET", "/api/report")
def report(user, body, qs):
    ym = qs.get("month", [today().strftime("%Y-%m")])[0]
    return {"month": ym, "rows": month_report(allowed_props(user), ym)}


@route("GET", "/api/dashboard")
def dashboard(user, body, qs):
    ids = allowed_props(user)
    props = properties(user, body, qs)
    debts = [s for s in stays(user, {}, {"status": ["all"]}) if s["balance"] > 0.5]
    debts.sort(key=lambda s: -s["balance"])
    cash_all = [cash_state(pid) | {"property_name": q1("SELECT name FROM properties WHERE id=?", (pid,))["name"]} for pid in ids]
    alerts = []
    for c in cash_all:
        last = c["last_closing"]
        moved_since = q1("SELECT COUNT(*) c FROM payments WHERE property_id=? AND method='cash' AND created_at>?",
                         (c["property_id"], last["created_at"] if last else ""))["c"]
        if moved_since and (not last or datetime.fromisoformat(last["created_at"]) < datetime.now() - timedelta(days=1)):
            alerts.append({"level": "warn", "text": f"{c['property_name']}: pokladna nebyla uzavřena přes 24 h"})
        if last and abs(last["difference"]) > setting("cash_tolerance"):
            alerts.append({"level": "bad", "text": f"{c['property_name']}: poslední uzávěrka s rozdílem {last['difference']} Kč"})
    pend = q1("SELECT COUNT(*) c FROM approvals WHERE status='pending'")["c"] if user["role"] == "owner" else 0
    if pend:
        alerts.append({"level": "warn", "text": f"{pend} žádostí čeká na vaše schválení"})
    since = (datetime.now() - timedelta(days=7)).isoformat()
    stornos = q1(f"SELECT COUNT(*) c FROM payments WHERE kind='storno' AND created_at>=? AND property_id IN {in_clause(ids)}", (since,))["c"]
    if stornos >= 3:
        alerts.append({"level": "bad", "text": f"{stornos} storen plateb za posledních 7 dní – zkontrolujte"})
    entries_wo = q1(f"""SELECT COUNT(*) c FROM room_entries e JOIN units u ON u.id=e.unit_id WHERE e.entered_at>=?
                        AND e.tenant_present=0 AND u.property_id IN {in_clause(ids)}""", (since,))["c"]
    if entries_wo:
        alerts.append({"level": "info", "text": f"{entries_wo}× vstup do pokoje bez přítomnosti nájemníka za 7 dní"})
    failed = q1("SELECT COUNT(*) c FROM audit WHERE action='login_failed' AND ts>=?", (since,))["c"] if user["role"] == "owner" else 0
    if failed >= 5:
        alerts.append({"level": "warn", "text": f"{failed} neúspěšných přihlášení za 7 dní"})
    overdue = [s for s in debts if s["active"] and s["rate_type"] == "month" and s["balance"] >= s["rate"]]
    return {
        "properties": [{k: p[k] for k in ("id", "name", "type", "capacity", "occupied")} for p in props],
        "debt_total": round(sum(s["balance"] for s in debts), 2),
        "debts": debts[:15],
        "overdue_count": len(overdue),
        "cash": cash_all,
        "alerts": alerts,
        "month": month_report(ids, today().strftime("%Y-%m")),
        "deposits_held": round(q1(f"""SELECT COALESCE(SUM(amount),0) s FROM payments WHERE property_id IN {in_clause(ids)} AND
              (kind IN ('deposit','deposit_refund') OR (kind='storno' AND ref_payment_id IN (SELECT id FROM payments WHERE kind='deposit')))""")["s"], 2),
    }


# --- audit
@route("GET", "/api/audit", owner=True)
def audit_list(user, body, qs):
    lim = min(int(qs.get("limit", ["300"])[0]), 5000)
    term = qs.get("q", [""])[0]
    if term:
        return q("SELECT * FROM audit WHERE action LIKE ? OR username LIKE ? OR details LIKE ? ORDER BY id DESC LIMIT ?",
                 (f"%{term}%",) * 3 + (lim,))
    return q("SELECT * FROM audit ORDER BY id DESC LIMIT ?", (lim,))


@route("GET", "/api/audit/verify", owner=True)
def audit_verify(user, body, qs):
    res = verify_audit()
    audit(user, "audit_verify", details={"ok": res["ok"], "checked": res["checked"]})
    return res


@route("GET", "/api/backup", owner=True)
def backup(user, body, qs):
    os.makedirs(os.path.join(BASE_DIR, "zalohy"), exist_ok=True)
    path = os.path.join(BASE_DIR, "zalohy", f"zaloha-{datetime.now():%Y%m%d-%H%M%S}.db")
    dst = sqlite3.connect(path)
    DB.backup(dst)
    dst.close()
    audit(user, "backup", details={"file": os.path.basename(path)})
    return {"file": path, "last_hash": q1("SELECT hash FROM audit ORDER BY id DESC LIMIT 1")["hash"]}


# ------------------------------------------------------------------ HTTP layer
MIME = {".html": "text/html; charset=utf-8", ".js": "application/javascript; charset=utf-8",
        ".css": "text/css; charset=utf-8", ".svg": "image/svg+xml", ".ico": "image/x-icon"}


class Handler(BaseHTTPRequestHandler):
    server_version = "SpravaUbytovani/1.0"

    def log_message(self, fmt, *args):
        pass

    def _send(self, code, data, ctype="application/json; charset=utf-8"):
        body = data if isinstance(data, bytes) else json.dumps(data, ensure_ascii=False, default=str).encode()
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.end_headers()
        self.wfile.write(body)

    def _user(self):
        auth = self.headers.get("Authorization", "")
        if not auth.startswith("Bearer "):
            return None
        s = q1("SELECT * FROM sessions WHERE token=?", (auth[7:],))
        if not s or s["expires"] < datetime.now().isoformat():
            return None
        return q1("SELECT * FROM users WHERE id=? AND active=1", (s["user_id"],))

    def _handle(self, method):
        url = urlparse(self.path)
        if not url.path.startswith("/api/"):
            return self._static(url.path)
        parts = url.path.strip("/").split("/")
        qs = parse_qs(url.query)
        for m, pat, fn, need_auth, owner_only in ROUTES:
            if m != method or len(pat) != len(parts):
                continue
            params = {}
            ok = True
            for a, b in zip(pat, parts):
                if a.startswith(":"):
                    if not b.isdigit():
                        ok = False
                        break
                    params[a[1:]] = int(b)
                elif a != b:
                    ok = False
                    break
            if not ok:
                continue
            try:
                length = int(self.headers.get("Content-Length") or 0)
                body = json.loads(self.rfile.read(length) or b"{}") if length else {}
                with DB_LOCK:
                    user = self._user()
                    if need_auth and not user:
                        raise ApiError("Nepřihlášen", 401)
                    if owner_only and user["role"] != "owner":
                        raise ApiError("Jen pro majitele", 403)
                    if user and user["must_change_pw"] and fn not in (me, change_pw, logout):
                        raise ApiError("Nejdřív si změňte heslo", 403)
                    DB.execute("BEGIN IMMEDIATE")
                    try:
                        res = fn(user, body, qs, **params)
                        DB.execute("COMMIT")
                    except BaseException:
                        DB.execute("ROLLBACK")
                        raise
                return self._send(200, res)
            except ApiError as e:
                if e.code == 401 and fn is login:
                    with DB_LOCK:  # zápis neúspěšného přihlášení přežije rollback
                        audit(None, "login_failed", details={"username": body.get("username", "")})
                return self._send(e.code, {"error": str(e)})
            except sqlite3.IntegrityError as e:
                return self._send(400, {"error": "Chyba dat: " + str(e)})
            except Exception as e:  # noqa
                import traceback
                traceback.print_exc()
                return self._send(500, {"error": "Interní chyba: " + str(e)})
        self._send(404, {"error": "Neznámá adresa"})

    def _static(self, path):
        if path in ("/", ""):
            path = "/index.html"
        full = os.path.normpath(os.path.join(STATIC_DIR, path.lstrip("/")))
        if not full.startswith(STATIC_DIR) or not os.path.isfile(full):
            full = os.path.join(STATIC_DIR, "index.html")
        with open(full, "rb") as f:
            self._send(200, f.read(), MIME.get(os.path.splitext(full)[1], "application/octet-stream"))

    def do_GET(self):
        self._handle("GET")

    def do_POST(self):
        self._handle("POST")

    def do_PUT(self):
        self._handle("PUT")


def main():
    ap = argparse.ArgumentParser(description="Správa ubytování")
    ap.add_argument("--port", type=int, default=8080)
    ap.add_argument("--host", default="127.0.0.1", help="0.0.0.0 = přístup i z jiných počítačů v síti")
    ap.add_argument("--no-browser", action="store_true")
    args = ap.parse_args()
    init_db()
    srv = ThreadingHTTPServer((args.host, args.port), Handler)
    url = f"http://localhost:{args.port}"
    print(f"Správa ubytování běží na {url}  (databáze: {DB_PATH})")
    print("Ukončení: Ctrl+C")
    if not args.no_browser:
        threading.Timer(0.8, lambda: webbrowser.open(url)).start()
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
