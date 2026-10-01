import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AI_PROVIDER_CATALOG } from '@pytho-trainer/shared';
import { getSettings, updateSettings } from '../api/client';

export function ProviderSelector() {
  const queryClient = useQueryClient();
  const { data } = useQuery({ queryKey: ['settings'], queryFn: getSettings });

  const switchProvider = useMutation({
    mutationFn: (provider: string) => updateSettings(provider),
    onSuccess: (result) => queryClient.setQueryData(['settings'], result),
  });

  if (!data) return null;

  const titleFor = (id: string) =>
    AI_PROVIDER_CATALOG.find((entry) => entry.id === id)?.title ?? id;

  return (
    <select
      className="provider-selector"
      aria-label="AI provider"
      title="Which AI provider powers generation and grading"
      value={data.currentProvider}
      disabled={switchProvider.isPending}
      onChange={(e) => switchProvider.mutate(e.target.value)}
    >
      {data.availableProviders.map((provider) => (
        <option key={provider} value={provider}>
          {titleFor(provider)}
        </option>
      ))}
    </select>
  );
}
