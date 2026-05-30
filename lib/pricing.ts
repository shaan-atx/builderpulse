// Prices in USD per 1M tokens
interface ModelPrice {
  input: number;
  output: number;
  cacheRead?: number;   // defaults to input * 0.1
  cacheWrite?: number;  // defaults to input * 1.25
}

const ANTHROPIC_PRICES: Record<string, ModelPrice> = {
  // Claude 4
  'claude-opus-4':              { input: 15,    output: 75    },
  'claude-opus-4-8':            { input: 15,    output: 75    },
  'claude-sonnet-4-6':          { input: 3,     output: 15    },
  'claude-sonnet-4-5':          { input: 3,     output: 15    },
  'claude-haiku-4-5':           { input: 0.80,  output: 4     },
  // Claude 3.5
  'claude-3-5-sonnet-20241022': { input: 3,     output: 15    },
  'claude-3-5-haiku-20241022':  { input: 0.80,  output: 4     },
  // Claude 3
  'claude-3-opus-20240229':     { input: 15,    output: 75    },
  'claude-3-sonnet-20240229':   { input: 3,     output: 15    },
  'claude-3-haiku-20240307':    { input: 0.25,  output: 1.25  },
};

const OPENAI_PRICES: Record<string, ModelPrice> = {
  'gpt-4o':                     { input: 2.50,  output: 10,   cacheRead: 1.25  },
  'gpt-4o-mini':                { input: 0.15,  output: 0.60, cacheRead: 0.075 },
  'gpt-4o-2024-11-20':          { input: 2.50,  output: 10,   cacheRead: 1.25  },
  'gpt-4-turbo':                { input: 10,    output: 30    },
  'gpt-4':                      { input: 30,    output: 60    },
  'gpt-3.5-turbo':              { input: 0.50,  output: 1.50  },
  'o1':                         { input: 15,    output: 60,   cacheRead: 7.50  },
  'o1-mini':                    { input: 3,     output: 12,   cacheRead: 1.50  },
  'o3':                         { input: 10,    output: 40,   cacheRead: 2.50  },
  'o3-mini':                    { input: 1.10,  output: 4.40, cacheRead: 0.55  },
  'o4-mini':                    { input: 1.10,  output: 4.40, cacheRead: 0.275 },
};

function matchPrice(table: Record<string, ModelPrice>, model: string): ModelPrice {
  if (table[model]) return table[model];
  // Prefix match (e.g. "claude-sonnet-4-6-20260101" → "claude-sonnet-4-6")
  for (const [key, price] of Object.entries(table)) {
    if (model.startsWith(key)) return price;
  }
  // Fallback by family
  if (model.includes('opus'))   return { input: 15,   output: 75   };
  if (model.includes('sonnet')) return { input: 3,    output: 15   };
  if (model.includes('haiku'))  return { input: 0.80, output: 4    };
  if (model.includes('o1'))     return { input: 15,   output: 60   };
  if (model.includes('o3'))     return { input: 10,   output: 40   };
  if (model.includes('o4'))     return { input: 1.10, output: 4.40 };
  if (model.includes('gpt-4'))  return { input: 2.50, output: 10   };
  return { input: 2.50, output: 10 }; // safe default
}

export function calcAnthropicCost(
  model: string,
  uncachedInput: number,
  cachedInput: number,
  cacheCreation: number,
  output: number,
): number {
  const p = matchPrice(ANTHROPIC_PRICES, model);
  const cacheReadPrice  = p.cacheRead  ?? p.input * 0.1;
  const cacheWritePrice = p.cacheWrite ?? p.input * 1.25;
  return (
    uncachedInput  * p.input          +
    cachedInput    * cacheReadPrice   +
    cacheCreation  * cacheWritePrice  +
    output         * p.output
  ) / 1_000_000;
}

export function calcOpenAICost(
  model: string,
  inputTokens: number,
  cachedInputTokens: number,
  outputTokens: number,
): number {
  const p = matchPrice(OPENAI_PRICES, model);
  const cacheReadPrice = p.cacheRead ?? p.input * 0.5;
  const uncachedInput  = inputTokens - cachedInputTokens;
  return (
    uncachedInput       * p.input         +
    cachedInputTokens   * cacheReadPrice  +
    outputTokens        * p.output
  ) / 1_000_000;
}

export function fmtCost(usd: number): string {
  if (usd === 0) return '$0';
  if (usd < 0.01) return '<$0.01';
  if (usd < 1)    return `$${usd.toFixed(2)}`;
  if (usd < 1000) return `$${usd.toFixed(2)}`;
  return `$${(usd / 1000).toFixed(1)}K`;
}
