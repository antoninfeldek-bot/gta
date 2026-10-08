# Vice Rush — GTA 6 před GTA 6

Prohlížečová 3D open-world hra ve stylu GTA odehrávající se ve fiktivním neonovém
městě **Leonida Keys**. Celé je to jeden soubor `index.html` (Three.js z CDN), žádná
instalace ani build.

## Jak spustit

Otevři `index.html` v prohlížeči (Chrome / Firefox / Edge), nebo ho naservíruj:

```bash
npx http-server .   # nebo: python3 -m http.server
```

Potřebuješ klávesnici a myš. Pro načtení Three.js je nutné připojení k internetu.

## Co ve hře je

- Město 10×10 bloků s downtownem z mrakodrapů, art-deco hotely s neony u pláže, parky a palmy
- Plynulý den/noc (1 herní hodina = 40 s): západy slunce, rozsvícená okna, pouliční lampy, hvězdy
- Chůze, sprint, skok a střelba z pistole (míření přes rameno)
- Krádeže aut včetně vytažení řidiče, 6 typů vozidel, arkádová fyzika s driftem na ruční brzdě
- Poškození aut: kouř, požár, exploze s řetězovou reakcí
- Provoz s AI, která jezdí v pruzích, odbočuje na křižovatkách a brzdí před překážkami
- Chodci chodí po chodnících, přecházejí po přechodech a utíkají při střelbě
- Hledanost 1–5 hvězd: policejní honičky, střelba policistů, ZATČEN/ZABIT, ztracení policie
- Mise: kurýr na čas a krádež zlatého sporťáku na objednávku
- Peníze a lékárničky po městě, minimapa, velká mapa
- Syntetizované rádio (VICE WAVE 88.4, FLAMINGO FM 101.7), motor, siréna, klakson

## Ovládání

| Klávesa | Akce |
| --- | --- |
| W A S D | chůze / řízení |
| Myš | rozhlížení, levé tlačítko = střelba |
| Shift | sprint |
| Mezera | skok / ruční brzda |
| F (nebo E) | nastoupit / vystoupit / ukrást auto |
| R | přepnout rádio |
| H | klakson |
| M | mapa |
| N | ztlumit zvuk |
| G | zapnout/vypnout stíny (výkon) |
| ← → | otáčení kamery bez myši |
| Esc / P | pauza |
