# Praha Quest — prototyp

Lokační RPG po Praze. Chodíš po městě, odkrýváš mapu z mlhy (hexy H3), sbíráš místa a sady a za kroky dostáváš XP. Tahle fáze běží **celá offline**: všechno se ukládá jen v telefonu.

## Spuštění v Expo Go

```bash
cd praha-quest
npm install
npx expo start
```

QR kód naskenuj v **Expo Go** (projekt je na Expo SDK 58, Expo Go musí být aktuální). Žádný dev build není potřeba.

**Nejsi v Praze?** V záložce *Hrdina* zapni **Testovací chůze**. Pak ťukni kamkoli na mapu a postava tam dojde rychlostí chůze (5 km/h). Odkrývá mlhu, počítá kroky a u místa můžeš dát *Zabrat místo*. Začíná se na Staroměstském náměstí. Pro ostrou verzi se vypíná v `src/app-config.ts` (`allowSimulatedWalk`).

## Webová verze

Stejná hra běží i v prohlížeči a na mobilu vypadá stejně. Na širokém monitoru se drží šířky telefonu. Místo nativní mapy používá [MapLibre](https://maplibre.org/) s tmavým podkladem z OpenStreetMap (CARTO). Poloha jde z prohlížeče, kroky se počítají z GPS a testovací chůze funguje stejně.

```bash
npx expo start --web        # vývoj na počítači
npm run build:web           # statický web do složky dist/
```

Složku `dist/` stačí nahrát na jakýkoli statický hosting, třeba přetažením na Netlify Drop, na GitHub Pages nebo na EAS Hosting. **Na mobilu musí web běžet přes https**, jinak prohlížeč polohu nepovolí. Bez https jde hrát jen testovací chůze.

## Příkazy

| Příkaz | Co dělá |
| --- | --- |
| `npm run build:web` | Statický web do `dist/` |
| `npm test` | Jest testy herní logiky (`src/game/`) a geometrie mlhy |
| `npm run typecheck` | TypeScript ve strict režimu |
| `npm run fetch-places` | Stáhne všechna místa Prahy z OpenStreetMap (Overpass API) do `assets/places.json` |
| `npm run seed-places` | Náhradní data bez Overpassu (viz níže) |
| `npx tsx scripts/make-sfx.ts` | Znovu vygeneruje zvuky odměn do `assets/sfx/` |

## Data míst — DŮLEŽITÉ

`assets/places.json` je teď **náhradní sada** (113 míst, 11 sad):

- **Metro:** všech 61 stanic (58 míst, přestupní stanice jsou jedno místo) s přesnými souřadnicemi z jízdních řádů PID ([krystxf/metro-now](https://github.com/krystxf/metro-now), MPL-2.0). Sady Linka A, B, C.
- **Památky, mosty, věže, vyhlídky, parky, muzea:** 55 hlavních míst, **souřadnice zadané ručně**. Můžou být o pár desítek metrů vedle.

Plná data z OpenStreetMap stáhne `npm run fetch-places`. Skript vybere památky s `wikidata`, vyhlídky, parky nad 2 ha, muzea, kostely, věže, mosty a všechny stanice metra. Doplní městské části, sloučí duplicity do 50 m a přiřadí vzácnost i sady. V cloudovém prostředí, kde prototyp vznikal, Overpass neodpovídal. **Spusť ho jednou u sebe**; na běžném internetu to trvá asi minutu. Pak commitni nový `assets/places.json`.

## Herní pravidla (`src/game/config.ts`)

| Pravidlo | Hodnota |
| --- | --- |
| Odhalení nového hexu (H3, rozlišení 9) | +25 XP; mezi dvěma body se doplní i hexy po cestě |
| Kroky | 100 kroků = 10 XP, do XP se počítá max. 15 000 kroků denně (pražský čas) |
| Bez krokoměru | kroky z GPS: 1 krok = 0,75 m |
| Anti-cheat | zahodí body s přesností nad 30 m, rychlostí nad 20 km/h, skokem přes 400 m za méně než minutu a staré body |
| Levely 1–100 | XP na další level = `round(100 * level^1.5)`, za každý level `20 × level` grošů |
| Zabrání místa | do 40 m od místa; objevení: 60 / 150 / 400 / 1 000 XP (běžné / vzácné / epické / legendární) |
| Znovu navštívit | po 20 hodinách, 20 % XP |
| Kořist | groše podle vzácnosti a šance na relikvii (legendární místo dá relikvii vždy); hody jsou deterministické |
| Dokončená sada | 1 000 XP + 40 XP za každé místo v sadě, plus groše |

Zadání skončilo uprostřed pravidla 4. Vzorec levelů a všechno za ním (kořist, cooldowny, odměny za sady) jsem doplnil sám. Hodnoty se mění na jednom místě, v `config.ts`.

## Architektura

```
src/
  game/        čistá herní logika bez Reactu — (state, event, now) => { newState, rewards }
    config.ts  všechna čísla hry
    engine.ts  createEngine(catalog).apply(state, event, now)
    migrations.ts  verze uloženého stavu a migrace
  i18n/cs.ts   všechny české texty
  store/       zustand + persist (AsyncStorage), verzované přes GAME_CONFIG.schemaVersion
  services/    GPS, krokoměr, testovací chůze; zvuky + vibrace + toasty z odměn
  utils/fog.ts geometrie mlhy jen pro viditelnou část mapy
  screens/     Mapa, Sbírka, Hrdina
  app/         expo-router routy (jen tenké obaly)
scripts/       fetch-places.ts, build-seed-places.ts, make-sfx.ts
```

- Engine nesahá na čas ani náhodu sám: `now` a `playerSeed` dostává zvenku. Stejný kód tak půjde spustit na serveru (Supabase) jako autorita, a klient bude jen posílat eventy.
- Mlha je **jeden polygon** přes viditelný výřez s dírami tvaru prozkoumaného území (`cellsToMultiPolygon`). Mřížka hexů se kreslí jen při přiblížení, nejvýš 260 buněk. Výpočet je memoizovaný podle zaokrouhleného výřezu.
- Značky míst se filtrují podle výřezu a podle přiblížení (oddálená mapa ukáže jen epická a legendární místa), nejvýš 120 najednou.

## Co zatím nejde ověřit tady

Prototyp jsem nemohl spustit na skutečném telefonu. Prošly testy (Jest, 28), typová kontrola a export bundlů pro Android, iOS i web. Mapu (react-native-maps), GPS a krokoměr je potřeba vyzkoušet v Expo Go. Na iOS používá Apple Maps v tmavém režimu (Google styl jde jen na Androidu).
