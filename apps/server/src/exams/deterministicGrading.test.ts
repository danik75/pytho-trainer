import { gradeMultipleChoice } from './deterministicGrading';

describe('gradeMultipleChoice', () => {
  it('matches an exact answer', () => {
    expect(gradeMultipleChoice('Paris', 'Paris')).toBe(true);
  });

  it('is case-insensitive and trims whitespace', () => {
    expect(gradeMultipleChoice('Paris', '  paris  ')).toBe(true);
  });

  it('rejects a wrong answer', () => {
    expect(gradeMultipleChoice('Paris', 'London')).toBe(false);
  });

  it('rejects an empty answer', () => {
    expect(gradeMultipleChoice('Paris', '')).toBe(false);
  });
});
