import { z } from 'zod';

const difficultySchema = z.enum(['intro', 'core', 'advanced']);

export const topicGenerationSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  learningObjectives: z.array(z.string().min(1)).min(1),
  difficulty: difficultySchema,
});
export type TopicGeneration = z.infer<typeof topicGenerationSchema>;

export const trackGenerationSchema = z.object({
  kind: z.enum(['foundations', 'domain']),
  slug: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  topics: z.array(topicGenerationSchema).min(1),
});
export type TrackGeneration = z.infer<typeof trackGenerationSchema>;

export const curriculumGenerationSchema = z.object({
  title: z.string().min(1),
  summary: z.string().min(1),
  tracks: z.array(trackGenerationSchema).min(1),
});
export type CurriculumGeneration = z.infer<typeof curriculumGenerationSchema>;

export const hiddenTestGenerationSchema = z.object({
  name: z.string().min(1),
  functionName: z.string().min(1),
  args: z.array(z.unknown()),
  // Exactly one of these two is set, depending on what correct behavior
  // looks like for this test - a returned value, or a raised exception.
  expected: z.unknown().optional(),
  expectedError: z
    .object({
      type: z.string().min(1),
      message: z.string().optional(),
    })
    .optional(),
});

export const exerciseGenerationSchema = z.object({
  prompt: z.string().min(1),
  starterCode: z.string(),
  conceptsMd: z.string().min(1),
  difficulty: difficultySchema,
  targetWeakSpots: z.array(z.string()),
  hiddenTests: z.array(hiddenTestGenerationSchema).min(1),
  solutionCode: z.string().min(1),
  solutionExplanationMd: z.string().min(1),
});
export type ExerciseGeneration = z.infer<typeof exerciseGenerationSchema>;

export const submissionEvaluationSchema = z.object({
  correct: z.boolean(),
  understandingNotes: z.string(),
  feedback: z.string().min(1),
  idiomaticFeedback: z.string(),
  suggestedMasteryScore: z.number().min(0).max(1),
  identifiedWeakSpots: z.array(z.string()),
});
export type SubmissionEvaluationGeneration = z.infer<typeof submissionEvaluationSchema>;

export const exerciseHelpAnswerSchema = z.object({
  answer: z.string().min(1),
});
export type ExerciseHelpAnswerGeneration = z.infer<typeof exerciseHelpAnswerSchema>;

export const examQuestionGenerationSchema = z.object({
  questionMd: z.string().min(1),
  questionType: z.enum(['multiple_choice', 'short_answer']),
  choices: z.array(z.string()).nullable(),
  correctAnswer: z.string().min(1),
  gradingNotes: z.string(),
});
export type ExamQuestionGeneration = z.infer<typeof examQuestionGenerationSchema>;

export const theoryGenerationSchema = z.object({
  explanationMd: z.string().min(1),
  examQuestions: z.array(examQuestionGenerationSchema).min(1),
});
export type TheoryGeneration = z.infer<typeof theoryGenerationSchema>;

export const examGradingSchema = z.object({
  score: z.number().min(0).max(1),
  overallFeedback: z.string().min(1),
  perQuestionFeedback: z.record(z.string(), z.string()),
  suggestedMasteryScore: z.number().min(0).max(1),
});
export type ExamGradingGeneration = z.infer<typeof examGradingSchema>;

export const overviewNarrativeSchema = z.object({
  narrativeMd: z.string().min(1),
});
export type OverviewNarrativeGeneration = z.infer<typeof overviewNarrativeSchema>;
