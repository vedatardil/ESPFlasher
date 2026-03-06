#!/bin/bash
# ESP Flasher - Cursor Kurulum Scripti
# Geliştirici: Vedat Ardil - www.vedatardil.com.tr

set -e
cd "$(dirname "$0")"

echo "=== ESP Flasher Kurulumu ==="

# npm kontrolü
if ! command -v npm &> /dev/null; then
    echo "HATA: npm bulunamadı!"
    echo ""
    echo "Lütfen Node.js ve npm yükleyin:"
    echo "  - https://nodejs.org adresinden indirin"
    echo "  - veya: brew install node"
    exit 1
fi

echo "npm sürümü: $(npm -v)"
echo ""

# Bağımlılıkları yükle
echo "1. Bağımlılıklar yükleniyor..."
npm install

# Derle
echo ""
echo "2. Extension derleniyor..."
npm run compile

echo ""
echo "=== Kurulum tamamlandı! ==="
echo ""
echo "Cursor'da eklentiyi kullanmak için:"
echo "  1. Bu klasörü Cursor'da açın (File > Open Folder)"
echo "  2. F5 tuşuna basın (veya Run > Start Debugging)"
echo "  3. Açılan yeni pencerede Cmd+Shift+P > 'ESP Flasher: Firmware Yükle'"
echo ""
echo "Kalıcı kurulum için VSIX oluşturmak isterseniz:"
echo "  npx @vscode/vsce package"
echo "  Sonra: Cursor > Extensions > ... > Install from VSIX"
echo ""
