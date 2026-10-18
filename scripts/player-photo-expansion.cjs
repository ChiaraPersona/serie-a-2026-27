const fs=require('node:fs'),crypto=require('node:crypto');
const root='reports/player-photos/expansion/';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8')),write=(p,d)=>fs.writeFileSync(p,JSON.stringify(d,null,2)+'\n');
const vals=(q,k)=>(q?.claims?.[k]||q?.statements?.[k]||[]).filter(c=>c.rank!=='deprecated').map(c=>c.mainsnak?.datavalue?.value);
const norm=s=>String(s||'').replace(/^File:/,'').replaceAll('_',' ').normalize('NFC');
const text=v=>String(v?.value??v??'').replace(/<[^>]*>/g,' ').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&nbsp;/g,' ').replace(/\s+/g,' ').trim();
const hash=(b,algorithm='sha256')=>crypto.createHash(algorithm).update(b).digest('hex');
function identity(player,entity){
 const q=player.providerIds.wikidata===entity?.id,tm=!!player.providerIds.transfermarkt&&vals(entity,'P2446').includes(String(player.providerIds.transfermarkt)),espn=!!player.providerIds.espn&&vals(entity,'P3681').includes(String(player.providerIds.espn));
 const dates=vals(entity,'P569').map(v=>v.time?.slice(1,11)),birth=!!player.dateOfBirth&&dates.includes(player.dateOfBirth),conflict=!!player.dateOfBirth&&dates.length>0&&!birth;
 return {verified:!conflict&&(q||((tm||espn)&&birth))&&!(player.providerIds.wikidata&&player.providerIds.wikidata!==entity?.id),qid:q,transfermarkt:tm,espn,birthMatch:birth,birthConflict:conflict};
}
function candidate(player,entity,page){
 const id=identity(player,entity),info=page?.imageinfo?.[0],m=info?.extmetadata||{},license=text(m.LicenseShortName),licenseUrl=text(m.LicenseUrl).replace(/^http:/,'https:').replace(/\/deed\.[a-z-]+$/,'/'),artist=text(m.Artist),requested=text(m.Attribution),notice=text(m.CopyrightNotice);
 const parts=[artist];if(requested&&!artist.includes(requested)){if(requested.includes(artist))parts[0]=requested;else parts.push(requested)}if(notice&&!parts.join(' ').includes(notice))parts.push(notice);
 const credit=parts.join(' · '),restrictions=text(m.Restrictions),categories=text(m.Categories),reasons=[];
 if(!id.verified)reasons.push(id.birthConflict?'BIRTH_DATE_CONFLICT':'IDENTITY_NOT_CONFIRMED');
 if(!info)reasons.push('NO_FILE_METADATA');
 if(!vals(entity,'P18').some(n=>norm(n)===norm(page?.title)))reasons.push('FILE_NOT_WIKIDATA_P18');
 if(!(/^CC BY(?:-SA)? (?:2\.0|2\.5|3\.0|4\.0)$/.test(license)||license==='CC0')||!/^https:\/\/creativecommons\.org\/(?:licenses\/(?:by|by-sa)\/(?:2\.0|2\.5|3\.0|4\.0)|publicdomain\/zero\/1\.0)\/?$/.test(licenseUrl))reasons.push('LICENSE_REQUIRES_MANUAL_REVIEW');
 if(!artist||/unknown|autore indicato/i.test(artist))reasons.push('AUTHOR_NOT_VERIFIED');
 if(restrictions&&restrictions!=='personality')reasons.push('RESTRICTIONS_REQUIRING_REVIEW');
 if(/copyright violations|deletion requests|missing permission|no permission|license review needed|flickr images needing human review/i.test(categories))reasons.push('SOURCE_RIGHTS_DISPUTE');
 return {verified:reasons.length===0,reasons,identity:id,license,licenseUrl,artist,credit,restrictions,commonsPageId:page?.pageid,descriptionUrl:info?.descriptionurl,originalSha1:info?.sha1};
}
module.exports={read,write,vals,norm,text,hash,identity,candidate,root};
