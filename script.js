
const menu=document.querySelector('.menu');const mobile=document.querySelector('.mobile-menu');if(menu){menu.addEventListener('click',()=>mobile.classList.toggle('open'));mobile.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>mobile.classList.remove('open')))}
const current=location.pathname.split('/').pop()||'index.html';document.querySelectorAll('.desktop-nav a,.mobile-menu a').forEach(a=>{const href=a.getAttribute('href');if(href&&href.endsWith(current))a.classList.add('active')});
const reveals=document.querySelectorAll('.reveal');const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting)e.target.classList.add('in')}),{threshold:.12});reveals.forEach(e=>io.observe(e));
function setupCanvas(id,mode){
const c=document.getElementById(id);if(!c)return;const ctx=c.getContext('2d');let w,h,dpr,rot=0,mouseX=0,mouseY=0;
function size(){const r=c.getBoundingClientRect();dpr=Math.min(devicePixelRatio||1,2);w=r.width;h=r.height;c.width=w*dpr;c.height=h*dpr;ctx.setTransform(dpr,0,0,dpr,0,0)}
size();addEventListener('resize',size);addEventListener('pointermove',e=>{mouseX=(e.clientX/innerWidth-.5);mouseY=(e.clientY/innerHeight-.5)});
if(mode==='hero'){
 let particles=Array.from({length:130},()=>({a:Math.random()*Math.PI*2,r:.35+Math.random()*.72,z:Math.random(),s:.5+Math.random()*1.8,phase:Math.random()*6.28}));
 function drawHero(){
  ctx.clearRect(0,0,w,h);rot+=.006;const cx=w*.51+mouseX*10,cy=h*.49+mouseY*7;const R=Math.min(w,h)*.30;
  ctx.save();ctx.translate(cx,cy);
  const halo=ctx.createRadialGradient(0,0,R*.05,0,0,R*1.45);halo.addColorStop(0,'rgba(151,112,255,.30)');halo.addColorStop(.34,'rgba(76,104,255,.16)');halo.addColorStop(.62,'rgba(226,59,229,.08)');halo.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=halo;ctx.fillRect(-R*1.5,-R*1.5,R*3,R*3);
  ctx.rotate(Math.sin(rot*.7)*.08);
  const sphere=ctx.createRadialGradient(-R*.28,-R*.32,R*.04,R*.02,R*.02,R*1.05);sphere.addColorStop(0,'rgba(255,238,255,.96)');sphere.addColorStop(.10,'rgba(238,131,255,.95)');sphere.addColorStop(.30,'rgba(121,91,255,.96)');sphere.addColorStop(.55,'rgba(46,155,255,.96)');sphere.addColorStop(.72,'rgba(214,47,232,.88)');sphere.addColorStop(.90,'rgba(20,15,45,.95)');sphere.addColorStop(1,'rgba(3,3,8,1)');
  ctx.shadowBlur=55;ctx.shadowColor='rgba(101,82,255,.42)';ctx.fillStyle=sphere;ctx.beginPath();ctx.arc(0,0,R*.82,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
  ctx.save();ctx.globalCompositeOperation='screen';ctx.clip();
  for(let i=0;i<7;i++){const a=rot*(i%2?1:-1)+i*.72;ctx.save();ctx.rotate(a);ctx.beginPath();ctx.ellipse(0,0,R*(.74+i*.035),R*(.18+i*.018),0,0,Math.PI*2);const g=ctx.createLinearGradient(-R,0,R,0);g.addColorStop(0,'rgba(255,71,231,0)');g.addColorStop(.2,'rgba(255,82,236,.55)');g.addColorStop(.48,'rgba(93,129,255,.78)');g.addColorStop(.76,'rgba(75,215,255,.5)');g.addColorStop(1,'rgba(255,170,91,0)');ctx.strokeStyle=g;ctx.lineWidth=R*.035;ctx.stroke();ctx.restore()}
  ctx.restore();
  ctx.strokeStyle='rgba(228,225,255,.26)';ctx.lineWidth=1;for(let i=0;i<3;i++){ctx.save();ctx.rotate(-rot*.5+i*.85);ctx.beginPath();ctx.ellipse(0,0,R*(1.0+i*.13),R*(.30+i*.045),0,0,Math.PI*2);ctx.stroke();ctx.restore()}
  particles.forEach(p=>{const a=p.a+rot*(.8+p.z*.35);const x=Math.cos(a)*R*(.72+p.r*.32);const y=Math.sin(a)*R*(.28+p.r*.13);const alpha=.08+.62*p.z;ctx.fillStyle=`rgba(232,229,255,${alpha})`;ctx.fillRect(x,y,p.s,p.s)});
  ctx.restore();requestAnimationFrame(drawHero)
 }
 drawHero();return;
}
const pts=[];for(let i=0;i<190;i++){let a=Math.random()*Math.PI*2,r=.35+Math.random()*.65;pts.push({a,r,z:Math.random(),s:.5+Math.random()*1.8})}
function draw(){ctx.clearRect(0,0,w,h);rot+=.004;let cx=w/2,cy=h/2,scale=Math.min(w,h)*.34;ctx.save();ctx.translate(cx,cy);ctx.rotate(Math.sin(rot)*.08);let glow=ctx.createRadialGradient(0,0,10,0,0,scale*1.4);glow.addColorStop(0,'rgba(100,80,255,.20)');glow.addColorStop(.45,'rgba(205,60,255,.08)');glow.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=glow;ctx.fillRect(-scale*1.5,-scale*1.5,scale*3,scale*3);const layers=7;for(let l=0;l<layers;l++){let ang=rot*(l%2?1:-1)+l*.7;ctx.save();ctx.rotate(ang);let ww=scale*(1.1-l*.09),hh=scale*(.23-l*.018);ctx.beginPath();ctx.roundRect(-ww/2,-hh/2,ww,hh,hh*.45);let g=ctx.createLinearGradient(-ww/2,0,ww/2,0);g.addColorStop(0,'rgba(220,65,255,.9)');g.addColorStop(.48,'rgba(89,82,255,.95)');g.addColorStop(1,'rgba(72,205,255,.88)');ctx.fillStyle=g;ctx.shadowBlur=26;ctx.shadowColor='rgba(100,90,255,.4)';ctx.fill();ctx.restore()}ctx.strokeStyle='rgba(185,178,255,.18)';ctx.lineWidth=1;for(let i=0;i<3;i++){ctx.beginPath();ctx.ellipse(0,0,scale*(1.05+i*.12),scale*(.34+i*.04),rot*.4+i*.7,0,Math.PI*2);ctx.stroke()}pts.forEach(p=>{let a=p.a+rot*(1+p.z*.3);let x=Math.cos(a)*scale*(.7+p.r*.35);let y=Math.sin(a)*scale*(.24+p.r*.14);let alpha=.15+.65*p.z;ctx.fillStyle=`rgba(210,208,235,${alpha})`;ctx.fillRect(x,y,p.s,p.s)});ctx.restore();requestAnimationFrame(draw)}draw()}
setupCanvas('hero3d','hero');setupCanvas('system3d','system');
const verify=document.getElementById('verifyBtn');if(verify){verify.addEventListener('click',()=>{const s=document.getElementById('demoStatus');s.textContent='Verified onchain. Demo result refreshed locally.';s.style.color='#9de9b2'})}

function setupDemo3D(){
 const c=document.getElementById('demo3d'); if(!c)return;
 const ctx=c.getContext('2d'); let w=0,h=0,dpr=1,t=0,mx=0,my=0;
 const nodes=['LICENSE','ROYALTIES','ATTRIBUTION','TRANSFER','USAGE','STATUS'];
 const particles=Array.from({length:180},()=>({a:Math.random()*Math.PI*2,r:.45+Math.random()*.75,z:.2+Math.random()*.8,s:.5+Math.random()*1.5}));
 function size(){const r=c.getBoundingClientRect();dpr=Math.min(devicePixelRatio||1,2);w=r.width;h=r.height;c.width=w*dpr;c.height=h*dpr;ctx.setTransform(dpr,0,0,dpr,0,0)}
 size();addEventListener('resize',size);c.parentElement.addEventListener('pointermove',e=>{const r=c.parentElement.getBoundingClientRect();mx=(e.clientX-r.left)/r.width-.5;my=(e.clientY-r.top)/r.height-.5});
 function ellipseLine(cx,cy,rx,ry,angle,alpha){ctx.save();ctx.translate(cx,cy);ctx.rotate(angle);ctx.beginPath();ctx.ellipse(0,0,rx,ry,0,0,Math.PI*2);ctx.strokeStyle=`rgba(166,157,255,${alpha})`;ctx.lineWidth=1;ctx.stroke();ctx.restore()}
 function draw(){ctx.clearRect(0,0,w,h);t+=.006;const cx=w*.5+mx*18,cy=h*.51+my*12,R=Math.min(w,h)*.31;ctx.save();ctx.translate(cx,cy);ctx.rotate(Math.sin(t*.8)*.045);
   const glow=ctx.createRadialGradient(0,0,R*.08,0,0,R*1.65);glow.addColorStop(0,'rgba(120,92,255,.23)');glow.addColorStop(.35,'rgba(69,137,255,.11)');glow.addColorStop(.62,'rgba(220,58,236,.07)');glow.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=glow;ctx.fillRect(-R*1.7,-R*1.7,R*3.4,R*3.4);
   for(let i=0;i<9;i++){const a=t*(i%2?1:-1)*(.65+i*.04)+i*.55;ctx.save();ctx.rotate(a);const ww=R*(1.25-i*.055),hh=R*(.13+i*.014);ctx.beginPath();ctx.ellipse(0,0,ww,hh,0,0,Math.PI*2);const g=ctx.createLinearGradient(-ww,0,ww,0);g.addColorStop(0,'rgba(226,62,235,0)');g.addColorStop(.2,'rgba(235,64,239,.52)');g.addColorStop(.48,'rgba(87,117,255,.86)');g.addColorStop(.72,'rgba(75,211,255,.55)');g.addColorStop(1,'rgba(255,184,105,0)');ctx.strokeStyle=g;ctx.lineWidth=Math.max(2,R*.022);ctx.shadowBlur=18;ctx.shadowColor='rgba(102,87,255,.35)';ctx.stroke();ctx.restore()}
   for(let i=0;i<5;i++)ellipseLine(0,0,R*(.72+i*.18),R*(.22+i*.045),t*(i%2?-.35:.35)+i*.45,.12+.025*i);
   const core=ctx.createRadialGradient(-R*.28,-R*.32,R*.03,0,0,R*.75);core.addColorStop(0,'rgba(255,255,255,.98)');core.addColorStop(.12,'rgba(245,150,255,.96)');core.addColorStop(.34,'rgba(123,103,255,.98)');core.addColorStop(.62,'rgba(51,159,255,.96)');core.addColorStop(.82,'rgba(211,51,231,.82)');core.addColorStop(1,'rgba(5,5,14,.96)');ctx.shadowBlur=45;ctx.shadowColor='rgba(105,90,255,.48)';ctx.fillStyle=core;ctx.beginPath();ctx.arc(0,0,R*.55,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
   particles.forEach(p=>{const a=p.a+t*(.5+p.z*.7);const x=Math.cos(a)*R*(.75+p.r*.33);const y=Math.sin(a)*R*(.24+p.r*.14);ctx.fillStyle=`rgba(225,222,245,${.12+.5*p.z})`;ctx.fillRect(x,y,p.s,p.s)});
   ctx.restore(); requestAnimationFrame(draw)
 }
 draw();
}
setupDemo3D();
