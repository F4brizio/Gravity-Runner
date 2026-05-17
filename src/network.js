import { io } from 'socket.io-client';
import { state } from './state.js';

const SERVER = import.meta.env.VITE_SERVER_URL || '';

let socket = null;
let _onRoomCreated = null;
let _onRoomReady = null;
let _onCountdown = null;
let _onGameOver = null;
let _onDisconnected = null;

function setupHandlers() {
    socket.on('room_created', data => _onRoomCreated?.(data));
    socket.on('room_ready', data => _onRoomReady?.(data));
    socket.on('countdown_start', data => _onCountdown?.(data));
    socket.on('room_error', ({ msg }) => alert('Error de sala: ' + msg));

    socket.on('opponent_update', ({ y, grav, sc }) => {
        if (!state.opponent) {
            // First update — initialize at exact position
            state.opponent = { y, targetY: y, grav, sc };
        } else {
            // Subsequent updates — only move the target; lerp handles visual smoothing
            state.opponent.targetY = y;
            state.opponent.grav = grav;
            state.opponent.sc = sc;
        }
    });

    socket.on('game_over', data => {
        state.isOnline = false;
        _onGameOver?.(data);
    });

    socket.on('opponent_disconnected', () => {
        state.opponent = null;
        _onDisconnected?.();
    });

    socket.on('disconnect', () => {
        state.isOnline = false;
        state.opponent = null;
    });
}

export const Net = {
    get connected() { return !!socket?.connected; },

    connect() {
        if (!SERVER) {
            console.warn('[Net] No VITE_SERVER_URL configured — multiplayer disabled');
            return;
        }
        if (socket) return;
        try {
            socket = io(SERVER, { transports: ['websocket'] });
            setupHandlers();
        } catch (e) {
            console.error('[Net] Socket connection failed:', e);
        }
    },

    disconnect() {
        socket?.disconnect();
        socket = null;
        state.isOnline = false;
        state.opponent = null;
        state.roomCode = null;
    },

    createRoom(songId, charId) {
        if (!socket) this.connect();
        socket.emit('create_room', { songId, charId });
    },

    joinRoom(code, charId) {
        if (!socket) this.connect();
        socket.emit('join_room', { code: code.toUpperCase(), charId });
    },

    sendUpdate() {
        if (!socket?.connected || !state.isOnline) return;
        socket.emit('player_update', { y: state.pl.y, grav: state.pl.grav, sc: state.sc });
    },

    sendGameOver() {
        socket?.emit('game_over', {});
    },

    on(event, fn) {
        if (event === 'room_created') _onRoomCreated = fn;
        else if (event === 'room_ready') _onRoomReady = fn;
        else if (event === 'countdown_start') _onCountdown = fn;
        else if (event === 'game_over') _onGameOver = fn;
        else if (event === 'opponent_disconnected') _onDisconnected = fn;
    },
};
