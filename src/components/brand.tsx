import Link from 'next/link';
import {CalendarCheck2} from 'lucide-react';
export function Brand(){return <Link className="brand" href="/" aria-label="AgendaJá, página inicial"><span className="brand-symbol"><CalendarCheck2 size={24} strokeWidth={1.5}/></span><span>Agenda<span className="brand-pink">Já</span></span></Link>;}
