# Public release checklist

Bu checklist GGL'nin geliştirme arşivinden ayrı, temiz ve kişisel bilgi içermeyen public repository snapshot'ı üretmek içindir.

## 1. Kaynak ağacını sabitle

- `main` üzerinde planlanan bakım/refactor işleri tamamlanmış olmalı.
- `npm ci` temiz çalışmalı.
- `npm run verify` geçmeli.
- Uygulamanın temel Electron smoke testi yapılmalı.
- Geçici helper/migration scriptleri ve debug dosyaları kaldırılmalı.

## 2. Kişisel bilgi taraması

Public snapshot'a geçmeden önce kaynak ağacında şu tür veriler aranmalıdır:

- geliştirme hesabının kullanıcı adı,
- gerçek ad/soyad,
- kişisel e-posta,
- ev/iş koordinatları,
- gerçek özel fotoğraflar,
- yerel mutlak dosya yolları (`/home/...`, `C:\Users\...`),
- API anahtarları, tokenlar veya credential dosyaları,
- issue/debug için eklenmiş kişisel deney JSON'ları.

Örnek yerel tarama:

```bash
rg -n -i "<eski-kullanici-adi>|<gercek-ad>|<eski-email>" . 
rg -n "/home/|C:\\Users\\" . --glob '!package-lock.json'
```

Binary görseller ve örnek dosyalar ayrıca metadata/EXIF açısından kontrol edilmelidir. Public örnekler mümkün olduğunca sentetik veya açık lisanslı olmalıdır.

## 3. Git geçmişini taşımadan temiz snapshot oluştur

Geliştirme repository'si private arşiv olarak kalabilir. Public repository'ye yalnız final tracked kaynak ağacı aktarılır:

```bash
mkdir ../ggl-public
git archive HEAD | tar -x -C ../ggl-public
cd ../ggl-public
git init -b main
```

Bu yöntem eski commit author/committer metadata'sını, eski branch/PR geçmişini ve geliştirme hesabını public repository'ye taşımaz.

## 4. Public Git kimliğini kişisel bilgi içermeyecek şekilde ayarla

İlk public commit'ten önce yeni repository içinde Git kimliği kontrol edilmelidir:

```bash
git config user.name "Geometrik Gözlem Laboratuvarı"
git config user.email "<yeni-hesabin-github-noreply-adresi>"
git config --get user.name
git config --get user.email
```

Mümkünse GitHub hesabında e-posta gizliliği etkinleştirilir ve GitHub'ın `noreply` adresi kullanılır. Böylece public commit metadata'sında kişisel e-posta yer almaz.

## 5. Repository URL metadata'sını yalnız final adres belli olunca ekle

Geliştirme hesabının adresi `package.json`, README veya dokümanlara yazılmamalıdır. Yeni public repo oluşturulduktan sonra gerekirse şu metadata eklenir:

- `package.json.repository`
- `package.json.bugs`
- `package.json.homepage`
- README issue/release bağlantıları

## 6. Lisans ve üçüncü taraf bildirimleri

- Kökte `LICENSE` bulunmalı.
- GGL lisansı: MIT.
- `package.json` içinde `license: "MIT"` bulunmalı.
- `THIRD_PARTY_NOTICES.md` güncel olmalı.
- Yeni runtime kütüphanesi/veri seti eklendiyse lisans/provenans koşulları ayrıca kontrol edilmeli.
- Binary Electron dağıtımı yapılacaksa Electron/Chromium üçüncü taraf notice dosyaları paketle birlikte korunmalı.

## 7. Temiz public commit

Final snapshot'ta:

```bash
git add .
git status --short
git commit -m "Initial public release"
git log -1 --format=fuller
```

`git log -1` çıktısında author/committer adı ve e-postasının public kimlik olduğunu kontrol edin.

Ardından yeni boş public repo bağlanır:

```bash
git remote add origin <yeni-public-repo-url>
git push -u origin main
```

## 8. Public repository ayarları

Yayın sonrası önerilen ayarlar:

- Issues açık.
- Private vulnerability reporting / Security Advisory mümkünse açık.
- `main` için pull request tabanlı branch protection.
- CI required check olarak etkin.
- Merge sonrası branch silme tercihi.
- Public release/tag yalnız doğrulanmış commit'ten oluşturulur.

## 9. İlk release kontrolü

İlk release oluşturulmadan önce yeniden:

```bash
npm ci
npm run verify
npm run dev
```

çalıştırılır. `README`, `LICENSE`, `THIRD_PARTY_NOTICES.md`, `SECURITY.md`, `CONTRIBUTING.md`, `AGENTS.md` ve `docs/current-status.md` public repo üzerinden açılarak bağlantıları kontrol edilir.
