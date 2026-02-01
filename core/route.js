const R = 6371e3;
const rad = d => d * Math.PI / 180;
const deg = r => r * 180 / Math.PI;

export function haversineDistance(a, b, c, d) {
  const A = rad(a), B = rad(c), da = rad(c - a), db = rad(d - b);
  const x = Math.sin(da / 2) ** 2 + Math.cos(A) * Math.cos(B) * Math.sin(db / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

export function interpolateGC(a, b, c, d, f) {
  const A = rad(a), B = rad(b), C = rad(c), D = rad(d);
  const g = 2 * Math.asin(Math.sqrt(Math.sin((C - A) / 2) ** 2 + Math.cos(A) * Math.cos(C) * Math.sin((D - B) / 2) ** 2));
  if (!g) return { lat: a, lon: b };
  const x = Math.sin((1 - f) * g) / Math.sin(g), y = Math.sin(f * g) / Math.sin(g);
  const X = x * Math.cos(A) * Math.cos(B) + y * Math.cos(C) * Math.cos(D);
  const Y = x * Math.cos(A) * Math.sin(B) + y * Math.cos(C) * Math.sin(D);
  const Z = x * Math.sin(A) + y * Math.sin(C);
  return { lat: deg(Math.atan2(Z, Math.sqrt(X * X + Y * Y))), lon: deg(Math.atan2(Y, X)) };
}

export function buildRoutePoints(dep, dest, stepNM) {
  if (!dep || !dest) throw new Error('buildRoutePoints: dep and dest must be provided');
  if (typeof stepNM !== 'number' || stepNM <= 0) throw new Error('buildRoutePoints: stepNM must be a positive number');
  const nm = haversineDistance(dep.lat, dep.lon, dest.lat, dest.lon) / 1852;
  const n = Math.ceil(nm / stepNM), pts = [];
  for (let i = 0; i <= n; i++) {
    const f = i / n;
    const p = interpolateGC(dep.lat, dep.lon, dest.lat, dest.lon, f);
    pts.push({ ...p, dist_nm: nm * f });
  }
  return { points: pts };
}

/*
 enrichRoute(points, profile, options)

 - points: array with .dist_nm numeric
 - profile: array of { fl: number, until: { type: 'distance'|'time'|'end', value?: number } }
 - options: { avgKts?: number }  // required if any profile entry uses type 'time'
 
 Behavior:
 - For each point, determines the flight level (fl) according to the first matching profile entry:
    - distance: applies while point.dist_nm <= value
    - time: applies while elapsedMinutes <= value (requires avgKts to convert distances to time)
    - end: applies to the remainder
 - Returns a new array of points where each point has .fl and .elapsedMinutes (minutes from start)
*/
export function enrichRoute(points, profile, options = {}) {
  if (!Array.isArray(points)) throw new Error('enrichRoute: points must be an array');
  if (!Array.isArray(profile) || profile.length === 0) throw new Error('enrichRoute: profile must be a non-empty array');
  const usesTime = profile.some(s => s.until && s.until.type === 'time');
  const avgKts = options.avgKts == null ? null : Number(options.avgKts);
  if (usesTime && (!Number.isFinite(avgKts) || avgKts <= 0)) {
    throw new Error('enrichRoute: time-based profile entries require a positive options.avgKts (knots)');
  }

  // We'll compute elapsedMinutes at each point (minutes from start to reach that point)
  let elapsedMinutes = 0;
  const out = [];
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    // Decide flight level for this point by scanning profile entries in order.
    let fl = profile[profile.length - 1].fl; // default to last FL
    for (const s of profile) {
      if (!s || !s.until) continue;
      if (s.until.type === 'distance') {
        if (p.dist_nm <= s.until.value) { fl = s.fl; break; }
      } else if (s.until.type === 'time') {
        // compare elapsedMinutes (time to reach this point)
        if (elapsedMinutes <= s.until.value) { fl = s.fl; break; }
      } else if (s.until.type === 'end') {
        fl = s.fl; break;
      }
    }
    out.push({ ...p, fl, elapsedMinutes });

    // compute time from this point to next and accumulate elapsedMinutes
    if (i + 1 < points.length) {
      const next = points[i + 1];
      const legNm = next.dist_nm - p.dist_nm;
      if (usesTime) {
        // avgKts in knots -> hours = nm / kts; minutes = hours * 60
        const minutes = (legNm / avgKts) * 60;
        elapsedMinutes += minutes;
      }
    }
  }
  return out;
}
