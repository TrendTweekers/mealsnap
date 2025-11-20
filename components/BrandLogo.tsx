import React from 'react';

type BrandLogoProps = {
  size?: 'sm' | 'md' | 'lg';
  withGlow?: boolean;
  className?: string;
};

const sizeMap: Record<NonNullable<BrandLogoProps['size']>, string> = {
  sm: 'h-6 w-6',
  md: 'h-8 w-8',
  lg: 'h-10 w-10',
};

export function BrandLogo({
  size = 'md',
  withGlow = false,
  className = '',
}: BrandLogoProps) {
  return (
    <div
      className={[
        'inline-flex items-center justify-center rounded-2xl bg-slate-950/80 border border-emerald-400/60',
        withGlow ? 'shadow-[0_0_18px_rgba(45,212,191,0.45)]' : '',
        'p-[3px]',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <img
        src="/logo-chefai.png"
        alt="ChefAI logo"
        className={`${sizeMap[size]} object-contain`}
      />
    </div>
  );
}

