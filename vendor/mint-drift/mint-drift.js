
(function(global){
const DEFAULTS=Object.freeze({"speed": 0.1, "density": 80, "fluidity": 2, "color": "#afcda4", "numbers": true, "blobDensity": 21, "stickiness": 0.8, "helixRadius": 88, "rotation": 216, "turns": 0.85, "blobSize": 6.3});
function mount(container,options={}){
 if(typeof container==='string')container=document.querySelector(container);
 if(!container)throw new Error('MintDrift.mount requires a container');
 const root=document.createElement('div');root.className='mint-drift';
 root.innerHTML="  <div class=\"mint-top\"><span class=\"mint-name\">mint drift <span> / numeric study</span></span><button type=\"button\" class=\"mint-pause cursor-interaction\" aria-pressed=\"false\">Pause</button></div>\n  <div class=\"mint-stage\"><canvas role=\"img\" aria-label=\"Three pastel green liquid strands rotating around a shared vertical axis in a triple helix, with orbiting digits\"></canvas><span class=\"mint-caption\">002 \u2014 triple helix</span></div>\n  <div class=\"mint-controls\" aria-label=\"Animation controls\"></div>\n  <div class=\"mint-fallback\" hidden><label>Speed <input aria-label=\"Speed\" type=\"range\" min=\"0.1\" max=\"2\" step=\"0.1\" value=\"0.65\"></label></div>\n";
 container.appendChild(root);
 if(!options.controls){root.querySelector('.mint-controls').hidden=true;root.querySelector('.mint-fallback').hidden=true;}
 if(options.chrome===false){root.querySelector('.mint-top').hidden=true;root.querySelector('.mint-caption').hidden=true;}
 if(options.height)root.querySelector('.mint-stage').style.height=typeof options.height==='number'?options.height+'px':options.height;
 let destroyed=false,raf=0;

 const canvas=root.querySelector('canvas'),ctx=canvas.getContext('2d');
 const layer=document.createElement('canvas');layer.width=300;layer.height=440;
 const lc=layer.getContext('2d',{willReadFrequently:true});
 const mask=document.createElement('canvas');mask.width=300;mask.height=440;
 const mc=mask.getContext('2d');
 const defaults=DEFAULTS;
 let state=Object.assign({},defaults,options.settings||{});
 let paused=options.paused??matchMedia('(prefers-reduced-motion: reduce)').matches,t=0,last=0,w=600,h=560,frame=0,gui;
 const paper='#f4f8ef',ink='#47634e',pale='#f7fbf3';
 const save=()=>options.onChange?.({...state});
 const rnd=n=>{const k=Math.sin(n*127.1+311.7)*43758.5453;return k-Math.floor(k)};
 const pauseButton=root.querySelector('.mint-pause');
 function pauseLabel(){pauseButton.textContent=paused?'Play':'Pause';pauseButton.setAttribute('aria-pressed',String(paused))}
 pauseLabel();pauseButton.addEventListener('click',()=>{paused=!paused;pauseLabel();save()});
 function resize(){const b=canvas.getBoundingClientRect();w=b.width;h=b.height;const d=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(w*d);canvas.height=Math.round(h*d);ctx.setTransform(d,0,0,d,0,0);draw()}
 const resizeObserver=new ResizeObserver(resize);resizeObserver.observe(canvas);
 function helix(q,strand,radial=1){
  const angle=q*Math.PI*2*state.turns+strand*Math.PI*2/3+t*.72+state.rotation*Math.PI/180;
  const radius=state.helixRadius*(.9+.1*Math.sin(q*Math.PI))*radial;
  const z=Math.cos(angle)*radius,perspective=470/(470-z);
  const sway=Math.sin(q*Math.PI*2+t*.2)*state.fluidity*3;
  return {x:150+(Math.sin(angle)*radius+sway)*perspective,y:220+(q-.5)*365+z*.035,z,scale:perspective};
 }
 function draw(){
  const scale=Math.min(w/390,h/480),cw=300,ch=440,ox=w/2-cw*scale/2,oy=h/2-ch*scale/2-5;
  const points=[];
  // Three phase-offset helices rotate together in real projected 3D.
  const nodes=Math.round(state.blobDensity);
  for(let strand=0;strand<3;strand++)for(let i=0;i<nodes;i++){
   const q=i/(nodes-1),p=helix(q,strand);
   const pulse=.5+.5*Math.sin(q*30-strand*2+t*.35);
   const radius=Math.max(2,state.blobSize+pulse*1.6+state.fluidity*.35*Math.sin(q*45+t))*p.scale;
   points.push({...p,r:radius,d:(i+strand*3)%10});
  }
  for(let i=0;i<Math.round(nodes*.25);i++){
   const p=helix(.03+rnd(i+430)*.94,rnd(i+190)*3,.85+rnd(i+800)*.35);
   points.push({...p,r:(3.9+rnd(i+310)*1.8)*p.scale,d:Math.floor((rnd(i+600)*10+t*.7)%10)});
  }
  points.sort((a,b)=>a.z-b.z);
  // Blur spreads each particle's influence; lowering the iso-threshold joins
  // nearby influences into bridges, independently of particle count.
  const blur=.7+state.stickiness*6,threshold=150-state.stickiness*110;
  lc.clearRect(0,0,cw,ch);lc.filter=`blur(${blur}px)`;lc.fillStyle=state.color;
  lc.beginPath();for(const p of points){lc.moveTo(p.x+p.r,p.y);lc.arc(p.x,p.y,p.r,0,Math.PI*2)}lc.fill();lc.filter='none';
  const pixels=lc.getImageData(0,0,cw,ch),data=pixels.data;
  const rgb=state.color.match(/[a-f\d]{2}/gi)?.map(x=>parseInt(x,16))||[175,205,164];
  for(let i=0;i<data.length;i+=4){const alpha=data[i+3];data[i]=rgb[0];data[i+1]=rgb[1];data[i+2]=rgb[2];data[i+3]=Math.max(0,Math.min(255,(alpha-threshold)*16))}
  mc.putImageData(pixels,0,0);
  ctx.fillStyle=paper;ctx.fillRect(0,0,w,h);ctx.imageSmoothingEnabled=true;ctx.drawImage(mask,ox,oy,cw*scale,ch*scale);
  if(state.numbers){
   ctx.textAlign='center';ctx.textBaseline='middle';ctx.font=`${Math.max(10,10.5*scale)}px ui-monospace,SFMono-Regular,Menlo,monospace`;
   for(let i=0;i<state.density;i++){
    const group=Math.floor(i/5),j=i%5;
    const p=helix(.035+rnd(group+1400)*.93,rnd(group+1100)*3,.3+rnd(group+1600)*1.05);
    const x=p.x+(j-2)*5.7*p.scale,y=p.y;
    const px=Math.max(0,Math.min(299,Math.round(x))),py=Math.max(0,Math.min(439,Math.round(y)));
    ctx.fillStyle=data[(py*cw+px)*4+3]>100?pale:ink;
    ctx.globalAlpha=.68+rnd(i+80)*.3;
    ctx.fillText(String((j+Math.floor(rnd(group+900)*10)+Math.floor(t*.65))%10),ox+x*scale,oy+y*scale);
   }
   ctx.globalAlpha=1;
   for(let i=0;i<points.length;i++){const p=points[i];if(p.r>5&&i%2===0){ctx.fillStyle=pale;ctx.globalAlpha=.65+.35*(p.z+100)/200;ctx.font=`${Math.max(9,10.5*scale*p.scale)}px ui-monospace,SFMono-Regular,Menlo,monospace`;ctx.fillText(String((p.d+Math.floor(t*.5))%10),ox+p.x*scale,oy+p.y*scale)}}
   ctx.globalAlpha=1;
  }
 }
 if(options.controls && window.lil?.GUI){
  gui=new lil.GUI({container:root.querySelector('.mint-controls'),title:'Adjust the current'});
  gui.add(state,'blobDensity',12,90,1).name('Blob density').onChange(()=>{draw();save()});
  gui.add(state,'stickiness',0,1,.01).name('Stickiness').onChange(()=>{draw();save()});
  gui.add(state,'blobSize',3,10,.1).name('Blob size').onChange(()=>{draw();save()});
  gui.add(state,'helixRadius',25,105,1).name('Helix radius').onChange(()=>{draw();save()});
  gui.add(state,'turns',.25,2,.05).name('Helix turns').onChange(()=>{draw();save()});
  gui.add(state,'rotation',0,360,1).name('Rotation °').onChange(()=>{draw();save()});
  gui.add(state,'speed',-2,2,.05).name('Spin speed ±').onChange(save);
  gui.add(state,'density',0,360,5).name('Number density').onChange(()=>{draw();save()});
  gui.add(state,'fluidity',0,2,.05).name('Flow').onChange(()=>{draw();save()});
  gui.addColor(state,'color').name('Pastel green').onChange(()=>{draw();save()});
  gui.add(state,'numbers').name('Show numbers').onChange(()=>{draw();save()});
 }else if(options.controls){
  const f=root.querySelector('.mint-fallback');f.hidden=false;f.querySelector('input').addEventListener('input',e=>{state.speed=+e.target.value;save()});
 }
 function tick(now){if(destroyed)return;const dt=Math.min((now-(last||now))/1000,.05);last=now;if(!paused&&!document.hidden){t+=dt*state.speed;if(++frame%2===0)draw()}raf=requestAnimationFrame(tick)}
 resize();raf=requestAnimationFrame(tick);
 return {
  getSettings:()=>({...state}),
  update(patch){if(destroyed)return;Object.assign(state,patch);gui?.controllersRecursive().forEach(c=>c.updateDisplay());draw();save();},
  pause(){paused=true;pauseLabel();},
  play(){paused=false;pauseLabel();},
  destroy(){if(destroyed)return;destroyed=true;cancelAnimationFrame(raf);resizeObserver.disconnect();gui?.destroy();root.remove();}
 };
}
global.MintDrift={mount,DEFAULTS};
})(window);
