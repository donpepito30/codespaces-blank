const USER_AGENT = 'AndesRadar/1.0 (+public-job-search)';
const SOURCES = {
  impactpool: { label: 'Impactpool', origin: 'https://www.impactpool.org', search: 'https://www.impactpool.org/search', pattern: /\/jobs\/\d+/i },
  unjobnet: { label: 'UNJobNet', origin: 'https://www.unjobnet.org', search: 'https://www.unjobnet.org/jobs', pattern: /\/jobs\/[^"'#?]+/i },
  oas: { label: 'OEA/CIDH', origin: 'https://www.oas.org', search: 'https://www.oas.org/es/cidh/jsForm/?File=/es/cidh/empleos/empleos.asp', pattern: /\/es\/cidh\/empleos\/[^"'#?]+\.asp/i },
  unicef: { label: 'UNICEF', origin: 'https://jobs.unicef.org', search: 'https://jobs.unicef.org/en-us/listing/', pattern: /\/en-us\/job\/\d+\/[^"'#?]+/i },
  unfpa: { label: 'UNFPA Ecuador', origin: 'https://ecuador.unfpa.org', search: 'https://ecuador.unfpa.org/es/vacancies?field_date_value=2026&title=', pattern: /\/es\/vacancies\/[^"'#?]+/i },
  unmejor: { label: 'Un Mejor Empleo', origin: 'https://www.unmejorempleo.com.ec', search: 'https://www.unmejorempleo.com.ec/empleos', pattern: /empleo-en-[^"'#?]+\.html/i }
};
const SOURCE_GROUPS = {
  local: ['computrabajo', 'oas', 'unfpa', 'unmejor'],
  international: ['impactpool', 'unjobnet', 'unicef']
};
const SKILL_TERMS = ['psicologia', 'psicologia familiar', 'psicoterapia', 'terapia familiar', 'salud mental', 'intervencion en crisis', 'orientacion familiar', 'evaluacion psicologica', 'psicologia clinica', 'psicologia educativa', 'trabajo social', 'mediacion', 'violencia de genero', 'proteccion infantil', 'derechos humanos', 'acompanamiento psicosocial', 'consejeria', 'recursos humanos', 'project management', 'excel', 'sql', 'python', 'javascript', 'react', 'java', 'aws', 'docker', 'marketing', 'seo', 'analytics', 'liderazgo'];

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
  const description = decodeHtml(posting.description || '');
  const searchable = `${posting.title || ''} ${description}`.toLowerCase();
  const skills = SKILL_TERMS.filter((skill) => searchable.includes(skill));
  return { title: decodeHtml(posting.title || 'Vacante'), company: decodeHtml(company || source.label), location: decodeHtml(address || 'Ecuador'), mode: posting.jobLocationType === 'TELECOMMUTE' ? 'Remoto' : 'Presencial', source: source.label, skills, posted: posting.datePosted || 'Reciente', url: posting.url || fallbackUrl, description: description.slice(0, 500) };
}

async function fetchText(url) {
  const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT, Accept: 'text/html' } });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.text();
}

async function fetchFormText(url, fields) {
  const response = await fetch(url, { method: 'POST', headers: { 'User-Agent': USER_AGENT, Accept: 'text/html', 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(fields) });
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

async function fetchUnMejorEmpleo(query) {
  const source = SOURCES.unmejor;
  const html = await fetchFormText(source.search, { palabra_clave: query, ubicacion: 'Ecuador', enviado: '1' });
  const jobs = [];
  for (const match of html.matchAll(/href=["'](empleo-en-[^"'#?]+\.html)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    const title = decodeHtml(match[2]);
    if (!title || /ver oferta|empresa|provincia/i.test(title)) continue;
    const start = Math.max(0, match.index - 100);
    const context = decodeHtml(html.slice(start, match.index + match[0].length + 700));
    const location = context.match(/Ubicaci[oó]n:\s*([^|]+)\|\s*Provincia\s*:\s*([^<]+)/i);
    jobs.push({ title, company: source.label, location: location ? `${location[1].trim()}, ${location[2].trim()}` : 'Ecuador', mode: 'No especificada', source: source.label, skills: SKILL_TERMS.filter((skill) => `${title} ${context}`.toLowerCase().includes(skill)), posted: 'Reciente', url: new URL(match[1], source.origin).href, description: context.slice(0, 500) });
    if (jobs.length === 10) break;
  }
  return jobs;
}

export async function onRequestGet(context) {
  const params = new URL(context.request.url).searchParams;
  const query = params.get('q')?.trim() || 'empleo';
  const requested = params.get('source') || 'all';
  if (query.length > 160) return Response.json({ error: 'La búsqueda es demasiado larga.' }, { status: 400 });
  const keys = requested === 'all' ? ['computrabajo', ...Object.keys(SOURCES)] : SOURCE_GROUPS[requested] || [requested];
  if (!SOURCE_GROUPS[requested] && requested !== 'all' && !SOURCES[requested] && requested !== 'computrabajo') return Response.json({ error: 'Fuente no soportada.' }, { status: 400 });

  const cacheUrl = new URL(context.request.url);
  cacheUrl.search = `?q=${encodeURIComponent(query.toLowerCase())}&source=${encodeURIComponent(requested)}`;
  const cacheKey = new Request(cacheUrl.toString(), { method: 'GET' });
  const edgeCache = caches.default;
  const cached = await edgeCache.match(cacheKey);
  if (cached) return new Response(cached.body, { status: cached.status, headers: { ...Object.fromEntries(cached.headers), 'X-Andes-Cache': 'HIT' } });
  const results = await Promise.allSettled(keys.map((key) => key === 'computrabajo' ? fetchComputrabajo(query) : key === 'unmejor' ? fetchUnMejorEmpleo(query) : fetchSource(key, query)));
  const jobs = results.flatMap((result) => result.status === 'fulfilled' ? result.value : []);
  const errors = results.map((result, index) => result.status === 'rejected' ? { source: keys[index], error: result.reason.message } : null).filter(Boolean);
  const response = Response.json({ query, jobs, errors, fetchedAt: new Date().toISOString(), refreshAfter: new Date(Date.now() + 14400000).toISOString() }, { headers: { 'Cache-Control': 'public, max-age=60, s-maxage=14400', 'X-Andes-Cache': 'MISS' } });
  context.waitUntil(edgeCache.put(cacheKey, response.clone()));
  return response;
}
