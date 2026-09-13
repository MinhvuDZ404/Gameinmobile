import * as THREE from 'three';

const app = document.getElementById('game');
const isMobile = matchMedia('(pointer: coarse)').matches || innerWidth < 800;
const state = {
  playing:false, paused:false, crystals:0, fuel:100, credits:250, score:0,
  boost:false, zone:0, time:0, energy:100, combo:0, harvestCooldown:0,
  upgrades:{engine:0, tank:0, collector:0, hull:0, scanner:0, stabilizer:0}
};
const zoneDefs = [
  {name:'Luminous Grove', hint:'Những cây tinh thể đầu tiên đang phát sáng.', gate:0, color:0x64efff},
  {name:'Aurora Marsh', hint:'Bão plasma dày hơn, phần thưởng cũng lớn hơn.', gate:10, color:0x9a83ff},
  {name:'Prism Basin', hint:'Tinh thể hiếm xuất hiện quanh các mạch đá tím.', gate:20, color:0xffd36a}
];

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050816);
scene.fog = new THREE.FogExp2(0x071027, 0.0065);
const camera = new THREE.PerspectiveCamera(68, innerWidth/innerHeight, 0.1, 900);
camera.position.set(0, 7, 16);
const renderer = new THREE.WebGLRenderer({antialias:true, powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio, isMobile ? 1.65 : 2));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
app.appendChild(renderer.domElement);

const hemi = new THREE.HemisphereLight(0x9bbdff, 0x101629, 1.3); scene.add(hemi);
const moon = new THREE.DirectionalLight(0x82bfff, 2.0); moon.position.set(-30,50,15); scene.add(moon);
const sun = new THREE.PointLight(0x66e9ff, 38, 110); sun.position.set(0,16,0); scene.add(sun);

const world = new THREE.Group(); scene.add(world);
const terrain = new THREE.Group(); world.add(terrain);
const pickups = new THREE.Group(); world.add(pickups);
const scenery = new THREE.Group(); world.add(scenery);
const hazards = new THREE.Group(); world.add(hazards);

const mat = (c, e=0, rough=.7, metal=0) => new THREE.MeshStandardMaterial({color:c, emissive:e?c:0, emissiveIntensity:e, roughness:rough, metalness:metal});
const crystalMat = new THREE.MeshStandardMaterial({color:0x8ffaff, emissive:0x45dfff, emissiveIntensity:2.4, roughness:.18, metalness:.15, transparent:true, opacity:.92});
const mossMat = mat(0x173c45, .35, .9);
const rockMat = mat(0x26314d, 0.06, 1);

function rng(seed){ let x = Math.sin(seed*12.9898)*43758.5453; return x-Math.floor(x); }
function makeTerrain(){
  const size=520, seg=120;
  const g=new THREE.PlaneGeometry(size,size,seg,seg); g.rotateX(-Math.PI/2);
  const p=g.attributes.position;
  for(let i=0;i<p.count;i++){
    const x=p.getX(i), z=p.getZ(i);
    const h=Math.sin(x*.045)*2.1 + Math.cos(z*.052)*1.7 + Math.sin((x+z)*.018)*3.2 + Math.cos(x*.11-z*.07)*.5;
    p.setY(i,h*.55-2);
  }
  g.computeVertexNormals();
  const m=new THREE.MeshStandardMaterial({color:0x10192d,roughness:1,metalness:.05});
  const mesh=new THREE.Mesh(g,m); mesh.receiveShadow=false; terrain.add(mesh);
  for(let i=0;i<180;i++){
    const a=rng(i*17.3)*Math.PI*2, r=30+rng(i*4.8)*220, x=Math.cos(a)*r,z=Math.sin(a)*r;
    const s=.4+rng(i*5.4)*1.8; const rock=new THREE.Mesh(new THREE.DodecahedronGeometry(s,0),rockMat);
    rock.position.set(x,-.1+rng(i)*2,z); rock.rotation.set(rng(i)*2,rng(i*2)*3,rng(i*3)*2); rock.scale.y=.5+rng(i*7); scenery.add(rock);
  }
}
function makeTrees(){
  const trunkMat=mat(0x202d32,.05,.95), leafMat=mat(0x204d56,.4,.9);
  for(let i=0;i<95;i++){
    const a=rng(100+i*3.2)*Math.PI*2,r=15+rng(200+i)*165,x=Math.cos(a)*r,z=Math.sin(a)*r;
    const h=3+rng(i*2.3)*5;
    const t=new THREE.Mesh(new THREE.CylinderGeometry(.28,.42,h,6),trunkMat); t.position.set(x,h*.5-1,z); scenery.add(t);
    const crown=new THREE.Mesh(new THREE.IcosahedronGeometry(1.8+rng(i*7)*1.6,1),leafMat); crown.position.set(x,h+0.1,z); crown.scale.y=1.25; scenery.add(crown);
  }
}
function makeStars(){
  const count=2200, pos=new Float32Array(count*3), col=new Float32Array(count*3);
  for(let i=0;i<count;i++){
    const u=rng(i*1.71), v=rng(i*3.13), r=380+u*180, th=v*Math.PI*2, y=(rng(i*8.5)-.5)*180;
    pos[i*3]=Math.cos(th)*r; pos[i*3+1]=y; pos[i*3+2]=Math.sin(th)*r;
    const c=0.35+rng(i*9)*.65; col[i*3]=.45*c; col[i*3+1]=.75*c; col[i*3+2]=c;
  }
  const g=new THREE.BufferGeometry(); g.setAttribute('position',new THREE.BufferAttribute(pos,3)); g.setAttribute('color',new THREE.BufferAttribute(col,3));
  const p=new THREE.Points(g,new THREE.PointsMaterial({size:isMobile?.9:1.2,vertexColors:true,transparent:true,opacity:.9})); scene.add(p);
}

makeTerrain(); makeTrees(); makeStars();

async function loadAtlas(){
  try{
    const res=await fetch('world-atlas.json');
    if(!res.ok) throw new Error('atlas fetch failed');
    const data=await res.json();
    const sample=data.records.filter((_,i)=>i%18===0).slice(0,700);
    const pos=new Float32Array(sample.length*3), sizes=new Float32Array(sample.length);
    sample.forEach((r,i)=>{pos[i*3]=r.x;pos[i*3+1]=r.y+1;pos[i*3+2]=r.z;sizes[i]=.6+(r.rarity*.11)});
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(pos,3));
    const atlasPoints=new THREE.Points(g,new THREE.PointsMaterial({color:0x7eeaff,size:isMobile?1.15:1.5,transparent:true,opacity:.42,sizeAttenuation:true}));
    atlasPoints.userData.count=data.records.length; atlasPoints.userData.schema=data.schema; scenery.add(atlasPoints);
  }catch(err){ console.warn('World atlas unavailable; procedural fallback remains active.'); }
}
loadAtlas();

const ship = new THREE.Group(); world.add(ship); ship.position.set(0,4,8);
const hull = new THREE.Mesh(new THREE.CapsuleGeometry(.72,2.2,6,12),mat(0x99a7c4,.08,.35,.75)); hull.rotation.x=Math.PI/2; ship.add(hull);
const cockpit = new THREE.Mesh(new THREE.SphereGeometry(.55,20,12),new THREE.MeshStandardMaterial({color:0x3d5f9d,emissive:0x2758c5,emissiveIntensity:1.2,roughness:.15,metalness:.35,transparent:true,opacity:.9})); cockpit.position.z=-.1; cockpit.scale.set(1,.55,1); ship.add(cockpit);
const wingL = new THREE.Mesh(new THREE.BoxGeometry(2.5,.12,.78),mat(0x54627f,.04,.45,.5)); wingL.position.x=-1.05; wingL.rotation.z=-.08; ship.add(wingL);
const wingR = wingL.clone(); wingR.position.x=1.05; wingR.rotation.z=.08; ship.add(wingR);
const engineGlow = new THREE.Mesh(new THREE.CylinderGeometry(.23,.5,.45,12),new THREE.MeshBasicMaterial({color:0x61efff,transparent:true,opacity:.92})); engineGlow.rotation.x=Math.PI/2; engineGlow.position.z=1.3; ship.add(engineGlow);
const ring = new THREE.Mesh(new THREE.TorusGeometry(1.5,.035,8,48),new THREE.MeshBasicMaterial({color:0x67e9ff,transparent:true,opacity:.45})); ring.rotation.x=Math.PI/2; ship.add(ring);

const player = {vel:new THREE.Vector3(), yaw:0, pitch:-.12, targetYaw:0, targetPitch:-.12};
const keys={}; addEventListener('keydown',e=>keys[e.key.toLowerCase()]=true); addEventListener('keyup',e=>keys[e.key.toLowerCase()]=false);

function spawnCrystals(){
  pickups.clear();
  const count=44;
  for(let i=0;i<count;i++){
    const a=rng(400+i*4.7)*Math.PI*2,r=12+rng(500+i)*175;
    const c=new THREE.Group(); const h=.9+rng(i*2)*1.5;
    const mesh=new THREE.Mesh(new THREE.OctahedronGeometry(.65,.1),crystalMat.clone()); mesh.scale.set(.72,h/1.2,.72); c.add(mesh);
    const halo=new THREE.Mesh(new THREE.SphereGeometry(.95,8,8),new THREE.MeshBasicMaterial({color:0x59eaff,transparent:true,opacity:.06})); c.add(halo);
    c.position.set(Math.cos(a)*r, 1+rng(i*9)*3, Math.sin(a)*r); c.userData={baseY:c.position.y,phase:rng(i*11)*6.28,value:1+rng(i*8)>0.78?2:1,active:true}; pickups.add(c);
  }
}
spawnCrystals();

function makeGate(position){
  const g=new THREE.Group();
  const torus=new THREE.Mesh(new THREE.TorusGeometry(7,.42,12,48),new THREE.MeshStandardMaterial({color:0x8567ff,emissive:0x6749ff,emissiveIntensity:1.9,roughness:.25,metalness:.6})); g.add(torus);
  const core=new THREE.Mesh(new THREE.CircleGeometry(6.4,48),new THREE.MeshBasicMaterial({color:0x2c1a66,transparent:true,opacity:.14,side:THREE.DoubleSide})); g.add(core);
  g.position.copy(position); g.rotation.y=Math.PI/2; g.userData.gate=true; world.add(g); return g;
}
const gates=[makeGate(new THREE.Vector3(140,5,-55)),makeGate(new THREE.Vector3(-170,7,-120)),makeGate(new THREE.Vector3(40,9,190))];

autoBarrier();
function autoBarrier(){
  for(let i=0;i<10;i++){
    const a=rng(720+i)*Math.PI*2,r=80+rng(740+i)*130;
    const orb=new THREE.Mesh(new THREE.IcosahedronGeometry(2.2+rng(i)*1.5,1),new THREE.MeshStandardMaterial({color:0x4c2a73,emissive:0x8b43f5,emissiveIntensity:1.1,transparent:true,opacity:.75}));
    orb.position.set(Math.cos(a)*r,5+rng(i*2)*8,Math.sin(a)*r); orb.userData={storm:true,base:orb.position.y,phase:rng(i*9)}; hazards.add(orb);
  }
}

const toast=document.getElementById('toast');
let toastTimer=0; function showToast(t){toast.textContent=t;toast.style.opacity='1';toastTimer=2.4}
function setHUD(){
  document.getElementById('crystals').textContent=state.crystals; document.getElementById('fuel').textContent=Math.max(0,Math.round(state.fuel)); document.getElementById('credits').textContent=state.credits;
  document.getElementById('missionBar').style.width=Math.min(100,(state.crystals/30)*100)+'%';
  const z=zoneDefs[state.zone]; document.getElementById('zoneName').textContent=z.name; document.getElementById('zoneHint').textContent=z.hint;
  document.getElementById('missionText').textContent=state.crystals>=30?'Đưa mẫu vật về Dock để hoàn thành vòng.':`Thu hoạch 30 tinh thể phát sáng (${state.crystals}/30)`;
}
setHUD();

function collect(){
  if(!state.playing || state.harvestCooldown>0) return;
  let best=null,bd=8;
  pickups.children.forEach(c=>{if(!c.userData.active)return; const d=c.position.distanceTo(ship.position); if(d<bd){best=c;bd=d;}});
  if(best){
    best.userData.active=false; best.visible=false; state.crystals+=best.userData.value; state.credits+=best.userData.value*4; state.score+=best.userData.value*10; state.combo=Math.min(12,state.combo+1); state.fuel=Math.min(100,state.fuel+1.5);
    showToast(`+${best.userData.value} tinh thể  ·  COMBO x${state.combo}`); setHUD();
    if(state.crystals===10||state.crystals===20) showToast(`Cổng sao đã mở: ${zoneDefs[state.crystals===10?1:2].name}`);
  } else { state.combo=0; }
  state.harvestCooldown=.28;
}

function refill(){state.fuel=100;state.credits=Math.max(0,state.credits-10);showToast('Đã tiếp nhiên liệu tại Dock');setHUD();}
function dock(){ if(ship.position.length()<12){document.getElementById('upgradeScreen').classList.remove('hidden'); renderUpgrades();} else showToast('Tiến gần trạm Dock hơn để nâng cấp.'); }

const upgradeDefs=[
  ['engine','Ion Engine','Tăng tốc độ tối đa',80],['tank','Aster Tank','Tăng dung lượng nhiên liệu',90],['collector','Prism Collector','Tăng giá trị tinh thể',110],['hull','Aurora Hull','Giảm tác động của bão',120],['scanner','Deep Scanner','Tăng phạm vi thu hoạch',130],['stabilizer','Drift Stabilizer','Giảm quán tính khi rẽ',100]
];
function renderUpgrades(){
  const box=document.getElementById('upgradeList'); box.innerHTML='';
  upgradeDefs.forEach(([id,name,desc,cost])=>{
    const lvl=state.upgrades[id], row=document.createElement('div'); row.className='upgrade-row';
    row.innerHTML=`<div><b>${name} · Lv.${lvl}</b><small>${desc}</small></div><button class="buy">${cost+lvl*45} ✦</button>`;
    row.querySelector('button').onclick=()=>{const price=cost+lvl*45;if(state.credits>=price&&lvl<5){state.credits-=price;state.upgrades[id]++;showToast(`${name} nâng lên Lv.${state.upgrades[id]}`);setHUD();renderUpgrades();}};box.appendChild(row);
  });
}

document.getElementById('startBtn').onclick=()=>{state.playing=true;document.getElementById('startScreen').classList.add('hidden');document.getElementById('touchUI').classList.remove('hidden');showToast('Hành trình bắt đầu — hãy săn tinh thể!');};
document.getElementById('resumeBtn').onclick=()=>{state.paused=false;document.getElementById('pauseScreen').classList.add('hidden');};
document.getElementById('resetBtn').onclick=()=>location.reload();
document.getElementById('closeUpgrade').onclick=()=>document.getElementById('upgradeScreen').classList.add('hidden');
document.getElementById('pauseBtn').onclick=()=>{state.paused=true;document.getElementById('pauseScreen').classList.remove('hidden');};
document.getElementById('actionBtn').onclick=collect; document.getElementById('dockBtn').onclick=dock;

const joy={active:false,id:null,x:0,y:0}; const joyEl=document.getElementById('joystick'), stick=document.getElementById('stick');
function updateStick(cx,cy){const r=48,dx=cx-58,dy=cy-58,len=Math.min(r,Math.hypot(dx,dy)),a=Math.atan2(dy,dx);joy.x=Math.cos(a)*len/r;joy.y=Math.sin(a)*len/r;stick.style.transform=`translate(${Math.cos(a)*len}px,${Math.sin(a)*len}px)`;}
joyEl.addEventListener('pointerdown',e=>{joy.active=true;joy.id=e.pointerId;joyEl.setPointerCapture(e.pointerId);updateStick(e.offsetX,e.offsetY)}); joyEl.addEventListener('pointermove',e=>{if(joy.active)updateStick(e.offsetX,e.offsetY)}); joyEl.addEventListener('pointerup',()=>{joy.active=false;joy.x=joy.y=0;stick.style.transform='translate(0,0)'}); joyEl.addEventListener('pointercancel',()=>{joy.active=false;joy.x=joy.y=0;stick.style.transform='translate(0,0)'});
let look={active:false,id:null,x:0,y:0,lastX:0,lastY:0}; const rightTouch=document.getElementById('rightTouch');
rightTouch.addEventListener('pointerdown',e=>{look.active=true;look.id=e.pointerId;look.lastX=e.clientX;look.lastY=e.clientY;rightTouch.setPointerCapture(e.pointerId)});
rightTouch.addEventListener('pointermove',e=>{if(!look.active)return; const dx=e.clientX-look.lastX,dy=e.clientY-look.lastY; player.targetYaw-=dx*.006; player.targetPitch-=dy*.004; player.targetPitch=THREE.MathUtils.clamp(player.targetPitch,-.55,.42); look.lastX=e.clientX;look.lastY=e.clientY;});
['pointerup','pointercancel'].forEach(ev=>rightTouch.addEventListener(ev,()=>look.active=false));
const boostBtn=document.getElementById('boostBtn'); boostBtn.addEventListener('pointerdown',()=>state.boost=true); ['pointerup','pointercancel','pointerleave'].forEach(ev=>boostBtn.addEventListener(ev,()=>state.boost=false));

function updatePlayer(dt){
  const keyboardX=(keys['d']?1:0)-(keys['a']?1:0), keyboardY=(keys['s']?1:0)-(keys['w']?1:0);
  const ix=keyboardX || joy.x, iy=keyboardY || joy.y;
  const engineLv=state.upgrades.engine, stab=state.upgrades.stabilizer;
  const speed=(state.boost?15:8.2)+(engineLv*1.1); const accel=state.boost?12:7;
  const forward=new THREE.Vector3(Math.sin(player.yaw),0,Math.cos(player.yaw));
  const right=new THREE.Vector3(Math.cos(player.yaw),0,-Math.sin(player.yaw));
  const desired=new THREE.Vector3().addScaledVector(forward,-iy).addScaledVector(right,ix).normalize().multiplyScalar(speed);
  if(desired.lengthSq()>0)player.vel.lerp(desired,1-Math.exp(-accel*dt)); else player.vel.multiplyScalar(Math.exp(-(3.5-stab*.3)*dt));
  ship.position.addScaledVector(player.vel,dt); ship.position.y=THREE.MathUtils.clamp(ship.position.y,1.5,28);
  ship.position.x=THREE.MathUtils.clamp(ship.position.x,-245,245); ship.position.z=THREE.MathUtils.clamp(ship.position.z,-245,245);
  player.yaw=THREE.MathUtils.damp(player.yaw,player.targetYaw,6,dt); player.pitch=THREE.MathUtils.damp(player.pitch,player.targetPitch,5,dt);
  ship.rotation.y=player.yaw; ship.rotation.z=THREE.MathUtils.clamp(-player.vel.x*.018,-.35,.35); ship.rotation.x=THREE.MathUtils.clamp(player.vel.z*.012,-.22,.22);
  state.fuel-=dt*((state.boost?3.0:0.45)+(Math.abs(ix)+Math.abs(iy))*.15); if(state.fuel<0){state.fuel=0;state.boost=false;player.vel.multiplyScalar(.97)}
}
function updateCamera(dt){
  const offset=new THREE.Vector3(0,5.8,13.5); offset.applyAxisAngle(new THREE.Vector3(0,1,0),player.yaw); const desired=ship.position.clone().add(offset); camera.position.lerp(desired,1-Math.exp(-5.5*dt));
  const lookAt=ship.position.clone().add(new THREE.Vector3(0,1.2,0)); lookAt.x+=Math.sin(player.yaw)*2.2; lookAt.z+=Math.cos(player.yaw)*2.2; camera.lookAt(lookAt);
}
function updateWorld(dt){
  pickups.children.forEach((c,i)=>{if(!c.userData.active)return;c.rotation.y+=dt*.75;c.rotation.x=Math.sin(state.time*1.4+c.userData.phase)*.08;c.position.y=c.userData.baseY+Math.sin(state.time*1.7+c.userData.phase)*.7});
  hazards.children.forEach((h,i)=>{h.rotation.x+=dt*.18;h.rotation.y+=dt*.25;h.position.y=h.userData.base+Math.sin(state.time*.6+h.userData.phase)*4;});
  gates.forEach((g,i)=>{g.rotation.z+=dt*(i%2?-.14:.11);g.scale.setScalar(1+.035*Math.sin(state.time*1.7+i));});
  engineGlow.scale.x=1+Math.sin(state.time*16)*(state.boost?.35:.08); ring.rotation.z=state.time*.5;
  if(Math.floor(state.time)%9===0 && Math.random()<.015)showToast('Một bầy sao bụi vừa lướt qua phía chân trời.');
}
function updateZone(){
  const c=ship.position.length(); const z=c>220?2:c>125?1:0; if(z!==state.zone){state.zone=z;scene.fog.color.setHex(z===0?0x071027:z===1?0x150d2e:0x2a1b0c);setHUD();showToast(`Đã vào ${zoneDefs[z].name}`)}
  gates[0].visible=state.crystals>=10; gates[1].visible=state.crystals>=20; gates[2].visible=state.crystals>=30;
}
function stormDamage(){
  hazards.children.forEach(h=>{const d=h.position.distanceTo(ship.position); if(d<9){state.fuel-=.045*(1-state.upgrades.hull*.12); state.combo=0; ship.rotation.z+=(Math.random()-.5)*.04;}});
}
function miniMap(){
  const c=document.getElementById('miniCanvas'),ctx=c.getContext('2d');ctx.clearRect(0,0,180,180);ctx.save();ctx.translate(90,90);ctx.strokeStyle='rgba(112,210,255,.13)';ctx.beginPath();ctx.arc(0,0,78,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.moveTo(-78,0);ctx.lineTo(78,0);ctx.moveTo(0,-78);ctx.lineTo(0,78);ctx.stroke();
  gates.forEach(g=>{if(!g.visible)return;const x=(g.position.x/250)*78,y=(g.position.z/250)*78;ctx.fillStyle='#987cff';ctx.fillRect(x-2,y-2,4,4)});ctx.fillStyle='#79edff';ctx.beginPath();ctx.arc((ship.position.x/250)*78,(ship.position.z/250)*78,4,0,Math.PI*2);ctx.fill();ctx.restore();
}

let last=performance.now(); function loop(now){requestAnimationFrame(loop);const raw=Math.min(.035,(now-last)/1000);last=now;if(!state.playing||state.paused){renderer.render(scene,camera);return} const dt=raw;state.time+=dt;state.harvestCooldown=Math.max(0,state.harvestCooldown-dt);updatePlayer(dt);updateWorld(dt);stormDamage();updateZone();updateCamera(dt);if(state.crystals>=30&&ship.position.length()<13){state.credits+=100;state.crystals=0;showToast('VÒNG HOÀN THÀNH! +100 tín dụng — vòng mới bắt đầu.');spawnCrystals();setHUD()} if(state.fuel<18 && Math.random()<.008)showToast('Nhiên liệu thấp — quay về Dock.');if(toastTimer>0){toastTimer-=dt;toast.style.opacity=String(Math.min(1,toastTimer*3))}miniMap();renderer.render(scene,camera)}requestAnimationFrame(loop);

addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,isMobile?1.65:2));});
