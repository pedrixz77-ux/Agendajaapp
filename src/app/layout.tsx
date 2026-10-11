import type {Metadata} from 'next';
import './globals.css';
export const metadata:Metadata={title:{default:'AgendaJá — Sua agenda, no seu tempo',template:'%s | AgendaJá'},description:'Sua página de agendamentos para atender com mais organização. Feita para profissionais da beleza.'};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="pt-BR"><body><a href="#main" className="skip-link">Pular para o conteúdo</a>{children}</body></html>;}
