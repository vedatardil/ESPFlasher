/**
 * ESP Flasher - esptool entegrasyonu
 * Geliştirici: Vedat Ardil - www.vedatardil.com.tr
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import { spawn, execSync } from 'child_process';
import { FlashConfig } from './panel';

export class Flasher {
    async getSerialPorts(): Promise<string[]> {
        if (os.platform() === 'darwin') {
            return this.getSerialPortsFallback();
        }
        return this.tryPyserialWithFallback();
    }

    private async tryPyserialWithFallback(): Promise<string[]> {
        const config = vscode.workspace.getConfiguration('espFlasher');
        const pythonPath = config.get<string>('pythonPath', 'python3');
        return new Promise((resolve) => {
            const proc = spawn(pythonPath, ['-m', 'serial.tools.list_ports', '-q'], {
                stdio: ['ignore', 'pipe', 'pipe']
            });
            let output = '';
            proc.stdout?.on('data', (data) => { output += data.toString(); });
            proc.stderr?.on('data', (data) => { output += data.toString(); });
            const timer = setTimeout(() => {
                proc.kill('SIGTERM');
                resolve(this.getSerialPortsFallback());
            }, 2000);
            proc.on('close', (code) => {
                clearTimeout(timer);
                if (code === 0 && output.trim()) {
                    const ports = output.trim().split('\n')
                        .map(line => (line.split(/\t/)[0] || line).trim())
                        .filter(Boolean);
                    resolve(ports.length > 0 ? ports : this.getSerialPortsFallback());
                } else {
                    resolve(this.getSerialPortsFallback());
                }
            });
            proc.on('error', () => {
                clearTimeout(timer);
                resolve(this.getSerialPortsFallback());
            });
        });
    }

    private getSerialPortsFallback(): Promise<string[]> {
        const platform = os.platform();
        const ports: string[] = [];

        if (platform === 'darwin') {
            const tryLs = (): string[] => {
                try {
                    const out = execSync('ls /dev 2>/dev/null | grep -E "^(cu|tty)\\.(usb|SLAB|wch|usbmodem|serial)"', { encoding: 'utf8', timeout: 3000, shell: '/bin/sh' });
                    return out.trim().split('\n')
                        .map(p => '/dev/' + p.trim())
                        .filter(p => p.length > 5);
                } catch (_) { return []; }
            };
            const tryReadDir = (): string[] => {
                try {
                    const devPath = '/dev';
                    const devices = fs.readdirSync(devPath);
                    const espPatterns = ['cu.usb', 'cu.SLAB', 'cu.wchusb', 'cu.usbmodem', 'cu.serial', 'tty.usb', 'tty.SLAB', 'tty.wchusb', 'tty.usbmodem', 'tty.serial'];
                    const found: string[] = [];
                    for (const d of devices) {
                        if (espPatterns.some(p => d.startsWith(p))) {
                            const fullPath = path.join(devPath, d);
                            try { if (fs.existsSync(fullPath)) found.push(fullPath); } catch (_) {}
                        }
                    }
                    return found.sort();
                } catch (_) { return []; }
            };
            const tryBroadMatch = (): string[] => {
                try {
                    const devPath = '/dev';
                    const devices = fs.readdirSync(devPath);
                    const found: string[] = [];
                    for (const d of devices) {
                        const lower = d.toLowerCase();
                        const isCu = d.startsWith('cu.') && !lower.includes('bluetooth');
                        const isTty = d.startsWith('tty.') && !lower.includes('bluetooth');
                        if ((isCu || isTty) && (lower.includes('usb') || lower.includes('serial') || lower.includes('slab') || lower.includes('wch') || lower.includes('usbmodem'))) {
                            const fullPath = path.join(devPath, d);
                            try { if (fs.existsSync(fullPath)) found.push(fullPath); } catch (_) {}
                        }
                    }
                    return found.sort();
                } catch (_) { return []; }
            };
            const lsPorts = tryLs();
            const dirPorts = tryReadDir();
            const broadPorts = tryBroadMatch();
            const combined = [...new Set([...lsPorts, ...dirPorts, ...broadPorts])].sort();
            ports.push(...(combined.length > 0 ? combined : broadPorts.length > 0 ? broadPorts : dirPorts.length > 0 ? dirPorts : lsPorts));
        } else if (platform === 'win32') {
            for (let i = 1; i <= 20; i++) {
                ports.push(`COM${i}`);
            }
        } else {
            for (let i = 0; i <= 10; i++) {
                const usb = `/dev/ttyUSB${i}`;
                const acm = `/dev/ttyACM${i}`;
                try { if (fs.existsSync(usb)) ports.push(usb); } catch (_) {}
                try { if (fs.existsSync(acm)) ports.push(acm); } catch (_) {}
            }
        }

        return Promise.resolve(ports);
    }

    async flash(config: FlashConfig, onOutput: (data: string) => void): Promise<void> {
        const espConfig = vscode.workspace.getConfiguration('espFlasher');
        const pythonPath = espConfig.get<string>('pythonPath', 'python3');

        const args = [
            '-m', 'esptool',
            '--chip', config.chip,
            '-p', config.port,
            '-b', String(config.baudRate),
            '--before', 'default_reset',
            '--after', 'hard_reset',
            'write_flash',
            '--flash_mode', config.flashMode,
            '--flash_freq', config.flashFreq
        ];

        if (config.flashSize !== 'detect') {
            args.push('--flash_size', config.flashSize);
        } else {
            args.push('--flash_size', 'detect');
        }

        for (const f of config.files) {
            args.push(f.address, f.path);
        }

        return new Promise((resolve, reject) => {
            const proc = spawn(pythonPath, args, {
                stdio: ['ignore', 'pipe', 'pipe']
            });

            let stderr = '';
            proc.stdout?.on('data', (data) => {
                onOutput(data.toString());
            });
            proc.stderr?.on('data', (data) => {
                const str = data.toString();
                stderr += str;
                onOutput(str);
            });

            proc.on('close', (code) => {
                if (code === 0) {
                    resolve();
                } else {
                    reject(new Error(stderr || `esptool çıkış kodu: ${code}`));
                }
            });

            proc.on('error', (err) => {
                reject(new Error(`esptool başlatılamadı: ${err.message}. pip install esptool pyserial çalıştırın.`));
            });
        });
    }
}
