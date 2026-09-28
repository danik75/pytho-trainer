import { DOMAIN_CATALOG } from '@pytho-trainer/shared';

export interface CurriculumGenerationInput {
  goals: string;
  selfAssessedLevel: string;
  diagnosticNotes: Record<string, unknown>;
  selectedDomains: string[];
}

export const CURRICULUM_SYSTEM_PROMPT = `You are an expert Python curriculum designer acting as a personal tutor for a single student.

Rules:
- Always include exactly one track with kind "foundations" covering core Python fundamentals. Every other track builds on it.
- Include exactly one track with kind "domain" for each domain the student selected, deepening their Python skills in that area.
- Give each track 3-6 topics, ordered from simplest to most advanced within the track.
- Each topic needs a clear title, description, at least one concrete learning objective, and a difficulty tier (intro, core, or advanced).
- Tailor scope and difficulty to the student's stated goals, self-assessed level, and diagnostic answers - do not pad with irrelevant topics.`;

function describeDomain(slugOrName: string): string {
  const known = DOMAIN_CATALOG.find((entry) => entry.slug === slugOrName);
  return known ? `${known.title} - ${known.description}` : slugOrName;
}

export function buildCurriculumUserMessage(input: CurriculumGenerationInput): string {
  const domainLines =
    input.selectedDomains.length > 0
      ? input.selectedDomains.map((slug) => `- ${describeDomain(slug)}`).join('\n')
      : '(none selected - generate the Foundations track only)';

  return `Student goals: ${input.goals || '(not specified)'}
Self-assessed level: ${input.selfAssessedLevel || '(not specified)'}
Diagnostic answers: ${JSON.stringify(input.diagnosticNotes)}

Domains to deepen after Foundations:
${domainLines}

Design the curriculum now.`;
}
