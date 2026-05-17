// In-memory room manager + Socket.io event handlers

const rooms = new Map(); // code → room object
const socketToRoom = new Map(); // socketId → code

function randomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code;
    do { code = Array.from({ length: 4 }, () => chars[Math.random() * chars.length | 0]).join(''); }
    while (rooms.has(code));
    return code;
}

export function createRoom(songId, seed, hostSocketId) {
    const code = randomCode();
    rooms.set(code, { code, songId, seed, host: hostSocketId, guest: null, startedAt: null });
    socketToRoom.set(hostSocketId, code);
    return code;
}

export function joinRoom(code, guestSocketId) {
    const room = rooms.get(code);
    if (!room || room.guest) return null;
    room.guest = guestSocketId;
    socketToRoom.set(guestSocketId, code);
    return room;
}

export function getRoom(code) {
    return rooms.get(code) || null;
}

export function removeSocket(socketId) {
    const code = socketToRoom.get(socketId);
    if (!code) return null;
    socketToRoom.delete(socketId);
    const room = rooms.get(code);
    if (!room) return null;
    rooms.delete(code);
    // Return the other player's socket id so the caller can notify them
    return room.host === socketId ? room.guest : room.host;
}

export function listRooms() {
    return Array.from(rooms.values()).map(r => ({
        code: r.code,
        songId: r.songId,
        host: r.host,
        guest: r.guest,
        startedAt: r.startedAt,
        elapsed: r.startedAt ? Math.round((Date.now() - r.startedAt) / 1000) : null,
    }));
}

export function setupSockets(io) {
    io.on('connection', socket => {
        socket.on('create_room', ({ songId, charId }) => {
            const seed = Math.random() * 0xFFFFFFFF | 0;
            const code = createRoom(songId, seed, socket.id);
            socket.join(code);
            socket.emit('room_created', { code, songId, seed, charId });
        });

        socket.on('join_room', ({ code, charId }) => {
            const room = joinRoom(code, socket.id);
            if (!room) { socket.emit('room_error', { msg: 'Sala no encontrada o llena' }); return; }
            socket.join(code);

            // Fetch song meta to send back to both players
            io.to(code).emit('room_ready', {
                seed: room.seed,
                song: { id: room.songId },
                chars: { host: charId, guest: charId }, // each player uses their own char
            });

            // Countdown: start audio 3 seconds from now (server clock)
            const audioStartAt = Date.now() + 3000;
            room.startedAt = audioStartAt;
            setTimeout(() => {
                io.to(code).emit('countdown_start', { audioStartAt });
            }, 100); // slight delay to ensure both clients receive room_ready first
        });

        socket.on('player_update', ({ y, grav, sc }) => {
            const code = socketToRoom.get(socket.id);
            if (!code) return;
            const room = rooms.get(code);
            if (!room) return;
            const rival = room.host === socket.id ? room.guest : room.host;
            if (rival) socket.to(rival).emit('opponent_update', { y, grav, sc });
        });

        socket.on('game_over', () => {
            const code = socketToRoom.get(socket.id);
            if (!code) return;
            const room = rooms.get(code);
            if (!room) return;
            io.to(code).emit('game_over', { winner: socket.id });
            rooms.delete(code);
            if (room.host) socketToRoom.delete(room.host);
            if (room.guest) socketToRoom.delete(room.guest);
        });

        socket.on('disconnect', () => {
            const rivalId = removeSocket(socket.id);
            if (rivalId) {
                io.to(rivalId).emit('opponent_disconnected', {});
            }
        });
    });
}
