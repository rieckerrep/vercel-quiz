# RieckerRep Quiz-App

## Entwicklungsrichtlinien

### Datenbankregeln
- **Keine Hardcoded-Werte**: Alle Daten müssen aus der Supabase-Datenbank geladen werden
- **Keine Standardwerte**: Keine Default-Werte verwenden, die nicht aus der Datenbank kommen
- **React Query**: Für alle Datenbankabfragen `useQuery` verwenden
- **Typisierung**: Alle Typen aus `src/types/supabase.ts` importieren

### Tabellenstruktur
Die Anwendung nutzt folgende Haupttabellen:

#### Benutzerdaten
- `profiles`: Benutzerprofile (username, avatar_url)
- `user_stats`: Benutzerstatistiken (XP, Coins, Medaillen, etc.)

#### Quiz-Daten
- `questions`: Quizfragen und Antworten
- `answered_questions`: Beantwortete Fragen
- `chapters`: Kapitelstruktur
- `courses`: Kursorganisation

#### Spezielle Fragetypen
- `dragdrop_groups` & `dragdrop_pairs`: Drag&Drop-Fragen
- `cases_subquestions`: Fallbasierte Fragen
- `multiple_choice_options`: Multiple-Choice-Fragen

#### Gamification
- `league_positions`: Ligasystem
- `levels`: Levelsystem

### Beispiel für korrekten Datenbankzugriff
```typescript
import { Database } from "./types/supabase";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "./supabaseClient";

// Typen aus der Datenbank
type Profile = Database['public']['Tables']['profiles']['Row'];
type UserStats = Database['public']['Tables']['user_stats']['Row'];

// Datenbankabfrage mit useQuery
const { data: profile } = useQuery({
  queryKey: ['profile'],
  queryFn: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Nicht eingeloggt');
    
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
      
    if (error) throw error;
    return data as Profile;
  }
});
```

## Mobile Responsivität
- Die App muss auf allen Geräten funktionieren
- Optimiert für die Wix-App
- Anpassungsfähig für iFrame-Integration

## Deployment
- Integration in Wix-Frontend über "Wix Programs"
- Mögliche Einbindung über iFrame oder als HTML
