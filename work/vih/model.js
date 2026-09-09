MODELS['vihals-chair'] = (C) => {
  const cm=C.cm, V=C.THREE.Vector3, c2=C.col2||C.col;
  const steel=C.M(C.col,{rough:.60,metal:.18}), fab=C.M(c2,{fabric:true,rough:.90});
  const fabD=C.M(c2.clone().multiplyScalar(.86),{fabric:true,rough:.92}), dark=C.M(0x2a2c2f,{rough:.62});
  const P=(x,y,z)=>[cm(x),cm(y),cm(z)];
  const seg=(p,q,r,m)=>{const dx=q[0]-p[0],dy=q[1]-p[1],dz=q[2]-p[2],L=Math.hypot(dx,dy,dz)||1e-4;
    const mm=C.tube(L,r,m,(p[0]+q[0])/2,(p[1]+q[1])/2,(p[2]+q[2])/2,'y');
    mm.quaternion.setFromUnitVectors(new V(0,1,0),new V(dx/L,dy/L,dz/L)); return mm;};
  const path=(pl,r,m)=>{for(let i=0;i<pl.length-1;i++) seg(pl[i],pl[i+1],r,m);};
  const rp=(pts)=>{const o=[],n=pts.length;
    for(let i=0;i<n;i++){const p=pts[i],a=pts[(i+n-1)%n],b=pts[(i+1)%n];
      const l1=Math.hypot(a[0]-p[0],a[1]-p[1])||1e-4,l2=Math.hypot(b[0]-p[0],b[1]-p[1])||1e-4;
      const u1=[(a[0]-p[0])/l1,(a[1]-p[1])/l1],u2=[(b[0]-p[0])/l2,(b[1]-p[1])/l2];
      const ang=Math.acos(Math.max(-1,Math.min(1,u1[0]*u2[0]+u1[1]*u2[1])));
      const t=Math.min(p[2]/Math.max(.05,Math.tan(ang/2)),l1*.5,l2*.5);
      const A=[p[0]+u1[0]*t,p[1]+u1[1]*t],B=[p[0]+u2[0]*t,p[1]+u2[1]*t];
      for(let k=0;k<=7;k++){const s=k/7,m=1-s;
        o.push([cm(m*m*A[0]+2*m*s*p[0]+s*s*B[0]),cm(m*m*A[1]+2*m*s*p[1]+s*s*B[1])]);}}
    return o;};
  const mir=(h)=>h.concat(h.slice(1,-1).reverse().map(p=>[-p[0],p[1],p[2]]));
  const TR=.288, ct=Math.cos(TR), st=Math.sin(TR), yC=66.55, zC=-19.83, r=cm(.95);

  for(const s of [-1,1]){
    path([P(s*23.5,.9,26.4),P(s*20.05,37.0,21.9),P(s*19.5,39.7,20.5),P(s*19.2,40.75,18.5),
          P(s*18.9,40.75,-12.5),P(s*18.95,40.1,-14.5),P(s*19.5,38.4,-16.4),P(s*23.5,.9,-26.6)],r,steel);
    path([P(s*18.9,40.4,-14.6),P(s*18.0,46.6,-15.9),P(s*16.6,53.2,-17.9)],r,steel);
    seg(P(s*23.5,.05,26.4),P(s*23.27,2.58,26.11),cm(1.06),dark);
    seg(P(s*23.5,.05,-26.6),P(s*23.24,2.58,-25.94),cm(1.06),dark);
    for(const z of [14.5,-7.5]) C.box(cm(3.4),cm(1.6),cm(2.6),dark,s*cm(18.9),cm(39.3),cm(z));
  }
  C.tube(cm(38.6),r,steel,0,cm(40.75),cm(18.4),'x');
  C.tube(cm(38.0),r,steel,0,cm(40.75),cm(-12.6),'x');

  const TLT=Math.PI/2-.028;
  const sb=C.ext(rp(mir([[0,25.4,40],[21.6,21.6,8.5],[17.9,-9.6,8.0],[0,-12.0,40]])),
                 cm(5.8),fab,0,cm(45.7),0,'xz',cm(1.6)); sb.rotation.x=TLT;
  const wl=C.ext(rp(mir([[0,26.8,40],[22.9,22.0,8.5],[19.2,-9.8,8.0],[0,-13.4,40]])),
                 cm(1.0),fabD,0,cm(44.3),0,'xz',cm(.5)); wl.rotation.x=TLT;
  const cw=C.ext(rp(mir([[0,23.6,34],[19.5,20.0,7.5],[16.1,-8.4,7.0],[0,-10.9,34]])),
                 cm(1.5),fab,0,cm(46.85),0,'xz',cm(.72)); cw.rotation.x=TLT;

  const bk=(pts,th,bv,n,mat)=>{const m=C.ext(rp(pts),cm(th),mat,0,cm(yC+(n+bv)*st),cm(zC+(n+bv)*ct),'xy',cm(bv));
    m.rotation.x=-TR; return m;};
  bk(mir([[0,14.05,46],[20.8,12.45,8.5],[17.7,-12.0,7.0],[0,-13.57,46]]),3.0,1.25,-1.5,fabD);
  bk(mir([[0,12.30,40],[19.0,10.70,7.5],[16.0,-10.25,6.0],[0,-11.80,40]]),1.5,.70,1.0,fab);
  bk(mir([[0,12.30,40],[19.0,10.70,7.5],[16.0,-10.25,6.0],[0,-11.80,40]]),1.3,.60,-2.4,fab);
};
