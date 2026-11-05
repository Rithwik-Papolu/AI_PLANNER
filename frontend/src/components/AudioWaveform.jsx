import React from 'react';

export default function AudioWaveform({ isActive = false, isSpeaking = false }) {
  const bars = [30, 65, 45, 85, 100, 75, 40, 90, 60, 35, 80, 50, 70, 95, 40, 20];

  return (
    <div className="flex items-center justify-center gap-1.5 h-16 px-4">
      {bars.map((height, idx) => {
        const animatedHeight = isActive || isSpeaking ? `${height}%` : '15%';
        const delay = `${(idx * 0.08).toFixed(2)}s`;
        const color = isSpeaking
          ? 'from-gold to-gold-light'
          : isActive
          ? 'from-burgundy to-deep-wine'
          : 'from-muted-brown/30 to-muted-brown/20';

        return (
          <div
            key={idx}
            className={`w-1.5 rounded-full bg-gradient-to-t ${color} transition-all duration-300 shadow-sm`}
            style={{
              height: animatedHeight,
              animation: (isActive || isSpeaking) ? `pulse 1.2s infinite ease-in-out alternate` : 'none',
              animationDelay: delay
            }}
          />
        );
      })}
    </div>
  );
}
