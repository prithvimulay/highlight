import { OpenAI } from 'openai';

export interface Env {
	OPENAI_API_KEY: string;
}

const corsHeaders = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': 'POST, OPTIONS',
	'Access-Control-Allow-Headers': 'Content-Type',
};

// A helper function to generate realistic mock summaries based on text length
const generateMockSummary = (text: string) => {
	const words = text.split(' ').slice(0, 15).join(' ');
	return `[Demo Mode] This text primarily discusses concepts related to: "${words}..." It highlights the key historical and cultural shifts during this specific period.`;
};

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		if (request.method === 'OPTIONS') {
			return new Response(null, { headers: corsHeaders });
		}

		if (request.method !== 'POST') {
			return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
		}

		try {
			const { text } = await request.json() as { text: string };

			if (!text) {
				return new Response(JSON.stringify({ error: 'Missing text payload' }), {
					status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
				});
			}

			const openai = new OpenAI({
				apiKey: env.OPENAI_API_KEY,
			});

			try {
				// Attempt the real OpenAI call
				const completion = await openai.chat.completions.create({
					model: 'gpt-4o-mini',
					messages: [
						{ role: 'system', content: 'Summarize the user text concisely in 2 sentences.' },
						{ role: 'user', content: text }
					],
				});

				const summary = completion.choices[0]?.message?.content || 'Could not generate summary.';

				return new Response(JSON.stringify({ summary }), {
					headers: { ...corsHeaders, 'Content-Type': 'application/json' },
				});

			} catch (openAiError: any) {
				// If we hit a 429 Billing Error, gracefully degrade to a mock response for portfolio demos
				if (openAiError.status === 429) {
					console.warn("OpenAI Quota Exceeded. Falling back to Demo Mode.");

					// Simulate network latency so the frontend loading spinner still shows
					await new Promise(resolve => setTimeout(resolve, 1200));

					return new Response(JSON.stringify({
						summary: generateMockSummary(text)
					}), {
						headers: { ...corsHeaders, 'Content-Type': 'application/json' },
					});
				}

				// If it's a different error, throw it so the frontend can catch it
				throw openAiError;
			}

		} catch (error: any) {
			return new Response(JSON.stringify({ error: error.message || "Internal Server Error" }), {
				status: 500,
				headers: { ...corsHeaders, 'Content-Type': 'application/json' },
			});
		}
	},
};