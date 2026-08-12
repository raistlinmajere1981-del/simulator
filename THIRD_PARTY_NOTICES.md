# Third-party notices

Geometrik Gözlem Laboratuvarı (GGL) kendi kaynak kodunu MIT lisansı altında yayımlar. Bu dosya, doğrudan kullanılan başlıca üçüncü taraf yazılım ve veri kaynaklarının lisans/provenans notlarını tek yerde toplar.

Bu liste proje lisansının üçüncü taraf bileşenleri yeniden lisansladığı anlamına gelmez. Her üçüncü taraf bileşen kendi lisans koşullarına tabidir. Exact kurulu dependency ağacı `package-lock.json` içinde sabitlenir.

## Runtime bağımlılıkları

### React ve React DOM

- Proje: React
- Kaynak: https://github.com/facebook/react
- Lisans: MIT
- Copyright (c) Meta Platforms, Inc. and affiliates.

MIT lisans bildirimi:

> Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions: The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software. THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

### three.js

- Proje: three.js
- Kaynak: https://github.com/mrdoob/three.js
- Lisans: MIT
- Copyright © 2010-2026 three.js authors

MIT lisans bildirimi:

> Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions: The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software. THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

### topojson-client

- Proje: TopoJSON Client
- Kaynak: https://github.com/topojson/topojson-client
- Lisans: ISC
- Copyright 2012-2019 Michael Bostock

Lisans bildirimi:

> Permission to use, copy, modify, and/or distribute this software for any purpose with or without fee is hereby granted, provided that the above copyright notice and this permission notice appear in all copies. THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.

### world-atlas

- Proje: World Atlas TopoJSON
- Kaynak: https://github.com/topojson/world-atlas
- Lisans: ISC
- Copyright 2013-2019 Michael Bostock

Lisans bildirimi:

> Permission to use, copy, modify, and/or distribute this software for any purpose with or without fee is hereby granted, provided that the above copyright notice and this permission notice appear in all copies. THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.

`world-atlas`, Natural Earth verisinin TopoJSON yeniden dağıtımını sağlar. Natural Earth raster ve vector verileri public domain'dir; attribution zorunlu değildir. Kaynak hakkında bilgi: https://www.naturalearthdata.com/about/terms-of-use/

## Electron ve binary dağıtımı

GGL geliştirme/runtime kabuğu Electron kullanır.

- Proje: Electron
- Kaynak: https://github.com/electron/electron
- Lisans: MIT
- Copyright (c) Electron contributors; Copyright (c) 2013-2020 GitHub Inc.

Kaynak repository tek başına Electron binary'sini yeniden dağıtmaz. İleride Windows/Linux/macOS kurulum paketi yayımlanırsa Electron/Chromium dağıtımında bulunan upstream lisans dosyaları ve üçüncü taraf bildirimleri (`LICENSE`, `LICENSES.chromium.html` ve kullanılan packager'ın ürettiği eşdeğer notice dosyaları) paketle birlikte korunmalıdır.

## Geliştirme araçları

TypeScript, Vite, Vitest, electron-vite ve diğer geliştirme/transitive bağımlılıkları npm üzerinden kurulur. Exact sürümler `package-lock.json` içindedir. Bu repository üçüncü taraf paket kaynaklarını vendor etmez; bağımlılık lisansları ilgili npm paketleri/repositoryleri tarafından sağlanır.

Yeni bir runtime bağımlılığı, veri seti veya vendor edilmiş kaynak eklendiğinde bu dosya gözden geçirilmelidir.
