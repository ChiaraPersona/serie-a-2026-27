'use strict';
const {format,unpack}=require('../js/services/archive-json.js');
function pack(data){
  if(data?.archiveFormat===format)return data;
  const keys=[],keyIds=new Map(),counts=new Map();
  function scan(value){
    if(typeof value==='string'&&value.length>24)counts.set(value,(counts.get(value)||0)+1);
    else if(Array.isArray(value))value.forEach(scan);
    else if(value&&typeof value==='object')for(const [key,item] of Object.entries(value)){
      if(!keyIds.has(key)){keyIds.set(key,keys.length);keys.push(key);}
      scan(item);
    }
  }
  scan(data);
  const strings=[...counts].filter(([,count])=>count>1).map(([value])=>value);
  const stringIds=new Map(strings.map((value,i)=>[value,i]));
  function encode(value){
    if(typeof value==='string'&&stringIds.has(value))return {s:stringIds.get(value)};
    if(Array.isArray(value))return value.map(encode);
    if(value&&typeof value==='object')return {o:Object.entries(value).flatMap(([key,item])=>[keyIds.get(key),encode(item)])};
    return value;
  }
  return {archiveFormat:format,keys,strings,value:encode(data)};
}
module.exports={pack,unpack};
