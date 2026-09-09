const cm2ft = c => c/30.48;
function normalFromTexture(tex, strength){
  if(_nrmCache.has(tex)) return _nrmCache.get(tex);
  const src=tex.image; const N=Math.min(512, src.width||256);
  const c0=document.createElement('canvas'); c0.width=N; c0.height=N;
  const g0=c0.getContext('2d'); g0.drawImage(src,0,0,N,N);
  const d=g0.getImageData(0,0,N,N).data;
  const H=new Float32Array(N*N);
  for(let i=0,p=0;i<H.length;i++,p+=4) H[i]=(d[p]*0.299+d[p+1]*0.587+d[p+2]*0.114)/255;
  const c=document.createElement('canvas'); c.width=N; c.height=N;
  const g=c.getContext('2d'); const out=g.createImageData(N,N);
  const S=(strength==null?1:strength)*2.2;
  const at=(x,y)=>H[((y+N)%N)*N+((x+N)%N)];
  for(let y=0;y<N;y++)for(let x=0;x<N;x++){
    const dx=(at(x-1,y-1)+2*at(x-1,y)+at(x-1,y+1))-(at(x+1,y-1)+2*at(x+1,y)+at(x+1,y+1));
    const dy=(at(x-1,y-1)+2*at(x,y-1)+at(x+1,y-1))-(at(x-1,y+1)+2*at(x,y+1)+at(x+1,y+1));
    let nx=dx*S, ny=dy*S, nz=1;
    const l=Math.hypot(nx,ny,nz); nx/=l; ny/=l; nz/=l;
    const i=(y*N+x)*4;
    out.data[i]=(nx*0.5+0.5)*255; out.data[i+1]=(ny*0.5+0.5)*255;
    out.data[i+2]=(nz*0.5+0.5)*255; out.data[i+3]=255;
  }
  g.putImageData(out,0,0);
  const t=new THREE.CanvasTexture(c);
  t.wrapS=t.wrapT=THREE.RepeatWrapping; t.repeat.copy(tex.repeat);
  _nrmCache.set(tex,t); return t;
}
const _speciesCache={};
/* 木材树种贴图：松木(蜜黄+节疤)/榉木(浅粉白)/白蜡(暖白)/胡桃(深棕)
   —— 与 color 相乘，所以贴图本身以高亮度基调 + 木纹明暗为主 */
function woodSpecies(name){
  if(_speciesCache[name]) return _speciesCache[name];
  const P={
    pine:  {base:'#f0dcb8', grain:'rgba(150,110,62,%A)', light:'rgba(255,246,226,%A)', knots:5, gw:[0.6,2.6], n:52, rep:[1.4,1.4]},
    beech: {base:'#f4e5d2', grain:'rgba(168,132,96,%A)', light:'rgba(255,250,242,%A)', knots:1, gw:[0.4,1.4], n:70, rep:[1.6,1.6]},
    birch: {base:'#f6ecdc', grain:'rgba(178,150,116,%A)', light:'rgba(255,252,246,%A)', knots:1, gw:[0.4,1.2], n:64, rep:[1.6,1.6]},
    oak:   {base:'#e8d9bf', grain:'rgba(126,96,58,%A)',  light:'rgba(252,244,228,%A)', knots:2, gw:[0.7,3.0], n:48, rep:[1.2,1.2]},
    walnut:{base:'#c8a276', grain:'rgba(78,50,28,%A)',   light:'rgba(226,196,158,%A)', knots:2, gw:[0.6,2.4], n:56, rep:[1.3,1.3]},
  }[name] || {base:'#f0e2cc', grain:'rgba(150,118,80,%A)', light:'rgba(255,250,240,%A)', knots:2, gw:[0.5,2], n:56, rep:[1.5,1.5]};
  const N=512, c=document.createElement('canvas'); c.width=N;c.height=N;
  const g=c.getContext('2d');
  const rnd=(a,b)=>a+Math.random()*(b-a);
  g.fillStyle=P.base; g.fillRect(0,0,N,N);
  // 心材/边材色带
  for(let i=0;i<8;i++){
    const y=rnd(0,N), h=rnd(12,70);
    g.fillStyle=P.grain.replace('%A', (0.03+Math.random()*0.05).toFixed(3));
    g.fillRect(0,y,N,h);
  }
  // 顺纹长纹理（松木是笔直平行纹）
  for(let i=0;i<P.n;i++){
    const y=rnd(0,N), a=(0.05+Math.random()*0.22).toFixed(3);
    g.strokeStyle=(Math.random()<0.62? P.grain : P.light).replace('%A',a);
    g.lineWidth=rnd(P.gw[0],P.gw[1]);
    g.beginPath(); g.moveTo(-20,y);
    g.bezierCurveTo(N*0.3, y+rnd(-3,3), N*0.7, y+rnd(-3,3), N+20, y+rnd(-2,2));
    g.stroke();
  }
  // 节疤（松木标志性）
  for(let k=0;k<P.knots;k++){
    const kx=rnd(50,N-50), ky=rnd(40,N-40), R=rnd(7,17), el=rnd(1.4,2.4);
    for(let r=R;r>0;r-=1.1){
      g.strokeStyle=P.grain.replace('%A',(0.10+ (R-r)/R*0.30).toFixed(3));
      g.lineWidth=1.0;
      g.beginPath(); g.ellipse(kx,ky,r*el,r,rnd(-0.4,0.4),0,Math.PI*2); g.stroke();
    }
    g.fillStyle=P.grain.replace('%A','0.55');
    g.beginPath(); g.ellipse(kx,ky,R*0.28*el,R*0.28,0,0,Math.PI*2); g.fill();
    // 纹理绕过节疤的分流
    for(let i=0;i<7;i++){
      const yy=ky+rnd(-R*2.6,R*2.6);
      g.strokeStyle=P.grain.replace('%A',(0.06+Math.random()*0.12).toFixed(3));
      g.lineWidth=rnd(0.5,1.6);
      g.beginPath(); g.moveTo(kx-R*3.6, yy);
      g.quadraticCurveTo(kx, ky+(yy-ky)*2.1, kx+R*3.6, yy); g.stroke();
    }
  }
  const t=new THREE.CanvasTexture(c); t.wrapS=t.wrapT=THREE.RepeatWrapping;
  t.repeat.set(P.rep[0],P.rep[1]); t.encoding=THREE.sRGBEncoding; t.anisotropy=8;
  _speciesCache[name]=t; return t;
}
let _fabTex=null, _fwoodTex=null;
function fabricTexture(){
  if(_fabTex) return _fabTex;
  const N=256, c=document.createElement('canvas'); c.width=N;c.height=N;
  const g=c.getContext('2d');
  g.fillStyle='#ffffff'; g.fillRect(0,0,N,N);
  for(let y=0;y<N;y+=3){ g.fillStyle=`rgba(0,0,0,${0.05+Math.random()*0.05})`; g.fillRect(0,y,N,1.3); }
  for(let x=0;x<N;x+=3){ g.fillStyle=`rgba(0,0,0,${0.04+Math.random()*0.05})`; g.fillRect(x,0,1.3,N); }
  for(let i=0;i<2600;i++){ g.fillStyle=`rgba(${Math.random()<0.5?0:255},${Math.random()<0.5?0:255},${Math.random()<0.5?0:255},.045)`;
    g.fillRect(Math.random()*N, Math.random()*N, 1.2, 1.2); }
  const t=new THREE.CanvasTexture(c); t.wrapS=t.wrapT=THREE.RepeatWrapping;
  t.repeat.set(9,9); t.encoding=THREE.sRGBEncoding; _fabTex=t; return t;
}
function furnWoodTexture(){
  if(_fwoodTex) return _fwoodTex;
  const N=256, c=document.createElement('canvas'); c.width=N;c.height=N;
  const g=c.getContext('2d');
  g.fillStyle='#ffffff'; g.fillRect(0,0,N,N);
  for(let i=0;i<70;i++){
    const y=Math.random()*N, a=0.05+Math.random()*0.13;
    g.strokeStyle=`rgba(90,70,50,${a})`; g.lineWidth=0.5+Math.random()*1.8;
    g.beginPath(); g.moveTo(-10,y);
    g.bezierCurveTo(N*0.3,y+(Math.random()-.5)*4, N*0.7,y+(Math.random()-.5)*4, N+10,y+(Math.random()-.5)*3);
    g.stroke();
  }
  const t=new THREE.CanvasTexture(c); t.wrapS=t.wrapT=THREE.RepeatWrapping;
  t.repeat.set(2,2); t.encoding=THREE.sRGBEncoding; _fwoodTex=t; return t;
}
function roundedRectShape(w,h,r){
  const s=new THREE.Shape(), x=-w/2, y=-h/2;
  s.moveTo(x+r,y); s.lineTo(x+w-r,y); s.quadraticCurveTo(x+w,y,x+w,y+r);
  s.lineTo(x+w,y+h-r); s.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
  s.lineTo(x+r,y+h); s.quadraticCurveTo(x,y+h,x,y+h-r);
  s.lineTo(x,y+r); s.quadraticCurveTo(x,y,x+r,y);
  return s;
}
const _rboxCache={};
function rboxGeo(w,h,d,r,seg){
  r=Math.max(0.006, Math.min(r, w/2-0.004, h/2-0.004, d/2-0.004));
  const key=[w,h,d,r,seg||3].map(v=>v.toFixed(3)).join('_');
  if(_rboxCache[key]) return _rboxCache[key];
  const geo=new THREE.ExtrudeGeometry(roundedRectShape(w,h,r),
    {depth:Math.max(0.004,d-2*r), bevelEnabled:true, bevelSize:r, bevelThickness:r,
     bevelSegments:(seg||3), curveSegments:8, steps:1});
  geo.center(); geo.computeVertexNormals();
  _rboxCache[key]=geo; return geo;
}
/* =====================================================================
   逐商品建模注册表：MODELS[specId] = (C) => {...}
   每件家具按官网商品图单独建模；未注册的回退到通用 kind 造型。
   坐标：原点在家具中心地面，y 向上，+z = 正面（朝房间），-z = 背面（靠墙）
   ===================================================================== */
const MODELS={};
function modelCtx(g, spec, col, col2, matlib){
  const cm = cm2ft;
  const add=(mm,x,y,z,bottomAligned,h)=>{ mm.position.set(x||0,(bottomAligned?(y||0)+h/2:(y||0)),z||0);
    mm.castShadow=mm.receiveShadow=true; g.add(mm); return mm; };
  const C = {
    g, THREE, cm, spec, col, col2,
    w: cm2ft(spec.w), d: cm2ft(spec.d), h: cm2ft(spec.h),
    seatH: cm2ft(spec.seatH || 45),
    m: matlib,
    /* 材质工厂：M(色, {rough, metal, clear, sheen, fabric, wood}) */
    M(color, o){ o=o||{};
      const p = {color:new THREE.Color(color), roughness:(o.rough==null?.7:o.rough), metalness:o.metal||0};
      if(o.fabric){ p.map=fabricTexture(); p.roughness=(o.rough==null?.95:o.rough); p.envMapIntensity=.25; }
      if(o.wood){ const tx=woodSpecies(typeof o.wood==='string'?o.wood:(spec.wood||'oak'));
        p.map=tx; p.normalMap=normalFromTexture(tx,0.85);
        p.roughness=(o.rough==null?.42:o.rough); if(o.clear==null) o.clear=.38; }
      if(o.clear!=null || o.sheen!=null){
        const mm=new THREE.MeshPhysicalMaterial(p);
        if(o.clear!=null){ mm.clearcoat=o.clear; mm.clearcoatRoughness=(o.clearRough==null?.18:o.clearRough); }
        if(o.sheen!=null){ mm.sheen=o.sheen; mm.sheenRoughness=.6; mm.sheenColor=new THREE.Color(o.sheenColor||0xffffff); }
        return mm;
      }
      return new THREE.MeshStandardMaterial(p);
    },
    /* 方盒（y=底面高度） */
    box(w,h,d,mat,x,y,z){ return add(new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat),x,y,z,true,h); },
    /* 圆角方盒（y=底面高度，r=倒角半径，seg=倒角细分） */
    rb(w,h,d,r,mat,x,y,z,seg){ return add(new THREE.Mesh(rboxGeo(w,h,d,r,seg||3),mat),x,y,z,true,h); },
    /* 圆柱/圆锥（y=底面高度） */
    cyl(rTop,rBot,h,mat,x,y,z,seg){ return add(new THREE.Mesh(new THREE.CylinderGeometry(rTop,rBot,h,seg||20),mat),x,y,z,true,h); },
    /* 胶囊管：len 为总长，center 定位，axis 'x'|'y'|'z' */
    tube(len,r,mat,x,y,z,axis){ const mm=new THREE.Mesh(new THREE.CapsuleGeometry(r,Math.max(0.005,len-2*r),4,14),mat);
      mm.position.set(x||0,y||0,z||0);
      if(axis==='x') mm.rotation.z=Math.PI/2; if(axis==='z') mm.rotation.x=Math.PI/2;
      mm.castShadow=true; g.add(mm); return mm; },
    sph(r,mat,x,y,z,seg){ const mm=new THREE.Mesh(new THREE.SphereGeometry(r,seg||18,(seg||18)*0.7),mat);
      mm.position.set(x||0,y||0,z||0); mm.castShadow=true; g.add(mm); return mm; },
    torus(R,r,mat,x,y,z,rotX){ const mm=new THREE.Mesh(new THREE.TorusGeometry(R,r,10,24),mat);
      mm.position.set(x||0,y||0,z||0); if(rotX) mm.rotation.x=rotX; mm.castShadow=true; g.add(mm); return mm; },
    /* 旋转体：pts=[[半径,高度],...] 自下而上 */
    lathe(pts,mat,x,y,z,seg){ const v=pts.map(p=>new THREE.Vector2(Math.max(0.0005,p[0]),p[1]));
      const mm=new THREE.Mesh(new THREE.LatheGeometry(v,seg||24),mat);
      mm.position.set(x||0,y||0,z||0); mm.castShadow=mm.receiveShadow=true; g.add(mm); return mm; },
    /* 任意多边形拉伸：pts=[[x,y],...]（在局部平面内），depth=厚度；
       plane:'xy'(默认,沿z拉伸) | 'xz'(平放,沿y拉伸) | 'zy'(侧立,沿x拉伸)；bevel 可选圆角 */
    ext(pts,depth,mat,x,y,z,plane,bevel){
      const sh=new THREE.Shape(pts.map(p=>new THREE.Vector2(p[0],p[1])));
      const o={depth:depth, bevelEnabled:!!bevel, curveSegments:10};
      if(bevel){ o.bevelSize=bevel; o.bevelThickness=bevel; o.bevelSegments=3; o.depth=Math.max(0.004,depth-2*bevel); }
      const geo=new THREE.ExtrudeGeometry(sh,o); geo.computeVertexNormals();
      const mm=new THREE.Mesh(geo,mat);
      if(plane==='xz') mm.rotation.x=Math.PI/2;
      if(plane==='zy') mm.rotation.y=Math.PI/2;
      mm.position.set(x||0,y||0,z||0); mm.castShadow=mm.receiveShadow=true; g.add(mm); return mm; },
    /* 软包坐垫：圆角+顶面微鼓+四周包边线 */
    cushion(w,h,d,mat,x,y,z,pipeMat){
      const c=add(new THREE.Mesh(rboxGeo(w,h,d,Math.min(h*0.45,cm2ft(5)),4),mat),x,y,z,true,h);
      const top=new THREE.Mesh(rboxGeo(w*0.93,h*0.55,d*0.93,Math.min(h*0.32,cm2ft(4)),3),mat);
      top.position.set(x||0,(y||0)+h*0.86,z||0); top.castShadow=true; g.add(top);
      const seam=new THREE.Mesh(rboxGeo(w+0.014,cm2ft(1.1),d+0.014,cm2ft(0.55),2), pipeMat||mat);
      seam.position.set(x||0,(y||0)+h*0.5,z||0); g.add(seam);
      return c; },
    /* 锥形腿：tilt>0 向外撇 */
    legT(topR,botR,h,mat,x,z,tilt){ const mm=new THREE.Mesh(new THREE.CylinderGeometry(botR,topR,h,14),mat);
      mm.position.set(x,h/2,z); if(tilt){ mm.rotation.z=-Math.sign(x||1)*tilt; mm.rotation.x=Math.sign(z||1)*tilt; }
      mm.castShadow=true; g.add(mm); return mm; },
    /* 五金：球形/长条拉手、脚轮 */
    knob(r,mat,x,y,z){ return C.sph(r,mat,x,y,z,16); },
    bar(len,r,mat,x,y,z,axis){ C.tube(len,r,mat,x,y,z,axis||'x');
      const ax=(axis||'x')==='x'?[1,0,0]:[0,0,1];
      for(const s2 of [-1,1]) C.tube(r*3.4,r*0.75,mat, (x||0)+ax[0]*s2*(len/2-r*1.4), (y||0)-r*1.7, (z||0)+ax[2]*s2*(len/2-r*1.4),'y'); },
    caster(r,mat,x,z){ const w=new THREE.Mesh(new THREE.TorusGeometry(r,r*0.42,8,16),mat);
      w.rotation.y=Math.PI/2; w.position.set(x,r,z); w.castShadow=true; g.add(w);
      C.cyl(r*0.3,r*0.3,r*1.2,mat,x,r*0.9,z,10); },
    /* 网格阵列辅助 */
    rep(n,fn){ for(let i=0;i<n;i++) fn(i, n>1? i/(n-1) : 0.5); },
  };
  return C;
}
