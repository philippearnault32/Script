#!/bin/bash

# Dépendance système requise sous Linux pour le presse-papiers : xclip ou xsel
# Si vous êtes sur Ubuntu/Debian : sudo apt-get install xclip

PORT=8080

echo "=== Lancement du serveur Backend ==="
node backend.js &
SERVER_PID=$!

# Attendre 1 seconde que le serveur s'initialise
sleep 1

echo "=== Création du tunnel public (Localtunnel) ==="
# On installe localtunnel localement si absent
if ! npx lt --version &> /dev/null; then
    echo "Installation temporaire de localtunnel..."
fi

# Lancement du tunnel et capture de l'URL
URL=$(npx lt --port $PORT --print-requests | head -n 1 | grep -o 'https://[^ ]*')

if [ -z "$URL" ]; then
    # Deuxième tentative de capture si la première a été trop rapide
    sleep 2
    URL=$(npx lt --port $PORT | grep -o 'https://[^ ]*')
fi

if [ ! -z "$URL" ]; then
    echo -e "\n\n==============================================="
    echo -e "🔗 URL de votre espace de travail : \033[0;32m$URL\033[0m"
    echo -e "📋 L'URL a été COPIÉE automatiquement dans votre presse-papiers !"
    echo -e "===============================================\n"
    
    # Copie dans le presse-papiers selon l'OS
    if command -v pbcopy &> /dev/null; then
        echo -n "$URL" | pbcopy # Mac
    elif command -v xclip &> /dev/null; then
        echo -n "$URL" | xclip -selection clipboard # Linux
    elif command -v xsel &> /dev/null; then
        echo -n "$URL" | xsel --clipboard --input # Linux alternatif
    fi
else
    echo "Impossible de récupérer l'URL du tunnel automatiquement."
fi

# Maintenir le script parent actif pour le serveur
wait $SERVER_PID
