# N8N Workflows — Clickmail

## Como importar

1. Acesse seu n8n
2. Vá em **Workflows** → **Import from File**
3. Importe cada JSON na ordem numérica
4. Configure as credenciais (ver abaixo)
5. Ative os workflows

---

## Credenciais necessárias

### 1. Postgres (Supabase)
- **Nome:** `Supabase Clickmail DB`
- **Host:** `db.zjfmojjsvnpcukoppndn.supabase.co`
- **Port:** `5432` | **Database:** `postgres` | **User:** `postgres`
- **SSL:** Ativado

### 2. Variáveis de Ambiente (n8n Settings → Variables)
```
MILLIONVERIFIER_API_KEY = sua-api-key
GEMINI_API_KEY = sua-google-api-key
```

### 3. AWS SES
Configure via AWS Credentials no n8n.

---

## Workflows

| # | Arquivo | Trigger | Função |
|---|---------|---------|--------|
| 01 | `01-verify-email-list.json` | Webhook `/verify-email-list` | Verifica emails via MillionVerifier |
| 02 | `02-generate-variants.json` | Webhook `/generate-variants` | Gera 5 variações com Gemini + spam score |
| 03 | `03-warmup-dispatcher.json` | Cron (hora em hora, seg-sex) | Aquecimento automático + disparo SES |
| 04 | `04-ses-webhook-processor.json` | Webhook `/ses-webhook` | Processa bounces, opens, clicks, complaints |
| 05 | `05-daily-reputation-check.json` | Cron (diário 6h) | Monitora DNS e reputação do domínio |

---

## Substituições necessárias

Em todos os workflows, substitua:
- `SUPABASE_POSTGRES_CREDENTIAL_ID` → ID real da credencial Postgres no n8n
- `AWS_SES_CREDENTIAL_ID` → ID real da credencial AWS no n8n
