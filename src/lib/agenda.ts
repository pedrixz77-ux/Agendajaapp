import {DateTime} from 'luxon';
import type {Entry} from './types.ts';
export function agendaEntries(entries:Entry[], zone:string, date:string, upcoming:boolean, now:number){
 return entries.filter(e=>upcoming
  ? e.status!=='canceled'&&new Date(e.ends_at).getTime()>now
  : DateTime.fromISO(e.starts_at).setZone(zone).toISODate()===date
 ).sort((a,b)=>Date.parse(a.starts_at)-Date.parse(b.starts_at)||a.id.localeCompare(b.id));
}
export function nextAppointment(entries:Entry[],now:number){
 return entries.filter(e=>e.kind==='booking'&&e.status==='confirmed'&&Date.parse(e.ends_at)>now)
  .sort((a,b)=>Date.parse(a.starts_at)-Date.parse(b.starts_at))[0];
}
