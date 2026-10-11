import { DateTime } from 'luxon';
export function availableSlots(input:{date:string;zone:string;duration:number;buffer:number;notice:number;horizon:number;windows:{weekday:number;start_minute:number;end_minute:number}[];busy:{starts_at:string;busy_until:string}[];now?:DateTime}){
 const now=input.now??DateTime.utc();
 const day=DateTime.fromISO(input.date,{zone:input.zone}).startOf('day');
 if(!day.isValid||!/^\d{4}-\d{2}-\d{2}$/.test(input.date)||input.duration<=0||input.buffer<0) return [];
 const slots:string[]=[];
 const weekday=day.weekday%7;
 for(const w of input.windows.filter(w=>w.weekday===weekday)){
  for(let minute=w.start_minute;minute+input.duration+input.buffer<=w.end_minute;minute+=15){
   const start=DateTime.fromObject({year:day.year,month:day.month,day:day.day,hour:Math.floor(minute/60),minute:minute%60},{zone:input.zone});
   // Reject nonexistent local times instead of shifting a client into another hour.
   if(!start.isValid||start.hour*60+start.minute!==minute)continue;
   const end=start.plus({minutes:input.duration+input.buffer});
   if(end.toISODate()!==input.date||end.hour*60+end.minute!==minute+input.duration+input.buffer)continue;
   if(start<now.plus({minutes:input.notice})||start>now.plus({days:input.horizon}))continue;
   if(input.busy.some(b=>start.toMillis()<DateTime.fromISO(b.busy_until).toMillis()&&end.toMillis()>DateTime.fromISO(b.starts_at).toMillis()))continue;
   slots.push(start.toUTC().toISO()!);
  }
 }
 return [...new Set(slots)].sort();
}
export const money=(cents:number)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(cents/100);
export function displayTime(iso:string,zone='America/Sao_Paulo'){return DateTime.fromISO(iso).setZone(zone).toFormat('HH:mm');}
