import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { PLANETS, MOON_COUNT_SNAPSHOT } from './planet-data.js';
import { planetState, orbitPoints, AU_KM } from './ephemeris.js';
import { createPlanetTexture } from './planet-textures.js';

const $ = (id) => document.getElementById(id);
const container = $('sceneContainer');
const loading = $('sceneLoading');
const sceneError = $('sceneError');
const AU_SCALE = 2.65; // Same linear conversion for every planetary orbit.
const PLANET_PICK_RADIUS_FACTOR = 1.0;

let simDate = new Date();
let liveMode = true;
let playing = true;
let timeRate = 86400;
let selectedId = 'earth';
let followSelected = false;
let lastFrame = 0;
let lastUiUpdate = 0;
let lastOrbitRefresh = 0;
let renderer, scene, camera, controls, raycaster, pointer;
let sunMesh;
const bodies = new Map();
const selectableMeshes = [];
const orbitObjects = [];

const fmt = (value, digits = 2) => new Intl.NumberFormat('id-ID', { maximumFractionDigits: digits }).format(value);
const fmtFixed = (value, digits = 2) => new Intl.NumberFormat('id-ID', { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value);
const formatDate = (date) => new Intl.DateTimeFormat('id-ID', { timeZone:'Asia/Jakarta', dateStyle:'full', timeStyle:'medium' }).format(date);
const formatClock = (date) => new Intl.DateTimeFormat('id-ID', { timeZone:'Asia/Jakarta', hour:'2-digit', minute:'2-digit', second:'2-digit', hour12:false }).format(date);
const formatHours = (days) => `${fmt(Math.abs(days) * 24, 2)} jam${days < 0 ? ' · retrograde' : ''}`;
const dateToInput = (date) => {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
};

function makeLabel(text) {
  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = 'rgba(5,12,25,.78)';
  ctx.strokeStyle = 'rgba(155,180,255,.35)';
  ctx.lineWidth = 2;
  roundRect(ctx, 7, 12, 498, 104, 22);
  ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#e5efff';
  ctx.font = '600 38px Arial';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text.toUpperCase(), 256, 65);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map:texture, transparent:true, depthWrite:false }));
  sprite.scale.set(3.6, .9, 1);
  return sprite;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r); ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath();
}

function makeHalo() {
  const canvas = document.createElement('canvas');
  canvas.width = 256; canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(128,128,8,128,128,126);
  gradient.addColorStop(0,'rgba(255,220,145,.45)');
  gradient.addColorStop(.22,'rgba(255,166,78,.2)');
  gradient.addColorStop(1,'rgba(255,130,45,0)');
  ctx.fillStyle = gradient; ctx.fillRect(0,0,256,256);
  const texture = new THREE.CanvasTexture(canvas);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map:texture, transparent:true, depthWrite:false, blending:THREE.AdditiveBlending }));
  sprite.scale.set(12,12,1);
  return sprite;
}

function sceneVector(state) {
  return new THREE.Vector3(state.x * AU_SCALE, state.z * AU_SCALE, -state.y * AU_SCALE);
}

function orbitRadiusFor(planet) {
  // Planet diameters are deliberately enlarged for visibility; orbit distances
  // remain linear and use one common AU scale.
  return Math.max(.145, Math.pow(planet.diameter / 12756, .56) * .22);
}

function initScene() {
  try {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x030711);
    camera = new THREE.PerspectiveCamera(48, 1, .1, 1400);
    camera.position.set(0, 78, 164);

    renderer = new THREE.WebGLRenderer({ antialias:true, alpha:false, powerPreference:'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.prepend(renderer.domElement);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = .055;
    controls.minDistance = 1.6;
    controls.maxDistance = 420;
    controls.enablePan = true;
    controls.target.set(0,0,0);

    raycaster = new THREE.Raycaster();
    pointer = new THREE.Vector2();

    scene.add(new THREE.AmbientLight(0x51617d, .58));
    const sunlight = new THREE.PointLight(0xffdda9, 3.2, 0, 1.2);
    sunlight.position.set(0,0,0);
    scene.add(sunlight);

    const starCount = 3200;
    const starPositions = new Float32Array(starCount * 3);
    const starColors = new Float32Array(starCount * 3);
    for (let i=0;i<starCount;i++) {
      const radius = 180 + Math.random()*400;
      const u = Math.random()*2-1;
      const theta = Math.random()*Math.PI*2;
      const s = Math.sqrt(1-u*u);
      starPositions[i*3] = radius*s*Math.cos(theta);
      starPositions[i*3+1] = radius*u;
      starPositions[i*3+2] = radius*s*Math.sin(theta);
      const tint = .58 + Math.random()*.42;
      starColors[i*3] = tint*.8;
      starColors[i*3+1] = tint*.9;
      starColors[i*3+2] = tint;
    }
    const starsGeometry = new THREE.BufferGeometry();
    starsGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions,3));
    starsGeometry.setAttribute('color', new THREE.BufferAttribute(starColors,3));
    const stars = new THREE.Points(starsGeometry, new THREE.PointsMaterial({ size:.8, vertexColors:true, transparent:true, opacity:.85, sizeAttenuation:true }));
    scene.add(stars);

    const sunGeometry = new THREE.SphereGeometry(1.9,64,48);
    sunMesh = new THREE.Mesh(sunGeometry, new THREE.MeshBasicMaterial({ map:createPlanetTexture('sun'), color:0xffffff }));
    scene.add(sunMesh);
    scene.add(makeHalo());
    const sunLabel = makeLabel('Matahari');
    sunLabel.position.set(0,3.2,0);
    scene.add(sunLabel);

    createPlanetObjects();
    resizeScene();
    window.addEventListener('resize', resizeScene);
    renderer.domElement.addEventListener('pointerup', onScenePointerUp);
    loading.classList.add('done');
    setTimeout(()=>loading.remove(),500);
    return true;
  } catch (error) {
    console.error('SOLARIS scene initialization failed:', error);
    sceneError.hidden = false;
    loading.classList.add('done');
    return false;
  }
}

function createPlanetObjects() {
  PLANETS.forEach((planet) => {
    const group = new THREE.Group();
    group.name = planet.id;
    scene.add(group);

    const tiltGroup = new THREE.Group();
    tiltGroup.rotation.z = THREE.MathUtils.degToRad(planet.tilt);
    group.add(tiltGroup);

    const radius = orbitRadiusFor(planet);
    const material = new THREE.MeshStandardMaterial({
      map:createPlanetTexture(planet.id), roughness:planet.id==='earth'?.76:.92,
      metalness:planet.id==='mercury'?.12:0
    });
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius,64,48), material);
    mesh.name = `${planet.id}-surface`;
    tiltGroup.add(mesh);
    selectableMeshes.push(mesh);

    if (planet.id === 'saturn') {
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(radius*1.25, radius*2.15, 128),
        new THREE.MeshStandardMaterial({ color:0xcab58b, side:THREE.DoubleSide, transparent:true, opacity:.78, roughness:1 })
      );
      ring.rotation.x = Math.PI/2;
      ring.rotation.z = THREE.MathUtils.degToRad(5);
      tiltGroup.add(ring);
    }
    if (planet.id === 'uranus') {
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(radius*1.3, radius*1.65, 96),
        new THREE.MeshStandardMaterial({ color:0x91bdbb, side:THREE.DoubleSide, transparent:true, opacity:.24, roughness:1 })
      );
      ring.rotation.x = Math.PI/2;
      tiltGroup.add(ring);
    }

    const label = makeLabel(planet.name);
    label.position.set(0,radius+1.05,0);
    group.add(label);

    const selection = new THREE.Mesh(
      new THREE.TorusGeometry(radius*1.42,.018,6,72),
      new THREE.MeshBasicMaterial({ color:0xa9c0ff, transparent:true, opacity:.9 })
    );
    selection.rotation.x = Math.PI/2;
    selection.visible = false;
    group.add(selection);

    const orbitGeometry = new THREE.BufferGeometry();
    const orbitMaterial = new THREE.LineBasicMaterial({ color:planet.color, transparent:true, opacity:.21, depthWrite:false });
    const orbit = new THREE.LineLoop(orbitGeometry, orbitMaterial);
    orbit.userData.planetId = planet.id;
    scene.add(orbit);
    orbitObjects.push(orbit);

    bodies.set(planet.id, { planet, group, tiltGroup, mesh, label, selection, orbit, radius, state:null });
  });
}

function rebuildOrbits(date) {
  for (const body of bodies.values()) {
    const points = orbitPoints(body.planet,date,420).map((p)=>new THREE.Vector3(p.x*AU_SCALE,p.z*AU_SCALE,-p.y*AU_SCALE));
    body.orbit.geometry.dispose();
    body.orbit.geometry.setFromPoints(points);
  }
}

function resizeScene() {
  if (!renderer || !camera) return;
  const width = Math.max(1,container.clientWidth);
  const height = Math.max(1,container.clientHeight);
  camera.aspect = width/height;
  camera.updateProjectionMatrix();
  renderer.setSize(width,height,false);
}

function selectPlanet(id, focus = true) {
  const planet = PLANETS.find(item => item.id === id);
  if (!planet) return;
  const body = bodies.get(id);
  selectedId = id;
  document.querySelectorAll('.planet-choice').forEach((button)=>button.classList.toggle('active',button.dataset.id===id));
  document.documentElement.style.setProperty('--planet-color',planet.color);
  $('selectedIndex').textContent = `${String(PLANETS.findIndex(p=>p.id===id)+1).padStart(2,'0')} / 08`;
  $('planetClass').textContent = planet.className;
  $('planetName').textContent = planet.name;
  $('planetSubtitle').textContent = planet.subtitle;
  $('planetDescription').textContent = planet.description;
  $('planetGlyph').textContent = planet.glyph;

  $('quickFacts').innerHTML = [
    factCard('DIAMETER',`${fmt(planet.diameter,0)} km`,'Diameter rata-rata / referensi'),
    factCard('MASSA',`${fmt(planet.mass,3)} × 10²⁴ kg`,'Massa planet'),
    factCard('SATELIT ALAMI',`${planet.moons} bulan`,'Snapshot katalog JPL'),
    factCard('SATU TAHUN',`${fmt(planet.orbitalDays,1)} hari`,`≈ ${fmt(planet.orbitalYears,2)} tahun Bumi`)
  ].join('');

  $('physicalData').innerHTML = [
    dataItem('Radius ekuatorial',`${fmt(planet.equatorialRadius,2)} km`),
    dataItem('Kerapatan rata-rata',`${fmt(planet.density,0)} kg/m³`),
    dataItem('Gravitasi ekuator',`${fmt(planet.gravity,2)} m/s²`),
    dataItem('Kecepatan lepas',`${fmt(planet.escape,2)} km/s`),
    dataItem('Suhu rata-rata',`${planet.temp > 0 ? '+' : ''}${fmt(planet.temp,0)} °C`),
    dataItem('Tekanan permukaan',planet.pressure)
  ].join('');

  $('orbitData').innerHTML = [
    dataItem('Sumbu semi-mayor',`${fmt(planet.a,4)} AU`),
    dataItem('Perihelion',`${fmt(planet.perihelion,4)} AU`),
    dataItem('Aphelion',`${fmt(planet.aphelion,4)} AU`),
    dataItem('Eksentrisitas',fmt(planet.eccentricity,5)),
    dataItem('Inklinasi orbit',`${fmt(planet.inclination,3)}°`),
    dataItem('Kemiringan sumbu',`${fmt(planet.tilt,1)}°`),
    dataItem('Rotasi sideris',formatHours(planet.rotation)),
    dataItem('Panjang hari surya',`${fmt(planet.solarDay*24,2)} jam`),
    dataItem('Periode orbit',`${fmt(planet.orbitalDays,2)} hari`),
    dataItem('Periode orbit',`${fmt(planet.orbitalYears,3)} tahun Bumi`)
  ].join('');

  $('atmosphereData').innerHTML = [
    textDataItem('Atmosfer',planet.atmosphere),
    textDataItem('Struktur internal',planet.interior),
    textDataItem('Medan magnet',planet.magnetic),
    textDataItem('Sistem cincin',planet.rings)
  ].join('');
  $('evolutionData').textContent = planet.evolution;
  $('moonCountLabel').textContent = `${planet.moons} DIKETAHUI`;
  $('moonDescription').textContent = planet.moonDescription;
  $('moonTags').innerHTML = planet.moonNames.length
    ? planet.moonNames.map(name=>`<span class="moon-tag">${name}</span>`).join('')
    : '<span class="moon-tag">Tidak ada bulan</span>';
  $('missionData').textContent = planet.missions;
  $('sourceLinks').innerHTML = planet.sources.map(([label,url])=>`<a href="${url}" target="_blank" rel="noopener noreferrer">${label} ↗</a>`).join('');

  if (focus && body) focusPlanet(id);
  updateSelectionRing();
  updateLiveStats();
}

function factCard(label,value,detail){return `<div class="fact-card"><small>${label}</small><strong>${value}</strong><span>${detail}</span></div>`;}
function dataItem(label,value){return `<div class="data-item"><span>${label}</span><strong>${value}</strong></div>`;}
function textDataItem(label,value){return `<div class="text-data-item"><strong>${label}</strong><p>${value}</p></div>`;}

function focusPlanet(id) {
  const body = bodies.get(id);
  if (!body || !controls) return;
  followSelected = true;
  const target = body.group.position.clone();
  const distance = Math.max(2.7, body.radius*8.5);
  const direction = new THREE.Vector3(.9,.75,1.15).normalize().multiplyScalar(distance);
  controls.target.copy(target);
  camera.position.copy(target).add(direction);
  controls.update();
}

function overview() {
  if (!camera || !controls) return;
  followSelected = false;
  controls.target.set(0,0,0);
  camera.position.set(0,78,164);
  controls.update();
}

function updateSelectionRing() {
  for (const [id,body] of bodies) body.selection.visible = id === selectedId;
}

function updateBodies() {
  const daysSinceJ2000 = (simDate.getTime()/86400000 + 2440587.5 - 2451545.0);
  for (const [id,body] of bodies) {
    const state = planetState(body.planet,simDate);
    body.state = state;
    const pos = sceneVector(state);
    body.group.position.copy(pos);
    const spinDays = body.planet.rotation;
    body.mesh.rotation.y = (((daysSinceJ2000 / spinDays) % 1) + 1) % 1 * Math.PI * 2;
    body.selection.rotation.y = body.mesh.rotation.y;
  }
  if (followSelected && controls && bodies.has(selectedId)) {
    controls.target.copy(bodies.get(selectedId).group.position);
  }
  if (sunMesh) sunMesh.rotation.y += .00015;
}

function updateLiveStats() {
  const planet = PLANETS.find(item => item.id === selectedId);
  if (!planet) return;
  const body = bodies.get(selectedId);
  const s = body?.state || planetState(planet,simDate);
  $('liveDistance').textContent = `${fmt(s.r,3)} AU`;
  $('liveVelocity').textContent = `${fmt(s.speed,2)} km/s`;
  $('liveLongitude').textContent = `${fmt(s.longitude,2)}°`;
}

function updateTimeUI() {
  $('liveClock').textContent = formatClock(new Date());
  $('sceneDate').textContent = formatDate(simDate);
  $('simDateLabel').textContent = formatDate(simDate);
  $('dateInput').value = dateToInput(simDate);
  $('playButton').textContent = playing ? 'Ⅱ' : '▶';
  $('playButton').setAttribute('aria-label',playing?'Jeda simulasi':'Jalankan simulasi');
  $('liveButton').classList.toggle('active',liveMode);
  const year = simDate.getUTCFullYear();
  const percent = Math.max(0,Math.min(100,((year-1800)/250)*100));
  $('timelineFill').style.width = `${percent}%`;
  $('modelStatus').textContent = year < 1800 || year > 2050 ? 'DI LUAR RENTANG MODEL' : 'MODEL JPL · 1800–2050';
  if (year < 1800 || year > 2050) $('modelStatus').style.color = '#ffb17e';
  else $('modelStatus').style.color = '';
  updateLiveStats();
}

function onScenePointerUp(event) {
  if (!renderer || !camera) return;
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((event.clientX-rect.left)/rect.width)*2-1;
  pointer.y = -((event.clientY-rect.top)/rect.height)*2+1;
  raycaster.setFromCamera(pointer,camera);
  const hits = raycaster.intersectObjects(selectableMeshes,false);
  if (hits.length) {
    const id = hits[0].object.parent.parent.name;
    if (bodies.has(id)) selectPlanet(id,true);
  }
}

function buildPlanetSelector() {
  $('planetList').innerHTML = PLANETS.map((planet,index)=>
    `<button class="planet-choice${planet.id===selectedId?' active':''}" type="button" data-id="${planet.id}" style="--planet-color:${planet.color}"><span class="planet-dot"></span><span>${planet.name}</span></button>`
  ).join('');
  $('planetList').addEventListener('click',(event)=>{
    const button = event.target.closest('.planet-choice');
    if (button) selectPlanet(button.dataset.id,true);
  });
}

function setOrbitVisibility(visible) {
  orbitObjects.forEach(orbit=>orbit.visible=visible);
}
function setLabelVisibility(visible) {
  for (const body of bodies.values()) body.label.visible=visible;
}

$('orbitToggle').addEventListener('change',(event)=>setOrbitVisibility(event.target.checked));
$('labelToggle').addEventListener('change',(event)=>setLabelVisibility(event.target.checked));
$('overviewButton').addEventListener('click',overview);
$('liveButton').addEventListener('click',()=>{
  simDate = new Date(); liveMode = true; playing = true; updateBodies(); updateTimeUI();
});
$('playButton').addEventListener('click',()=>{
  if (liveMode) liveMode = false;
  playing = !playing;
  updateTimeUI();
});
$('speedSelect').addEventListener('change',(event)=>{
  timeRate = Number(event.target.value);
  if (liveMode) { liveMode = false; simDate = new Date(); }
  playing = true;
  updateTimeUI();
});
$('dateInput').addEventListener('change',(event)=>{
  if (!event.target.value) return;
  const chosen = new Date(event.target.value);
  if (Number.isNaN(chosen.getTime())) return;
  simDate = chosen; liveMode = false; playing = false;
  updateBodies(); rebuildOrbits(simDate); updateTimeUI();
});

function animate(timestamp) {
  requestAnimationFrame(animate);
  const delta = lastFrame ? Math.min((timestamp-lastFrame)/1000,.12) : 0;
  lastFrame = timestamp;
  if (liveMode) {
    simDate = new Date();
  } else if (playing) {
    simDate = new Date(simDate.getTime() + delta*timeRate*1000);
  }
  updateBodies();
  controls?.update();
  renderer?.render(scene,camera);
  if (timestamp-lastUiUpdate > 250) {
    updateTimeUI();
    lastUiUpdate = timestamp;
  }
  if (timestamp-lastOrbitRefresh > 15000 && !liveMode && playing) {
    rebuildOrbits(simDate);
    lastOrbitRefresh = timestamp;
  }
}

function init() {
  buildPlanetSelector();
  const ok = initScene();
  selectPlanet(selectedId,false);
  rebuildOrbits(simDate);
  updateBodies();
  updateTimeUI();
  if (ok) requestAnimationFrame(animate);
}

init();
