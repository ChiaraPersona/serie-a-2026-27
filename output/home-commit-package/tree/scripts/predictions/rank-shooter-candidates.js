'use strict';
// The same primary shortlist for Serie A and competition adapters.
function rankShooterCandidates(rows,key,marketKey){
  return [...rows].sort((left,right)=>right[key]-left[key]||left.name.localeCompare(right.name,'it'))
    .slice(0,5).map((row,index)=>({...row,rank:index+1,marketKey}));
}
module.exports={rankShooterCandidates};
