import {
  DOMAIN_CATALOG,
  type Difficulty,
  type LearningOverviewTopicSummary,
  type QuestionType,
  type TestResult,
} from '@pytho-trainer/shared';

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
  /** The student already mastered this topic and is explicitly asking for a
   * harder exercise to push their mastery further, rather than this being
   * their normal progression through the topic. */
  stretch?: boolean;
}

export const EXERCISE_SYSTEM_PROMPT = `You are an expert Python instructor generating a single coding exercise for a student studying a specific topic.

Rules:
- The exercise must be solvable by writing one or more Python functions.
- Provide starter code: function signature(s) with a short docstring and a body that raises NotImplementedError or contains "pass".
- Provide at least one hidden test: a function name to call, concrete positional arguments, and the exact expected return value. Tests must be fully deterministic - no randomness, no floating point rounding ambiguity, no reliance on dict/set ordering.
- Never repeat a prompt the student has already seen for this topic.
- Target the given difficulty tier, and when weak spots are listed, design the exercise to directly probe those weak spots.
- conceptsMd must teach, in markdown, every piece of Python syntax and every concept the student needs in order to solve this specific exercise, written for someone who may never have seen it before - do not assume they already know it just because the topic is "core" or "advanced". Include short code examples of the relevant syntax (not the exercise's own solution). This is read before the student attempts the exercise, so it must stand on its own.`;

export function buildExerciseUserMessage(input: ExerciseGenerationInput): string {
  const stretchNote = input.stretch
    ? '\nThe student has already mastered this topic at the target difficulty and explicitly asked for a tougher challenge to push their mastery further. Make this exercise noticeably harder than a normal exercise for this topic - combine concepts, probe edge cases, or require a more elegant/efficient solution than a first-pass attempt would use.'
    : '';

  return `Topic: ${input.topicTitle}
Description: ${input.topicDescription}
Learning objectives: ${input.learningObjectives.join('; ')}
Target difficulty: ${input.difficulty}
Known weak spots to target: ${input.weakSpots.length > 0 ? input.weakSpots.join(', ') : '(none yet)'}
Exercises already given for this topic (do not repeat): ${
    input.recentExercisePrompts.length > 0 ? input.recentExercisePrompts.join(' | ') : '(none yet)'
  }${stretchNote}

Generate the next exercise now.`;
}

export interface EvaluationInput {
  exercisePrompt: string;
  code: string;
  stdout: string;
  stderr: string;
  testResults: TestResult[];
}

export const EVALUATION_SYSTEM_PROMPT = `You are an expert Python instructor evaluating a student's code submission for one exercise.

Rules:
- The hidden test results are already computed deterministically and are ground truth for correctness - do not re-judge whether they passed, only interpret what they reveal about the student's understanding.
- Assess whether the code demonstrates real understanding of the underlying concept, not just accidental correctness (e.g. hardcoding the expected outputs).
- suggestedMasteryScore is an absolute score from 0 to 1 reflecting the student's overall demonstrated mastery of this topic after this submission (not just a grade for this one exercise) - weigh correctness heavily, but also code quality and understanding shown.
- identifiedWeakSpots should name specific concepts the student appears to be struggling with (an empty array if none stand out).
- feedback is shown directly to the student: keep it concise, specific, and encouraging even when the submission is wrong.
- idiomaticFeedback: regardless of whether the submission is correct, point out a more idiomatic, Pythonic, or otherwise better way to write this specific solution (e.g. a built-in, a comprehension, a standard-library function, a simpler control-flow structure), with a short markdown code example. If the submission is already about as idiomatic as it reasonably gets for the student's level, return an empty string rather than inventing a nitpick.`;

export function buildEvaluationUserMessage(input: EvaluationInput): string {
  const testSummary = input.testResults
    .map(
      (test) =>
        `- ${test.name}: ${test.passed ? 'passed' : `failed (${test.details ?? 'no details'})`}`,
    )
    .join('\n');

  return `Exercise prompt:
${input.exercisePrompt}

Submitted code:
\`\`\`python
${input.code}
\`\`\`

Hidden test results (ground truth, already computed):
${testSummary || '(no hidden tests)'}

Program stdout: ${input.stdout || '(empty)'}
Program stderr: ${input.stderr || '(empty)'}

Evaluate this submission now.`;
}

export interface ExerciseHelpChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ExerciseHelpInput {
  exercisePrompt: string;
  conceptsMd: string;
  currentCode: string;
  history: ExerciseHelpChatMessage[];
  question: string;
}

export const EXERCISE_HELP_SYSTEM_PROMPT = `You are a friendly, patient Python tutor helping a student who is stuck on a coding exercise, in a live sidebar chat next to their editor.

Rules:
- You are given the exercise prompt, the concepts primer already shown to the student, and their current in-progress code - use all of it to give specific, targeted help rather than generic advice.
- You are NOT told the hidden test cases or expected outputs, and you have no way to know them - never claim to know whether their code currently passes.
- Prefer explaining concepts, pointing out the specific bug or gap, and giving small illustrative snippets over immediately handing over a complete solution. If the student explicitly asks for the full solution or keeps struggling after hints, go ahead and give it - this is a personal tutor, not a graded exam.
- Keep answers focused and conversational (markdown allowed, short code blocks welcome), not a full lecture unless asked for one.`;

export function buildExerciseHelpUserMessage(input: ExerciseHelpInput): string {
  const historyBlock =
    input.history.length > 0
      ? input.history
          .map((m) => `${m.role === 'user' ? 'Student' : 'Tutor'}: ${m.content}`)
          .join('\n\n')
      : '(no prior messages in this chat)';

  return `Exercise prompt:
${input.exercisePrompt}

Concepts primer already shown to the student:
${input.conceptsMd}

Student's current code:
\`\`\`python
${input.currentCode || '(empty)'}
\`\`\`

Conversation so far:
${historyBlock}

Student's new question: ${input.question}

Answer the student's question now.`;
}

export interface TheoryGenerationInput {
  topic: string;
  context: string;
  focusAreas: string[];
}

export const THEORY_SYSTEM_PROMPT = `You are an expert Python instructor writing a short theory lesson for a student, followed by a quiz to check understanding.

Rules:
- explanationMd should be a clear, concise, well-structured explanation of the concept (use markdown: headings, short paragraphs, code examples where helpful). Assume the student is stuck or unfamiliar with it - do not assume prior mastery.
- Write 3-5 exam questions mixing multiple_choice and short_answer types.
- For multiple_choice questions, choices must contain 3-5 plausible options and correctAnswer must exactly match one of them.
- For short_answer questions, choices must be null, and gradingNotes should describe what a correct answer looks like (used as a grading rubric).
- Questions should directly test the explanation just given, especially the specific focus areas listed, not trivia unrelated to the lesson.`;

export function buildTheoryUserMessage(input: TheoryGenerationInput): string {
  const focusLines =
    input.focusAreas.length > 0
      ? `Specifically address these areas the student is struggling with: ${input.focusAreas.join(', ')}`
      : 'The student has not shown any specific weak spots yet - cover the concept generally.';

  return `Topic to teach: ${input.topic}
${input.context ? `Context: ${input.context}\n` : ''}
${focusLines}

Write the theory lesson and quiz now.`;
}

export interface ExamGradingQuestionInput {
  id: string;
  questionMd: string;
  questionType: QuestionType;
  userAnswer: string;
  correctAnswer: string;
  gradingNotes: string;
  isCorrectDeterministic?: boolean;
}

export interface ExamGradingInput {
  questions: ExamGradingQuestionInput[];
}

export const EXAM_GRADING_SYSTEM_PROMPT = `You are grading a student's exam attempt for a theory lesson.

Rules:
- For multiple_choice questions, correctness is already determined deterministically and given to you as ground truth - do not re-judge it, just factor it into your overall assessment and write brief feedback.
- For short_answer questions, judge whether the student's answer demonstrates real understanding, using the provided grading notes as a rubric - not a strict string match.
- score is this exam attempt's overall grade from 0 to 1, combining both question types.
- suggestedMasteryScore is an absolute 0-1 assessment of the student's overall mastery of this topic going forward (may differ from score - e.g. one lucky guess should not imply full mastery).
- perQuestionFeedback must have exactly one entry per question id given, keyed exactly as given, with a short feedback string for each.`;

export function buildExamGradingUserMessage(input: ExamGradingInput): string {
  const questionBlocks = input.questions.map((q) => {
    if (q.questionType === 'multiple_choice') {
      return `Question ${q.id} (multiple_choice, ground-truth correct: ${String(q.isCorrectDeterministic)}):
${q.questionMd}
Student answered: ${q.userAnswer || '(no answer)'}
Correct answer: ${q.correctAnswer}`;
    }
    return `Question ${q.id} (short_answer):
${q.questionMd}
Student answered: ${q.userAnswer || '(no answer)'}
Grading notes: ${q.gradingNotes}`;
  });

  return `${questionBlocks.join('\n\n')}\n\nGrade this exam attempt now.`;
}

export interface OverviewGenerationInput {
  curriculumTitle: string;
  topics: LearningOverviewTopicSummary[];
  difficulties: Array<{ weakSpot: string; occurrences: number }>;
  strugglingTopics: LearningOverviewTopicSummary[];
  nextSteps: LearningOverviewTopicSummary[];
}

export const OVERVIEW_SYSTEM_PROMPT = `You are a supportive Python tutor writing a short progress summary for a student, based entirely on data the system already computed - you are not inventing any facts, topics, or scores, only synthesizing what's given into clear, encouraging prose.

Rules:
- narrativeMd should be 2-4 short paragraphs in markdown: what the student has mastered so far, where they're currently struggling (if anywhere) and why, and what to focus on next.
- Be specific - reference topic titles and weak spots by name rather than speaking in generalities.
- Keep an encouraging, coach-like tone even when discussing struggles.
- Do not invent scores, topics, or facts beyond what is given below.`;

export function buildOverviewUserMessage(input: OverviewGenerationInput): string {
  const topicLines = input.topics
    .map(
      (t) =>
        `- ${t.title} (${t.trackTitle}): ${t.level}, ${Math.round(t.masteryScore * 100)}% mastery, ${t.attemptsCount} attempt(s)`,
    )
    .join('\n');
  const difficultyLines =
    input.difficulties.length > 0
      ? input.difficulties.map((d) => `- ${d.weakSpot} (seen ${d.occurrences}x)`).join('\n')
      : '(none identified)';
  const strugglingLines =
    input.strugglingTopics.length > 0
      ? input.strugglingTopics.map((t) => `- ${t.title}`).join('\n')
      : '(none)';
  const nextStepLines =
    input.nextSteps.length > 0
      ? input.nextSteps.map((t) => `- ${t.title} (${t.trackTitle})`).join('\n')
      : '(none - curriculum complete or nothing unlocked yet)';

  return `Curriculum: ${input.curriculumTitle}

Topic progress:
${topicLines || '(no topics yet)'}

Recurring difficulties (weak spots ranked by frequency):
${difficultyLines}

Topics currently flagged struggling:
${strugglingLines}

Suggested next steps:
${nextStepLines}

Write the progress summary now.`;
}
