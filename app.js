import { parseStepClimb } from './core/parser.js';
import { buildRoutePoints, enrichRoute } from './core/route.js';

let map;
let routeLayer;
let airports = {}; // will be loaded at runtime

// DOM references (will exist after DOMContentLoaded)
let fromEl, toEl, stepProfileEl, calculateBtn;

function flColor(fl) { return fl < 300 ? '#00bcd4' : fl < 340 ? '#4caf50' : '#ff9800'; }

function drawRoute(points) {
  if (!map) {
    console.error('drawRoute: map not initialized');
    return;
  }
  if (routeLayer) routeLayer.remove();
  const segs = [];
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i];
    segs.push(L.polyline([[a.lat, a.lon], [b.lat, b.lon]], { color: flColor(a.fl), weight: 4 }));
  }
  routeLayer = L.layerGroup(segs).addTo(map);
  if (routeLayer.getBounds && typeof routeLayer.getBounds === 'function') {
    map.fitBounds(routeLayer.getBounds(), { padding: [20, 20] });
  }
}

function setupCalculateHandler() {
  calculateBtn.onclick = () => {
    try {
      const depCode = fromEl.value && fromEl.value.trim().toUpperCase();
      const destCode = toEl.value && toEl.value.trim().toUpperCase();
      if (!depCode || !destCode) {
        alert('Please enter both departure and destination airport codes.');
        return;
      }
      const dep = airports[depCode];
      const dest = airports[destCode];
      if (!dep || !dest) {
        alert('Unknown airport code: ' + (dep ? destCode : depCode));
        return;
      }

      let profile;
      try {
        profile = parseStepClimb(stepProfileEl.value);
      } catch (err) {
        alert('Step profile parse error: ' + (err && err.message ? err.message : err));
        return;
      }

      const { points } = buildRoutePoints(dep, dest, 100);
      // Provide an average groundspeed (knots) for time-based profile entries.
      // Default to 450 kts. Adjust if you want to use a different value or add a UI input for it.
      const avgKts = 450;
      const enr = enrichRoute(points, profile, { avgKts });
      drawRoute(enr);
    } catch (err) {
      // Unexpected errors
      console.error(err);
      alert('An unexpected error occurred: ' + (err && err.message ? err.message : err));
    }
  };
}

document.addEventListener('DOMContentLoaded', async () => {
  // DOM elements
  fromEl = document.getElementById('from');
  toEl = document.getElementById('to');
  stepProfileEl = document.getElementById('stepProfile');
  calculateBtn = document.getElementById('calculate');

  // Ensure Leaflet is available. If not, wait for window.load (some environments/scripts)
  if (typeof L === 'undefined') {
    await new Promise(resolve => {
      let resolved = false;
      function onLoad() {
        if (!resolved) { resolved = true; resolve(); }
      }
      window.addEventListener('load', onLoad);
      // timeout fallback
      setTimeout(onLoad, 2000);
    });
    if (typeof L === 'undefined') {
      console.error('Leaflet (L) is not available — check the <script> tag in index.html');
      alert('Leaflet library did not load. See console for details.');
      return;
    }
  }

  // Initialize map
  map = L.map("map", {
    worldCopyJump: true
  }).setView([50, 30], 4);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 10 }).addTo(map);

  // Load airports JSON at runtime (more compatible than import assertions)
  try {
    const res = await fetch('./data/airports.json');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    airports = await res.json();
  } catch (err) {
    console.error('Cannot load airports.json', err);
    alert('Cannot load airports.json: ' + (err && err.message ? err.message : err));
    // still continue: calculate will report unknown codes
  }

  // Finally wire the handler
  setupCalculateHandler();
});
