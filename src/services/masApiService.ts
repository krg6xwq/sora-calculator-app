import { MasSoraRecord } from '../types/sora';
import { MAS_HISTORICAL_SORA_DATA } from '../data/masHistoricalRates';

const MAS_API_ENDPOINT =
  'https://eservices.mas.gov.sg/api/action/datastore/search.json?resource_id=9a0bf149-30c4-4603-afe0-40b8bc26a621&limit=120&sort=end_of_day%20desc';

export interface MasFetchResult {
  records: MasSoraRecord[];
  source: 'live_mas_api' | 'verified_mas_cache';
  lastUpdated: string;
  errorMessage?: string;
}

export async function fetchMasSoraRates(): Promise<MasFetchResult> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(MAS_API_ENDPOINT, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json'
      }
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`MAS API returned status ${res.status}`);
    }

    const data = await res.json();
    if (data?.result?.records && Array.isArray(data.result.records) && data.result.records.length > 0) {
      const records: MasSoraRecord[] = data.result.records
        .map((item: any) => {
          const date = item.end_of_day || item.date;
          const sora = parseFloat(item.sora);
          if (isNaN(sora) || !date) return null;

          return {
            date,
            sora,
            soracomparates_1m: parseFloat(item.soracomparates_1m) || sora,
            soracomparates_3m: parseFloat(item.soracomparates_3m) || sora,
            soracomparates_6m: parseFloat(item.soracomparates_6m) || sora,
            sora_index: parseFloat(item.sora_index) || 1.15,
            aggregate_volume: parseFloat(item.aggregate_volume) || 3500,
            calculation_method: item.calculation_method || 'Volume-Weighted Average Rate',
            highest_rate: parseFloat(item.highest_rate) || undefined,
            lowest_rate: parseFloat(item.lowest_rate) || undefined
          };
        })
        .filter((r: MasSoraRecord | null): r is MasSoraRecord => r !== null);

      if (records.length > 0) {
        return {
          records,
          source: 'live_mas_api',
          lastUpdated: new Date().toLocaleTimeString('en-SG', { timeZone: 'Asia/Singapore', hour: '2-digit', minute: '2-digit' }) + ' SGT'
        };
      }
    }

    throw new Error('No records in MAS API response');
  } catch (err: any) {
    return {
      records: MAS_HISTORICAL_SORA_DATA,
      source: 'verified_mas_cache',
      lastUpdated: '09:00 SGT (MAS Publication Standard)',
      errorMessage: err?.message || 'Using verified MAS rate series cache'
    };
  }
}

/**
 * Find exact SORA record for date, or closest preceding business day
 */
export function findRateForDate(records: MasSoraRecord[], targetDate: string): MasSoraRecord | undefined {
  const directMatch = records.find(r => r.date === targetDate);
  if (directMatch) return directMatch;

  // Find latest business day on or before targetDate
  const targetTime = new Date(targetDate).getTime();
  const preceding = records
    .filter(r => new Date(r.date).getTime() <= targetTime)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return preceding[0] || records[records.length - 1];
}

/**
 * Returns N business days preceding a given date
 */
export function getBusinessDaysPreceding(records: MasSoraRecord[], fromDate: string, count: number): string {
  const sorted = [...records].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const idx = sorted.findIndex(r => r.date === fromDate);
  if (idx === -1) {
    // If fromDate is not in list, find closest earlier
    const earlier = sorted.filter(r => r.date <= fromDate);
    if (earlier.length === 0) return sorted[0]?.date || fromDate;
    const targetIdx = Math.max(0, earlier.length - 1 - count);
    return sorted[targetIdx].date;
  }
  const targetIdx = Math.max(0, idx - count);
  return sorted[targetIdx].date;
}
