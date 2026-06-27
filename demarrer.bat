@echo off
:: Force la console Windows à utiliser l'encodage UTF-8 pour réparer les caractères accentués bugués
chcp 65001 >nul
title Script d'Automatisation de l'IDE Collaboratif
cls

echo ===================================================
echo    Lancement de l'IDE Collaboratif Synchrone
echo ===================================================
echo.

:: 1. Lancement du serveur backend Node.js dans une fenêtre séparée
echo [1/3] Lancement du serveur Backend Node.js...
start "Serveur Backend Node" cmd /k "chcp 65001 >nul && node backend.js"

:: Attente de 3 secondes pour s'assurer que le serveur est bien initialisé
timeout /t 3 /nobreak >nul

echo.
echo [2/3] Initialisation du tunnel public (Localtunnel)...
echo       Récupération automatique du lien en cours...

:: Définition du fichier temporaire dans un dossier local plutôt que les fichiers temporaires système
set "temp_tunnel_file=tunnel_temp.txt"
if exist "%temp_tunnel_file%" del "%temp_tunnel_file%"

:: On lance localtunnel et on force l'écriture immédiate
start /b cmd /c "npx localtunnel --port 8080 > "%temp_tunnel_file%""

:: Boucle d'attente active (maximum 8 secondes) pour laisser le temps au fichier de se créer et de se remplir
echo       Attente de la génération de l'URL...
set /a compteur=0
:attente
timeout /t 1 /nobreak >nul
set /a compteur+=1
if not exist "%temp_tunnel_file%" (
    if %compteur% lss 8 goto attente
)

:: Petite pause supplémentaire de sécurité pour que localtunnel finisse d'écrire la ligne
timeout /t 2 /nobreak >nul

:: Lecture du fichier temporaire si existant
set "raw_url="
if exist "%temp_tunnel_file%" (
    for /f "usebackq tokens=*" %%A in ("%temp_tunnel_file%") do (
        set "line=%%A"
        setlocal enabledelayedexpansion
        if not "!line:https://=!"=="!line!" set "raw_url=%%A"
        endlocal
    )
)

:: Nettoyage de l'URL pour ne garder que le sous-domaine (ex: twelve-walls-rhyme.loca.lt)
if not "%raw_url%"=="" (
    set "clean_url=%raw_url:https://=%"
    set "clean_url=%clean_url:http://=%"
    :: Supprime les espaces superflus s'il y en a
    set "clean_url=%clean_url: =%"
    
    echo.
    echo [Succès] URL publique détectée : %raw_url%
    echo [3/3] Génération automatique du lien de redirection...
    
    :: 3. Ouverture automatique du navigateur par défaut avec l'URL formatée
    echo       Ouverture de l'adresse : http://localhost:8080/?tunnel=%clean_url%
    start http://localhost:8080/?tunnel=%clean_url%
) else (
    echo.
    echo [Alerte] Impossible de lire l'URL automatiquement.
    echo Échec de création ou de lecture du fichier temporaire.
    echo Lancez manuellement : npx localtunnel --port 8080 dans un autre terminal.
)

:: Nettoyage final du fichier temporaire après lecture
if exist "%temp_tunnel_file%" del "%temp_tunnel_file%"

echo.
echo ===================================================
echo L'environnement est prêt. Laissez cette fenêtre ouverte.
echo ===================================================
echo.
pause
