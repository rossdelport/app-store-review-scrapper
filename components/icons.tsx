import type { SVGProps } from "react";

export function SearchIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

export function DownloadIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="M7 10l5 5 5-5" />
      <path d="M12 15V3" />
    </svg>
  );
}

export function AppleIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M16.36 1.43c.05 1-.34 1.97-.97 2.69-.66.74-1.74 1.32-2.79 1.24-.12-.98.36-2 .95-2.67.66-.74 1.82-1.3 2.81-1.26zM20.4 17.1c-.55 1.27-.82 1.84-1.53 2.96-.99 1.56-2.39 3.51-4.12 3.52-1.54.02-1.93-1-4.02-.99-2.08.01-2.51 1.01-4.05.99-1.73-.02-3.05-1.78-4.05-3.34C-.27 17.5-.66 12.3 1.07 9.6 2.29 7.69 4.22 6.58 6.04 6.58c1.85 0 3.02 1.01 4.55 1.01 1.49 0 2.39-1.02 4.53-1.02 1.62 0 3.33.88 4.55 2.41-4 2.19-3.35 7.9.73 8.12z" />
    </svg>
  );
}

export function PlayIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" {...props}>
      <path fill="#00d0ff" d="M3.6 1.2c-.3.2-.5.6-.5 1.1v19.4c0 .5.2.9.5 1.1l11.1-11.8L3.6 1.2z" />
      <path fill="#00f076" d="M14.7 11l3.7-3.9-12-6.7c-.4-.2-.8-.2-1.1 0L14.7 11z" />
      <path fill="#ffc900" d="M19.9 9.1l-3.5-2-3.9 4.1 3.9 4.1 3.5-2c1.1-.6 1.1-2.6 0-3.2z" />
      <path fill="#ff3a44" d="M5.3 22.6c.3.2.7.2 1.1 0l12-6.7-3.7-3.9L5.3 22.6z" />
    </svg>
  );
}

export function SpinnerIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="animate-spin" {...props}>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
