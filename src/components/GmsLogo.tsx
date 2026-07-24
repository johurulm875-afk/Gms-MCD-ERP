import React from 'react';

interface GmsLogoProps {
  className?: string;
  size?: number;
}

export const GmsLogo: React.FC<GmsLogoProps> = ({ className = "w-8 h-8", size = 32 }) => {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 200 200" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={`${className} shrink-0`}
    >
      {/* Background container with rounded border */}
      <rect width="200" height="200" rx="24" fill="#FFFFFF" />
      
      {/* Outer M structure (Left and Right vertical bars and diagonal strokes) */}
      <path d="M 20 180 L 20 20 L 55 20 L 55 180 Z" fill="#0F172A" />
      <path d="M 145 180 L 145 20 L 180 20 L 180 180 Z" fill="#0F172A" />
      <path d="M 20 20 L 100 100 L 120 80 L 40 20 Z" fill="#0F172A" />
      <path d="M 180 20 L 100 100 L 80 80 L 160 20 Z" fill="#0F172A" />

      {/* Circle Ring Outer */}
      <circle cx="100" cy="100" r="65" stroke="#64748B" strokeWidth="22" fill="none" />
      
      {/* Light Blue Accent Quadrant (Bottom-Left) */}
      <path d="M 100 100 L 35 100 A 65 65 0 0 0 100 165 Z" fill="#93C5FD" />

      {/* Grid Lines in Circle */}
      <line x1="100" y1="20" x2="100" y2="180" stroke="#0F172A" strokeWidth="3" />
      <line x1="88" y1="20" x2="88" y2="180" stroke="#0F172A" strokeWidth="3" />
      <line x1="112" y1="20" x2="112" y2="180" stroke="#0F172A" strokeWidth="3" />
      
      <line x1="20" y1="92" x2="180" y2="92" stroke="#0F172A" strokeWidth="3" />
      <line x1="20" y1="108" x2="180" y2="108" stroke="#0F172A" strokeWidth="3" />

      {/* Diagonal Spoke Lines */}
      <line x1="50" y1="50" x2="150" y2="150" stroke="#0F172A" strokeWidth="3" />
      <line x1="150" y1="50" x2="50" y2="150" stroke="#0F172A" strokeWidth="3" />

      {/* Inner White Circle Hole */}
      <circle cx="100" cy="100" r="32" fill="#FFFFFF" />

      {/* Center Red Horizontal Bar */}
      <rect x="55" y="92" width="90" height="16" fill="#DC2626" rx="2" />
    </svg>
  );
};
