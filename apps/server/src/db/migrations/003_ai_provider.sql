-- Tracks which AI provider the user currently has selected, so requests can
-- be routed to the matching client (Anthropic, OpenAI, Google, or DeepSeek).
ALTER TABLE users ADD COLUMN ai_provider TEXT NOT NULL DEFAULT 'anthropic';
