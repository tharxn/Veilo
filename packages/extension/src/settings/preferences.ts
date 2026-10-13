export interface VeiloPreferences {
  protectionEnabled: boolean;
  showStatusToast: boolean;
  theme: 'everyday' | 'developer';
  disabledSites: string[];
  disabledLabels: string[];
}

export const DEFAULT_PREFERENCES: VeiloPreferences = {
  protectionEnabled: true, showStatusToast: true, theme: 'everyday',
  disabledSites: [], disabledLabels: [],
};

export const AI_SITES = [
  { id: 'chatgpt', name: 'ChatGPT', domains: ['chatgpt.com', 'chat.openai.com'] },
  { id: 'claude', name: 'Claude', domains: ['claude.ai'] },
  { id: 'gemini', name: 'Gemini', domains: ['gemini.google.com'] },
  { id: 'copilot', name: 'Microsoft Copilot', domains: ['copilot.microsoft.com', 'copilot.com'] },
  { id: 'meta', name: 'Meta AI', domains: ['meta.ai'] },
  { id: 'deepseek', name: 'DeepSeek', domains: ['deepseek.com'] },
  { id: 'perplexity', name: 'Perplexity', domains: ['perplexity.ai'] },
  { id: 'grok', name: 'Grok', domains: ['grok.com', 'x.com'] },
  { id: 'poe', name: 'Poe', domains: ['poe.com'] },
  { id: 'qwen', name: 'Qwen', domains: ['qwen.ai'] },
  { id: 'mistral', name: 'Le Chat by Mistral', domains: ['mistral.ai'] },
  { id: 'you', name: 'You.com', domains: ['you.com'] },
  { id: 'character', name: 'Character.AI', domains: ['character.ai'] },
  { id: 'huggingchat', name: 'HuggingChat', domains: ['huggingface.co', 'huggingchat.com'] },
  { id: 'kimi', name: 'Kimi', domains: ['kimi.com', 'kimi.ai'] },
  { id: 'pi', name: 'Pi', domains: ['pi.ai'] },
  { id: 'zai', name: 'Z.ai', domains: ['z.ai'] },
  { id: 'openrouter', name: 'OpenRouter', domains: ['openrouter.ai'] },
  { id: 'aistudio', name: 'Google AI Studio', domains: ['aistudio.google.com'] },
  { id: 'other', name: 'Other recognized AI chats', domains: [] },
];

export const DETECTION_LABELS = [
  { id: 'email', name: 'Email addresses', description: 'Personal and work email addresses.', group: 'Personal information', types: ['Email'] },
  { id: 'person', name: 'Names', description: 'Names introduced with a name label.', group: 'Personal information', types: ['Person'] },
  { id: 'phone', name: 'Phone numbers', description: 'Labeled phone numbers and Indian mobile numbers.', group: 'Personal information', types: ['Phone Number', 'Indian Mobile'] },
  { id: 'address', name: 'Addresses', description: 'Addresses introduced with an address label.', group: 'Personal information', types: ['Address'] },
  { id: 'dob', name: 'Dates of birth', description: 'Values labeled as date of birth or DOB.', group: 'Personal information', types: ['Date of Birth'] },
  { id: 'pin', name: 'PIN codes', description: 'Labeled PIN and postal code values.', group: 'Personal information', types: ['PIN Code'] },
  { id: 'api', name: 'API keys', description: 'Provider keys and values labeled as API or access keys.', group: 'Secrets & credentials', types: ['API Key'] },
  { id: 'password', name: 'Passwords', description: 'Passwords, passcodes, and password fields.', group: 'Secrets & credentials', types: ['Password'] },
  { id: 'secret', name: 'Secrets', description: 'Client secrets and labeled secret values.', group: 'Secrets & credentials', types: ['Secret'] },
  { id: 'token', name: 'Tokens', description: 'Access, bearer, and other labeled token values.', group: 'Secrets & credentials', types: ['Token'] },
  { id: 'credential', name: 'Credentials', description: 'Values explicitly labeled as credentials.', group: 'Secrets & credentials', types: ['Credential'] },
  { id: 'privatekey', name: 'Private keys', description: 'Labeled private keys and PEM private-key blocks.', group: 'Secrets & credentials', types: ['Private Key'] },
  { id: 'jwt', name: 'JSON Web Tokens', description: 'JWT strings with a recognizable token structure.', group: 'Secrets & credentials', types: ['JWT'] },
  { id: 'aadhaar', name: 'Aadhaar numbers', description: 'Aadhaar formats and labeled Aadhaar values.', group: 'Identity documents', types: ['Aadhaar'] },
  { id: 'pan', name: 'PAN numbers', description: 'PAN formats and labeled PAN values.', group: 'Identity documents', types: ['PAN'] },
  { id: 'ssn', name: 'Social Security numbers', description: 'Values labeled as SSN or Social Security.', group: 'Identity documents', types: ['SSN'] },
  { id: 'passport', name: 'Passport numbers', description: 'Values labeled as passport numbers.', group: 'Identity documents', types: ['Passport'] },
  { id: 'license', name: 'Driver’s licenses', description: 'Values labeled as a driver’s license.', group: 'Identity documents', types: ["Driver's License"] },
  { id: 'national', name: 'National IDs', description: 'Values labeled as national identification.', group: 'Identity documents', types: ['National ID'] },
  { id: 'tax', name: 'Tax IDs', description: 'Values labeled as tax identification.', group: 'Identity documents', types: ['Tax ID'] },
  { id: 'card', name: 'Card numbers', description: 'Card formats and labeled card values.', group: 'Financial information', types: ['Card Number'] },
  { id: 'bank', name: 'Bank accounts', description: 'Account numbers with bank or account context.', group: 'Financial information', types: ['Bank Account'] },
  { id: 'ifsc', name: 'IFSC codes', description: 'Indian bank routing codes.', group: 'Financial information', types: ['IFSC'] },
  { id: 'upi', name: 'UPI IDs', description: 'Recognizable UPI payment addresses.', group: 'Financial information', types: ['UPI ID'] },
];

function knownIds(value: unknown, allowed: string[]): string[] {
  return Array.isArray(value) ? [...new Set(value.filter((id): id is string => typeof id === 'string' && allowed.includes(id)))] : [];
}

export function normalizePreferences(value: Record<string, unknown>): VeiloPreferences {
  return {
    protectionEnabled: value.protectionEnabled !== false,
    showStatusToast: value.showStatusToast !== false,
    theme: value.theme === 'developer' ? 'developer' : 'everyday',
    disabledSites: knownIds(value.disabledSites, AI_SITES.map(site => site.id)),
    disabledLabels: knownIds(value.disabledLabels, DETECTION_LABELS.map(label => label.id)),
  };
}

export function siteIdForUrl(url: URL): string {
  const host = url.hostname.toLowerCase();
  // Use the dedicated adapter's setting for the local development fixtures.
  if (host === 'localhost' || host === '127.0.0.1' || url.protocol === 'file:') {
    const path = url.pathname.toLowerCase();
    if (path.includes('claude')) return 'claude';
    if (path.includes('gemini')) return 'gemini';
    if (path.includes('copilot')) return 'copilot';
    return path.includes('generic-ai') ? 'other' : 'chatgpt';
  }
  return AI_SITES.find(site => site.domains.some(domain => host === domain || host.endsWith(`.${domain}`)))?.id || 'other';
}

export function disabledEntityTypes(preferences: VeiloPreferences): string[] {
  return DETECTION_LABELS.filter(label => preferences.disabledLabels.includes(label.id)).flatMap(label => label.types);
}
