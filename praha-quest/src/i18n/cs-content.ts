/**
 * Longer Czech game content: legends, dishes, quests, ranks and rivals.
 * Keys match ids in src/game/config.ts and place names in assets/places.json.
 */

/** Short legends and stories shown on a place's card, keyed by the place's Czech name. */
export const lore: Record<string, string> = {
  'Pražský hrad': 'Největší hradní komplex na světě. Sídlili tu čeští knížata, králové i prezidenti. A dodnes se tu střídá stráž.',
  'Katedrála svatého Víta': 'Stavěla se skoro šest set let a dokončili ji až v roce 1929. Ukrývá korunovační klenoty — a sedm klíčů od nich.',
  'Karlův most': 'Karel IV. položil základní kámen 9. 7. 1357 v 5:31. Do malty se prý přidávala vejce. A v pilíři je prý zazděný Bruncvíkův meč.',
  'Staroměstské náměstí': 'Bílé kříže v dlažbě připomínají sedmadvacet českých pánů popravených tady v roce 1621.',
  'Staroměstský orloj': 'Mistra Hanuše prý oslepili, aby nepostavil druhý takový. Jenže ze vzteku orloj zastavil. Ve skutečnosti ho postavil Mikuláš z Kadaně.',
  Vyšehrad: 'Tady prý kněžna Libuše věštila: „Vidím město veliké, jehož sláva hvězd se dotýkati bude.“',
  'Petřínská rozhledna': 'Malá sestra Eiffelovky, postavená pro Jubilejní výstavu 1891. Nahoru vede 299 schodů.',
  'Žižkovský vysílač': 'Po věži lezou miminka Davida Černého. Kdysi se dostal do žebříčku nejošklivějších staveb světa. Dnes ho Pražané mají rádi.',
  'Václavské náměstí': 'Kdysi Koňský trh. Pak místo, kde se psaly dějiny: 1918, 1968, 1989.',
  'Národní divadlo': '„Národ sobě.“ Divadlo postavené ze sbírek lidí. Dva měsíce po otevření vyhořelo — a národ se složil znovu.',
  'Národní muzeum': 'Na fasádě dodnes najdeš stopy po kulkách z roku 1968.',
  'Tančící dům': 'Pražané mu říkají Ginger a Fred. Postavili ho v roce 1996 Vlado Milunić a Frank Gehry.',
  'Obecní dům': 'Secese, jak má být. V roce 1918 se tu vyhlásila samostatná republika.',
  'Staronová synagoga': 'Nejstarší funkční synagoga v Evropě. Na její půdě prý spí Golem rabiho Löwa.',
  'Zlatá ulička': 'Malinké domky pod hradbami. Legenda tu usadila alchymisty Rudolfa II., ve skutečnosti tu žili zlatníci a střelci. A v čísle 22 psal Franz Kafka.',
  Klementinum: 'Barokní knihovna, kde se od roku 1775 nepřetržitě měří počasí.',
  'Prašná brána': 'Kdysi skladiště střelného prachu, odtud to jméno. Tady začíná Královská cesta.',
  'Lennonova zeď': 'Zeď, na kterou se od roku 1980 malují vzkazy. Komunisti je přetírali, lidi psali znovu.',
  Metronom: 'Stojí tam, kde býval největší Stalinův pomník v Evropě. Ten vydržel sedm let.',
  Loreta: 'Každou celou hodinu tu hraje zvonkohra z 27 zvonů.',
  'Kavárna Slavia': 'Kavárna naproti Národnímu divadlu. Sedávali tu Seifert i Havel.',
  'Café Louvre': 'Od roku 1902. Chodil sem Kafka i Einstein.',
  'Grand Café Orient': 'Jediná kubistická kavárna na světě, v Domě U Černé Matky Boží.',
  'U Fleků': 'Pivo se tu vaří od roku 1499. Tmavý ležák a harmonika k tomu.',
  'U Zlatého tygra': 'Legendární hospoda Bohumila Hrabala. Sem v roce 1994 vzal Václav Havel Billa Clintona na pivo.',
  'Havelské tržiště': 'Trh tu běží od roku 1232. Trdelník si dej, ale tradiční pražský není.',
  Náplavka: 'Sobotní farmářský trh u Vltavy. Lidi, lodě a nábřeží.',
};

/** The Czech cookbook unlocked at food places. */
export const dishes: Record<string, { name: string; tip: string }> = {
  vetrnik: { name: 'Větrník', tip: 'Odpalované těsto, karamelový krém, šlehačka. Ke kávě ideál.' },
  rakvicka: { name: 'Rakvička', tip: 'Křehký piškot ve tvaru rakvičky se šlehačkou. Zní hůř, než chutná.' },
  laskonka: { name: 'Laskonka', tip: 'Dva ořechové plátky, máslový krém. Sladká klasika z cukrárny.' },
  kolac: { name: 'Koláč', tip: 'S tvarohem, povidly nebo mákem. Nejlepší jsou ty od babičky.' },
  medovnik: { name: 'Medovník', tip: 'Medové pláty a krém. Česká legenda, kterou zná každý.' },
  spicka: { name: 'Špička', tip: 'Laskonka s čokoládovou čepičkou. Do cukrárny pro jednu nikdo nechodí.' },
  svickova: { name: 'Svíčková na smetaně', tip: 'Omáčka, šest knedlíků, brusinky a šlehačka. Národní poklad.' },
  hermelin: { name: 'Nakládaný hermelín', tip: 'Sýr naložený v oleji s cibulí a paprikou. Bez piva se nepočítá.' },
  gulas: { name: 'Hovězí guláš', tip: 'S knedlíkem a cibulkou. Ráno po oslavě zachrání život.' },
  'vepro-knedlo-zelo': { name: 'Vepřo knedlo zelo', tip: 'Pečené vepřové, knedlík, zelí. Svatá trojice české kuchyně.' },
  smazak: { name: 'Smažený sýr', tip: 'Smažák s tatarkou a hranolky. Tohle se nevysvětluje, tohle se jí.' },
  utopenec: { name: 'Utopenec', tip: 'Špekáček naložený v octu s cibulí. Hospodská klasika.' },
  rizek: { name: 'Řízek s bramborovým salátem', tip: 'Na Štědrý den povinně, v létě na Letné dobrovolně.' },
  bramborak: { name: 'Bramborák', tip: 'Brambory, česnek, majoránka, pánev. Voní přes celé nábřeží.' },
  trdelnik: { name: 'Trdelník', tip: 'Turistický hit, který Pražák nejí. Ale jednou se to odpustí.' },
};

/** Daily quest titles. */
export const dailyQuestTitle = {
  steps: (n: number) => `Ujdi ${fmt(n)} kroků`,
  hexes: (n: number) => `Odkryj ${n} ${pl(n, 'nový hex', 'nové hexy', 'nových hexů')}`,
  checkIns: (n: number) => `Zaber ${n} ${pl(n, 'místo', 'místa', 'míst')}`,
  checkInType: {
    cafe: (n: number) => (n === 1 ? 'Zajdi na kafe do kavárny' : `Obejdi ${n} kavárny`),
    pub: (n: number) => (n === 1 ? 'Zastav se v hospodě' : `Obejdi ${n} hospody`),
    metro: (n: number) => (n === 1 ? 'Zaber stanici metra' : `Zaber ${n} stanice metra`),
    park: (n: number) => (n === 1 ? 'Projdi se parkem' : `Navštiv ${n} parky`),
    church: (n: number) => (n === 1 ? 'Navštiv kostel' : `Navštiv ${n} kostely`),
    viewpoint: () => 'Najdi vyhlídku',
  } as Record<string, (n: number) => string>,
};

/** Story side quests: title, intro and one line per step. */
export const storyQuests: Record<string, { title: string; intro: string; steps: string[]; done: string }> = {
  golem: {
    title: 'Golemova stopa',
    intro: 'Rabi Löw prý z vltavské hlíny uhnětl obra. Najdi, kudy chodil.',
    steps: [
      'Začni u Staronové synagogy. Na půdě prý Golem spí dodnes.',
      'Golem nosil vodu přes Vltavu. Přejdi Karlův most.',
      'Rabi Löw se setkal s císařem Rudolfem II. Jdi na Hrad.',
    ],
    done: 'Hlína z Golema je tvoje. Pořád trochu hřeje.',
  },
  alchemist: {
    title: 'Alchymistův elixír',
    intro: 'Rudolf II. hledal kámen mudrců. Možná ho najdeš ty.',
    steps: [
      'V Klementinu prý leží spis o proměně olova ve zlato.',
      'Recept pokračuje na Staroměstské mostecké věži.',
      'Poslední přísada je ve Zlaté uličce.',
    ],
    done: 'Elixír je hotový. Nepít.',
  },
  libuse: {
    title: 'Libušino proroctví',
    intro: '„Vidím město veliké…“ Projdi cestu od Libušina sídla až na Hrad.',
    steps: ['Začni na Vyšehradě, kde Libuše věštila.', 'Rotunda svatého Martina pamatuje knížete Vratislava.', 'Město, které Libuše viděla, končí na Hradě.'],
    done: 'Střep koruny. Kdo ho nosí neprávem, do roka zemře. Ty ho jen neseš.',
  },
  hanus: {
    title: 'Mistr Hanuš',
    intro: 'Slepý mistr prý zastavil orloj. Zjisti, co se tenkrát stalo.',
    steps: ['Postav se pod orloj. Kostlivec už zvoní.', 'Z věží Týnského chrámu je vidět celé náměstí.', 'Vrať se na Staroměstské náměstí a počkej na celou.'],
    done: 'Orloj jde. Hanuš by měl radost.',
  },
  'first-republic': {
    title: 'Kafe jako za první republiky',
    intro: 'Obejdi čtyři kavárny, kde se psala česká literatura.',
    steps: ['Slavia, naproti Národnímu divadlu.', 'Louvre na Národní.', 'Orient, jediná kubistická kavárna na světě.', 'Imperial s keramikou až ke stropu.'],
    done: 'Čtyři kafe. Spát dneska nebudeš.',
  },
  'beer-trail': {
    title: 'Pivní stezka',
    intro: 'Tři hospody, tři legendy. S mírou, prosím.',
    steps: ['U Zlatého tygra, Hrabalův štamgast.', 'U Medvídků, pivo se tu vaří od 15. století.', 'U Fleků, tmavý ležák od roku 1499.'],
    done: 'Na zdraví! A domů radši metrem.',
  },
  'green-line': {
    title: 'Zelená linka',
    intro: 'Projeď áčko pod starou Prahou. Od Hradčanské po Muzeum.',
    steps: ['Hradčanská.', 'Malostranská.', 'Staroměstská.', 'Můstek.', 'Muzeum. Konečná pro tenhle úkol.'],
    done: 'Ukončete prosím výstup a nástup, dveře se zavírají.',
  },
  bridges: {
    title: 'Přes Vltavu',
    intro: 'Tři mosty, tři pohledy na Hrad.',
    steps: ['Most Legií, výhled na Národní divadlo.', 'Karlův most, sochy a davy.', 'Mánesův most, nejlepší fotka Hradu.'],
    done: 'Vltava ti teď patří.',
  },
};

/** Rank titles by id (src/game/config.ts RANK_TITLES). */
export const ranks: Record<string, string> = {
  turista: 'Turista',
  vyletnik: 'Výletník',
  naplava: 'Náplava',
  'prazak-na-zkousku': 'Pražák na zkoušku',
  prazak: 'Pražák',
  stamgast: 'Štamgast',
  znalec: 'Znalec pražských dvorků',
  patriot: 'Pražský patriot',
  'strazce-orloje': 'Strážce orloje',
  'karel-iv': 'Otec vlasti',
};

/** Weekly rivals: fictional Prague characters. */
export const rivals: Record<string, { name: string; motto: string }> = {
  hanus: { name: 'Mistr Hanuš', motto: 'Chodí přesně jako hodinky.' },
  golem: { name: 'Golem', motto: 'Pomalý, ale nezastavitelný.' },
  libuse: { name: 'Kněžna Libuše', motto: 'Ví, kam půjdeš, dřív než ty.' },
  bruncvik: { name: 'Rytíř Bruncvík', motto: 'S mečem v ruce, s mostem v zádech.' },
  svejk: { name: 'Josef Švejk', motto: 'Poslušně hlásí, že se mu nechce.' },
  turista: { name: 'Turista s deštníkem', motto: 'Hledá Karlův most už třetí den.' },
};

/** Little exclamations shown with bigger rewards. */
export const cheers = ['No teda!', 'Pecka!', 'To je jízda!', 'Klobouk dolů!', 'Hustý!', 'Výborně, mistře!'];

function fmt(n: number) {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}
function pl(n: number, one: string, few: string, many: string) {
  return n === 1 ? one : n >= 2 && n <= 4 ? few : many;
}
