// Approximate heliocentric positions using JPL Solar System Dynamics
// Keplerian elements (1800–2050 model). Units returned: AU and degrees.
const DEG = Math.PI / 180;
export const AU_KM = 149597870.7;
export const JULIAN_J2000 = 2451545.0;

export function julianDay(date) {
  return date.getTime() / 86400000 + 2440587.5;
}

function wrapDegrees(value) {
  return ((value % 360) + 360) % 360;
}

function solveKepler(meanAnomalyDeg, eccentricity) {
  const M = ((meanAnomalyDeg + 180) % 360 + 360) % 360 - 180;
  const m = M * DEG;
  let E = m + eccentricity * Math.sin(m);
  for (let i = 0; i < 20; i++) {
    const delta = (E - eccentricity * Math.sin(E) - m) / (1 - eccentricity * Math.cos(E));
    E -= delta;
    if (Math.abs(delta) < 1e-13) break;
  }
  return E;
}

export function planetState(planet, date) {
  const T = (julianDay(date) - JULIAN_J2000) / 36525;
  const o = planet.orbit;
  const a = o.a0 + o.ad * T;
  const e = o.e0 + o.ed * T;
  const inc = (o.i0 + o.id * T) * DEG;
  const L = o.L0 + o.Ld * T;
  const peri = o.p0 + o.pd * T;
  const node = o.n0 + o.nd * T;
  const omega = peri - node;
  const Mdeg = L - peri;
  const E = solveKepler(Mdeg, e);

  const xp = a * (Math.cos(E) - e);
  const yp = a * Math.sqrt(1 - e * e) * Math.sin(E);
  const w = omega * DEG;
  const O = node * DEG;

  const x = (Math.cos(w) * Math.cos(O) - Math.sin(w) * Math.sin(O) * Math.cos(inc)) * xp
          + (-Math.sin(w) * Math.cos(O) - Math.cos(w) * Math.sin(O) * Math.cos(inc)) * yp;
  const y = (Math.cos(w) * Math.sin(O) + Math.sin(w) * Math.cos(O) * Math.cos(inc)) * xp
          + (-Math.sin(w) * Math.sin(O) + Math.cos(w) * Math.cos(O) * Math.cos(inc)) * yp;
  const z = Math.sin(w) * Math.sin(inc) * xp + Math.cos(w) * Math.sin(inc) * yp;

  const r = Math.hypot(x, y, z);
  const longitude = wrapDegrees(Math.atan2(y, x) / DEG);
  const speed = Math.sqrt(1.32712440018e11 * (2 / (r * AU_KM) - 1 / (a * AU_KM)));

  return { x, y, z, r, a, e, longitude, speed, T };
}

export function orbitPoints(planet, date, segments = 360) {
  const T = (julianDay(date) - JULIAN_J2000) / 36525;
  const o = planet.orbit;
  const a = o.a0 + o.ad * T;
  const e = o.e0 + o.ed * T;
  const inc = (o.i0 + o.id * T) * DEG;
  const peri = o.p0 + o.pd * T;
  const node = o.n0 + o.nd * T;
  const omega = (peri - node) * DEG;
  const O = node * DEG;
  const cO = Math.cos(O), sO = Math.sin(O);
  const cw = Math.cos(omega), sw = Math.sin(omega);
  const ci = Math.cos(inc), si = Math.sin(inc);
  const points = [];

  for (let i = 0; i <= segments; i++) {
    const E = 2 * Math.PI * i / segments;
    const xp = a * (Math.cos(E) - e);
    const yp = a * Math.sqrt(1 - e * e) * Math.sin(E);
    const x = (cw*cO - sw*sO*ci)*xp + (-sw*cO - cw*sO*ci)*yp;
    const y = (cw*sO + sw*cO*ci)*xp + (-sw*sO + cw*cO*ci)*yp;
    const z = sw*si*xp + cw*si*yp;
    points.push({ x, y, z });
  }
  return points;
}
