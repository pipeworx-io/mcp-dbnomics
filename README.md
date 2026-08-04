# @pipeworx/dbnomics

DBnomics MCP — meta-aggregator over 80+ statistics providers (Eurostat, BLS, ECB, FRED, IMF, OECD, World Bank, plus most national stats agencies). No auth.

Part of [Pipeworx](https://pipeworx.io) — an MCP gateway connecting AI agents to 1394+ live data sources.

## Tools

- `search(query, limit?, offset?)` — full-text search across all providers
- `list_providers()` — what data sources are available
- `list_datasets(provider, limit?, offset?)` — datasets per provider
- `get_series(provider, dataset, series_code, observations?)` — time series data
- `find_series(provider?, dataset?, dimensions?, limit?, offset?)` — structured filter

## Data source

`https://api.db.nomics.world/v22/` — public, JSON.

Provider codes are uppercase (ECB, BLS, EUROSTAT, IMF, OECD, WB, FRED, etc.). Dataset codes vary by provider.

## Quick Start

Add to your MCP client (Claude Desktop, Cursor, Windsurf, etc.):

```json
{
  "mcpServers": {
    "dbnomics": {
      "url": "https://gateway.pipeworx.io/dbnomics/mcp"
    }
  }
}
```

Or connect to the full Pipeworx gateway for access to all 1394+ data sources:

```json
{
  "mcpServers": {
    "pipeworx": {
      "url": "https://gateway.pipeworx.io/mcp"
    }
  }
}
```

## Using with ask_pipeworx

Instead of calling tools directly, you can ask questions in plain English:

```
ask_pipeworx({ question: "your question about Dbnomics data" })
```

The gateway picks the right tool and fills the arguments automatically.

## More

- [Docs and guides](https://pipeworx.io/docs)
- [pipeworx.io](https://pipeworx.io)

## License

MIT
