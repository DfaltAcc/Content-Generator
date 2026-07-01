import Anthropic from '@anthropic-ai/sdk';
import { buildPrompt } from '../../../lib/prompts';
import type { GenerateRequest } from '../../../types/index';

export async function POST(request: Request): Promise<Response> {
  // 1. Parse and validate request body
  let body: GenerateRequest;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 });
  }

  if (!body.tab || !body.inputs) {
    return Response.json({ error: 'Invalid request body' }, { status: 400 });
  }

  // 2. Build the prompt string using the shared prompt builder
  const prompt = buildPrompt(body);

  // 3. Set up 30-second AbortController timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30_000);

  try {
    // 4. Call Anthropic API — API key read from process.env only (never exposed to client)
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      console.error('[/api/generate] ANTHROPIC_API_KEY is not set');
      return Response.json(
        { error: 'Server configuration error. Please contact support.' },
        { status: 500 }
      );
    }
    const anthropic = new Anthropic({ apiKey });

    const message = await anthropic.messages.create(
      {
        model: 'claude-3-haiku-20240307',
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      },
      { signal: controller.signal }
    );

    // 5. Extract text content from the response
    const contentBlock = message.content.find((block) => block.type === 'text');
    const content = contentBlock && contentBlock.type === 'text' ? contentBlock.text : '';

    return Response.json({ content }, { status: 200 });
  } catch (err) {
    // Log the actual error server-side for debugging
    console.error('[/api/generate] Error:', err);
    
    if (err instanceof Error && err.name === 'AbortError') {
      return Response.json(
        { error: 'Request timed out after 30 seconds. Please try again.' },
        { status: 504 }
      );
    }
    
    // Check for Anthropic API errors
    if (err && typeof err === 'object' && 'status' in err) {
      const apiError = err as { status?: number; message?: string };
      if (apiError.status === 401) {
        console.error('[/api/generate] Invalid API key');
        return Response.json(
          { error: 'API authentication failed. Please check your API key configuration.' },
          { status: 500 }
        );
      }
    }
    
    return Response.json(
      { error: 'An error occurred while generating content. Please try again.' },
      { status: 500 }
    );
  } finally {
    clearTimeout(timeoutId);
  }
}
