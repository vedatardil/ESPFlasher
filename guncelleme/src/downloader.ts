/**
 * ESP Flasher - Online firmware indirme ve zip çıkarma
 * Geliştirici: Vedat Ardil - www.vedatardil.com.tr
 */

import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import * as https from 'https';
import * as http from 'http';
import { execSync } from 'child_process';

const TEMP_DIR = path.join(os.tmpdir(), 'esp-flasher');

export interface DownloadResult {
    files: { path: string; name: string; address?: string }[];
    isZip: boolean;
}

export const PREDEFINED_SOURCES: { id: string; name: string; url: string; chip: string; address: string }[] = [
    { id: 'micropython-esp32', name: 'MicroPython ESP32', url: 'https://micropython.org/resources/firmware/ESP32_GENERIC-20251209-v1.27.0.bin', chip: 'esp32', address: '0x1000' },
    { id: 'micropython-esp8266', name: 'MicroPython ESP8266', url: 'https://micropython.org/resources/firmware/ESP8266_GENERIC-20251209-v1.27.0.bin', chip: 'esp8266', address: '0x0' },
];

export async function downloadAndExtract(url: string, onProgress?: (msg: string) => void): Promise<DownloadResult> {
    const urlLower = url.toLowerCase();
    const isZip = urlLower.endsWith('.zip');

    if (!fs.existsSync(TEMP_DIR)) {
        fs.mkdirSync(TEMP_DIR, { recursive: true });
    }

    const fileName = path.basename(new URL(url).pathname) || 'firmware' + (isZip ? '.zip' : '.bin');
    const tempFilePath = path.join(TEMP_DIR, Date.now() + '_' + fileName);

    onProgress?.('Bağlanıyor...');
    await downloadFile(url, tempFilePath, onProgress);

    if (isZip) {
        onProgress?.('ZIP dosyası açılıyor...');
        const extractDir = path.join(TEMP_DIR, 'extract_' + Date.now());
        fs.mkdirSync(extractDir, { recursive: true });
        execSync(`unzip -o "${tempFilePath}" -d "${extractDir}"`, { stdio: 'pipe' });
        fs.unlinkSync(tempFilePath);

        const binFiles: { path: string; name: string }[] = [];
        function findBins(dir: string) {
            const entries = fs.readdirSync(dir, { withFileTypes: true });
            for (const e of entries) {
                const full = path.join(dir, e.name);
                if (e.isDirectory()) { findBins(full); }
                else if (e.name.toLowerCase().endsWith('.bin')) {
                    binFiles.push({ path: full, name: e.name });
                }
            }
        }
        findBins(extractDir);
        onProgress?.('Açıldı. ' + binFiles.length + ' .bin dosyası bulundu.');
        return { files: binFiles, isZip: true };
    } else {
        const stat = fs.statSync(tempFilePath);
        onProgress?.('Tamamlandı: ' + formatSize(stat.size));
        return { files: [{ path: tempFilePath, name: fileName }], isZip: false };
    }
}

function formatSize(bytes: number): string {
    if (bytes < 1024) { return bytes + ' B'; }
    if (bytes < 1024 * 1024) { return (bytes / 1024).toFixed(1) + ' KB'; }
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

const CONNECTION_TIMEOUT_MS = 15000;
const ACTIVITY_TIMEOUT_MS = 30000;
const MAX_REDIRECTS = 5;

function downloadFile(url: string, destPath: string, onProgress?: (msg: string) => void, redirectCount: number = 0): Promise<void> {
    if (redirectCount > MAX_REDIRECTS) {
        return Promise.reject(new Error('Çok fazla yönlendirme (>' + MAX_REDIRECTS + '). URL\'yi kontrol edin.'));
    }

    return new Promise((resolve, reject) => {
        let resolved = false;
        const done = (err?: Error) => {
            if (resolved) { return; }
            resolved = true;
            clearAllTimers();
            if (err) { reject(err); } else { resolve(); }
        };

        const urlObj = new URL(url);
        const protocol = urlObj.protocol === 'https:' ? https : http;
        const file = fs.createWriteStream(destPath);
        let received = 0;
        let connectionTimer: NodeJS.Timeout | null = null;
        let activityTimer: NodeJS.Timeout | null = null;
        let req: http.ClientRequest | null = null;

        const clearAllTimers = () => {
            if (connectionTimer) { clearTimeout(connectionTimer); connectionTimer = null; }
            if (activityTimer) { clearTimeout(activityTimer); activityTimer = null; }
        };

        const resetActivityTimer = () => {
            if (activityTimer) { clearTimeout(activityTimer); }
            activityTimer = setTimeout(() => {
                req?.destroy();
                file.close();
                try { if (fs.existsSync(destPath)) { fs.unlinkSync(destPath); } } catch (_) {}
                done(new Error('İndirme durdu (30sn veri gelmedi). İnternet bağlantınızı kontrol edin.'));
            }, ACTIVITY_TIMEOUT_MS);
        };

        connectionTimer = setTimeout(() => {
            req?.destroy();
            file.close();
            try { if (fs.existsSync(destPath)) { fs.unlinkSync(destPath); } } catch (_) {}
            done(new Error('Bağlantı zaman aşımı (15sn). Sunucuya ulaşılamıyor.'));
        }, CONNECTION_TIMEOUT_MS);

        req = protocol.get(url, { headers: { 'User-Agent': 'ESP-Flasher/1.2' } }, (res) => {
            if (connectionTimer) { clearTimeout(connectionTimer); connectionTimer = null; }

            if ((res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 307 || res.statusCode === 308) && res.headers.location) {
                file.close();
                try { fs.unlinkSync(destPath); } catch (_) {}
                res.resume();
                onProgress?.('Yönlendiriliyor...');
                downloadFile(res.headers.location, destPath, onProgress, redirectCount + 1).then(() => done()).catch(e => done(e));
                return;
            }

            if (!res.statusCode || res.statusCode < 200 || res.statusCode >= 300) {
                file.close();
                res.resume();
                try { fs.unlinkSync(destPath); } catch (_) {}
                done(new Error('İndirme hatası: HTTP ' + res.statusCode));
                return;
            }

            const total = parseInt(res.headers['content-length'] || '0', 10);
            let lastProgressTime = 0;

            onProgress?.(total > 0 ? 'İndiriliyor: 0% (0/' + formatSize(total) + ')' : 'İndiriliyor...');
            resetActivityTimer();

            res.on('data', (chunk: Buffer) => {
                received += chunk.length;
                resetActivityTimer();

                const now = Date.now();
                if (now - lastProgressTime >= 300) {
                    lastProgressTime = now;
                    if (total > 0) {
                        const pct = Math.round((received / total) * 100);
                        onProgress?.('İndiriliyor: %' + pct + ' (' + formatSize(received) + '/' + formatSize(total) + ')');
                    } else {
                        onProgress?.('İndiriliyor: ' + formatSize(received));
                    }
                }
            });

            res.pipe(file);

            file.on('finish', () => {
                file.close();
                if (total > 0) {
                    onProgress?.('İndirildi: ' + formatSize(received));
                } else {
                    onProgress?.('İndirildi: ' + formatSize(received));
                }
                done();
            });

            res.on('error', (err) => {
                file.close();
                try { if (fs.existsSync(destPath)) { fs.unlinkSync(destPath); } } catch (_) {}
                done(new Error('İndirme hatası: ' + (err.message || String(err))));
            });
        });

        req.on('error', (err) => {
            file.close();
            try { if (fs.existsSync(destPath)) { fs.unlinkSync(destPath); } } catch (_) {}
            done(new Error('Bağlantı hatası: ' + (err.message || String(err))));
        });
    });
}
