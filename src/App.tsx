/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { useEffect, useRef } from 'react';

const MODULE_SCRIPTS = [
  '/game/palette.js',
  '/game/pixelfont.js',
  '/game/font.js',
  '/game/engine.js',
  '/game/characters.js',
  '/game/layouts.js',
  '/game/world_art.js',
  '/game/world_props.js',
  '/game/world_props_house.js',
  '/game/world_props_bedroom.js',
  '/game/world.js',
  '/game/ui.js',
  '/game/sound.js',
  '/game/anomaly_debug.js',
  '/game/investigation.js',
  '/game/album.js',
  '/game/scenes.js',
  '/game/save.js',
  '/game/menus.js',
  '/game/debug.js',
  '/game/game.js',
];

declare global {
  interface Window {
    Game?: { init: () => void };
    __lastAnniversaryBooted?: boolean;
  }
}

export default function App() {
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current || window.__lastAnniversaryBooted) return;
    startedRef.current = true;
    window.__lastAnniversaryBooted = true;

    let cancelled = false;
    (async () => {
      for (const src of MODULE_SCRIPTS) {
        if (cancelled) return;
        await new Promise<void>((resolve, reject) => {
          const existing = document.querySelector(`script[data-game-src="${src}"]`);
          if (existing) {
            resolve();
            return;
          }
          const script = document.createElement('script');
          script.src = src;
          script.async = false;
          script.dataset.gameSrc = src;
          script.onload = () => resolve();
          script.onerror = () => reject(new Error(`Failed to load ${src}`));
          document.body.appendChild(script);
        });
      }
      if (!cancelled && window.Game && typeof window.Game.init === 'function') {
        window.Game.init();
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div id="game-root">
      <canvas id="game" width={320} height={180} tabIndex={0} />
      <div id="overlay" />
    </div>
  );
}
