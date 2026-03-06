# ESP Flasher

ESP32 ve ESP8266 serisi cihazlara firmware yükleme eklentisi. Cursor ve VS Code üzerinde çalışır.

**Geliştirici:** Vedat Ardil - [www.vedatardil.com.tr](https://www.vedatardil.com.tr)

## Gereksinimler

- **Python 3** (sisteminizde yüklü olmalı)
- **esptool** ve **pyserial** Python paketleri:

```bash
pip3 install esptool pyserial
```

## Kurulum

### Geliştirme Modunda Çalıştırma

1. Projeyi Cursor/VS Code'da açın
2. `npm install` çalıştırın
3. F5 tuşuna basın veya "Run and Debug" ile "Extension'ı Çalıştır"ı seçin
4. Yeni bir Cursor/VS Code penceresi açılacak (Extension Development Host)
5. Bu pencerede **Command Palette** (Cmd+Shift+P) açın
6. "ESP Flasher: Firmware Yükle" veya "ESP Flasher: Panel Aç" komutunu çalıştırın

### VSIX Olarak Paketleme

```bash
npm install -g @vscode/vsce
vsce package
```

Oluşan `esp-flasher-1.0.0.vsix` dosyasını Cursor/VS Code'da "Extensions" > "..." > "Install from VSIX" ile yükleyebilirsiniz.

## Kullanım

1. ESP cihazınızı USB ile bilgisayara bağlayın
2. **Command Palette** (Cmd+Shift+P) açın
3. "ESP Flasher: Firmware Yükle" yazın ve çalıştırın
4. Panel açıldığında:
   - **Seri Port:** Cihazınızın bağlı olduğu portu seçin
   - **Chip Tipi:** ESP32, ESP32-S3, ESP8266 vb. seçin
   - **Firmware Dosyaları:** Her dosya için adres (örn. 0x10000) ve dosya yolu girin
   - **Firmware Yükle** butonuna tıklayın

## Örnek Flash Adresleri

### ESP8266 (tek firmware)
- `0x0` - Genellikle tek .bin dosyası

### ESP32 (ESP-IDF / Arduino)
- `0x1000` - Bootloader
- `0x8000` - Partition table
- `0x10000` - Ana uygulama (firmware.bin)

### ESP32 (sadece uygulama)
- `0x10000` - Ana uygulama

## Ayarlar

- `espFlasher.pythonPath`: Python yolu (varsayılan: python3)
- `espFlasher.defaultBaudRate`: Varsayılan baud rate (varsayılan: 460800)
- `espFlasher.defaultChip`: Varsayılan chip tipi (varsayılan: esp32)

## Desteklenen Chip Tipleri

- ESP32
- ESP32-S2
- ESP32-S3
- ESP32-C2
- ESP32-C3
- ESP32-C6
- ESP32-H2
- ESP8266

---

© Tüm hakları saklıdır. [Vedat Ardil](https://www.vedatardil.com.tr)
