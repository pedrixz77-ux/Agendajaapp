export type Business = {id:string; owner_id:string; logo_path:string; name:string; slug:string; description:string; whatsapp:string; accent:string; timezone:string; published:boolean; buffer_minutes:number; notice_minutes:number; horizon_days:number; cancellation_hours:number};
export type Service = {id:string;business_id:string;name:string;description:string;price_cents:number;duration_minutes:number;active:boolean};
export type Availability = {id:string;business_id:string;weekday:number;start_minute:number;end_minute:number};
export type Client = {id:string;name:string;phone:string};
export type Entry = {id:string;kind:'booking'|'block';status:string;client_id:string|null;service_id:string|null;service_name:string|null;price_cents:number|null;starts_at:string;ends_at:string;busy_until:string};
export type Subscription = {status:string;trial_ends_at:string;current_period_end:string|null;price_cents:number};
export type DashboardData = {business:Business;services:Service[];availability:Availability[];clients:Client[];entries:Entry[];subscription:Subscription|null};
