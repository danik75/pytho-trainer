import {
  buildCurriculumUserMessage,
  buildExerciseUserMessage,
  buildEvaluationUserMessage,
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
