import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DOMAIN_CATALOG, type DomainCatalogEntry } from '@pytho-trainer/shared';
import { getDomainCatalog, submitOnboarding, createCurriculum } from '../api/client';
import { Spinner } from '../components/Spinner';

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
    <div className="page">
      <div className="page-header">
        <h1 className="page-header__title">Let&apos;s build your curriculum</h1>
        <p className="page-header__subtitle">
          A few quick questions so the AI can tailor your roadmap.
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="card">
          <div className="form-field">
            <label className="form-label" htmlFor="goals">
              What do you want to get out of learning Python?
            </label>
            <textarea
              id="goals"
              value={goals}
              onChange={(event) => setGoals(event.target.value)}
              rows={3}
              required
            />
          </div>

          <fieldset>
            <legend>Self-assessed level</legend>
            <div className="option-list">
              {SELF_ASSESSED_LEVELS.map((level) => (
                <label className="option" key={level.value}>
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
            </div>
          </fieldset>

          <fieldset>
            <legend>Quick diagnostic</legend>
            {DIAGNOSTIC_QUESTIONS.map(({ key, question }) => (
              <div className="diagnostic-question" key={key}>
                <span className="diagnostic-question__prompt">{question}</span>
                <div className="option-list option-list--inline">
                  {['yes', 'a little', 'no'].map((option) => (
                    <label className="option" key={option}>
                      <input
                        type="radio"
                        name={key}
                        value={option}
                        checked={diagnosticAnswers[key] === option}
                        onChange={() =>
                          setDiagnosticAnswers((prev) => ({ ...prev, [key]: option }))
                        }
                      />
                      {option}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </fieldset>

          <fieldset>
            <legend>Domains to deepen after Foundations (optional)</legend>
            <div className="option-list option-list--grid">
              {catalog?.map((domain) => (
                <label className="option" key={domain.slug} title={domain.description}>
                  <input
                    type="checkbox"
                    checked={selectedDomains.includes(domain.slug)}
                    onChange={() => toggleDomain(domain.slug)}
                  />
                  {domain.title}
                </label>
              ))}
            </div>
            <div className="inline-add">
              <input
                type="text"
                placeholder="Add a custom domain"
                value={customDomain}
                onChange={(event) => setCustomDomain(event.target.value)}
              />
              <button type="button" className="btn btn--secondary" onClick={addCustomDomain}>
                Add
              </button>
            </div>
            {selectedDomains.length > 0 && (
              <div className="chip-row">
                {selectedDomains.map((domain) => (
                  <span className="chip" key={domain}>
                    {domain}
                  </span>
                ))}
              </div>
            )}
          </fieldset>

          <button
            type="submit"
            className="btn btn--primary btn--block"
            disabled={mutation.isPending}
          >
            {mutation.isPending ? (
              <>
                <Spinner /> Generating your curriculum...
              </>
            ) : (
              'Generate my curriculum'
            )}
          </button>

          {mutation.isPending && (
            <p className="loading-hint">
              <Spinner /> The AI is designing your personalized curriculum - this can take up to a
              minute.
            </p>
          )}

          {mutation.isError && (
            <div className="alert alert--error alert--after-action" role="alert">
              Something went wrong: {(mutation.error as Error).message}
            </div>
          )}
        </div>
      </form>
    </div>
  );
}
