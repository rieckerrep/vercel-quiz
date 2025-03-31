// useJokerLogic.ts
import { useState } from "react";

interface JokerState {
  xpBoostUsed: boolean;
  streakBoostUsed: boolean;
  fiftyFiftyUsed: boolean;
  hintUsed: boolean;
}

/**
 * Hook, der Joker-States verwaltet.
 */
export default function useJokerLogic() {
  const [jokerState, setJokerState] = useState<JokerState>({
    xpBoostUsed: false,
    streakBoostUsed: false,
    fiftyFiftyUsed: false,
    hintUsed: false,
  });

  // XP-Booster z. B. => doppelte XP bei der nächsten Frage
  // Streak-Booster => Extra-Logik bei Serie
  // 50:50 => Falsche Antworten ausblenden
  // hintUsed => z. B. Begründung anteasern

  // Aufruf, wenn man so einen Joker kauft
  function useJoker(jokerId: keyof JokerState) {
    setJokerState((prev) => ({ ...prev, [jokerId]: true }));
  }

  // Reset (bei nächster Frage)
  function resetJokers() {
    setJokerState({
      xpBoostUsed: false,
      streakBoostUsed: false,
      fiftyFiftyUsed: false,
      hintUsed: false,
    });
  }

  return { jokerState, useJoker, resetJokers };
}
