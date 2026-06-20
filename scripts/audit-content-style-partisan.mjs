// Audit ALL current sitting Utah legislators' text for CONTENT_STYLE.md trigger phrases.
const PROJECT='politidex-979bd';
const BASE=`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/politicians`;
function dec(v){if(!v)return undefined;if('stringValue'in v)return v.stringValue;if('integerValue'in v)return parseInt(v.integerValue,10);if('doubleValue'in v)return v.doubleValue;if('booleanValue'in v)return v.booleanValue;if('nullValue'in v)return null;if('arrayValue'in v)return(v.arrayValue.values||[]).map(dec);if('mapValue'in v){const o={};for(const[k,x]of Object.entries(v.mapValue.fields||{}))o[k]=dec(x);return o;}return undefined;}
async function fetchAll(){const out=[];let t=null;do{const url=BASE+'?pageSize=300'+(t?'&pageToken='+encodeURIComponent(t):'');const r=await fetch(url);const b=await r.json();for(const d of b.documents||[]){const rec={};for(const[k,v]of Object.entries(d.fields||{}))rec[k]=dec(v);rec._id=d.name.split('/').pop();out.push(rec);}t=b.nextPageToken;}while(t);return out;}
const office=o=>String(o.office||'');
const isUtahLeg=o=>/utah|house of representatives|state sen/i.test(office(o))&&/(house|senate|representative|senator)/i.test(office(o))&&!/(u\.s\.|congress|governor|attorney general|treasurer|auditor|county|mayor|city council)/i.test(office(o));
const isFormer=o=>/former|speaker emeritus/i.test(office(o));
const isCandidate=o=>/candidate/i.test(office(o));
// Trigger phrases from CONTENT_STYLE.md
const TRIGGERS=[
 /\bher side\b/i,/\bhis side\b/i,/\bher allies\b/i,/\bhis allies\b/i,
 /\brepublicans (voted|opposed|supported|backed|blocked)/i,/\bdemocrats (voted|opposed|supported|backed|blocked)/i,
 /\bparty line\b/i,/\bparty[- ]lines?\b/i,/\balong party\b/i,
 /\bcommon in (her|his) party\b/i,/\blike most (in|of) (her|his) party\b/i,
 /\b(her|his) party'?s (base|wing|faction)\b/i,/\bconsistent with (her|his) party\b/i,
 /\bmore than any other (republican|democrat)\b/i,/\bbarometer\b/i,/\bproxy for\b/i,
 /\bthe (gop|democratic) (base|wing|establishment)\b/i,
];
function scan(text,where,hits){if(typeof text!=='string')return;for(const re of TRIGGERS){if(re.test(text))hits.push({where,phrase:re.source,snippet:text.slice(Math.max(0,text.search(re)-30),text.search(re)+50)});}}
const recs=await fetchAll();
const cur=recs.filter(isUtahLeg).filter(o=>!isFormer(o)&&!isCandidate(o));
let total=0;
for(const o of cur){
  const hits=[];
  scan(o.spotlightTheme,'spotlightTheme',hits);
  scan(o.why,'why',hits);
  if(o.stances&&typeof o.stances==='object'&&!Array.isArray(o.stances))for(const[k,v]of Object.entries(o.stances))scan(v,'stance:'+k,hits);
  if(Array.isArray(o.promises))o.promises.forEach((p,i)=>{if(p){scan(p.title,`promise[${i}].title`,hits);scan(p.detail,`promise[${i}].detail`,hits);}});
  if(Array.isArray(o.spotlight))o.spotlight.forEach((s,i)=>{if(s){scan(s.headline,`spotlight[${i}].headline`,hits);scan(s.facts,`spotlight[${i}].facts`,hits);scan(s.why,`spotlight[${i}].why`,hits);}});
  if(hits.length){total++;console.log(`\n### ${o._id} (${o.name})`);for(const h of hits)console.log(`  [${h.where}] /${h.phrase}/  …"${h.snippet}"…`);}
}
console.log(`\nScanned ${cur.length} current sitting Utah legislators. ${total} with potential trigger-phrase hits.`);
