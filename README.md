# 📧 Clickmail

**Email Deliverability Optimizer** — Plataforma de disparo inteligente de emails com aquecimento automático, verificação de base, geração de variações por IA e análise de spam score.

Desenvolvido por **Oneclick** para replicação em projetos de clientes.

---

## 🎯 Problema

Disparos em massa via Mailchimp/SendGrid caem no spam porque:
- Domínio sem configuração SPF/DKIM/DMARC
- Sem aquecimento gradual do domínio
- Base de emails não verificada (bounces destroem reputação)
- Conteúdo com padrões de spam

## 💡 Solução

O Clickmail resolve o ciclo completo:

1. **Upload da base** → CSV com emails
2. **Verificação automática** → Limpa emails inválidos/risco
3. **Geração de variações** → IA gera 5 versões otimizadas anti-spam
4. **Spam score** → Análise pré-envio de cada variação
5. **Aquecimento automático** → Escalonamento gradual de volume
6. **Dashboard** → Métricas de entrega, abertura, cliques e reputação em tempo real

---

## 🏗️ Arquitetura

```
┌─────────────────────────────────────────────────────┐
│                    FRONTEND                          │
│              React + Vite + Tailwind                 │
│         (Dashboard, Upload, Campanhas)               │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│                    SUPABASE                          │
│  ┌──────────┐ ┌──────────┐ ┌───────────────────┐   │
│  │   Auth    │ │ Postgres │ │  Edge Functions   │   │
│  │  (Login)  │ │  (Dados) │ │ (Verificação/IA)  │   │
│  └──────────┘ └──────────┘ └───────────────────┘   │
│  ┌──────────┐ ┌──────────────────────────────────┐  │
│  │ Storage  │ │       Realtime (Dashboard)       │  │
│  │  (CSVs)  │ │                                  │  │
│  └──────────┘ └──────────────────────────────────┘  │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│                  N8N WORKFLOWS                       │
│  ┌────────────┐ ┌────────────┐ ┌────────────────┐  │
│  │ Verificar  │ │ Gerar      │ │ Aquecimento    │  │
│  │ Emails     │ │ Variações  │ │ Automático     │  │
│  └────────────┘ └────────────┘ └────────────────┘  │
│  ┌────────────┐ ┌────────────────────────────────┐  │
│  │ Disparar   │ │ Processar Webhooks SES         │  │
│  │ via SES    │ │ (bounce/open/click/complaint)  │  │
│  └────────────┘ └────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│                 AMAZON SES                           │
│          (Disparo real dos emails)                   │
│     SPF + DKIM + DMARC configurados no DNS          │
└─────────────────────────────────────────────────────┘
```

---

## 🛠️ Stack Técnica

| Camada | Tecnologia | Função |
|--------|-----------|--------|
| **Frontend** | React + Vite + Tailwind CSS | Dashboard e interface |
| **Backend** | Supabase (PostgreSQL + Auth + Edge Functions + Storage) | Dados, autenticação, lógica |
| **Automação** | n8n (self-hosted) | Workflows de verificação, IA e disparo |
| **Disparo** | Amazon SES | Envio de emails ($0.10/1k emails) |
| **Verificação** | MillionVerifier API | Validação de emails ($37/100k) |
| **IA** | Claude API (Sonnet) | Geração de variações otimizadas |
| **Spam Score** | Mail-Tester / SpamAssassin | Análise pré-envio |

---

## 📊 Estrutura do Banco de Dados

### Tabelas principais

| Tabela | Descrição |
|--------|-----------|
| `email_domains` | Domínios configurados (SPF/DKIM/DMARC, reputação, aquecimento) |
| `email_lists` | Listas/bases importadas via CSV |
| `email_contacts` | Contatos individuais com status de verificação |
| `email_campaigns` | Campanhas de disparo com configurações |
| `email_variants` | 5 variações por campanha (A/B/C/D/E) com spam score |
| `email_sends` | Log de cada envio individual com tracking SES |
| `warmup_schedule` | Cronograma de aquecimento dia a dia |

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

## 🚀 Setup do Projeto

### Pré-requisitos

- Node.js 18+
- Conta no [Supabase](https://supabase.com)
- Conta na [AWS](https://aws.amazon.com) (para SES)
- Instância [n8n](https://n8n.io) (Railway, Render ou self-hosted)
- API Key [MillionVerifier](https://millionverifier.com)
- API Key [Anthropic](https://console.anthropic.com) (Claude)

### 1. Clonar o repositório

```bash
git clone https://github.com/oneclick/clickmail.git
cd clickmail
npm install
```

### 2. Configurar variáveis de ambiente

```bash
cp .env.example .env
```

Preencha as variáveis no `.env`:

```env
# Supabase
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...

# Amazon SES
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=sa-east-1

# MillionVerifier
MILLIONVERIFIER_API_KEY=...

# Claude API
ANTHROPIC_API_KEY=sk-ant-...
```

### 3. Aplicar migrations no Supabase

As migrations estão em `supabase/migrations/`. Aplique via CLI ou dashboard.

```bash
npx supabase db push
```

### 4. Configurar Amazon SES

1. Acesse o console do AWS SES
2. Adicione e verifique o domínio
3. Copie os registros DNS (SPF, DKIM) para o provedor
4. Configure DMARC manualmente
5. Solicite saída do sandbox (para enviar para qualquer email)

### 5. Importar workflows no n8n

Importe os JSONs da pasta `n8n-workflows/` no seu n8n.

### 6. Rodar o projeto

```bash
npm run dev
```

---

## 📁 Estrutura de Diretórios

```
clickmail/
├── public/                     # Assets estáticos
├── src/
│   ├── components/             # Componentes React reutilizáveis
│   │   ├── ui/                 # Componentes base (Button, Input, Card)
│   │   ├── layout/             # Header, Sidebar, Layout
│   │   ├── domains/            # Componentes de domínio
│   │   ├── lists/              # Upload e gestão de listas
│   │   ├── campaigns/          # Criação e gestão de campanhas
│   │   ├── variants/           # Editor de variações
│   │   └── dashboard/          # Widgets do dashboard
│   ├── pages/                  # Páginas da aplicação
│   │   ├── Dashboard.jsx
│   │   ├── Domains.jsx
│   │   ├── Lists.jsx
│   │   ├── Campaigns.jsx
│   │   ├── CampaignDetail.jsx
│   │   └── Settings.jsx
│   ├── hooks/                  # Custom hooks
│   ├── lib/                    # Configurações (supabase client, etc)
│   ├── services/               # Chamadas à API / Supabase
│   └── styles/                 # Estilos globais
├── supabase/
│   └── migrations/             # SQL migrations
├── n8n-workflows/              # Workflows exportados do n8n
├── docs/                       # Documentação adicional
├── .env.example                # Template de variáveis
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
└── README.md
```

---

## 📈 Fluxo de Operação

### 1. Configurar Domínio
```
Adicionar domínio → Verificar DNS (SPF/DKIM/DMARC) → Validar no SES
```

### 2. Importar Base
```
Upload CSV → Parsing automático → Verificação via MillionVerifier → Segmentação (válido/inválido/risco)
```

### 3. Criar Campanha
```
Selecionar domínio + lista → Definir remetente → IA gera 5 variações → Calcular spam score → Aprovar
```

### 4. Aquecimento e Disparo
```
Dia 1: 50 emails → Dia 2: 65 → Dia 3: 85 → ... → Dia 30: volume total
(incremento de ~30% por dia, priorizando contatos mais engajados)
```

### 5. Monitoramento
```
Dashboard em tempo real: entregas, aberturas, cliques, bounces, reclamações, reputação do domínio
```

---

## 💰 Custos Operacionais

| Serviço | Custo | Observação |
|---------|-------|------------|
| Supabase (Free) | $0/mês | Auth + DB + Storage + Edge Functions |
| Amazon SES | $0.10/1k emails | 400k emails/mês = $40 |
| MillionVerifier | ~$37/100k | Custo pontual por verificação |
| Claude API (Sonnet) | ~$1/mês | Geração de variações |
| n8n (Railway) | ~$7/mês | Self-hosted |
| **Total** | **~$48-85/mês** | Para 100k contatos |

**Comparativo:** Mailchimp cobra $800+/mês para 100k contatos.

---

## 🔮 Roadmap

- [x] Estrutura do banco de dados
- [x] Documentação do projeto
- [ ] Frontend — Dashboard principal
- [ ] Frontend — Upload e verificação de listas
- [ ] Frontend — Criação de campanhas + editor de variações
- [ ] Frontend — Configuração de domínios
- [ ] Edge Function — Integração MillionVerifier
- [ ] Edge Function — Geração de variações com Claude
- [ ] n8n — Workflow de aquecimento automático
- [ ] n8n — Workflow de disparo via SES
- [ ] n8n — Webhook SES (bounce/open/click tracking)
- [ ] Integração Google Postmaster Tools
- [ ] Multi-tenant (SaaS)
- [ ] Billing com Stripe

---

## 📝 Licença

Propriedade da **Oneclick**. Todos os direitos reservados.
