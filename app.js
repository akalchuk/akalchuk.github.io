import { parseStepClimb } from './core/parser.js';
import { buildRoutePoints, enrichRoute } from './core/route.js';
import airports from './data/airports.json' assert { type: 'json' };

const map = L.map("map", {
  worldCopyJump: true
}).setView([50, 30], 4);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 10 }).addTo(map);
let routeLayer;

// DOM references
const from = document.getElementById('from');
const to = document.getElementById('to');
const stepProfile = document.getElementById('stepProfile');

function flColor(fl) { return fl < 300 ? '#00bcd4' : fl < 340 ? '#4caf50' : '#ff9800'; }

function drawRoute(points) {
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

document.getElementById('calculate').onclick = () => {
  try {
    const depCode = from.value && from.value.trim().toUpperCase();
    const destCode = to.value && to.value.trim().toUpperCase();
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
      profile = parseStepClimb(stepProfile.value);
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
