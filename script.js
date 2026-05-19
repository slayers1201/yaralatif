
/* ROMANTIC GALAXY v5
   - Camera orbit: drag/swipe to rotate around galaxy
   - Lightbox fix: touchend won't also fire click (flag guard)
   - Font: Bebas Neue cinematic bold
*/

/* === CONFIG === */
const PHOTOS=[
  {src:'img/img1.jpg',cap:'RADEN NI BOS ✨'},
  {src:'img/img2.jpg',cap:'MAYYYLOOOPP 💫'},
  {src:'img/img3.jpg',cap:'Roblox Dulu Yak ❤️'},
  {src:'img/img4.jpg',cap:'my whole universe 🌙'},
  {src:'img/img5.jpg',cap:'hehe wopyu💜'},
  {src:'img/img6.jpg',cap:'cantik pisan🌟'},
];
const FB=[0x9b59f5,0x4fc3f7,0xf06292,0xffffff,0xc084fc];
const ARMS=3,NSTARS=2400,NDUST=3000,TSIZ=128;

/* === STATE === */
let scene,cam,rend,grp,dust,texLabel;
let sprites=[],ptex=[];
let hov=null;
let playing=false,built=false;

/* orbit camera state */
const orbit={theta:0,phi:1.1,radius:32,tTheta:0,tPhi:1.1,tRadius:32};
/* drag state */
const drag={active:false,x:0,y:0};

/* lightbox touch guard — prevents click firing after touchend */
let touchJustFired=false;

const audio=document.getElementById('bgm');
const rc=new THREE.Raycaster(),mv=new THREE.Vector2();

/* === BOOT === */
window.addEventListener('DOMContentLoaded',()=>{
  initBg();
  loadTextures().then(()=>setTimeout(hideLoader,600));
  document.getElementById('enter-btn').addEventListener('click',enter);
  document.getElementById('back-btn').addEventListener('click',leave);
  document.getElementById('lbx').addEventListener('click',closeLb);
  /* lightbox backdrop close — only pointer, not touch propagation */
  document.getElementById('lb').addEventListener('pointerdown',e=>{
    if(e.target===document.getElementById('lb'))closeLb();
  });
  ['mute-btn','mute-btn2'].forEach(id=>{
    const b=document.getElementById(id);
    if(b)b.addEventListener('click',toggleMusic);
  });
});

function hideLoader(){
  const el=document.getElementById('loader');
  el.classList.add('fo');
  el.addEventListener('transitionend',()=>el.remove(),{once:true});
}

/* === LANDING BG === */
function initBg(){
  const cv=document.getElementById('bg-canvas'),ctx=cv.getContext('2d');
  let w,h,stars;
  function resize(){
    w=cv.width=innerWidth;h=cv.height=innerHeight;
    stars=Array.from({length:260},()=>({
      x:Math.random()*w,y:Math.random()*h,
      r:Math.random()*1.2+.3,ph:Math.random()*Math.PI*2,sp:Math.random()*.005+.002
    }));
  }
  function draw(){
    requestAnimationFrame(draw);ctx.clearRect(0,0,w,h);
    stars.forEach(s=>{
      s.ph+=s.sp;
      const a=.15+.6*(.5+.5*Math.sin(s.ph));
      ctx.beginPath();ctx.arc(s.x,s.y,s.r,0,Math.PI*2);
      ctx.fillStyle=`rgba(215,205,255,${a})`;ctx.fill();
    });
  }
  window.addEventListener('resize',resize);resize();requestAnimationFrame(draw);
}

/* === TEXTURES === */
function loadTextures(){
  return Promise.all(PHOTOS.map((p,i)=>new Promise(res=>{
    const img=new Image();img.crossOrigin='anonymous';
    img.onload=()=>{ptex[i]=circleTex(img);res();};
    img.onerror=()=>{ptex[i]=fbTex(FB[i%FB.length],i);res();};
    img.src=p.src;
  })));
}
function circleTex(img){
  const s=TSIZ,cv=document.createElement('canvas');cv.width=cv.height=s;
  const c=cv.getContext('2d');
  c.beginPath();c.arc(s/2,s/2,s/2-1,0,Math.PI*2);c.clip();
  const a=img.width/img.height;let sw=s,sh=s,sx=0,sy=0;
  if(a>1){sw=s*a;sx=-(sw-s)/2;}else{sh=s/a;sy=-(sh-s)/2;}
  c.drawImage(img,sx,sy,sw,sh);
  const g=c.createRadialGradient(s/2,s/2,s*.36,s/2,s/2,s/2);
  g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(.72,'rgba(155,89,245,0)');g.addColorStop(1,'rgba(155,89,245,.55)');
  c.beginPath();c.arc(s/2,s/2,s/2,0,Math.PI*2);c.fillStyle=g;c.fill();
  return new THREE.CanvasTexture(cv);
}
function fbTex(color,idx){
  const s=TSIZ,cv=document.createElement('canvas');cv.width=cv.height=s;
  const c=cv.getContext('2d');
  c.beginPath();c.arc(s/2,s/2,s/2-1,0,Math.PI*2);c.clip();
  const g=c.createRadialGradient(s/2,s/2,0,s/2,s/2,s/2);
  g.addColorStop(0,'#'+color.toString(16).padStart(6,'0'));g.addColorStop(1,'rgba(0,0,0,.6)');
  c.fillStyle=g;c.fillRect(0,0,s,s);
  c.font=`${s*.44}px serif`;c.textAlign='center';c.textBaseline='middle';
  c.fillStyle='rgba(255,255,255,.8)';
  c.fillText(['❤️','💜','💙','🌟','✨','💫'][idx%6],s/2,s/2);
  return new THREE.CanvasTexture(cv);
}

/* === ENTER/LEAVE === */
function enter(){
  document.getElementById('landing').classList.add('fo');
  const el=document.getElementById('galaxy-scene');
  el.classList.remove('hidden');setTimeout(()=>el.classList.add('visible'),50);
  if(!built){built=true;initScene();}
  playMusic();
}
function leave(){
  const el=document.getElementById('galaxy-scene');
  el.classList.remove('visible');setTimeout(()=>el.classList.add('hidden'),1000);
  document.getElementById('landing').classList.remove('fo');
}

/* === THREE SCENE === */
function initScene(){
  const cv=document.getElementById('gc');
  rend=new THREE.WebGLRenderer({canvas:cv,antialias:true});
  rend.setPixelRatio(Math.min(devicePixelRatio,2));
  rend.setSize(innerWidth,innerHeight);
  rend.setClearColor(0x02010a,1);

  scene=new THREE.Scene();
  cam=new THREE.PerspectiveCamera(60,innerWidth/innerHeight,.1,300);

  grp=new THREE.Group();scene.add(grp);

  buildDust();buildSpiral();buildRings();buildSprites();buildPlanet();buildNebula();buildTextLabel();

  window.addEventListener('resize',onResize);

  /* ── ORBIT DRAG — mouse ── */
  cv.addEventListener('mousedown',e=>{
    drag.active=true;drag.x=e.clientX;drag.y=e.clientY;
  });
  window.addEventListener('mouseup',()=>{drag.active=false;});
  window.addEventListener('mousemove',e=>{
    mv.set((e.clientX/innerWidth)*2-1,-(e.clientY/innerHeight)*2+1);
    if(!drag.active)return;
    const dx=e.clientX-drag.x,dy=e.clientY-drag.y;
    drag.x=e.clientX;drag.y=e.clientY;
    orbit.tTheta-=dx*.005;
    orbit.tPhi=clamp(orbit.tPhi-dy*.005,.2,Math.PI-.2);
  });

  /* scroll zoom */
  cv.addEventListener('wheel',e=>{
    orbit.tRadius=clamp(orbit.tRadius+e.deltaY*.04,10,80);
  },{passive:true});

  /* ── ORBIT DRAG — touch (single finger) ── */
  let lastTouches=[];
  cv.addEventListener('touchstart',e=>{
    e.preventDefault();
    lastTouches=Array.from(e.touches).map(t=>({x:t.clientX,y:t.clientY,id:t.identifier}));
  },{passive:false});

  cv.addEventListener('touchmove',e=>{
    e.preventDefault();
    const cur=Array.from(e.touches).map(t=>({x:t.clientX,y:t.clientY,id:t.identifier}));

    if(cur.length===1&&lastTouches.length===1){
      /* single finger → orbit */
      const dx=cur[0].x-lastTouches[0].x;
      const dy=cur[0].y-lastTouches[0].y;
      orbit.tTheta-=dx*.006;
      orbit.tPhi=clamp(orbit.tPhi-dy*.006,.2,Math.PI-.2);
    } else if(cur.length===2&&lastTouches.length>=2){
      /* two fingers → pinch zoom */
      const prev=Math.hypot(lastTouches[0].x-lastTouches[1].x,lastTouches[0].y-lastTouches[1].y);
      const next=Math.hypot(cur[0].x-cur[1].x,cur[0].y-cur[1].y);
      orbit.tRadius=clamp(orbit.tRadius-(next-prev)*.08,10,80);
    }
    lastTouches=cur;
  },{passive:false});

  cv.addEventListener('touchend',e=>{
    e.preventDefault();
    lastTouches=Array.from(e.touches).map(t=>({x:t.clientX,y:t.clientY,id:t.identifier}));

    /* tap to open photo — only if single short tap */
    if(e.changedTouches.length===1&&e.touches.length===0){
      const t=e.changedTouches[0];
      mv.set((t.clientX/innerWidth)*2-1,-(t.clientY/innerHeight)*2+1);
      rc.setFromCamera(mv,cam);
      const hits=rc.intersectObjects(sprites);
      if(hits.length){
        touchJustFired=true;
        openLb(hits[0].object.userData.pi,hits[0].object.userData.cap);
        /* clear flag after a tick so click doesn't also fire */
        setTimeout(()=>{touchJustFired=false;},300);
      }
    }
  },{passive:false});

  /* click (desktop) — skip if touch already handled */
  cv.addEventListener('click',e=>{
    if(touchJustFired)return;
    mv.set((e.clientX/innerWidth)*2-1,-(e.clientY/innerHeight)*2+1);
    rc.setFromCamera(mv,cam);
    const hits=rc.intersectObjects(sprites);
    if(hits.length)openLb(hits[0].object.userData.pi,hits[0].object.userData.cap);
  });

  loop();
}

function clamp(v,a,b){return Math.max(a,Math.min(b,v));}

/* === BUILD OBJECTS === */
function buildDust(){
  const geo=new THREE.BufferGeometry();
  const pos=new Float32Array(NDUST*3),col=new Float32Array(NDUST*3);
  const pal=[new THREE.Color(0x9b59f5),new THREE.Color(0x4fc3f7),new THREE.Color(0xf06292),new THREE.Color(0xe8e0ff)];
  for(let i=0;i<NDUST;i++){
    const r=8+Math.random()*70,th=Math.random()*Math.PI*2,ph=Math.acos(2*Math.random()-1);
    pos[i*3]=r*Math.sin(ph)*Math.cos(th);pos[i*3+1]=r*Math.sin(ph)*Math.sin(th)*.22;pos[i*3+2]=r*Math.cos(ph);
    const c=pal[i%pal.length];col[i*3]=c.r;col[i*3+1]=c.g;col[i*3+2]=c.b;
  }
  geo.setAttribute('position',new THREE.BufferAttribute(pos,3));
  geo.setAttribute('color',new THREE.BufferAttribute(col,3));
  dust=new THREE.Points(geo,new THREE.PointsMaterial({size:.055,vertexColors:true,transparent:true,opacity:.45,depthWrite:false}));
  scene.add(dust);
}

function buildSpiral(){
  const geo=new THREE.BufferGeometry();
  const pos=new Float32Array(NSTARS*3),col=new Float32Array(NSTARS*3);
  for(let i=0;i<NSTARS;i++){
    const arm=i%ARMS,t=Math.random();
    const theta=(arm/ARMS)*Math.PI*2+t*Math.PI*4.5;
    const r=.4+t*20,sc=(.5+t*2.2)*(Math.random()-.5)*2;
    let x,y,z;
    if(t<.12){x=(Math.random()-.5)*6;y=(Math.random()-.5)*.3;z=(Math.random()-.5)*1.5;}
    else{x=Math.cos(theta)*r+sc*(Math.random()-.5);y=(Math.random()-.5)*(.3+t*.6);z=Math.sin(theta)*r+sc*(Math.random()-.5);}
    pos[i*3]=x;pos[i*3+1]=y;pos[i*3+2]=z;
    const br=1-t*.7,c=new THREE.Color();
    if(t<.25)c.setRGB(br*.9,br*.85,br);
    else if(t<.55)c.lerpColors(new THREE.Color(0x9b8fff),new THREE.Color(0x6a4fcf),t);
    else c.lerpColors(new THREE.Color(0x5b3fa0),new THREE.Color(0x2a1a5e),(t-.55)/.45);
    col[i*3]=c.r;col[i*3+1]=c.g;col[i*3+2]=c.b;
  }
  geo.setAttribute('position',new THREE.BufferAttribute(pos,3));
  geo.setAttribute('color',new THREE.BufferAttribute(col,3));
  grp.add(new THREE.Points(geo,new THREE.PointsMaterial({size:.13,vertexColors:true,transparent:true,opacity:.82,sizeAttenuation:true,depthWrite:false})));
}

function buildRings(){
  const colors=[0xc084fc,0x818cf8,0x4fc3f7,0x9b59f5,0xf06292,0x67e8f9];
  [3,5,7.5,10,13,16].forEach((r,i)=>{
    const m=new THREE.Mesh(
      new THREE.RingGeometry(r-.03,r+.03,128),
      new THREE.MeshBasicMaterial({color:colors[i%colors.length],side:THREE.DoubleSide,transparent:true,opacity:.09+i*.022,depthWrite:false})
    );
    m.rotation.x=Math.PI/2+(Math.random()-.5)*.22;
    m.rotation.z=(Math.random()-.5)*.22;
    grp.add(m);
  });
}

function buildSprites(){
  const orb=[3,5,7.5,10,13,16],cnt=[6,10,16,22,30,38];
  orb.forEach((r,oi)=>{
    for(let j=0;j<cnt[oi];j++){
      const ang=(j/cnt[oi])*Math.PI*2+Math.random()*.26;
      const idx=(oi*cnt[oi]+j)%PHOTOS.length;
      const tex=ptex[idx]||fbTex(FB[idx%FB.length],idx);
      const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true,opacity:.92,depthWrite:false}));
      const bs=.24+Math.random()*.15;sp.scale.set(bs,bs,1);
      const yo=(Math.random()-.5)*.38;
      sp.position.set(Math.cos(ang)*r,yo,Math.sin(ang)*r);
      sp.userData={ang,r,yo,bs,spd:.00011+Math.random()*.0001,pi:idx,cap:PHOTOS[idx].cap};
      grp.add(sp);sprites.push(sp);
    }
  });
}

function buildPlanet(){
  const gt=glowTex();
  grp.add(new THREE.Mesh(new THREE.SphereGeometry(1.1,32,32),
    new THREE.MeshBasicMaterial({color:0x6d28d9,transparent:true,opacity:.9})));
  const h1=new THREE.Sprite(new THREE.SpriteMaterial({map:gt,color:0x7c3aed,transparent:true,opacity:.48,blending:THREE.AdditiveBlending,depthWrite:false}));
  h1.scale.set(5,5,1);grp.add(h1);
  const h2=new THREE.Sprite(new THREE.SpriteMaterial({map:gt,color:0x4fc3f7,transparent:true,opacity:.2,blending:THREE.AdditiveBlending,depthWrite:false}));
  h2.scale.set(8.5,8.5,1);grp.add(h2);
}

function buildNebula(){
  const gt=glowTex();
  [[5,.5,-4,0x9b59f5,9,.06],[-6,-.5,5,0x4fc3f7,11,.05],[3,0,8,0xf06292,7,.04],[-8,1,-6,0xc084fc,13,.05]]
  .forEach(([x,y,z,c,s,o])=>{
    const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:gt,color:c,transparent:true,opacity:o,blending:THREE.AdditiveBlending,depthWrite:false}));
    sp.position.set(x,y,z);sp.scale.set(s,s,1);grp.add(sp);
  });
}

function glowTex(){
  const s=256,cv=document.createElement('canvas');cv.width=cv.height=s;
  const c=cv.getContext('2d');
  const g=c.createRadialGradient(s/2,s/2,0,s/2,s/2,s/2);
  g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(.3,'rgba(255,255,255,.55)');g.addColorStop(1,'rgba(255,255,255,0)');
  c.fillStyle=g;c.fillRect(0,0,s,s);return new THREE.CanvasTexture(cv);
}

/* === TEXT LABEL — Bebas Neue cinematic === */
function buildTextLabel(){
  /* Load Bebas Neue via FontFace API so canvas can use it */
  const ff=new FontFace('BebasNeue','url(https://fonts.gstatic.com/s/bebasneue/v14/JTUSjIg69CK48gW7PXoo9WlhyyTh89Y.woff2)');
  ff.load().then(f=>{
    document.fonts.add(f);
    renderTextLabel();
  }).catch(()=>renderTextLabel()); // fallback if font fails
}

function renderTextLabel(){
  const W=1500,H=300,cv=document.createElement('canvas');cv.width=W;cv.height=H;
  const c=cv.getContext('2d');c.clearRect(0,0,W,H);

  /* sub line — thin cinzel */
  c.font='500 20px Cinzel,serif';
  c.fillStyle='rgba(190,180,255,.32)';
  c.textAlign='center';
  c.letterSpacing='0.4em';
  c.fillText('Y A R A  S A Y A N G  L A T I F',W/2,40);
  c.letterSpacing='0';

  /* Main line 1 — Bebas Neue BOLD CINEMATIC */
  c.font='normal 110 BebasNeue,"Arial Narrow",sans-serif';
  c.fillStyle='rgba(232,224,255,.97)';
  c.shadowColor='rgba(155,89,245,1)';c.shadowBlur=30;
  c.fillText('MAYYYLOOOOPPP',W/2,145);

  /* Main line 2 — gradient */
  const gr=c.createLinearGradient(100,150,800,230);
  gr.addColorStop(0,'#c084fc');gr.addColorStop(.3,'#818cf8');gr.addColorStop(.65,'#4fc3f7');gr.addColorStop(1,'#f9a8d4');
  c.font='normal 90px BebasNeue,"Arial Narrow",sans-serif';
  c.fillStyle=gr;
  c.shadowColor='rgba(79,195,247,.8)';c.shadowBlur=28;
  c.fillText('INDAH CASEYANA',W/2,248);

  /* bottom caption */
  c.font='italic 19px "Cormorant Garamond",Georgia,serif';
  c.fillStyle='rgba(155,145,200,.28)';c.shadowBlur=0;
  c.fillText('every star here is a memory of you',W/2,287);

  const tex=new THREE.CanvasTexture(cv);
  if(texLabel){grp.remove(texLabel);texLabel.material.dispose();}
  texLabel=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true,depthWrite:false,depthTest:false}));
  texLabel.scale.set(14,14*(H/W),1);
  texLabel.position.set(0,5.5,0);
  texLabel.renderOrder=999;
  grp.add(texLabel);
}

/* === MAIN LOOP === */
let clk=null;
function loop(){
  if(!clk)clk=new THREE.Clock();
  requestAnimationFrame(loop);
  const t=clk.getElapsedTime();

  /* smooth orbit interpolation */
  orbit.theta+=(orbit.tTheta-orbit.theta)*.06;
  orbit.phi  +=(orbit.tPhi  -orbit.phi  )*.06;
  orbit.radius+=(orbit.tRadius-orbit.radius)*.06;

  /* auto slow Y rotation — add to theta target so drag still works */
  orbit.tTheta+=.0008;

  /* convert spherical → cartesian for camera */
  const sinP=Math.sin(orbit.phi),cosP=Math.cos(orbit.phi);
  const sinT=Math.sin(orbit.theta),cosT=Math.cos(orbit.theta);
  cam.position.set(
    orbit.radius*sinP*sinT,
    orbit.radius*cosP,
    orbit.radius*sinP*cosT
  );
  cam.lookAt(0,0,0);

  /* galaxy slow drift */
  if(dust)dust.rotation.y=t*.004;

  /* animate sprites along orbit */
  sprites.forEach(sp=>{
    const d=sp.userData;d.ang+=d.spd;
    sp.position.set(Math.cos(d.ang)*d.r,d.yo,Math.sin(d.ang)*d.r);
  });

  /* text always faces camera */
  if(texLabel){
    texLabel.position.set(0,5.5,0);
  }

  /* hover highlight (desktop) */
  rc.setFromCamera(mv,cam);
  const h=rc.intersectObjects(sprites);
  const hit=h.length?h[0].object:null;
  if(hov&&hov!==hit){hov.scale.setScalar(hov.userData.bs);hov.material.opacity=.92;}
  if(hit){hit.scale.setScalar(hit.userData.bs*2.3);hit.material.opacity=1;document.getElementById('gc').style.cursor='pointer';}
  else document.getElementById('gc').style.cursor='';
  hov=hit;

  rend.render(scene,cam);
}

/* === EVENTS === */
function onResize(){
  cam.aspect=innerWidth/innerHeight;
  cam.updateProjectionMatrix();
  rend.setSize(innerWidth,innerHeight);
}

/* === LIGHTBOX === */
function openLb(idx,cap){
  document.getElementById('lbimg').src=PHOTOS[idx].src;
  document.getElementById('lbcap').textContent=cap||'';
  const l=document.getElementById('lb');
  l.classList.remove('hidden');
  requestAnimationFrame(()=>l.classList.add('visible'));
}
function closeLb(){
  const l=document.getElementById('lb');
  l.classList.remove('visible');
  setTimeout(()=>l.classList.add('hidden'),380);
}

/* === MUSIC === */
function playMusic(){
  const has=audio.querySelector('source')||(audio.src&&audio.src!==location.href);
  if(!has)return;
  audio.volume=.3;audio.loop=true;
  audio.play().then(()=>{playing=true;updateMute();}).catch(()=>{});
}
function toggleMusic(){
  if(playing){audio.pause();playing=false;}
  else{audio.play().then(()=>{playing=true;}).catch(()=>{});}
  updateMute();
}
function updateMute(){
  const ic=playing?'♪':'♩';
  ['mute-btn','mute-btn2'].forEach(id=>{const b=document.getElementById(id);if(b)b.textContent=ic;});
}
