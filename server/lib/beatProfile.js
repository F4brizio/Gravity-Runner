// Node.js port of Sfx.analyzeBeatProfile() from src/audio.js
// Extracts raw PCM via ffmpeg, then finds peak amplitude per beat window.

import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from 'ffmpeg-static';

ffmpeg.setFfmpegPath(ffmpegPath);

export function analyzeProfile(mp3Path, bpm) {
    return new Promise((resolve, reject) => {
        const chunks = [];

        ffmpeg(mp3Path)
            .audioChannels(1)
            .audioFrequency(44100)
            .format('f32le')
            .pipe()
            .on('data', chunk => chunks.push(chunk))
            .on('end', () => {
                try {
                    const buf = Buffer.concat(chunks);
                    // Each sample is 4 bytes (float32 little-endian)
                    const numSamples = buf.byteLength / 4;
                    const pcm = new Float32Array(numSamples);
                    for (let i = 0; i < numSamples; i++) {
                        pcm[i] = buf.readFloatLE(i * 4);
                    }

                    const sr = 44100;
                    const beatSamples = Math.round(sr * 60 / bpm);
                    const numBeats = Math.ceil(pcm.length / beatSamples);
                    const raw = [];
                    let maxVal = 0;

                    for (let i = 0; i < numBeats; i++) {
                        const s = i * beatSamples;
                        const e = Math.min(s + beatSamples, pcm.length);
                        let peak = 0;
                        for (let j = s; j < e; j++) {
                            const abs = Math.abs(pcm[j]);
                            if (abs > peak) peak = abs;
                        }
                        raw.push(peak);
                        if (peak > maxVal) maxVal = peak;
                    }

                    resolve(maxVal > 0 ? raw.map(r => r / maxVal) : []);
                } catch (err) {
                    reject(err);
                }
            })
            .on('error', reject);
    });
}
