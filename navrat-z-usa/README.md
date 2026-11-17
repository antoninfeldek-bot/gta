# Návrat domů 🇺🇸 ✈️ 🇨🇿

Chytrý seznam přání, úkolů a kalendář pro návrat z USA (sobota 5. června 2027).

## Spuštění

```bash
cd navrat-z-usa
npm install
npm run dev        # vývojový server na http://localhost:5173
npm run build      # produkční build do složky dist/
```

## Funkce

- **Odpočet** dnů do návratu a ukazatel, kolik plánů už máš splněno
- **Seznam**: odškrtávání, úprava, smazání, hledání, filtr podle stavu a kategorie
- **Přidat novou aktivitu**: název, kategorie (Výlety, Jídlo, Rodina, Kamarádi, Město), datum (nepovinné) a poznámka
- **Kalendář**: měsíční a týdenní pohled, začíná na červnu 2027
  - kliknutím na den přidáš aktivitu rovnou na to datum
  - aktivity přetahuješ mezi dny myší (drag & drop)
  - panel „Zatím bez data“: odsud aktivity přetáhneš do kalendáře, a když je přetáhneš zpátky, datum se odebere
- Ukládání do `localStorage`, takže o nic nepřijdeš ani po obnovení stránky

## Struktura

```
src/
  App.jsx                  hlavní stav aplikace a přepínání pohledů
  data.js                  datum návratu, kategorie a výchozí aktivity
  dateUtils.js             práce s daty (lokální čas, české názvy)
  useLocalStorage.js       hook pro ukládání do prohlížeče
  components/
    Countdown.jsx          záhlaví s odpočtem a postupem
    ListView.jsx           seznam s filtry
    ActivityItem.jsx       jedna položka seznamu
    CalendarView.jsx       kalendář (měsíc/týden, drag & drop)
    ActivityModal.jsx      formulář pro přidání a úpravu
    CategoryChip.jsx       štítek kategorie
```
