import { Router } from 'express';
import multer from 'multer';
import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { optimize, getConfig, saveConfig, getDuration } from '../lib/optimizer.js';
import { analyzeProfile } from '../lib/beatProfile.js';
import { listRooms } from '../lib/rooms.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SONGS_DIR = path.join(__dirname, '../data/songs');
const META_DIR = path.join(__dirname, '../data/meta');
const UPLOAD_DIR = path.join(__dirname, '../data/uploads');

// Ensure dirs exist
for (const d of [SONGS_DIR, META_DIR, UPLOAD_DIR]) {
    fs.mkdirSync(d, { recursive: true });
}

const upload = multer({ dest: UPLOAD_DIR });

function authMiddleware(req, res, next) {
    const token = (req.headers.authorization || '').replace('Bearer ', '').trim();
    if (!process.env.ADMIN_TOKEN || token !== process.env.ADMIN_TOKEN) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
}

export const adminRoutes = Router();
adminRoutes.use(authMiddleware);

// POST /api/admin/songs — upload + optimize + analyze
adminRoutes.post('/songs', upload.single('file'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const { name, bpm } = req.body;
    if (!name || !bpm) return res.status(400).json({ error: 'name and bpm are required' });

    const id = Date.now().toString();
    const rawPath = req.file.path;
    const outPath = path.join(SONGS_DIR, `${id}.mp3`);

    try {
        const config = await getConfig();
        await optimize(rawPath, outPath, config);
        await fsp.unlink(rawPath).catch(() => {});

        const duration = await getDuration(outPath);
        const beatProfile = await analyzeProfile(outPath, Number(bpm));
        const stat = fs.statSync(outPath);

        const meta = { id, name, bpm: Number(bpm), duration, size: stat.size, beatProfile, createdAt: Date.now() };
        await fsp.writeFile(path.join(META_DIR, `${id}.json`), JSON.stringify(meta, null, 2));

        res.json({ id, name, bpm: meta.bpm, duration, size: meta.size });
    } catch (err) {
        await fsp.unlink(rawPath).catch(() => {});
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/admin/songs/:id
adminRoutes.delete('/songs/:id', async (req, res) => {
    const { id } = req.params;
    await fsp.unlink(path.join(SONGS_DIR, `${id}.mp3`)).catch(() => {});
    await fsp.unlink(path.join(META_DIR, `${id}.json`)).catch(() => {});
    res.json({ ok: true });
});

// PATCH /api/admin/config — update optimizer config
adminRoutes.patch('/config', async (req, res) => {
    try {
        const current = await getConfig();
        const updated = { ...current, ...req.body };
        await saveConfig(updated);
        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/admin/config
adminRoutes.get('/config', async (_req, res) => {
    res.json(await getConfig());
});

// GET /api/admin/rooms — list active rooms
adminRoutes.get('/rooms', (_req, res) => {
    res.json(listRooms());
});

// GET /api/admin/songs — list songs with full meta (size etc.)
adminRoutes.get('/songs', async (_req, res) => {
    try {
        const files = await fsp.readdir(META_DIR).catch(() => []);
        const songs = [];
        for (const f of files) {
            if (!f.endsWith('.json') || f === 'config.json') continue;
            try {
                const meta = JSON.parse(await fsp.readFile(path.join(META_DIR, f), 'utf8'));
                songs.push(meta);
            } catch { /* skip */ }
        }
        res.json(songs);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/admin/songs/:id/reprocess — re-optimize + re-analyze with current config
adminRoutes.get('/songs/:id/reprocess', async (req, res) => {
    const { id } = req.params;
    const mp3Path = path.join(SONGS_DIR, `${id}.mp3`);
    const metaPath = path.join(META_DIR, `${id}.json`);

    if (!fs.existsSync(mp3Path) || !fs.existsSync(metaPath)) {
        return res.status(404).json({ error: 'Song not found' });
    }

    try {
        const meta = JSON.parse(await fsp.readFile(metaPath, 'utf8'));
        const config = await getConfig();
        const tmpPath = mp3Path + '.tmp';

        await optimize(mp3Path, tmpPath, config);
        await fsp.rename(tmpPath, mp3Path);

        const duration = await getDuration(mp3Path);
        const beatProfile = await analyzeProfile(mp3Path, meta.bpm);
        const stat = fs.statSync(mp3Path);

        meta.duration = duration;
        meta.beatProfile = beatProfile;
        meta.size = stat.size;
        await fsp.writeFile(metaPath, JSON.stringify(meta, null, 2));

        res.json({ id, size: meta.size, duration });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
