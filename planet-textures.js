import * as THREE from 'three';

const PALETTES = {
  sun:['#ffdb77','#ff8e37','#d94b22'],
  mercury:['#a6a39d','#696967','#c0b9ab'],
  venus:['#e9d1a1','#bd8b59','#f2dfb5'],
  earth:['#123f78','#2877a9','#4b9b65'],
  mars:['#d88a62','#8c3e2c','#efb07d'],
  jupiter:['#d8b28c','#9f6d50','#f0d8b7','#8a4f3c'],
  saturn:['#e2d0a0','#ae9364','#f1e1b8'],
  uranus:['#a2e4df','#4c9da8','#c2efeb'],
  neptune:['#3159b5','#19377f','#5d8ce7']
};

function seededRandom(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export function createPlanetTexture(kind) {
  const width = 1024, height = 512;
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext('2d');
  const colors = PALETTES[kind] || PALETTES.earth;
  const rand = seededRandom(kind.split('').reduce((n,c)=>n+c.charCodeAt(0),7));

  const base = ctx.createLinearGradient(0,0,0,height);
  colors.forEach((color,i)=>base.addColorStop(i/(colors.length-1),color));
  ctx.fillStyle = base; ctx.fillRect(0,0,width,height);

  if (['jupiter','saturn','uranus','neptune','venus'].includes(kind)) {
    const stripeCount = kind === 'jupiter' ? 38 : kind === 'saturn' ? 54 : 30;
    for (let i=0;i<stripeCount;i++) {
      const y = (i/stripeCount)*height + (rand()-.5)*12;
      const h = 2 + rand()*13;
      ctx.globalAlpha = .08 + rand()*.28;
      ctx.fillStyle = colors[Math.floor(rand()*colors.length)];
      ctx.beginPath();
      ctx.moveTo(0,y);
      ctx.bezierCurveTo(width*.25,y+(rand()-.5)*20,width*.7,y+(rand()-.5)*24,width,y+(rand()-.5)*15);
      ctx.lineTo(width,y+h); ctx.bezierCurveTo(width*.7,y+h+10,width*.25,y+h-8,0,y+h);
      ctx.closePath(); ctx.fill();
    }
  }

  if (kind === 'earth') {
    ctx.fillStyle = '#286849'; ctx.globalAlpha = .95;
    const land = [
      [[.08,.27],[.13,.20],[.19,.22],[.22,.31],[.18,.39],[.17,.49],[.12,.47],[.10,.37]],
      [[.22,.50],[.27,.54],[.29,.66],[.26,.79],[.23,.68]],
      [[.46,.24],[.53,.19],[.61,.23],[.66,.31],[.62,.42],[.56,.44],[.52,.36]],
      [[.54,.47],[.60,.48],[.62,.61],[.58,.78],[.54,.68]],
      [[.72,.28],[.80,.25],[.88,.32],[.86,.42],[.80,.46],[.75,.39]],
      [[.85,.58],[.91,.56],[.95,.65],[.91,.75],[.87,.70]]
    ];
    land.forEach(poly=>{ctx.beginPath();poly.forEach((p,i)=>i?ctx.lineTo(p[0]*width,p[1]*height):ctx.moveTo(p[0]*width,p[1]*height));ctx.closePath();ctx.fill();});
    ctx.globalAlpha=.35;ctx.strokeStyle='#b7d6a0';ctx.lineWidth=8;
    for(let i=0;i<15;i++){ctx.beginPath();ctx.moveTo(rand()*width,rand()*height);ctx.bezierCurveTo(rand()*width,rand()*height,rand()*width,rand()*height,rand()*width,rand()*height);ctx.stroke();}
  }

  if (kind === 'jupiter') {
    ctx.globalAlpha=.85;ctx.fillStyle='#a94e35';ctx.beginPath();ctx.ellipse(width*.72,height*.64,62,29,-.12,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='#e5b38d';ctx.lineWidth=5;ctx.beginPath();ctx.ellipse(width*.72,height*.64,53,19,-.12,0,Math.PI*2);ctx.stroke();
  }

  if (kind === 'mercury' || kind === 'mars') {
    for(let i=0;i<150;i++){
      const x=rand()*width,y=rand()*height,r=2+rand()*(kind==='mercury'?19:10);
      ctx.globalAlpha=.08+rand()*.22;ctx.fillStyle=rand()>.5?'#f4d6b5':'#342b29';
      ctx.beginPath();ctx.ellipse(x,y,r,r*(.45+rand()*.3),0,0,Math.PI*2);ctx.fill();
      ctx.globalAlpha=.16;ctx.strokeStyle='#171b24';ctx.lineWidth=1.5;ctx.stroke();
    }
  }

  if (kind === 'sun') {
    for(let i=0;i<220;i++){
      ctx.globalAlpha=.04+rand()*.12;ctx.fillStyle=rand()>.5?'#fff2a4':'#e44c1f';
      const r=3+rand()*30;ctx.beginPath();ctx.arc(rand()*width,rand()*height,r,0,Math.PI*2);ctx.fill();
    }
  }

  ctx.globalAlpha=1;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}
