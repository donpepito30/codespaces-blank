const demoJobs = [
  { title: 'Analista de datos', company: 'Banco Pichincha', location: 'Quito', mode: 'Híbrido', source: 'Computrabajo', skills: ['sql', 'python', 'excel', 'power bi'], posted: 'Hace 2 días', url: 'https://ec.computrabajo.com/' },
  { title: 'Frontend Developer', company: 'Kushki', location: 'Quito', mode: 'Remoto', source: 'Computrabajo', skills: ['javascript', 'react', 'typescript', 'git'], posted: 'Hace 1 día', url: 'https://ec.computrabajo.com/' },
  { title: 'Especialista de marketing digital', company: 'Pronaca', location: 'Guayaquil', mode: 'Presencial', source: 'Computrabajo', skills: ['marketing', 'seo', 'google ads', 'analytics'], posted: 'Hace 3 días', url: 'https://ec.computrabajo.com/' },
  { title: 'Ingeniero/a de software', company: 'PayPhone', location: 'Cuenca', mode: 'Híbrido', source: 'Computrabajo', skills: ['java', 'spring', 'aws', 'docker'], posted: 'Hace 4 días', url: 'https://ec.computrabajo.com/' },
  { title: 'Coordinador de proyectos', company: 'Grupo Nobis', location: 'Guayaquil', mode: 'Presencial', source: 'Computrabajo', skills: ['project management', 'scrum', 'excel', 'liderazgo'], posted: 'Hace 5 días', url: 'https://ec.computrabajo.com/' }
];

const $ = (selector) => document.querySelector(selector);
const normalize = (value) => value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const knownSkills = [...new Set(demoJobs.flatMap((job) => job.skills).concat(['aws', 'docker', 'kubernetes', 'terraform', 'java', 'spring', 'sql', 'python', 'javascript', 'typescript', 'react', 'git', 'excel', 'power bi', 'figma', 'ux', 'ui', 'research', 'marketing', 'seo', 'analytics', 'scrum', 'agile', 'liderazgo', 'contabilidad', 'niif', 'tributacion', 'project management', 'psicologia', 'psicologia familiar', 'psicoterapia', 'terapia familiar', 'terapia de pareja', 'salud mental', 'intervencion en crisis', 'orientacion familiar', 'evaluacion psicologica', 'psicologia clinica', 'psicologia educativa', 'trabajo social', 'mediacion', 'violencia de genero', 'proteccion infantil', 'derechos humanos', 'primeros auxilios psicologicos', 'acompanamiento psicosocial', 'consejeria', 'investigacion cualitativa', 'recursos humanos']))];
let catalog = [...demoJobs, ...Array.from({ length: 10 }, (_, index) => ({ ...demoJobs[index % demoJobs.length], title: `${demoJobs[index % demoJobs.length].title} · oportunidad ${index + 1}` }))];
let cvText = '';
let activeSource = 'all';
let activeScope = 'all';
const ecuadorLocations = ['Azuay', 'Bolivar', 'Canar', 'Carchi', 'Chimborazo', 'Cotopaxi', 'El Oro', 'Esmeraldas', 'Galapagos', 'Guayas', 'Imbabura', 'Loja', 'Los Rios', 'Manabi', 'Morona Santiago', 'Napo', 'Orellana', 'Pastaza', 'Pichincha', 'Santa Elena', 'Santo Domingo de los Tsachilas', 'Sucumbios', 'Tungurahua', 'Zamora Chinchipe', 'Quito', 'Guayaquil', 'Cuenca', 'Ambato', 'Manta', 'Machala', 'Portoviejo', 'Riobamba', 'Santo Domingo', 'Remoto'];

function score(job) {
  if (!cvText || !job.skills?.length) return null;
  const text = normalize(cvText);
  return Math.round(job.skills.filter((skill) => text.includes(normalize(skill))).length / job.skills.length * 100);
}

function render() {
  const term = normalize($('#searchInput').value);
  const location = $('#locationFilter').value;
  const mode = $('#modeFilter').value;
  const filtered = catalog
    .filter((job) => (activeSource === 'all' || normalize(job.source) === normalize(activeSource)))
    .filter((job) => !term || normalize(`${job.title} ${job.company} ${job.location} ${job.skills?.join(' ')}`).includes(term))
    .filter((job) => location === 'all' || normalize(job.location).includes(normalize(location)))
    .filter((job) => mode === 'all' || job.mode === mode)
    .sort((first, second) => (score(second) || 0) - (score(first) || 0));

  $('#resultCount').textContent = `${filtered.length} resultado${filtered.length === 1 ? '' : 's'}`;
  $('#allCount').textContent = catalog.length;
  $('#computrabajoCount').textContent = catalog.filter((job) => job.source === 'Computrabajo').length;
  $('#heroCount').textContent = catalog.length;
  $('#jobsList').innerHTML = filtered.length ? filtered.map((job) => {
    const match = score(job);
    return `<article class="job-card ${cvText ? 'has-cv' : ''}"><div class="job-card-top"><div><h3>${job.title}</h3><p class="company">${job.company}</p></div><div class="job-source">${job.source}<br><span class="match-score">${match ?? 0}% match</span></div></div><div class="job-meta"><span>⌖ ${job.location}</span><span>◷ ${job.mode}</span><span>${job.posted}</span><a class="apply-link" href="${job.url}" target="_blank" rel="noreferrer">Ver oferta ↗</a></div><div class="job-tags">${(job.skills || []).map((skill) => `<span>${skill}</span>`).join('')}</div></article>`;
  }).join('') : '<div class="empty">No encontramos vacantes con esos filtros. Prueba otra combinación.</div>';
}

function populateLocations() {
  const select = $('#locationFilter');
  select.innerHTML = '<option value="all">Todas las provincias y ciudades</option>';
  ecuadorLocations.forEach((location) => {
    const option = document.createElement('option');
    option.value = location;
    option.textContent = location;
    select.append(option);
  });
}

function addScopeControls() {
  const sourceStrip = document.querySelector('.source-strip');
  const scopeStrip = document.createElement('div');
  scopeStrip.className = 'scope-strip';
  scopeStrip.innerHTML = '<span>ALCANCE</span><button class="scope-chip active" data-scope="all">Todas las fuentes</button><button class="scope-chip" data-scope="local">Ecuador</button><button class="scope-chip" data-scope="international">Internacionales</button>';
  sourceStrip.before(scopeStrip);
  scopeStrip.querySelectorAll('.scope-chip').forEach((chip) => chip.addEventListener('click', () => {
    activeScope = chip.dataset.scope;
    activeSource = 'all';
    document.querySelectorAll('.scope-chip').forEach((item) => item.classList.toggle('active', item === chip));
    document.querySelectorAll('.source-chip').forEach((item, index) => item.classList.toggle('active', index === 0));
    loadLiveJobs(activeScope);
  }));
}

async function loadLiveJobs(scope = activeScope) {
  const query = $('#searchInput').value.trim() || 'empleo';
  $('#resultCount').textContent = 'Consultando fuentes...';
  try {
    const response = await fetch(`/api/search?q=${encodeURIComponent(query)}&source=${encodeURIComponent(scope)}`);
    if (!response.ok) throw new Error('La API de fuentes no está disponible');
    const payload = await response.json();
    if (payload.jobs?.length) {
      catalog = payload.jobs;
      activeSource = 'all';
      render();
    } else {
      catalog = [];
      render();
    }
  } catch (error) {
    $('#resultCount').textContent = `${catalog.length} resultados locales de respaldo`;
    console.warn(error.message);
  }
}

function openPicker() { $('#cvInput').click(); }
['#topUpload', '#heroUpload', '#asideUpload', '#cardUpload'].forEach((id) => $(id).addEventListener('click', openPicker));
['#searchInput', '#locationFilter', '#modeFilter'].forEach((id) => $(id).addEventListener('input', render));
$('#searchInput').addEventListener('keydown', (event) => { if (event.key === 'Enter') loadLiveJobs(); });
$('#clearFilters').addEventListener('click', () => {
  $('#searchInput').value = '';
  $('#locationFilter').value = 'all';
  $('#modeFilter').value = 'all';
  activeSource = 'all';
  document.querySelectorAll('.source-chip').forEach((item, index) => item.classList.toggle('active', index === 0));
  render();
  loadLiveJobs();
});
document.querySelectorAll('.source-chip').forEach((chip) => chip.addEventListener('click', () => {
  activeSource = chip.dataset.source;
  document.querySelectorAll('.source-chip').forEach((item) => item.classList.toggle('active', item === chip));
  loadLiveJobs(activeSource);
}));

async function readFile(file) {
  if (file.type !== 'application/pdf') return file.text();
  const pdfjs = await import('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.min.mjs');
  pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs';
  const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
  let text = '';
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    text += `${content.items.map((item) => item.str).join(' ')} `;
  }
  return text;
}

function extractProfile(text) {
  const normalizedText = normalize(text);
  const skills = knownSkills.filter((skill) => normalizedText.includes(normalize(skill)));
  const roleWords = ['psicologa familiar', 'psicologo familiar', 'psicologa', 'psicologo', 'trabajador social', 'orientador familiar', 'terapeuta', 'analista', 'ingeniero', 'developer', 'desarrollador', 'coordinador', 'manager', 'especialista', 'asistente', 'consultor', 'oficial', 'programme officer', 'administrador'];
  const roles = roleWords.filter((word) => normalizedText.includes(normalize(word)));
  const role = roles[0];
  const context = ['familia', 'infancia', 'adolescencia', 'comunitario', 'clinica', 'educativa', 'ong', 'proyectos', 'emergencias', 'genero', 'refugiados', 'vulnerabilidad'].filter((word) => normalizedText.includes(normalize(word)));
  const query = [...new Set([...roles.slice(0, 2), ...skills.slice(0, 5), ...context.slice(0, 3)])].join(' ') || 'empleo';
  return { skills, role, query: query.slice(0, 150) };
}

$('#cvInput').addEventListener('change', async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) { alert('El archivo supera los 5 MB.'); return; }
  $('#uploadTitle').textContent = 'Analizando tu CV...';
  try {
    cvText = await readFile(file);
    const profile = extractProfile(cvText);
    $('#searchInput').value = profile.query;
    $('#uploadTitle').textContent = file.name;
    $('#uploadHint').textContent = `${profile.role ? `${profile.role} · ` : ''}perfil analizado localmente`;
    $('#cvResult').hidden = false;
    $('#cvResult').innerHTML = `<h3>Perfil listo. Búsqueda ejecutada.</h3><p>Detectamos <strong>${profile.skills.length} habilidades</strong> y consultamos el alcance <strong>${activeScope === 'local' ? 'Ecuador' : activeScope === 'international' ? 'internacional' : 'completo'}</strong>.</p><div class="skills-found">${profile.skills.slice(0, 12).map((skill) => `<span>${skill}</span>`).join('')}</div>`;
    $('#matchAside h3').textContent = 'Tu radar ya está personalizado.';
    $('#matchAside p').textContent = 'Las vacantes están ordenadas por afinidad con las habilidades detectadas.';
    await loadLiveJobs(activeScope);
    $('#vacantes').scrollIntoView({ behavior: 'smooth' });
  } catch (error) {
    $('#uploadTitle').textContent = 'No pudimos leer ese archivo';
    $('#uploadHint').textContent = 'Prueba con PDF, TXT o MD';
    console.error(error);
  }
});

populateLocations();
addScopeControls();
$('#heroCount').textContent = catalog.length;
render();
loadLiveJobs();
