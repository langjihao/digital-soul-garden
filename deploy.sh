#!/usr/bin/env bash
# 一键部署：构建 → 冒烟测试 → 切换 release → 重启 → 线上验证，任一步失败自动回滚
# 用法: ./deploy.sh   （需 root，在仓库根目录执行）
set -euo pipefail

APP_DIR=/var/www/digital-soul-garden
SERVICE=digital-soul-garden.service
SMOKE_PORT=3002
PROD_URL=http://127.0.0.1:3000

cd "$(dirname "$0")"

echo "==> [1/5] 构建"
npm install --no-audit --no-fund >/dev/null
rm -rf .output
npm run build >/dev/null

echo "==> [2/5] 冒烟测试 (:$SMOKE_PORT)"
fuser -k $SMOKE_PORT/tcp 2>/dev/null || true
sleep 1
PORT=$SMOKE_PORT HOST=127.0.0.1 NODE_ENV=production node .output/server/index.mjs &>/tmp/deploy-smoke.log &
SMOKE_PID=$!
trap 'kill $SMOKE_PID 2>/dev/null || true' EXIT
sleep 5
for p in / /rss.xml /posts; do
  code=$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:$SMOKE_PORT$p")
  [ "$code" = 200 ] || { echo "✗ 冒烟失败: $p → $code（日志 /tmp/deploy-smoke.log）"; exit 1; }
done
kill $SMOKE_PID 2>/dev/null || true
trap - EXIT
echo "    通过"

echo "==> [3/5] 发布 release"
TS=$(date +%Y%m%d%H%M%S)
REL="$APP_DIR/releases/$TS"
PREV=$(readlink "$APP_DIR/current")
mkdir -p "$REL"
cp -r .output "$REL/.output"
chown -R www-data:www-data "$REL"
ln -sfn "$REL" "$APP_DIR/current"

echo "==> [4/5] 重启服务"
systemctl restart "$SERVICE"
sleep 4

echo "==> [5/5] 线上验证"
code=$(curl -s -o /dev/null -w '%{http_code}' "$PROD_URL/")
if [ "$code" != 200 ]; then
  echo "✗ 线上验证失败 ($code)，回滚到 $PREV"
  ln -sfn "$PREV" "$APP_DIR/current"
  systemctl restart "$SERVICE"
  exit 1
fi

# 保留最近 5 个 release
ls -dt "$APP_DIR"/releases/*/ | tail -n +6 | xargs -r rm -rf

echo "✓ 部署完成: $REL (回滚: ln -sfn $PREV $APP_DIR/current && systemctl restart $SERVICE)"
