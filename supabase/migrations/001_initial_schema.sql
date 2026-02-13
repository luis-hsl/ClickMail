-- =============================================
-- CLICKMAIL - Database Schema
-- Migration: 001_initial_schema
-- =============================================

-- =============================================
-- ENUMS
-- =============================================
CREATE TYPE email_verification_status AS ENUM (
  'pending',
  'valid',
  'invalid',
  'risky',
  'unknown'
);

CREATE TYPE domain_health_status AS ENUM (
  'healthy',
  'warning',
  'critical'
);

CREATE TYPE warmup_status AS ENUM (
  'not_started',
  'in_progress',
  'completed',
  'paused'
);

-- =============================================
-- 1. DOMÍNIOS DE EMAIL
-- =============================================
CREATE TABLE email_domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain TEXT NOT NULL UNIQUE,

  -- DNS verification status
  spf_configured BOOLEAN DEFAULT FALSE,
  dkim_configured BOOLEAN DEFAULT FALSE,
  dmarc_configured BOOLEAN DEFAULT FALSE,

  -- DNS records
  spf_record TEXT,
  dkim_selector TEXT,
  dmarc_policy TEXT,

  -- Health
  health_status domain_health_status DEFAULT 'critical',
  reputation_score INTEGER DEFAULT 0 CHECK (reputation_score >= 0 AND reputation_score <= 100),

  -- SES
  ses_verified BOOLEAN DEFAULT FALSE,
  ses_identity_arn TEXT,

  -- Aggregate metrics
  total_sent INTEGER DEFAULT 0,
  total_delivered INTEGER DEFAULT 0,
  total_bounced INTEGER DEFAULT 0,
  total_complaints INTEGER DEFAULT 0,
  bounce_rate NUMERIC(5,2) DEFAULT 0,
  complaint_rate NUMERIC(5,2) DEFAULT 0,

  -- Warmup
  warmup_status warmup_status DEFAULT 'not_started',
  warmup_started_at TIMESTAMPTZ,
  warmup_daily_limit INTEGER DEFAULT 50,
  warmup_current_day INTEGER DEFAULT 0,

  last_checked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- 2. LISTAS DE EMAIL
-- =============================================
CREATE TABLE email_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,

  -- Original file
  original_filename TEXT,
  file_path TEXT,

  -- Counts
  total_contacts INTEGER DEFAULT 0,
  valid_contacts INTEGER DEFAULT 0,
  invalid_contacts INTEGER DEFAULT 0,
  risky_contacts INTEGER DEFAULT 0,

  -- Verification
  verification_status TEXT DEFAULT 'pending' CHECK (
    verification_status IN ('pending', 'processing', 'completed', 'failed')
  ),
  verification_started_at TIMESTAMPTZ,
  verification_completed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- 3. CONTATOS
-- =============================================
CREATE TABLE email_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id UUID NOT NULL REFERENCES email_lists(id) ON DELETE CASCADE,

  email TEXT NOT NULL,
  name TEXT,
  company TEXT,

  -- Verification
  verification_status email_verification_status DEFAULT 'pending',
  verification_result JSONB DEFAULT '{}',
  verified_at TIMESTAMPTZ,

  -- Engagement
  total_sent INTEGER DEFAULT 0,
  total_opened INTEGER DEFAULT 0,
  total_clicked INTEGER DEFAULT 0,
  total_bounced INTEGER DEFAULT 0,
  total_complained INTEGER DEFAULT 0,

  -- Control
  is_unsubscribed BOOLEAN DEFAULT FALSE,
  unsubscribed_at TIMESTAMPTZ,
  is_blacklisted BOOLEAN DEFAULT FALSE,

  last_sent_at TIMESTAMPTZ,
  last_opened_at TIMESTAMPTZ,

  -- Extra CSV data
  extra_data JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(list_id, email)
);

-- =============================================
-- 4. CAMPANHAS
-- =============================================
CREATE TABLE email_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_id UUID REFERENCES email_domains(id),
  list_id UUID REFERENCES email_lists(id),

  name TEXT NOT NULL,
  description TEXT,

  -- Sender
  from_name TEXT NOT NULL,
  from_email TEXT NOT NULL,
  reply_to TEXT,

  -- Status
  status TEXT DEFAULT 'draft' CHECK (
    status IN ('draft', 'scheduled', 'warming_up', 'sending', 'paused', 'completed', 'failed')
  ),

  -- Warmup config
  use_warmup BOOLEAN DEFAULT TRUE,
  warmup_start_volume INTEGER DEFAULT 50,
  warmup_increment_percent INTEGER DEFAULT 30,
  warmup_max_daily INTEGER DEFAULT 5000,

  -- Schedule
  scheduled_at TIMESTAMPTZ,
  send_between_start INTEGER DEFAULT 8,
  send_between_end INTEGER DEFAULT 18,
  send_timezone TEXT DEFAULT 'America/Sao_Paulo',

  -- Metrics
  total_recipients INTEGER DEFAULT 0,
  total_sent INTEGER DEFAULT 0,
  total_delivered INTEGER DEFAULT 0,
  total_opened INTEGER DEFAULT 0,
  total_clicked INTEGER DEFAULT 0,
  total_bounced INTEGER DEFAULT 0,
  total_complained INTEGER DEFAULT 0,
  total_unsubscribed INTEGER DEFAULT 0,

  -- Rates
  open_rate NUMERIC(5,2) DEFAULT 0,
  click_rate NUMERIC(5,2) DEFAULT 0,
  bounce_rate NUMERIC(5,2) DEFAULT 0,

  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- 5. VARIAÇÕES DE EMAIL (IA)
-- =============================================
CREATE TABLE email_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES email_campaigns(id) ON DELETE CASCADE,

  variant_label TEXT NOT NULL,
  subject TEXT NOT NULL,
  preview_text TEXT,
  body_html TEXT NOT NULL,
  body_text TEXT NOT NULL,

  -- Spam analysis
  spam_score NUMERIC(4,2),
  spam_analysis JSONB DEFAULT '{}',

  -- A/B test metrics
  total_sent INTEGER DEFAULT 0,
  total_opened INTEGER DEFAULT 0,
  total_clicked INTEGER DEFAULT 0,
  open_rate NUMERIC(5,2) DEFAULT 0,
  click_rate NUMERIC(5,2) DEFAULT 0,

  -- Control
  is_winner BOOLEAN DEFAULT FALSE,
  weight INTEGER DEFAULT 20,

  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- 6. LOG DE ENVIOS
-- =============================================
CREATE TABLE email_sends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES email_campaigns(id),
  variant_id UUID NOT NULL REFERENCES email_variants(id),
  contact_id UUID NOT NULL REFERENCES email_contacts(id),

  -- SES tracking
  ses_message_id TEXT,

  -- Status
  status TEXT DEFAULT 'queued' CHECK (
    status IN ('queued', 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'complained', 'failed')
  ),

  -- Event timestamps
  queued_at TIMESTAMPTZ DEFAULT now(),
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  first_opened_at TIMESTAMPTZ,
  first_clicked_at TIMESTAMPTZ,
  bounced_at TIMESTAMPTZ,
  complained_at TIMESTAMPTZ,

  -- Error details
  error_message TEXT,
  bounce_type TEXT,

  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- 7. CRONOGRAMA DE AQUECIMENTO
-- =============================================
CREATE TABLE warmup_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES email_campaigns(id) ON DELETE CASCADE,

  day_number INTEGER NOT NULL,
  planned_volume INTEGER NOT NULL,
  actual_sent INTEGER DEFAULT 0,

  status TEXT DEFAULT 'pending' CHECK (
    status IN ('pending', 'in_progress', 'completed', 'skipped')
  ),

  scheduled_date DATE NOT NULL,
  executed_at TIMESTAMPTZ,

  -- Daily metrics
  delivered INTEGER DEFAULT 0,
  bounced INTEGER DEFAULT 0,
  opened INTEGER DEFAULT 0,
  complained INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(campaign_id, day_number)
);

-- =============================================
-- INDEXES
-- =============================================
CREATE INDEX idx_contacts_list ON email_contacts(list_id);
CREATE INDEX idx_contacts_email ON email_contacts(email);
CREATE INDEX idx_contacts_verification ON email_contacts(verification_status);
CREATE INDEX idx_sends_campaign ON email_sends(campaign_id);
CREATE INDEX idx_sends_contact ON email_sends(contact_id);
CREATE INDEX idx_sends_status ON email_sends(status);
CREATE INDEX idx_sends_ses_id ON email_sends(ses_message_id);
CREATE INDEX idx_warmup_campaign_date ON warmup_schedule(campaign_id, scheduled_date);
CREATE INDEX idx_campaigns_status ON email_campaigns(status);
CREATE INDEX idx_variants_campaign ON email_variants(campaign_id);

-- =============================================
-- RLS
-- =============================================
ALTER TABLE email_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_sends ENABLE ROW LEVEL SECURITY;
ALTER TABLE warmup_schedule ENABLE ROW LEVEL SECURITY;

-- Authenticated users
CREATE POLICY "auth_full_access" ON email_domains FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_full_access" ON email_lists FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_full_access" ON email_contacts FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_full_access" ON email_campaigns FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_full_access" ON email_variants FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_full_access" ON email_sends FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_full_access" ON warmup_schedule FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Service role (n8n)
CREATE POLICY "service_full_access" ON email_domains FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_full_access" ON email_lists FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_full_access" ON email_contacts FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_full_access" ON email_campaigns FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_full_access" ON email_variants FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_full_access" ON email_sends FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_full_access" ON warmup_schedule FOR ALL TO service_role USING (true) WITH CHECK (true);
