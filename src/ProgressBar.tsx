interface ProgressBarProps {
  progress: number; // Wert zwischen 0 und 100
}

function ProgressBar({ progress }: ProgressBarProps) {
  // Stelle sicher, dass der Fortschritt zwischen 0 und 100 liegt
  const clampedProgress = Math.min(Math.max(progress, 0), 100);
  
  return (
    <div className="w-full bg-gray-200 rounded-full h-2.5">
      <div 
        className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-in-out" 
        style={{ width: `${clampedProgress}%` }}
      ></div>
    </div>
  );
}

export default ProgressBar; 