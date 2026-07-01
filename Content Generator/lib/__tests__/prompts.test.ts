import {
  buildTextPrompt,
  buildImagePrompt,
  buildEmailPrompt,
  buildPrompt,
} from '../prompts';

describe('buildTextPrompt', () => {
  const inputs = {
    contentType: 'Blog Post' as const,
    topic: 'the future of renewable energy',
    tone: 'Professional' as const,
  };

  it('includes contentType in the output', () => {
    expect(buildTextPrompt(inputs)).toContain(inputs.contentType);
  });

  it('includes topic in the output', () => {
    expect(buildTextPrompt(inputs)).toContain(inputs.topic);
  });

  it('includes tone in the output', () => {
    expect(buildTextPrompt(inputs)).toContain(inputs.tone);
  });
});

describe('buildImagePrompt', () => {
  const inputs = {
    depiction: 'a lone astronaut standing on Mars at sunset',
  };

  it('includes depiction in the output', () => {
    expect(buildImagePrompt(inputs)).toContain(inputs.depiction);
  });
});

describe('buildEmailPrompt', () => {
  const inputs = {
    recipient: 'Jane Smith, Head of Marketing',
    purpose: 'request a budget increase for Q3 campaigns',
    keyPoints: 'ROI data, competitor benchmarks, proposed timeline',
  };

  it('includes recipient in the output', () => {
    expect(buildEmailPrompt(inputs)).toContain(inputs.recipient);
  });

  it('includes purpose in the output', () => {
    expect(buildEmailPrompt(inputs)).toContain(inputs.purpose);
  });

  it('includes keyPoints in the output', () => {
    expect(buildEmailPrompt(inputs)).toContain(inputs.keyPoints);
  });
});

describe('buildPrompt routing', () => {
  it('routes tab: "text" to buildTextPrompt', () => {
    const request = {
      tab: 'text' as const,
      inputs: {
        contentType: 'Tweet Thread' as const,
        topic: 'productivity hacks for developers',
        tone: 'Casual' as const,
      },
    };
    const result = buildPrompt(request);
    expect(result).toContain(request.inputs.contentType);
    expect(result).toContain(request.inputs.topic);
    expect(result).toContain(request.inputs.tone);
  });

  it('routes tab: "image" to buildImagePrompt', () => {
    const request = {
      tab: 'image' as const,
      inputs: {
        depiction: 'a cyberpunk cityscape at night with neon reflections',
      },
    };
    const result = buildPrompt(request);
    expect(result).toContain(request.inputs.depiction);
  });

  it('routes tab: "email" to buildEmailPrompt', () => {
    const request = {
      tab: 'email' as const,
      inputs: {
        recipient: 'Alex Johnson, CTO',
        purpose: 'schedule a technical review meeting',
        keyPoints: 'architecture concerns, timeline, team availability',
      },
    };
    const result = buildPrompt(request);
    expect(result).toContain(request.inputs.recipient);
    expect(result).toContain(request.inputs.purpose);
    expect(result).toContain(request.inputs.keyPoints);
  });
});
