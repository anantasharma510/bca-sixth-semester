import OpenAI from 'openai';
import { stylePlanSchema, GenerateFormInput, StylePlan, StyleProfileInput } from '../types/style';

const DEFAULT_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
const DEFAULT_FALLBACK_IMAGE =
  'https://img.freepik.com/free-photo/bearded-man-with-striped-shirt_273609-7180.jpg';
const STYLE_MODEL_URL = process.env.STYLE_MODEL_URL;

let cachedClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (cachedClient) {
    return cachedClient;
  }

  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not set. Cannot generate outfits without it.');
  }

  cachedClient = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  return cachedClient;
}

function buildPrompt(form: GenerateFormInput, profile: StyleProfileInput): string {
  const profileSummary = [
    profile.gender ? `gender: ${profile.gender}` : null,
    profile.age ? `age: ${profile.age}` : null,
    profile.heightCm ? `height_cm: ${profile.heightCm}` : null,
    profile.weightKg ? `weight_kg: ${profile.weightKg}` : null,
    profile.locale ? `locale: ${profile.locale}` : null,
    profile.preferredUnits ? `preferred_units: ${profile.preferredUnits}` : null,
  ]
    .filter(Boolean)
    .join(', ');

  return [
    `The user is preparing for: ${form.preparing_for}.`,
    `Preferred brands: ${form.preferred_brand || 'any'}.`,
    `Budget (currency or range as entered): ${form.budget}.`,
    form.description ? `Extra guidance: ${form.description}.` : '',
    profileSummary ? `Profile: ${profileSummary}.` : '',
    'Return between 1 and 5 outfits, each with 3-6 items. Each item must translate to a product search query.',
  ]
    .filter(Boolean)
    .join('\n');
}

export async function generateStylePlan(
  form: GenerateFormInput,
  profile: StyleProfileInput,
  options?: { temperature?: number }
): Promise<StylePlan> {
  if (STYLE_MODEL_URL) {
    return callLocalStyleModel(form, profile);
  }

  const client = getOpenAIClient();
  const userContent: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [
    {
      type: 'text',
      text: buildPrompt(form, profile),
    },
  ];

  if (profile.profileImageUrl) {
    userContent.push({
      type: 'image_url',
      image_url: {
        url: profile.profileImageUrl || DEFAULT_FALLBACK_IMAGE,
      },
    });
  } else {
    userContent.push({
      type: 'image_url',
      image_url: {
        url: DEFAULT_FALLBACK_IMAGE,
      },
    });
  }

  const completion = await client.chat.completions.create({
    model: DEFAULT_MODEL,
    temperature: options?.temperature ?? 0.7,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content:
          'You are a world-class AI stylist. Respond strictly in JSON matching the schema: { outfits: [{ looks, description, items: [{ query, key, type, min, max, brand }] }] }. Include realistic price min/max fields that respect the stated budget.',
      },
      {
        role: 'user',
        content: userContent,
      },
    ],
  });

  const messageContent = completion.choices[0]?.message?.content;

  if (!messageContent) {
    throw new Error('OpenAI returned an empty response.');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(messageContent);
  } catch (error) {
    console.error('Failed to parse OpenAI response:', messageContent);
    throw new Error('OpenAI response was not valid JSON.');
  }

  const validated = stylePlanSchema.safeParse(parsed);
  if (!validated.success) {
    console.error('OpenAI response failed schema validation:', validated.error.flatten());
    throw new Error('OpenAI response did not match the expected schema.');
  }

  return validated.data;
}

async function callLocalStyleModel(
  form: GenerateFormInput,
  profile: StyleProfileInput
): Promise<StylePlan> {
  const response = await fetch(STYLE_MODEL_URL!, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ form, profile }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Local style model error (${response.status}): ${text}`);
  }

  const payload = await response.json();
  const validated = stylePlanSchema.safeParse(payload?.data ?? payload);
  if (!validated.success) {
    console.error('Local model response failed validation:', validated.error.flatten());
    throw new Error('Local style model returned invalid schema.');
  }
  return validated.data;
}

