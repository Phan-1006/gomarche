import { Router } from 'express';
import { GoogleGenAI } from '@google/genai';
import type { LensSuggestion } from '../src/types';
import { AuthedRequest, lensLimiter, requireRole, str } from './security';

type LensImage = LensSuggestion['images'][number];

const UA = { 'User-Agent': 'Gomarche/1.0 (catalogue produits; +https://gomarche.cd)' };

async function getJson(url: string): Promise<any> {
  const r = await fetch(url, { headers: UA, signal: AbortSignal.timeout(12000) });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

// Base mondiale de produits d'épicerie, avec photos d'emballage nettes.
async function searchOpenFoodFacts(query: string): Promise<LensImage[]> {
  const data = await getJson(
    `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=10&fields=product_name,brands,image_front_url,image_front_small_url`
  );
  return (data.products || [])
    .filter((p: any) => typeof p.image_front_url === 'string' && p.image_front_url.startsWith('https://'))
    .map((p: any) => ({
      url: p.image_front_url,
      thumb: p.image_front_small_url || p.image_front_url,
      source: 'Open Food Facts',
      title: [p.brands, p.product_name].filter(Boolean).join(' – '),
    }));
}

// Photos sous licence libre (Creative Commons).
async function searchOpenverse(query: string): Promise<LensImage[]> {
  const data = await getJson(`https://api.openverse.org/v1/images/?q=${encodeURIComponent(query)}&page_size=10&mature=false`);
  return (data.results || [])
    .filter((r: any) => typeof r.url === 'string' && r.url.startsWith('https://'))
    .map((r: any) => ({ url: r.url, thumb: r.thumbnail || r.url, source: `Openverse (${r.license || 'CC'})`, title: r.title }));
}

async function searchCommons(query: string): Promise<LensImage[]> {
  const data = await getJson(
    `https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search&gsrnamespace=6&gsrlimit=8&gsrsearch=${encodeURIComponent(
      `${query} filetype:bitmap`
    )}&prop=imageinfo&iiprop=url&iiurlwidth=800`
  );
  return Object.values<any>(data.query?.pages || {})
    .map((p) => ({ info: p.imageinfo?.[0], title: String(p.title || '').replace(/^File:/, '') }))
    .filter((p) => p.info?.thumburl?.startsWith('https://'))
    .map((p) => ({ url: p.info.thumburl, thumb: p.info.thumburl, source: 'Wikimedia Commons', title: p.title }));
}

async function findImages(queries: string[]): Promise<LensImage[]> {
  const jobs = queries.slice(0, 2).flatMap((q) => [searchOpenFoodFacts(q), searchOpenverse(q), searchCommons(q)]);
  const settled = await Promise.allSettled(jobs);
  const seen = new Set<string>();
  const images: LensImage[] = [];
  for (const s of settled) {
    if (s.status !== 'fulfilled') continue;
    for (const img of s.value) {
      if (!seen.has(img.url)) {
        seen.add(img.url);
        images.push(img);
      }
    }
  }
  return images.slice(0, 24);
}

const PROMPT = `Tu aides un agent de supermarché à Goma (RDC) à créer une fiche produit à partir d'une photo.
Identifie le produit principal visible. Réponds UNIQUEMENT en JSON avec ces champs :
{"name": "nom commercial en français, avec le format si lisible (ex: Lait Nido 400g)",
 "brand": "marque ou chaîne vide",
 "unit": "conditionnement (ex: la boîte 400g, le kg, la bouteille 1.5L)",
 "description": "une ou deux phrases de présentation pour la boutique",
 "queries": ["2 requêtes courtes pour retrouver une photo propre du produit, la première avec la marque, la seconde générique en anglais"]}
Si tu ne reconnais pas le produit, décris-le de façon générique (ex: "Tomates fraîches").`;

async function identify(base64: string, mimeType: string) {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
  const response = await ai.models.generateContent({
    model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
    contents: [{ role: 'user', parts: [{ inlineData: { mimeType, data: base64 } }, { text: PROMPT }] }],
    config: { responseMimeType: 'application/json', temperature: 0.2 },
  });
  const parsed = JSON.parse(response.text || '{}');
  return {
    name: str(parsed.name, 120),
    brand: str(parsed.brand, 60),
    unit: str(parsed.unit, 40),
    description: str(parsed.description, 600),
    queries: (Array.isArray(parsed.queries) ? parsed.queries : []).map((q: unknown) => str(q, 80)).filter(Boolean) as string[],
  };
}

export const lensRouter = Router();
const staff = requireRole('admin', 'category_agent');

// Recherche de photos par nom de produit (fonctionne sans clé d'IA).
lensRouter.post('/lens/search', lensLimiter, staff, async (req: AuthedRequest, res) => {
  const query = str(req.body?.query, 80);
  if (query.length < 2) return res.status(400).json({ error: 'Saisissez le nom du produit à rechercher.' });
  // Une requête trop précise ne donne souvent rien : on tente aussi ses deux premiers mots.
  const short = query.split(/\s+/).slice(0, 2).join(' ');
  const images = await findImages(short !== query ? [query, short] : [query]);
  res.json({ images } satisfies LensSuggestion);
});

// Photo prise par l'agent → identification du produit → propositions de photos propres.
// La photo de l'agent n'est pas conservée : elle sert uniquement à l'identification.
lensRouter.post('/lens/identify', lensLimiter, staff, async (req: AuthedRequest, res) => {
  if (!process.env.GEMINI_API_KEY) {
    return res.status(503).json({ error: 'La reconnaissance photo n’est pas activée (clé GEMINI_API_KEY absente). Utilisez la recherche par nom.' });
  }
  const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(String(req.body?.imageBase64 || ''));
  if (!match) return res.status(400).json({ error: 'Photo invalide.' });
  try {
    const found = await identify(match[2], match[1]);
    const queries = found.queries.length ? found.queries : [[found.brand, found.name].filter(Boolean).join(' ')];
    const images = queries[0] ? await findImages(queries) : [];
    res.json({ name: found.name, brand: found.brand, unit: found.unit, description: found.description, images } satisfies LensSuggestion);
  } catch (e) {
    console.error('Lens:', e);
    res.status(502).json({ error: 'Impossible d’identifier le produit pour le moment. Réessayez ou utilisez la recherche par nom.' });
  }
});
