@echo off
title Lanceur IDE Collaboratif Automatise
cls
echo ===================================================
echo    Lancement de Script - l'IDE Collaboratif Synchrone
echo ===================================================
echo.
echo Le serveur démarre... Localtunnel et le navigateur
echo vont s'ouvrir automatiquement d'ici quelques secondes.
echo.
echo Laissez cette fenêtre ouverte pour garder le serveur actif.
echo ===================================================
echo.

node backend.js

pause
