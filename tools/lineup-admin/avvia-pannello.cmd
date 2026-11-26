@echo off
title Prima del Fischio - Formazioni
echo Apri http://127.0.0.1:8787 nel browser.
echo Mantieni questa finestra aperta mentre usi il pannello.
"C:\Program Files\nodejs\node.exe" "%~dp0server.cjs"
if errorlevel 1 pause
