import { Sfx } from './audio.js';

export const keys = {};

export function resetKeys() {
    for (const k in keys) delete keys[k];
}

export function setupInput({ onPause }) {
    window.addEventListener('keydown', e => {
        keys[e.key] = true;
        Sfx.init();
        if (e.key === 'p' || e.key === 'P' || e.key === ' ') onPause();
    });
    window.addEventListener('keyup', e => { keys[e.key] = false; });
    window.addEventListener('mousedown', () => Sfx.init());
}
