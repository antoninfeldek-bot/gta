/**
 * All user-facing Czech copy. Keep keys in English; an `en.ts` with the same
 * shape can be added later and picked in src/i18n/index.ts.
 */
import type { CheckInFailure, PlaceRarity, PlaceType, RejectReason } from '@/game/types';
import * as content from './cs-content';

const plural = (n: number, one: string, few: string, many: string) =>
  n === 1 ? one : n >= 2 && n <= 4 ? few : many;

export const cs = {
  appName: 'Praha Quest',

  tabs: {
    map: 'Mapa',
    quests: 'Úkoly',
    collection: 'Sbírka',
    leaderboard: 'Žebříček',
    profile: 'Hrdina',
  },

  quests: {
    title: 'Úkoly',
    dailyTitle: 'Dnešní úkoly',
    dailyHint: 'Nové úkoly každé ráno o půlnoci.',
    streak: (n: number) => (n === 0 ? 'Zatím žádná série' : `Série ${n} ${n === 1 ? 'den' : n <= 4 ? 'dny' : 'dní'} v kuse`),
    allDoneBonus: 'Splň všechny tři a série roste. Za každý den v řadě větší bonus.',
    reward: (xp: number, coins: number) => `+${fmt(xp)} XP, +${coins} grošů`,
    done: 'Splněno',
    storyTitle: 'Pověsti a výpravy',
    storyHint: 'Projdi místa v daném pořadí. Na každém dej Zabrat místo.',
    storyStep: (step: number, total: number) => `Zastávka ${step} z ${total}`,
    storyNext: 'Další zastávka',
    storyDone: 'Dokončeno',
    storyStart: 'Začni tady',
    showOnMap: 'Ukázat na mapě',
  },

  leaderboard: {
    title: 'Žebříček',
    weekTitle: 'Tenhle týden',
    weekHint: 'XP za tento týden. Počítadlo se nuluje v pondělí.',
    you: 'Ty',
    rank: (n: number) => `${n}.`,
    districtsTitle: 'Tvoje Praha po čtvrtích',
    districtsHint: 'Kolik míst v každé městské části už máš.',
    districtsEmpty: 'Zatím žádná čtvrť. Zaber první místo.',
    behind: (xp: number, name: string) => `${name} je před tebou o ${fmt(xp)} XP.`,
    leading: 'Vedeš. Praha je tvoje.',
  },

  cookbook: {
    title: 'Kuchařka',
    hint: 'Každá kavárna, hospoda a trh ti odemkne jedno české jídlo.',
    locked: 'Zamčeno',
    unlockAt: (place: string) => `Odemkne se na místě ${place}.`,
    count: (n: number, total: number) => `${n} z ${total} receptů`,
  },

  hud: {
    level: 'Level',
    xpToNext: (current: number, needed: number) => `${fmt(current)} / ${fmt(needed)} XP`,
    maxLevel: 'Maximální level',
    stepsToday: 'kroků dnes',
    stepsCapped: 'denní strop XP z kroků',
    coins: 'grošů',
    hexes: (n: number) => `${fmt(n)} ${plural(n, 'odhalený hex', 'odhalené hexy', 'odhalených hexů')}`,
  },

  location: {
    askTitle: 'Praha se odkrývá pod tvýma nohama',
    askBody: 'Mlha zmizí jen tam, kudy opravdu projdeš. K tomu potřebuju vědět, kde jsi — jen když máš hru otevřenou.',
    askButton: 'Povolit polohu',
    deniedTitle: 'Bez polohy mlha nezmizí',
    deniedBody: 'Polohu zapneš v nastavení telefonu u aplikace Expo Go. Nebo si zkus hru v testovací chůzi.',
    deniedBodyWeb: 'Prohlížeč polohu nepovolil. Zapni ji u téhle stránky v nastavení prohlížeče (na mobilu stránka musí běžet přes https), nebo si hru zkus v testovací chůzi.',
    trySimulation: 'Zkusit testovací chůzi',
    openSettings: 'Otevřít nastavení',
    searching: 'Hledám tě na mapě…',
    weakSignal: 'Slabý signál GPS — počkej chvilku na volném prostranství.',
    centerOnMe: 'Na mou polohu',
  },

  reject: {
    accuracy: 'Poloha je moc nepřesná, tenhle bod nepočítám.',
    speed: 'Na tohle je moc rychlo — počítá se jen chůze.',
    teleport: 'Skok na mapě? Tenhle bod nepočítám.',
    stale: 'Stará poloha, čekám na novou.',
    order: 'Poloha přišla mimo pořadí.',
  } satisfies Record<RejectReason, string>,

  place: {
    claim: 'Zabrat místo',
    claimAgain: 'Navštívit znovu',
    walkCloser: (m: number) => `Dojdi blíž — ještě ${fmtDistance(m)}`,
    cooldown: (time: string) => `Znovu můžeš od ${time}`,
    discovered: 'Objeveno',
    notDiscovered: 'Neobjeveno',
    hiddenInFog: 'Ukryto v mlze',
    visits: (n: number) => `${n}× ${plural(n, 'návštěva', 'návštěvy', 'návštěv')}`,
    nearbyTitle: 'Nejblíž tobě',
    distance: (m: number) => fmtDistance(m),
    rewardPreview: (xp: number) => `+${fmt(xp)} XP za objevení`,
  },

  checkInFailure: {
    unknownPlace: 'Tohle místo neznám.',
    noFix: 'Nemám čerstvou polohu. Zkus to za chvíli.',
    tooFar: 'Jsi moc daleko, dojdi blíž.',
    cooldown: 'Tady už jsi dnes byl. Vrať se později.',
  } satisfies Record<CheckInFailure, string>,

  rewards: {
    xp: (n: number) => `+${fmt(n)} XP`,
    coins: (n: number) => `+${fmt(n)} ${plural(n, 'groš', 'groše', 'grošů')}`,
    hex: 'Nové území',
    hexMany: (n: number) => `${n} ${plural(n, 'nový hex', 'nové hexy', 'nových hexů')}`,
    steps: 'Za kroky',
    placeDiscovered: 'Místo objeveno',
    placeRevisited: 'Zase tady',
    item: 'Našel jsi relikvii',
    setCompleted: 'Sada kompletní',
    levelUp: 'Nový level',
    levelUpBody: (level: number) => `Teď jsi na levelu ${level}. Praha tě začíná znát.`,
    levelUpButton: 'Jdu dál',
    dish: 'Nový recept v Kuchařce',
    dailyQuest: 'Úkol splněn',
    dailyAll: (streak: number) => `Všechny dnešní úkoly! Série ${streak}`,
    storyStep: 'Výprava pokračuje',
    storyDone: 'Výprava dokončena',
    newRank: 'Nový titul',
  },

  rarity: {
    common: 'Běžné',
    rare: 'Vzácné',
    epic: 'Epické',
    legendary: 'Legendární',
  } satisfies Record<PlaceRarity, string>,

  placeType: {
    landmark: 'Památka',
    viewpoint: 'Vyhlídka',
    park: 'Park',
    museum: 'Muzeum',
    church: 'Kostel',
    metro: 'Stanice metra',
    bridge: 'Most',
    tower: 'Věž',
    cafe: 'Kavárna',
    pub: 'Hospoda',
    food: 'Jídlo a trhy',
  } satisfies Record<PlaceType, string>,

  items: {
    'tram-ticket': { name: 'Jízdenka na tramvaj', description: 'Trochu ohmataná. Prý ještě platí.' },
    trdelnik: { name: 'Trdelník', description: 'Pražská tradice, kterou si vymysleli loni.' },
    'old-map': { name: 'Stará mapa', description: 'Ulice, které už nikdo nepamatuje.' },
    'alchemist-vial': { name: 'Alchymistova lahvička', description: 'Ze Zlaté uličky. Nepít.' },
    'golem-clay': { name: 'Hlína z Golema', description: 'Pořád trochu teplá.' },
    'crown-shard': { name: 'Střep svatováclavské koruny', description: 'Kdo ho nosí neprávem, do roka zemře. Ty ho jen neseš.' },
  } as Record<string, { name: string; description: string }>,

  collection: {
    title: 'Sbírka',
    setsTitle: 'Sady',
    placesTitle: 'Všechna místa',
    setProgress: (done: number, total: number) => `${done} z ${total}`,
    setReward: (xp: number) => `Odměna ${fmt(xp)} XP`,
    setDone: 'Hotovo',
    filterAll: 'Vše',
    filterFound: 'Objevené',
    filterMissing: 'Chybí',
    empty: 'Zatím nic. Vyraz ven a zaber první místo.',
    noData: 'Data míst chybí. Spusť npm run fetch-places.',
    search: 'Hledat místo',
  },

  profile: {
    title: 'Hrdina',
    stats: 'Statistiky',
    totalSteps: 'Kroků celkem',
    walked: 'Nachozeno',
    hexes: 'Odhalených hexů',
    places: 'Objevených míst',
    sets: 'Dokončených sad',
    coins: 'Groše',
    inventory: 'Relikvie',
    inventoryEmpty: 'Relikvie padají při zabírání míst. Legendární místa dávají vždycky jednu.',
    settings: 'Nastavení',
    sound: 'Zvuky',
    haptics: 'Vibrace',
    simulate: 'Testovací chůze',
    simulateHint: 'Ťukni na mapu a postava tam dojde rychlostí chůze. Jen pro zkoušení — mimo Prahu se jinak nehne nic.',
    stepSource: 'Zdroj kroků',
    stepSourcePedometer: 'Krokoměr telefonu',
    stepSourceGps: 'Odhad z GPS',
    rejected: 'Zahozené body GPS',
    reset: 'Smazat postup',
    resetConfirmTitle: 'Smazat celý postup?',
    resetConfirmBody: 'Přijdeš o level, objevená místa i odhalenou mapu. Nejde to vrátit.',
    resetConfirm: 'Smazat',
    cancel: 'Zrušit',
    dataSource: 'Mapová data © přispěvatelé OpenStreetMap',
  },

  sim: {
    banner: 'Testovací chůze — ťukni na mapu',
    walkingTo: (m: number) => `Jdu… ${fmtDistance(m)}`,
  },

  web: {
    mapUnavailable: 'Mapa běží jen v telefonu',
    mapUnavailableBody: 'Otevři hru v Expo Go na iPhonu nebo Androidu. Sbírku a profil si můžeš prohlédnout i tady.',
  },
};

export const csContent = content;

export type Strings = typeof cs;

function fmt(n: number): string {
  return Math.round(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

export function fmtDistance(m: number): string {
  if (m < 1000) return `${Math.round(m / 5) * 5} m`;
  return `${(m / 1000).toFixed(1).replace('.', ',')} km`;
}

export const formatNumber = fmt;
