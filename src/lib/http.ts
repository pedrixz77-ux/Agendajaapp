import {z} from 'zod';
export const uuid=z.uuid();
export const phone=z.string().regex(/^\d{10,15}$/);
export const customer=z.string().trim().min(2).max(100);
export function sameOrigin(req:Request){const expected=process.env.APP_URL;if(!expected||req.headers.get('origin')!==new URL(expected).origin)throw new Error('ORIGIN');}
export async function jsonBody(req:Request){if(!req.headers.get('content-type')?.includes('application/json'))throw new Error('BODY');const raw=await req.text();if(raw.length>16000)throw new Error('BODY');return JSON.parse(raw);}
export function failure(error:unknown){const code=(error as {code?:string})?.code;
 if(code==='22023'&&(error as {message?:string})?.message==='Change deadline passed')return Response.json({error:'O prazo para cancelar ou remarcar pelo site terminou. Entre em contato com a profissional para solicitar a alteração.'},{status:409});
 if(code==='23P01')return Response.json({error:'Esse horário acabou de ser ocupado. Escolha outro.'},{status:409});
 if(code==='23505')return Response.json({error:'Esse link ou registro já está em uso.'},{status:409});
 if((error as Error)?.message==='SERVER_NOT_CONFIGURED')return Response.json({error:'O agendamento público ainda está em configuração. Entre em contato com a profissional.'},{status:503});
 return Response.json({error:'Não foi possível concluir. Confira os dados e tente novamente.'},{status:400});
}
