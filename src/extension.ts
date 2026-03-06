/**
 * ESP Flasher - ESP32 ve ESP8266 Firmware Yükleme Eklentisi
 * Geliştirici: Vedat Ardil - www.vedatardil.com.tr
 */

import * as vscode from 'vscode';

import { EspFlasherPanel } from './panel';

export function activate(context: vscode.ExtensionContext) {
    const openPanelCommand = vscode.commands.registerCommand(
        'espFlasher.openPanel',
        () => {
            EspFlasherPanel.createOrShow(context.extensionUri);
        }
    );

    const flashCommand = vscode.commands.registerCommand(
        'espFlasher.flashFirmware',
        () => {
            EspFlasherPanel.createOrShow(context.extensionUri);
        }
    );

    context.subscriptions.push(openPanelCommand, flashCommand);
}

export function deactivate() {}
