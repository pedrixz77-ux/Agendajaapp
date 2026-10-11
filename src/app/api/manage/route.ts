import {sessionClient} from '@/lib/supabase-server';
import {sameOrigin,jsonBody,failure,uuid,phone,customer} from '@/lib/http';
import {z} from 'zod';
export async function POST(req:Request){try{
 sameOrigin(req);const db=await sessionClient();const {data:{user}}=await db.auth.getUser();if(!user)return Response.json({error:'Entre novamente para continuar.'},{status:401});
 const body=await jsonBody(req);const {data:business,error:lookupError}=await db.from('businesses').select('*').eq('owner_id',user.id).maybeSingle();if(lookupError)throw lookupError;
 if(body.action==='onboard'){
  if(business)return Response.json({ok:true});
  const name=customer.parse(body.name);const slug=z.string().regex(/^[a-z0-9][a-z0-9-]{2,47}$/).parse(body.slug);
  const {data:profile,error:pe}=await db.from('profiles').select('id').eq('id',user.id).maybeSingle();if(pe)throw pe;
  if(!profile){const {error:p}=await db.from('profiles').insert({id:user.id,display_name:name});if(p)throw p;}
  const {error}=await db.from('businesses').insert({owner_id:user.id,name,slug});if(error)throw error;return Response.json({ok:true});
 }
 if(!business)throw new Error('NO_BUSINESS');let result;
 if(body.action==='service'){
  const data=z.object({name:customer,description:z.string().max(600),price_cents:z.number().int().min(0).max(10000000),duration_minutes:z.number().int().min(5).max(720),active:z.boolean()}).parse(body);
  result=body.id?await db.from('services').update(data).eq('id',uuid.parse(body.id)).eq('business_id',business.id):await db.from('services').insert({...data,business_id:business.id});
 }else if(body.action==='availability'){
  const windows=z.array(z.object({weekday:z.number().int().min(0).max(6),start_minute:z.number().int().min(0).max(1439),end_minute:z.number().int().min(1).max(1440)}).refine(w=>w.end_minute>w.start_minute)).max(28).parse(body.windows);
  result=await db.rpc('replace_availability',{p_business:business.id,p_windows:windows});
 }else if(body.action==='profile'){
  const data=z.object({name:customer,description:z.string().max(600),whatsapp:z.union([phone,z.literal('')]),accent:z.string().regex(/^#[0-9a-fA-F]{6}$/),published:z.boolean(),buffer_minutes:z.number().int().min(0).max(120),notice_minutes:z.number().int().min(0).max(10080),horizon_days:z.number().int().min(1).max(180),cancellation_hours:z.number().int().min(0).max(168)}).parse(body);
  result=await db.from('businesses').update(data).eq('id',business.id);
 }else if(body.action==='reserve'){
  result=await db.rpc('reserve_appointment',{p_business:business.id,p_service:uuid.parse(body.service),p_start:z.iso.datetime({offset:true}).parse(body.start),p_name:customer.parse(body.name),p_phone:phone.parse(body.phone),p_request:uuid.parse(body.request)});
 }else if(body.action==='change'){
  result=await db.rpc('change_appointment',{p_entry:uuid.parse(body.id),p_start:body.start?z.iso.datetime({offset:true}).parse(body.start):null});
 }else if(body.action==='block'){
  result=await db.rpc('block_time',{p_business:business.id,p_start:z.iso.datetime({offset:true}).parse(body.start),p_end:z.iso.datetime({offset:true}).parse(body.end)});
 }else if(body.action==='unblock'){
  result=await db.rpc('remove_block',{p_entry:uuid.parse(body.id)});
 }else if(body.action==='privacy'){
  result=await db.from('privacy_requests').insert({business_id:business.id,requested_by:user.id,kind:z.enum(['delete','export']).parse(body.kind)});
 }else throw new Error('ACTION');
 if(result.error)throw result.error;return Response.json({ok:true,data:result.data});
 }catch(e){return failure(e);}}
