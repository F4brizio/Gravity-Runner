import { state } from './state.js';

export function drawCube(cx, s, drawState) {
    let main = `hsla(${state.curHue}, 100%, 85%, 1)`;
    if (drawState === 'CRASH') {
        main = '#ff4444';
        cx.translate(Math.sin(state.et * 0.1) * 3, Math.cos(state.et * 0.1) * 3);
    }
    const g = cx.createRadialGradient(0, 0, 0, 0, 0, s);
    g.addColorStop(0, '#fff');
    g.addColorStop(0.3, `hsla(${state.curHue}, 100%, 75%, 1)`);
    g.addColorStop(1, main);
    cx.fillStyle = g;
    cx.globalAlpha = 0.8;
    cx.fillRect(-s / 2, -s / 2, s, s);
    cx.fillStyle = '#fff'; cx.globalAlpha = 0.6; cx.fillRect(-s / 2 + 4, -s / 2 + 4, 8, 8);
}

export function drawCat(cx, s, drawState) {
    const t = state.et * 0.01;
    let main = `hsla(${state.curHue}, 100%, 85%, 1)`;
    let sec = `hsla(${state.curHue}, 100%, 60%, 1)`;
    if (drawState === 'CRASH') {
        main = '#ff4444'; sec = '#880000';
        cx.translate(Math.sin(state.et * 0.1) * 3, Math.cos(state.et * 0.1) * 3);
    }
    const bob = drawState === 'RUN' ? Math.sin(t * 10) * 1.5 : 0;
    cx.translate(0, bob);
    cx.fillStyle = main;
    cx.fillRect(-s * 0.4, -s * 0.2, s * 0.8, s * 0.5);
    cx.fillRect(s * 0.1, -s * 0.3, s * 0.3, s * 0.2);
    cx.fillRect(s * 0.2, -s * 0.5, s * 0.4, s * 0.4);
    cx.fillStyle = sec;
    cx.fillRect(s * 0.2, -s * 0.6, s * 0.1, s * 0.15);
    cx.fillRect(s * 0.5, -s * 0.6, s * 0.1, s * 0.15);
    const tailY = Math.sin(t * 8) * (drawState === 'RUN' ? 6 : 1.5);
    cx.fillRect(-s * 0.5, -s * 0.1 + tailY * 0.5, s * 0.2, s * 0.2);
    cx.fillRect(-s * 0.6, -s * 0.2 + tailY, s * 0.2, s * 0.2);
    cx.fillStyle = sec;
    if (drawState === 'RUN') {
        const l1 = Math.sin(t * 12) * 4, l2 = Math.cos(t * 12) * 4;
        cx.fillRect(s * 0.2, s * 0.3 + l1, s * 0.15, s * 0.2);
        cx.fillRect(-s * 0.3, s * 0.3 + l2, s * 0.15, s * 0.2);
    } else {
        const legY = drawState === 'AIR' ? s * 0.1 : s * 0.25;
        cx.fillRect(s * 0.2, legY, s * 0.15, s * 0.15);
        cx.fillRect(-s * 0.3, legY, s * 0.15, s * 0.15);
    }
    if (drawState === 'CRASH') {
        cx.strokeStyle = '#fff'; cx.lineWidth = 2;
        cx.beginPath(); cx.moveTo(s * 0.35, -s * 0.4); cx.lineTo(s * 0.45, -s * 0.3); cx.stroke();
        cx.beginPath(); cx.moveTo(s * 0.45, -s * 0.4); cx.lineTo(s * 0.35, -s * 0.3); cx.stroke();
    } else {
        cx.fillStyle = '#000'; cx.fillRect(s * 0.4, -s * 0.4, s * 0.08, s * 0.08);
        cx.fillStyle = '#fff'; cx.fillRect(s * 0.4, -s * 0.4, s * 0.03, s * 0.03);
    }
}

export function drawFox(cx, s, drawState) {
    const t = state.et * 0.01;
    let main = `hsla(${state.curHue}, 100%, 85%, 1)`, sec = `hsla(${state.curHue}, 100%, 60%, 1)`;
    if (drawState === 'CRASH') { main = '#ff4444'; sec = '#880000'; cx.translate(Math.sin(state.et * 0.1) * 3, Math.cos(state.et * 0.1) * 3); }
    const bob = drawState === 'RUN' ? Math.sin(t * 12) * 2 : (drawState === 'AIR' ? Math.sin(t * 4) * 1 : 0);
    cx.translate(0, bob);
    cx.fillStyle = main; cx.fillRect(-s * 0.45, -s * 0.15, s * 0.9, s * 0.4);
    cx.fillRect(s * 0.2, -s * 0.25, s * 0.3, s * 0.2);
    cx.fillRect(s * 0.3, -s * 0.45, s * 0.4, s * 0.35);
    cx.fillRect(s * 0.6, -s * 0.3, s * 0.2, s * 0.15);
    cx.fillStyle = sec; cx.beginPath();
    cx.moveTo(s * 0.3, -s * 0.45); cx.lineTo(s * 0.35, -s * 0.65); cx.lineTo(s * 0.45, -s * 0.45);
    cx.moveTo(s * 0.5, -s * 0.45); cx.lineTo(s * 0.55, -s * 0.65); cx.lineTo(s * 0.65, -s * 0.45); cx.fill();
    const tailAnim = Math.sin(t * 8) * (drawState === 'RUN' ? 12 : 3);
    cx.fillRect(-s * 0.65, -s * 0.1 + tailAnim * 0.3, s * 0.25, s * 0.25);
    cx.fillStyle = main; cx.fillRect(-s * 0.85, -s * 0.15 + tailAnim * 0.7, s * 0.25, s * 0.25);
    cx.fillStyle = sec;
    if (drawState === 'RUN') {
        const l1 = Math.sin(t * 15) * 5, l2 = Math.cos(t * 15) * 5;
        cx.fillRect(s * 0.3, s * 0.25 + l1, s * 0.12, s * 0.25);
        cx.fillRect(-s * 0.4, s * 0.25 + l2, s * 0.12, s * 0.25);
    } else {
        const legY = drawState === 'AIR' ? s * 0.1 : s * 0.25;
        cx.fillRect(s * 0.3, legY, s * 0.12, s * 0.15);
        cx.fillRect(-s * 0.4, legY, s * 0.12, s * 0.15);
    }
    if (drawState === 'CRASH') {
        cx.strokeStyle = '#fff'; cx.lineWidth = 2;
        cx.beginPath(); cx.moveTo(s * 0.4, -s * 0.35); cx.lineTo(s * 0.5, -s * 0.25); cx.stroke();
        cx.beginPath(); cx.moveTo(s * 0.5, -s * 0.35); cx.lineTo(s * 0.4, -s * 0.25); cx.stroke();
    } else {
        cx.fillStyle = '#000'; cx.fillRect(s * 0.45, -s * 0.35, s * 0.08, s * 0.08);
        cx.fillStyle = '#fff'; cx.fillRect(s * 0.45, -s * 0.35, s * 0.03, s * 0.03);
    }
    cx.globalAlpha = 0.6; cx.fillStyle = sec;
    const scarfT = Math.sin(t * 10) * 5;
    cx.fillRect(s * 0.2, -s * 0.2, -s * 0.6, s * 0.08 + scarfT * 0.1); cx.globalAlpha = 1;
}

export function drawDrone(cx, s, drawState) {
    const t = state.et * 0.01;
    let main = `hsla(${state.curHue}, 100%, 80%, 1)`, glass = `hsla(${state.curHue}, 100%, 40%, 0.5)`, core = drawState === 'CRASH' ? '#ff3333' : '#fff';
    if (drawState === 'CRASH') cx.translate(Math.sin(state.et * 0.1) * 4, Math.cos(state.et * 0.1) * 4);
    const hover = Math.sin(t * 8) * 3; cx.translate(0, hover);
    cx.fillStyle = main; cx.fillRect(-s * 0.35, -s * 0.35, s * 0.7, s * 0.7);
    const wingOff = Math.sin(t * 15) * 5;
    cx.fillStyle = glass;
    cx.fillRect(s * 0.35, -s * 0.2 + wingOff, s * 0.2, s * 0.4);
    cx.fillRect(-s * 0.55, -s * 0.2 - wingOff, s * 0.2, s * 0.4);
    cx.fillStyle = core; cx.shadowBlur = 15; cx.shadowColor = core;
    cx.beginPath(); cx.arc(0, 0, s * 0.15, 0, Math.PI * 2); cx.fill(); cx.shadowBlur = 0;
    cx.strokeStyle = `hsla(${state.curHue}, 100%, 50%, 0.8)`; cx.lineWidth = 2; cx.strokeRect(-s * 0.25, -s * 0.25, s * 0.5, s * 0.5);
    if (drawState === 'RUN') { cx.fillStyle = `hsla(${state.curHue}, 100%, 60%, 0.4)`; cx.fillRect(-s * 0.8, -s * 0.05, s * 0.4, s * 0.1); }
}

export function drawGhost(cx, s, drawState) {
    const t = state.et * 0.01;
    cx.globalAlpha = drawState === 'CRASH' ? 0.9 : 0.6;
    const drift = Math.sin(t * 5) * 4; cx.translate(drift, drift * 0.5);
    cx.fillStyle = drawState === 'CRASH' ? '#f00' : '#fff';
    cx.beginPath(); cx.arc(0, -s * 0.1, s * 0.4, Math.PI, 0); cx.lineTo(s * 0.4, s * 0.4);
    for (let i = 0; i < 3; i++) {
        const off = Math.sin(t * 10 + i) * 5;
        cx.lineTo(s * 0.4 - (i * s * 0.3), s * 0.4 + off);
    }
    cx.lineTo(-s * 0.4, s * 0.4); cx.fill();
    cx.fillStyle = '#000';
    cx.fillRect(-s * 0.2, -s * 0.1, s * 0.1, s * 0.1);
    cx.fillRect(s * 0.1, -s * 0.1, s * 0.1, s * 0.1);
    cx.globalAlpha = 1;
}

export function drawUFO(cx, s, drawState) {
    const t = state.et * 0.01;
    let main = `hsla(${state.curHue}, 100%, 70%, 1)`;
    if (drawState === 'CRASH') { main = '#f00'; cx.translate(Math.sin(state.et * 0.2) * 5, 0); }
    cx.fillStyle = main; cx.beginPath(); cx.ellipse(0, 0, s * 0.6, s * 0.25, 0, 0, Math.PI * 2); cx.fill();
    cx.fillStyle = `hsla(${state.curHue}, 100%, 90%, 0.5)`; cx.beginPath(); cx.arc(0, -s * 0.1, s * 0.25, Math.PI, 0); cx.fill();
    for (let i = -2; i <= 2; i++) {
        const glow = (Math.sin(t * 10 + i) + 1) * 0.5;
        cx.fillStyle = `hsla(${(state.curHue + i * 30) % 360}, 100%, 50%, ${glow})`;
        cx.fillRect(i * s * 0.2 - 2, s * 0.05, 4, 4);
    }
}

export function drawNinja(cx, s, drawState) {
    const t = state.et * 0.01;
    let main = '#111', sec = `hsla(${state.curHue}, 100%, 50%, 1)`;
    if (drawState === 'CRASH') { main = '#400'; cx.translate(Math.sin(state.et * 0.1) * 3, 0); }
    cx.fillStyle = main; cx.fillRect(-s * 0.2, -s * 0.4, s * 0.4, s * 0.7);
    cx.fillStyle = '#fdb'; cx.fillRect(-s * 0.15, -s * 0.35, s * 0.3, s * 0.15);
    cx.fillStyle = '#000'; cx.fillRect(-s * 0.2, -s * 0.3, s * 0.4, s * 0.05);
    const scarfL = drawState === 'RUN' ? s * 0.8 : s * 0.4;
    cx.fillStyle = sec; cx.beginPath();
    cx.moveTo(-s * 0.2, -s * 0.25);
    cx.bezierCurveTo(-s * 0.5, -s * 0.3 + Math.sin(t * 10) * 10, -s * 0.7, -s * 0.1, -scarfL, -s * 0.2 + Math.sin(t * 10) * 5);
    cx.lineTo(-s * 0.2, -s * 0.2); cx.fill();
    if (drawState === 'RUN') {
        const l1 = Math.sin(t * 15) * 6;
        cx.fillStyle = main;
        cx.fillRect(0, s * 0.3, s * 0.1, s * 0.15 + l1);
        cx.fillRect(-s * 0.1, s * 0.3, s * 0.1, s * 0.15 - l1);
    }
}

export function drawShark(cx, s, drawState) {
    const t = state.et * 0.01;
    let main = `hsla(${state.curHue}, 60%, 40%, 1)`;
    if (drawState === 'CRASH') { main = '#f33'; cx.translate(Math.sin(state.et * 0.1) * 4, 0); }
    cx.fillStyle = main;
    cx.beginPath();
    cx.moveTo(s * 0.5, 0); cx.quadraticCurveTo(0, -s * 0.4, -s * 0.5, 0); cx.quadraticCurveTo(0, s * 0.4, s * 0.5, 0); cx.fill();
    cx.beginPath(); cx.moveTo(0, -s * 0.2); cx.lineTo(-s * 0.1, -s * 0.5); cx.lineTo(s * 0.1, -s * 0.2); cx.fill();
    const tailW = Math.sin(t * 15) * 10;
    cx.beginPath(); cx.moveTo(-s * 0.5, 0); cx.lineTo(-s * 0.7, -s * 0.2 + tailW); cx.lineTo(-s * 0.7, s * 0.2 + tailW); cx.fill();
    cx.fillStyle = '#fff'; cx.fillRect(s * 0.2, -s * 0.1, 2, 2);
}
