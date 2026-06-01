import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function IconBase({ children, ...props }: IconProps) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{children}</svg>;
}

export const PlatformLogo = (props: IconProps) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" aria-hidden="true" {...props}>
    <defs>
      <linearGradient id="platformLogoCupGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#10B981" />
        <stop offset="100%" stopColor="#059669" />
      </linearGradient>
      <linearGradient id="platformLogoGlowGrad" x1="0%" y1="100%" x2="0%" y2="0%">
        <stop offset="0%" stopColor="#34D399" stopOpacity="0.8" />
        <stop offset="100%" stopColor="#10B981" stopOpacity="0" />
      </linearGradient>
    </defs>
    <circle cx="50" cy="50" r="44" fill="none" stroke="url(#platformLogoGlowGrad)" strokeWidth="2" strokeDasharray="4 8" opacity="0.6" />
    <rect x="32" y="38" width="6" height="24" rx="3" fill="url(#platformLogoCupGrad)" opacity="0.7" />
    <rect x="62" y="38" width="6" height="24" rx="3" fill="url(#platformLogoCupGrad)" opacity="0.7" />
    <path d="M40 30 H60 V46 C60 52 55 56 50 56 C45 56 40 52 40 46 V30 Z" fill="url(#platformLogoCupGrad)" />
    <path d="M46 56 H54 V66 H46 Z" fill="url(#platformLogoCupGrad)" opacity="0.9" />
    <rect x="38" y="66" width="24" height="6" rx="2" fill="url(#platformLogoCupGrad)" />
    <path d="M50 14 L52.5 19 L58 19.5 L54 23.5 L55 29 L50 26 L45 29 L46 23.5 L42 19.5 L47.5 19 Z" fill="#FBBF24" />
  </svg>
);

export const HomeIcon = (props: IconProps) => <IconBase {...props}><path d="m3 11 9-8 9 8" /><path d="M5 10v10h14V10" /><path d="M9 20v-6h6v6" /></IconBase>;
export const BallIcon = (props: IconProps) => <IconBase {...props}><circle cx="12" cy="12" r="9" /><path d="m12 7 4 3-1.5 5h-5L8 10l4-3Z" /><path d="M8 10 4.5 8" /><path d="M16 10 19.5 8" /><path d="m9.5 15-2 3" /><path d="m14.5 15 2 3" /></IconBase>;
export const TrophyIcon = (props: IconProps) => <IconBase {...props}><path d="M8 21h8" /><path d="M12 17v4" /><path d="M7 4h10v5a5 5 0 0 1-10 0V4Z" /><path d="M5 5H3v2a4 4 0 0 0 4 4" /><path d="M19 5h2v2a4 4 0 0 1-4 4" /></IconBase>;
export const UsersIcon = (props: IconProps) => <IconBase {...props}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></IconBase>;
export const HistoryIcon = (props: IconProps) => <IconBase {...props}><path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 3v6h6" /><path d="M12 7v5l3 2" /></IconBase>;
export const LockIcon = (props: IconProps) => <IconBase {...props}><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></IconBase>;
export const PlusIcon = (props: IconProps) => <IconBase {...props}><path d="M12 5v14" /><path d="M5 12h14" /></IconBase>;
