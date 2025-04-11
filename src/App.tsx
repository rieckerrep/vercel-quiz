import React from 'react';
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

type Profile = Database['public']['Tables']['profiles']['Row'];
type UserStats = Database['public']['Tables']['user_stats']['Row'];

// Loading-Komponente
const LoadingScreen = () => (
  <div className="min-h-screen flex items-center justify-center text-lg">
    Lade...
  </div>
);

// Error-Komponente
const ErrorScreen = ({ message }: { message: string }) => (
  <div className="min-h-screen flex items-center justify-center text-lg text-red-500">
    Fehler: {message}
  </div>
);

// Wrapper-Komponente für die Navigation
function AppContent() {
  const navigate = useNavigate();
  const { user, isLoading: authLoading, initAuth } = useAuthStore();
  const { loadUserData, profile, userStats, isLoading: userLoading, error } = useUserStore();
  const { fetchQuestions } = useQuizStore();
  const { playCorrectSound, playWrongSound } = useSoundStore();

  // Auth initialisieren
  React.useEffect(() => {
    initAuth();
  }, [initAuth]);

  // User-Daten laden wenn sich der User ändert
  React.useEffect(() => {
    if (user?.id) {
      loadUserData(user.id);
    }
  }, [user?.id, loadUserData]);

  // Zeige Loading-Screen während Auth initialisiert wird
  if (authLoading) {
    return <LoadingScreen />;
  }

  // Zeige Login-Screen wenn kein User vorhanden ist
  if (!user) {
    return <LoginScreen onLogin={(userId) => loadUserData(userId)} />;
  }

  // Zeige Loading-Screen während User-Daten geladen werden
  if (userLoading) {
    return <LoadingScreen />;
  }

  // Zeige Error-Screen bei Fehlern
  if (error) {
    const errorMessage = typeof error === 'object' && error !== null && 'message' in error 
      ? (error as { message: string }).message 
      : String(error);
    return <ErrorScreen message={errorMessage} />;
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
