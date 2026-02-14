import { supabase } from '@/lib/supabase'

// =============================================
// N8N — Routed through trigger-n8n Edge Function (avoids CORS)
// =============================================
export const n8nService = {
  async triggerVerifyList(listId) {
    const { data, error } = await supabase.functions.invoke('trigger-n8n', {
      body: { workflow: 'verify-email-list', data: { list_id: listId } },
    })
    if (error) throw error
    if (data && !data.success) throw new Error(data.data?.message || data.data?.error || `Erro n8n: ${data.status}`)
    return data
  },

  async triggerGenerateVariants(campaignId) {
    const { data, error } = await supabase.functions.invoke('trigger-n8n', {
      body: { workflow: 'generate-variants', data: { campaign_id: campaignId } },
    })
    if (error) throw error
    if (data && !data.success) throw new Error(data.data?.message || data.data?.error || `Erro n8n: ${data.status}`)
    return data
  },
}

// =============================================
// EDGE FUNCTIONS
// =============================================
export const edgeFunctionService = {
  async verifyDns(domain, domainId) {
    const { data, error } = await supabase.functions.invoke('verify-dns', {
      body: { domain, domain_id: domainId },
    })
    if (error) throw error
    return data
  },

  async calculateReputation(domainId = null) {
    const { data, error } = await supabase.functions.invoke('calculate-reputation', {
      body: domainId ? { domain_id: domainId } : {},
    })
    if (error) throw error
    return data
  },

  async triggerN8n(workflow, payload) {
    const { data, error } = await supabase.functions.invoke('trigger-n8n', {
      body: { workflow, data: payload },
    })
    if (error) throw error
    return data
  },

  async manageSesIdentity(action, domain, domainId) {
    const { data, error } = await supabase.functions.invoke('manage-ses-identity', {
      body: { action, domain, domain_id: domainId },
    })
    if (error) throw error
    return data
  },
}

// =============================================
// DOMAINS
// =============================================
export const domainService = {
  async list() {
    const { data, error } = await supabase
      .from('email_domains')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) throw error
    return data
  },

  async create(domain) {
    const { data, error } = await supabase
      .from('email_domains')
      .insert({ domain })
      .select()
      .single()
    if (error) throw error
    return data
  },

  async getById(id) {
    const { data, error } = await supabase
      .from('email_domains')
      .select('*')
      .eq('id', id)
      .single()
    if (error) throw error
    return data
  },

  async update(id, updates) {
    const { data, error } = await supabase
      .from('email_domains')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },
}

// =============================================
// LISTS
// =============================================
export const listService = {
  async list() {
    const { data, error } = await supabase
      .from('email_lists')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) throw error
    return data
  },

  async create(listData) {
    const { data, error } = await supabase
      .from('email_lists')
      .insert(listData)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async uploadCSV(file, listId) {
    const { data: { user } } = await supabase.auth.getUser()
    const filePath = `${user.id}/lists/${listId}/${file.name}`
    const { error } = await supabase.storage
      .from('csv-uploads')
      .upload(filePath, file)
    if (error) throw error
    return filePath
  },

  async getContacts(listId, { page = 0, limit = 50, status } = {}) {
    let query = supabase
      .from('email_contacts')
      .select('*', { count: 'exact' })
      .eq('list_id', listId)
      .range(page * limit, (page + 1) * limit - 1)
      .order('created_at', { ascending: false })

    if (status) query = query.eq('verification_status', status)

    const { data, error, count } = await query
    if (error) throw error
    return { data, count }
  },
}

// =============================================
// CONTACTS
// =============================================
export const contactService = {
  async bulkInsert(contacts) {
    const { data, error } = await supabase
      .from('email_contacts')
      .insert(contacts)
      .select()
    if (error) throw error
    return data
  },
}

// =============================================
// CAMPAIGNS
// =============================================
export const campaignService = {
  async list() {
    const { data, error } = await supabase
      .from('email_campaigns')
      .select(`
        *,
        email_domains(domain, health_status),
        email_lists(name, total_contacts, valid_contacts)
      `)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data
  },

  async create(campaignData) {
    const { data, error } = await supabase
      .from('email_campaigns')
      .insert(campaignData)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async getById(id) {
    const { data, error } = await supabase
      .from('email_campaigns')
      .select(`
        *,
        email_domains(domain, health_status, reputation_score),
        email_lists(name, total_contacts, valid_contacts),
        email_variants(*),
        warmup_schedule(*)
      `)
      .eq('id', id)
      .single()
    if (error) throw error
    return data
  },

  async update(id, updates) {
    const { data, error } = await supabase
      .from('email_campaigns')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },
}

// =============================================
// VARIANTS
// =============================================
export const variantService = {
  async listByCampaign(campaignId) {
    const { data, error } = await supabase
      .from('email_variants')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('variant_label')
    if (error) throw error
    return data
  },

  async bulkCreate(variants) {
    const { data, error } = await supabase
      .from('email_variants')
      .insert(variants)
      .select()
    if (error) throw error
    return data
  },
}

// =============================================
// SENDS
// =============================================
export const sendService = {
  async listByCampaign(campaignId, { page = 0, limit = 50, status } = {}) {
    let query = supabase
      .from('email_sends')
      .select(`
        *,
        email_contacts(email, name),
        email_variants(variant_label, subject)
      `, { count: 'exact' })
      .eq('campaign_id', campaignId)
      .range(page * limit, (page + 1) * limit - 1)
      .order('created_at', { ascending: false })

    if (status) query = query.eq('status', status)

    const { data, error, count } = await query
    if (error) throw error
    return { data, count }
  },
}

// =============================================
// WARMUP
// =============================================
export const warmupService = {
  async getSchedule(campaignId) {
    const { data, error } = await supabase
      .from('warmup_schedule')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('day_number')
    if (error) throw error
    return data
  },

  async generateSchedule(campaignId, { startVolume, incrementPercent, maxDaily, totalRecipients }) {
    const schedule = []
    let volume = startVolume
    let day = 1
    let totalPlanned = 0
    const startDate = new Date()

    while (totalPlanned < totalRecipients) {
      const plannedVolume = Math.min(Math.round(volume), maxDaily, totalRecipients - totalPlanned)
      const scheduledDate = new Date(startDate)
      scheduledDate.setDate(scheduledDate.getDate() + day - 1)

      schedule.push({
        campaign_id: campaignId,
        day_number: day,
        planned_volume: plannedVolume,
        scheduled_date: scheduledDate.toISOString().split('T')[0],
      })

      totalPlanned += plannedVolume
      volume *= (1 + incrementPercent / 100)
      day++
    }

    const { data, error } = await supabase
      .from('warmup_schedule')
      .insert(schedule)
      .select()
    if (error) throw error
    return data
  },
}
