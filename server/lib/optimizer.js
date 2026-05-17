import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from 'ffmpeg-static';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

ffmpeg.setFfmpegPath(ffmpegPath);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONFIG_PATH = path.join(__dirname, '../data/meta/config.json');

const DEFAULT_CONFIG = {
    bitrate: 128,
    normalize: true,
    targetLUFS: -14,
    monoDownmix: false,
};

export async function getConfig() {
    try {
        const raw = await fs.readFile(CONFIG_PATH, 'utf8');
        return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
    } catch {
        return { ...DEFAULT_CONFIG };
    }
}

export async function saveConfig(cfg) {
    await fs.writeFile(CONFIG_PATH, JSON.stringify(cfg, null, 2));
}

export function optimize(inputPath, outputPath, config = DEFAULT_CONFIG) {
    return new Promise((resolve, reject) => {
        const filters = [];
        if (config.monoDownmix) filters.push('pan=mono|c0=0.5*c0+0.5*c1');
        if (config.normalize) {
            filters.push(`loudnorm=I=${config.targetLUFS}:LRA=11:TP=-1.5`);
        }

        let cmd = ffmpeg(inputPath)
            .outputOptions([
                `-b:a ${config.bitrate}k`,
                '-map_metadata -1', // strip all metadata
                '-id3v2_version 3',
            ])
            .audioCodec('libmp3lame');

        if (filters.length > 0) cmd = cmd.audioFilters(filters);

        cmd.save(outputPath)
            .on('end', resolve)
            .on('error', reject);
    });
}

export function getDuration(filePath) {
    return new Promise((resolve, reject) => {
        ffmpeg.ffprobe(filePath, (err, meta) => {
            if (err) reject(err);
            else resolve(Math.round(meta.format.duration || 0));
        });
    });
}
