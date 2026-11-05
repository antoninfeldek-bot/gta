# Správa ubytování

Program pro pronájem a správu ubytovny, hotelu a bytů: obsazenost, nájemníci, platby, pokladna,
výdaje, výkazy a **pojistky proti okrádání** (ze strany personálu vůči majiteli i vůči nájemníkům).

Při prvním spuštění se automaticky založí:

| Objekt   | Pokoje                                   | Kapacita |
|----------|------------------------------------------|----------|
| Ubytovna | U01–U20 jednolůžkové, U21–U50 dvoulůžkové | 80 lůžek |
| Hotel    | H1–H6                                    | 12 lůžek |
| Byty     | B01–B45                                  | 45 bytů  |

Ceny jsou jen ukázkové. Majitel je změní v **Obsazenost → pokoj → Upravit ceník**.

## Spuštění

Potřebuješ jen **Python 3.9+** (https://www.python.org/downloads/ – při instalaci na Windows zaškrtni
„Add Python to PATH“). Žádné další knihovny ani internet nejsou potřeba.

```bash
cd sprava-ubytovani
python server.py
```

Na Windows stačí dvojklik na `spustit-windows.bat`. Otevře se prohlížeč na `http://localhost:8080`.

* První přihlášení: **majitel / majitel** – systém hned vyžádá nové heslo.
* Data jsou v souboru `data.db` vedle programu. Zálohy (Audit → Zálohovat) jdou do složky `zalohy/`.
* Aby se správci připojili z jiného počítače nebo z mobilu v síti:
  `python server.py --host 0.0.0.0` a v prohlížeči zadat `http://<IP-počítače>:8080`.

## Role

* **Majitel** – vidí vše, schvaluje, spravuje uživatele, ceny a pravidla, vidí audit.
* **Správce** – vidí jen objekty, které mu majitel přidělí (např. jen ubytovnu). Ubytovává, přijímá
  platby, zapisuje výdaje, uzavírá pokladnu, eviduje úschovu věcí a vstupy do pokojů.
  Nemůže nic mazat ani měnit ceny.

## Pojistky („legislativa“ systému)

### Ochrana peněz majitele
1. **Platby nelze smazat ani upravit** – hlídá to přímo databáze (triggery). Chyba se opraví jen
   **stornem**, které **schvaluje majitel**, a storno zůstane vidět.
2. **Souvislá řada dokladů** (2026-000001, 000002 …). Na každou platbu se tiskne doklad pro
   nájemníka. Chybějící číslo se při kontrole auditu okamžitě ukáže.
3. **Dluh počítá systém sám** z evidovaných pobytů (noci × cena, započaté měsíce × nájem).
   Správce nemůže „zapomenout“ tržbu – předpis vs. vybráno je vidět ve výkazech.
4. **Slevy pod ceník** (víc než nastavených 10 %) a každá změna ceny jdou **ke schválení**. Do té
   doby platí ceník.
5. **Výdaje nad limit** (výchozí 2 000 Kč) schvaluje majitel. Číslo účtenky/faktury je povinné.
6. **Pokladna**: systém ví, kolik hotovosti má být v kase. Správce při uzávěrce zadá, kolik
   **fyzicky spočítal** (dopředu nevidí, kolik „má vyjít“). Rozdíl se trvale zapíše, nad tolerancí
   musí napsat vysvětlení. Majitel to vidí na Přehledu.
7. **Odvody hotovosti** majiteli / na účet se evidují i se jménem přebírajícího.
8. **Vrácení kauce** schvaluje vždy majitel.
9. Upozornění na Přehledu: neuzavřená pokladna, manka, časté storno, neúspěšná přihlášení.

### Ochrana nájemníků (aby jim nikdo nebral věci)
10. **Úschova věcí** – každá převzatá věc (po odchodu, nalezená, na žádost) se přesně popíše
    **se svědkem**. Záznam nelze smazat a věc lze vydat jen jednou, opět se svědkem a jménem
    převzetí.
11. **Vstupy do pokojů** – každý vstup personálu se zapisuje (kdo, kdy, proč). Do obsazeného pokoje
    bez nájemníka **nelze bez svědka**. Záznamy nelze mazat.
12. **Předání pokoje** – při odhlášení je povinný zápis o stavu pokoje.

### Kontrola, že nikdo nepodvádí přímo v databázi
13. **Auditní log** zapisuje každou akci (kdo, kdy, co, staré/nové hodnoty). Záznamy jsou
    **řetězené hashem SHA-256** jako blockchain: když někdo soubor `data.db` upraví mimo program,
    tlačítko **Audit → Ověřit neporušenost** ukáže, kde byl řetěz přerušen.
14. **Kontrolní otisk**: po ověření si majitel poznamená otisk (hash). Pokud ho příště v historii
    nenajde, někdo databázi nahradil starší nebo upravenou kopií.
15. **Zálohy** dělej pravidelně a ukládej mimo počítač správce (flash disk, cloud majitele).

> Důležité: program běží na počítači, ke kterému má správce fyzický přístup. Úplnou ochranu
> dává až provoz na serveru, ke kterému má přístup jen majitel (viz další fáze).

## Další fáze – jak z toho udělat „opravdový“ software

1. **Teď (fáze 1)**: program běží na jednom počítači v kanceláři, ostatní se připojují přes
   prohlížeč v místní síti. Vyzkoušej ho a sepiš, co chybí.
2. **Instalační program pro Windows (.exe)** – bez instalace Pythonu:
   ```bash
   pip install pyinstaller
   pyinstaller --onefile --add-data "static;static" --name SpravaUbytovani server.py
   ```
   Výsledek je `dist/SpravaUbytovani.exe`.
3. **Online verze (doporučeno)** – program na serveru/VPS (např. Hetzner, Wedos, ~150–300 Kč/měsíc)
   s HTTPS a doménou. Majitel i správci se přihlásí odkudkoli i z mobilu a správce se k databázi
   nedostane vůbec. To je nejsilnější pojistka.
4. **Rozšíření**: párování bankovních plateb podle variabilního symbolu (výpis z banky), napojení na
   EET/účetnictví, hlášení cizinecké policii a ubytovací poplatek obci, e-mail/SMS upomínky dlužníkům,
   fotky stavu pokoje při předání, elektronické podpisy předávacích protokolů.
