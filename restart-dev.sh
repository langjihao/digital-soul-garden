#!/bin/bash
# Restart the garden-next dev server cleanly. Safe to call repeatedly.
cd /root/dev/garden-next
fuser -k 3001/tcp 2>/dev/null
pkill -f 'node_modules/.bin/nuxt' 2>/dev/null
sleep 2
pkill -9 -f 'node_modules/.bin/nuxt' 2>/dev/null
nohup npx nuxt dev --port 3001 --host 127.0.0.1 > dev.log 2>&1 &
disown
for i in $(seq 1 40); do
  sleep 3
  code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 http://127.0.0.1:3001/ 2>/dev/null)
  if [ "$code" = "200" ]; then echo "READY after ~$((i*3))s"; exit 0; fi
done
echo "TIMEOUT (last=$code)"; tail -15 dev.log; exit 1
