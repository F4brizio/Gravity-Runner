import { Router } from 'express';
import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SONGS_DIR = path.join(__dirname, '../data/songs');
const META_DIR = path.join(__dirname, '../data/meta');

export const songRoutes = Router();

// GET /api/songs — list all songs
songRoutes.get('/', async (_req, res) => {
    try {
        const files = await fsp.readdir(META_DIR).catch(() => []);
        const songs = [];
        for (const f of files) {
            if (!f.endsWith('.json') || f === 'config.json') continue;
            try {
                const meta = JSON.parse(await fsp.readFile(path.join(META_DIR, f), 'utf8'));
                songs.push({
                    id: meta.id,
                    name: meta.name,
                    bpm: meta.bpm,
                    duration: meta.duration,
                });
            } catch { /* skip corrupt meta */ }
        }
        res.json(songs);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/songs/:id/stream — range-aware MP3 streaming
songRoutes.get('/:id/stream', (req, res) => {
    const filePath = path.join(SONGS_DIR, `${req.params.id}.mp3`);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Not found' });

    const stat = fs.statSync(filePath);
    const total = stat.size;
    const range = req.headers.range;

    if (range) {
        const [startStr, endStr] = range.replace(/bytes=/, '').split('-');
        const start = parseInt(startStr, 10);
        const end = endStr ? parseInt(endStr, 10) : total - 1;
        const chunkSize = end - start + 1;
        res.writeHead(206, {
            'Content-Range': `bytes ${start}-${end}/${total}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': chunkSize,
            'Content-Type': 'audio/mpeg',
        });
        fs.createReadStream(filePath, { start, end }).pipe(res);
    } else {
        res.writeHead(200, {
            'Content-Length': total,
            'Content-Type': 'audio/mpeg',
            'Accept-Ranges': 'bytes',
        });
        fs.createReadStream(filePath).pipe(res);
    }
});

// GET /api/songs/:id/profile — beat profile + metadata
songRoutes.get('/:id/profile', async (req, res) => {
    const metaPath = path.join(META_DIR, `${req.params.id}.json`);
    try {
        const meta = JSON.parse(await fsp.readFile(metaPath, 'utf8'));
        res.json({ beatProfile: meta.beatProfile || [], bpm: meta.bpm, duration: meta.duration });
    } catch {
        res.status(404).json({ error: 'Not found' });
    }
});
