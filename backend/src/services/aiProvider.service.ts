import Groq from 'groq-sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';

export interface AIProvider {
  name: string;
  isAvailable(): Promise<boolean>;
  generateCompletion(prompt: string, systemPrompt?: string): Promise<string>;
}

/**
 * Ollama Provider (Local Open-Source Model: Qwen3-Coder / Qwen2.5-Coder / DeepSeek-Coder)
 */
export class OllamaProvider implements AIProvider {
  name = 'Ollama (Local Open-Source)';
  private baseUrl: string;
  private model: string;

  constructor(baseUrl?: string, model?: string) {
    this.baseUrl = baseUrl || process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
    this.model = model || process.env.OLLAMA_MODEL || 'qwen2.5-coder';
  }

  async isAvailable(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2000);
      const res = await fetch(`${this.baseUrl}/api/tags`, {
        signal: controller.signal
      });
      clearTimeout(timeout);
      return res.ok;
    } catch {
      return false;
    }
  }

  async generateCompletion(prompt: string, systemPrompt?: string): Promise<string> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000); // 60s timeout for local models

    const res = await fetch(`${this.baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.model,
        prompt: prompt,
        system: systemPrompt || 'You are an expert technical interviewer and software engineering auditor.',
        stream: false,
        options: {
          temperature: 0.2
        }
      }),
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (!res.ok) {
      throw new Error(`Ollama request failed with status ${res.status}`);
    }

    const data = await res.json() as { response?: string };
    return data.response || '';
  }
}

/**
 * Groq Provider (Fast Cloud Inference: Llama-3.3-70b / Llama-3.1-8b)
 */
export class GroqProvider implements AIProvider {
  name = 'Groq Cloud';
  private groq: Groq | null = null;
  private model: string;

  constructor(apiKey?: string, model?: string) {
    const key = apiKey || process.env.GROQ_API_KEY;
    if (key) {
      this.groq = new Groq({ apiKey: key });
    }
    this.model = model || process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
  }

  async isAvailable(): Promise<boolean> {
    return !!this.groq;
  }

  async generateCompletion(prompt: string, systemPrompt?: string): Promise<string> {
    if (!this.groq) {
      throw new Error('Groq API Key not configured');
    }

    const response = await this.groq.chat.completions.create({
      model: this.model,
      messages: [
        {
          role: 'system',
          content: systemPrompt || 'You are an expert technical interviewer and software engineering auditor.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.2,
      response_format: { type: 'json_object' }
    });

    return response.choices[0]?.message?.content || '';
  }
}

/**
 * Google Gemini Provider (Cloud Inference)
 */
export class GeminiProvider implements AIProvider {
  name = 'Google Gemini';
  private genAI: GoogleGenerativeAI | null = null;
  private modelName: string;

  constructor(apiKey?: string, modelName?: string) {
    const key = apiKey || process.env.GEMINI_API_KEY;
    if (key) {
      this.genAI = new GoogleGenerativeAI(key);
    }
    this.modelName = modelName || 'gemini-1.5-flash';
  }

  async isAvailable(): Promise<boolean> {
    return !!this.genAI;
  }

  async generateCompletion(prompt: string, systemPrompt?: string): Promise<string> {
    if (!this.genAI) {
      throw new Error('Gemini API Key not configured');
    }

    const model = this.genAI.getGenerativeModel({
      model: this.modelName,
      systemInstruction: systemPrompt || 'You are an expert technical interviewer and software engineering auditor.'
    });

    const result = await model.generateContent(prompt);
    return result.response.text();
  }
}

/**
 * AI Provider Orchestrator
 * Evaluates provider availability in priority order:
 * 1. Ollama (if running locally)
 * 2. Groq (if configured)
 * 3. Gemini (if configured)
 */
export class AIProviderService {
  private providers: AIProvider[] = [];

  constructor() {
    this.providers = [
      new OllamaProvider(),
      new GroqProvider(),
      new GeminiProvider()
    ];
  }

  async getActiveProvider(): Promise<{ provider: AIProvider; name: string } | null> {
    for (const provider of this.providers) {
      const available = await provider.isAvailable();
      if (available) {
        return { provider, name: provider.name };
      }
    }
    return null;
  }

  async generateStructuredJSON<T>(prompt: string, systemPrompt?: string): Promise<{ data: T; providerUsed: string }> {
    const active = await this.getActiveProvider();
    
    if (!active) {
      throw new Error('No AI provider available (Ollama, Groq, or Gemini).');
    }

    const fullPrompt = `${prompt}\n\nIMPORTANT: Respond with valid, pure JSON only. Do not enclose in markdown blocks if possible, or use standard JSON format.`;
    const rawResponse = await active.provider.generateCompletion(fullPrompt, systemPrompt);

    // Clean JSON response
    let jsonStr = rawResponse.trim();
    if (jsonStr.startsWith('```json')) {
      jsonStr = jsonStr.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    try {
      const parsed = JSON.parse(jsonStr) as T;
      return { data: parsed, providerUsed: active.name };
    } catch (parseError) {
      console.warn(`[AIProviderService] JSON parse failed from ${active.name}, attempting regex extraction:`, parseError);
      const match = jsonStr.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]) as T;
        return { data: parsed, providerUsed: active.name };
      }
      throw new Error(`Failed to parse structured JSON from ${active.name}: ${jsonStr.slice(0, 200)}...`);
    }
  }
}

export const aiService = new AIProviderService();
