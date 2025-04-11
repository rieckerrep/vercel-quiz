@echo off
cd /d "C:\Users\marce\OneDrive\React-Entwicklungsumgebung\rieckerrepneu"
node backup.js
echo Backup abgeschlossen um: %date% %time% >> backup_log.txt 