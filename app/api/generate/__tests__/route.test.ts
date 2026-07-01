/**
 * @jest-environment node
 */
import { POST } from '../route';

// Capture the mock at module level so tests can control it
const mockCreate = jest.fn();

// Mock the Anthropic SDK before any imports resolve
jest.mock('@anthropic-ai/sdk', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    messages: {
      create: mockCreate,
    },
  })),
}));

function makeRequest(body: unknown): Request {
  return new Request('http://localhost/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/generate', () => {
  beforeEach(() => {
    mockCreate.mockReset();
  });

  it('returns 400 when tab is missing', async () => {
    const req = makeRequest({ inputs: { contentType: 'Blog Post', topic: 'AI', tone: 'Professional' } });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBeDefined();
  });

  it('returns 400 when inputs is missing', async () => {
    const req = makeRequest({ tab: 'text' });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBeDefined();
  });

  it('returns 400 when both tab and inputs are missing', async () => {
    const req = makeRequest({});
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBeDefined();
  });

  it('returns 504 with timeout message when AbortController fires', async () => {
    const abortError = new Error('The operation was aborted');
    abortError.name = 'AbortError';
    mockCreate.mockRejectedValueOnce(abortError);

    const req = makeRequest({
      tab: 'text',
      inputs: { contentType: 'Blog Post', topic: 'AI', tone: 'Professional' },
    });
    const res = await POST(req);
    expect(res.status).toBe(504);
    const json = await res.json();
    expect(json.error).toBe('Request timed out after 30 seconds. Please try again.');
  });

  it('returns 200 with content on a successful Anthropic response', async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: 'Generated content here' }],
    });

    const req = makeRequest({
      tab: 'text',
      inputs: { contentType: 'Blog Post', topic: 'AI', tone: 'Professional' },
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.content).toBe('Generated content here');
  });

  it('returns 500 on a generic Anthropic error', async () => {
    mockCreate.mockRejectedValueOnce(new Error('Internal SDK error'));

    const req = makeRequest({
      tab: 'text',
      inputs: { contentType: 'Blog Post', topic: 'AI', tone: 'Professional' },
    });
    const res = await POST(req);
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe('An error occurred while generating content. Please try again.');
  });
});
