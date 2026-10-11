'use client';
import {useRef} from 'react';
import gsap from 'gsap';
import {useGSAP} from '@gsap/react';
import {ScrollTrigger} from 'gsap/ScrollTrigger';
gsap.registerPlugin(useGSAP,ScrollTrigger);
export function Reveal({children}:{children:React.ReactNode}){const ref=useRef<HTMLDivElement>(null);useGSAP(()=>{const mm=gsap.matchMedia();mm.add('(prefers-reduced-motion: no-preference)',()=>{gsap.utils.toArray<HTMLElement>('[data-reveal]',ref.current).forEach(el=>gsap.from(el,{y:22,opacity:0,duration:.65,ease:'power2.out',scrollTrigger:{trigger:el,start:'top 92%',once:true}}));});return()=>mm.revert();},{scope:ref});return <div ref={ref}>{children}</div>;}
