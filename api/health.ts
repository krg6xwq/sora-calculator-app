export interface HealthResponse {
  status: 'ok' | 'degraded';
  service: string;
  timestamp: string;
  uptimeSeconds: number;
  masGateway: {
    endpoint: string;
    keyConfigured: boolean;
  };
}

const startTime = Date.now();

/**
 * Serverless / Express / Vercel handler for /api/health
 */
export default async function handler(req: any, res?: any) {
  const masKeyConfigured = Boolean(process.env.MAS_KEY_ID || process.env.MAS_API_KEY);

  const payload: HealthResponse = {
    status: 'ok',
    service: 'mas-sora-serverless-api',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor((Date.now() - startTime) / 1000),
    masGateway: {
      endpoint:
        'https://eservices.mas.gov.sg/apimg-gw/server/monthly_statistical_bulletin_non610mssql/domestic_interest_rates_daily/views/domestic_interest_rates_daily',
      keyConfigured: masKeyConfigured
    }
  };

  // If running in Express or standard Node.js serverless (req, res)
  if (res && typeof res.status === 'function' && typeof res.json === 'function') {
    return res.status(200).json(payload);
  }

  // Web Standard Response (Edge / Fetch API)
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store, no-cache, must-revalidate'
    }
  });
}

/**
 * Web Standard GET method for platforms like Vercel App Router / Next.js / Cloudflare Workers
 */
export async function GET(request?: any) {
  return handler(request);
}
