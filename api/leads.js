// In-memory cache for serverless invocation lifecycle
let memoryLeads = [];

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Admin-Key');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const ADMIN_KEY = process.env.LEADS_ADMIN_KEY || 'yofly2026';
  const SUPABASE_URL = process.env.SUPABASE_URL || 'https://ylmctmaedrcrmhjzymfi.supabase.co';
  const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlsbWN0bWFlZHJjcm1oanp5bWZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxOTY2MDEsImV4cCI6MjA4OTc3MjYwMX0.ZRiq7ikdr4AtxKUHmfg8DPO1mYQKw5MQ0Ww_n2Oh-MQ';

  // 1. POST: Register / Record a Lead
  if (req.method === 'POST') {
    try {
      let body = req.body;
      if (typeof body === 'string') {
        try { body = JSON.parse(body); } catch (e) {}
      }

      const email = (body && body.email ? body.email : '').trim().toLowerCase();
      const platform = (body && body.platform ? body.platform : 'ios_testflight');
      const airline = (body && body.airline ? body.airline : '');
      const role = (body && body.role ? body.role : '');
      const userAgent = req.headers['user-agent'] || '';
      const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';

      if (!email || !email.includes('@')) {
        return res.status(400).json({ error: 'Valid email address required.' });
      }

      const leadRecord = {
        id: 'lead_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
        email,
        platform,
        airline,
        role,
        created_at: new Date().toISOString(),
        user_agent: userAgent,
        ip: typeof ip === 'string' ? ip.split(',')[0].trim() : ''
      };

      // Add to in-memory store (deduped by email)
      const existingIdx = memoryLeads.findIndex(l => l.email === email);
      if (existingIdx >= 0) {
        memoryLeads[existingIdx] = { ...memoryLeads[existingIdx], ...leadRecord };
      } else {
        memoryLeads.unshift(leadRecord);
      }

      return res.status(200).json({
        success: true,
        message: 'Lead recorded successfully',
        lead: leadRecord,
        testflight_url: 'https://testflight.apple.com/join/NeEjDwf3'
      });
    } catch (err) {
      console.error('Error handling lead POST:', err);
      return res.status(500).json({ error: 'Internal server error processing lead' });
    }
  }

  // 2. GET: View Leads list (Protected by admin key or query param)
  if (req.method === 'GET') {
    const providedKey = req.headers['x-admin-key'] || req.query.key || req.query.admin_key;

    if (providedKey !== ADMIN_KEY) {
      return res.status(401).json({
        error: 'Unauthorized. Please provide valid admin credentials (x-admin-key or ?key=).'
      });
    }

    // Also pull registered crew accounts from Supabase profiles to give a complete view
    let supabaseProfiles = [];
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/profiles?select=id,full_name,airline,role,airline_email,created_at&order=created_at.desc&limit=100`, {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`
        }
      });
      if (response.ok) {
        supabaseProfiles = await response.json();
      }
    } catch (e) {
      console.warn('Could not pull profiles:', e);
    }

    return res.status(200).json({
      success: true,
      stats: {
        testflight_leads_count: memoryLeads.length,
        app_profiles_count: supabaseProfiles.length,
        total_tracked: memoryLeads.length + supabaseProfiles.length
      },
      testflight_leads: memoryLeads,
      app_registered_crew: supabaseProfiles
    });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
