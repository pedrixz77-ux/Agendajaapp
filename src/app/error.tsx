'use client';
export default function ErrorPage({reset}:{reset:()=>void}){return <main id="main" className="auth-card onboarding"><h1>Não foi possível carregar agora.</h1><p>Confira sua conexão e tente novamente. Seus dados não foram alterados por esta tela.</p><button className="button" onClick={reset}>Tentar novamente</button></main>;}
