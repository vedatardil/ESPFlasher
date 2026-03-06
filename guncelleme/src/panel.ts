/**
 * ESP Flasher Panel - Webview UI
 * Geliştirici: Vedat Ardil - www.vedatardil.com.tr
 */

import * as vscode from 'vscode';
import { Flasher } from './flasher';
import { downloadAndExtract } from './downloader';

export class EspFlasherPanel {
    public static currentPanel: EspFlasherPanel | undefined;
    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private _disposables: vscode.Disposable[] = [];
    private _flasher: Flasher;

    public static createOrShow(extensionUri: vscode.Uri): EspFlasherPanel {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        if (EspFlasherPanel.currentPanel) {
            EspFlasherPanel.currentPanel._panel.reveal(column);
            return EspFlasherPanel.currentPanel;
        }

        const panel = vscode.window.createWebviewPanel(
            'espFlasher',
            'ESP Flasher - Firmware Yükle',
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                localResourceRoots: [extensionUri],
                retainContextWhenHidden: true
            }
        );

        EspFlasherPanel.currentPanel = new EspFlasherPanel(panel, extensionUri);
        return EspFlasherPanel.currentPanel;
    }

    public constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
        this._panel = panel;
        this._extensionUri = extensionUri;
        this._flasher = new Flasher();

        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
        const config = vscode.workspace.getConfiguration('espFlasher');
        const defaultChip = config.get<string>('defaultChip', 'esp32');
        const defaultBaud = config.get<number>('defaultBaudRate', 460800);

        const updateHtml = (ports: string[] | null) => {
            this._panel.webview.html = this._getHtmlForWebview(this._panel.webview, defaultChip, defaultBaud, ports);
        };
        updateHtml(null);
        this._flasher.getSerialPorts().then(ports => updateHtml(ports || [])).catch(() => updateHtml([]));

        this._panel.webview.onDidReceiveMessage(
            async (message) => {
                switch (message.command) {
                    case 'getSerialPorts':
                        try {
                            const ports = await this._flasher.getSerialPorts();
                            this._panel.webview.postMessage({
                                command: 'updatePorts',
                                ports: ports || []
                            });
                        } catch (_) {
                            this._panel.webview.postMessage({
                                command: 'updatePorts',
                                ports: []
                            });
                        }
                        break;
                    case 'flash':
                        await this._handleFlash(message.config);
                        break;
                    case 'browseFile':
                        const uris = await vscode.window.showOpenDialog({
                            canSelectMany: false,
                            openLabel: 'Firmware Seç',
                            filters: { 'Binary': ['bin'], 'Tüm Dosyalar': ['*'] }
                        });
                        if (uris && uris.length > 0) {
                            this._panel.webview.postMessage({
                                command: 'fileSelected',
                                itemIndex: message.itemIndex,
                                path: uris[0].fsPath
                            });
                        }
                        break;
                    case 'downloadFirmware':
                        {
                            const dlUrl = message.url;
                            const dlIdx = message.itemIndex;
                            vscode.window.showInformationMessage('ESP Flasher: İndirme başlatılıyor... URL: ' + (dlUrl || 'BOŞ'));
                            const ch = vscode.window.createOutputChannel('ESP Flasher Download');
                            ch.show(true);
                            ch.clear();
                            ch.appendLine('=== ESP Flasher İndirme ===');
                            ch.appendLine('URL: ' + dlUrl);
                            ch.appendLine('itemIndex: ' + dlIdx);
                            ch.appendLine('Zaman: ' + new Date().toLocaleString());
                            ch.appendLine('---');
                            const sendProgress = (msg: string) => {
                                ch.appendLine('[İlerleme] ' + msg);
                                this._panel.webview.postMessage({ command: 'downloadProgress', message: msg });
                            };
                            try {
                                sendProgress('Başlatılıyor...');
                                const result = await downloadAndExtract(dlUrl, sendProgress);
                                ch.appendLine('[ESP Flasher] İndirme tamamlandı! Dosya sayısı: ' + result.files.length);
                                if (result.files.length > 0) {
                                    ch.appendLine('[ESP Flasher] Dosya: ' + result.files[0].path);
                                }
                                this._panel.webview.postMessage({
                                    command: 'downloadComplete',
                                    success: true,
                                    files: result.files,
                                    itemIndex: dlIdx
                                });
                                if (result.files.length > 0) {
                                    vscode.window.showInformationMessage('Firmware indirildi: ' + result.files[0].path);
                                }
                            } catch (err) {
                                const errMsg = err instanceof Error ? err.message : String(err);
                                ch.appendLine('[ESP Flasher] HATA: ' + errMsg);
                                this._panel.webview.postMessage({
                                    command: 'downloadComplete',
                                    success: false,
                                    error: errMsg,
                                    itemIndex: dlIdx
                                });
                                vscode.window.showErrorMessage('ESP Flasher indirme hatası: ' + errMsg);
                            }
                        }
                        break;
                    case 'pickFromList':
                        const pickItems: vscode.QuickPickItem[] = message.names.map((n: string) => ({ label: n }));
                        const picked = await vscode.window.showQuickPick(pickItems, {
                            placeHolder: 'Firmware dosyası seçin'
                        });
                        if (picked) {
                            const idx = message.names.indexOf((picked as vscode.QuickPickItem).label);
                            if (idx >= 0) {
                                this._panel.webview.postMessage({
                                    command: 'pickedFile',
                                    itemIndex: message.itemIndex,
                                    path: message.paths[idx]
                                });
                            }
                        }
                        break;
                }
            },
            null,
            this._disposables
        );
    }

    public reveal() {
        this._panel.reveal();
    }

    public onDidDispose(callback: () => void) {
        this._panel.onDidDispose(callback);
    }

    private async _handleFlash(config: FlashConfig) {
        const outputChannel = vscode.window.createOutputChannel('ESP Flasher');
        outputChannel.show();
        outputChannel.clear();

        try {
            await this._flasher.flash(config, (data) => {
                outputChannel.append(data);
            });
            this._panel.webview.postMessage({ command: 'flashComplete', success: true });
            vscode.window.showInformationMessage('ESP Flasher: Firmware başarıyla yüklendi!');
        } catch (error) {
            let errMsg = error instanceof Error ? error.message : String(error);
            if (errMsg.includes('Resource busy') || errMsg.includes('Errno 16') || errMsg.includes('could not open port')) {
                errMsg = 'Seri port meşgul! Serial Monitor, Arduino IDE, PlatformIO veya port kullanan diğer uygulamaları kapatıp tekrar deneyin.';
            }
            this._panel.webview.postMessage({ command: 'flashComplete', success: false, error: errMsg });
            vscode.window.showErrorMessage(`ESP Flasher: ${errMsg}`);
        }
    }

    private _getNonce(): string {
        let text = '';
        const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        for (let i = 0; i < 32; i++) {
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }
        return text;
    }

    private _getHtmlForWebview(webview: vscode.Webview, defaultChip: string, defaultBaud: number, ports: string[] | null = null): string {
        const nonce = this._getNonce();
        let portOpts: string;
        let portHelpHtml = '';
        if (ports === null) {
            portOpts = '<option value="">Yükleniyor...</option>';
        } else if (ports.length === 0) {
            portOpts = '<option value="">Port bulunamadı - aşağıya manuel yazın veya Portları Yenile</option>';
            portHelpHtml = `<div style="background:var(--vscode-inputValidation-infoBackground,#1e3a5f);border:1px solid var(--vscode-inputValidation-infoBorder,#007acc);padding:10px 12px;border-radius:4px;font-size:12px;margin-top:8px;">
                <strong>Port bulunamadı - olası nedenler:</strong><br>
                <ul style="margin:6px 0 0 16px;padding:0;">
                <li>ESP cihazı USB kablosuyla bağlı olmayabilir</li>
                <li>USB kablosu sadece şarj kablosu olabilir (veri destekli kablo kullanın)</li>
                <li>USB-Seri sürücü yüklü olmayabilir:
                    <ul style="margin:2px 0 0 16px;">
                    <li><strong>CH340/CH341:</strong> <a href="https://www.wch.cn/downloads/CH34XSER_MAC_ZIP.html" style="color:var(--vscode-textLink-foreground);">WCH CH34x Sürücü</a></li>
                    <li><strong>CP2102/CP2104:</strong> <a href="https://www.silabs.com/developers/usb-to-uart-bridge-vcp-drivers" style="color:var(--vscode-textLink-foreground);">Silicon Labs CP210x Sürücü</a></li>
                    </ul>
                </li>
                <li>Sürücü yükledikten sonra bilgisayarı yeniden başlatın</li>
                <li>Terminal'de <code style="background:var(--vscode-textCodeBlock-background);padding:1px 4px;border-radius:2px;">ls /dev/cu.*</code> komutuyla portları kontrol edin</li>
                </ul>
            </div>`;
        } else {
            portOpts = '<option value="">Port seçin...</option>' + ports.map(p => '<option value="' + String(p).replace(/&/g,'&amp;').replace(/"/g,'&quot;') + '">' + p + '</option>').join('');
        }
        return `<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}'; img-src ${webview.cspSource} https:;">
    <title>ESP Flasher</title>
    <style>
        * { box-sizing: border-box; }
        body {
            font-family: var(--vscode-font-family);
            font-size: 13px;
            color: var(--vscode-foreground);
            padding: 16px;
            margin: 0;
        }
        h2 {
            margin-top: 0;
            color: var(--vscode-editor-foreground);
            border-bottom: 1px solid var(--vscode-widget-border);
            padding-bottom: 8px;
        }
        .form-group {
            margin-bottom: 16px;
        }
        label {
            display: block;
            margin-bottom: 4px;
            font-weight: 500;
        }
        select, input[type="text"], input[type="number"] {
            width: 100%;
            padding: 8px 12px;
            background: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border: 1px solid var(--vscode-input-border);
            border-radius: 4px;
        }
        select:focus, input:focus {
            outline: 1px solid var(--vscode-focusBorder);
        }
        .btn {
            padding: 10px 20px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-weight: 500;
        }
        .btn-primary {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
        }
        .btn-primary:hover {
            background: var(--vscode-button-hoverBackground);
        }
        .btn-primary:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
        .btn-secondary {
            background: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
        }
        .btn-secondary:hover {
            background: var(--vscode-button-secondaryHoverBackground);
        }
        .firmware-list {
            border: 1px solid var(--vscode-input-border);
            border-radius: 4px;
            padding: 8px;
            max-height: 200px;
            overflow-y: auto;
        }
        .firmware-item {
            display: flex;
            gap: 8px;
            margin-bottom: 8px;
            align-items: center;
        }
        .firmware-item input[type="text"] { flex: 1; }
        .firmware-item input[type="number"] { width: 100px; }
        .remove-btn {
            background: var(--vscode-errorForeground);
            color: white;
            border: none;
            padding: 4px 8px;
            border-radius: 4px;
            cursor: pointer;
        }
        .add-btn {
            margin-top: 8px;
        }
        .mode-selector {
            margin-bottom: 12px;
            display: flex;
            gap: 20px;
        }
        .mode-option {
            display: flex;
            align-items: center;
            gap: 6px;
            cursor: pointer;
        }
        .mode-option input { width: auto; }
        .file-actions {
            display: flex;
            gap: 8px;
            align-items: center;
            flex-wrap: wrap;
        }
        .online-actions {
            display: flex;
            gap: 8px;
            align-items: center;
            flex-wrap: wrap;
        }
        .online-actions select { width: 180px; }
        .online-actions input { width: 220px; }
        .mode-offline .online-actions { display: none !important; }
        .mode-offline .file-browse { display: inline-block !important; }
        .mode-online .file-browse { display: none !important; }
        .mode-online .online-actions { display: flex !important; flex-wrap: wrap; gap: 8px; }
        .download-status {
            font-size: 12px;
            color: var(--vscode-charts-blue, #3794ff);
            font-weight: 500;
            min-width: 180px;
            white-space: nowrap;
        }
        .download-status.done {
            color: var(--vscode-charts-green, #89d185);
        }
        .download-status.error {
            color: var(--vscode-errorForeground, #f48771);
        }
        .online-hint {
            font-size: 11px;
            color: var(--vscode-descriptionForeground);
            width: 100%;
            margin-top: 4px;
        }
        .port-warning {
            background: var(--vscode-inputValidation-warningBackground);
            border: 1px solid var(--vscode-inputValidation-warningBorder);
            padding: 10px 12px;
            border-radius: 4px;
            font-size: 12px;
        }
        .warning-icon { margin-right: 6px; }
        .footer {
            margin-top: 24px;
            padding-top: 16px;
            border-top: 1px solid var(--vscode-widget-border);
            font-size: 11px;
            color: var(--vscode-descriptionForeground);
        }
        .footer a {
            color: var(--vscode-textLink-foreground);
            text-decoration: none;
        }
        .footer a:hover {
            text-decoration: underline;
        }
    </style>
</head>
<body>
    <h2>ESP32 / ESP8266 Firmware Yükleme</h2>
    
    <div class="form-group">
        <label>Seri Port</label>
        <select id="serialPort">${portOpts}</select>
        <div class="manual-port" style="margin-top: 8px;">
            <label><strong>Port bulunamazsa manuel girin:</strong></label>
            <input type="text" id="manualPort" placeholder="Örn: /dev/cu.usbserial-11330 veya COM3 (Terminal: ls /dev/cu.usb*)">
        </div>
        <button class="btn btn-secondary" id="refreshPorts" style="margin-top: 8px;">Portları Yenile</button>
        ${portHelpHtml}
    </div>

    <div class="form-group">
        <label>Chip Tipi</label>
        <select id="chipType">
            <option value="esp32">ESP32</option>
            <option value="esp32s2">ESP32-S2</option>
            <option value="esp32s3">ESP32-S3</option>
            <option value="esp32c2">ESP32-C2</option>
            <option value="esp32c3">ESP32-C3</option>
            <option value="esp32c6">ESP32-C6</option>
            <option value="esp32h2">ESP32-H2</option>
            <option value="esp8266">ESP8266</option>
        </select>
    </div>

    <div class="form-group">
        <label>Baud Rate</label>
        <input type="number" id="baudRate" value="460800" min="115200" max="921600" step="115200">
    </div>

    <div class="form-group">
        <label>Flash Modu</label>
        <select id="flashMode">
            <option value="dio">DIO</option>
            <option value="qio">QIO</option>
            <option value="dout">DOUT</option>
            <option value="qout">QOUT</option>
        </select>
    </div>

    <div class="form-group">
        <label>Flash Boyutu</label>
        <select id="flashSize">
            <option value="detect">Otomatik Tespit</option>
            <option value="1MB">1MB</option>
            <option value="2MB">2MB</option>
            <option value="4MB">4MB</option>
            <option value="8MB">8MB</option>
            <option value="16MB">16MB</option>
        </select>
    </div>

    <div class="form-group">
        <label>Flash Frekansı</label>
        <select id="flashFreq">
            <option value="40m">40 MHz</option>
            <option value="26m">26 MHz</option>
            <option value="20m">20 MHz</option>
            <option value="80m">80 MHz</option>
        </select>
    </div>

    <div class="form-group mode-offline" id="firmwareSection">
        <label>Firmware Dosyaları (Adres | Dosya Yolu)</label>
        <div class="mode-selector" id="modeSelector">
            <label class="mode-option">
                <input type="radio" name="firmwareMode" value="offline" checked> Offline (Gözat ile seç)
            </label>
            <label class="mode-option">
                <input type="radio" name="firmwareMode" value="online"> Online (İnternetten indir)
            </label>
        </div>
        <div class="firmware-list" id="firmwareList">
            <div class="firmware-item" data-index="0">
                <input type="text" placeholder="0x0 veya 0x10000" value="0x10000" class="addr-input">
                <input type="text" placeholder="Dosya yolu" class="file-path" readonly>
                <div class="file-actions">
                    <button class="btn btn-secondary file-browse">Gözat</button>
                    <div class="online-actions">
                        <select class="predefined-source">
                            <option value="">Ön tanımlı seçin...</option>
                            <option value="https://micropython.org/resources/firmware/ESP32_GENERIC-20251209-v1.27.0.bin" data-addr="0x1000" data-chip="esp32">MicroPython ESP32 (micropython.org)</option>
                            <option value="https://micropython.org/resources/firmware/ESP8266_GENERIC-20251209-v1.27.0.bin" data-addr="0x0" data-chip="esp8266">MicroPython ESP8266 (micropython.org)</option>
                        </select>
                        <input type="text" class="custom-url" placeholder="veya URL yapıştır (.bin veya .zip)">
                        <button class="btn btn-secondary download-btn">İndir</button>
                        <div class="online-hint">Seçili kaynaktan veya URL'den indirir. Önce seçin, sonra İndir'e tıklayın.</div>
                    </div>
                </div>
                <span class="download-status"></span>
                <button class="remove-btn">×</button>
            </div>
        </div>
        <button class="btn btn-secondary add-btn" id="addFirmware">+ Dosya Ekle</button>
    </div>

    <div class="form-group port-warning">
        <span class="warning-icon">⚠</span> Flash öncesi: Serial Monitor, Arduino IDE, PlatformIO veya port kullanan diğer uygulamaları kapatın.
    </div>
    <div class="form-group">
        <button class="btn btn-primary" id="flashBtn">Firmware Yükle</button>
    </div>

    <div class="footer">
        ©Tüm hakları saklıdır. <a href="https://www.vedatardil.com.tr" target="_blank">Vedat Ardil</a> | ESP Flasher v1.4.0
    </div>

    <script nonce="${nonce}">
        try {
        var vscode = acquireVsCodeApi();
        
        var chipType = document.getElementById('chipType');
        chipType.value = '${defaultChip}';
        document.getElementById('baudRate').value = '${defaultBaud}';
        
        function refreshPorts() {
            vscode.postMessage({ command: 'getSerialPorts' });
        }
        
        let firmwareIndex = 1;
        window.addEventListener('message', event => {
            const msg = event.data;
            if (!msg || !msg.command) return;
            console.log('[ESP Flasher WV] Mesaj alındı:', msg.command, msg);
            if (msg.command === 'updatePorts') {
                var sel = document.getElementById('serialPort');
                if (sel && msg.ports) {
                    var oldVal = sel.value;
                    if (msg.ports.length === 0) {
                        sel.innerHTML = '<option value="">Port bulunamadı - aşağıya manuel yazın veya Portları Yenile</option>';
                    } else {
                        sel.innerHTML = '<option value="">Port seçin...</option>' + msg.ports.map(function(p) {
                            return '<option value="' + p.replace(/&/g,'&amp;').replace(/"/g,'&quot;') + '">' + p + '</option>';
                        }).join('');
                        if (oldVal) sel.value = oldVal;
                    }
                }
            } else if (msg.command === 'flashComplete') {
                document.getElementById('flashBtn').disabled = false;
                document.getElementById('flashBtn').textContent = 'Firmware Yükle';
            } else if (msg.command === 'fileSelected') {
                var fItem = document.querySelector('.firmware-item[data-index="' + msg.itemIndex + '"]');
                if (fItem) fItem.querySelector('.file-path').value = msg.path;
            } else if (msg.command === 'downloadProgress') {
                console.log('[ESP Flasher WV] İlerleme:', msg.message);
                var allItems = document.querySelectorAll('.firmware-item');
                allItems.forEach(function(item) {
                    if (item.classList.contains('downloading')) {
                        var statusEl = item.querySelector('.download-status');
                        if (statusEl) {
                            statusEl.textContent = msg.message;
                            statusEl.className = 'download-status';
                        }
                    }
                });
            } else if (msg.command === 'downloadComplete') {
                console.log('[ESP Flasher WV] İndirme tamamlandı:', msg);
                var dItem = document.querySelector('.firmware-item[data-index="' + msg.itemIndex + '"]');
                if (!dItem) {
                    dItem = document.querySelector('.firmware-item.downloading');
                }
                if (!dItem) {
                    dItem = document.querySelector('.firmware-item[data-index="0"]');
                }
                if (dItem) {
                    dItem.classList.remove('downloading');
                    var statusEl = dItem.querySelector('.download-status');
                    if (msg.success) {
                        if (msg.files.length === 1) {
                            dItem.querySelector('.file-path').value = msg.files[0].path;
                            var opt = dItem.querySelector('.predefined-source option:checked');
                            if (opt && opt.dataset && opt.dataset.addr) dItem.querySelector('.addr-input').value = opt.dataset.addr;
                        } else if (msg.files.length > 1) {
                            var paths = msg.files.map(function(f) { return f.path; });
                            var names = msg.files.map(function(f) { return f.name; });
                            vscode.postMessage({ command: 'pickFromList', itemIndex: dItem.dataset.index, paths: paths, names: names });
                        }
                        if (statusEl) { statusEl.textContent = 'İndirildi ✓'; statusEl.className = 'download-status done'; }
                        var dlBtn = dItem.querySelector('.download-btn');
                        if (dlBtn) { dlBtn.textContent = 'Yeniden İndir'; }
                    } else {
                        if (statusEl) { statusEl.textContent = 'Hata: ' + (msg.error || ''); statusEl.className = 'download-status error'; }
                        alert('İndirme hatası: ' + (msg.error || ''));
                    }
                }
            } else if (msg.command === 'pickedFile') {
                var pickedItem = document.querySelector('.firmware-item[data-index="' + msg.itemIndex + '"]');
                if (pickedItem) pickedItem.querySelector('.file-path').value = msg.path;
            }
        });
        
        document.getElementById('refreshPorts').onclick = refreshPorts;
        
        function toggleMode() {
            const checked = document.querySelector('input[name="firmwareMode"]:checked');
            const isOnline = checked && checked.value === 'online';
            const section = document.getElementById('firmwareSection');
            if (section) {
                section.classList.remove('mode-offline', 'mode-online');
                section.classList.add(isOnline ? 'mode-online' : 'mode-offline');
                console.log('[ESP Flasher] Section classes:', section.className);
            }
        }
        
        document.getElementById('modeSelector').addEventListener('click', function(e) {
            setTimeout(toggleMode, 50);
        });
        document.querySelectorAll('input[name="firmwareMode"]').forEach(r => {
            r.addEventListener('change', toggleMode);
            r.addEventListener('click', function() { setTimeout(toggleMode, 50); });
        });
        
        document.getElementById('addFirmware').onclick = () => {
            const list = document.getElementById('firmwareList');
            const item = document.createElement('div');
            item.className = 'firmware-item';
            item.dataset.index = String(firmwareIndex++);
            item.innerHTML = '<input type="text" placeholder="0x0" value="0x10000" class="addr-input">' +
                '<input type="text" placeholder="Dosya yolu" class="file-path" readonly>' +
                '<div class="file-actions">' +
                '<button class="btn btn-secondary file-browse">Gözat</button>' +
                '<div class="online-actions">' +
                '<select class="predefined-source"><option value="">Ön tanımlı...</option>' +
                '<option value="https://micropython.org/resources/firmware/ESP32_GENERIC-20251209-v1.27.0.bin" data-addr="0x1000" data-chip="esp32">MicroPython ESP32 (micropython.org)</option>' +
                '<option value="https://micropython.org/resources/firmware/ESP8266_GENERIC-20251209-v1.27.0.bin" data-addr="0x0" data-chip="esp8266">MicroPython ESP8266 (micropython.org)</option>' +
                '</select>' +
                '<input type="text" class="custom-url" placeholder="URL (.bin veya .zip)">' +
                '<button class="btn btn-secondary download-btn">İndir</button>' +
                '<div class="online-hint">Seçili kaynaktan veya URL\'den indirir.</div>' +
                '</div></div>' +
                '<span class="download-status"></span>' +
                '<button class="remove-btn">×</button>';
            list.appendChild(item);
            item.querySelector('.remove-btn').onclick = () => item.remove();
            item.querySelector('.file-browse').onclick = () => browseFile(item);
            item.querySelector('.download-btn').onclick = () => doDownload(item);
            toggleMode();
        };
        
        function browseFile(item) {
            vscode.postMessage({ command: 'browseFile', itemIndex: item.dataset.index });
        }
        
        function doDownload(item) {
            try {
                var predefined = item.querySelector('.predefined-source').value;
                var custom = item.querySelector('.custom-url').value.trim();
                var url = predefined || custom;
                if (!url) {
                    alert('Ön tanımlı kaynak seçin veya URL girin.');
                    return;
                }
                var idx = item.dataset.index || '0';
                item.classList.add('downloading');
                var statusEl = item.querySelector('.download-status');
                if (statusEl) statusEl.textContent = 'Bağlanıyor...';
                vscode.postMessage({ command: 'downloadFirmware', url: url, itemIndex: idx });
            } catch(e) {
                alert('İndirme hatası: ' + (e.message || e));
            }
        }
        
        document.querySelectorAll('.firmware-item').forEach(function(item) {
            item.querySelector('.remove-btn').onclick = function() { item.remove(); };
            item.querySelector('.file-browse').onclick = function() { browseFile(item); };
            var dlb = item.querySelector('.download-btn');
            if (dlb) dlb.onclick = function() { doDownload(item); };
        });
        toggleMode();
        
        document.getElementById('flashBtn').onclick = async () => {
            const portSelect = document.getElementById('serialPort').value;
            const portManual = document.getElementById('manualPort').value.trim();
            const port = portSelect || portManual;
            if (!port) {
                alert('Lütfen bir seri port seçin veya manuel port girin.');
                return;
            }
            
            const firmwareItems = document.querySelectorAll('.firmware-item');
            const files = [];
            let hasError = false;
            firmwareItems.forEach(item => {
                const addr = item.querySelector('.addr-input').value.trim();
                const path = item.querySelector('.file-path').value.trim();
                if (addr && path) {
                    files.push({ address: addr, path });
                } else if (addr || path) {
                    hasError = true;
                }
            });
            
            if (files.length === 0 || hasError) {
                alert('Lütfen en az bir firmware dosyası seçin ve adres girin.');
                return;
            }
            
            document.getElementById('flashBtn').disabled = true;
            document.getElementById('flashBtn').textContent = 'Yükleniyor...';
            
            vscode.postMessage({
                command: 'flash',
                config: {
                    port,
                    chip: chipType.value,
                    baudRate: parseInt(document.getElementById('baudRate').value) || 460800,
                    flashMode: document.getElementById('flashMode').value,
                    flashSize: document.getElementById('flashSize').value,
                    flashFreq: document.getElementById('flashFreq').value,
                    files
                }
            });
        };
        } catch(scriptErr) {
            document.body.innerHTML = '<h2 style="color:red;">Script Hatası: ' + scriptErr.message + '</h2><pre>' + scriptErr.stack + '</pre>';
        }
    </script>
</body>
</html>`;
    }

    public dispose() {
        EspFlasherPanel.currentPanel = undefined;
        this._panel.dispose();
        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) x.dispose();
        }
    }
}

export interface FlashConfig {
    port: string;
    chip: string;
    baudRate: number;
    flashMode: string;
    flashSize: string;
    flashFreq: string;
    files: { address: string; path: string }[];
}
