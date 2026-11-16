/**
 * Feeds real (or simulated) sensors into the engine. Mounted once in the root
 * layout so tracking keeps running while the player browses other tabs.
 */
import * as Location from 'expo-location';
import { Pedometer } from 'expo-sensors';
import { useEffect, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { APP_CONFIG } from '@/app-config';
import { moveTowards } from '@/game';
import { useGameStore } from '@/store/game-store';
import { useSensorStore } from '@/store/sensor-store';

export function GameSensors() {
  const simulate = useGameStore((s) => s.settings.simulate && APP_CONFIG.allowSimulatedWalk);
  const requestNonce = useSensorStore((s) => s.requestNonce);
  const active = useAppActive();

  usePedometer(active && !simulate);
  useRealLocation(active && !simulate, requestNonce);
  useSimulatedWalk(active && simulate);
  return null;
}

function useAppActive() {
  const [active, setActive] = useState(AppState.currentState === 'active');
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => setActive(state === 'active'));
    return () => sub.remove();
  }, []);
  return active;
}

function usePedometer(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    if (Platform.OS === 'web') {
      useGameStore.getState().setStepSource('gps');
      return;
    }
    let sub: { remove: () => void } | null = null;
    let cancelled = false;
    let lastTotal = 0;
    (async () => {
      try {
        const available = await Pedometer.isAvailableAsync();
        const perm = available ? await Pedometer.requestPermissionsAsync() : null;
        if (cancelled) return;
        if (!available || !perm?.granted) {
          useGameStore.getState().setStepSource('gps');
          return;
        }
        useGameStore.getState().setStepSource('pedometer');
        // watchStepCount reports steps since subscribing; we forward deltas.
        sub = Pedometer.watchStepCount(({ steps }) => {
          const delta = steps - lastTotal;
          lastTotal = steps;
          if (delta > 0) useGameStore.getState().dispatch({ type: 'steps', delta });
        });
      } catch {
        useGameStore.getState().setStepSource('gps');
      }
    })();
    return () => {
      cancelled = true;
      sub?.remove();
    };
  }, [enabled]);
}

function useRealLocation(enabled: boolean, requestNonce: number) {
  useEffect(() => {
    if (!enabled) return;
    let sub: Location.LocationSubscription | null = null;
    let cancelled = false;
    (async () => {
      const { granted } = await Location.requestForegroundPermissionsAsync();
      if (cancelled) return;
      useSensorStore.getState().set({ permission: granted ? 'granted' : 'denied' });
      if (!granted) return;
      sub = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: APP_CONFIG.locationIntervalMs,
          distanceInterval: APP_CONFIG.locationDistanceM,
        },
        (loc) => {
          const { latitude, longitude, accuracy, speed } = loc.coords;
          useSensorStore.getState().set({ position: { lat: latitude, lng: longitude, accuracy } });
          const store = useGameStore.getState();
          store.dispatch({
            type: 'location',
            fix: { lat: latitude, lng: longitude, accuracy, speed, timestamp: loc.timestamp },
            creditGpsSteps: store.stepSource !== 'pedometer',
          });
        },
      );
      if (cancelled) sub.remove();
    })().catch(() => useSensorStore.getState().set({ permission: 'denied' }));
    return () => {
      cancelled = true;
      sub?.remove();
    };
  }, [enabled, requestNonce]);
}

/** Walks a virtual player toward the tapped target at walking speed. */
function useSimulatedWalk(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    useSensorStore.getState().set({ permission: 'granted' });
    useGameStore.getState().setStepSource('gps');
    const start = useGameStore.getState().game.lastFix ?? useSensorStore.getState().position ?? APP_CONFIG.simStart;
    let pos = { lat: start.lat, lng: start.lng };
    const tick = () => {
      const store = useGameStore.getState();
      const target = store.simTarget;
      if (target) {
        pos = moveTowards(pos, target, APP_CONFIG.simWalkSpeedMs * (APP_CONFIG.simTickMs / 1000));
        if (pos.lat === target.lat && pos.lng === target.lng) store.setSimTarget(null);
      }
      useSensorStore.getState().set({ position: { ...pos, accuracy: 5 } });
      store.dispatch({
        type: 'location',
        fix: { ...pos, accuracy: 5, speed: target ? APP_CONFIG.simWalkSpeedMs : 0, timestamp: Date.now() },
        creditGpsSteps: true,
      });
    };
    tick();
    const id = setInterval(tick, APP_CONFIG.simTickMs);
    return () => clearInterval(id);
  }, [enabled]);
}
