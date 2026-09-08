import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { ByokProvider } from './byok.dto';
import { ByokService } from './byok.service';

export interface ResolvedAiCapability {
  available: boolean;
  source?: 'byok' | 'platform';
  provider?: ByokProvider | 'openrouter';
  apiKey?: string;
  baseUrl?: string;
  reason?: string;
}

export interface AiCompletionOptions {
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
  maxTokens?: number;
}

export interface AiCompletionResult {
  available: boolean;
  text?: string;
  reason?: string;
  provider?: string;
  source?: string;
}

@Injectable()
export class AiCapabilityService {
  private readonly logger = new Logger(AiCapabilityService.name);

  constructor(
    private readonly byokService: ByokService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Resolves whether an AI capability is available for the given workspace.
   * Priority:
   * 1. Workspace BYOK credential (openai, anthropic, google, mistral)
   * 2. Platform environment configuration (OPENROUTER_API_KEY, OPENAI_API_KEY, ANTHROPIC_API_KEY)
   */
  async resolveCapability(workspaceId: string): Promise<ResolvedAiCapability> {
    const providers: ByokProvider[] = [
      'openai',
      'anthropic',
      'google',
      'mistral',
    ];

    // 1. Check workspace BYOK credentials
    for (const provider of providers) {
      try {
        const apiKey = await this.byokService.getDecryptedKey(
          workspaceId,
          provider,
        );
        if (apiKey && apiKey.trim().length > 0) {
          return {
            available: true,
            source: 'byok',
            provider,
            apiKey: apiKey.trim(),
          };
        }
      } catch {
        // Continue checking other BYOK providers
      }
    }

    // 2. Check platform environment configuration
    const openrouterKey =
      this.configService.get<string>('OPENROUTER_API_KEY') ??
      process.env.OPENROUTER_API_KEY;
    if (openrouterKey && openrouterKey.trim().length > 0) {
      const baseUrl =
        this.configService.get<string>('OPENROUTER_BASE_URL') ??
        process.env.OPENROUTER_BASE_URL ??
        'https://openrouter.ai/api/v1';
      return {
        available: true,
        source: 'platform',
        provider: 'openrouter',
        apiKey: openrouterKey.trim(),
        baseUrl,
      };
    }

    const platformOpenAIKey =
      this.configService.get<string>('OPENAI_API_KEY') ??
      process.env.OPENAI_API_KEY;
    if (platformOpenAIKey && platformOpenAIKey.trim().length > 0) {
      return {
        available: true,
        source: 'platform',
        provider: 'openai',
        apiKey: platformOpenAIKey.trim(),
      };
    }

    const platformAnthropicKey =
      this.configService.get<string>('ANTHROPIC_API_KEY') ??
      process.env.ANTHROPIC_API_KEY;
    if (platformAnthropicKey && platformAnthropicKey.trim().length > 0) {
      return {
        available: true,
        source: 'platform',
        provider: 'anthropic',
        apiKey: platformAnthropicKey.trim(),
      };
    }

    // 3. No AI capability configured
    return {
      available: false,
      reason:
        'AI provider not configured. Connect BYOK or enable a platform AI plan to use AI features.',
    };
  }

  /**
   * Capability-aware AI text completion handler.
   * Returns honest capability-unavailable status if no provider exists.
   */
  async generateCompletion(
    workspaceId: string,
    options: AiCompletionOptions,
  ): Promise<AiCompletionResult> {
    const cap = await this.resolveCapability(workspaceId);
    if (!cap.available || !cap.apiKey) {
      return {
        available: false,
        reason:
          cap.reason ??
          'AI provider not configured. Connect BYOK or enable a platform AI plan.',
      };
    }

    try {
      if (cap.provider === 'anthropic') {
        const text = await this.callAnthropicApi(cap.apiKey, options);
        return {
          available: true,
          text,
          provider: cap.provider,
          source: cap.source,
        };
      }

      if (cap.provider === 'openrouter') {
        const baseUrl = cap.baseUrl ?? 'https://openrouter.ai/api/v1';
        const model =
          this.configService.get<string>('OPENROUTER_DEFAULT_MODEL') ??
          process.env.OPENROUTER_DEFAULT_MODEL ??
          'openai/gpt-4o-mini';
        const text = await this.callOpenAICompatibleApi(
          `${baseUrl}/chat/completions`,
          cap.apiKey,
          model,
          options,
        );
        return {
          available: true,
          text,
          provider: cap.provider,
          source: cap.source,
        };
      }

      // Default OpenAI format (openai, google, mistral compatibility)
      const text = await this.callOpenAICompatibleApi(
        'https://api.openai.com/v1/chat/completions',
        cap.apiKey,
        'gpt-4o-mini',
        options,
      );
      return {
        available: true,
        text,
        provider: cap.provider,
        source: cap.source,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`AI completion failed: ${msg}`);
      return {
        available: false,
        reason: `AI provider call failed: ${msg}`,
      };
    }
  }

  private async callOpenAICompatibleApi(
    endpoint: string,
    apiKey: string,
    model: string,
    options: AiCompletionOptions,
  ): Promise<string> {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: options.systemPrompt },
          { role: 'user', content: options.userPrompt },
        ],
        temperature: options.temperature ?? 0.2,
        max_tokens: options.maxTokens ?? 2000,
      }),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      throw new Error(
        `HTTP ${String(response.status)}: ${errText.slice(0, 200)}`,
      );
    }

    interface OpenAIFormat {
      choices: { message: { content: string } }[];
    }
    const data = (await response.json()) as OpenAIFormat;
    const content = data.choices[0]?.message.content;
    if (!content) throw new Error('Empty response from AI model');
    return content.trim();
  }

  private async callAnthropicApi(
    apiKey: string,
    options: AiCompletionOptions,
  ): Promise<string> {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: options.maxTokens ?? 2000,
        system: options.systemPrompt,
        messages: [{ role: 'user', content: options.userPrompt }],
        temperature: options.temperature ?? 0.2,
      }),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      throw new Error(
        `HTTP ${String(response.status)}: ${errText.slice(0, 200)}`,
      );
    }

    interface AnthropicFormat {
      content: { text: string }[];
    }
    const data = (await response.json()) as AnthropicFormat;
    const content = data.content[0]?.text;
    if (!content) throw new Error('Empty response from Anthropic model');
    return content.trim();
  }
}
