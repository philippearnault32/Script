@echo off
title Lanceur IDE Collaboratif Automatise
cls
echo ===================================================
echo    Lancement de l'IDE Collaboratif Synchrone
echo ===================================================
echo.
echo Le serveur démarre... 
echo Le navigateur s'ouvrira TOUT SEUL dès que le lien sera disponible.
echo.
echo Laissez cette fenêtre ouverte pour garder le serveur actif.
echo ===================================================
echo.

node backend.js

pause
