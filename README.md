# ESP Flasher

<p align="center">
  <strong>VS Code / Cursor eklentisi ile ESP32 ve ESP8266 cihazlara kolayca firmware yükleyin.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-1.4.0-blue" alt="Version">
  <img src="https://img.shields.io/badge/platform-macOS%20%7C%20Windows%20%7C%20Linux-lightgrey" alt="Platform">
  <img src="https://img.shields.io/badge/engine-VS%20Code%20%7C%20Cursor-007ACC" alt="Engine">
  <img src="https://img.shields.io/badge/license-MIT-green" alt="License">
</p>

---

## Özellikler

- **Görsel arayüz** — Komut satırı bilgisi gerektirmez, tüm işlemler panelden yapılır
- **Geniş chip desteği** — ESP32, ESP32-S2, ESP32-S3, ESP32-C2, ESP32-C3, ESP32-C6, ESP32-H2, ESP8266
- **Otomatik port algılama** — USB seri portlar otomatik olarak listelenir (macOS, Windows, Linux)
- **Online firmware indirme** — MicroPython gibi popüler firmware'ler tek tıkla indirilir
- **Offline mod** — Yerel `.bin` dosyalarını gözat ve yükle
- **ZIP desteği** — İndirilen `.zip` dosyaları otomatik çıkartılır
- **Çoklu firmware** — Birden fazla firmware dosyasını farklı adreslere yükleyebilme
- **Yapılandırılabilir** — Baud rate, flash modu, flash boyutu, flash frekansı ayarları
- **Sürücü rehberi** — Port bulunamazsa CH340/CP2102 sürücü yükleme rehberi

## Gereksinimler

| Gereksinim | Açıklama |
|---|---|
| **Python 3** | `esptool` çalıştırmak için gereklidir |
| **esptool** | `pip install esptool` ile yükleyin |
| **USB Sürücü** | CH340 veya CP2102 sürücüsü (cihazınıza göre) |
| **VS Code / Cursor** | v1.85.0 veya üstü |

### esptool Kurulumu

```bash
pip install esptool
```

veya

```bash
pip3 install esptool
```

### USB Sürücüleri

| Chip | Sürücü | İndirme |
|---|---|---|
| CH340 / CH341 | WCH CH34x | [İndir](https://www.wch.cn/downloads/CH34XSER_MAC_ZIP.html) |
| CP2102 / CP2104 | Silicon Labs CP210x | [İndir](https://www.silabs.com/developers/usb-to-uart-bridge-vcp-drivers) |

## Kurulum

### Yöntem 1: VSIX Dosyasından

1. [Releases](../../releases) sayfasından en güncel `.vsix` dosyasını indirin
2. VS Code / Cursor'da:
   - `Ctrl+Shift+P` (macOS: `Cmd+Shift+P`) açın
   - `Extensions: Install from VSIX...` yazın
   - İndirilen `.vsix` dosyasını seçin
3. Editörü yeniden başlatın

### Yöntem 2: Terminal ile

```bash
# VS Code
code --install-extension esp-flasher-1.4.0.vsix

# Cursor
cursor --install-extension esp-flasher-1.4.0.vsix
```

### Yöntem 3: Kaynak Koddan Derleme

```bash
git clone https://github.com/vedatardil/ESPFlasher.git
cd ESPFlasher
npm install
npm run compile
npx vsce package --no-dependencies
```

## Kullanım

### Paneli Açma

`Ctrl+Shift+P` → **ESP Flasher: Panel Aç** veya **ESP Flasher: Firmware Yükle**

### Online Mod (İnternetten İndir)

1. **Seri Port** seçin (veya manuel girin)
2. **Chip Tipi** seçin
3. Firmware modunu **Online** olarak değiştirin
4. Ön tanımlı listeden bir firmware seçin veya özel URL yapıştırın
5. **İndir** butonuna tıklayın
6. İndirme tamamlandığında **Firmware Yükle** butonuna tıklayın

### Offline Mod (Yerel Dosya)

1. **Seri Port** seçin (veya manuel girin)
2. **Chip Tipi** seçin
3. Firmware modunu **Offline** olarak bırakın
4. **Gözat** butonuyla `.bin` dosyasını seçin
5. Flash adresini ayarlayın (varsayılan: `0x10000`)
6. **Firmware Yükle** butonuna tıklayın

### Çoklu Firmware Yükleme

**+ Dosya Ekle** butonuyla birden fazla firmware dosyası ekleyebilirsiniz. Her dosya için farklı bir flash adresi belirleyin:

| Dosya | Tipik Adres |
|---|---|
| Bootloader | `0x1000` |
| Partition Table | `0x8000` |
| Application | `0x10000` |

## Ayarlar

`Ctrl+,` → "ESP Flasher" arayın

| Ayar | Varsayılan | Açıklama |
|---|---|---|
| `espFlasher.pythonPath` | `python3` | Python yolu |
| `espFlasher.defaultBaudRate` | `460800` | Varsayılan baud rate |
| `espFlasher.defaultChip` | `esp32` | Varsayılan chip tipi |

## Desteklenen Flash Parametreleri

| Parametre | Seçenekler |
|---|---|
| **Baud Rate** | 115200 – 921600 |
| **Flash Modu** | DIO, QIO, DOUT, QOUT |
| **Flash Boyutu** | Otomatik, 1MB, 2MB, 4MB, 8MB, 16MB |
| **Flash Frekansı** | 20 MHz, 26 MHz, 40 MHz, 80 MHz |

## Sorun Giderme

### Port Bulunamıyor

- ESP cihazının USB kablosuyla bağlı olduğundan emin olun
- **Veri destekli** USB kablosu kullanın (sadece şarj kablosu çalışmaz)
- Uygun USB sürücüsünü yükleyin (yukarıdaki tabloya bakın)
- Sürücü yüklendikten sonra bilgisayarı yeniden başlatın
- Terminal'de kontrol edin:
  ```bash
  # macOS / Linux
  ls /dev/cu.*

  # Windows
  mode
  ```

### Flash Başarısız Oluyor

- Flash öncesi **Serial Monitor**, **Arduino IDE**, **PlatformIO** veya portu kullanan diğer uygulamaları kapatın
- Farklı bir baud rate deneyin (115200 en güvenilirdir)
- ESP cihazını **boot moduna** almayı deneyin (BOOT butonuna basılı tutarak RESET'e basın)
- USB kablosunu farklı bir porta takın

### esptool Bulunamıyor

```bash
# esptool kurulu mu kontrol edin
esptool.py version

# Kurulu değilse yükleyin
pip3 install esptool

# Python yolunu ayarlarda belirtin
# Ayarlar → espFlasher.pythonPath → python3 veya /usr/bin/python3
```

## Proje Yapısı

```
ESPFlasher/
├── src/
│   ├── extension.ts    # Eklenti giriş noktası
│   ├── panel.ts        # Webview UI ve iletişim
│   ├── flasher.ts      # Port algılama ve flash işlemleri
│   └── downloader.ts   # Firmware indirme ve ZIP çıkartma
├── out/                 # Derlenmiş JavaScript
├── media/               # Webview kaynakları
├── package.json         # Eklenti tanımı ve bağımlılıklar
└── tsconfig.json        # TypeScript yapılandırması
```

## Sürüm Geçmişi

### v1.4.0
- Content Security Policy (CSP) desteği eklendi
- Webview script güvenliği iyileştirildi (nonce tabanlı)
- JavaScript parse hatası düzeltildi
- Inline event handler'lar kaldırıldı

### v1.2.9
- Online indirme motoru yeniden yazıldı
- Bağlantı ve aktivite zaman aşımı eklendi
- HTTP yönlendirme desteği (307/308 dahil)
- İlerleme göstergesi iyileştirildi

### v1.2.8
- macOS port algılama genişletildi (tüm cu.* portları)
- system_profiler ile USB cihaz tespiti
- Windows ve Linux port algılama iyileştirildi
- Port bulunamadığında sürücü rehberi eklendi

### v1.0.0
- İlk sürüm
- ESP32 / ESP8266 firmware yükleme
- Online ve offline firmware seçimi
- Otomatik port algılama

## Geliştirici

**Vedat Ardil** — [www.vedatardil.com.tr](https://www.vedatardil.com.tr)

## Lisans

Bu proje MIT lisansı ile lisanslanmıştır. Detaylar için [LICENSE](LICENSE) dosyasına bakın.

---

<p align="center">
  <sub>©Tüm hakları saklıdır. <a href="https://www.vedatardil.com.tr">Vedat Ardil</a></sub>
</p>
