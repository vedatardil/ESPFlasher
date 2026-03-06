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

    onProgress?.('İndiriliyor: ' + url);
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
                if (e.isDirectory()) findBins(full);
                else if (e.name.toLowerCase().endsWith('.bin')) {
                    binFiles.push({ path: full, name: e.name });
                }
            }
        }
        findBins(extractDir);
        onProgress?.('Açıldı. ' + binFiles.length + ' .bin dosyası bulundu.');
        return { files: binFiles, isZip: true };
    } else {
        return { files: [{ path: tempFilePath, name: fileName }], isZip: false };
    }
}

const DOWNLOAD_TIMEOUT_MS = 90000;

function downloadFile(url: string, destPath: string, onProgress?: (msg: string) => void): Promise<void> {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const options = {
            hostname: urlObj.hostname,
            port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
            path: urlObj.pathname + urlObj.search,
            method: 'GET',
            headers: { 'User-Agent': 'ESP-Flasher/1.0' }
        };
        const protocol = url.startsWith('https') ? https : http;
        const file = fs.createWriteStream(destPath);
        let received = 0;
        let timeoutId: NodeJS.Timeout | null = null;

        const clearTimer = () => {
            if (timeoutId) {
                globalThis.clearTimeout(timeoutId);
                timeoutId = null;
            }
        };

        const req = protocol.request(options, (res) => {
            clearTimer();
            if (res.statusCode === 301 || res.statusCode === 302) {
                const redirect = res.headers.location;
                if (redirect) {
                    file.close();
                    try { fs.unlinkSync(destPath); } catch (_) {}
                    downloadFile(redirect, destPath, onProgress).then(resolve).catch(reject);
                    return;
                }
            }
            if (res.statusCode !== 200) {
                file.close();
                try { fs.unlinkSync(destPath); } catch (_) {}
                reject(new Error('İndirme hatası: HTTP ' + res.statusCode));
                return;
            }
            const total = parseInt(res.headers['content-length'] || '0', 10);
            res.on('data', (chunk) => {
                received += chunk.length;
                if (total > 0 && onProgress && received % 50000 < chunk.length) {
                    const pct = Math.round((received / total) * 100);
                    onProgress(`İndiriliyor: %${pct}`);
                }
            });
            res.pipe(file);
            file.on('finish', () => {
                file.close();
                resolve();
            });
        });

        timeoutId = setTimeout(() => {
            req.destroy();
            file.close();
            try { fs.unlinkSync(destPath); } catch (_) {}
            reject(new Error('İndirme zaman aşımı (90 sn). İnternet bağlantınızı kontrol edin.'));
        }, DOWNLOAD_TIMEOUT_MS);

        req.on('error', (err) => {
            clearTimer();
            file.close();
            try { if (fs.existsSync(destPath)) fs.unlinkSync(destPath); } catch (_) {}
            reject(new Error('İndirme hatası: ' + (err.message || String(err))));
        });
        req.end();
    });
}
