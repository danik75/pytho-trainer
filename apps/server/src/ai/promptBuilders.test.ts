import { buildCurriculumUserMessage, buildExerciseUserMessage } from './promptBuilders';

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
