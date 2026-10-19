type P = { className?: string };
const base = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  viewBox: "0 0 24 24",
  "aria-hidden": true,
};

export const BagIcon = ({ className }: P) => (
  <svg {...base} className={className}><path d="M6 7h12l-1 13H7L6 7z" /><path d="M9 7a3 3 0 0 1 6 0" /></svg>
);
export const LockIcon = ({ className }: P) => (
  <svg {...base} className={className}><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>
);
export const PhoneIcon = ({ className }: P) => (
  <svg {...base} className={className}><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" /></svg>
);
export const MailIcon = ({ className }: P) => (
  <svg {...base} className={className}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></svg>
);
export const InstagramIcon = ({ className }: P) => (
  <svg {...base} className={className}><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="0.8" fill="currentColor" /></svg>
);
export const FacebookIcon = ({ className }: P) => (
  <svg {...base} className={className}><path d="M15 3h-2.5A3.5 3.5 0 0 0 9 6.5V10H6.5v3.5H9V21h3.5v-7.5H15l.5-3.5h-3V7a1 1 0 0 1 1-1H15z" /></svg>
);
export const TikTokIcon = ({ className }: P) => (
  <svg {...base} className={className}><path d="M14 3v11.5a3.5 3.5 0 1 1-3.5-3.5" /><path d="M14 3c.5 2.5 2.5 4.5 5 4.5" /></svg>
);
export const PinIcon = ({ className }: P) => (
  <svg {...base} className={className}><path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z" /><circle cx="12" cy="10" r="2.5" /></svg>
);
export const ClockIcon = ({ className }: P) => (
  <svg {...base} className={className}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
);
export const MenuIcon = ({ className }: P) => (
  <svg {...base} className={className}><path d="M4 7h16M4 12h16M4 17h16" /></svg>
);
