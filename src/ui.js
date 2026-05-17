import { C, GS, LEVELS } from './constants.js';
import { state } from './state.js';
import { Sfx } from './audio.js';
import { SM, MusicCache } from './storage.js';
import { resetKeys } from './input.js';
import { genObstacles } from './obstacles.js';
import { updateHUD, fmtTime } from './physics.js';
import { Net } from './network.js';
import { drawCube, drawCat, drawFox, drawDrone, drawGhost, drawUFO, drawNinja, drawShark } from './characters.js';

const SERVER = import.meta.env.VITE_SERVER_URL || '';

export function show(id) { const el = document.getElementById(id); if (el) el.classList.remove('hd'); }
export function hide(id) { const el = document.getElementById(id); if (el) el.classList.add('hd'); }

function renderAllSongs(el, localSongs, serverSongs) {
    el.innerHTML = '';
    const serverIds = new Set(serverSongs.map(s => s.id));

    // Server songs first
    serverSongs.forEach(s => renderSongRow(el, { ...s, _fromServer: true }, true));

    // Local songs not already on server
    localSongs.filter(s => !serverIds.has(s.id)).forEach(s => renderSongRow(el, s, false));

    if (!serverSongs.length && !localSongs.length) {
        el.innerHTML = '<div style="padding:15px;text-align:center;opacity:.5">No hay canciones. ¡Crea una!</div>';
    }
}

export function showMenu() {
    // Reset multiplayer state
    state.isOnline = false;
    state.opponent = null;
    state.roomCode = null;
    Net.disconnect();

    state.gs = GS.MENU;
    state.paused = false;
    state.blocks = [];
    state.et = 0;
    resetKeys();
    Sfx.stopMusic();
    updateCharUI();
    hide('ui-hud'); hide('ui-save'); hide('ui-go'); hide('ui-pause'); hide('ui-help'); hide('ui-room'); show('ui-menu');

    const el = document.getElementById('slist');
    const localSongs = SM.all();

    // Show local songs immediately — no loading spinner
    renderAllSongs(el, localSongs, []);

    // Enrich with server songs async (2s timeout so local songs always stay visible)
    if (SERVER) {
        const timeout = new Promise(r => setTimeout(() => r([]), 2000));
        const serverFetch = fetch(`${SERVER}/api/songs`)
            .then(r => r.ok ? r.json() : []).catch(() => []);
        Promise.race([serverFetch, timeout]).then(serverSongs => {
            if (serverSongs.length > 0) renderAllSongs(el, localSongs, serverSongs);
        });
    }
}

function renderSongRow(el, s, isServer) {
        const d = document.createElement('div'); d.className = 'si';

        const info = document.createElement('div');
        info.style.textAlign = 'left';
        const tag = isServer ? ' <span style="color:#0cf;font-size:10px">● SERVER</span>' : '';
        info.innerHTML = `<div style="font-weight:bold">${s.name}${tag}</div>
                          <div style="font-size:11px;opacity:.6">${s.bpm} BPM ${s.hasMusic || isServer ? '• ♫' : ''}</div>`;

        const score = document.createElement('div');
        score.className = 'si-score';
        const acc = s.bestAcc || 0;
        score.style.color = acc > 0 ? '#0c4' : 'rgba(255,255,255,.2)';
        score.textContent = acc > 0 ? acc + '%' : '';

        const actions = document.createElement('div');
        actions.style.display = 'flex';
        actions.style.gap = '5px';
        actions.style.justifyContent = 'flex-end';

        // Play button — always present for all songs
        const bp = document.createElement('button'); bp.className = 'bp'; bp.textContent = '▶ JUGAR';
        bp.style.padding = '5px 10px'; bp.onclick = () => startPlay(s);
        actions.appendChild(bp);

        const bm = document.createElement('button'); bm.className = 'bp'; bm.textContent = '⚡ 1v1';
        bm.style.padding = '5px 10px'; bm.style.borderColor = '#0cf'; bm.style.color = '#0cf';
        bm.title = isServer ? 'Jugar en multijugador 1v1' : (SERVER ? 'Solo disponible para canciones del servidor' : 'Requiere VITE_SERVER_URL');
        bm.onclick = () => openMultiplayer(s);
        if (!isServer) { bm.disabled = true; bm.style.opacity = '0.3'; }
        actions.appendChild(bm);

        if (!isServer) {
            const bd = document.createElement('button'); bd.className = 'bd'; bd.textContent = '🗑';
            bd.onclick = () => { if (confirm('¿Borrar canción?')) { SM.del(s.id); showMenu(); } };
            actions.appendChild(bd);
        }

        d.appendChild(info); d.appendChild(score); d.appendChild(actions);
        el.appendChild(d);
}

export function startTap() {
    hide('ui-menu'); show('ui-save');
    document.getElementById('sname').value = 'Nivel ' + Math.floor(Math.random() * 1000);
    document.getElementById('sbpm').value = '120';
    setTimeout(() => document.getElementById('sname').focus(), 100);
}

export function saveSong() {
    const nameEl = document.getElementById('sname');
    const bpmEl = document.getElementById('sbpm');
    const musicEl = document.getElementById('smusic');
    if (!nameEl || !bpmEl) return;

    const name = nameEl.value.trim() || 'Sin nombre';
    const bpm = parseInt(bpmEl.value) || 120;
    const musicFile = musicEl ? musicEl.files[0] : null;
    const id = Date.now().toString();

    if (musicFile) MusicCache[id] = musicFile;

    SM.save({ id, name, bpm, hasMusic: !!musicFile, createdAt: Date.now() });
    showMenu();
}

export function startPlay(song) {
    state.curSong = song;
    state.gs = GS.COUNTDOWN;
    state.paused = false;
    resetGame();
    state.et = 0;
    state.countT = 3000;

    hide('ui-menu'); hide('ui-go'); show('ui-hud');
    document.getElementById('h-bpm').textContent = '♫ ' + song.bpm + ' BPM';

    const seed = song.seed || Date.now();
    const useServerAudio = SERVER && song._fromServer && song.id;

    if (useServerAudio) {
        // Stream from server (single player OR multiplayer — based on song origin, not isOnline)
        Sfx.init();
        if (Sfx.ctx && Sfx.ctx.state === 'suspended') Sfx.ctx.resume();
        Sfx.aud.crossOrigin = 'anonymous';
        Sfx.aud.src = `${SERVER}/api/songs/${song.id}/stream`;
        Sfx.aud.onloadedmetadata = () => {
            const dur = Sfx.aud.duration || song.duration || 60;
            genObstacles(song, dur, seed);
            Sfx.playMusic();
        };
        Sfx.aud.onerror = () => {
            genObstacles(song, song.duration || 60, seed);
        };
        Sfx.aud.load();
    } else {
        const mFile = MusicCache[song.id];
        if (mFile) {
            Sfx.loadMusic(mFile);
            const profilePromise = Sfx.analyzeBeatProfile(mFile, song.bpm);
            Sfx.aud.onloadedmetadata = () => {
                const dur = Sfx.aud.duration || 60;
                genObstacles(song, dur, seed);
                Sfx.playMusic();
                profilePromise.then(profile => {
                    if (profile.length > 0 && state.gs === GS.COUNTDOWN) {
                        song.beatProfile = profile;
                        genObstacles(song, dur, seed);
                    }
                });
            };
            if (Sfx.aud.readyState >= 1) Sfx.aud.onloadedmetadata();
        } else {
            genObstacles(song, 60, seed);
        }
    }

    const b0 = state.blocks[0] || { gy: LEVELS[3] };
    state.pl.grav = 'UP'; state.pl.vy = 0;
    state.pl.y = b0.gy + (C.GAP / 2) - (C.PS / 2);
    state.pl.lastGY = b0.gy; state.pl.lastSide = 'BOT';
    updateHUD();
}

export function showGameOver() {
    state.gs = GS.OVER;
    Sfx.stopMusic();
    hide('ui-hud'); show('ui-go');
    const acc = state.totalBl > 0 ? Math.round((state.bestSc / state.totalBl) * 100) : 0;
    if (state.curSong) SM.updateBest(state.curSong.id, acc);
    document.getElementById('go-sc').textContent = 'Porcentaje: ' + acc + '% | Bloques: ' + state.totalBl;
}

export function togglePause() {
    if (state.gs !== GS.PLAY) return;
    state.paused = !state.paused;
    if (state.paused) {
        Sfx.aud.pause();
        show('ui-pause');
    } else {
        Sfx.aud.play().catch(e => { if (e.name !== 'AbortError') console.error('Pause Resume Error:', e); });
        hide('ui-pause');
    }
}

export function setChar(c) {
    state.pl.char = c;
    localStorage.setItem('gr_char', c);
    updateCharUI();
}

const CHAR_DRAW = { CUBE: drawCube, CAT: drawCat, FOX: drawFox, DRONE: drawDrone, GHOST: drawGhost, UFO: drawUFO, NINJA: drawNinja, SHARK: drawShark };
const CHAR_LABELS = { CUBE: 'CUBE', CAT: 'GATO', FOX: 'ZORRO', DRONE: 'DRON', GHOST: 'GHOST', UFO: 'OVNI', NINJA: 'NINJA', SHARK: 'SHARK' };

export function updateCharUI() {
    const chars = Object.keys(CHAR_DRAW);
    chars.forEach(c => {
        const btn = document.getElementById('btn-char-' + c);
        if (!btn) return;

        const selected = state.pl.char === c;
        if (selected) {
            btn.style.background = 'rgba(0,240,255,0.12)';
            btn.style.borderColor = '#0cf';
            btn.style.color = '#0cf';
            btn.style.boxShadow = '0 0 14px #0cf8';
        } else {
            btn.style.background = 'transparent';
            btn.style.borderColor = '';
            btn.style.color = '';
            btn.style.boxShadow = 'none';
        }

        // Draw character preview on the mini canvas
        const cv = document.getElementById('prev-' + c);
        if (!cv) return;
        const cx = cv.getContext('2d');
        const s = 48; // draw size
        cx.clearRect(0, 0, 56, 56);
        cx.save();
        cx.translate(28, 28);
        CHAR_DRAW[c](cx, s, 'RUN', 0);
        cx.restore();
    });
}

export function showHelp() { show('ui-help'); }
export function hideHelp() { hide('ui-help'); }
export function showSettings() { updateCharUI(); show('ui-settings'); }
export function hideSettings() { hide('ui-settings'); }

export async function detectBPMFromInput(input) {
    const file = input.files[0];
    if (!file) return;
    const status = document.getElementById('bpm-status');
    status.textContent = 'Analizando...';
    try {
        const bpm = await Sfx.analyzeBPM(file);
        document.getElementById('sbpm').value = bpm;
        status.textContent = 'OK!';
    } catch (e) {
        status.textContent = 'Error';
    }
    setTimeout(() => { status.textContent = ''; }, 2000);
}

export function adjBPM(m) {
    const el = document.getElementById('sbpm');
    const v = Math.round(parseInt(el.value) * m);
    if (v >= 40 && v <= 600) el.value = v;
}

function resetGame() {
    state.blocks = []; state.parts = []; state.pl.trail = [];
    state.et = 0; state.sc = 0; state.bestSc = 0; state.totalBl = 0; state.totalSuccess = 0;
    state.scoreA.on = false; state.flash = 0; state.pl.vy = 0;
    state.energyMult = 1.0; state.smoothEnergy = 0;
    state.lastBeatEnergy = 0; state.beatCooldown = 0; state.beatFlash = 0;
    state.dynamicGap = C.GAP;
    state.lastTier = 0; state.tierMsg = { text: '', sub: '', t: 0, tier: 0 };
}

// Expose to HTML onclick handlers
window.showMenu = showMenu;
window.startTap = startTap;
window.saveSong = saveSong;
window.startPlay = startPlay;
window.togglePause = togglePause;
window.showHelp = showHelp;
window.hideHelp = hideHelp;
window.showSettings = showSettings;
window.hideSettings = hideSettings;
window.setChar = setChar;
window.detectBPMFromInput = detectBPMFromInput;
window.adjBPM = adjBPM;
window.retryGame = () => startPlay(state.curSong);

// --- Multiplayer room UI ---

export function showRoom() {
    hide('ui-menu'); hide('ui-go');
    show('ui-room');
    document.getElementById('room-code').textContent = '';
    document.getElementById('room-status').textContent = 'Conectando…';
}

export function openMultiplayer(song) {
    state.curSong = song;
    showRoom();
    Net.connect();
    Net.on('room_created', ({ code }) => {
        state.roomCode = code;
        document.getElementById('room-code').textContent = code;
        document.getElementById('room-status').textContent = 'Esperando rival…';
    });
    Net.on('room_ready', ({ seed }) => {
        document.getElementById('room-status').textContent = '¡Rival encontrado! Preparando…';
        state.isOnline = true;
        hide('ui-room');
        startPlay({ ...song, seed });
    });
    Net.on('opponent_disconnected', () => {
        alert('El rival se desconectó.');
        state.isOnline = false; state.opponent = null;
        showMenu();
    });
    Net.createRoom(song.id, state.pl.char);
}

window.showRoom = showRoom;
window.openMultiplayer = openMultiplayer;

window.joinRoomFromInput = () => {
    const code = (document.getElementById('room-join-input')?.value || '').trim().toUpperCase();
    if (code.length !== 4) return;
    Net.connect();
    // When joining, the server sends the songId from the host's room.
    // We fetch the song profile from the server to get bpm/duration.
    Net.on('room_ready', ({ seed, song }) => {
        state.isOnline = true;
        hide('ui-room');
        const fetchMeta = SERVER
            ? fetch(`${SERVER}/api/songs/${song.id}/profile`).then(r => r.ok ? r.json() : null).catch(() => null)
            : Promise.resolve(null);
        fetchMeta.then(meta => {
            const songObj = { id: song.id, bpm: meta?.bpm || 120, duration: meta?.duration || 60, beatProfile: meta?.beatProfile, seed };
            state.curSong = songObj;
            startPlay(songObj);
        });
    });
    Net.on('opponent_disconnected', () => {
        alert('El rival se desconectó.');
        state.isOnline = false; state.opponent = null;
        showMenu();
    });
    document.getElementById('room-status').textContent = 'Uniéndose a sala ' + code + '…';
    Net.joinRoom(code, state.pl.char);
};

window.cancelRoom = () => {
    Net.disconnect();
    showMenu();
};
