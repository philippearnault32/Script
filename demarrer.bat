@off
title Lancement IDE Collaboratif
echo [1/3] Demarrage du serveur Node.js backend...
start /b node backend.js

echo [2/3] Ouverture du tunnel internet...
echo --------------------------------------------------
echo ATTENTION : Patiente quelques secondes que le lien s'affiche, 
echo copie-le, puis ferme cette fenetre pour quitter.
echo --------------------------------------------------
start /b npx lt --port 8080

echo [3/3] Ouverture de l'interface dans le navigateur...
timeout /t 3 /nobreak >nul
start index.html
