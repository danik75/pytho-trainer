export interface DomainCatalogEntry {
  slug: string;
  title: string;
  description: string;
}

export const DOMAIN_CATALOG: readonly DomainCatalogEntry[] = [
  {
    slug: 'ml',
    title: 'Machine Learning',
    description:
      'NumPy/pandas fundamentals, model training workflows, and ML-flavored Python idioms.',
  },
  {
    slug: 'backend',
    title: 'Backend Development',
    description: 'APIs, databases, concurrency, and building server-side Python applications.',
  },
  {
    slug: 'annotations',
    title: 'Type Annotations & Typing',
    description: 'Type hints, generics, protocols, and static typing tools like mypy.',
  },
  {
    slug: 'ai',
    title: 'AI / LLM Engineering',
    description:
      'Working with LLM APIs, prompt/agent patterns, and AI application plumbing in Python.',
  },
  {
    slug: 'data-analysis',
    title: 'Data Analysis',
    description: 'Data wrangling, pandas, visualization, and exploratory analysis workflows.',
  },
  {
    slug: 'web-frontend',
    title: 'Web Frontend (Python-served)',
    description: 'Templating, HTMX-style server-rendered UIs, and Python web frameworks.',
  },
] as const;

export type DomainSlug = (typeof DOMAIN_CATALOG)[number]['slug'];

export function isKnownDomainSlug(slug: string): boolean {
  return DOMAIN_CATALOG.some((entry) => entry.slug === slug);
}
