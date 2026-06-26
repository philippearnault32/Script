#!/bin/bash

# Couleurs pour les messages dans le terminal
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # Pas de couleur

echo -e "${BLUE}=== IDE Collaboratif - Script de démarrage ===${NC}"

# 1. Vérification de la présence de Node.js
if ! command -v node &> /dev/null
then
    echo -e "${RED}[Erreur] Node.js n'est pas installé sur cette machine.${NC}"
    echo "Veuillez l'installer pour lancer le serveur."
    exit 1
fi

# 2. Vérification et installation automatique des dépendances
if [ ! -d "node_modules/ws" ]; then
    echo -e "${BLUE}[Info] Dépendance 'ws' manquante. Installation en cours...${NC}"
    npm install ws
    if [ $? -ne 0 ]; then
        echo -e "${RED}[Erreur] Échec de l'installation des dépendances.${NC}"
        exit 1
    fi
    echo -e "${GREEN}[Succès] Dépendances installées avec succès.${NC}"
fi

# 3. Lancement du serveur backend
echo -e "${GREEN}[Serveur] Lancement du backend...${NC}"
node backend.js
