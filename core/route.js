const R=6371e3;
const rad=d=>d*Math.PI/180, deg=r=>r*180/Math.PI;

export function haversineDistance(a,b,c,d){
 const A=rad(a),B=rad(c),da=rad(c-a),db=rad(d-b);
 const x=Math.sin(da/2)**2+Math.cos(A)*Math.cos(B)*Math.sin(db/2)**2;
 return R*2*Math.atan2(Math.sqrt(x),Math.sqrt(1-x));
}

export function interpolateGC(a,b,c,d,f){
 const A=rad(a),B=rad(b),C=rad(c),D=rad(d);
 const g=2*Math.asin(Math.sqrt(Math.sin((C-A)/2)**2+Math.cos(A)*Math.cos(C)*Math.sin((D-B)/2)**2));
 if(!g) return {lat:a,lon:b};
 const x=Math.sin((1-f)*g)/Math.sin(g), y=Math.sin(f*g)/Math.sin(g);
 const X=x*Math.cos(A)*Math.cos(B)+y*Math.cos(C)*Math.cos(D);
 const Y=x*Math.cos(A)*Math.sin(B)+y*Math.cos(C)*Math.sin(D);
 const Z=x*Math.sin(A)+y*Math.sin(C);
 return {lat:deg(Math.atan2(Z,Math.sqrt(X*X+Y*Y))),lon:deg(Math.atan2(Y,X))};
}

export function buildRoutePoints(dep,dest,stepNM){
 const nm=haversineDistance(dep.lat,dep.lon,dest.lat,dest.lon)/1852;
 const n=Math.ceil(nm/stepNM), pts=[];
 for(let i=0;i<=n;i++){
  const f=i/n;
  const p=interpolateGC(dep.lat,dep.lon,dest.lat,dest.lon,f);
  pts.push({...p,dist_nm:nm*f});
 }
 return {points:pts};
}

export function enrichRoute(points,profile){
 return points.map(p=>{
  let fl=profile[profile.length-1].fl;
  for(const s of profile){
   if(s.until.type==='distance'&&p.dist_nm<=s.until.value){fl=s.fl;break;}
   if(s.until.type==='time'){fl=s.fl;break;}
   if(s.until.type==='end'){fl=s.fl;break;}
  }
  return {...p,fl};
 });
}