const shapes = {
  route:'<circle cx="5" cy="18" r="2.4"/><circle cx="19" cy="6" r="2.4"/><path d="M5 15.5V10a4 4 0 0 1 4-4h2m8 2.5V14a4 4 0 0 1-4 4h-3"/>',
  book:'<path d="M3 4.5c3-1 6-.5 9 1.5 3-2 6-2.5 9-1.5v15c-3-1-6-.5-9 1.5-3-2-6-2.5-9-1.5zM12 6v15"/>',
  trophy:'<path d="M7 3h10v6a5 5 0 0 1-10 0zM7 5H3v2a5 5 0 0 0 5 5m9-7h4v2a5 5 0 0 1-5 5m-4 2v5m-4 2h8"/>',
  panel:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16"/>',
  fire:'<path d="M13 2c1 5-4 6-4 10-2-1-2-3-2-4-4 4-4.5 8-2 11a8.3 8.3 0 0 0 14-2c2-5-1-8-4-11 .4 3-.8 4-1.5 4 .8-3.5.4-5.3-.5-8z"/>',
  layers:'<path d="m2.5 7.5 9.5-5 9.5 5-9.5 5zM3 12l9 5 9-5M3 16.5l9 5 9-5"/>',
  network:'<rect x="8.5" y="2.5" width="7" height="6" rx="1.3"/><path d="M12 9v4m-7 3v-3h14v3"/><rect x="1.8" y="16" width="6.5" height="5.5" rx="1"/><rect x="15.7" y="16" width="6.5" height="5.5" rx="1"/>',
  database:'<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v13c0 4 16 4 16 0V5M4 11.5c0 4 16 4 16 0"/>',
  scale:'<path d="M4 19V9m8 10V5m8 14V2M2 21h20"/>',
  pulse:'<path d="M2 12h5l3-8 4 16 3-8h5"/>',
  blocks:'<rect x="3" y="3" width="8" height="8" rx="1"/><rect x="13" y="3" width="8" height="8" rx="1"/><rect x="3" y="13" width="8" height="8" rx="1"/><rect x="13" y="13" width="8" height="8" rx="1"/>',
  bolt:'<path d="m13.5 2-9 12H11l-.5 8 9-12H13z"/>',
  flag:'<path d="M5 22V3m0 1c5-4 9 4 15 0v10c-6 4-10-4-15 0"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>',
  play:'<path d="m8 4 12 8-12 8z" fill="currentColor" stroke="none"/>',
  target:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1" fill="currentColor"/>',
  gauge:'<path d="M4 18a9 9 0 1 1 16 0M12 14l5-5"/><circle cx="12" cy="14" r="1.5"/>',
  chevron:'<path d="m6 9 6 6 6-6"/>',
  forward:'<path d="m9 6 6 6-6 6"/>',
  check:'<path d="m4 12 5 5L20 6"/>',
  medal:'<circle cx="12" cy="9" r="6.5"/><path d="m7 14-2 8 4-2 2 2 1-6m5-2 2 8-4-2-2 2-1-6"/>',
  hex:'<path d="M12 2 21 7v10l-9 5-9-5V7z"/><path d="m8 12 4-3 4 3-4 3z"/>',
  terminal:'<rect x="2.5" y="4" width="19" height="16" rx="2"/><path d="m6.5 9 3 3-3 3m6 0H17"/>',
  search:'<circle cx="10" cy="10" r="6.5"/><path d="m15 15 6 6"/>',
  external:'<path d="M13 4h7v7m0-7-10 10m0-9H5a1 1 0 0 0-1 1v13a1 1 0 0 0 1 1h13a1 1 0 0 0 1-1v-5"/>',
  list:'<path d="M9 6h12M9 12h12M9 18h12"/><path d="M3 6h1M3 12h1M3 18h1"/>'
};
function icon(name, size = 20) {
  return '<svg class="icon" aria-hidden="true" width="'+size+'" height="'+size+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">'+(shapes[name] || '')+'</svg>';
}
