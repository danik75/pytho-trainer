/**
 * Multiple-choice answers are checked deterministically rather than left to
 * AI judgment - only short-answer questions need the AI's interpretation.
 */
export function gradeMultipleChoice(correctAnswer: string, userAnswer: string): boolean {
  return correctAnswer.trim().toLowerCase() === userAnswer.trim().toLowerCase();
}
