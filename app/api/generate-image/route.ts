/**
 * app/api/generate-image/route.ts
 *
 * Generates an image using the Pollinations AI API (Flux model).
 * The API key is kept server-side and never exposed in the browser.
 * Returns a base64-encoded PNG data URL.
 */

export async function POST(request: Request): Promise<Response> {
  const apiKey = process.env.POLLINATIONS_API_KEY;
  if (!apiKey) {
    console.error('[/api/generate-image] POLLINATIONS_API_KEY is not set');
    return Response.json({ error: 'Server configuration error.' }, { status: 500 });
  }

  let prompt: string;
  try {
    const body = (await request.json()) as { prompt?: unknown };
    if (!body.prompt || typeof body.prompt !== 'string') {
      return Response.json({ error: 'Missing prompt' }, { status: 400 });
    }
    prompt = body.prompt;
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60_000);

  try {
    // Encode the prompt for use in a URL
    const encodedPrompt = encodeURIComponent(prompt);
    const url = `https://image.pollinations.ai/prompt/${encodedPrompt}?key=${apiKey}&model=flux&nologo=true`;

    const res = await fetch(url, { signal: controller.signal });

    if (!res.ok) {
      console.error('[/api/generate-image] Pollinations error:', res.status);
      return Response.json(
        { error: 'Image generation failed. Please try again.' },
        { status: 500 }
      );
    }

    // Convert the image bytes to a base64 data URL so the browser can display it
    const contentType = res.headers.get('content-type') ?? 'image/jpeg';
    const imageBuffer = await res.arrayBuffer();
    const base64 = Buffer.from(imageBuffer).toString('base64');
    const dataUrl = `data:${contentType};base64,${base64}`;

    return Response.json({ imageUrl: dataUrl }, { status: 200 });
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      return Response.json(
        { error: 'Request timed out. Please try again.' },
        { status: 504 }
      );
    }
    console.error('[/api/generate-image] Error:', err);
    return Response.json(
      { error: 'Image generation failed. Please try again.' },
      { status: 500 }
    );
  } finally {
    clearTimeout(timeoutId);
  }
}
