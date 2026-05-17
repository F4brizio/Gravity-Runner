import { C, GS, LEVELS, STEP_Y } from './constants.js';
import { state } from './state.js';

export function getSpeed() {
    const bpm = (state.curSong && state.curSong.bpm) ? state.curSong.bpm : 120;
    const bw = C.PS * 5;
    return (bw * bpm) / 60;
}

function mulberry32(seed) {
    return () => {
        seed |= 0; seed = seed + 0x6D2B79F5 | 0;
        let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
        t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
}

export function genObstacles(song, duration, seed = Date.now()) {
    const rng = mulberry32(seed);
    state.blocks = [];
    const bw = C.PS * 5;
    let curX = 0;
    let curGY = LEVELS[3];
    let targetGY = LEVELS[3];
    const stepAmount = STEP_Y;

    function addBlock(x, w, gy, noScore = false, gap = C.GAP) {
        state.blocks.push({ x, w, gy, gap, passed: false, hit: false, scored: false, sndTouch: false, noScore });
    }

    const spd = getSpeed();
    const blockTime = (bw / spd) * 1000;
    const countdownBlocks = Math.ceil(3500 / blockTime);

    for (let i = 0; i < countdownBlocks; i++) {
        addBlock(curX, bw, curGY, true);
        curX += bw;
    }

    let actionDuration = Math.max(0, duration - 10);
    let numActionBlocks = Math.ceil((actionDuration * song.bpm) / 60);

    const profile = song.beatProfile;
    const hasProfile = Array.isArray(profile) && profile.length > 0;

    let patternType = 'NONE';
    let patternCount = 0;

    for (let i = 0; i < numActionBlocks; i++) {
        if (patternCount <= 0) {
            const r = rng();
            if (r < 0.15) {
                patternType = 'ESCALERA_UP';
                patternCount = 2 + Math.floor(rng() * 3);
            } else if (r < 0.30) {
                patternType = 'ESCALERA_DOWN';
                patternCount = 2 + Math.floor(rng() * 3);
            } else if (r < 0.65) {
                patternType = 'ZIGZAG';
                patternCount = 4 + Math.floor(rng() * 4);
            } else {
                patternType = 'MUSIC_RANDOM';
                patternCount = 1 + Math.floor(rng() * 2);
            }
        }

        if (patternType === 'ESCALERA_UP') {
            targetGY = curGY - STEP_Y;
        } else if (patternType === 'ESCALERA_DOWN') {
            targetGY = curGY + STEP_Y;
        } else if (patternType === 'ZIGZAG') {
            targetGY = (i % 2 === 0) ? LEVELS[1] : LEVELS[5];
        } else {
            if (hasProfile) {
                let pidx = (countdownBlocks + i) % profile.length;
                let musicIdx = Math.round(profile[pidx] * (LEVELS.length - 1));
                if (rng() < 0.3) musicIdx = Math.max(0, Math.min(LEVELS.length - 1, musicIdx + (rng() > 0.5 ? 1 : -1)));
                targetGY = LEVELS[musicIdx];
            } else {
                targetGY = LEVELS[Math.floor(rng() * LEVELS.length)];
            }
        }

        targetGY = Math.max(LEVELS[0], Math.min(LEVELS[LEVELS.length - 1], targetGY));

        if (curGY < targetGY) curGY = Math.min(targetGY, curGY + stepAmount);
        else if (curGY > targetGY) curGY = Math.max(targetGY, curGY - stepAmount);

        addBlock(curX, bw, curGY, false, C.GAP);
        curX += bw;
        patternCount--;
    }

    const outroBlocks = Math.ceil((10 * song.bpm) / 60);
    const midGY = LEVELS[3];
    for (let i = 0; i < outroBlocks; i++) {
        if (curGY < midGY) curGY = Math.min(midGY, curGY + stepAmount);
        else if (curGY > midGY) curGY = Math.max(midGY, curGY - stepAmount);
        addBlock(curX, bw, curGY, true);
        curX += bw;
    }

    addBlock(curX, C.W * 1.5, curGY, true);
}
