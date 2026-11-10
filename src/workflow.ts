import {useState,useEffect} from 'react';
import {db,seed,seedReferences,enqueue,writeItem,errorsFor,PERSONAS,type UserPersona,type UserRole,type Item,type Site,type Location,type CatalogItem,type Unit,type ExportBatch} from './db';
import {useMutation,useQuery,useQueryClient} from '@tanstack/react-query';
export type Snapshot=Awaited<ReturnType<typeof snapshot>>;
async function snapshot(){await seed();await seedReferences();return db.transaction('r',db.tables,async()=>({snapshots:await db.snapshots.toArray(),roles:await db.siteRoles.toArray(),sites:await db.sites.toArray(),items:(await db.walkItems.toArray()).sort((a,b)=>a.siteId.localeCompare(b.siteId)||a.locationPath.localeCompare(b.locationPath,undefined,{numeric:true})||a.name.localeCompare(b.name)),units:await db.itemUnits.toArray(),catalog:await db.catalogItems.toArray(),reviews:await db.reviewEvents.toArray(),exports:await db.exportBatches.toArray(),drafts:await db.drafts.toArray(),pending:await db.syncQueue.count()}));}
export function useData(){return useQuery({queryKey:['data'],queryFn:snapshot,refetchInterval:4000});}
export function useAction<T>(fn:(arg:T)=>Promise<unknown>){const client=useQueryClient();return useMutation({mutationFn:fn,onSettled:()=>client.invalidateQueries({queryKey:['data']})});}
export function useItemWrite(){const client=useQueryClient();return useMutation({mutationFn:async({item,serials}:{item:Item;serials?:string[]})=>{await db.transaction('rw',db.tables,async()=>{const stored=await db.walkItems.get(item.id);if(stored?.lastSaved&&item.lastSaved!==undefined&&stored.lastSaved!==item.lastSaved)throw new Error('A newer version of this item was saved. Your draft is kept. Use Discard draft and load latest to review the saved version, then reapply your changes.');await writeItem({...item,reviewFlag:undefined,lastSaved:Date.now(),serialSignature:serials!==undefined?serials.join('|'):item.serialSignature},serials);await db.sites.update(item.siteId,{lastSaved:Date.now(),reviewStatus:'Draft'});await db.drafts.delete(item.id);});},onMutate:async({item})=>{await client.cancelQueries({queryKey:['data']});const previous=client.getQueryData<Snapshot>(['data']);client.setQueryData<Snapshot>(['data'],old=>old?{...old,items:old.items.some(i=>i.id===item.id)?old.items.map(i=>i.id===item.id?item:i):[...old.items,item]}:old);return {previous};},onError:(_e,_v,c)=>{if(c?.previous)client.setQueryData(['data'],c.previous);},onSettled:()=>client.invalidateQueries({queryKey:['data']})});}
export function friendlyPlace(path:string){return path.replaceAll('-',' › ');}
export function when(time?:number){return time?new Intl.DateTimeFormat('en-IN',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Kolkata'}).format(time):'Not saved yet';}
export function itemIssues(item:Item,units:Unit[]){return [...errorsFor(item,units),...(item.reviewFlag?['Reviewer: '+item.reviewFlag]:[]),...(!item.isNotPresent&&item.system==='Needs classification'?['Confirm the equipment system']:[]),...(!Number.isInteger(item.quantity)||item.quantity<1?['Enter a whole quantity of at least 1']:[]),...(!item.isNotPresent&&!item.uom.trim()?['Add unit of measure']:[])];}
export function siteIssues(site:Site,items:Item[],units:Unit[]){const result=items.flatMap(item=>itemIssues(item,units).map(message=>({item,message})));const serials=units.filter(u=>u.serialNumber.trim()&&items.some(i=>i.id===u.walkItemId&&i.category==='A'&&!i.isNotPresent));for(const u of serials){if(serials.some(v=>v.id!==u.id&&v.serialNumber.trim()===u.serialNumber.trim())){const item=items.find(i=>i.id===u.walkItemId)!;if(!result.some(e=>e.item.id===item.id&&e.message==='Serial number is used more than once'))result.push({item,message:'Serial number is used more than once'});}}return result;}
export function detailsMissing(s:Site){return [['Contact name',s.contact],['Address',s.address],['Organization code',s.orgCode],['Sold-by business unit',s.soldBy]].filter(([,v])=>!v?.trim()).map(([k])=>k!);}
export async function saveSite(site:Site){await db.transaction('rw',db.tables,async()=>{await db.sites.put({...site,lastSaved:Date.now(),reviewStatus:'Draft'});await enqueue('UPDATE_SITE',site);});}
export async function bulkDates({items,date}:{items:Item[];date:string}){if(!/^\d{4}-\d{2}-\d{2}$/.test(date))throw new Error('Choose an install date.');await db.transaction('rw',db.tables,async()=>{for(const item of items.filter(i=>!i.installDate&&!i.isNotPresent))await writeItem({...item,installDate:date,lastSaved:Date.now()});if(items[0])await db.sites.update(items[0].siteId,{lastSaved:Date.now(),reviewStatus:'Draft'});});}
export async function deleteCustom(item:Item){if(!item.isCustom)throw new Error('Expected items must be marked not present.');await db.transaction('rw',db.tables,async()=>{await db.walkItems.delete(item.id);await db.itemUnits.where('walkItemId').equals(item.id).delete();await db.drafts.delete(item.id);const remaining=await db.walkItems.where('siteId').equals(item.siteId).toArray();const progress=remaining.length?Math.round(remaining.filter(i=>i.isConfirmed||i.isNotPresent).length/remaining.length*100):0;const allUnits=await db.itemUnits.where('walkItemId').anyOf(remaining.map(i=>i.id)).toArray();const allComplete=progress===100&&remaining.every(i=>errorsFor(i,allUnits.filter(u=>u.walkItemId===i.id)).length===0);await db.sites.update(item.siteId,{progress,status:allComplete?'Walked':'In progress',reviewStatus:'Draft',lastSaved:Date.now()});await enqueue('DELETE_CUSTOM_ITEM',{id:item.id});});}
export function templateItems(site:Site,locations:Location[],catalog:CatalogItem[]):Item[]{const result:Item[]=[];for(const l of locations){const defs=catalog.filter(c=>c.facility===site.type&&c.location===l.name);for(const c of defs){const count=c.scope==='room'?l.rooms:1;for(let n=0;n<count;n++){const locationPath=l.name==='Site'?'Site':`${l.name}-${l.building}-${c.scope==='room'?`Room ${n+1}`:'Shared equipment'}`;result.push({id:crypto.randomUUID(),siteId:site.id,locationPath,name:c.name,category:c.category,quantity:c.quantity,manufacturer:'',installDate:'',uom:'Each',isConfirmed:false,isNotPresent:false,isCustom:false,system:c.system,subsystem:c.subsystem,referenceId:c.id});}}}return result;}
export function setupErrors(locations:Location[]){const problems:string[]=[];const keys=new Set<string>();for(const l of locations){const key=`${l.building.trim().toLowerCase()}|${l.name.toLowerCase()}`;if(keys.has(key))problems.push(`${l.name} is listed twice in ${l.building}.`);keys.add(key);if(!l.building.trim()||!l.name.trim())problems.push('Each location needs a building and location name.');if(!Number.isInteger(l.rooms)||l.rooms<1)problems.push('Rooms must be a whole number of at least 1.');}if(!locations.length)problems.push('Add at least one location.');return problems;}
export async function generate({site,locations,catalog}:{site:Site;locations:Location[];catalog:CatalogItem[]}){await db.transaction('rw',db.tables,async()=>{if((await db.sites.get(site.id))?.status!=='Not started')throw new Error('This collection has already been generated.');const problems=setupErrors(locations);if(problems.length)throw new Error(problems[0]);const items=templateItems(site,locations,catalog);if(!items.length)throw new Error('No equipment is available for these locations. Choose a template location.');await db.walkItems.bulkPut(items);await db.expectedItems.bulkPut(items.map(i=>({id:i.id,siteId:i.siteId,locationPath:i.locationPath,name:i.name,category:i.category,expectedCount:i.quantity,confirmedCount:0})));await db.itemUnits.bulkPut(items.filter(i=>i.category!=='C').flatMap(i=>Array.from({length:i.quantity},(_,n)=>({id:`${i.id}-${n}`,walkItemId:i.id,serialNumber:''}))));await db.sites.put({...site,locations,status:'In progress',reviewStatus:'Draft',templateVersion:'2026.11',cycle:1,lastSaved:Date.now()});await enqueue('GENERATE_COLLECTION',{siteId:site.id,items,locations});});}
export async function reviewAction({siteId,action,comment,itemId}:{siteId:string;action:'Submitted'|'Approved'|'Returned';comment:string;itemId?:string}){if(!navigator.onLine)throw new Error('Connect to the internet to submit or review.');await db.transaction('rw',db.tables,async()=>{const site=await db.sites.get(siteId);if(!site)throw new Error('Site not found');const items=await db.walkItems.where('siteId').equals(siteId).toArray();const units=await db.itemUnits.toArray();if(action!=='Returned'&&(siteIssues(site,items,units).length||detailsMissing(site).length||!items.length))throw new Error('Fix the blocking issues and site details first.');if(action==='Approved'&&site.reviewStatus!=='Submitted')throw new Error('Submit the collection before approval.');if(action==='Returned'&&!comment.trim())throw new Error('Explain what the collector needs to correct.');if(action==='Returned'){const targets=itemId?items.filter(i=>i.id===itemId):items;await db.walkItems.bulkPut(targets.map(i=>({...i,reviewFlag:comment})));}await db.sites.update(siteId,{reviewStatus:action,reviewComment:comment});await db.reviewEvents.add({id:crypto.randomUUID(),siteId,action,comment,timestamp:Date.now(),actor:action==='Submitted'?'Demo collector':'Demo reviewer',itemId,cycle:site.cycle||1});await enqueue('REVIEW_DECISION',{siteId,action,comment,itemId});});}
export function changeType(item:Item,site:Site){if(!site.baseline)return 'New';const previous=site.baseline.find(i=>i.id===item.id);if(!previous)return 'New';if(item.isNotPresent&&!previous.isNotPresent)return 'Removed';const fields:(keyof Item)[]=['name','category','quantity','manufacturer','installDate','uom','isNotPresent','system','subsystem','model','capacity','dimensions','warranty','notes','serialSignature'];return fields.some(k=>item[k]!==previous[k])?'Modified':'Unchanged';}
export async function nextCycle(siteId:string){await db.transaction('rw',db.tables,async()=>{const s=await db.sites.get(siteId);if(s?.reviewStatus!=='Approved')throw new Error('Approve the current cycle first.');const items=await db.walkItems.where('siteId').equals(siteId).toArray();await db.snapshots.put({id:`${siteId}-${s.cycle||1}`,siteId,cycle:s.cycle||1,timestamp:Date.now(),items,units:(await db.itemUnits.toArray()).filter(u=>items.some(i=>i.id===u.walkItemId))});await db.sites.update(siteId,{baseline:items,cycle:(s.cycle||1)+1,reviewStatus:'Draft',reviewComment:'',progress:0,status:'In progress',lastSaved:Date.now()});await db.walkItems.bulkPut(items.map(i=>({...i,isConfirmed:false})));await enqueue('START_CYCLE',{siteId,cycle:(s.cycle||1)+1});});}
export function csvEncode(rows:string[][]){return '\uFEFF'+rows.map(row=>row.map(v=>'"'+(/^[=+@\-\t\r]/.test(v)?"'"+v:v).replaceAll('"','""')+'"').join(',')).join('\r\n');}

export {PERSONAS} from './db';
export const FBDI_122_COLUMNS:string[]=[
 'INTERFACE_HEADER_ID','INTERFACE_BATCH_ID','BATCH_NAME','ACTION_CODE','ASSET_NUMBER','ASSET_DESCRIPTION','ITEM_NUMBER','INVENTORY_ITEM_ID',
 'ORGANIZATION_CODE','INVENTORY_ORGANIZATION_ID','ASSET_TYPE','SERIAL_NUMBER','QUANTITY','PRIMARY_UOM_CODE','PARENT_ASSET_NUMBER',
 'PARENT_INTERFACE_HEADER_ID','TOP_ASSET_NUMBER','FUNCTIONAL_LOCATION_CODE','LOCATION_TYPE_CODE','LOCATION_ID','LOCATION_ADDRESS_LINE1',
 'LOCATION_ADDRESS_LINE2','LOCATION_CITY','LOCATION_STATE','LOCATION_POSTAL_CODE','LOCATION_COUNTRY','MAINTAINABLE_FLAG','IN_SERVICE_DATE',
 'INSTALL_DATE','PURCHASE_DATE','WARRANTY_EXPIRATION_DATE','MANUFACTURER_NAME','MODEL_NUMBER','ASSET_CATEGORY','ASSET_CRITICALITY',
 'PRIMARY_CONTACT_NAME','PRIMARY_CONTACT_EMAIL','PRIMARY_CONTACT_PHONE','OWNING_DEPARTMENT_CODE','OPERATING_STATUS','CONDITION',
 'BUILDING','ROOM','SYSTEM','SUBSYSTEM','DIMENSIONS','CAPACITY','ATTRIBUTE_CATEGORY',
 ...Array.from({length:30},(_,i)=>`ATTRIBUTE${i+1}`),
 ...Array.from({length:15},(_,i)=>`ATTRIBUTE_NUMBER${i+1}`),
 ...Array.from({length:10},(_,i)=>`ATTRIBUTE_DATE${i+1}`),
 ...Array.from({length:5},(_,i)=>`ATTRIBUTE_TIMESTAMP${i+1}`),
 'CREATED_BY','CREATION_DATE','LAST_UPDATED_BY','LAST_UPDATE_DATE','LAST_UPDATE_LOGIN','OBJECT_VERSION_NUMBER',
 'ORIGINAL_SYSTEM_REFERENCE','SOURCE_SYSTEM_CODE','SOURCE_SYSTEM_ID','PROCESS_STATUS','ERROR_CODE','ERROR_MESSAGE','RETRY_COUNT','RECONCILIATION_STATUS'
];

export function buildFbdiRow(site:Site,item:Item,unitIndex:number,serial:string,headerSeq:number,batchId:string):string[]{
 const action=changeType(item,site)==='Modified'?'UPDATE':'CREATE';
 const assetNum=item.oracleAssetNumber||(changeType(item,site)==='Modified'?`AST-${item.id.slice(0,8)}`:'');
 const itemNum=item.name.toUpperCase().replace(/[^A-Z0-9]/g,'_').slice(0,30);
 const locParts=item.locationPath.split('-');
 const building=locParts[1]||'BUILDING1';
 const room=locParts[2]||'';
 const unitInstallDate=(item.installDates&&item.installDates[unitIndex])||item.installDate;
 const installDateFormatted=unitInstallDate?unitInstallDate.replace(/-/g,'/'):'';
 const row:string[]=[
  String(headerSeq),batchId,`${site.orgCode}_CYCLE_${site.cycle||1}`,action,assetNum,item.name,itemNum,'',
  site.orgCode,'',item.category==='A'?'CAPITALIZED':item.category==='B'?'MAINTAINABLE':'EXPENSED',
  serial,item.category==='C'?String(item.quantity):'1',item.uom?item.uom.toUpperCase().slice(0,3):'EA',
  item.system||'', '',site.id,locParts[0]||'SITE','HZ_LOCATIONS',site.oracleLocationId||'',
  site.address,'',site.address.split(',')[1]?.trim()||'','MN','','US','Y',installDateFormatted,
  installDateFormatted,'',item.warranty||'',item.manufacturer,item.model||'',item.category,
  item.category==='A'?'HIGH':item.category==='B'?'MEDIUM':'LOW',site.contact,'','',site.soldBy||'MAINT',
  'OPERATING','GOOD',building,room,item.system||'',item.subsystem||'',item.dimensions||'',item.capacity||'',
  'FIELD2FUSION',
  item.id,site.type,changeType(item,site),site.soldBy||'',item.notes||'',item.photos?.length?String(item.photos.length):'0',
  ...Array.from({length:24},()=>''),
  ...Array.from({length:15},()=>''),
  ...Array.from({length:10},()=>''),
  ...Array.from({length:5},()=>''),
  'FIELD2FUSION_COLLECTOR',new Date().toISOString().slice(0,10).replace(/-/g,'/'),'FIELD2FUSION',new Date().toISOString().slice(0,10).replace(/-/g,'/'),'','1',
  item.referenceId||item.id,'FIELD2FUSION',item.id,'READY','','','0',item.oracleAssetNumber?'CONFIRMED':'PENDING'
 ];
 return row;
}

export async function createExport({siteId,headers,format='FBDI'}:{siteId:string;headers:boolean;format?:'FBDI'|'Summary'}){
 if(!navigator.onLine)throw new Error('Connect to export an approved collection.');
 return db.transaction('rw',db.tables,async()=>{
  const site=(await db.sites.get(siteId))!;
  const items=await db.walkItems.where('siteId').equals(siteId).toArray();
  const units=await db.itemUnits.toArray();
  if(site.reviewStatus!=='Approved'||siteIssues(site,items,units).length||detailsMissing(site).length)throw new Error('This collection must pass validation and be approved before export.');
  let stamp=Date.now();let id='';
  do{
   id='ASSET_LOAD_'+new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Kolkata',month:'2-digit',day:'2-digit',year:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(stamp).replace(/\D/g,'');
   stamp+=60000;
  }while(await db.exportBatches.get(id));

  const exportItems=items.filter(i=>site.baseline?changeType(i,site)!=='Unchanged':!i.isNotPresent);
  let rows:string[][];
  let filename:string;

  if(format==='FBDI'){
   let headerSeq=10000001;
   rows=exportItems.flatMap(i=>{
    const count=i.category==='C'?1:i.quantity;
    return Array.from({length:count},(_,n)=>{
     const unit=units.find(u=>u.id===`${i.id}-${n}`);
     const serial=i.category==='A'?(unit?.serialNumber||''):'';
     return buildFbdiRow(site,i,n,serial,headerSeq++,id);
    });
   });
   filename=`${id}_FBDI_122col${headers?'_with_headers':'_paste_row7'}.csv`;
   if(headers)rows.unshift(FBDI_122_COLUMNS);
  }else{
   rows=exportItems.flatMap(i=>Array.from({length:i.category==='C'?1:i.quantity},(_,n)=>[
    site.id,site.orgCode,i.locationPath,i.system||'',i.subsystem||'',i.name,i.category,String(i.category==='C'?i.quantity:1),
    i.category==='A'?(units.find(u=>u.id===`${i.id}-${n}`)?.serialNumber||''):'',(i.installDates&&i.installDates[n])||i.installDate,i.manufacturer,i.model||'',
    i.uom,i.id,changeType(i,site),site.contact,site.address,site.soldBy||''
   ]));
   filename=`${id}_Summary${headers?'_headers':''}.csv`;
   if(headers)rows.unshift(['Site','Organization','Location','System','Subsystem','Asset','Category','Quantity','Serial Number','Install Date','Manufacturer','Model','UOM','Internal ID','Change','Contact','Address','Sold-by business unit']);
  }

  const rowCount=exportItems.length;
  const csv=csvEncode(rows);
  const batch:ExportBatch={id,siteId,timestamp:Date.now(),filename,rowCount,csv,cycle:site.cycle||1,status:'Generated',format};
  await db.exportBatches.add(batch);
  await enqueue('EXPORT_GENERATED',{id,siteId,rowCount,format});
  return batch;
 });
}

export async function submitToOracleApi({siteId,simulateError=false}:{siteId:string;simulateError?:boolean}){
 if(!navigator.onLine)throw new Error('Connect to the internet to submit to Oracle Cloud.');
 return db.transaction('rw',db.tables,async()=>{
  const site=(await db.sites.get(siteId))!;
  const items=await db.walkItems.where('siteId').equals(siteId).toArray();
  const units=await db.itemUnits.toArray();
  if(site.reviewStatus!=='Approved'||siteIssues(site,items,units).length||detailsMissing(site).length)throw new Error('Approval and complete validation are required before Oracle submission.');
  const jobId=`ORA_JOB_${Math.floor(100000+Math.random()*900000)}`;
  const batchId='ASSET_LOAD_'+new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Kolkata',month:'2-digit',day:'2-digit',year:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(Date.now()).replace(/\D/g,'');
  const activeItems=items.filter(i=>site.baseline?changeType(i,site)!=='Unchanged':!i.isNotPresent);
  let errorCount=0;
  for(let idx=0;idx<activeItems.length;idx++){
   const item=activeItems[idx];
   if(simulateError&&idx===0){
    errorCount++;
    await db.walkItems.update(item.id,{oracleSyncError:'Oracle Maintenance API: Item requires active PIM category link before load.'});
   }else{
    const assetNum=item.oracleAssetNumber||`ORA-AST-${Math.floor(100000+Math.random()*900000)}`;
    await db.walkItems.update(item.id,{oracleAssetNumber:assetNum,oracleSyncError:undefined});
   }
  }
  for(const u of units){
   const parent=activeItems.find(i=>i.id===u.walkItemId);
   if(parent&&!parent.oracleSyncError&&!u.oracleAssetNumber){
    await db.itemUnits.update(u.id,{oracleAssetNumber:`ORA-UNT-${Math.floor(100000+Math.random()*900000)}`});
   }
  }
  const recStatus=errorCount>0?'Partial error':'Synchronized';
  await db.sites.update(siteId,{oracleJobId:jobId,oracleSyncedAt:Date.now(),reconciliationStatus:recStatus,lastSaved:Date.now()});
  const exportBatch:ExportBatch={id:batchId,siteId,timestamp:Date.now(),filename:`${batchId}_FBDI_API_SUBMITTED.csv`,rowCount:activeItems.length,csv:'',cycle:site.cycle||1,status:errorCount>0?'Failed':'Imported',format:'FBDI',jobId};
  await db.exportBatches.add(exportBatch);
  await db.reviewEvents.add({
   id:crypto.randomUUID(),siteId,
   action:errorCount>0?'Oracle Import: Partial Failure':'Oracle Fusion Import Completed',
   comment:errorCount>0?`Job ${jobId}: 1 record returned with error; ${activeItems.length-1} assets registered in Oracle Cloud.`:`Job ${jobId}: All ${activeItems.length} assets successfully loaded into Oracle Cloud Maintenance.`,
   timestamp:Date.now(),actor:'Oracle Cloud Integration API',cycle:site.cycle||1
  });
  await enqueue('ORACLE_API_SYNC',{siteId,jobId,errorCount});
  return {jobId,errorCount,reconciledCount:activeItems.length-errorCount};
 });
}

export async function retryOracleFailed(siteId:string){
 return db.transaction('rw',db.tables,async()=>{
  const failedItems=await db.walkItems.where('siteId').equals(siteId).filter(i=>!!i.oracleSyncError).toArray();
  for(const item of failedItems){
   await db.walkItems.update(item.id,{oracleSyncError:undefined,oracleAssetNumber:`ORA-AST-${Math.floor(100000+Math.random()*900000)}`});
  }
  await db.sites.update(siteId,{reconciliationStatus:'Synchronized',lastSaved:Date.now()});
  await db.reviewEvents.add({id:crypto.randomUUID(),siteId,action:'Oracle Resubmission Succeeded',comment:`Resubmitted ${failedItems.length} failed record(s). Official Oracle Asset Numbers linked.`,timestamp:Date.now(),actor:'Oracle Cloud Integration API',cycle:1});
 });
}

let memoryPersonaId:string|null=null;
export function getActivePersona():UserPersona{
 const saved=typeof localStorage!=='undefined'?localStorage.getItem('field2fusion_persona'):memoryPersonaId;
 return PERSONAS.find(p=>p.id===saved)||PERSONAS[0];
}

export function setActivePersona(id:string){
 if(typeof localStorage!=='undefined')localStorage.setItem('field2fusion_persona',id);
 else memoryPersonaId=id;
 if(typeof window!=='undefined')window.dispatchEvent(new Event('persona_changed'));
}

export function usePersona(){
 const [persona,setPersona]=useState<UserPersona>(getActivePersona);
 useEffect(()=>{
  const handler=()=>setPersona(getActivePersona());
  window.addEventListener('persona_changed',handler);
  return ()=>window.removeEventListener('persona_changed',handler);
 },[]);
 return {...persona,switchPersona:(id:string)=>{setActivePersona(id);setPersona(getActivePersona());}};
}

export function downloadFile(content:string,name:string){const url=URL.createObjectURL(new Blob([content],{type:'text/csv;charset=utf-8;'}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
