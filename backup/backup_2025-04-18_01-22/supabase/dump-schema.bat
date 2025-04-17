@echo off
REM ✅ Supabase Schema Dump Script mit Datum, Passwort und Zielordner

REM 🔐 Supabase Passwort (SERVICE ROLE oder DB Passwort)
set SUPABASE_DB_PASSWORD=KgnT4Mcss;Clapton1..

REM 📁 Zielordner für Backups
set BACKUP_DIR=C:\Users\marce\OneDrive\React-Entwicklungsumgebung\rieckerrepneu\supabase\sql-base

REM 📅 Datum im Format yyyy-MM-dd
for /f %%i in ('powershell -NoProfile -Command "Get-Date -Format yyyy-MM-dd"') do set DATUM=%%i

REM 📂 Ordner erstellen, falls nicht vorhanden
if not exist "%BACKUP_DIR%" (
    mkdir "%BACKUP_DIR%"
)

REM 📥 Projektverzeichnis setzen (dort wo supabase config ist)
cd /d "C:\Users\marce\OneDrive\React-Entwicklungsumgebung\rieckerrepneu"

REM 📄 Dump ausführen
echo 🧠 Starte Supabase Dump...
supabase db dump --schema public --password %SUPABASE_DB_PASSWORD% > "%BACKUP_DIR%\schema_.sql"

REM ✅ Abschlussmeldung
echo ✅ Dump abgeschlossen: %BACKUP_DIR%\schema_%DATUM%.sql
pause
