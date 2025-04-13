import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import { QuizContainer } from "./QuizContainer";
import { useUserStore } from './store/useUserStore';
import { useQuizStore } from './store/useQuizStore';
import { useSoundStore } from './store/useSoundStore';
import { useAuthStore } from './store/useAuthStore';
import "./index.css";
import { LoginScreen } from "./LoginScreen";
import ProfileScreen from "./ProfileScreen";
import ShopScreen from "./ShopScreen";
import LeaderboardOverlay from "./LeaderboardOverlay";
import { Toaster } from 'react-hot-toast';
import { Database } from './lib/supabase';
import { useUserData } from './store/useUserStore';

type Profile = Database['public']['Tables']['profiles']['Row'];
type UserStats = Database['public']['Tables']['user_stats']['Row'];

// Loading-Komponente
const LoadingScreen = () => (
  <div className="min-h-screen flex items-center justify-center text-lg">
    <div className="flex flex-col items-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mb-4"></div>
      <p>Lade...</p>
    </div>
  </div>
);

// Error-Komponente
const ErrorScreen = ({ message }: { message: string | Error }) => (
  <div className="min-h-screen flex items-center justify-center text-lg text-red-500">
    <div className="flex flex-col items-center">
      <svg className="w-12 h-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <p>Fehler: {typeof message === 'string' ? message : message.message}</p>
      <button 
        onClick={() => window.location.reload()} 
        className="mt-4 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
      >
        Neu laden
      </button>
    </div>
  </div>
);

// Wrapper-Komponente für die Navigation
function AppContent() {
  const navigate = useNavigate();
  const { user, isLoading: authLoading, error: authError, initAuth } = useAuthStore();
  const { profile, userStats, isLoading: userLoading, error: userError, loadUserData } = useUserData(user?.id || '');
  const { fetchQuestions } = useQuizStore();
  const { playCorrectSound, playWrongSound } = useSoundStore();

  // Auth initialisieren mit verbesserter Fehlerbehandlung
  React.useEffect(() => {
    const initializeAuth = async () => {
      try {
        await initAuth();
      } catch (error) {
        console.error('Fehler bei der Auth-Initialisierung:', error);
        // Optional: Hier könntest du eine Benachrichtigung anzeigen
      }
    };

    initializeAuth();
  }, [initAuth]);

  // User-Daten laden mit verbesserter Fehlerbehandlung
  React.useEffect(() => {
    const loadData = async () => {
      if (user?.id) {
        try {
          await loadUserData();
        } catch (error) {
          console.error('Fehler beim Laden der Benutzerdaten:', error);
          // Optional: Hier könntest du eine Benachrichtigung anzeigen
        }
      }
    };

    loadData();
  }, [user?.id, loadUserData]);

  // Ladezustand oder Fehler anzeigen mit verbesserter Benutzerführung
  if (authLoading || userLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-lg">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mb-4"></div>
          <p>Lade...</p>
        </div>
      </div>
    );
  }

  if (authError) {
    return (
      <div className="min-h-screen flex items-center justify-center text-lg text-red-500">
        <div className="flex flex-col items-center">
          <svg className="w-12 h-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p>Fehler bei der Authentifizierung: {authError}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          >
            Neu laden
          </button>
        </div>
      </div>
    );
  }

  if (userError) {
    return (
      <div className="min-h-screen flex items-center justify-center text-lg text-red-500">
        <div className="flex flex-col items-center">
          <svg className="w-12 h-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p>Fehler beim Laden der Benutzerdaten: {typeof userError === 'string' ? userError : userError.message}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          >
            Neu laden
          </button>
        </div>
      </div>
    );
  }

  // Zeige Login-Screen wenn kein User vorhanden ist
  if (!user) {
    return <LoginScreen onLogin={(userId) => loadUserData()} />;
  }

  return (
    <div className="relative min-h-screen w-full">
      <Routes>
        <Route 
          path="/" 
          element={
            <QuizContainer 
              user={user}
              profile={profile as Profile}
              userStats={userStats as UserStats}
              onOpenProfile={() => navigate("/profile")}
              onOpenShop={() => navigate("/shop")}
              onOpenLeaderboard={() => navigate("/leaderboard")}
              onOpenSettings={() => navigate("/settings")}
            />
          } 
        />
        <Route 
          path="/profile" 
          element={
            <ProfileScreen
              onBack={() => navigate("/")}
              user={user}
              profile={profile}
              userStats={userStats}
            />
          }
        />
        <Route 
          path="/shop" 
          element={
            <ShopScreen
              user={user}
              onClose={() => navigate("/")}
              onOpenProfile={() => navigate("/profile")}
            />
          }
        />
        <Route 
          path="/leaderboard" 
          element={
            <LeaderboardOverlay
              onClose={() => navigate("/")}
            />
          }
        />
      </Routes>
      <Toaster
        containerClassName="quiz-toaster-container"
        toastOptions={{
          className: 'quiz-toast',
          position: 'bottom-left',
          duration: 3000,
          style: {
            background: 'rgba(51, 51, 51, 0.9)',
            color: '#fff',
            borderRadius: '10px',
            padding: '16px',
            fontSize: '14px',
            maxWidth: '400px',
            border: '1px solid #ffc107'
          },
        }}
      />
    </div>
  );
}

// Haupt-App-Komponente
function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
