/** App-level (non-game) settings. Game rules live in src/game/config.ts. */
export const APP_CONFIG = {
  /** Lets testers walk a virtual character by tapping the map. Disable for release. */
  allowSimulatedWalk: true,
  /** Simulated walking speed (m/s ≈ 5 km/h). */
  simWalkSpeedMs: 1.4,
  simTickMs: 1_000,
  /** Where the simulated walker starts when there is no real fix (Staroměstské náměstí). */
  simStart: { lat: 50.0875, lng: 14.4213 },
  /** expo-location watch tuning. */
  locationIntervalMs: 3_000,
  locationDistanceM: 5,
  /** Reward feed: how long one toast stays up. */
  toastMs: 2_600,
  maxToasts: 3,
  /** Hex reveal SFX is throttled so a fast walk is not a machine gun. */
  revealSfxThrottleMs: 1_500,
} as const;
