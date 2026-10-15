'use strict';
/**
 * Return the fish IDs whose death/capture metadata is necessary for the
 * spectator to follow the actual predator succession chain across the map.
 * A bounded traversal prevents cycles and out-of-range IDs from hanging the
 * authoritative server. No global telemetry is disclosed beyond this chain.
 */
function predatorChain(fishes,victimIndex){
  const ids=new Set();
  if(!Array.isArray(fishes)||!Number.isInteger(victimIndex)||victimIndex<0||victimIndex>=fishes.length)return ids;
  let next=fishes[victimIndex]?.spectateTarget;
  for(let hops=0;hops<fishes.length&&Number.isInteger(next)&&next>=0&&next<fishes.length;hops++){
    if(ids.has(next))break;
    ids.add(next);
    const predator=fishes[next];
    if(!predator||predator.alive!==false)break;
    next=predator.spectateTarget;
  }
  return ids;
}
module.exports={predatorChain};
