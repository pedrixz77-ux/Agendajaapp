import {adminClient} from '@/lib/supabase-server';
import {failure,sameOrigin,jsonBody,uuid,phone,customer} from '@/lib/http';
import {availableSlots} from '@/lib/slots';
import {DateTime} from 'luxon';
import {createHash,createHmac} from 'node:crypto';
import {z} from 'zod';
export const dynamic='force-dynamic';
function hash(token:string){return createHash('sha256').update(token).digest('hex');}
async function limit(db:ReturnType<typeof adminClient>,key:string,max:number){const digest=createHmac('sha256',process.env.SUPABASE_SECRET_KEY!).update(key).digest('hex');const {data,error}=await db.rpc('consume_limit',{p_key:digest,p_limit:max,p_seconds:3600});if(error||!data)throw new Error('RATE');}
async function catalog(db:ReturnType<typeof adminClient>,slug:string){
 const {data:b,error}=await db.from('businesses').select('id,name,slug,description,whatsapp,accent,timezone,published,buffer_minutes,notice_minutes,horizon_days,cancellation_hours,logo_path').eq('slug',slug).eq('published',true).maybeSingle();if(error||!b)throw new Error('NOT_FOUND');
 const {data:sub,error:subError}=await db.from('subscriptions').select('status,trial_ends_at,current_period_end').eq('business_id',b.id).single();if(subError||!sub)throw new Error('INACTIVE');
 const end=sub.status==='trialing'?sub.trial_ends_at:['active','canceled'].includes(sub.status)?sub.current_period_end:null;
 if(!end||new Date(end)<=new Date())throw new Error('INACTIVE');return b;
}
export async function GET(req:Request){try{
 const db=adminClient();const url=new URL(req.url);const slug=z.string().regex(/^[a-z0-9][a-z0-9-]{2,47}$/).parse(url.searchParams.get('slug'));
 await limit(db,`read:${slug}:${req.headers.get('x-forwarded-for')?.split(',')[0]??'unknown'}`,600);
 const b=await catalog(db,slug);const {data:services,error:se}=await db.from('services').select('id,name,description,price_cents,duration_minutes').eq('business_id',b.id).eq('active',true).order('name');if(se)throw se;
 const date=url.searchParams.get('date');const service=services?.find(s=>s.id===url.searchParams.get('service'));
 let slots:string[]=[];
 if(date&&service){const day=DateTime.fromISO(date,{zone:b.timezone}).startOf('day');if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!day.isValid)throw new Error('DATE');
  const [{data:windows,error:we},{data:busy,error:be}]=await Promise.all([db.from('availability').select('weekday,start_minute,end_minute').eq('business_id',b.id),db.from('calendar_entries').select('starts_at,busy_until').eq('business_id',b.id).neq('status','canceled').lt('starts_at',day.plus({days:1}).toUTC().toISO()!).gt('busy_until',day.toUTC().toISO()!)]);if(we||be)throw we??be;
  slots=availableSlots({date,zone:b.timezone,duration:service.duration_minutes,buffer:b.buffer_minutes,notice:b.notice_minutes,horizon:b.horizon_days,windows:windows??[],busy:busy??[]});
 }
 return Response.json({business:{name:b.name,slug:b.slug,description:b.description,whatsapp:b.whatsapp,accent:b.accent,timezone:b.timezone,cancellation_hours:b.cancellation_hours,horizon_days:b.horizon_days,logo_url:b.logo_path?db.storage.from('business-images').getPublicUrl(b.logo_path).data.publicUrl:null},services,slots},{headers:{'Cache-Control':'no-store'}});
 }catch(e){return failure(e);}}
export async function POST(req:Request){try{
 sameOrigin(req);const body=await jsonBody(req);const db=adminClient();
 const token=z.string().regex(/^[a-f0-9]{64}$/).parse(body.token);
 await limit(db,`write:${req.headers.get('x-forwarded-for')?.split(',')[0]??'unknown'}`,30);
 if(body.action==='manage'){
  const {data:entry,error}=await db.from('calendar_entries').select('id,business_id,service_id,service_name,starts_at,ends_at,status,price_cents').eq('id',uuid.parse(body.id)).eq('management_hash',hash(token)).maybeSingle();if(error||!entry)throw new Error('NOT_FOUND');
  const {data:b}=await db.from('businesses').select('name,slug,timezone,whatsapp,cancellation_hours,logo_path').eq('id',entry.business_id).single();
  return Response.json({entry:{id:entry.id,service_id:entry.service_id,service_name:entry.service_name,starts_at:entry.starts_at,ends_at:entry.ends_at,status:entry.status,price_cents:entry.price_cents},business:b},{headers:{'Cache-Control':'no-store'}});
 }
 if(body.action==='change'){
  const {error}=await db.rpc('change_appointment',{p_entry:uuid.parse(body.id),p_token_hash:hash(token),p_start:body.start?z.iso.datetime({offset:true}).parse(body.start):null});if(error)throw error;return Response.json({ok:true});
 }
 if(body.action!=='reserve')throw new Error('ACTION');
 if(!process.env.TURNSTILE_SECRET_KEY)throw new Error('SERVER_NOT_CONFIGURED');
 const botToken=z.string().min(1).max(2048).parse(body.botToken);
 const verification=await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({secret:process.env.TURNSTILE_SECRET_KEY,response:botToken}),signal:AbortSignal.timeout(8000)});
 const proof=await verification.json();if(!proof.success||proof.hostname!==new URL(process.env.APP_URL!).hostname||proof.action!=='booking')throw new Error('BOT');
 const b=await catalog(db,z.string().min(3).max(48).parse(body.slug));const name=customer.parse(body.name);const tel=phone.parse(body.phone);
 await limit(db,`phone:${b.id}:${tel}`,8);await limit(db,`business:${b.id}`,300);
 const {data,error}=await db.rpc('reserve_appointment',{p_business:b.id,p_service:uuid.parse(body.service),p_start:z.iso.datetime({offset:true}).parse(body.start),p_name:name,p_phone:tel,p_request:uuid.parse(body.request),p_token_hash:hash(token)});if(error)throw error;
 return Response.json({id:data},{headers:{'Cache-Control':'no-store'}});
 }catch(e){return failure(e);}}
