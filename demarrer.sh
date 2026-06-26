#!/bin/bash
echo "[1/3] Démarrage du serveur Node.js..."
node backend.js &

echo "[2/3] Ouverture du tunnel internet..."
npx lt --port 8080 &

echo "[3/3] Ouverture du navigateur..."
sleep 3
open index.html || xdg-open index.html
