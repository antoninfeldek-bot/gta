#!/usr/bin/env python3
"""Sestaví webovou ukázku do jednoho HTML souboru: python web-demo/build.py"""
import os, re
here = os.path.dirname(os.path.abspath(__file__))
root = os.path.dirname(here)
rd = lambda p: open(os.path.join(root, p), encoding="utf-8").read()
index = rd("static/index.html")
body = index[index.index("<body>") + 6: index.index('<script src="/app.js">')]
body = re.sub(r'<p class="muted small">První spuštění:.*?</p>',
              '<p class="muted small">Ukázkové účty: <b>majitel</b> / <b>majitel</b> (plná práva) nebo <b>spravce</b> / <b>spravce</b> (správce ubytovny a bytů).</p>', body, flags=re.S)
body = body.replace('<input name="username" autocomplete="username" required>', '<input name="username" id="lu" autocomplete="username" value="majitel" required>')
body = body.replace('<input name="password" type="password" autocomplete="current-password" required>', '<input name="password" id="lp" type="password" autocomplete="current-password" value="majitel" required>')
bar = ('<div class="demo-bar">Webová ukázka. Data jsou smyšlená a ukládají se jen ve vašem prohlížeči. '
       '<button class="btn sm" id="demoReset" type="button">Obnovit ukázková data</button></div>')
out = f"""<title>Správa ubytování</title>
<style>
{rd("static/style.css")}
</style>
{bar}
{body}
<script>
{rd("web-demo/demo-backend.js")}
</script>
<script>
{rd("static/app.js")}
document.getElementById("demoReset").onclick = () => {{ window.DEMO_RESET(); store.del("token"); location.hash = ""; location.reload(); }};
</script>
"""
dst = os.path.join(here, "sprava-ubytovani-demo.html")
open(dst, "w", encoding="utf-8").write(out)
print(dst, len(out))
