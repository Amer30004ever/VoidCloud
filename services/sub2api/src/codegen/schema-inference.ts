export interface InferredField {
  name: string;
  /** Postgres column type */
  sqlType: string;
  /** TypeScript type */
  tsType: 'string' | 'number' | 'boolean';
  /** HTML input type for the generated form */
  inputType: 'text' | 'textarea' | 'number' | 'checkbox' | 'date' | 'email' | 'url';
  required: boolean;
}

export interface InferredEntity {
  /** singular lower-case, e.g. "task" */
  name: string;
  /** plural snake_case table name, e.g. "tasks" */
  table: string;
  /** PascalCase, e.g. "Task" */
  pascal: string;
  /** Plural PascalCase, e.g. "Tasks" */
  pascalPlural: string;
  /** Human label, e.g. "Task" */
  label: string;
  fields: InferredField[];
}

export interface InferredSchema {
  entities: InferredEntity[];
  /** true when the description asked for authentication */
  auth: boolean;
}

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'app', 'application', 'with', 'and', 'or', 'for', 'of', 'to', 'in', 'on',
  'that', 'which', 'has', 'have', 'having', 'each', 'per', 'my', 'their', 'its', 'build', 'create',
  'make', 'simple', 'basic', 'small', 'system', 'platform', 'tool', 'website', 'site', 'dashboard',
  'manage', 'management', 'tracking', 'tracker', 'user', 'users', 'auth', 'authentication', 'login',
  'signup', 'page', 'pages', 'view', 'views', 'list', 'crud', 'data', 'from', 'by', 'can', 'should',
  'where', 'when', 'they', 'them', 'it', 'is', 'are', 'be', 'as', 'at', 'into', 'about', 'also',
]);

const IRREGULAR_PLURALS: Record<string, string> = {
  person: 'people',
  child: 'children',
  man: 'men',
  woman: 'women',
  mouse: 'mice',
  goose: 'geese',
};

const IRREGULAR_SINGULARS: Record<string, string> = Object.fromEntries(
  Object.entries(IRREGULAR_PLURALS).map(([s, p]) => [p, s]),
);

export function singularize(word: string): string {
  const lower = word.toLowerCase();
  if (IRREGULAR_SINGULARS[lower]) return IRREGULAR_SINGULARS[lower];
  if (lower.endsWith('ies') && lower.length > 4) return `${lower.slice(0, -3)}y`;
  if (lower.endsWith('ses') || lower.endsWith('xes') || lower.endsWith('zes') || lower.endsWith('ches') || lower.endsWith('shes')) {
    return lower.slice(0, -2);
  }
  if (lower.endsWith('s') && !lower.endsWith('ss') && !lower.endsWith('us')) return lower.slice(0, -1);
  return lower;
}

export function pluralize(word: string): string {
  const lower = word.toLowerCase();
  if (IRREGULAR_PLURALS[lower]) return IRREGULAR_PLURALS[lower];
  if (/[^aeiou]y$/.test(lower)) return `${lower.slice(0, -1)}ies`;
  if (/(s|x|z|ch|sh)$/.test(lower)) return `${lower}es`;
  return `${lower}s`;
}

export function pascalCase(word: string): string {
  return word
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join('');
}

/** Field presets keyed by the entity noun, so common apps get sensible columns. */
const ENTITY_FIELD_PRESETS: Record<string, InferredField[]> = {
  task: [
    field('title', 'text', 'string', 'text', true),
    field('description', 'text', 'string', 'textarea', false),
    field('status', 'text', 'string', 'text', false),
    field('due_date', 'date', 'string', 'date', false),
    field('completed', 'boolean', 'boolean', 'checkbox', false),
  ],
  todo: [
    field('title', 'text', 'string', 'text', true),
    field('notes', 'text', 'string', 'textarea', false),
    field('completed', 'boolean', 'boolean', 'checkbox', false),
  ],
  post: [
    field('title', 'text', 'string', 'text', true),
    field('body', 'text', 'string', 'textarea', false),
    field('published', 'boolean', 'boolean', 'checkbox', false),
  ],
  product: [
    field('name', 'text', 'string', 'text', true),
    field('description', 'text', 'string', 'textarea', false),
    field('price', 'numeric', 'number', 'number', false),
    field('sku', 'text', 'string', 'text', false),
    field('in_stock', 'boolean', 'boolean', 'checkbox', false),
  ],
  customer: [
    field('name', 'text', 'string', 'text', true),
    field('email', 'text', 'string', 'email', false),
    field('phone', 'text', 'string', 'text', false),
    field('company', 'text', 'string', 'text', false),
  ],
  contact: [
    field('name', 'text', 'string', 'text', true),
    field('email', 'text', 'string', 'email', false),
    field('phone', 'text', 'string', 'text', false),
  ],
  invoice: [
    field('number', 'text', 'string', 'text', true),
    field('amount', 'numeric', 'number', 'number', false),
    field('due_date', 'date', 'string', 'date', false),
    field('paid', 'boolean', 'boolean', 'checkbox', false),
  ],
  event: [
    field('title', 'text', 'string', 'text', true),
    field('location', 'text', 'string', 'text', false),
    field('starts_at', 'timestamptz', 'string', 'date', false),
    field('description', 'text', 'string', 'textarea', false),
  ],
  note: [
    field('title', 'text', 'string', 'text', true),
    field('body', 'text', 'string', 'textarea', false),
  ],
  board: [
    field('name', 'text', 'string', 'text', true),
    field('description', 'text', 'string', 'textarea', false),
  ],
  project: [
    field('name', 'text', 'string', 'text', true),
    field('description', 'text', 'string', 'textarea', false),
    field('status', 'text', 'string', 'text', false),
  ],
  order: [
    field('reference', 'text', 'string', 'text', true),
    field('total', 'numeric', 'number', 'number', false),
    field('status', 'text', 'string', 'text', false),
  ],
  lead: [
    field('name', 'text', 'string', 'text', true),
    field('email', 'text', 'string', 'email', false),
    field('source', 'text', 'string', 'text', false),
    field('value', 'numeric', 'number', 'number', false),
  ],
};

function field(
  name: string,
  sqlType: string,
  tsType: InferredField['tsType'],
  inputType: InferredField['inputType'],
  required: boolean,
): InferredField {
  return { name, sqlType, tsType, inputType, required };
}

function defaultFields(): InferredField[] {
  return [
    field('name', 'text', 'string', 'text', true),
    field('description', 'text', 'string', 'textarea', false),
    field('status', 'text', 'string', 'text', false),
  ];
}

/**
 * Infer a data model from a natural-language app description.
 * Deterministic and dependency-free: nouns in the description are matched
 * against known entity presets, falling back to a generic name/description shape.
 */
export function inferSchema(description: string, projectName = ''): InferredSchema {
  const text = `${projectName} ${description || ''}`.toLowerCase();
  const words = text.split(/[^a-zA-Z]+/).filter((w) => w.length > 2 && !STOP_WORDS.has(w));

  const seen = new Set<string>();
  const names: string[] = [];

  // First pass: known presets win, in order of appearance.
  for (const word of words) {
    const singular = singularize(word);
    if (ENTITY_FIELD_PRESETS[singular] && !seen.has(singular)) {
      seen.add(singular);
      names.push(singular);
    }
  }

  // Second pass: plural nouns in the description are likely collections.
  if (names.length < 3) {
    for (const word of words) {
      if (!/s$/.test(word)) continue;
      const singular = singularize(word);
      if (singular.length < 3 || seen.has(singular)) continue;
      seen.add(singular);
      names.push(singular);
      if (names.length >= 3) break;
    }
  }

  if (names.length === 0) {
    const fallback = words.length ? singularize(words[0]) : 'item';
    names.push(fallback.length >= 3 ? fallback : 'item');
  }

  const entities: InferredEntity[] = names.slice(0, 5).map((name) => {
    const pascal = pascalCase(name);
    return {
      name,
      table: pluralize(name).replace(/[^a-z0-9]+/g, '_'),
      pascal,
      pascalPlural: pascalCase(pluralize(name)),
      label: pascal,
      fields: ENTITY_FIELD_PRESETS[name] ?? defaultFields(),
    };
  });

  const auth = /\bauth|login|sign\s?in|sign\s?up|account|user/.test(text);

  return { entities, auth };
}
