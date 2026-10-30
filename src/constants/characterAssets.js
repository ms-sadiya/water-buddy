/**
 * Centralized Character Asset Registry & State Mapping
 *
 * Defines character visual states, master assets, and asset fallback logic.
 * Enables adding new expression and animation sprites in future phases
 * without modifying React reminder or scheduling logic.
 */

export const MASTER_CHARACTER_ASSET = './character/idle.png';

/**
 * Character visual states supported by the UI.
 * @type {readonly string[]}
 */
export const CHARACTER_STATES = Object.freeze([
  'idle',
  'happy',
  'gentle',
  'waving',
]);

/**
 * Asset file mapping for each state.
 * Any missing or future files cleanly fall back to MASTER_CHARACTER_ASSET.
 */
export const CHARACTER_ASSETS = Object.freeze({
  idle: './character/idle.png',
  happy: './character/happy.png',
  gentle: './character/gentle.png',
  waving: './character/waving.png',
});

/**
 * Set of character assets physically present in public/character/.
 * All 4 official character assets are present with transparent backgrounds:
 * - idle.png (master)
 * - happy.png (celebration on Yes)
 * - gentle.png (comfort / encouragement on Not yet)
 * - waving.png (friendly greeting on reminder appearance)
 */
export const AVAILABLE_CHARACTER_ASSETS = Object.freeze(
  new Set(['idle', 'happy', 'gentle', 'waving'])
);

/**
 * Resolves the appropriate asset path for a given character state.
 * Falls back to MASTER_CHARACTER_ASSET if the state asset is not yet available.
 *
 * @param {string} state - The requested character state ('idle' | 'happy' | 'gentle' | 'waving')
 * @returns {string} The verified relative path to the image asset
 */
export function getCharacterAsset(state) {
  const normalizedState = String(state || 'idle').toLowerCase();

  if (AVAILABLE_CHARACTER_ASSETS.has(normalizedState)) {
    return CHARACTER_ASSETS[normalizedState] || MASTER_CHARACTER_ASSET;
  }

  // Gracefully fall back to master character image
  return MASTER_CHARACTER_ASSET;
}

/**
 * Returns a list of assets that are planned but not yet added to public/character/.
 * Useful for diagnostics and tracking implementation phases.
 *
 * @returns {Array<{ state: string, expectedPath: string, isAvailable: boolean }>}
 */
export function getCharacterAssetInventory() {
  return CHARACTER_STATES.map((state) => ({
    state,
    expectedPath: CHARACTER_ASSETS[state],
    isAvailable: AVAILABLE_CHARACTER_ASSETS.has(state),
  }));
}

