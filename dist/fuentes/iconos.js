// Iconos de línea (SVG) para el programa: sin emojis.
const P={
 plug:'<path d="M9 2v6M15 2v6M6 8h12v3a6 6 0 0 1-12 0V8zM12 17v5"/>',
 camera:'<path d="M3 8a2 2 0 0 1 2-2h2l1.5-2h7L17 6h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8z"/><circle cx="12" cy="12.5" r="3.5"/>',
 check:'<path d="M5 12.5l4.5 4.5L19 7.5"/>',
 alert:'<path d="M12 4l9 16H3L12 4zM12 10v4M12 17.5v.5"/>',
 users:'<circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M16 5a3 3 0 0 1 0 6M18 14.5c1.8.8 3 2.6 3 5.5"/>',
 hand:'<path d="M8 12V5.5a1.5 1.5 0 0 1 3 0V11m0-1V4a1.5 1.5 0 0 1 3 0v6m0-4a1.5 1.5 0 0 1 3 0v6m0-1.5a1.5 1.5 0 0 1 3 0V15a7 7 0 0 1-7 7h-1.5a6 6 0 0 1-5-2.7L4 15.5a1.6 1.6 0 0 1 2.6-1.8L8 15"/>',
 bag:'<path d="M5 8h14l-1 12H6L5 8zM9 8V6a3 3 0 0 1 6 0v2"/>',
 chart:'<path d="M4 20V4M4 20h16M8 16v-5M12 16V8M16 16v-8"/>',
 download:'<path d="M12 4v11M7.5 10.5L12 15l4.5-4.5M5 19h14"/>',
 link:'<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
 server:'<rect x="3" y="4" width="18" height="6" rx="2"/><rect x="3" y="14" width="18" height="6" rx="2"/><path d="M7 7h.01M7 17h.01"/>',
 eye:'<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>',
 info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8v.01"/>',
 flame:'<path d="M12 3c1 4 5 5.5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 .3 1.2 1 2 2 2-1-3 0-5 1-8z"/>',
 clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
 box:'<path d="M3 7.5L12 3l9 4.5v9L12 21l-9-4.5v-9zM3 7.5L12 12l9-4.5M12 12v9"/>',
 settings:'<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/>',
 arrow:'<path d="M5 12h14M13 6l6 6-6 6"/>',
 bulb:'<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.5.4.5 1.1.5 1.6V16h6v-.5c0-.5 0-1.2.5-1.6A6 6 0 0 0 12 3z"/>',
 target:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
 refresh:'<path d="M20 11a8 8 0 1 0-2.3 6M20 4v7h-7"/>'
};
export const icono=(n,s=18)=>`<svg class="ico" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[n]||P.info}</svg>`;
