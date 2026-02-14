# ClickMail

**Email Deliverability Optimizer** — Plataforma de disparo inteligente de emails com aquecimento automático, verificação de base, geração de variações por IA e tracking completo em tempo real.

Desenvolvido por **Oneclick**.

---

## Problema

Disparos em massa via Mailchimp/SendGrid caem no spam porque:
- Domínio sem configuração SPF/DKIM/DMARC
- Sem aquecimento gradual do domínio
- Base de emails não verificada (bounces destroem reputação)
- Conteúdo com padrões de spam

## Solução

O ClickMail resolve o ciclo completo:

1. **Configurar domínio** → Registro automático no AWS SES + DNS records gerados
2. **Upload da base** → CSV com emails
3. **Verificação automática** → Limpa emails inválidos/risco via MillionVerifier
4. **Geração de variações** → Gemini gera 5 versões otimizadas anti-spam
5. **Aquecimento automático** → Escalonamento gradual de volume (50 → 5000/dia)
6. **Tracking completo** → Métricas em tempo real via SNS webhooks (6 tabelas atualizadas por evento)
7. **Unsubscribe compliance** → Header `List-Unsubscribe` (RFC 8058) + link no rodapé + página de confirmação

---

## Arquitetura

```
┌──────────────────────────────────────────────────────┐
│                     FRONTEND                          │
│               React + Vite + Tailwind                 │
│  Dashboard, Campanhas, Warmup, Reputation, Domínios   │
└───────────────────────┬──────────────────────────────┘
                        │
                        ▼
┌──────────────────────────────────────────────────────┐
│                     SUPABASE                          │
│  ┌──────────┐ ┌──────────┐ ┌──────────────────────┐  │
│  │   Auth   │ │ Postgres │ │   Edge Functions     │  │
│  │  (Login) │ │ (clickmail│ │  trigger-n8n         │  │
│  │          │ │  schema)  │ │  verify-dns          │  │
│  └──────────┘ └──────────┘ │  calculate-reputation │  │
│  ┌──────────┐              │  manage-ses-identity  │  │
│  │ Storage  │ ┌──────────┐ │  unsubscribe          │  │
│  │  (CSVs)  │ │ Realtime │ └──────────────────────┘  │
│  └──────────┘ └──────────┘                            │
└───────────────────────┬──────────────────────────────┘
                        │
                        ▼
┌──────────────────────────────────────────────────────┐
│               N8N CLOUD (5 Workflows)                 │
│  01 Verificar Lista    │ 02 Gerar Variantes (Gemini)  │
│  03 Warmup & Disparo   │ 04 Processar Eventos SES     │
│  05 Reputação Diária   │                              │
└───────────────────────┬──────────────────────────────┘
                        │
                        ▼
┌──────────────────────────────────────────────────────┐
│              AMAZON SES (sa-east-1)                   │
│  Configuration Set: clickmail-tracking                │
│  SNS Topics → Webhook n8n (bounce/delivery/open/      │
│               click/complaint)                        │
│  SPF + DKIM + DMARC configurados no DNS               │
└──────────────────────────────────────────────────────┘
```

---

## Stack Técnica

| Camada | Tecnologia | Uso |
|--------|-----------|-----|
| **Frontend** | React 18 + Vite + Tailwind CSS + Recharts | UI, gráficos, dashboard |
| **Backend** | Supabase (PostgreSQL + Auth + Edge Functions + Storage + Realtime) | Dados, auth, lógica, eventos |
| **Automação** | n8n Cloud (Starter) | Workflows de verificação, IA e disparo |
| **Disparo** | Amazon SES (sa-east-1) | Envio via `SendRawEmail` com MIME headers |
| **Verificação** | MillionVerifier API | Validação de emails |
| **IA** | Gemini API (free tier) | Geração de variações otimizadas |
| **Tracking** | AWS SNS → n8n Webhook | Eventos SES em tempo real |

---

## Banco de Dados

Schema `clickmail` com updatable views que mapeiam para tabelas `public` (RLS ativo).

| Tabela | Descrição |
|--------|-----------|
| `email_domains` | Domínios (SPF/DKIM/DMARC, SES status, reputação, `ses_dkim_tokens`) |
| `email_lists` | Listas importadas via CSV com status de verificação |
| `email_contacts` | Contatos com verificação, blacklist, unsubscribe |
| `email_campaigns` | Campanhas com métricas agregadas (sent/delivered/opened/clicked/bounced/complained) |
| `email_variants` | Variações A/B/C/D/E com `open_rate`, `click_rate`, spam score |
| `email_sends` | Log de cada envio com `ses_message_id` e tracking completo |
| `warmup_schedule` | Cronograma dia a dia com `planned_volume`, `actual_sent`, `delivered`, `opened`, `bounced`, `complained` |
| `app_settings` | Configurações (AWS credentials, API keys) |

### Relacionamentos

```
email_domains ──┐
                ├── email_campaigns ── email_variants
email_lists ────┘        │
    │                    │
    └── email_contacts ──┴── email_sends
                                │
                          warmup_schedule
```

---

## Edge Functions

| Função | JWT | Descrição |
|--------|-----|-----------|
| `trigger-n8n` | No | Proxy para workflows n8n (evita CORS) |
| `verify-dns` | No | Verifica SPF/DKIM/DMARC via DNS + DKIM CNAMEs do SES |
| `calculate-reputation` | No | Calcula score de reputação do domínio (0-100) |
| `manage-ses-identity` | No | Registra/verifica/remove domínios no AWS SES |
| `unsubscribe` | No | Página de cancelamento (GET=confirmação, POST=RFC 8058 one-click) |

---

## n8n Workflows

| # | Nome | Trigger | Descrição |
|---|------|---------|-----------|
| 01 | Verificar Lista de Emails | Edge Function | Valida emails via MillionVerifier, atualiza status |
| 02 | Gerar Variantes | Edge Function | Gemini gera 5 variações A/B/C/D/E otimizadas |
| 03 | Aquecimento & Disparo SES | Cron (hora em hora, Seg-Sex, 8h-18h) | Envia batch via `SendRawEmail` com warmup gradual |
| 04 | Processar Eventos SES | Webhook SNS | Atualiza 6 tabelas: sends, contacts, campaigns, warmup, variants, domains |
| 05 | Reputação Diária | Cron (6h diário) | Verifica DNS, atualiza saúde, pausa campanhas se bounce > 5% ou complaint > 0.1% |

### Tracking Pipeline (Workflow 04)

Cada evento SES (Delivery, Open, Click, Bounce, Complaint) atualiza em tempo real:

```
SNS Webhook → Parsear → Buscar Envio → Montar Updates
  → Atualizar Envio (email_sends)
  → Atualizar Contato (email_contacts)
  → Atualizar Campanha (email_campaigns)
  → Atualizar Warmup Schedule (warmup_schedule)    ┐
  → Atualizar Variante (email_variants)             ├─ paralelo
  → Atualizar Domínio (email_domains)               ┘
```

---

## Setup

### Pré-requisitos

- Node.js 18+
- Conta no [Supabase](https://supabase.com)
- Conta na [AWS](https://aws.amazon.com) (SES na região sa-east-1)
- [n8n Cloud](https://n8n.io) (Starter plan) ou self-hosted
- API Key [MillionVerifier](https://millionverifier.com)
- API Key [Google Gemini](https://ai.google.dev/)

### 1. Instalar dependências

```bash
git clone https://github.com/oneclick/clickmail.git
cd clickmail
npm install
```

### 2. Configurar variáveis de ambiente

```bash
cp .env.example .env
```

```env
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

Credentials AWS, MillionVerifier e Gemini ficam na tabela `app_settings` do Supabase (não no `.env`).

### 3. Aplicar migrations

As migrations estão em `supabase/migrations/`. Aplique via CLI ou dashboard.

```bash
npx supabase db push
```

### 4. Configurar Amazon SES

1. Adicionar domínio no app → SES registra automaticamente via Edge Function `manage-ses-identity`
2. Configurar DNS records (3 CNAME DKIM + SPF + DMARC) no provedor
3. Criar Configuration Set `clickmail-tracking` no console AWS
4. Criar SNS Topics (Bounce, Complaint, Delivery, Open, Click) na região sa-east-1
5. Adicionar Event Destinations no Configuration Set apontando para os SNS Topics
6. Inscrever o webhook `https://<n8n-host>/webhook/process-ses-events` em cada SNS Topic
7. Solicitar saída do sandbox para enviar para qualquer email

### 5. Rodar o projeto

```bash
npm run dev        # dev server
npx vite build     # build de produção
```

---

## Páginas do App

| Página | Rota | Descrição |
|--------|------|-----------|
| Login | `/login` | Autenticação via Supabase Auth |
| Dashboard | `/` | KPIs gerais, aquecimento do dia, campanhas recentes |
| Campanhas | `/campaigns` | Lista de campanhas com status e métricas |
| Detalhe da Campanha | `/campaigns/:id` | 6 KPIs, variantes com A/B metrics, send log |
| Listas | `/lists` | Upload CSV, verificação de contatos |
| Domínios | `/domains` | DNS records, status SES, verificação |
| Aquecimento | `/warmup` | Volume planejado vs real, saúde, controles |
| Reputação | `/reputation` | Score gauge, histórico, entregabilidade, alertas |
| Configurações | `/settings` | API keys, preferências |

---

## Custos Operacionais

| Serviço | Custo | Observação |
|---------|-------|------------|
| Supabase (Free) | $0/mês | Auth + DB + Storage + Edge Functions + Realtime |
| Amazon SES | $0.10/1k emails | Custo variável por volume |
| n8n Cloud (Starter) | ~$26/mês | 5 workflows ativos |
| Gemini API | $0/mês | Free tier suficiente para variações |
| MillionVerifier | $0.37/1k verificações | Custo pontual por lista |
| **Fixo** | **~$26/mês** | Apenas n8n |
| **100k emails** | **~$36/mês** | n8n + SES |

**Comparativo:** Mailchimp $800+/mês, SendGrid $100+/mês para 100k contatos.

---

## Roadmap

- [x] Estrutura do banco de dados (schema `clickmail` + views)
- [x] Frontend — Dashboard, Campanhas, Domínios, Listas, Settings
- [x] Frontend — Warmup e Reputation pages
- [x] Frontend — Autenticação (Login + ProtectedRoute)
- [x] Edge Function — trigger-n8n (proxy CORS)
- [x] Edge Function — verify-dns (SPF/DKIM/DMARC + SES DKIM CNAMEs)
- [x] Edge Function — calculate-reputation (score com baseline para novos domínios)
- [x] Edge Function — manage-ses-identity (create/check/delete no SES)
- [x] Edge Function — unsubscribe (RFC 8058 one-click + página de confirmação)
- [x] n8n — Verificar lista de emails (MillionVerifier)
- [x] n8n — Gerar variações (Gemini)
- [x] n8n — Aquecimento & Disparo SES (SendRawEmail + List-Unsubscribe)
- [x] n8n — Processar Eventos SES (tracking 6 tabelas)
- [x] n8n — Reputação Diária (auto-pause)
- [ ] Sair do sandbox AWS SES (produção)
- [ ] Teste E2E completo (campanha → warmup → tracking)
- [ ] Integração Google Postmaster Tools
- [ ] Multi-tenant (SaaS)
- [ ] Billing com Stripe

---

## Licença

Propriedade da **Oneclick**. Todos os direitos reservados.
