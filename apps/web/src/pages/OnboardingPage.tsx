import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DOMAIN_CATALOG, type DomainCatalogEntry } from '@pytho-trainer/shared';
import { getDomainCatalog, submitOnboarding, createCurriculum } from '../api/client';

const SELF_ASSESSED_LEVELS = [
  { value: 'beginner', label: 'Beginner - little or no programming experience' },
  { value: 'some-experience', label: 'Some experience - written scripts before' },
  { value: 'intermediate', label: 'Intermediate - comfortable with the basics' },
];

const DIAGNOSTIC_QUESTIONS = [
  { key: 'priorProgramming', question: 'Have you programmed in any language before?' },
  { key: 'priorPython', question: 'Have you used Python specifically before?' },
  { key: 'comfortableWithFunctions', question: 'Are you comfortable with functions and loops?' },
];

export function OnboardingPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: catalog } = useQuery({
    queryKey: ['domainCatalog'],
    queryFn: getDomainCatalog,
    initialData: DOMAIN_CATALOG as DomainCatalogEntry[],
  });

  const [goals, setGoals] = useState('');
  const [selfAssessedLevel, setSelfAssessedLevel] = useState(SELF_ASSESSED_LEVELS[0]!.value);
  const [diagnosticAnswers, setDiagnosticAnswers] = useState<Record<string, string>>({});
  const [selectedDomains, setSelectedDomains] = useState<string[]>([]);
  const [customDomain, setCustomDomain] = useState('');

  const mutation = useMutation({
    mutationFn: async () => {
      await submitOnboarding({
        goals,
        selfAssessedLevel,
        diagnosticNotes: diagnosticAnswers,
        selectedDomains,
      });
      return createCurriculum();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['roadmap'] });
      navigate('/roadmap');
    },
  });

  function toggleDomain(slug: string) {
    setSelectedDomains((prev) =>
      prev.includes(slug) ? prev.filter((d) => d !== slug) : [...prev, slug],
    );
  }

  function addCustomDomain() {
    const trimmed = customDomain.trim();
    if (trimmed && !selectedDomains.includes(trimmed)) {
      setSelectedDomains((prev) => [...prev, trimmed]);
    }
    setCustomDomain('');
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    mutation.mutate();
  }

  return (
    <form onSubmit={handleSubmit}>
      <h1>Let’s build your curriculum</h1>

      <label htmlFor="goals">What do you want to get out of learning Python?</label>
      <textarea
        id="goals"
        value={goals}
        onChange={(event) => setGoals(event.target.value)}
        rows={3}
        required
      />

      <fieldset>
        <legend>Self-assessed level</legend>
        {SELF_ASSESSED_LEVELS.map((level) => (
          <label key={level.value}>
            <input
              type="radio"
              name="selfAssessedLevel"
              value={level.value}
              checked={selfAssessedLevel === level.value}
              onChange={() => setSelfAssessedLevel(level.value)}
            />
            {level.label}
          </label>
        ))}
      </fieldset>

      <fieldset>
        <legend>Quick diagnostic</legend>
        {DIAGNOSTIC_QUESTIONS.map(({ key, question }) => (
          <div key={key}>
            <span>{question}</span>
            {['yes', 'a little', 'no'].map((option) => (
              <label key={option}>
                <input
                  type="radio"
                  name={key}
                  value={option}
                  checked={diagnosticAnswers[key] === option}
                  onChange={() => setDiagnosticAnswers((prev) => ({ ...prev, [key]: option }))}
                />
                {option}
              </label>
            ))}
          </div>
        ))}
      </fieldset>

      <fieldset>
        <legend>Domains to deepen after Foundations (optional)</legend>
        {catalog?.map((domain) => (
          <label key={domain.slug} title={domain.description}>
            <input
              type="checkbox"
              checked={selectedDomains.includes(domain.slug)}
              onChange={() => toggleDomain(domain.slug)}
            />
            {domain.title}
          </label>
        ))}
        <div>
          <input
            type="text"
            placeholder="Add a custom domain"
            value={customDomain}
            onChange={(event) => setCustomDomain(event.target.value)}
          />
          <button type="button" onClick={addCustomDomain}>
            Add
          </button>
        </div>
        {selectedDomains.length > 0 && <p>Selected: {selectedDomains.join(', ')}</p>}
      </fieldset>

      <button type="submit" disabled={mutation.isPending}>
        {mutation.isPending ? 'Generating your curriculum...' : 'Generate my curriculum'}
      </button>

      {mutation.isError && (
        <p role="alert">Something went wrong: {(mutation.error as Error).message}</p>
      )}
    </form>
  );
}
