import React from "react";

/**
 * One stroked icon set at a single weight, so nothing in the interface has to
 * lean on emoji to say what a control does. Drawn on a 24px grid.
 */

const paths: Record<string, React.ReactNode> = {
  back: <path d="M15 5 8 12l7 7" />,
  forward: <path d="m9 5 7 7-7 7" />,
  down: <path d="m6 9 6 6 6-6" />,
  close: <path d="M6 6 18 18M18 6 6 18" />,
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  check: <path d="m5 12.5 4.5 4.5L19 7" />,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  more: (
    <>
      <circle cx="12" cy="5" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="12" cy="19" r="1.4" fill="currentColor" stroke="none" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="6" />
      <path d="m20 20-4.5-4.5" />
    </>
  ),
  trash: <path d="M4 7h16M10 7V5h4v2m-7 0 1 13h8l1-13M10 11v5M14 11v5" />,
  edit: <path d="M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17v3ZM15 6l3 3" />,
  print: (
    <>
      <path d="M7 9V4h10v5" />
      <path d="M5 9h14a2 2 0 0 1 2 2v5h-4v4H7v-4H3v-5a2 2 0 0 1 2-2Z" />
      <path d="M7 16h10" />
    </>
  ),
  move: <path d="M4 9h11l-3-3m3 3-3 3M20 15H9l3-3m-3 3 3 3" />,
  logout: <path d="M14 8V5H5v14h9v-3M11 12h10m0 0-3-3m3 3-3 3" />,
  cart: (
    <>
      <path d="M5 8h14l-1.2 10.2a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8L5 8Z" />
      <path d="M9 8V6a3 3 0 0 1 6 0v2" />
    </>
  ),
  bell: <path d="M6 16V11a6 6 0 1 1 12 0v5l2 3H4l2-3ZM10 19a2 2 0 0 0 4 0" />,
  bellOff: (
    <>
      <path d="M8 6.5A6 6 0 0 1 18 11v5l1.5 3M16.5 19H4l2-3v-4" />
      <path d="M10 19a2 2 0 0 0 4 0M4 4l16 16" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  table: <path d="M3 9h18M5 9V7a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v2M6 9v10M18 9v10" />,
  receipt: (
    <>
      <path d="M6 3h12v18l-3-1.8-3 1.8-3-1.8L6 21V3Z" />
      <path d="M9.5 8h5M9.5 12h5" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 19a5.5 5.5 0 0 1 11 0" />
      <path d="M16 6.2a3.2 3.2 0 0 1 0 5.6M17.5 14.4a5.5 5.5 0 0 1 3 4.6" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="3.4" />
      <path d="M5 20a7 7 0 0 1 14 0" />
    </>
  ),
  chart: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />,
  flame: (
    <path d="M12 3s5 4.2 5 9a5 5 0 0 1-10 0c0-1.8.8-3.2 1.6-4.2.2 1.5 1 2.2 1.8 2.2 1.2 0 1.8-1 1.8-2.6 0-1.6-.6-3-1.2-4.4Z" />
  ),
  bowl: (
    <>
      <path d="M3 11h18a9 9 0 0 1-9 9 9 9 0 0 1-9-9Z" />
      <path d="M8 8c0-1.5 1-2 1-3.5M12 7.5c0-1.5 1-2 1-3.5M16 8c0-1.5 1-2 1-3.5" />
    </>
  ),
  note: <path d="M6 4h9l4 4v12H6V4Zm9 0v4h4M9.5 12.5h6M9.5 16h4" />,
  image: (
    <>
      <rect x="3.5" y="5" width="17" height="14" rx="2" />
      <circle cx="9" cy="10" r="1.6" />
      <path d="m4 17 4.5-4.5L13 17l3-2.5 4 3.5" />
    </>
  ),
  qr: (
    <>
      <rect x="4" y="4" width="6" height="6" rx="1" />
      <rect x="14" y="4" width="6" height="6" rx="1" />
      <rect x="4" y="14" width="6" height="6" rx="1" />
      <path d="M14 14h2.5v2.5H14zM19.5 14H20v2.5M14 19.5h2.5M19.5 19.5H20" />
    </>
  ),
  key: (
    <>
      <circle cx="8" cy="12" r="4" />
      <path d="M12 12h9M17.5 12v3.5M20 12v2.5" />
    </>
  ),
  cash: (
    <>
      <rect x="3" y="6.5" width="18" height="11" rx="2" />
      <circle cx="12" cy="12" r="2.4" />
    </>
  ),
  card: (
    <>
      <rect x="3" y="5.5" width="18" height="13" rx="2" />
      <path d="M3 10h18M6.5 14.5h3" />
    </>
  ),
  phone: (
    <>
      <rect x="7" y="3" width="10" height="18" rx="2" />
      <path d="M10.5 18h3" />
    </>
  ),
  undo: <path d="M4 9h9a5 5 0 0 1 0 10h-5M4 9l4-4M4 9l4 4" />,
  refresh: <path d="M20 11a8 8 0 1 0-.8 4.5M20 5v6h-6" />,
  shield: <path d="M12 3.5 5 6v6c0 4.2 3 7.4 7 8.5 4-1.1 7-4.3 7-8.5V6l-7-2.5Z" />,
  link: (
    <path d="M10.5 13.5a4 4 0 0 0 5.7 0l2.3-2.3a4 4 0 0 0-5.7-5.7l-1.2 1.2M13.5 10.5a4 4 0 0 0-5.7 0l-2.3 2.3a4 4 0 0 0 5.7 5.7l1.2-1.2" />
  ),
  warning: <path d="M12 4 2.5 20h19L12 4Zm0 6v4.5m0 2.6v.4" />,
  sparkle: <path d="M12 4v6m0 4v6M4 12h6m4 0h6M7 7l2.5 2.5M14.5 14.5 17 17M17 7l-2.5 2.5M9.5 14.5 7 17" />,
};

export type IconName = keyof typeof paths;

export function Icon({
  name,
  size = 18,
  className = "",
  strokeWidth = 1.7,
}: {
  name: IconName;
  size?: number;
  className?: string;
  strokeWidth?: number;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={`shrink-0 ${className}`}
    >
      {paths[name]}
    </svg>
  );
}

export default Icon;
