# Registro de validação — 11/10/2026

## Executado

| Verificação | Resultado | Alcance |
| --- | --- | --- |
| npm test | 11 passaram, zero falhas | Janelas, duração, intervalos, sobreposição, passado, datas inválidas, horário de verão, origem das requisições, corpo inválido e erros seguros |
| npm run typecheck | Passou | TypeScript do projeto |
| npm run build | Passou | Compilação Next.js; não equivale a testes em navegador |
| tests/database.sql | 19 verificações passaram | RLS, acesso anônimo, negócio indevido, serviço de outro negócio, avaliação, reserva, conflitos sequenciais, idempotência, cancelamento e remarcação |
| tests/customer-rules.sql | 7 verificações passaram | Prazo de 24h, token incorreto, revogação, substituição atômica da disponibilidade e limitação de requisições |
| Supabase Security Advisor | Nenhum alerta retornado | Revisão automática do esquema após as três migrações; não garante segurança completa |
| npm audit --omit=dev | Zero vulnerabilidades reportadas na execução | Dependências de produção conforme base de avisos naquele momento |

Os dois scripts SQL foram executados no banco de desenvolvimento dentro de transações revertidas. Não deixaram usuários ou reservas de demonstração. Para repetir, executar integralmente cada script em ambiente de testes com papel administrativo; nunca executar trechos isolados em produção.

## Pendências obrigatórias antes de lançamento

- Cadastro, confirmação por e-mail, login, logout e recuperação ponta a ponta com SMTP configurado.
- Criar/editar serviço, configurar horários, upload, reservas públicas e gestão privada em navegador real.
- Duas requisições simultâneas em conexões independentes: restrição de exclusão implementada, mas o teste executado de conflito foi sequencial.
- Testes em celulares, navegação por teclado, leitor de tela, contraste, zoom e preferência de movimento reduzido.
- Performance no dispositivo, carregamento sob rede lenta, carga e abuso de APIs.
- Assinatura sandbox: ainda não implementada a integração do provedor, logo nenhum teste de cobrança passou.
- Verificar redirects de autenticação, origem confiável do IP, configuração do Turnstile e permissões das chaves no ambiente hospedado.
- Definir retenção, responsável e prazo operacional para exportação/exclusão, política de dados internacionais e contato de privacidade.
- Configurar backup compatível com o plano escolhido e testar restauração em projeto isolado, incluindo objetos do Storage e configurações de autenticação. A existência de migrações não substitui backup dos dados.
- Preparar monitoramento sem dados pessoais, alertas, rotação de chaves e procedimento de incidentes.

Não existe resultado de teste visual, E2E, carga, pagamento ou recuperação de backup nesta entrega. Todos permanecem pendentes, não aprovados.
