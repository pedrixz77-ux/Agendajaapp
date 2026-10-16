'use client';
import {useEffect,useState,type ReactNode} from 'react';
import {DateTime} from 'luxon';
import {CalendarDays,ChevronLeft,ChevronRight,Clock3} from 'lucide-react';
import type {Entry,Client} from '@/lib/types';
import {displayTime} from '@/lib/slots';
import {agendaEntries,nextAppointment} from '@/lib/agenda';

type Props={entries:Entry[];clients:Client[];zone:string;busy:boolean;children:ReactNode;onBlock:()=>void;blocking:boolean;onNew:()=>void;mutate:(body:unknown)=>Promise<boolean>};
export function AgendaView({entries,clients,zone,busy,children,onBlock,blocking,onNew,mutate}:Props){
 const [now,setNow]=useState(Date.now());
 const today=DateTime.fromMillis(now,{zone}).toISODate()!;
 const tomorrow=DateTime.fromISO(today,{zone}).plus({days:1}).toISODate()!;
 const [date,setDate]=useState(today);
 const [mode,setMode]=useState<'today'|'tomorrow'|'date'|'upcoming'>('today');
 const [reschedule,setReschedule]=useState<string|null>(null);
 useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),30000);return()=>clearInterval(timer);},[]);
 const selectedDate=mode==='today'?today:mode==='tomorrow'?tomorrow:date;
 const visible=agendaEntries(entries,zone,selectedDate,mode==='upcoming',now);
 const active=visible.filter(e=>e.status!=='canceled');
 const canceled=visible.filter(e=>e.status==='canceled');
 const next=nextAppointment(entries,now);
 const clientsById=new Map(clients.map(c=>[c.id,c]));
 const dayLabel=(value:string)=>`${value===today?'Hoje':value===tomorrow?'Amanhã':DateTime.fromISO(value).setLocale('pt-BR').toFormat('cccc')}, ${DateTime.fromISO(value).setLocale('pt-BR').toFormat("dd 'de' LLL")}`;
 const groups=new Map<string,Entry[]>();
 for(const entry of active){const day=DateTime.fromISO(entry.starts_at).setZone(zone).toISODate()!;groups.set(day,[...(groups.get(day)??[]),entry]);}
 function chooseDay(value:string){setDate(value);setMode(value===today?'today':value===tomorrow?'tomorrow':'date');setReschedule(null);}
 const inProgress=(e:Entry)=>Date.parse(e.starts_at)<=now&&Date.parse(e.ends_at)>now;
 const bookings=active.filter(e=>e.kind==='booking');
 const remaining=bookings.filter(e=>Date.parse(e.ends_at)>now).length;
 function renderEntry(e:Entry){
  const canceled=e.status==='canceled';const past=Date.parse(e.ends_at)<=now;const block=e.kind==='block';
  const label=canceled?'Cancelado':block?'Bloqueado':inProgress(e)?'Neste horário':past?'Horário encerrado':'Confirmado';
  const client=clientsById.get(e.client_id??'');
  return <article key={e.id} className={`agenda-entry ${block?'is-block':''} ${canceled?'is-canceled':''} ${next?.id===e.id&&!block?'is-next':''}`}>
   <div className="agenda-entry-time"><time dateTime={e.starts_at}>{displayTime(e.starts_at,zone)}</time><span>até {displayTime(e.ends_at,zone)}</span></div>
   <div className="agenda-entry-info"><span className="agenda-state">{label}</span><h3>{block?'Horário bloqueado':client?.name??'Cliente'}</h3><p>{block?'Tempo reservado na sua agenda':e.service_name}</p></div>
   {e.status==='confirmed'&&!past&&<div className="agenda-entry-actions">{!block&&<button type="button" disabled={busy} onClick={()=>setReschedule(reschedule===e.id?null:e.id)}>{reschedule===e.id?'Fechar remarcação':'Remarcar'}</button>}<button type="button" disabled={busy} onClick={async()=>{if(window.confirm(block?'Remover este bloqueio?':`Cancelar o atendimento de ${client?.name??'esta cliente'} às ${displayTime(e.starts_at,zone)}?`))await mutate({action:block?'unblock':'change',id:e.id});}}>{block?'Desbloquear':'Cancelar'}</button></div>}
   {reschedule===e.id&&<form className="agenda-reschedule" onSubmit={async event=>{event.preventDefault();const form=new FormData(event.currentTarget);const start=DateTime.fromISO(String(form.get('start')),{zone}).toUTC().toISO();if(await mutate({action:'change',id:e.id,start}))setReschedule(null);}}><label>Novo dia e horário<input type="datetime-local" name="start" defaultValue={DateTime.fromISO(e.starts_at).setZone(zone).toFormat("yyyy-MM-dd'T'HH:mm")} required/></label><button className="button small" disabled={busy}>Salvar remarcação</button></form>}
  </article>;
 }
 return <div className="agenda-view">
  {next&&<section className="agenda-next" aria-label="Próximo atendimento"><div><p><Clock3 size={16}/>{inProgress(next)?'Atendimento neste horário':'Próximo atendimento'}</p><h2>{clientsById.get(next.client_id??'')?.name??'Cliente'}</h2><span>{next.service_name}</span></div><div className="agenda-next-when"><strong>{displayTime(next.starts_at,zone)}</strong><span>{dayLabel(DateTime.fromISO(next.starts_at).setZone(zone).toISODate()!)}</span><button type="button" onClick={()=>chooseDay(DateTime.fromISO(next.starts_at).setZone(zone).toISODate()!)}>Ver esse dia</button></div></section>}
  <div className="agenda-filters" aria-label="Período da agenda">{([{id:'today',label:'Hoje'},{id:'tomorrow',label:'Amanhã'},{id:'upcoming',label:'Próximos'}] as const).map(item=><button type="button" key={item.id} aria-pressed={mode===item.id} onClick={()=>{setMode(item.id);setReschedule(null);}}>{item.label}</button>)}</div>
  <div className="agenda-date-controls"><label>Escolher uma data<input type="date" value={selectedDate} onChange={event=>{if(event.target.value)chooseDay(event.target.value);}}/></label><div className="agenda-day-arrows"><button aria-label="Dia anterior" onClick={()=>chooseDay(DateTime.fromISO(selectedDate).minus({days:1}).toISODate()!)}><ChevronLeft size={20}/></button><button aria-label="Dia seguinte" onClick={()=>chooseDay(DateTime.fromISO(selectedDate).plus({days:1}).toISODate()!)}><ChevronRight size={20}/></button></div><button type="button" className="text-link" onClick={onBlock}>{blocking?'Fechar bloqueio':'Bloquear horário'}</button></div>
  {children}
  <div className="agenda-list-heading"><h2>{mode==='upcoming'?'Próximos atendimentos':dayLabel(selectedDate)}</h2><p>{bookings.length} {bookings.length===1?'atendimento':'atendimentos'}{mode!=='upcoming'&&selectedDate===today?` · ${remaining} por acontecer ou neste horário`:''}{active.some(e=>e.kind==='block')?' · Há horários bloqueados':''}</p></div>
  {active.length?Array.from(groups,([day,items])=><section className="agenda-day-group" key={day} aria-label={dayLabel(day)}>{mode==='upcoming'&&<h3 className="agenda-group-date">{dayLabel(day)}</h3>}<div className="agenda-entry-list">{items.map(renderEntry)}</div></section>):<div className="agenda-empty"><CalendarDays size={32}/><h3>{mode==='upcoming'?'Nenhum atendimento futuro na agenda.':'Nenhum atendimento neste dia.'}</h3><p>{mode==='upcoming'?'Compartilhe seu link com as clientes ou adicione um atendimento.':'Confira os próximos dias ou adicione um atendimento aqui.'}</p><div>{mode!=='upcoming'&&<button className="button secondary" onClick={()=>setMode('upcoming')}>Ver próximos</button>}<button className="button" onClick={onNew}>Novo agendamento</button></div></div>}
  {canceled.length>0&&<details className="agenda-canceled"><summary>Ver cancelados ({canceled.length})</summary>{canceled.map(renderEntry)}</details>}
  {mode==='upcoming'&&<p className="fine-print">Exibindo os próximos atendimentos carregados, em ordem de data e horário.</p>}
 </div>;
}
