import React from 'react';

interface BrandMarkProps {
  collapsed?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const BrandMark: React.FC<BrandMarkProps> = ({
  collapsed = false,
  size = 'md',
}) => {
  const iconDim = size === 'sm' ? 24 : size === 'lg' ? 36 : 28;
  const textClass =
    size === 'sm'
      ? 'text-sm'
      : size === 'lg'
        ? 'text-xl'
        : 'text-[15px]';

  return (
    <span className="inline-flex items-center gap-2.5 whitespace-nowrap shrink-0 select-none">
      <svg
        width={iconDim}
        height={iconDim}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        className="shrink-0"
      >
        <defs>
          <linearGradient
            id="niswaro-grad"
            x1="4"
            y1="4"
            x2="28"
            y2="28"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#8B5CF6" />
            <stop offset="100%" stopColor="#06B6D4" />
          </linearGradient>
        </defs>
        <rect
          x="2"
          y="2"
          width="28"
          height="28"
          rx="7"
          className="fill-slate-900 dark:fill-[#111936] stroke-violet-500/40"
          strokeWidth="1.25"
        />
        <path
          d="M9.5 22.5V9.5L22.5 22.5V9.5"
          stroke="url(#niswaro-grad)"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="9.5" cy="9.5" r="1.5" fill="#A78BFA" />
        <circle cx="22.5" cy="22.5" r="1.5" fill="#22D3EE" />
      </svg>
      {!collapsed && (
        <span
          className={`font-display font-bold tracking-tight text-slate-900 dark:text-slate-50 ${textClass}`}
        >
          NISWARO AI
        </span>
      )}
    </span>
  );
};
