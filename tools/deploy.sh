#!/bin/sh
# DreamHost'a yükle. Kullanım: tools/deploy.sh [KULLANICI@SUNUCU]   (varsayılan: koray@koraytoksoz.com)
# CSS/JS sürüm etiketini (?v=...) tarih-saatle yeniler, sonra yalnızca değişen dosyaları gönderir.
set -e
HOST=${1:-koray@koraytoksoz.com}
cd "$(dirname "$0")/.."
V=$(date +%Y%m%d%H%M)
sed -i '' -E "s/\?v=[0-9]+\"/?v=$V\"/g" index.html
echo "Sürüm etiketi: $V"
rsync -avz \
  --exclude tools --exclude README.md --exclude .DS_Store --exclude .git --exclude node_modules \
  ./ "$HOST:~/egitim.koraytoksoz.com/muzik/"
echo "Yüklendi: https://egitim.koraytoksoz.com/muzik/"
