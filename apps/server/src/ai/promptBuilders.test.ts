import {
  buildCurriculumUserMessage,
  buildExerciseUserMessage,
  buildEvaluationUserMessage,
  buildTheoryUserMessage,
  buildExamGradingUserMessage,
} from './promptBuilders';

describe('buildCurriculumUserMessage', () => {
  it('describes known catalog domains with their title and description', () => {
    const message = buildCurriculumUserMessage({
      goals: 'Get better at backend work',
      selfAssessedLevel: 'intermediate',
      diagnosticNotes: { q1: 'yes' },
      selectedDomains: ['backend'],
    });

    expect(message).toContain('Get better at backend work');
    expect(message).toContain('Backend Development');
  });

  it('falls back to the raw name for an unknown/custom domain', () => {
    const message = buildCurriculumUserMessage({
      goals: 'Explore something niche',
      selfAssessedLevel: 'beginner',
      diagnosticNotes: {},
      selectedDomains: ['quantum-computing'],
    });

    expect(message).toContain('quantum-computing');
  });

  it('notes when no domains were selected', () => {
    const message = buildCurriculumUserMessage({
      goals: 'Just the basics',
      selfAssessedLevel: 'beginner',
      diagnosticNotes: {},
      selectedDomains: [],
    });

    expect(message).toContain('none selected');
  });
});

describe('buildExerciseUserMessage', () => {
  it('includes topic details, difficulty, and weak spots when present', () => {
    const message = buildExerciseUserMessage({
      topicTitle: 'Loops',
      topicDescription: 'For and while loops',
      learningObjectives: ['Write a for loop'],
      difficulty: 'intro',
      weakSpots: ['off-by-one errors'],
      recentExercisePrompts: ['Sum a list'],
    });

    expect(message).toContain('Loops');
    expect(message).toContain('off-by-one errors');
    expect(message).toContain('Sum a list');
  });

  it('notes when there are no weak spots or prior exercises yet', () => {
    const message = buildExerciseUserMessage({
      topicTitle: 'Loops',
      topicDescription: 'For and while loops',
      learningObjectives: ['Write a for loop'],
      difficulty: 'intro',
      weakSpots: [],
      recentExercisePrompts: [],
    });

    expect(message).toContain('(none yet)');
  });
});

describe('buildEvaluationUserMessage', () => {
  it('summarizes test results, code, and program output', () => {
    const message = buildEvaluationUserMessage({
      exercisePrompt: 'Write add(a, b).',
      code: 'def add(a, b):\n    return a + b\n',
      stdout: 'debug line\n',
      stderr: '',
      testResults: [
        { name: 'adds', passed: true },
        { name: 'negative numbers', passed: false, details: 'Expected -1, got 1' },
      ],
    });

    expect(message).toContain('Write add(a, b).');
    expect(message).toContain('def add(a, b):');
    expect(message).toContain('adds: passed');
    expect(message).toContain('negative numbers: failed (Expected -1, got 1)');
    expect(message).toContain('debug line');
  });

  it('falls back to "no details" for a failed test without a details field', () => {
    const message = buildEvaluationUserMessage({
      exercisePrompt: 'Write add(a, b).',
      code: 'def add(a, b):\n    return a + b\n',
      stdout: '',
      stderr: '',
      testResults: [{ name: 'adds', passed: false }],
    });

    expect(message).toContain('adds: failed (no details)');
  });

  it('notes empty stdout/stderr and no hidden tests', () => {
    const message = buildEvaluationUserMessage({
      exercisePrompt: 'Write add(a, b).',
      code: 'def add(a, b):\n    return a + b\n',
      stdout: '',
      stderr: '',
      testResults: [],
    });

    expect(message).toContain('(empty)');
    expect(message).toContain('(no hidden tests)');
  });
});

describe('buildTheoryUserMessage', () => {
  it('includes the topic, context, and focus areas when present', () => {
    const message = buildTheoryUserMessage({
      topic: 'Recursion',
      context: 'Functions calling themselves',
      focusAreas: ['base cases', 'stack overflow'],
    });

    expect(message).toContain('Recursion');
    expect(message).toContain('Functions calling themselves');
    expect(message).toContain('base cases');
    expect(message).toContain('stack overflow');
  });

  it('notes when there are no specific focus areas yet', () => {
    const message = buildTheoryUserMessage({ topic: 'Recursion', context: '', focusAreas: [] });
    expect(message).toContain('has not shown any specific weak spots yet');
  });
});

describe('buildExamGradingUserMessage', () => {
  it('formats multiple-choice questions with the deterministic ground truth', () => {
    const message = buildExamGradingUserMessage({
      questions: [
        {
          id: 'q1',
          questionMd: 'Pick the base case behavior.',
          questionType: 'multiple_choice',
          userAnswer: 'Stops recursion',
          correctAnswer: 'Stops recursion',
          gradingNotes: '',
          isCorrectDeterministic: true,
        },
      ],
    });

    expect(message).toContain('multiple_choice, ground-truth correct: true');
    expect(message).toContain('Pick the base case behavior.');
  });

  it('formats short-answer questions with grading notes and no answer fallback', () => {
    const message = buildExamGradingUserMessage({
      questions: [
        {
          id: 'q2',
          questionMd: 'Explain a base case.',
          questionType: 'short_answer',
          userAnswer: '',
          correctAnswer: 'The stopping condition.',
          gradingNotes: 'Accept any description of a stopping condition.',
        },
      ],
    });

    expect(message).toContain('short_answer');
    expect(message).toContain('(no answer)');
    expect(message).toContain('Accept any description of a stopping condition.');
  });
});
