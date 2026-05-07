import React from 'react';

interface MomentumRingProps {
  score: number;
  size?: number;
  strokeWidth?: number;
}

export function MomentumRing({ score, size = 64, strokeWidth = 6 }: MomentumRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  // Normalisation du score entre 0 et 100
  const normalizedScore = Math.min(100, Math.max(0, score));
  const offset = circumference - (normalizedScore / 100) * circumference;

  // Apparence conditionnelle de la courronne Momentum : Bleu -> Vert -> Or
  let colorClass = 'text-blue-500';
  if (normalizedScore >= 40 && normalizedScore < 70) {
    colorClass = 'text-emerald-500';
  } else if (normalizedScore >= 70) {
    colorClass = 'text-yellow-500';
  }

  return (
    <div className="relative inline-flex items-center justify-center flex-col" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90 w-full h-full" viewBox={`0 0 ${size} ${size}`}>
        {/* Cercle de fond */}
        <circle
          className="text-slate-700"
          strokeWidth={strokeWidth}
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        {/* Cercle de progression Momentum */}
        <circle
          className={`${colorClass} transition-all duration-1000 ease-out`}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
      </svg>
      {/* Affichage chiffré central */}
      <span className="absolute text-sm font-bold text-white transition-colors duration-500">
        {normalizedScore}
      </span>
    </div>
  );
}
