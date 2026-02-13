# Configuração Amazon SES + DNS

## Passo 1: Criar conta AWS e acessar SES

1. Acesse [console.aws.amazon.com/ses](https://console.aws.amazon.com/ses)
2. Selecione a região **sa-east-1** (São Paulo)
3. Vá em **Verified Identities** → **Create Identity**
4. Selecione **Domain** e insira o domínio (ex: `previsao.io`)
5. Marque **Use a custom MAIL FROM domain** (opcional, recomendado)

## Passo 2: Configurar registros DNS

Após adicionar o domínio, o SES gera automaticamente:

### DKIM (3 registros CNAME)
```
Tipo: CNAME
Nome: abc123._domainkey.seudominio.com
Valor: abc123.dkim.amazonses.com
```
(Repita para os 3 registros gerados)

### SPF (1 registro TXT)
```
Tipo: TXT
Nome: seudominio.com
Valor: v=spf1 include:amazonses.com ~all
```

### DMARC (1 registro TXT — adicionar manualmente)
```
Tipo: TXT
Nome: _dmarc.seudominio.com
Valor: v=DMARC1; p=quarantine; pct=100; rua=mailto:dmarc-reports@seudominio.com
```

## Passo 3: Verificar propagação

1. Aguarde 24-48h para propagação do DNS
2. Verifique em [mxtoolbox.com](https://mxtoolbox.com/SuperTool.aspx):
   - SPF: `mxtoolbox.com/spf.aspx`
   - DKIM: `mxtoolbox.com/dkim.aspx`
   - DMARC: `mxtoolbox.com/dmarc.aspx`
3. No console SES, o status deve mudar para **Verified**

## Passo 4: Sair do Sandbox

Por padrão, contas novas do SES ficam em **sandbox** (só envia para emails verificados).

1. Vá em **Account Dashboard** → **Request Production Access**
2. Preencha:
   - Mail type: **Transactional + Marketing**
   - Website URL: URL do seu site
   - Use case: Descreva que envia newsletters para base opt-in
   - Expected volume: Ex: 10,000/dia
3. A aprovação leva 24-48h

## Passo 5: Criar credenciais SMTP/API

1. Vá em **SMTP Settings** → **Create SMTP Credentials**
2. Ou use **IAM** para criar Access Key com permissão `ses:SendEmail`
3. Salve as credenciais no `.env`

## Limites SES

| Tipo | Sandbox | Produção |
|------|---------|----------|
| Envios/dia | 200 | 50,000+ (escalável) |
| Envios/segundo | 1 | 14 (escalável) |
| Destinatários | Só verificados | Qualquer um |
| Custo | $0.10/1,000 emails | $0.10/1,000 emails |

## Configurar SNS para tracking

Para receber eventos de bounce, delivery, open e click:

1. Vá em **Configuration Sets** → **Create Configuration Set**
2. Nome: `clickmail-tracking`
3. Adicione **Event Destination**:
   - Tipo: **SNS**
   - Eventos: Bounce, Complaint, Delivery, Open, Click
4. Crie um tópico SNS e configure o webhook do n8n como subscription
