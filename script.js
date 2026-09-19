
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

const demo=document.querySelector('.rights-demo');
if(demo){
  const stack=demo.querySelector('.rights-stack');
  demo.addEventListener('pointermove',e=>{
    const r=demo.getBoundingClientRect();
    const x=(e.clientX-r.left)/r.width-.5;
    const y=(e.clientY-r.top)/r.height-.5;
    stack.style.transform=`translate(-50%,-50%) rotateX(${58-y*7}deg) rotateZ(${-18+x*8}deg) translateY(-8px)`;
  });
  demo.addEventListener('pointerleave',()=>{stack.style.transform='';});
}

/* Premium scroll choreography */
(function(){
  const page=document.querySelector('.page');
  if(!page) return;

  // Wrap meaningful copy into words so headings and body copy reveal with a staggered, cinematic entrance.
  const copySelectors='.section h2, .section-heading-row p, .section > p, .how-head p, .final h2, .final > p, .culture-card p, .how-steps p, .signal-grid h3, .signal-grid p';
  const targets=page.querySelectorAll(copySelectors);
  let wordIndex=0;
  const wrapText=(node)=>{
    if(node.nodeType!==Node.TEXT_NODE) return;
    const text=node.nodeValue;
    if(!text.trim()) return;
    const frag=document.createDocumentFragment();
    text.split(/(\s+)/).forEach(part=>{
      if(/^\s+$/.test(part)){frag.appendChild(document.createTextNode(part));return;}
      const span=document.createElement('span');
      span.className='scroll-word';
      span.style.setProperty('--i',wordIndex++);
      span.textContent=part;
      frag.appendChild(span);
    });
    node.parentNode.replaceChild(frag,node);
  };
  targets.forEach(el=>{
    if(el.dataset.wordsWrapped) return;
    el.dataset.wordsWrapped='1';
    wordIndex=0;
    const walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT);
    const nodes=[]; while(walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(wrapText);
    el.classList.add('scroll-copy');
  });

  const copyObserver=new IntersectionObserver(entries=>entries.forEach(entry=>{
    if(entry.isIntersecting){
      entry.target.classList.add('is-visible');
      copyObserver.unobserve(entry.target);
    }
  }),{threshold:.18,rootMargin:'0px 0px -8% 0px'});
  page.querySelectorAll('.scroll-copy').forEach(el=>copyObserver.observe(el));

  // Keep the next-section cue alive in the viewport and change its destination as the reader moves.
  const follow=document.querySelector('.scroll-follow');
  const sections=[...page.querySelectorAll('.scroll-section')];
  if(follow && sections.length){
    const nextLabel=follow.querySelector('strong');
    let active=0;
    const updateFollow=()=>{
      const center=innerHeight*.48;
      let nearest=0,dist=Infinity;
      sections.forEach((s,i)=>{
        const r=s.getBoundingClientRect();
        const d=Math.abs((r.top+r.height*.28)-center);
        if(d<dist){dist=d;nearest=i;}
      });
      active=nearest;
      const next=sections[Math.min(active+1,sections.length-1)];
      const label=next?.dataset.next || next?.querySelector('.section-label')?.textContent?.replace(/^\d+\s*\/\s*/,'') || 'Next';
      if(nextLabel && nextLabel.textContent!==label){
        nextLabel.animate([{opacity:1,transform:'translateY(0)'},{opacity:0,transform:'translateY(5px)'},{opacity:1,transform:'translateY(0)'}],{duration:360,easing:'cubic-bezier(.16,1,.3,1)'});
        nextLabel.textContent=label;
      }
      follow.classList.toggle('visible',scrollY>innerHeight*.35 && active<sections.length-1);
      const progress=Math.min(1,Math.max(0,scrollY/(document.documentElement.scrollHeight-innerHeight)));
      follow.style.setProperty('--follow-shift',`${Math.sin(progress*Math.PI*4)*5}px`);
    };
    let ticking=false;
    addEventListener('scroll',()=>{
      if(ticking)return;
      ticking=true;requestAnimationFrame(()=>{updateFollow();ticking=false;});
    },{passive:true});
    addEventListener('resize',updateFollow);
    updateFollow();
  }

  // Small parallax on the How It Works image; motion is tied to scroll position, not a timer.
  const bg=document.querySelector('.how-bg-image');
  if(bg){
    const updateBg=()=>{
      const r=bg.closest('.how').getBoundingClientRect();
      const p=(innerHeight*.5-(r.top+r.height*.5))/Math.max(innerHeight,r.height);
      bg.style.transform=`scale(1.08) translate3d(0,${p*70}px,0)`;
    };
    let frame=false;
    addEventListener('scroll',()=>{if(frame)return;frame=true;requestAnimationFrame(()=>{updateBg();frame=false;});},{passive:true});
    addEventListener('resize',updateBg); updateBg();
  }
})();
