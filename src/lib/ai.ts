import type { Category, Priority } from './types';
// RULE-BASED algorithms. No machine-learning model is trained or called anywhere in this app.
const KW: Record<Exclude<Category, 'General'>, string[]> = {
  Roads: ['pothole', 'road', 'footpath', 'pavement', 'traffic', 'signal', 'speed breaker', 'crack', 'bridge', 'manhole'],
  Water: ['water', 'leak', 'pipe', 'tap', 'sewage', 'drain', 'flood', 'supply', 'contaminated'],
  Electricity: ['electric', 'power', 'streetlight', 'street light', 'transformer', 'wire', 'voltage', 'outage', 'pole', 'cable'],
  Garbage: ['garbage', 'trash', 'waste', 'dump', 'litter', 'bin', 'smell', 'sanitation', 'rubbish'],
  'Public Safety': ['unsafe', 'theft', 'harass', 'crime', 'fight', 'stray', 'dog', 'fire', 'accident', 'drunk', 'dark', 'police'],
};
const HIGH = ['live wire', 'sparking', 'accident', 'injur', 'fire', 'open manhole', 'flood', 'burst', 'hospital', 'school', 'children', 'electrocut', 'exposed'];
const MED = ['leak', 'broken', 'overflow', 'blocked', 'pothole', 'outage', 'not working', 'contaminated', 'stray'];
const STOP = new Set('the a an is are was in on at of to and for with near from this that it its has have been very not no'.split(' '));
export interface Suggestion { category: Category; priority: Priority; why: string[]; confidence: number }

export function classify(text: string): Suggestion | null {
  const t = text.toLowerCase();
  if (t.trim().length < 8) return null;
  let best = 'General' as Category, bs = 0, hitsBest: string[] = [];
  (Object.keys(KW) as (keyof typeof KW)[]).forEach((c) => {
    const m = KW[c].filter((k) => t.includes(k));
    if (m.length > bs) { bs = m.length; best = c; hitsBest = m; }
  });
  const hi = HIGH.filter((k) => t.includes(k)), md = MED.filter((k) => t.includes(k));
  const dur = /(\d+|several|many)\s*(days|weeks|months)|since (last )?(week|month)/.test(t);
  const score = hi.length * 3 + md.length + (dur ? 1 : 0) + (best === 'Public Safety' ? 1 : 0);
  const priority: Priority = score >= 3 ? 'High' : score >= 1 ? 'Medium' : 'Low';
  const q = (a: string[]) => a.map((k) => `“${k}”`).join(', ');
  const why = [bs ? `Category “${best}”: matched keywords ${q(hitsBest)}.` : 'No category keywords matched, so the category is “General”. You can change it.'];
  if (hi.length) why.push(`High-risk terms found: ${q(hi)} (+3 each).`);
  if (md.length) why.push(`Service-disruption terms: ${q(md)} (+1 each).`);
  if (dur) why.push('The text mentions a long duration (+1).');
  if (!hi.length && !md.length && !dur) why.push('No urgency terms found, so priority defaults to Low.');
  why.push(`Priority score ${score} → ${priority} (High ≥ 3, Medium ≥ 1).`);
  return { category: best, priority, why, confidence: bs ? Math.min(95, 50 + bs * 15) : 0 };
}

const toks = (s: string) => new Set(s.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter((w) => w.length > 2 && !STOP.has(w)));
export interface SimilarityInfo { score: number; shared: string[]; sameLocation: boolean; sameCategory: boolean }
interface Comparable { description: string; location: string; category: string }
// Word-overlap (Jaccard) similarity with an explanation of what is shared
export function similarity(a: Comparable, b: Comparable): SimilarityInfo {
  const A = toks(a.description), B = toks(b.description);
  const shared = [...A].filter((w) => B.has(w));
  const u = A.size + B.size - shared.length;
  const j = u ? shared.length / u : 0;
  const sameLocation = a.location.trim().toLowerCase() === b.location.trim().toLowerCase();
  const sameCategory = a.category === b.category;
  const score = Math.min(1, sameLocation && sameCategory ? Math.max(j, 0.4) + 0.2 : j);
  return { score, shared, sameLocation, sameCategory };
}
export const explainSimilarity = (s: SimilarityInfo) => [
  s.shared.length ? `share ${s.shared.length} key word(s): ${s.shared.slice(0, 6).join(', ')}` : 'share no key words',
  s.sameLocation ? 'same location' : null, s.sameCategory ? 'same category' : null,
].filter(Boolean).join(' · ');
