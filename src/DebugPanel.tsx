import { useState, useEffect } from "react";
import { useQuizContext } from './context/QuizContext';
import { useQuizData } from './hooks/useQuizData';
import { quizLogger } from "./EventLogger";

interface DebugPanelProps {
  isVisible: boolean;
  chapterId: number;
  userId: string;
}

const DebugPanel: React.FC<DebugPanelProps> = ({ isVisible, chapterId, userId }) => {
  const { 
    currentIndex, 
    roundXp, 
    roundCoins, 
    possibleRoundXp 
  } = useQuizContext();
  
  const { questions, isLoading: questionsLoading } = useQuizData(chapterId);
  const [events, setEvents] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'status' | 'events'>('status');
  
  // Events alle 2 Sekunden aktualisieren
  useEffect(() => {
    if (!isVisible) return;
    
    const intervalId = setInterval(() => {
      setEvents(quizLogger.getEvents());
    }, 2000);
    
    return () => clearInterval(intervalId);
  }, [isVisible]);
  
  // Initial einmal laden
  useEffect(() => {
    if (isVisible) {
      setEvents(quizLogger.getEvents());
    }
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gray-800 text-white p-4 z-50 opacity-90 max-h-60 overflow-auto">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-lg font-bold">Debug Panel</h2>
        <div className="flex gap-2">
          <button 
            className={`text-xs px-2 py-1 rounded ${activeTab === 'status' ? 'bg-blue-600' : 'bg-gray-600'}`}
            onClick={() => setActiveTab('status')}
          >
            Status
          </button>
          <button 
            className={`text-xs px-2 py-1 rounded ${activeTab === 'events' ? 'bg-blue-600' : 'bg-gray-600'}`}
            onClick={() => setActiveTab('events')}
          >
            Ereignisse
          </button>
          <div className="text-sm ml-4">User ID: {userId}</div>
        </div>
      </div>

      {activeTab === 'status' ? (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h3 className="text-sm font-bold">Quiz Status:</h3>
            <ul className="text-xs">
              <li>Frage: {currentIndex + 1} / {questions?.length || 0}</li>
              <li>XP: {roundXp} / {possibleRoundXp} ({Math.round((roundXp / possibleRoundXp || 1) * 100)}%)</li>
              <li>Münzen: {roundCoins}</li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-bold">Aktuelle Frage:</h3>
            {questionsLoading ? (
              <p>Lädt...</p>
            ) : !questions || questions.length === 0 ? (
              <p>Keine Fragen verfügbar</p>
            ) : currentIndex >= questions.length ? (
              <p>Ende erreicht</p>
            ) : (
              <div className="text-xs">
                <p>Typ: {questions[currentIndex].type}</p>
                <p>ID: {questions[currentIndex].id}</p>
                <p>Richtige Antwort: {questions[currentIndex]["Richtige Antwort"] || "N/A"}</p>
              </div>
            )}
          </div>
          
          <div className="col-span-2">
            <h3 className="text-sm font-bold">Supabase Status:</h3>
            <p className="text-xs">Verbunden: {navigator.onLine ? "✅" : "❌"}</p>
          </div>
        </div>
      ) : (
        <div>
          <div className="flex justify-between mb-2">
            <h3 className="text-sm font-bold">Letzte Ereignisse:</h3>
            <div>
              <button 
                className="text-xs px-2 py-1 bg-red-600 rounded mr-2"
                onClick={() => quizLogger.clearEvents()}
              >
                Löschen
              </button>
              <button 
                className="text-xs px-2 py-1 bg-green-600 rounded"
                onClick={() => {
                  const json = quizLogger.exportEvents();
                  const blob = new Blob([json], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `quiz-events-${new Date().toISOString()}.json`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                }}
              >
                Exportieren
              </button>
            </div>
          </div>
          <div className="text-xs overflow-auto max-h-32">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-700">
                  <th className="text-left p-1">Zeit</th>
                  <th className="text-left p-1">Typ</th>
                  <th className="text-left p-1">Nachricht</th>
                </tr>
              </thead>
              <tbody>
                {events.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="text-center p-2">Keine Ereignisse</td>
                  </tr>
                ) : (
                  events.map((event, index) => (
                    <tr key={index} className={index % 2 === 0 ? 'bg-gray-700' : ''}>
                      <td className="p-1">{new Date(event.timestamp).toLocaleTimeString()}</td>
                      <td className="p-1 uppercase">{event.type}</td>
                      <td className="p-1">{event.message}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default DebugPanel; 