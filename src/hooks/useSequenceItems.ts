import { supabase } from '../supabaseClient';
import React from 'react';

// Definiert die Struktur eines SequenceItems für die Anwendung
export interface SequenceItem {
  id: string | number;
  question_id: number;
  text: string;
  correctPosition: number;
  level?: string;
}

/**
 * Hook zum direkten Abfragen der sequence_items Tabelle
 * @param questionId ID der zugehörigen Frage
 * @returns Die formatierten SequenceItems sowie Lade- und Fehlerstatus
 */
export function useSequenceItems(questionId?: number) {
  console.log("[useSequenceItems] Wird aufgerufen mit questionId:", questionId);
  
  const [items, setItems] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<any>(null);

  React.useEffect(() => {
    if (!questionId) {
      setItems([]);
      setLoading(false);
      return;
    }

    const fetchItems = async () => {
      try {
        setLoading(true);
        console.log(`[useSequenceItems] Starte Abfrage für Frage ${questionId}`);
        
        // Versuche die Items direkt zu laden ohne Überprüfung der Frage-Existenz
        // Dies sollte weniger Probleme mit RLS verursachen
        const { data, error } = await supabase
          .from('sequence_items')
          .select('*')
          .eq('question_id', questionId);
        
        if (error) {
          console.error('[useSequenceItems] Fehler beim Laden der Items:', error);
          
          // Wenn ein Fehler auftritt, verwenden wir direkt Standard-Items
          // ohne zu versuchen, sie in die Datenbank zu speichern
          console.log('[useSequenceItems] Verwende lokale Standard-Items wegen Fehler');
          const defaultItems = createDefaultItemsWithIds(questionId);
          setItems(defaultItems);
        } else {
          console.log('[useSequenceItems] Daten erhalten:', data);
          
          if (data && data.length > 0) {
            setItems(data);
          } else {
            // Wenn keine Items gefunden wurden, erstellen wir Standard-Items
            console.log('[useSequenceItems] Keine Items gefunden, erstelle Standard-Items');
            
            const defaultItems = createDefaultItems(questionId);
            
            // Versuche, die Standard-Items in der Datenbank zu speichern
            try {
              const { error: insertError } = await supabase
                .from('sequence_items')
                .insert(defaultItems);
              
              if (insertError) {
                console.error('[useSequenceItems] Fehler beim Speichern der Standard-Items:', insertError);
                // Bei Fehlern verwenden wir die Items trotzdem im Frontend
                const defaultItemsWithIds = createDefaultItemsWithIds(questionId);
                setItems(defaultItemsWithIds);
              } else {
                console.log('[useSequenceItems] Standard-Items erfolgreich gespeichert');
                // Lade die gerade gespeicherten Items
                const { data: newItems } = await supabase
                  .from('sequence_items')
                  .select('*')
                  .eq('question_id', questionId);
                
                if (newItems && newItems.length > 0) {
                  setItems(newItems);
                } else {
                  // Fallback falls das erneute Laden fehlschlägt
                  const defaultItemsWithIds = createDefaultItemsWithIds(questionId);
                  setItems(defaultItemsWithIds);
                }
              }
            } catch (insertErr) {
              console.error('[useSequenceItems] Exception beim Speichern:', insertErr);
              // Bei Ausnahmen verwenden wir die Items trotzdem im Frontend
              const defaultItemsWithIds = createDefaultItemsWithIds(questionId);
              setItems(defaultItemsWithIds);
            }
          }
        }
      } catch (err) {
        console.error('[useSequenceItems] Allgemeine Exception:', err);
        // Bei allgemeinen Ausnahmen verwenden wir Standard-Items
        const defaultItemsWithIds = createDefaultItemsWithIds(questionId);
        setItems(defaultItemsWithIds);
      } finally {
        setLoading(false);
      }
    };

    fetchItems();
  }, [questionId]);
  
  /**
   * Erstellt Standard-Items für eine Frage (für Datenbank-Speicherung)
   */
  const createDefaultItems = (qId: number): any[] => {
    // Beispiel: Erstelle ein einfaches Schema für BGB-Prüfung
    return [
      { 
        question_id: qId, 
        text: "Anspruch entstanden", 
        correct_position: 1, 
        level: "I" 
      },
      { 
        question_id: qId, 
        text: "Anspruch durchsetzbar", 
        correct_position: 2, 
        level: "I" 
      },
      { 
        question_id: qId, 
        text: "Ergebnis", 
        correct_position: 3, 
        level: "I" 
      }
    ];
  };
  
  /**
   * Erstellt Standard-Items mit simulierten IDs (für Frontend-Anzeige bei Fehlern)
   */
  const createDefaultItemsWithIds = (qId: number): any[] => {
    return [
      { 
        id: `local-${qId}-1`,
        question_id: qId, 
        text: "Anspruch entstanden", 
        correct_position: 1, 
        level: "I" 
      },
      { 
        id: `local-${qId}-2`,
        question_id: qId, 
        text: "Anspruch durchsetzbar", 
        correct_position: 2, 
        level: "II" 
      },
      { 
        id: `local-${qId}-3`,
        question_id: qId, 
        text: "Ergebnis", 
        correct_position: 3, 
        level: "III" 
      }
    ];
  };
  
  // Formatiere die Daten für die Anwendung
  const formattedItems = React.useMemo(() => {
    return items.map(item => ({
      id: String(item.id || Math.random()),
      text: item.text || "",
      correctPosition: Number(item.correct_position || 0),
      level: String(item.level || "I"),
      question_id: Number(item.question_id || 0)
    }));
  }, [items]);
  
  return {
    data: formattedItems,
    isLoading: loading,
    error
  };
}

export default useSequenceItems; 