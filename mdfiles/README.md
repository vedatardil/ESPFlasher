# ESP Flasher - VS Code / Cursor Eklentisi

**Geliştirici:** Vedat Ardil - [www.vedatardil.com.tr](https://www.vedatardil.com.tr)

ESP32, ESP8266 ve ESP32-S/C/H serisi mikrodenetleyicilere firmware yükleme eklentisi.

## Özellikler

- **Seri Port Otomatik Tespiti** - macOS, Windows ve Linux desteği
  - macOS: `/dev/cu.*` portları otomatik taranır (pyserial + fallback)
  - Windows: WMI ile gerçek port tespiti + COM1-COM20 fallback
  - Linux: `/dev/ttyUSB*`, `/dev/ttyACM*`, `/dev/ttyS*` tarama
- **Manuel Port Girişi** - Otomatik tespit başarısız olursa manuel port yazabilirsiniz
- **Çoklu Chip Desteği** - ESP32, ESP32-S2, ESP32-S3, ESP32-C2, ESP32-C3, ESP32-C6, ESP32-H2, ESP8266
- **Offline Firmware Yükleme** - Yerel .bin dosyalarını seçerek yükleme
- **Online Firmware İndirme** - MicroPython ve diğer firmware'leri doğrudan internetten indirme
- **ZIP Desteği** - ZIP dosyalarından otomatik .bin çıkarma
- **Çoklu Dosya Yükleme** - Birden fazla firmware dosyasını farklı adreslere yükleme
- **Ayarlanabilir Parametreler** - Baud rate, flash modu, flash boyutu, flash frekansı

## Gereksinimler

- **Python 3** - `python3` komutunun PATH'te bulunması gerekir
- **esptool** - `pip install esptool`
- **pyserial** - `pip install pyserial` (port tespiti için)
- **USB-Seri Sürücü** (gerekirse):
  - CH340/CH341: [WCH CH34x Sürücü](https://www.wch.cn/downloads/CH34XSER_MAC_ZIP.html)
  - CP2102/CP2104: [Silicon Labs CP210x Sürücü](https://www.silabs.com/developers/usb-to-uart-bridge-vcp-drivers)

## Kurulum

### Hızlı Kurulum (macOS/Linux)

```bash
chmod +x kurulum.sh
./kurulum.sh
```

### Manuel Kurulum

```bash
pip install esptool pyserial
```

### Eklenti Kurulumu

1. `.vsix` dosyasını indirin
2. VS Code / Cursor'da: `Cmd+Shift+P` → `Extensions: Install from VSIX`
3. Dosyayı seçin ve yükleyin
4. `Cmd+Shift+P` → `Developer: Reload Window`

## Kullanım

1. `Cmd+Shift+P` → `ESP Flasher: Firmware Yükle` veya `ESP Flasher: Panel Aç`
2. **Seri Port** - Listeden seçin veya manuel girin
3. **Chip Tipi** - ESP cihazınıza uygun chip'i seçin
4. **Firmware** - Offline (Gözat) veya Online (İndir) modunu seçin
5. **Firmware Yükle** butonuna tıklayın

### Online İndirme

1. "Online (İnternetten indir)" modunu seçin
2. Ön tanımlı kaynaktan seçin veya URL yapıştırın
3. "İndir" butonuna tıklayın
4. İndirme tamamlanınca dosya yolu otomatik olarak ayarlanır

## Ayarlar

| Ayar | Varsayılan | Açıklama |
|------|-----------|----------|
| `espFlasher.pythonPath` | `python3` | Python yolu |
| `espFlasher.defaultBaudRate` | `460800` | Varsayılan baud rate |
| `espFlasher.defaultChip` | `esp32` | Varsayılan chip tipi |

## Sorun Giderme

### Port Bulunamıyor

- ESP cihazını **veri destekli** USB kablosuyla bağlayın (sadece şarj kablosu çalışmaz)
- Terminal'de `ls /dev/cu.*` (macOS) veya `ls /dev/ttyUSB*` (Linux) ile kontrol edin
- Gerekirse USB-Seri sürücü yükleyin (CH340 veya CP2102)
- Sürücü yükledikten sonra bilgisayarı yeniden başlatın

### Flash Hatası

- Serial Monitor, Arduino IDE, PlatformIO veya portu kullanan diğer uygulamaları kapatın
- Farklı bir baud rate deneyin (115200 genellikle güvenilirdir)
- ESP cihazında BOOT butonuna basılı tutarak bağlantıyı deneyin

### esptool Bulunamıyor

```bash
pip install esptool pyserial
```

Python yolunu ayarlardan değiştirebilirsiniz: `espFlasher.pythonPath`

## Sürüm Geçmişi

- **v1.3.1** - İndirme buton handler düzeltmesi, event delegation, hata yakalama iyileştirmesi
- **v1.3.0** - Port yenileme artık HTML rebuild yapmıyor, output channel ile indirme takibi
- **v1.2.9** - İndirme motoru yeniden yazıldı (ilerleme, timeout, hata yönetimi)
- **v1.2.8** - macOS'ta pyserial desteği, geniş port tespiti, kullanıcı bilgilendirme paneli
- **v1.2.7** - İlk kararlı sürüm

## Lisans

©Tüm hakları saklıdır. [Vedat Ardil](https://www.vedatardil.com.tr)
