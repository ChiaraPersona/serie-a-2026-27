// Lossless wire representation only. Models and canonical archives stay plain JSON.
(function(root){
  const format='readings-lossless-v1';
  function unpack(data){
    if(data?.archiveFormat!==format)return data;
    const {keys,strings}=data;
    if(!Array.isArray(keys)||!Array.isArray(strings))throw Error('Invalid reading archive dictionary');
    function decode(value){
      if(Array.isArray(value))return value.map(decode);
      if(value===null||typeof value!=='object')return value;
      if(Object.hasOwn(value,'s')){
        if(!Number.isInteger(value.s)||typeof strings[value.s]!=='string')throw Error('Invalid reading archive string');
        return strings[value.s];
      }
      if(!Array.isArray(value.o)||value.o.length%2)throw Error('Invalid reading archive object');
      const entries=[];
      for(let i=0;i<value.o.length;i+=2){
        const key=keys[value.o[i]];
        if(typeof key!=='string')throw Error('Invalid reading archive key');
        entries.push([key,decode(value.o[i+1])]);
      }
      return Object.fromEntries(entries);
    }
    return decode(data.value);
  }
  const api={format,unpack};
  root[Symbol.for('prima-del-fischio.archive-json')]=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(globalThis);
