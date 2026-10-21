# AgendaJá — versão de desenvolvimento

Micro SaaS de agendamentos para profissionais da beleza. Esta entrega contém código real de frontend, APIs e migrações já aplicadas ao projeto Supabase de desenvolvimento. Não está publicada nem pronta para receber clientes pagantes.

## Executar

Requer Node.js 24 e npm. Execute `npm ci`, copie `.env.example` para `.env.local` e configure as variáveis. Depois use `npm run dev`. Para validar: `npm test`, `npm run typecheck`, `npm run build`.

Nunca versionar `.env.local`. A chave `SUPABASE_SECRET_KEY` e `TURNSTILE_SECRET_KEY` são exclusivamente do servidor. Configure pelo painel seguro da hospedagem; não envie senhas ou chaves privadas pelo chat. `APP_URL` precisa corresponder à origem exata do ambiente. As variáveis `NEXT_PUBLIC_*` são públicas.

## O que foi implementado

- Landing page original baseada na identidade fornecida: ameixa, rosa, fundo claro, Inter e Playfair Display.
- Cadastro, login, recuperação de acesso e troca de senha usando Supabase Auth; precisam de configuração e testes de e-mail.
- Onboarding com criação de negócio e avaliação de sete dias gerada no banco.
- Painel autenticado: agenda em listas diária/semanal, serviços, disponibilidade com intervalos, bloqueios, clientes, personalização e conta.
- Reservas manuais, cancelamento e remarcação com regras no banco.
- Página pública com serviços, horários calculados, confirmação e link privado de gestão sem conta do cliente.
- Upload de logo/foto convertido para WebP, limitado e vinculado ao proprietário.
- Proteção contra sobreposição no PostgreSQL, políticas de isolamento por profissional e limitação de requisições persistida no banco.
- GSAP com preferência por movimento reduzido e Lottie carregado sob demanda no sucesso.

## Banco de dados

Projeto de desenvolvimento: `vsgslxuydwgdmangfzfd`, região `us-east-1`. Migrações em `supabase/migrations`, aplicadas em ordem. Não reaplicar em um banco existente sem verificar o histórico. Em um novo projeto use Supabase CLI e uma conexão autorizada.

Tabelas: profiles, businesses, services, availability, clients, calendar_entries, subscriptions, audit_events, privacy_requests. O esquema privado contém rate_limits e payment_events. Autenticação usa auth.users; fotos usam Storage.

Cada negócio possui um proprietário. Chaves compostas impedem vincular serviço ou cliente de outro negócio. Bloqueios e reservas compartilham calendário com restrição de exclusão de intervalos. Funções de reserva/remarcação executam transações e bloqueiam o negócio durante a alteração. Datas são armazenadas com fuso e avaliadas no fuso IANA do profissional. Turnos atravessando a meia-noite não são suportados nesta versão.

Os clientes finais não acessam diretamente as tabelas. APIs públicas retornam somente catálogo e horários livres. Tokens aleatórios de gestão são armazenados como hash; o link usa fragmento para evitar token no endereço enviado ao servidor. Não registrar corpos de formulários nem tokens em logs.

## Telas

`/`: comercial; `/cadastro`, `/login`, `/recuperar`, `/nova-senha`: acesso; `/app`: painel; `/<slug>`: reserva pública; `/reserva`: gestão por link privado; `/privacidade`, `/termos`: rascunhos legais identificados como tal.

## Próxima configuração

1. Conectar repositório GitHub e ambiente de testes na Vercel, após verificar plano e custos com o titular. Não houve criação de repositório ou deploy nesta entrega.
2. Configurar variáveis privadas no ambiente de testes e a origem pública em APP_URL.
3. Configurar URLs autorizadas e SMTP transacional no Supabase; verificar confirmação de cadastro e recuperação reais.
4. Configurar Turnstile e seus domínios autorizados. Sem configuração, reservas públicas ficam indisponíveis por segurança.
5. Confirmar serviços, preços, horários e contato atuais de Daniela Malato antes de cadastrar o piloto. Não foram inseridos dados presumidos.
6. Executar testes completos em navegador e celular. Resolver pendências em docs/VALIDACAO.md.
7. Escolher e conectar provedor de assinatura em sandbox. A estrutura de estados existe, mas não há integração de cobrança nem webhooks operacionais.
8. Completar documentação legal, retenção, operação de solicitações de titulares e recuperação de backups antes da produção.

## Assinatura

Preço planejado: R$ 19,99/mês. Estados: trialing, active, pending, past_due, canceled. Navegador não pode alterar assinatura. Avaliação de sete dias implementada no banco. Não existe cobrança real ou checkout funcional. A tabela privada de eventos é preparação para idempotência, não prova de integração com pagamentos.

## Limitações atuais

- Não houve validação visual em navegador; responsividade e acessibilidade precisam de testes reais.
- Histórico carregado no painel é limitado: 30 dias anteriores e 181 seguintes, até 1.000 registros; clientes até 500. Paginação e consulta do histórico completo pendentes.
- Slug não editável após onboarding pela interface atual.
- Gestão de pedidos de exclusão/exportação ainda manual; registrar pedido não significa executar exclusão.
- Remarcação depende de serviço ativo e assinatura elegível. Cancelamento de reserva existente permanece possível conforme regras. Revisar política para assinatura expirada antes de lançar.
- Não há notificações automáticas por WhatsApp, avaliações, múltiplas profissionais por negócio ou pagamentos de procedimentos.
- Conferir confiança no cabeçalho de IP no provedor de hospedagem para o rate limiting; monitorar abuso distribuído.
- Textos legais são rascunhos e não substituem os dados e políticas reais da operação.

Não houve contratação de plano, transação real ou publicação em produção. Estimativa definitiva de custos depende de plano de hospedagem, banco, e-mail, domínio e provedor de pagamento; confirmar valores atuais antes de contratar.
