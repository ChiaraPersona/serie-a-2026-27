(function(root,factory){
  const api=factory();
  if(typeof module!=="undefined"&&module.exports)module.exports=api;
  root.ObjectiveMetrics=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  const clamp=(value,min=0,max=100)=>Math.max(min,Math.min(max,Math.round(value)));
  function calculateObjectiveMetrics(profile,row,matchday){
    const played=Math.max(0,Number(row?.played)||0),position=Math.max(1,Number(row?.position)||20),points=Math.max(0,Number(row?.points)||0);
    if(!played)return {objectiveProgress:0,seasonOverperformance:0,motivationCurrent:profile.motivationStart,pressureCurrent:profile.pressure,urgency:clamp((profile.pressure*.55)+(profile.ambition*.25)+10),status:"preseason"};
    const progress=Math.min(1,played/38),pointsPace=(points/played)*38;
    const expectedPoints=84-((profile.targetPosition-1)*3.15),paceDelta=(pointsPace-expectedPoints)/2;
    const positionDelta=profile.targetPosition-position;
    const seasonOverperformance=clamp((positionDelta*6)+paceDelta,-50,50);
    const projectedPositionGap=Math.max(0,position-profile.targetPosition),minimumGap=Math.max(0,position-profile.minimumAcceptable);
    const positionScore=clamp(100-((Math.max(0,position-profile.idealPosition))*8));
    const objectiveProgress=clamp((progress*58)+(positionScore*progress*.42));
    const pressureCurrent=clamp(profile.pressure+(projectedPositionGap*6)+(minimumGap*7)-(Math.max(0,seasonOverperformance)*.22));
    const motivationCurrent=clamp(profile.motivationStart+(seasonOverperformance*.18)+(projectedPositionGap*2)+(progress*4));
    const remainingShare=1-progress;
    const urgency=clamp(18+(progress*36)+(projectedPositionGap*10)+(minimumGap*12)+(remainingShare<.25?8:0));
    return {objectiveProgress,seasonOverperformance,motivationCurrent,pressureCurrent,urgency,status:"active"};
  }
  function calculateAll(profiles,standings){
    const rows=new Map(standings.map((row,index)=>[row.team,{...row,position:row.position||index+1}]));
    return profiles.map(profile=>({...profile,...calculateObjectiveMetrics(profile,rows.get(profile.teamId),rows.get(profile.teamId)?.played||0)}));
  }
  return {calculateObjectiveMetrics,calculateAll};
});
