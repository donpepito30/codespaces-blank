const USER_AGENT = 'AndesRadar/1.0 (+public-job-search)';
const SOURCES = {
  impactpool: { label: 'Impactpool', origin: 'https://www.impactpool.org', search: 'https://www.impactpool.org/search', pattern: /\/jobs\/\d+/i },
  unjobnet: { label: 'UNJobNet', origin: 'https://www.unjobnet.org', search: 'https://www.unjobnet.org/jobs', pattern: /\/jobs\/[^"'#?]+/i },
  oas: { label: 'OEA/CIDH', origin: 'https://www.oas.org', search: 'https://www.oas.org/es/cidh/jsForm/?File=/es/cidh/empleos/empleos.asp', pattern: /\/es\/cidh\/empleos\/[^"'#?]+\.asp/i },
  unicef: { label: 'UNICEF', origin: 'https://jobs.unicef.org', search: 'https://jobs.unicef.org/en-us/listing/', pattern: /\/en-us\/job\/\d+\/[^"'#?]+/i },
  unfpa: { label: 'UNFPA Ecuador', origin: 'https://ecuador.unfpa.org', search: 'https://ecuador.unfpa.org/es/vacancies?field_date_value=2026&title=', pattern: /\/es\/vacancies\/[^"'#?]+/i }
};

function decodeHtml(value) {
  return value.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'").replace(/&#xF1;|&#241;/gi, 'ñ').replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function slug(value) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function jsonLdBlocks(html) {
  return [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)].flatMap((match) => {
    try { const parsed = JSON.parse(match[1]); return Array.isArray(parsed) ? parsed : [parsed]; } catch { return []; }
  });
}

function normalizePosting(posting, source, fallbackUrl) {
  const location = posting.jobLocation?.address || posting.jobLocation;
  const address = typeof location === 'string' ? location : [location?.addressLocality, location?.addressRegion].filter(Boolean).join(', ');
  const company = typeof posting.hiringOrganization === 'string' ? posting.hiringOrganization : posting.hiringOrganization?.name;
  return { title: decodeHtml(posting.title || 'Vacante'), company: decodeHtml(company || source.label), location: decodeHtml(address || 'Ecuador'), mode: posting.jobLocationType === 'TELECOMMUTE' ? 'Remoto' : 'Presencial', source: source.label, skills: [], posted: posting.datePosted || 'Reciente', url: posting.url || fallbackUrl, description: decodeHtml(posting.description || '').slice(0, 500) };
}

async function fetchText(url) {
  const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT, Accept: 'text/html' } });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.text();
}

function extractLinks(html, source) {
  const links = [...html.matchAll(/href=["']([^"'#?]+)["']/gi)].map((match) => match[1]).filter((path) => source.pattern.test(path));
  return [...new Set(links)].slice(0, 20).map((path) => new URL(path, source.origin).href);
}

function titleFromUrl(url, source) {
  const value = new URL(url).pathname.split('/').pop().replace(/[-_]+/g, ' ').replace(/\d{4,}/g, '').trim();
  return decodeHtml(value || `Vacante en ${source.label}`).slice(0, 160);
}

async function fetchSource(key, query) {
  const source = SOURCES[key];
  let url = source.search;
  if (key === 'unjobnet') url += `?keywords=${encodeURIComponent(query)}`;
  if (key === 'unfpa') url += encodeURIComponent(query);
  if (key === 'impactpool') url += `?q=${encodeURIComponent(query)}`;
  const html = await fetchText(url);
  const links = extractLinks(html, source);
  const jobs = [];
  for (const link of links.slice(0, 10)) {
    try {
      const detail = await fetchText(link);
      const posting = jsonLdBlocks(detail).find((item) => item['@type'] === 'JobPosting');
      jobs.push(posting ? normalizePosting(posting, source, link) : { title: titleFromUrl(link, source), company: source.label, location: 'Ecuador', mode: 'No especificada', source: source.label, skills: [], posted: 'Reciente', url: link, description: '' });
    } catch {
      jobs.push({ title: titleFromUrl(link, source), company: source.label, location: 'Ecuador', mode: 'No especificada', source: source.label, skills: [], posted: 'Reciente', url: link, description: '' });
    }
  }
  return jobs;
}

async function fetchComputrabajo(query) {
  const source = { label: 'Computrabajo', origin: 'https://ec.computrabajo.com' };
  const html = await fetchText(`${source.origin}/trabajo-de-${slug(query)}`);
  const links = [...new Set([...html.matchAll(/href=["'](\/ofertas-de-trabajo\/oferta-de-trabajo-[^"'#?]+)["']/gi)].map((match) => `${source.origin}${match[1]}`))].slice(0, 10);
  const jobs = [];
  for (const link of links) {
    try {
      const detail = await fetchText(link);
      const posting = jsonLdBlocks(detail).find((item) => item['@type'] === 'JobPosting');
      if (posting) jobs.push(normalizePosting(posting, source, link));
    } catch { /* La oferta pudo caducar entre la búsqueda y el detalle. */ }
  }
  return jobs;
}

export async function onRequestGet(context) {
  const params = new URL(context.request.url).searchParams;
  const query = params.get('q')?.trim() || 'empleo';
  const requested = params.get('source') || 'all';
  if (query.length > 80) return Response.json({ error: 'La búsqueda es demasiado larga.' }, { status: 400 });
  const keys = requested === 'all' ? ['computrabajo', ...Object.keys(SOURCES)] : [requested];
  if (requested !== 'all' && !SOURCES[requested] && requested !== 'computrabajo') return Response.json({ error: 'Fuente no soportada.' }, { status: 400 });
  const results = await Promise.allSettled(keys.map((key) => key === 'computrabajo' ? fetchComputrabajo(query) : fetchSource(key, query)));
  const jobs = results.flatMap((result) => result.status === 'fulfilled' ? result.value : []);
  const errors = results.map((result, index) => result.status === 'rejected' ? { source: keys[index], error: result.reason.message } : null).filter(Boolean);
  return Response.json({ query, jobs, errors, fetchedAt: new Date().toISOString() }, { headers: { 'Cache-Control': 'public, max-age=300, s-maxage=900' } });
}
