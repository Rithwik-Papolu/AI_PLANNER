import React from 'react';

export default function GlossyIcon({
  icon: Icon,
  size = 20,
  variant = 'burgundy', // 'burgundy' | 'gold' | 'cream' | 'accent'
  className = '',
  containerSize = 'w-10 h-10',
  title
}) {
  if (!Icon) return null;

  const variantStyles = {
    burgundy: 'bg-gradient-to-br from-burgundy to-deep-maroon text-soft-ivory border-burgundy/40 shadow-glossy',
    gold: 'bg-gradient-to-br from-gold-light/60 to-gold text-deep-maroon border-gold/50 shadow-glossy-gold',
    cream: 'bg-gradient-to-br from-soft-ivory to-warm-beige text-deep-wine border-soft-border/70 shadow-sm',
    accent: 'bg-gradient-to-br from-deep-wine to-burgundy text-gold-light border-gold/30 shadow-glossy'
  };

  return (
    <div
      title={title}
      className={`relative inline-flex items-center justify-center rounded-full shrink-0 border ${containerSize} ${variantStyles[variant] || variantStyles.burgundy} ${className} transition-all duration-300 hover:scale-105`}
    >
      {/* Specular curved reflection sheen */}
      <span className="absolute top-0.5 inset-x-2 h-1/2 rounded-t-full bg-gradient-to-b from-white/35 to-transparent pointer-events-none" />
      <Icon size={size} className="relative z-10 drop-shadow-sm" />
    </div>
  );
}
