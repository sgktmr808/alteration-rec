#!/bin/bash
echo "ファイルをコピー中..."
cp ~/Downloads/index.html ./index.html 2>/dev/null && echo "index.html OK" || echo "index.html なし"
cp ~/Downloads/sw.js ./sw.js 2>/dev/null && echo "sw.js OK" || echo "sw.js なし"
cp ~/Downloads/clear.html ./clear.html 2>/dev/null
cp ~/Downloads/recover.html ./recover.html 2>/dev/null
git add -A
git commit -m "update $(date '+%Y-%m-%d %H:%M')"
git push
echo "✅ デプロイ完了"
