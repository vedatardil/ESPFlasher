"use strict";
/**
 * ESP Flasher - esptool entegrasyonu
 * Geliştirici: Vedat Ardil - www.vedatardil.com.tr
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.Flasher = void 0;
const vscode = __importStar(require("vscode"));
const os = __importStar(require("os"));
const fs = __importStar(require("fs"));
const child_process_1 = require("child_process");
class Flasher {
    async getSerialPorts() {
        return this.tryPyserialWithFallback();
    }
    async tryPyserialWithFallback() {
        const config = vscode.workspace.getConfiguration('espFlasher');
        const pythonPath = config.get('pythonPath', 'python3');
        return new Promise((resolve) => {
            const proc = (0, child_process_1.spawn)(pythonPath, ['-m', 'serial.tools.list_ports', '-q'], {
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
                }
                else {
                    resolve(this.getSerialPortsFallback());
                }
            });
            proc.on('error', () => {
                clearTimeout(timer);
                resolve(this.getSerialPortsFallback());
            });
        });
    }
    getSerialPortsFallback() {
        const platform = os.platform();
        const ports = [];
        if (platform === 'darwin') {
            const excludePatterns = ['bluetooth', 'debug-console'];
            const tryReadDir = () => {
                try {
                    const devices = fs.readdirSync('/dev');
                    const found = [];
                    for (const d of devices) {
                        if (!d.startsWith('cu.')) {
                            continue;
                        }
                        const lower = d.toLowerCase();
                        if (excludePatterns.some(p => lower.includes(p))) {
                            continue;
                        }
                        const fullPath = '/dev/' + d;
                        try {
                            if (fs.existsSync(fullPath)) {
                                found.push(fullPath);
                            }
                        }
                        catch (_) { }
                    }
                    return found.sort();
                }
                catch (_) {
                    return [];
                }
            };
            const trySystemProfiler = () => {
                try {
                    const out = (0, child_process_1.execSync)('system_profiler SPUSBDataType 2>/dev/null | grep -i "serial\\|vendor\\|product" || true', { encoding: 'utf8', timeout: 5000, shell: '/bin/sh' });
                    if (out.trim()) {
                        const devs = fs.readdirSync('/dev');
                        return devs
                            .filter(d => d.startsWith('cu.') && !excludePatterns.some(p => d.toLowerCase().includes(p)))
                            .map(d => '/dev/' + d);
                    }
                    return [];
                }
                catch (_) {
                    return [];
                }
            };
            const dirPorts = tryReadDir();
            if (dirPorts.length === 0) {
                const profPorts = trySystemProfiler();
                ports.push(...profPorts);
            }
            else {
                ports.push(...dirPorts);
            }
        }
        else if (platform === 'win32') {
            try {
                const out = (0, child_process_1.execSync)('wmic path Win32_SerialPort get DeviceID 2>nul || echo ""', { encoding: 'utf8', timeout: 5000, shell: 'cmd.exe' });
                const wmicPorts = out.split('\n')
                    .map(l => l.trim())
                    .filter(l => /^COM\d+$/i.test(l));
                if (wmicPorts.length > 0) {
                    ports.push(...wmicPorts);
                }
            }
            catch (_) { }
            if (ports.length === 0) {
                for (let i = 1; i <= 20; i++) {
                    ports.push(`COM${i}`);
                }
            }
        }
        else {
            try {
                const devices = fs.readdirSync('/dev');
                for (const d of devices) {
                    if (d.startsWith('ttyUSB') || d.startsWith('ttyACM') || d.startsWith('ttyS')) {
                        const fullPath = '/dev/' + d;
                        try {
                            if (fs.existsSync(fullPath)) {
                                ports.push(fullPath);
                            }
                        }
                        catch (_) { }
                    }
                }
            }
            catch (_) {
                for (let i = 0; i <= 10; i++) {
                    const usb = `/dev/ttyUSB${i}`;
                    const acm = `/dev/ttyACM${i}`;
                    try {
                        if (fs.existsSync(usb))
                            ports.push(usb);
                    }
                    catch (_e) { }
                    try {
                        if (fs.existsSync(acm))
                            ports.push(acm);
                    }
                    catch (_e) { }
                }
            }
        }
        return Promise.resolve(ports);
    }
    async flash(config, onOutput) {
        const espConfig = vscode.workspace.getConfiguration('espFlasher');
        const pythonPath = espConfig.get('pythonPath', 'python3');
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
        }
        else {
            args.push('--flash_size', 'detect');
        }
        for (const f of config.files) {
            args.push(f.address, f.path);
        }
        return new Promise((resolve, reject) => {
            const proc = (0, child_process_1.spawn)(pythonPath, args, {
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
                }
                else {
                    reject(new Error(stderr || `esptool çıkış kodu: ${code}`));
                }
            });
            proc.on('error', (err) => {
                reject(new Error(`esptool başlatılamadı: ${err.message}. pip install esptool pyserial çalıştırın.`));
            });
        });
    }
}
exports.Flasher = Flasher;
//# sourceMappingURL=flasher.js.map