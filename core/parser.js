export function parseStepClimb(input){
 const parts=input.split(','),out=[];
 for(const p of parts){
  const m=p.trim().match(/^FL(\d+)\/(.+)$/i);
  if(!m) throw 'Syntax error';
  const fl=+m[1],v=m[2].toUpperCase();
  let until;
  if(v==='END') until={type:'end'};
  else if(v.endsWith('NM')) until={type:'distance',value:+v.replace('NM','')};
  else if(v.includes(':')){
    const [h,mn]=v.split(':').map(Number);
    until={type:'time',value:h*60+mn};
  }
  out.push({fl,until});
 }
 return out;
}