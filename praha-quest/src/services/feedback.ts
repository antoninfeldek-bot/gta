/**
 * Turns engine rewards into what the player feels: toasts, SFX and haptics.
 * Started once from the root layout.
 */
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import { APP_CONFIG } from '@/app-config';
import type { Reward } from '@/game';
import { t, tc } from '@/i18n';
import { dailyQuests } from '@/game';
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

const cheer = () => tc.cheers[Math.floor(Math.random() * tc.cheers.length)];

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
        cheer: r.kind === 'placeDiscovered' && (place?.rarity === 'legendary' || place?.rarity === 'epic') ? cheer() : undefined,
        title: `${r.kind === 'placeDiscovered' ? t.rewards.placeDiscovered : t.rewards.placeRevisited}: ${place?.nameCs ?? ''}`,
        detail: `${t.rewards.xp(sumXp('place'))}${coins}`,
      });
      play('claim');
      buzz('success');
    }
    if (r.kind === 'item') feed.push({ tone: 'item', title: t.rewards.item, detail: t.items[r.itemId]?.name ?? r.itemId });
    if (r.kind === 'dishUnlocked') {
      feed.push({ tone: 'food', title: t.rewards.dish, detail: tc.dishes[r.dishId]?.name ?? r.dishId });
    }
    if (r.kind === 'dailyQuestDone') {
      const game = useGameStore.getState().game;
      const quest = dailyQuests(game.playerSeed, game.daily.day).find((q) => q.id === r.questId);
      feed.push({ tone: 'quest', title: t.rewards.dailyQuest, detail: quest ? t.quests.reward(quest.xp, quest.coins) : undefined });
      play('claim');
      buzz('success');
    }
    if (r.kind === 'dailyAllDone') {
      feed.push({ tone: 'quest', cheer: cheer(), title: t.rewards.dailyAll(r.streak) });
    }
    if (r.kind === 'storyStep') {
      const quest = tc.storyQuests[r.questId];
      if (quest && r.step < quest.steps.length) {
        feed.push({ tone: 'quest', title: `${t.rewards.storyStep}: ${quest.title}`, detail: `${r.step}/${quest.steps.length}` });
      }
    }
    if (r.kind === 'storyDone') {
      feed.push({ tone: 'quest', cheer: cheer(), title: `${t.rewards.storyDone}: ${tc.storyQuests[r.questId]?.title ?? ''}` });
      play('level');
      buzz('heavy');
    }
    if (r.kind === 'setCompleted') {
      const set = engine.catalog.sets.find((s) => s.id === r.setId);
      feed.push({ tone: 'set', cheer: cheer(), title: `${t.rewards.setCompleted}: ${set?.nameCs ?? ''}`, detail: t.rewards.xp(sumXp('set')) });
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
