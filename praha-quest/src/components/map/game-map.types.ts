export interface GameMapHandle {
  /** Fly to the player and resume following them. */
  recenter: () => void;
}

export interface GameMapProps {
  onSelectPlace: (id: string) => void;
  /** Tap on empty map. Coordinates are used to aim the simulated walk. */
  onPressMap: (coordinate: { lat: number; lng: number }) => void;
}
