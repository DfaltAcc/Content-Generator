import type { TextInputs, ImageInputs, EmailInputs, GenerateRequest } from '../types/index';

export function buildTextPrompt(inputs: TextInputs): string {
  return `You are an expert copywriter. Write a ${inputs.contentType} about the following topic.

Topic: ${inputs.topic}
Tone: ${inputs.tone}

Requirements:
- Match the tone exactly: ${inputs.tone}
- Format appropriately for a ${inputs.contentType}
- Be engaging, clear, and ready to publish
- Do not include any preamble or meta-commentary — output only the content itself`;
}

export function buildImagePrompt(inputs: ImageInputs): string {
  return `You are an expert prompt engineer for AI image generation tools such as Midjourney, DALL-E, and Stable Diffusion.

The user wants to depict: ${inputs.depiction}

Generate a single, detailed, ready-to-use image generation prompt. Include:
- Subject and composition
- Lighting and atmosphere
- Art style or medium
- Camera angle or perspective (if relevant)
- Quality modifiers (e.g. "highly detailed", "8k", "photorealistic")

Output only the prompt text itself — no explanation, no preamble.`;
}

export function buildEmailPrompt(inputs: EmailInputs): string {
  const keyPointsSection = inputs.keyPoints.trim()
    ? `\nKey points to include:\n${inputs.keyPoints}`
    : '';

  return `You are an expert business writer. Write a complete, professional email.

Recipient: ${inputs.recipient}
Purpose: ${inputs.purpose}${keyPointsSection}

Requirements:
- Begin with a subject line in the format "Subject: ..."
- Follow with a blank line, then the email body
- Use an appropriate greeting and sign-off
- Be concise and clear
- Do not include any preamble or meta-commentary — output only the email itself`;
}

export function buildPrompt(request: GenerateRequest): string {
  switch (request.tab) {
    case 'text':  return buildTextPrompt(request.inputs);
    case 'image': return buildImagePrompt(request.inputs);
    case 'email': return buildEmailPrompt(request.inputs);
  }
}
