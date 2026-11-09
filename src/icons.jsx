import React from 'react';
const symbols={
  arcade:<><rect x="3" y="7" width="18" height="12" rx="5"/><path d="M8 11v4m-2-2h4m5-1h.01m3 2h.01"/></>,
  browser:<><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c4 4 4 14 0 18m0-18c-4 4-4 14 0 18"/></>,
  chat:<><path d="M20 11.5a7.5 7.5 0 0 1-7.5 7.5H6l-3 2v-8a8 8 0 0 1 8-8h1.5a7.5 7.5 0 0 1 7.5 6.5Z"/><path d="M8 11h8M8 15h4"/></>,
  ai:<><path d="m12 2 2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5Z"/><path d="m19 3 .7 2.3L22 6l-2.3.7L19 9l-.7-2.3L16 6l2.3-.7Z"/></>,
  sun:<><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.9 4.9l1.5 1.5m11.2 11.2 1.5 1.5M2 12h2m16 0h2M4.9 19.1l1.5-1.5M17.6 6.4l1.5-1.5"/></>,
  moon:<path d="M20 15.4A8 8 0 0 1 8.6 4 8 8 0 1 0 20 15.4Z"/>,
  user:<><circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/></>,
  external:<><path d="M13 4h7v7M20 4l-9 9"/><path d="M20 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h5"/></>,
  plus:<path d="M12 5v14M5 12h14"/>,
  arrow:<path d="M5 12h14m-6-6 6 6-6 6"/>,
  back:<path d="m14 6-6 6 6 6"/>,
  reload:<><path d="M20 7v5h-5"/><path d="M20 12a8 8 0 1 0-2.6 5.8"/></>,
  bookmark:<path d="M6 3h12v18l-6-4-6 4V3Z"/>,
  send:<path d="m3 20 18-8L3 4l2 7 9 1-9 1Z"/>,
  spark:<><path d="m12 2 2.3 7.7L22 12l-7.7 2.3L12 22l-2.3-7.7L2 12l7.7-2.3Z"/></>
};
export function Icon({ name, size=20, ...props }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{symbols[name] || symbols.spark}</svg>;
}
