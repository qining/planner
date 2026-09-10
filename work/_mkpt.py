TEST = r"""
<script>
window.__EPT=[];
window.addEventListener('error', e=>window.__EPT.push(e.message+' :'+e.lineno));
const _ce=console.error; console.error=function(){ window.__EPT.push('console.error: '+[].slice.call(arguments).join(' ').slice(0,600)); _ce.apply(console,arguments); };
const _cw=console.warn;  console.warn =function(){ const m=[].slice.call(arguments).join(' '); if(/shader|GLSL|program|compil/i.test(m)) window.__EPT.push('console.warn: '+m.slice(0,600)); _cw.apply(console,arguments); };
window.addEventListener('load', ()=>{ setTimeout(runPT, 500); });
async function runPT(){
  const log=[];
  const T=(n,ok,x)=>log.push((ok?'PASS':'FAIL')+' '+n+(x!==undefined?' | '+x:''));
  const wait=(ms)=>new Promise(r=>setTimeout(r,ms||150));
  try{
    try{ localStorage.removeItem('planner_v1'); }catch(e){}
    state.items=[]; save=()=>{};
    const arm=CATALOG.find(c=>c.model==='saltsjobaden');
    state.items.push({uid:uidSeq++, ref:arm.id, x:22, y:26, rot:0});
    const cl=CATALOG.find(c=>c.id==='cl-flush');
    state.items.push({uid:uidSeq++, ref:cl.id, x:22, y:24, rot:0});
    refresh(); setView('3d'); await wait(3200);
    setCamMode('fp'); await wait(600);
    three.cam.position.set(22, EYE_H, 31); fpYaw=Math.PI; fpPitch=-0.05;
    if(typeof applyFP==='function') applyFP();
    await wait(300);

    /* ---- 1. 场景收集 ---- */
    const t0=performance.now();
    const S=ptCollect();
    const tCollect=performance.now()-t0;
    T('pt-collect-tris', !!S && S.nTri>10000, S? (S.nTri.toLocaleString()+' 三角形 · '+S.mats.length+' 材质 · '+S.maps.length+' 贴图 · '+Math.round(tCollect)+'ms') : 'null');
    let finite=true;
    for(let i=0;i<S.P.length;i+=997){ if(!isFinite(S.P[i])) { finite=false; break; } }
    T('pt-collect-finite', finite);

    /* ---- 2. BVH 正确性（CPU 校验）---- */
    const t1=performance.now();
    const B=ptBuildBVH(S.nTri, S.cen, S.bmn, S.bmx);
    const tBvh=performance.now()-t1;
    T('pt-bvh-built', B.nodeCnt>1 && B.nodeCnt<S.nTri*2, B.nodeCnt.toLocaleString()+' 节点 · '+Math.round(tBvh)+'ms');
    // idx 必须是一个排列
    const seen=new Uint8Array(S.nTri); let dup=0;
    for(let i=0;i<S.nTri;i++){ if(seen[B.idx[i]]) dup++; seen[B.idx[i]]=1; }
    T('pt-bvh-idx-permutation', dup===0, 'dup='+dup);
    // 遍历树：叶子计数之和 = 三角形数；每个三角形都在所属叶子的包围盒里；孩子盒在父盒内
    const N=B.nodes; let leafSum=0, badTri=0, badChild=0, maxDepth=0, leaves=0, maxLeaf=0;
    const EPS=1e-3;
    const inside=(o, x0,y0,z0,x1,y1,z1)=>
      x0>=N[o]-EPS && y0>=N[o+1]-EPS && z0>=N[o+2]-EPS &&
      x1<=N[o+4]+EPS && y1<=N[o+5]+EPS && z1<=N[o+6]+EPS;
    const st=[[0,0]];
    while(st.length){
      const [ni,d]=st.pop(); const o=ni*8; maxDepth=Math.max(maxDepth,d);
      const cnt=N[o+7], first=N[o+3];
      if(cnt>0){
        leaves++; leafSum+=cnt; maxLeaf=Math.max(maxLeaf,cnt);
        for(let i=first;i<first+cnt;i++){
          const t=B.idx[i]*3;
          if(!inside(o, S.bmn[t],S.bmn[t+1],S.bmn[t+2], S.bmx[t],S.bmx[t+1],S.bmx[t+2])) badTri++;
        }
      } else {
        const l=first, r=first+1;
        for(const c of [l,r]){
          const co=c*8;
          if(!inside(o, N[co],N[co+1],N[co+2], N[co+4],N[co+5],N[co+6])) badChild++;
        }
        st.push([l,d+1],[r,d+1]);
      }
    }
    T('pt-bvh-covers-all', leafSum===S.nTri, leafSum+'/'+S.nTri);
    T('pt-bvh-tri-in-leaf-box', badTri===0, 'bad='+badTri);
    T('pt-bvh-child-in-parent', badChild===0, 'bad='+badChild);
    T('pt-bvh-depth-fits-stack', maxDepth<48, 'depth='+maxDepth+' 叶子='+leaves+' 最大叶='+maxLeaf);

    /* ---- 3. GPU：着色器编译 + 出图 ---- */
    const errs0=window.__EPT.length;
    const img=await new Promise(res=>{
      ptRender(4, {maxPx: 90*70, bounces: 3, onDone: (cv,spp)=>res({cv,spp})});
      setTimeout(()=>res(null), 90000);
    });
    T('pt-render-finished', !!img && img.spp>=4, img? (img.spp+' spp · '+img.cv.width+'x'+img.cv.height) : '超时/未完成');
    const shaderErr=window.__EPT.slice(errs0).filter(m=>/shader|GLSL|program|compil/i.test(m));
    T('pt-shader-compiles', shaderErr.length===0, shaderErr.join(' ;; ').slice(0,400));
    if(img && img.cv){
      const g=img.cv.getContext('2d');
      const d=g.getImageData(0,0,img.cv.width,img.cv.height).data;
      let sum=0, nz=0, mx=0;
      for(let i=0;i<d.length;i+=4){ const l=(d[i]*0.299+d[i+1]*0.587+d[i+2]*0.114);
        sum+=l; if(l>4) nz++; mx=Math.max(mx,l); }
      const n=d.length/4, mean=sum/n, frac=nz/n;
      T('pt-image-not-black', mean>6 && frac>0.35, '均值='+mean.toFixed(1)+' 亮像素占比='+(frac*100).toFixed(0)+'% 峰值='+mx);
      T('pt-image-has-range', mx>60, '峰值='+mx);
    }
    T('pt-cleanup', PT===null, 'PT='+(PT===null?'已释放':'仍占用'));
  }catch(e){ log.push('EXC '+e.message+' | '+(e.stack||'').split('\n')[1]); }
  log.push('ERRS: '+JSON.stringify(window.__EPT.slice(0,6)));
  const pre=document.createElement('pre'); pre.id='tpt'; pre.textContent=log.join('\n');
  document.body.appendChild(pre);
}
</script>
</body>"""

s = open('/Users/dako/planner/planner.html').read()
out = s.replace('</body>', TEST, 1)
open('/Users/dako/planner/work/t_pt.html','w').write(out
  .replace("'work/clean_plan.jpg'", "'clean_plan.jpg'")
  .replace("lib/three.min.js", "../lib/three.min.js")
  .replace("lib/OrbitControls.js", "../lib/OrbitControls.js"))
print("work/t_pt.html 已生成")
