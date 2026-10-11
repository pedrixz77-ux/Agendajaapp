'use client';
import Script from 'next/script';
import {useCallback,useEffect,useRef,useState} from 'react';
declare global {interface Window{turnstile?:{render:(el:HTMLElement,opts:Record<string,unknown>)=>string;remove:(id:string)=>void;reset:(id:string)=>void}}}
export function BotCheck({onToken,resetKey}:{onToken:(token:string)=>void;resetKey:number}){
 const root=useRef<HTMLDivElement>(null);const widget=useRef<string|null>(null);const callback=useRef(onToken);callback.current=onToken;const[ready,setReady]=useState(false);
 const setup=useCallback(()=>setReady(true),[]);
 useEffect(()=>{if(window.turnstile)setReady(true);},[]);
 useEffect(()=>{if(!ready||!root.current||!window.turnstile||!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY)return;widget.current=window.turnstile.render(root.current,{sitekey:process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,action:'booking',theme:'light',callback:(token:string)=>callback.current(token),'expired-callback':()=>callback.current(''),'error-callback':()=>callback.current('')});return()=>{if(widget.current)window.turnstile?.remove(widget.current);widget.current=null;};},[ready]);
 useEffect(()=>{if(widget.current){window.turnstile?.reset(widget.current);callback.current('');}},[resetKey]);
 if(!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY)return <p className="notice">O agendamento público ainda está em configuração. A profissional pode adicionar sua reserva pelo painel.</p>;
 return <><Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" strategy="afterInteractive" onLoad={setup} onReady={setup}/><div ref={root} className="bot-check"/></>;
}
