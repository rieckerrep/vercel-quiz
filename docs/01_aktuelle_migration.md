# Aktuelle Migration: Backend-Integration

## 1. Grundlegende Funktionen

### 1.1 Antwortvalidierung
- [ ] Migration der Antwortvalidierung ins Backend
- [ ] Implementierung für alle Fragetypen:
  - Multiple Choice
  - True/False
  - Drag & Drop
  - Gap Text
- [ ] Anti-Cheat-System implementieren

### 1.2 XP- und Coin-Berechnung
- [ ] Migration der XP-Berechnung
- [ ] Migration der Coin-Berechnung
- [ ] Implementierung der Level-Up-Logik

### 1.3 Fortschrittsverfolgung
- [ ] Migration der Fortschrittsberechnung
- [ ] Kapitelabschluss-Logik
- [ ] Streak-Berechnung

## 2. Backend-Funktionen

### 2.1 Neue RPC-Funktionen
```sql
-- Antwortvalidierung
validate_answer(user_id, question_id, answer)

-- XP/Coin-Berechnung
calculate_rewards(user_id, question_id, is_correct)

-- Fortschrittsaktualisierung
update_progress(user_id, chapter_id)
```

### 2.2 Sicherheitsmaßnahmen
- [ ] Row Level Security (RLS) implementieren
- [ ] Anti-Farming-Schutz
- [ ] Rate Limiting

### 2.3 Performance-Optimierungen
- [ ] Indizes für häufige Abfragen
- [ ] Materialized Views für Statistiken
- [ ] Caching-Strategien

## 3. Frontend-Anpassungen

### 3.1 API-Service
- [ ] Neue API-Endpunkte implementieren
- [ ] Fehlerbehandlung verbessern
- [ ] Loading-States hinzufügen

### 3.2 State Management
- [ ] Zustand-Store anpassen
- [ ] Neue Actions implementieren
- [ ] Reducer aktualisieren

### 3.3 UI-Komponenten
- [ ] Loading-Indikatoren
- [ ] Fehlermeldungen
- [ ] Erfolgsmeldungen

## 4. Testplan

### 4.1 Unit Tests
- [ ] Backend-Funktionen
- [ ] Frontend-Komponenten
- [ ] API-Integration

### 4.2 Integration Tests
- [ ] End-to-End Tests
- [ ] Performance Tests
- [ ] Sicherheitstests

## 5. Deployment

### 5.1 Vorbereitung
- [ ] Datenbank-Backup
- [ ] Migration-Skripte
- [ ] Rollback-Plan

### 5.2 Durchführung
- [ ] Schrittweise Migration
- [ ] Monitoring
- [ ] Fehlerbehebung

## 6. Dokumentation

### 6.1 Technische Dokumentation
- [ ] API-Dokumentation
- [ ] Datenbank-Schema
- [ ] Sicherheitsrichtlinien

### 6.2 Benutzerdokumentation
- [ ] Änderungsprotokoll
- [ ] Neue Funktionen
- [ ] Bekannte Probleme 