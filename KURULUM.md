# 🚕 Taksi Çağır – Kurulum Rehberi

## Dosyalar

| Dosya | Kim kullanır | Görevi |
|---|---|---|
| `index.html` | Yolcu (QR ile açılır) | Taksi çağırma, canlı durum, plaka ve şoför görüntüleme. 7 dil (TR/EN/DE/RU/NL/CZ/PL), telefon diline göre otomatik seçilir |
| `durak.html` | Durak (bilgisayar ya da tablet) | Çağrıları görür; onaylar (plaka, şoför, süre girer), reddeder ve "gönderildi" diye işaretler |
| `yonetim.html` | Siz (sistem sahibi) | Durak ekleme, durak kullanıcısı oluşturma, QR noktası ekleme ve afiş yazdırma |
| `firebase-config.js` | Hepsi | Firebase bağlantı bilgileri (tek yerden değişir) |
| `demo.js` | Hepsi | Kurulum yapılmadan denemek için demo modu |
| `database.rules.json` | Firebase | Güvenlik kuralları |

## 0. Kurmadan deneyin (demo modu)
`firebase-config.js` içindeki `apiKey` değeri `"BURAYA_API_KEY"` olarak kaldıkça sistem **demo modunda** açılır. Dosyalara bilgisayarda çift tıklamanız yeterli; aynı tarayıcıda açılan sekmeler birbirini canlı olarak görür.
1. `index.html` dosyasını açın. Bu yolcu ekranı, demo "Noxinn Deluxe Hotel – Lobi" noktasıyla açılır.
2. Sol alttaki sarı şeritten **Durak paneli**'ni açın. Giriş: `durak@demo.com` / `123456`
3. Yolcu ekranından çağrı yapın. Panelde alarm çalar; onaylayın, plakanın yolcu ekranına düştüğünü görün.
4. **Yönetim** girişi: `admin@demo.com` / `123456` (QR görüntüleri için internet gerekir)
5. Sarı şeritteki **Sıfırla** butonu tüm demo verilerini başa döndürür.

Firebase config'i doldurduğunuz anda demo modu kendiliğinden kapanır ve gerçek sistem çalışır. Demo modunu gerçek kurulumda zorla açmak isterseniz adresin sonuna `?demo=1` ekleyebilirsiniz.

Altyapı **Firebase Realtime Database + Authentication** ve **ücretsiz Spark planı** ile çalışır. Kredi kartı gerekmez.

---

## 1. Firebase projesini oluşturun
1. https://console.firebase.google.com → **Proje ekle** (Analytics'i kapatabilirsiniz).
2. **Build → Authentication → Get started → Sign-in method** bölümünde iki sağlayıcıyı etkinleştirin:
   - **Email/Password** (durak ve yönetici girişi için)
   - **Anonymous** (yolcular görünmeden oturum açar ve sadece kendi çağrılarını görebilir)
3. **Build → Realtime Database → Create database**
   - Konum: **europe-west1 (Belçika)**. Türkiye'ye en yakın seçenek budur.
   - Mod: **Locked mode**
4. Realtime Database'de **Rules** sekmesini açın, `database.rules.json` dosyasının tüm içeriğini yapıştırın ve **Publish**'e basın.

## 2. Bağlantı bilgilerini girin
1. **Proje ayarları (⚙️) → Genel → Uygulamalarınız → Web (</>)** yolunu izleyerek bir web uygulaması ekleyin (Hosting'i işaretlemeniz gerekmez).
2. Ekranda çıkan `firebaseConfig` değerlerini `firebase-config.js` dosyasına yapıştırın.
   **`databaseURL` mutlaka dolu olmalı.** Değeri Realtime Database sayfasının üstünde yazar.

## 3. Yayınlayın (GitHub Pages)
Beş dosyayı aynı klasöre yükleyin. Örnek: `noxinnhotels.github.io/taksi/`
> Sayfalar `file://` ile açılırsa çalışmaz (modül güvenliği). Yerelde test ederken VS Code Live Server ya da `npx serve` kullanın.

## 4. İlk yöneticiyi tanımlayın
1. **Authentication → Users → Add user** ile kendinize e-posta ve şifre oluşturun.
2. `yonetim.html` sayfasını açıp giriş yapın. Ekranda "yetkiniz yok" uyarısıyla birlikte **UID**'niz görünür.
3. **Realtime Database → Data** bölümünde kök dizine `adminler` adlı bir anahtar ekleyin, altına UID'nizi yazıp değerini `true` yapın:
   ```
   adminler
     └─ AbC123xyz... : true
   ```
4. Sayfayı yenileyin. Yönetim paneli açılır.

## 5. Durağı devreye alın
1. **Duraklar** sekmesinde durak adını ve telefonu girin. Telefon numarası yolcuya "Durağı ara" butonunda gösterilir.
2. **Kullanıcılar** sekmesinde durağı seçin, e-posta ve şifre belirleyin.
3. **QR Noktaları** sekmesinde durağı seçin ve noktaları ekleyin (örn. "Noxinn Deluxe – Lobi", "Konaklı Çarşı").
   - Her noktada önce **Test et** ile çalıştığını kontrol edin.
   - **Tümünü yazdır** her nokta için ayrı bir A5 afiş basar: sarı TAXI başlığı, QR, 7 dilde "okutun" yazısı, nokta adı ve durak telefonu.
4. Durakta `durak.html` sayfasını açın, giriş yapın ve **PANELİ BAŞLAT**'a basın.

---

## İşleyiş
```
Yolcu QR okutur → telefon (zorunlu), isim ve not (isteğe bağlı), KVKK onayı, konum (izin verirse) → TAKSİ ÇAĞIR
   ↓
Durak paneli: sesli alarm (işlem yapılana kadar 3 sn'de bir çalar) + tarayıcı bildirimi + sekme başlığında sayaç
   ├─ ONAYLA → plaka + şoför + süre (3/5/7/10/15/20/30 dk) → yolcunun ekranında plaka, şoför ve tahmini varış saati
   │     └─ GÖNDERİLDİ → yolcuya "Taksiniz yola çıktı"
   └─ REDDET → sebep (araç yok / bölge dışı / diğer) → yolcuya kendi dilinde bildirilir + durağı arama butonu
```
- **Yolcu iptali:** Çağrıdan sonraki **1 dakika** içinde, çağrı onaylanmış olsa bile iptal edilebilir. Bu kural sunucu tarafında da uygulanır. İptal gelince panelde ayrı bir uyarı sesi ve kırmızı mesaj çıkar.
- **3 dakika yanıt gelmezse** yolcunun ekranında "Durağı ara" butonu belirir.
- **Kartın rengi bekleme süresine göre değişir:** ilk 2 dk sarı, 2–4 dk turuncu, 4 dk'dan sonra kırmızı ve yanıp söner.
- **Araç hafızası:** Girilen her plaka ve şoför eşleşmesi kaydedilir. Bir sonraki onayda "Son kullanılan araçlar"dan tek dokunuşla seçilir; plaka yazılınca şoför adı da kendiliğinden gelir.
- **Durak aç/kapa:** Paneldeki anahtar kapatıldığında yolcular "Durak şu anda çağrı kabul etmiyor" mesajını ve telefon numarasını görür.
- **Ekran kapanmaz:** Panel açıkken ekran kilitlenmez (Wake Lock destekleyen tarayıcılarda).

## Güvenlik ve kötüye kullanım önlemleri
- Yolcular yalnızca **kendi** çağrılarını görebilir. Telefon numaraları başka hiçbir yolcuya görünmez.
- Her durak yalnızca kendi çağrılarını, QR noktalarını ve araçlarını görür.
- Bir cihazdan **dakikada en fazla 1 çağrı** yapılabilir (sunucu kuralı).
- Durak kapalıyken veya silinmiş bir QR noktasından çağrı yapılamaz.
- Telefon numarası biçimi ve tüm alan uzunlukları sunucuda doğrulanır.

## Maliyet ve limitler (ücretsiz Spark planı)
- 1 GB veri depolama. Bir çağrı yaklaşık 0,5 KB tuttuğu için bu, milyonlarca çağrı demektir.
- Ayda 10 GB indirme
- **Aynı anda 100 bağlantı.** Bağlantıyı açık olan her yolcu sayfası ve her panel 1 bağlantı sayılır. Yolcu sayfası, çağrı sonuçlandıktan birkaç saniye sonra bağlantıyı kendiliğinden kapatır.
- Çok sayıda durağa yayıldığınızda **Blaze** (kullandıkça öde) planına geçmeniz yeterli. Ücretsiz kotalar aynen kalır, yalnızca aşan kısım ücretlendirilir.

## KVKK notları
- Yolcu sayfasında açık onay kutusu ve kısa bir aydınlatma metni var. Metin, durak adını veri sorumlusu olarak gösterir. Yayına almadan önce bir hukukçuya kontrol ettirmenizi öneririm.
- Çağrı kayıtları (telefon numarası dahil) veritabanında kalır. Bir saklama süresi belirleyip eski kayıtları silmek için ileride "X günden eski kayıtları temizle" özelliğini ekleyebiliriz.

## Durak bilgisayarı veya tableti için ipuçları
- Chrome ya da Edge kullanın. İlk açılışta **bildirim izni** verin.
- Cihazın sesini açık bırakın. Panel yeni çağrıda **işlem yapılana kadar** çalmaya devam eder (🔇 butonu 1 dakika susturur).
- Tablet kullanılacaksa Chrome menüsünden "Ana ekrana ekle" ile tam ekran kullanabilirsiniz.
- Bilgisayarın uyku moduna geçmesini kapatın (Windows: Güç ayarları → Uyku: Hiçbir zaman).
