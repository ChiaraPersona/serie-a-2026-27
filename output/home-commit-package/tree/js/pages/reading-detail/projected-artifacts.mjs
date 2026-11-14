// Scoped to the current Lettura render. Other pages retain their archive readers.
let artifacts=null;
export function setReadingArtifacts(value){artifacts=value;}
export function projectedArtifact(path){return artifacts&&Object.hasOwn(artifacts,path)?{value:artifacts[path]}:null;}
