import type { MasteryStatus, SessionDecision } from '@pytho-trainer/shared';

export interface MasteryState {
  masteryScore: number;
  attemptsCount: number;
  consecutiveSuccesses: number;
  weakSpots: string[];
}

export interface EvaluationSignal {
  correct: boolean;
  suggestedMasteryScore: number;
  identifiedWeakSpots: string[];
}

export type { SessionDecision };

export interface DecisionResult {
  nextState: MasteryState;
  decision: SessionDecision;
  status: MasteryStatus;
}

export const MASTERY_THRESHOLD = {
  minScore: 0.8,
  minConsecutiveSuccesses: 2,
  minAttempts: 2,
  maxAttemptsBeforeStruggling: 15,
  badFirstAttemptScore: 0.3,
};

/**
 * Pure mastery/threshold decision function: given the topic's current
 * mastery state and the AI's evaluation of the latest submission, decides
 * whether to generate another exercise, advance the roadmap, or flag the
 * topic as struggling. Kept free of DB/AI calls so the threshold logic is
 * unit-testable on its own.
 */
export function decideNextStep(
  current: MasteryState,
  evaluation: EvaluationSignal,
): DecisionResult {
  const attemptsCount = current.attemptsCount + 1;
  const consecutiveSuccesses = evaluation.correct ? current.consecutiveSuccesses + 1 : 0;

  // Smooth against the previous score so a single generous (or harsh)
  // evaluation can't swing mastery wildly; the very first attempt has no
  // prior score to smooth against.
  const masteryScore =
    current.attemptsCount === 0
      ? evaluation.suggestedMasteryScore
      : current.masteryScore * 0.4 + evaluation.suggestedMasteryScore * 0.6;

  const weakSpots = evaluation.correct
    ? evaluation.identifiedWeakSpots
    : Array.from(new Set([...current.weakSpots, ...evaluation.identifiedWeakSpots]));

  const nextState: MasteryState = { masteryScore, attemptsCount, consecutiveSuccesses, weakSpots };

  const mastered =
    masteryScore >= MASTERY_THRESHOLD.minScore &&
    consecutiveSuccesses >= MASTERY_THRESHOLD.minConsecutiveSuccesses &&
    attemptsCount >= MASTERY_THRESHOLD.minAttempts;

  if (mastered) {
    return { nextState, decision: 'advance_topic', status: 'mastered' };
  }
  if (attemptsCount >= MASTERY_THRESHOLD.maxAttemptsBeforeStruggling) {
    return { nextState, decision: 'flag_struggling', status: 'struggling' };
  }

  // A theory session is warranted when the same conceptual gap persists
  // across attempts, or the very first attempt shows no grounding at all -
  // in both cases another exercise alone is unlikely to help.
  const repeatedWeakSpot =
    !evaluation.correct &&
    current.weakSpots.some((spot) => evaluation.identifiedWeakSpots.includes(spot));
  const badFirstAttempt =
    current.attemptsCount === 0 &&
    !evaluation.correct &&
    evaluation.suggestedMasteryScore < MASTERY_THRESHOLD.badFirstAttemptScore;

  if (repeatedWeakSpot || badFirstAttempt) {
    return { nextState, decision: 'insert_theory_session', status: 'in_progress' };
  }

  return { nextState, decision: 'next_exercise', status: 'in_progress' };
}
