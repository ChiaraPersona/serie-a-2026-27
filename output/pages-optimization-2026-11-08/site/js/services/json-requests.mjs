// One request per resource per rendered view, shared by page and detail readers.
// Only the cache-busting version is ignored; functional query parameters survive.
const pending=new Map();
export function clearJsonRequests(){pending.clear();}
export function requestJson(url,{cache='default',label=String(url)}={}){
 const key=typeof location!=='undefined'?(()=>{const u=new URL(url,location.href);u.searchParams.delete('v');return u.href})():String(url).replace(/([?&])v=[^&]*&?/g,'$1').replace(/[?&]$/,'');
 if(pending.has(key))return pending.get(key);
 const request=(async()=>{const response=await fetch(url,{cache});if(!response.ok)throw new Error(`${label}: ${response.status}`);return response.json()})();
 pending.set(key,request);request.catch(()=>{if(pending.get(key)===request)pending.delete(key)});return request;
}
