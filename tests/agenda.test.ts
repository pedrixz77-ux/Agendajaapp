import {test} from 'node:test';
import assert from 'node:assert/strict';
import {agendaEntries,nextAppointment} from '../src/lib/agenda.ts';
import type {Entry} from '../src/lib/types.ts';
const now=Date.parse('2026-10-16T15:30:00Z');
function entry(id:string,start:string,end:string,extra:Partial<Entry>={}):Entry{return {id,starts_at:start,ends_at:end,busy_until:end,kind:'booking',status:'confirmed',client_id:null,service_id:null,service_name:'Serviço',price_cents:1000,...extra};}
const current=entry('current','2026-10-16T15:00:00Z','2026-10-16T16:00:00Z');
const future=entry('future','2026-10-17T15:00:00Z','2026-10-17T16:00:00Z');
const past=entry('past','2026-10-16T14:00:00Z','2026-10-16T15:30:00Z');
test('day filter uses business timezone across UTC midnight',()=>{
 const late=entry('late','2026-10-17T01:00:00Z','2026-10-17T02:00:00Z');
 assert.deepEqual(agendaEntries([future,late,current],'America/Sao_Paulo','2026-10-16',false,now).map(e=>e.id),['current','late']);
});
test('upcoming includes ongoing appointments and excludes canceled and ended entries',()=>{
 const canceled=entry('canceled',future.starts_at,future.ends_at,{status:'canceled'});
 assert.deepEqual(agendaEntries([future,past,canceled,current],'America/Sao_Paulo','2026-10-16',true,now).map(e=>e.id),['current','future']);
});
test('next appointment ignores blocks and cancellations and prioritizes ongoing appointment',()=>{
 const block=entry('block',current.starts_at,current.ends_at,{kind:'block'});
 const canceled=entry('canceled',current.starts_at,current.ends_at,{status:'canceled'});
 assert.equal(nextAppointment([future,block,canceled,past,current],now)?.id,'current');
 assert.equal(nextAppointment([block,canceled,past],now),undefined);
});
test('day view retains canceled entries for separate history and does not reorder input',()=>{
 const canceled=entry('canceled',past.starts_at,past.ends_at,{status:'canceled'});
 const entries=[current,canceled];
 assert.deepEqual(agendaEntries(entries,'America/Sao_Paulo','2026-10-16',false,now).map(e=>e.id),['canceled','current']);
 assert.equal(entries[0].id,'current');
});
