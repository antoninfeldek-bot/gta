/**
 * Turns engine rewards into what the player feels: toasts, SFX and haptics.
 * Started once from the root layout.
 */
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import { APP_CONFIG } from '@/app-config';
import type { Reward } from '@/game';
import { t } from '@/i18n';
import { engine, useGameStore } from '@/store/game-store';
import { useFeedStore } from '@/store/feed-store';
import { onRewards } from './reward-bus';

type Sfx = 'reveal' | 'claim' | 'level';
const SOURCES: Record<Sfx, number> = {
  reveal: require('../../assets/sfx/reveal.wav'),
  claim: require('../../assets/sfx/claim.wav'),
  level: require('../../assets/sfx/level.wav'),
};
let players: Partial<Record<Sfx, AudioPlayer>> = {};
let lastRevealSfx = 0;

function play(sfx: Sfx) {
  if (!useGameStore.getState().settings.sound) return;
  try {
    const player = (players[sfx] ??= createAudioPlayer(SOURCES[sfx]));
    player.seekTo(0);
    player.play();
  } catch {
    // Audio is a nicety; never let it break the game.
  }
}

function buzz(kind: 'light' | 'success' | 'heavy') {
  if (!useGameStore.getState().settings.haptics) return;
  const run =
    kind === 'light'
      ? Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      : kind === 'heavy'
        ? Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
        : Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  run.catch(() => {});
}

function handle(rewards: Reward[]) {
  const feed = useFeedStore.getState();
  const sumXp = (source: string) =>
    rewards.filter((r) => r.kind === 'xp' && r.source === source).reduce((s, r) => s + (r.kind === 'xp' ? r.amount : 0), 0);
  const placeCoins = rewards.find((r) => r.kind === 'coins' && r.source === 'place');

  const hexes = rewards.filter((r) => r.kind === 'hexRevealed').length;
  if (hexes > 0) {
    feed.push({ tone: 'xp', title: hexes === 1 ? t.rewards.hex : t.rewards.hexMany(hexes), detail: t.rewards.xp(sumXp('hex')) });
    const now = Date.now();
    if (now - lastRevealSfx > APP_CONFIG.revealSfxThrottleMs) {
      lastRevealSfx = now;
      play('reveal');
      buzz('light');
    }
  }

  const stepXp = sumXp('steps');
  if (stepXp > 0 && hexes === 0) feed.push({ tone: 'xp', title: t.rewards.steps, detail: t.rewards.xp(stepXp) });

  for (const r of rewards) {
    if (r.kind === 'placeDiscovered' || r.kind === 'placeRevisited') {
      const place = engine.placeById.get(r.placeId);
      const coins = placeCoins?.kind === 'coins' ? ` ${t.rewards.coins(placeCoins.amount)}` : '';
      feed.push({
        tone: 'place',
        rarity: place?.rarity,
        title: `${r.kind === 'placeDiscovered' ? t.rewards.placeDiscovered : t.rewards.placeRevisited}: ${place?.nameCs ?? ''}`,
        detail: `${t.rewards.xp(sumXp('place'))}${coins}`,
      });
      play('claim');
      buzz('success');
    }
    if (r.kind === 'item') feed.push({ tone: 'item', title: t.rewards.item, detail: t.items[r.itemId]?.name ?? r.itemId });
    if (r.kind === 'setCompleted') {
      const set = engine.catalog.sets.find((s) => s.id === r.setId);
      feed.push({ tone: 'set', title: `${t.rewards.setCompleted}: ${set?.nameCs ?? ''}`, detail: t.rewards.xp(sumXp('set')) });
    }
  }

  const levels = rewards.filter((r) => r.kind === 'levelUp');
  if (levels.length > 0) {
    const top = levels[levels.length - 1];
    if (top.kind === 'levelUp') feed.showLevelUp(top.level);
    play('level');
    buzz('heavy');
  }
}

let started = false;
export function startFeedback() {
  if (started) return;
  started = true;
  setAudioModeAsync({ playsInSilentMode: false }).catch(() => {});
  onRewards(handle);
}

export function stopFeedbackPlayers() {
  for (const p of Object.values(players)) p?.release();
  players = {};
}
