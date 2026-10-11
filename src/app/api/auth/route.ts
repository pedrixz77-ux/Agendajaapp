import {sessionClient} from '@/lib/supabase-server';
import {sameOrigin,jsonBody,failure} from '@/lib/http';
import {z} from 'zod';
export async function POST(req:Request){try{
 sameOrigin(req);const body=await jsonBody(req);const db=await sessionClient();
 const action=z.enum(['login','signup','recover','password','logout']).parse(body.action);
 if(action==='logout'){const {error}=await db.auth.signOut();if(error)throw error;return Response.json({ok:true});}
 if(action==='password'){const password=z.string().min(12).max(100).parse(body.password);const {data:{user}}=await db.auth.getUser();if(!user)throw new Error('AUTH');const {error}=await db.auth.updateUser({password});if(error)throw error;return Response.json({ok:true});}
 const email=z.email().max(254).parse(body.email);
 if(action==='recover'){const {error}=await db.auth.resetPasswordForEmail(email,{redirectTo:`${process.env.APP_URL}/auth/callback?next=/nova-senha`});if(error)return Response.json({error:'O envio de recuperação está indisponível. Tente novamente mais tarde.'},{status:503});return Response.json({message:'Se houver uma conta para esse e-mail, você receberá as instruções.'});}
 const password=z.string().min(action==='signup'?12:1).max(100).parse(body.password);
 if(action==='signup'){const {error}=await db.auth.signUp({email,password,options:{emailRedirectTo:`${process.env.APP_URL}/auth/callback`}});if(error)throw error;return Response.json({message:'Confira seu e-mail para confirmar o cadastro. Se você já tem conta, entre ou recupere sua senha.'});}
 const {error}=await db.auth.signInWithPassword({email,password});if(error)return Response.json({error:'Não foi possível entrar. Confira e-mail, senha e confirmação do cadastro.'},{status:401});
 return Response.json({ok:true});
 }catch(e){return failure(e);}}
