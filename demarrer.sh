#!/bin/bash

echo "[1/2] Démarrage du serveur Node.js..."
# Lance le backend en arrière-plan et récupère son identifiant (PID)
node backend.js &
PID_NODE=$!

echo "[2/2] Génération du tunnel internet..."
echo "--------------------------------------------------"
echo "Connexion aux serveurs Localtunnel en cours..."
echo "Une fenêtre de navigateur va s'ouvrir automatiquement."
echo "--------------------------------------------------"

# Lance localtunnel et lit sa sortie ligne par ligne en direct
npx lt --port 8080 | while read -r line; do
    # Si la ligne contient "url:", on extrait l'adresse
    if [[ "$line" == *"url:"* ]]; then
        URL=$(echo "$line" | awk '{print $2}')
        
        # Nettoyage de l'URL pour enlever le https://
        CLEAN_URL=$(echo "$URL" | sed -e 's/https:\/\///' -e 's/http:\/\///')
        
        echo "Lien généré : $URL"
        echo "Ouverture de l'IDE..."
        
        # Détection de l'OS pour ouvrir le navigateur avec le paramètre automatique
        if [[ "$OSTYPE" == "darwin"* ]]; then
            open "index.html?tunnel=$CLEAN_URL"
        else
            xdg-open "index.html?tunnel=$CLEAN_URL" 2>/dev/null || sensible-browser "index.html?tunnel=$CLEAN_URL"
        fi
        break
    fi
done

# Permet de couper proprement le serveur Node.js quand on ferme le terminal (Ctrl+C)
trap "kill $PID_NODE; exit" INT TERM
wait
