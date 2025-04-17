#!/usr/bin/env bash

INPUT_FILE="all_functions.sql"
OUTPUT_DIR="supabase/functions"

# 1) Zielordner anlegen
mkdir -p "$OUTPUT_DIR"
export OUTPUT_DIR

# 2) Split-Skript
awk '
  BEGIN {
    IGNORECASE = 1      # Groß/Kleinschreibung ignorieren
    inside = 0
    filename = ""
  }

  # Funktionskopf erkennen (CREATE [OR REPLACE] FUNCTION ...)
  /^\s*create([[:space:]]+or[[:space:]]+replace)?[[:space:]]+function/ {
    inside = 1

    # Versuch erst schema."name" oder schema.name
    if (match($0, /function[[:space:]]+("[^"]+"|\w+)\.("[^"]+"|\w+)/, arr)) {
      raw = arr[2]
    }
    # Fallback: nur "name" oder name
    else if (match($0, /function[[:space:]]+("[^"]+"|\w+)/, arr2)) {
      raw = arr2[1]
    }
    # rohe Quotes wegnehmen
    gsub(/^"|"$/, "", raw)

    if (raw != "") {
      filename = ENVIRON["OUTPUT_DIR"] "/" raw ".sql"
      print "-- File: " raw ".sql" > filename
      print $0 >> filename   # Funktionskopf in die Datei
    }
    next
  }

  {
    # Wenn wir in einer Funktion sind, alles mitspeichern
    if (inside && filename != "") {
      print $0 >> filename
    }
  }

  # Funktionsende erkennen: $$; oder $$ LANGUAGE ...
  /^\s*\$\$\s*;?\s*$/ {
    if (inside && filename != "") {
      inside = 0
      filename = ""
    }
  }
' "$INPUT_FILE"