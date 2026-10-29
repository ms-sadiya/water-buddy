import React, { useState, useEffect } from 'react';
import { getCharacterAsset, MASTER_CHARACTER_ASSET } from '../../constants/characterAssets.js';
import './WaterBuddy.css';

/**
 * WaterBuddy Character Component
 *
 * Renders the official 3D cartoon girl character with responsive proportions,
 * high-fidelity rendering, and genuine transparent overlay on Windows desktop.
 *
 * Supports character states: 'idle', 'happy', 'gentle', and 'waving'.
 * If custom sprites are not yet available for a state, it cleanly displays
 * the master idle asset with tailored CSS micro-animation.
 *
 * @param {Object} props
 * @param {'idle' | 'happy' | 'gentle' | 'waving'} [props.state='idle'] - Character visual state / mood
 * @param {string} [props.className] - Optional container CSS class name
 * @param {Function} [props.onClick] - Optional click handler on the character
 */
export default function WaterBuddy({ state = 'idle', className = '', onClick }) {
  const [imageSrc, setImageSrc] = useState(() => getCharacterAsset(state));

  // Update image source when state changes
  useEffect(() => {
    setImageSrc(getCharacterAsset(state));
  }, [state]);

  // Robust runtime fallback: if an asset fails to load, gracefully fall back to master idle
  const handleImageError = () => {
    if (imageSrc !== MASTER_CHARACTER_ASSET) {
      console.warn(`[WaterBuddy] Failed to load character asset for "${state}", falling back to master idle.`);
      setImageSrc(MASTER_CHARACTER_ASSET);
    }
  };

  return (
    <div
      className={`water-buddy-wrapper state-${state} ${className}`.trim()}
      onClick={onClick}
      aria-label={`Water Buddy character (${state})`}
    >
      <img
        src={imageSrc}
        alt="Water Buddy"
        className="water-buddy-img"
        draggable={false}
        onError={handleImageError}
      />
    </div>
  );
}
