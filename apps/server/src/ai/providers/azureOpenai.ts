import { AzureOpenAI } from 'openai';
import type { AiClient, ModelTier, ToolMessageRequest } from '../client';
import { callForcedToolUse } from './openaiCompatible';

export interface AzureOpenAiConfig {
  apiKey: string;
  endpoint: string;
  apiVersion: string;
  smartDeployment: string;
  fastDeployment: string;
}

/**
 * Azure OpenAI routes by *deployment* rather than model name - a client
 * instance is bound to a single deployment (the Azure SDK inserts it
 * directly into the request path), so unlike the other providers this needs
 * one client per tier instead of one client picking a model string per call.
 */
export function createAzureOpenAiClient(config: AzureOpenAiConfig): AiClient {
  const deployments: Record<ModelTier, string> = {
    smart: config.smartDeployment,
    fast: config.fastDeployment,
  };
  const clients: Record<ModelTier, AzureOpenAI> = {
    smart: new AzureOpenAI({
      apiKey: config.apiKey,
      endpoint: config.endpoint,
      apiVersion: config.apiVersion,
      deployment: config.smartDeployment,
    }),
    fast: new AzureOpenAI({
      apiKey: config.apiKey,
      endpoint: config.endpoint,
      apiVersion: config.apiVersion,
      deployment: config.fastDeployment,
    }),
  };

  return {
    createToolMessage(request: ToolMessageRequest): Promise<unknown> {
      const tier = request.tier ?? 'smart';
      return callForcedToolUse(clients[tier], deployments[tier], request);
    },
  };
}
