interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

interface McpToolExport {
  tools: McpToolDefinition[];
  callTool: (name: string, args: Record<string, unknown>) => Promise<unknown>;
  meter?: { credits: number };
  cost?: Record<string, unknown>;
  provider?: string;
}

/**
 * DBnomics MCP — meta-aggregator over 80+ stats providers
 *
 * One uniform API for ECB / BLS / Eurostat / FRED / IMF / OECD / WB and most
 * national stats agencies. Covers ~1 billion time series.
 *
 * Auth: none.
 * Docs: https://api.db.nomics.world/v22/apidocs
 */


const BASE = 'https://api.db.nomics.world/v22';

const tools: McpToolExport['tools'] = [
  {
    name: 'search',
    description:
      'Full-text search across all providers. Returns matching series with provider/dataset/series codes and human labels.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Free-text search' },
        limit: { type: 'number', description: 'Results, 1-1000 (default 20)' },
        offset: { type: 'number', description: '0-based offset' },
      },
      required: ['query'],
    },
  },
  {
    name: 'list_providers',
    description: 'List all available statistics providers in DBnomics.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'list_datasets',
    description: 'List all datasets available from a given provider.',
    inputSchema: {
      type: 'object',
      properties: {
        provider: { type: 'string', description: 'Provider code (e.g. "ECB", "BLS", "EUROSTAT")' },
        limit: { type: 'number', description: '1-1000 (default 100)' },
        offset: { type: 'number', description: '0-based offset' },
      },
      required: ['provider'],
    },
  },
  {
    name: 'get_series',
    description:
      'Fetch a specific time series. Series identified by (provider, dataset, series_code). Include observations to get the actual data points.',
    inputSchema: {
      type: 'object',
      properties: {
        provider: { type: 'string', description: 'Provider code' },
        dataset: { type: 'string', description: 'Dataset code' },
        series_code: { type: 'string', description: 'Series code (dot-separated dimensions or named code)' },
        observations: { type: 'boolean', description: 'Include data points (default true)' },
      },
      required: ['provider', 'dataset', 'series_code'],
    },
  },
  {
    name: 'find_series',
    description:
      'Browse series with structured filters. Useful when you know the provider+dataset and want to enumerate series by dimensions.',
    inputSchema: {
      type: 'object',
      properties: {
        provider: { type: 'string', description: 'Provider code' },
        dataset: { type: 'string', description: 'Dataset code' },
        dimensions: {
          type: 'object',
          description: 'Optional dimension filter map, e.g. {"FREQ":"A","COUNTRY":"DE"}',
          additionalProperties: { type: 'string' },
        },
        limit: { type: 'number', description: '1-1000 (default 100)' },
        offset: { type: 'number', description: '0-based offset' },
        observations: { type: 'boolean', description: 'Include observations (default false to save bandwidth)' },
      },
      required: ['provider', 'dataset'],
    },
  },
];

async function callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  switch (name) {
    case 'search':
      return search(args);
    case 'list_providers':
      return dbnomicsGet('/providers', new URLSearchParams());
    case 'list_datasets':
      return listDatasets(args);
    case 'get_series':
      return getSeries(args);
    case 'find_series':
      return findSeries(args);
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

async function search(args: Record<string, unknown>) {
  const params = new URLSearchParams({
    q: String(args.query),
    limit: String(Math.min(1000, Math.max(1, (args.limit as number) ?? 20))),
    offset: String(Math.max(0, (args.offset as number) ?? 0)),
  });
  return dbnomicsGet('/search', params);
}

async function listDatasets(args: Record<string, unknown>) {
  const provider = reqStr(args, 'provider', '"ECB"').toUpperCase();
  const params = new URLSearchParams({
    limit: String(Math.min(1000, Math.max(1, (args.limit as number) ?? 100))),
    offset: String(Math.max(0, (args.offset as number) ?? 0)),
  });
  return dbnomicsGet(`/providers/${encodeURIComponent(provider)}`, params);
}

async function getSeries(args: Record<string, unknown>) {
  const provider = reqStr(args, 'provider', '"ECB"').toUpperCase();
  const dataset = reqStr(args, 'dataset', '"EXR"');
  const seriesCode = reqStr(args, 'series_code', '"A.USD.EUR.SP00.A"');
  const params = new URLSearchParams({ observations: String(args.observations !== false) });
  return dbnomicsGet(`/series/${encodeURIComponent(provider)}/${encodeURIComponent(dataset)}/${encodeURIComponent(seriesCode)}`, params);
}

async function findSeries(args: Record<string, unknown>) {
  const provider = reqStr(args, 'provider', '"ECB"').toUpperCase();
  const dataset = reqStr(args, 'dataset', '"EXR"');
  const params = new URLSearchParams({
    limit: String(Math.min(1000, Math.max(1, (args.limit as number) ?? 100))),
    offset: String(Math.max(0, (args.offset as number) ?? 0)),
    observations: String(args.observations === true),
  });
  if (args.dimensions && typeof args.dimensions === 'object') {
    params.set('dimensions', JSON.stringify(args.dimensions));
  }
  return dbnomicsGet(`/series/${encodeURIComponent(provider)}/${encodeURIComponent(dataset)}`, params);
}

async function dbnomicsGet(path: string, params: URLSearchParams) {
  const url = `${BASE}${path}${params.toString() ? `?${params}` : ''}`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (res.status === 404) throw new Error(`DBnomics: not found (${path})`);
  if (res.status === 429) throw new Error('DBnomics: rate-limit (HTTP 429)');
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`DBnomics error: ${res.status} ${t.slice(0, 200)}`);
  }
  return res.json();
}

function reqStr(args: Record<string, unknown>, key: string, example: string): string {
  const v = args[key];
  if (typeof v !== 'string' || !v.trim()) {
    throw new Error(`Required argument "${key}" is missing. Pass a string like ${example}.`);
  }
  return v;
}

export default { tools, callTool, meter: { credits: 1 } } satisfies McpToolExport;
