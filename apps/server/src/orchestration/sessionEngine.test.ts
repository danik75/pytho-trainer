import { decideNextStep, MASTERY_THRESHOLD, type MasteryState } from './sessionEngine';

const FRESH: MasteryState = {
  masteryScore: 0,
  attemptsCount: 0,
  consecutiveSuccesses: 0,
  weakSpots: [],
};

describe('decideNextStep', () => {
  it('does not master on a single correct attempt even with a perfect score', () => {
    const result = decideNextStep(FRESH, {
      correct: true,
      suggestedMasteryScore: 1,
      identifiedWeakSpots: [],
    });
    expect(result.decision).toBe('next_exercise');
    expect(result.nextState.attemptsCount).toBe(1);
    expect(result.nextState.consecutiveSuccesses).toBe(1);
  });

  it('masters after enough consecutive correct attempts with a high enough score', () => {
    const afterFirst = decideNextStep(FRESH, {
      correct: true,
      suggestedMasteryScore: 0.9,
      identifiedWeakSpots: [],
    });
    const afterSecond = decideNextStep(afterFirst.nextState, {
      correct: true,
      suggestedMasteryScore: 0.95,
      identifiedWeakSpots: [],
    });

    expect(afterSecond.decision).toBe('advance_topic');
    expect(afterSecond.status).toBe('mastered');
    expect(afterSecond.nextState.masteryScore).toBeGreaterThanOrEqual(MASTERY_THRESHOLD.minScore);
  });

  it('resets the consecutive-success streak on a wrong answer', () => {
    const afterFirst = decideNextStep(FRESH, {
      correct: true,
      suggestedMasteryScore: 0.9,
      identifiedWeakSpots: [],
    });
    const afterWrong = decideNextStep(afterFirst.nextState, {
      correct: false,
      suggestedMasteryScore: 0.3,
      identifiedWeakSpots: ['loops'],
    });

    expect(afterWrong.decision).toBe('next_exercise');
    expect(afterWrong.nextState.consecutiveSuccesses).toBe(0);
    expect(afterWrong.nextState.weakSpots).toContain('loops');
  });

  it('does not advance on a single generous evaluation before minAttempts is reached', () => {
    // Even a perfect single correct attempt only yields consecutiveSuccesses=1,
    // attemptsCount=1 - both below the minimums - so it must not master yet.
    const result = decideNextStep(FRESH, {
      correct: true,
      suggestedMasteryScore: 1,
      identifiedWeakSpots: [],
    });
    expect(result.decision).not.toBe('advance_topic');
  });

  it('smooths the mastery score against the previous value rather than jumping straight to the new one', () => {
    const afterFirst = decideNextStep(FRESH, {
      correct: true,
      suggestedMasteryScore: 0.2,
      identifiedWeakSpots: [],
    });
    const afterSecond = decideNextStep(afterFirst.nextState, {
      correct: true,
      suggestedMasteryScore: 1,
      identifiedWeakSpots: [],
    });

    // Should land strictly between the previous score and the new suggestion,
    // not equal the new suggestion outright.
    expect(afterSecond.nextState.masteryScore).toBeGreaterThan(afterFirst.nextState.masteryScore);
    expect(afterSecond.nextState.masteryScore).toBeLessThan(1);
  });

  it('accumulates weak spots across repeated wrong attempts', () => {
    const afterFirst = decideNextStep(FRESH, {
      correct: false,
      suggestedMasteryScore: 0.1,
      identifiedWeakSpots: ['recursion'],
    });
    const afterSecond = decideNextStep(afterFirst.nextState, {
      correct: false,
      suggestedMasteryScore: 0.1,
      identifiedWeakSpots: ['off-by-one'],
    });

    expect(afterSecond.nextState.weakSpots.sort()).toEqual(['off-by-one', 'recursion']);
  });

  it('clears weak spots once the student answers correctly with none identified', () => {
    const afterWrong = decideNextStep(FRESH, {
      correct: false,
      suggestedMasteryScore: 0.1,
      identifiedWeakSpots: ['recursion'],
    });
    const afterCorrect = decideNextStep(afterWrong.nextState, {
      correct: true,
      suggestedMasteryScore: 0.9,
      identifiedWeakSpots: [],
    });

    expect(afterCorrect.nextState.weakSpots).toEqual([]);
  });

  it('flags the topic as struggling once the max-attempts safety valve is hit', () => {
    let state = FRESH;
    let lastResult = decideNextStep(state, {
      correct: false,
      suggestedMasteryScore: 0.2,
      identifiedWeakSpots: [],
    });
    state = lastResult.nextState;

    for (let i = 1; i < MASTERY_THRESHOLD.maxAttemptsBeforeStruggling; i++) {
      lastResult = decideNextStep(state, {
        correct: false,
        suggestedMasteryScore: 0.2,
        identifiedWeakSpots: [],
      });
      state = lastResult.nextState;
    }

    expect(state.attemptsCount).toBe(MASTERY_THRESHOLD.maxAttemptsBeforeStruggling);
    expect(lastResult.decision).toBe('flag_struggling');
    expect(lastResult.status).toBe('struggling');
  });
});
