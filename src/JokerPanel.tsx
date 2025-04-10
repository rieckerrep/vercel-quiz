// JokerPanel.tsx
import { xpBoostIcon, streakBoostIcon, fiftyFiftyIcon } from "./assets/images";

interface JokerPanelProps {
  xpBoostUsed: boolean;
  streakBoostUsed: boolean;
  hintUsed: boolean;
  fiftyFiftyUsed: boolean;
  handleXpBoostClick: () => void;
  handleStreakBoostClick: () => void;
  handleHintClick: () => void;
  handleFiftyFiftyClick: () => void;
  disabled?: boolean;
}

export default function JokerPanel({
  xpBoostUsed,
  streakBoostUsed,
  hintUsed,
  fiftyFiftyUsed,
  handleXpBoostClick,
  handleStreakBoostClick,
  handleHintClick,
  handleFiftyFiftyClick,
  disabled = false,
}: JokerPanelProps) {
  // Joker-Konfiguration
  const jokers = [
    {
      id: "xpBoost",
      used: xpBoostUsed,
      onClick: handleXpBoostClick,
      icon: xpBoostIcon,
      alt: "XP-Booster",
      class: "bg-yellow-400 text-black",
    },
    {
      id: "streakBoost",
      used: streakBoostUsed,
      onClick: handleStreakBoostClick,
      icon: streakBoostIcon,
      alt: "Streak-Booster",
      class: "bg-yellow-400 text-black",
    },
    {
      id: "fiftyFifty",
      used: fiftyFiftyUsed,
      onClick: handleFiftyFiftyClick,
      icon: fiftyFiftyIcon,
      alt: "50/50-Joker",
      class: "bg-blue-500 text-white",
    },
    {
      id: "hint",
      used: hintUsed,
      onClick: handleHintClick,
      icon: "check",
      alt: "Hinweis",
      class: "bg-green-500 text-white",
    },
  ];

  return (
    <div className="flex flex-col md:flex-row gap-2 md:gap-4 p-2 md:p-0">
      {jokers.map((joker) => {
        const isDisabled = disabled || joker.used;
        return (
          <button
            key={joker.id}
            className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center font-bold shadow-lg ${
              joker.class
            } ${isDisabled ? "opacity-50" : "hover:scale-105 active:scale-95 transition-transform"}`}
            onClick={joker.onClick}
            disabled={isDisabled}
            title={joker.alt}
          >
            {joker.icon === "check" ? (
              <svg className="h-5 w-5 md:h-6 md:w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <img src={joker.icon} alt={joker.alt} className="w-6 h-6 md:w-8 md:h-8" />
            )}
          </button>
        );
      })}
    </div>
  );
}
