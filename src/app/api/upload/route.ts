import {sessionClient} from '@/lib/supabase-server';
import {sameOrigin,failure} from '@/lib/http';
import sharp from 'sharp';
export async function POST(req:Request){try{
 sameOrigin(req);const db=await sessionClient();const {data:{user}}=await db.auth.getUser();if(!user)return Response.json({error:'Entre novamente para continuar.'},{status:401});
 if(Number(req.headers.get('content-length')??0)>2500000)throw new Error('SIZE');
 const form=await req.formData();const file=form.get('image');
 if(!(file instanceof File)||file.size>2097152||!['image/jpeg','image/png','image/webp'].includes(file.type))return Response.json({error:'Envie JPG, PNG ou WebP com até 2 MB.'},{status:400});
 const original=Buffer.from(await file.arrayBuffer());const metadata=await sharp(original,{limitInputPixels:20000000}).metadata();
 if(!metadata.format||!['jpeg','png','webp'].includes(metadata.format))throw new Error('FORMAT');
 const image=await sharp(original,{limitInputPixels:20000000}).rotate().resize(512,512,{fit:'cover'}).webp({quality:85}).toBuffer();
 const path=`${user.id}/logo.webp`;const {error:uploadError}=await db.storage.from('business-images').upload(path,image,{contentType:'image/webp',upsert:true,cacheControl:'60'});if(uploadError)throw uploadError;
 const {error}=await db.from('businesses').update({logo_path:path}).eq('owner_id',user.id);if(error)throw error;
 return Response.json({ok:true});
 }catch(e){return failure(e);}}
