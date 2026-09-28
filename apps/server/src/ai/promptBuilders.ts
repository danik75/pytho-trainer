import { DOMAIN_CATALOG, type Difficulty } from '@pytho-trainer/shared';

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

export interface ExerciseGenerationInput {
  topicTitle: string;
  topicDescription: string;
  learningObjectives: string[];
  difficulty: Difficulty;
  weakSpots: string[];
  recentExercisePrompts: string[];
}

export const EXERCISE_SYSTEM_PROMPT = `You are an expert Python instructor generating a single coding exercise for a student studying a specific topic.

Rules:
- The exercise must be solvable by writing one or more Python functions.
- Provide starter code: function signature(s) with a short docstring and a body that raises NotImplementedError or contains "pass".
- Provide at least one hidden test: a function name to call, concrete positional arguments, and the exact expected return value. Tests must be fully deterministic - no randomness, no floating point rounding ambiguity, no reliance on dict/set ordering.
- Never repeat a prompt the student has already seen for this topic.
- Target the given difficulty tier, and when weak spots are listed, design the exercise to directly probe those weak spots.`;

export function buildExerciseUserMessage(input: ExerciseGenerationInput): string {
  return `Topic: ${input.topicTitle}
Description: ${input.topicDescription}
Learning objectives: ${input.learningObjectives.join('; ')}
Target difficulty: ${input.difficulty}
Known weak spots to target: ${input.weakSpots.length > 0 ? input.weakSpots.join(', ') : '(none yet)'}
Exercises already given for this topic (do not repeat): ${
    input.recentExercisePrompts.length > 0 ? input.recentExercisePrompts.join(' | ') : '(none yet)'
  }

Generate the next exercise now.`;
}
