import { useState } from 'react';
import type { ClientExamQuestion } from '../api/client';

interface ExamFormProps {
  questions: ClientExamQuestion[];
  onSubmit: (answers: Record<string, string>) => void;
  disabled?: boolean;
}

export function ExamForm({ questions, onSubmit, disabled }: ExamFormProps) {
  const [answers, setAnswers] = useState<Record<string, string>>({});

  function setAnswer(questionId: string, value: string) {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    onSubmit(answers);
  }

  return (
    <form onSubmit={handleSubmit}>
      {questions.map((question, index) => (
        <fieldset className="exam-question" key={question.id}>
          <legend>
            Question {index + 1}: {question.questionMd}
          </legend>
          {question.questionType === 'multiple_choice' && question.choices ? (
            <div className="option-list">
              {question.choices.map((choice) => (
                <label className="option" key={choice}>
                  <input
                    type="radio"
                    name={question.id}
                    value={choice}
                    checked={answers[question.id] === choice}
                    onChange={() => setAnswer(question.id, choice)}
                    disabled={disabled}
                  />
                  {choice}
                </label>
              ))}
            </div>
          ) : (
            <textarea
              value={answers[question.id] ?? ''}
              onChange={(event) => setAnswer(question.id, event.target.value)}
              rows={3}
              disabled={disabled}
            />
          )}
        </fieldset>
      ))}
      <button type="submit" className="btn btn--primary" disabled={disabled}>
        {disabled ? 'Grading...' : 'Submit answers'}
      </button>
    </form>
  );
}
