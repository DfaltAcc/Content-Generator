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
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const message = await anthropic.messages.create(
      {
        model: 'claude-3-5-haiku-20241022',
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
    if (err instanceof Error && err.name === 'AbortError') {
      return Response.json(
        { error: 'Request timed out after 30 seconds. Please try again.' },
        { status: 504 }
      );
    }
    return Response.json(
      { error: 'An error occurred while generating content. Please try again.' },
      { status: 500 }
    );
  } finally {
    clearTimeout(timeoutId);
  }
}
