import { OpenAI } from 'openai';

// This binds our environment variable to the worker
export interface Env {
	OPENAI_API_KEY: string;
}

// CORS headers are mandatory. Without these, Chrome will block the extension from talking to your proxy.
const corsHeaders = {
	'Access-Control-Allow-Origin': '*', // Note: In production, change '*' to 'chrome-extension://<your-extension-id>'
	'Access-Control-Allow-Methods': 'POST, OPTIONS',
	'Access-Control-Allow-Headers': 'Content-Type',
};

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		// 1. Handle CORS Preflight request from the browser
		if (request.method === 'OPTIONS') {
			return new Response(null, { headers: corsHeaders });
		}

		// 2. Reject anything that isn't a POST request
		if (request.method !== 'POST') {
			return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
		}

		try {
			// 3. Parse the highlighted text sent from the extension
			const { text } = await request.json() as { text: string };

			if (!text) {
				return new Response('Missing text payload', { status: 400, headers: corsHeaders });
			}

			// 4. Initialize OpenAI with the secure server-side key
			const openai = new OpenAI({
				apiKey: env.OPENAI_API_KEY,
			});

			// 5. Ask for the summary
			const completion = await openai.chat.completions.create({
				model: 'gpt-4o-mini', // Faster and cheaper for simple summarization
				messages: [
					{
						role: 'system',
						content: 'You are an AI assistant built into a web highlighter. Summarize the user\'s text concisely in 2-3 sentences maximum. Get straight to the point.'
					},
					{ role: 'user', content: text }
				],
			});

			const summary = completion.choices[0]?.message?.content || 'Could not generate summary.';

			// 6. Send it back to the extension!
			return new Response(JSON.stringify({ summary }), {
				headers: { ...corsHeaders, 'Content-Type': 'application/json' },
			});

		} catch (error: any) {
			return new Response(JSON.stringify({ error: error.message }), {
				status: 500,
				headers: { ...corsHeaders, 'Content-Type': 'application/json' },
			});
		}
	},
};