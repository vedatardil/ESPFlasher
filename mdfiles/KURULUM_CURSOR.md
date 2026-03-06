# ESP Flasher - Cursor Kurulum Rehberi

**Geliştirici:** Vedat Ardil - [www.vedatardil.com.tr](https://www.vedatardil.com.tr)

## Adım 1: Ön Gereksinimler

### Node.js ve npm
Sisteminizde Node.js ve npm yüklü olmalı. Kontrol için Cursor'un **Terminal**'ini açın (Ctrl+` veya Cmd+`) ve:

```bash
node -v
npm -v
```

Eğer hata alırsanız, Node.js yükleyin:
- **macOS:** `brew install node`
- **İndirme:** https://nodejs.org

### Python ve esptool
```bash
pip3 install esptool pyserial
```

---

## Adım 2: Eklentiyi Derleme

1. **ESPFlasher** klasörünü Cursor'da açın (File > Open Folder)
2. **Terminal** açın (Ctrl+` veya Cmd+`)
3. Şu komutları çalıştırın:

```bash
npm install
npm run compile
```

Alternatif olarak kurulum scriptini çalıştırabilirsiniz:
```bash
chmod +x kurulum.sh
./kurulum.sh
```

---

## Adım 3: Cursor'a Yükleme

### Yöntem A: Geliştirme Modu (Önerilen - Hızlı Test)

1. ESPFlasher klasörü Cursor'da açıkken **F5** tuşuna basın
2. Yeni bir Cursor penceresi açılacak (Extension Development Host)
3. Bu pencerede **Cmd+Shift+P** (veya Ctrl+Shift+P) ile Command Palette'i açın
4. **"ESP Flasher: Firmware Yükle"** yazın ve çalıştırın
5. Panel açılacak!

### Yöntem B: Kalıcı Kurulum (VSIX)

1. Terminalde VSIX paketi oluşturun:
```bash
npx @vscode/vsce package
```

2. `esp-flasher-1.0.0.vsix` dosyası oluşacak

3. Cursor'da:
   - **Extensions** panelini açın (Cmd+Shift+X)
   - Sağ üstteki **"..."** menüsüne tıklayın
   - **"Install from VSIX..."** seçin
   - Oluşan `esp-flasher-1.0.0.vsix` dosyasını seçin

4. Cursor'u yeniden başlatın (gerekirse)

---

## Kullanım

1. ESP cihazınızı USB ile bağlayın
2. **Cmd+Shift+P** → **"ESP Flasher: Firmware Yükle"**
3. Seri port, chip tipi ve firmware dosyasını seçin
4. **Firmware Yükle** butonuna tıklayın

---

© Tüm hakları saklıdır. [Vedat Ardil](https://www.vedatardil.com.tr)
