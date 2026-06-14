import Anthropic from "@anthropic-ai/sdk";

// Anthropic's default, most capable model.
export const ANALYSIS_MODEL = "claude-opus-4-8";

export function getAnthropic(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY is not set. Add it to your environment (and Vercel) to enable analysis.",
    );
  }
  return new Anthropic({ apiKey });
}

function textOf(message: Anthropic.Message): string {
  return message.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
}

/** Stream a JSON-schema-constrained response and parse it. Streaming keeps long
 *  inputs/outputs under the SDK's HTTP timeout. */
export async function streamJson<T>(
  client: Anthropic,
  opts: {
    system: string;
    user: string;
    schema: Record<string, unknown>;
    schemaName: string;
    maxTokens: number;
  },
): Promise<T> {
  const stream = client.messages.stream({
    model: ANALYSIS_MODEL,
    max_tokens: opts.maxTokens,
    thinking: { type: "adaptive" },
    system: opts.system,
    messages: [{ role: "user", content: opts.user }],
    output_config: {
      format: { type: "json_schema", name: opts.schemaName, schema: opts.schema },
    },
  } as Anthropic.MessageStreamParams);

  const message = await stream.finalMessage();
  const raw = textOf(message).trim();
  try {
    return JSON.parse(raw) as T;
  } catch {
    // Be forgiving if anything wraps the JSON.
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]) as T;
    throw new Error("Model did not return valid JSON.");
  }
}

/** Stream a free-text response (e.g. the generated build prompt). */
export async function streamText(
  client: Anthropic,
  opts: { system: string; user: string; maxTokens: number },
): Promise<string> {
  const stream = client.messages.stream({
    model: ANALYSIS_MODEL,
    max_tokens: opts.maxTokens,
    thinking: { type: "adaptive" },
    system: opts.system,
    messages: [{ role: "user", content: opts.user }],
  });
  const message = await stream.finalMessage();
  return textOf(message).trim();
}

/** JSON schema the analysis must conform to. */
const INSIGHT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    title: { type: "string" },
    detail: { type: "string" },
    frequency: { type: "string", enum: ["low", "medium", "high"] },
    examples: { type: "array", items: { type: "string" } },
  },
  required: ["title", "detail", "frequency", "examples"],
} as const;

export const ANALYSIS_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    love: { type: "array", items: INSIGHT_SCHEMA },
    wantAdded: { type: "array", items: INSIGHT_SCHEMA },
    dontNeed: { type: "array", items: INSIGHT_SCHEMA },
  },
  required: ["love", "wantAdded", "dontNeed"],
} as Record<string, unknown>;
