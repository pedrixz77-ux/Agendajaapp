'use client';

import {useEffect, useRef, useState} from 'react';
import {ArrowUpRight, Check, Copy, Link2} from 'lucide-react';

export function BookingLink({slug, published}: {slug: string; published: boolean}) {
 const [url, setUrl] = useState('');
 const [status, setStatus] = useState('');
 const [copied, setCopied] = useState(false);
 const input = useRef<HTMLInputElement>(null);

 useEffect(() => {
  setUrl(new URL(`/${slug}`, window.location.origin).href);
  setStatus('');
  setCopied(false);
 }, [slug]);

 async function copyLink() {
  try {
   await navigator.clipboard.writeText(url);
   setCopied(true);
   setStatus('Link copiado! Agora é só colar no WhatsApp ou na bio do Instagram.');
  } catch {
   input.current?.focus();
   input.current?.select();
   input.current?.setSelectionRange(0, url.length);
   setCopied(false);
   setStatus('Toque e segure o link selecionado e escolha Copiar.');
  }
 }

 return <section className="booking-link-card" aria-labelledby="booking-link-title">
  <div className="booking-link-heading"><span className="booking-link-icon"><Link2 size={22}/></span><div><h2 id="booking-link-title">Seu link de agendamento</h2><p>Compartilhe com suas clientes para elas escolherem o serviço e o horário.</p></div></div>
  <div className="booking-link-actions">
   <input ref={input} aria-label="Link da sua página de agendamentos" readOnly value={url} placeholder="Carregando seu link…" onFocus={event => event.currentTarget.select()}/>
   <button type="button" className="button" disabled={!url} onClick={copyLink}>{copied ? <Check size={19}/> : <Copy size={19}/>} {copied ? 'Link copiado!' : 'Copiar link'}</button>
  </div>
  <div className="booking-link-footer"><a className="text-link" href={`/${slug}`} target="_blank" rel="noopener noreferrer">Abrir minha página <ArrowUpRight size={16}/></a>{!published && <span>Ative sua página em “Minha página” antes de compartilhar.</span>}</div>
  <p className="booking-link-status" role="status" aria-live="polite">{status}</p>
 </section>;
}
