import {sessionClient} from '@/lib/supabase-server';
import {redirect} from 'next/navigation';
import {Dashboard} from '@/components/dashboard';
import {Onboarding} from '@/components/onboarding';
import type {DashboardData} from '@/lib/types';
export const dynamic='force-dynamic';
export default async function AppPage(){const db=await sessionClient();const {data:{user}}=await db.auth.getUser();if(!user)redirect('/login');
 const {data:business,error}=await db.from('businesses').select('*').eq('owner_id',user.id).maybeSingle();if(error)throw new Error('Não foi possível carregar sua conta.');if(!business)return <Onboarding/>;
 const from=new Date(Date.now()-30*86400000).toISOString();const until=new Date(Date.now()+181*86400000).toISOString();
 const [services,availability,clients,entries,subscription]=await Promise.all([
 db.from('services').select('*').eq('business_id',business.id).order('name'),
 db.from('availability').select('*').eq('business_id',business.id).order('start_minute'),
 db.from('clients').select('id,name,phone').eq('business_id',business.id).order('name').limit(500),
 db.from('calendar_entries').select('id,kind,status,client_id,service_id,service_name,price_cents,starts_at,ends_at,busy_until').eq('business_id',business.id).gte('starts_at',from).lte('starts_at',until).order('starts_at').limit(1000),
 db.from('subscriptions').select('status,trial_ends_at,current_period_end,price_cents').eq('business_id',business.id).single()]);
 if([services,availability,clients,entries,subscription].some(r=>r.error))throw new Error('Não foi possível carregar a agenda.');
 return <Dashboard data={{business,services:services.data??[],availability:availability.data??[],clients:clients.data??[],entries:entries.data??[],subscription:subscription.data} as DashboardData}/>;
}
