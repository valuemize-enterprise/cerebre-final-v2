const { query } = require('../db/db');
const logger = require('../utils/logger');

// ════════════════════════════════════════════════════════════════
// CRM Integration Service
// Supports: Salesforce, HubSpot, Zoho CRM, Pipedrive
// ════════════════════════════════════════════════════════════════

// ── Salesforce OAuth URLs ─────────────────────────────────────
const getSalesforceAuthUrl = (clientId, redirectUri, state) => {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    state,
    scope: 'full refresh_token',
  });
  return `https://login.salesforce.com/services/oauth2/authorize?${params}`;
};

// ── HubSpot OAuth URL ─────────────────────────────────────────
const getHubspotAuthUrl = (clientId, redirectUri, state) => {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: 'contacts crm.objects.deals.read analytics.behavioral_events.read',
    state,
  });
  return `https://app.hubspot.com/oauth/authorize?${params}`;
};

// ── Fetch Salesforce metrics ──────────────────────────────────
const fetchSalesforceMetrics = async (connection, periodStart, periodEnd) => {
  const { access_token, instance_url } = connection;

  const headers = {
    Authorization: `Bearer ${access_token}`,
    'Content-Type': 'application/json',
  };

  try {
    // Opportunities (pipeline)
    const oppsRes = await fetch(
      `${instance_url}/services/data/v58.0/query?q=` +
      encodeURIComponent(
        `SELECT COUNT(Id) total, SUM(Amount) pipeline, SUM(CASE WHEN IsClosed=true AND IsWon=true THEN Amount ELSE 0 END) won_amount, ` +
        `COUNT(CASE WHEN IsClosed=true AND IsWon=true THEN 1 END) won_count, ` +
        `COUNT(CASE WHEN IsClosed=true AND IsWon=false THEN 1 END) lost_count ` +
        `FROM Opportunity WHERE CreatedDate >= ${periodStart}T00:00:00Z AND CreatedDate <= ${periodEnd}T23:59:59Z`
      ),
      { headers }
    );

    // Leads
    const leadsRes = await fetch(
      `${instance_url}/services/data/v58.0/query?q=` +
      encodeURIComponent(
        `SELECT COUNT(Id) total, COUNT(CASE WHEN IsConverted=true THEN 1 END) converted ` +
        `FROM Lead WHERE CreatedDate >= ${periodStart}T00:00:00Z AND CreatedDate <= ${periodEnd}T23:59:59Z`
      ),
      { headers }
    );

    // Contacts (customers)
    const contactsRes = await fetch(
      `${instance_url}/services/data/v58.0/query?q=` +
      encodeURIComponent(
        `SELECT COUNT(Id) total FROM Contact ` +
        `WHERE CreatedDate >= ${periodStart}T00:00:00Z AND CreatedDate <= ${periodEnd}T23:59:59Z`
      ),
      { headers }
    );

    const [opps, leads, contacts] = await Promise.all([
      oppsRes.json(), leadsRes.json(), contactsRes.json()
    ]);

    const oppsData = opps.records?.[0] || {};
    const leadsData = leads.records?.[0] || {};

    const wonAmount = parseFloat(oppsData.won_amount || 0);
    const wonCount = parseInt(oppsData.won_count || 0);
    const lostCount = parseInt(oppsData.lost_count || 0);
    const totalLeads = parseInt(leadsData.total || 0);
    const convertedLeads = parseInt(leadsData.converted || 0);

    return {
      platform: 'salesforce',
      period_start: periodStart,
      period_end: periodEnd,
      total_pipeline_value: parseFloat(oppsData.pipeline || 0),
      new_opportunities: parseInt(oppsData.total || 0),
      closed_won: wonCount,
      closed_lost: lostCount,
      win_rate: (wonCount + lostCount) > 0 ? wonCount / (wonCount + lostCount) : 0,
      total_leads: totalLeads,
      leads_converted: convertedLeads,
      lead_conversion_rate: totalLeads > 0 ? convertedLeads / totalLeads : 0,
      revenue: wonAmount,
      avg_deal_size: wonCount > 0 ? wonAmount / wonCount : 0,
      new_customers: contacts.records?.[0]?.total || 0,
    };
  } catch (err) {
    logger.error('[CRM/Salesforce] Fetch failed', { error: err.message });
    throw err;
  }
};

// ── Fetch HubSpot metrics ─────────────────────────────────────
const fetchHubspotMetrics = async (connection, periodStart, periodEnd) => {
  const { access_token } = connection;
  const headers = { Authorization: `Bearer ${access_token}`, 'Content-Type': 'application/json' };

  const startMs = new Date(periodStart).getTime();
  const endMs   = new Date(periodEnd).getTime();

  try {
    // Deals (pipeline)
    const dealsRes = await fetch(
      'https://api.hubapi.com/crm/v3/objects/deals/search',
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          filterGroups: [{
            filters: [
              { propertyName: 'createdate', operator: 'GTE', value: String(startMs) },
              { propertyName: 'createdate', operator: 'LTE', value: String(endMs) },
            ]
          }],
          properties: ['amount', 'dealstage', 'closedate', 'hs_deal_stage_probability'],
          limit: 200,
        }),
      }
    );

    // Contacts (leads)
    const contactsRes = await fetch(
      'https://api.hubapi.com/crm/v3/objects/contacts/search',
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          filterGroups: [{
            filters: [
              { propertyName: 'createdate', operator: 'GTE', value: String(startMs) },
              { propertyName: 'createdate', operator: 'LTE', value: String(endMs) },
            ]
          }],
          properties: ['lifecyclestage', 'hs_lead_status'],
          limit: 200,
        }),
      }
    );

    const [deals, contacts] = await Promise.all([dealsRes.json(), contactsRes.json()]);
    const dealsList = deals.results || [];
    const contactsList = contacts.results || [];

    const closedWon = dealsList.filter(d => d.properties?.dealstage === 'closedwon');
    const wonRevenue = closedWon.reduce((s, d) => s + parseFloat(d.properties?.amount || 0), 0);

    return {
      platform: 'hubspot',
      period_start: periodStart,
      period_end: periodEnd,
      total_pipeline_value: dealsList.reduce((s, d) => s + parseFloat(d.properties?.amount || 0), 0),
      new_opportunities: dealsList.length,
      closed_won: closedWon.length,
      closed_lost: dealsList.filter(d => d.properties?.dealstage === 'closedlost').length,
      win_rate: dealsList.length > 0 ? closedWon.length / dealsList.length : 0,
      total_leads: contactsList.length,
      revenue: wonRevenue,
      avg_deal_size: closedWon.length > 0 ? wonRevenue / closedWon.length : 0,
      new_customers: contactsList.filter(c => c.properties?.lifecyclestage === 'customer').length,
    };
  } catch (err) {
    logger.error('[CRM/HubSpot] Fetch failed', { error: err.message });
    throw err;
  }
};

// ── Route to correct CRM fetcher ──────────────────────────────
const fetchCRMMetrics = async (companyId, periodStart, periodEnd) => {
  const result = await query(
    'SELECT * FROM crm_connections WHERE company_id = $1 AND status = $2 AND sync_enabled = true',
    [companyId, 'connected']
  );

  if (result.rows.length === 0) return null;

  const connection = result.rows[0];
  let metrics;

  switch (connection.platform) {
    case 'salesforce':
      metrics = await fetchSalesforceMetrics(connection, periodStart, periodEnd);
      break;
    case 'hubspot':
      metrics = await fetchHubspotMetrics(connection, periodStart, periodEnd);
      break;
    default:
      logger.warn('[CRM] Unsupported platform', { platform: connection.platform });
      return null;
  }

  if (!metrics) return null;

  // Store in DB
  await query(
    `INSERT INTO crm_metrics
     (company_id, crm_connection_id, period_start, period_end,
      total_pipeline_value, new_opportunities, closed_won, closed_lost,
      win_rate, total_customers, new_customers, revenue, avg_deal_size, raw_data)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
     ON CONFLICT DO NOTHING`,
    [
      companyId, connection.id, periodStart, periodEnd,
      metrics.total_pipeline_value, metrics.new_opportunities,
      metrics.closed_won, metrics.closed_lost, metrics.win_rate,
      metrics.new_customers || 0, metrics.new_customers || 0,
      metrics.revenue, metrics.avg_deal_size,
      JSON.stringify(metrics),
    ]
  );

  return metrics;
};

// ── Get CRM connection status ─────────────────────────────────
const getCRMStatus = async (companyId) => {
  const result = await query(
    'SELECT id, platform, status, last_sync_at, sync_enabled FROM crm_connections WHERE company_id = $1',
    [companyId]
  );
  return result.rows;
};

module.exports = {
  fetchCRMMetrics,
  getCRMStatus,
  getSalesforceAuthUrl,
  getHubspotAuthUrl,
  fetchSalesforceMetrics,
  fetchHubspotMetrics,
};
