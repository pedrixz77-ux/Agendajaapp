import {sessionClient} from '@/lib/supabase-server';
export async function GET(req:Request){const url=new URL(req.url);const code=url.searchParams.get('code');const next=url.searchParams.get('next')==='/nova-senha'?'/nova-senha':'/app';const origin=process.env.APP_URL!;
 if(code){const db=await sessionClient();const {error}=await db.auth.exchangeCodeForSession(code);if(!error)return Response.redirect(new URL(next,origin));}
 return Response.redirect(new URL('/login?erro=confirmacao',origin));}
