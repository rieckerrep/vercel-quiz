@echo off
REM Supabase Schema Dump Script (mit Passwort)

REM Setze Umgebungsvariable für das Datenbank-Passwort
set SUPABASE_DB_PASSWORD=KgnT4Mcss;Clapton1..

cd /d "C:\Users\marce\OneDrive\React-Entwicklungsumgebung\rieckerrepneu\supabase\sql-base"
echo Starte Dump von Supabase...

supabase db dump --schema public --password %SUPABASE_DB_PASSWORD% > schema.sql

echo Dump abgeschlossen: schema.sql aktualisiert.
pause
