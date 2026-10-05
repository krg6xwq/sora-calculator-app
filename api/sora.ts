const MAS_ENDPOINT =
  'https://eservices.mas.gov.sg/apimg-gw/server/monthly_statistical_bulletin_non610mssql/domestic_interest_rates_daily/views/domestic_interest_rates_daily';

export interface MasApiResponseRecord {
  end_of_day?: string;
  date?: string;
  sora?: string | number;
  soracomparates_1m?: string | number;
  soracomparates_3m?: string | number;
  soracomparates_6m?: string | number;
  sora_index?: string | number;
  aggregate_volume?: string | number;
  calculation_method?: string;
  highest_rate?: string | number;
  lowest_rate?: string | number;
  [key: string]: any;
}

/**
 * Serverless handler for pulling MAS daily SORA and compounded 1M/3M/6M rates
 * Uses MAS APIMG Gateway with <MAS_KEY_ID> header
 */
export default async function handler(req: any, res?: any) {
  // CORS Preflight
  if (req?.method === 'OPTIONS') {
    if (res && typeof res.status === 'function') {
      return res
        .status(204)
        .setHeader('Access-Control-Allow-Origin', '*')
        .setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
        .setHeader('Access-Control-Allow-Headers', 'Content-Type, MAS_KEY_ID, MAS-Key-Id')
        .end();
    }
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, MAS_KEY_ID, MAS-Key-Id'
      }
    });
  }

  // Retrieve API Key from environment or request headers (do not hardcode)
  const envKey = process.env.MAS_KEY_ID || process.env.MAS_API_KEY;
  const headerKey =
    req?.headers?.['mas_key_id'] ||
    req?.headers?.['mas-key-id'] ||
    req?.headers?.get?.('mas_key_id') ||
    req?.headers?.get?.('mas-key-id');

  const masKeyId = (envKey || headerKey || '').trim();

  // Parse any query parameters from request
  let queryString = '';
  if (req?.query && typeof req.query === 'object') {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(req.query)) {
      if (typeof v === 'string') params.append(k, v);
    }
    queryString = params.toString();
  } else if (req?.url && typeof req.url === 'string') {
    const queryIdx = req.url.indexOf('?');
    if (queryIdx !== -1) {
      queryString = req.url.slice(queryIdx + 1);
    }
  }

  // If no query specified, default to sorting descending with a healthy limit
  if (!queryString) {
    queryString = 'limit=120&sort=end_of_day%20desc';
  }

  const targetUrl = `${MAS_ENDPOINT}${queryString ? `?${queryString}` : ''}`;

  // If MAS_KEY_ID is missing, return informative status
  if (!masKeyId) {
    const responsePayload = {
      status: 'warning',
      message:
        'MAS_KEY_ID environment variable is not configured. Please set MAS_KEY_ID in your environment or .env file.',
      masKeyConfigured: false,
      endpoint: MAS_ENDPOINT,
      timestamp: new Date().toISOString()
    };

    if (res && typeof res.status === 'function' && typeof res.json === 'function') {
      return res.status(200).json(responsePayload);
    }

    return new Response(JSON.stringify(responsePayload), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }

  try {
    const upstreamHeaders: Record<string, string> = {
      'Accept': 'application/json',
      'User-Agent': 'SORA-Calculator-App/1.0',
      'MAS_KEY_ID': masKeyId,
      'MAS-Key-Id': masKeyId
    };

    const upstreamResponse = await fetch(targetUrl, {
      method: 'GET',
      headers: upstreamHeaders
    });

    if (!upstreamResponse.ok) {
      const errorText = await upstreamResponse.text().catch(() => '');
      const errorPayload = {
        status: 'error',
        statusCode: upstreamResponse.status,
        statusText: upstreamResponse.statusText,
        message: `MAS APIMG Gateway returned ${upstreamResponse.status} ${upstreamResponse.statusText}`,
        details: errorText,
        timestamp: new Date().toISOString()
      };

      if (res && typeof res.status === 'function' && typeof res.json === 'function') {
        return res.status(upstreamResponse.status).json(errorPayload);
      }

      return new Response(JSON.stringify(errorPayload), {
        status: upstreamResponse.status,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    const data = await upstreamResponse.json();

    // Extract records array from various possible MAS response shapes
    let rawRecords: MasApiResponseRecord[] = [];
    if (data?.result?.records && Array.isArray(data.result.records)) {
      rawRecords = data.result.records;
    } else if (data?.data && Array.isArray(data.data)) {
      rawRecords = data.data;
    } else if (Array.isArray(data)) {
      rawRecords = data;
    } else if (data?.records && Array.isArray(data.records)) {
      rawRecords = data.records;
    }

    // Clean and normalize record format
    const formattedRecords = rawRecords.map((item) => {
      const date = item.end_of_day || item.date || '';
      const sora = typeof item.sora === 'number' ? item.sora : parseFloat(item.sora || '0');
      const soracomparates_1m =
        typeof item.soracomparates_1m === 'number'
          ? item.soracomparates_1m
          : parseFloat(item.soracomparates_1m || `${sora}`);
      const soracomparates_3m =
        typeof item.soracomparates_3m === 'number'
          ? item.soracomparates_3m
          : parseFloat(item.soracomparates_3m || `${sora}`);
      const soracomparates_6m =
        typeof item.soracomparates_6m === 'number'
          ? item.soracomparates_6m
          : parseFloat(item.soracomparates_6m || `${sora}`);
      const sora_index =
        typeof item.sora_index === 'number'
          ? item.sora_index
          : parseFloat(item.sora_index || '1.15');
      const aggregate_volume =
        typeof item.aggregate_volume === 'number'
          ? item.aggregate_volume
          : parseFloat(item.aggregate_volume || '3500');

      return {
        date,
        sora: isNaN(sora) ? 0 : sora,
        soracomparates_1m: isNaN(soracomparates_1m) ? sora : soracomparates_1m,
        soracomparates_3m: isNaN(soracomparates_3m) ? sora : soracomparates_3m,
        soracomparates_6m: isNaN(soracomparates_6m) ? sora : soracomparates_6m,
        sora_index: isNaN(sora_index) ? 1.15 : sora_index,
        aggregate_volume: isNaN(aggregate_volume) ? 3500 : aggregate_volume,
        calculation_method: item.calculation_method || 'Volume-Weighted Average Rate',
        highest_rate:
          item.highest_rate !== undefined ? parseFloat(String(item.highest_rate)) : undefined,
        lowest_rate:
          item.lowest_rate !== undefined ? parseFloat(String(item.lowest_rate)) : undefined
      };
    });

    const successPayload = {
      status: 'success',
      source: 'mas_apimg_gw',
      endpoint: MAS_ENDPOINT,
      count: formattedRecords.length,
      records: formattedRecords,
      raw: data,
      lastFetched: new Date().toISOString()
    };

    if (res && typeof res.status === 'function' && typeof res.json === 'function') {
      return res
        .status(200)
        .setHeader('Access-Control-Allow-Origin', '*')
        .json(successPayload);
    }

    return new Response(JSON.stringify(successPayload), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=1800'
      }
    });
  } catch (err: any) {
    const failurePayload = {
      status: 'error',
      message: err?.message || 'Failed to fetch from MAS APIMG Gateway',
      timestamp: new Date().toISOString()
    };

    if (res && typeof res.status === 'function' && typeof res.json === 'function') {
      return res.status(500).json(failurePayload);
    }

    return new Response(JSON.stringify(failurePayload), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}

/**
 * Web Standard GET method
 */
export async function GET(request?: any) {
  return handler(request);
}

/**
 * Web Standard OPTIONS method
 */
export async function OPTIONS(request?: any) {
  return handler(request);
}
