// Dados pessoais e contribuições ficam no dispositivo. Chaves antigas são preservadas.
'use strict';
const STORE = {
  students: 'acessivelUnilab.students',
  places: 'acessivelUnilab.places',
  requests: 'acessivelUnilab.requests',
  feedbacks: 'acessivelUnilab.feedbacks',
  pia: 'acessivelUnilab.piaPlans',
  favorites: 'acessivelUnilab.favoritePlaces',
  preferences: 'acessivelUnilab.preferences'
};
const $ = id => document.getElementById(id);
const uid = () => crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2);
const today = () => {
  const date = new Date();
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
};
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt = value => /^\d{4}-\d{2}-\d{2}$/.test(value || '') ? new Date(value + 'T12:00:00').toLocaleDateString('pt-BR') : 'Não informada';
function read(key, fallback = []) {
  try { const value = JSON.parse(localStorage.getItem(key)); return value ?? fallback; }
  catch { return fallback; }
}
function rows(key) { const value = read(key); return Array.isArray(value) ? value.filter(item => item && typeof item === 'object') : []; }
let toastTimer;
function toast(text) {
  clearTimeout(toastTimer);
  $('appStatus').textContent = text;
  toastTimer = setTimeout(() => { $('appStatus').textContent = ''; }, 7000);
}
function message(id, text, error = false) { $(id).textContent = text; $(id).classList.toggle('error', error); }
function write(key, value, messageId) {
  try { localStorage.setItem(key, JSON.stringify(value)); return true; }
  catch {
    const text = 'Não foi possível salvar. O armazenamento pode estar cheio ou bloqueado. Baixe seus registros no perfil e tente uma foto menor.';
    if (messageId) message(messageId, text, true); else toast(text);
    return false;
  }
}
function values(form) {
  return Object.fromEntries([...new FormData(form)].filter(([, value]) => typeof value === 'string').map(([key, value]) => [key, value.trim()]));
}
function resetDates() { document.querySelectorAll('input[type="date"]').forEach(input => { if (!input.value) input.value = today(); }); }
const initialPlaces = [
  ['Núcleo de Acessibilidade','Liberdade','Edificação'],
  ['Biblioteca','Auroras','Biblioteca'],
  ['Restaurante Universitário','Liberdade','Restaurante'],
  ['Coordenação de Curso','Palmares','Edificação'],
  ['Laboratórios','Auroras','Laboratório'],
  ['Auditórios','Malês','Auditório'],
  ['Salas de Aula','Liberdade','Sala de aula'],
  ['Banheiros Acessíveis','Auroras','Banheiro'],
  ['Rampas','Palmares','Rampa'],
  ['Elevadores','Auroras','Elevador'],
  ['Pontos de Ônibus','Liberdade','Ponto de ônibus'],
  ['Setores Administrativos','Malês','Edificação']
].map(([nome,campus,tipo]) => ({
  id:uid(), nome, campus, tipo, nivel:'Não verificado', recursos:'Ainda não informado.',
  barreiras:'Ainda não informado.', observacoes:'Sugestão de local. Confirme campus, endereço e condições no local.',
  demonstracao:true
}));
if (read(STORE.places, null) === null) write(STORE.places, initialPlaces);
resetDates();

// O perfil pessoal usa o último cadastro existente, sem apagar registros anteriores.
function loadProfile() {
  const profile = rows(STORE.students).at(-1);
  if (profile) for (const [key, value] of Object.entries(profile)) {
    if ($('studentForm').elements.namedItem(key)) $('studentForm').elements.namedItem(key).value = value;
  }
  $('inicio-title').textContent = profile?.nome ? 'Olá, ' + profile.nome.split(' ')[0] + '!' : 'Olá! Como podemos ajudar?';
}
$('studentForm').addEventListener('submit', event => {
  event.preventDefault();
  const list = rows(STORE.students), data = values(event.currentTarget);
  const profile = list.at(-1);
  const next = {...profile, ...data, id:profile?.id || uid()};
  if (profile) list[list.length - 1] = next; else list.push(next);
  if (!write(STORE.students,list,'studentMsg')) return;
  loadProfile();
  message('studentMsg','Seu perfil foi salvo neste dispositivo.');
});
function applyPreferences() {
  const prefs = read(STORE.preferences, {});
  const size = ['normal','large','extra'].includes(prefs.textSize) ? prefs.textSize : (prefs.profile === 'visual' ? 'large' : 'normal');
  const contrast = prefs.highContrast ?? prefs.profile === 'visual';
  const motion = prefs.reduceMotion ?? prefs.profile === 'tea';
  document.documentElement.dataset.text = size;
  document.body.dataset.contrast = String(Boolean(contrast));
  document.body.dataset.motion = motion ? 'reduced' : 'normal';
  $('textSize').value = size;
  $('highContrast').checked = Boolean(contrast);
  $('reduceMotion').checked = Boolean(motion);
}
['textSize','highContrast','reduceMotion'].forEach(id => $(id).addEventListener('change', () => {
  const prefs = {...read(STORE.preferences,{}),textSize:$('textSize').value,highContrast:$('highContrast').checked,reduceMotion:$('reduceMotion').checked};
  if (write(STORE.preferences,prefs,'profileMsg')) { applyPreferences(); message('profileMsg','Preferências salvas.'); }
}));
function showScreen(focus = true) {
  const requested = location.hash.slice(1) || 'inicio';
  const id = document.querySelector('.screen[id="' + CSS.escape(requested) + '"]') ? requested : 'inicio';
  document.querySelectorAll('.screen').forEach(section => { section.hidden = section.id !== id; });
  document.querySelectorAll('.app-nav button').forEach(button => {
    if (button.dataset.screen === id) button.setAttribute('aria-current','page'); else button.removeAttribute('aria-current');
  });
  if (focus) { $(id).querySelector('h1').focus(); window.scrollTo({top:0,behavior:'instant'}); }
  // Reinicia apenas a entrada da tela, sem animar cada atualização dos filtros.
  document.querySelectorAll('.screen').forEach(section => section.classList.remove('is-entering'));
  void $(id).offsetWidth;
  $(id).classList.add('is-entering');
  document.title = $(id).querySelector('h1').textContent + ' | Acessível Unilab';
}
document.addEventListener('click', event => {
  const button = event.target.closest('[data-screen]');
  if (!button) return;
  if (location.hash === '#' + button.dataset.screen) showScreen(); else location.hash = button.dataset.screen;
});
window.addEventListener('hashchange', () => showScreen());

function options(id, items) {
  const select = $(id), selected = select.value;
  select.innerHTML = '<option value="">Todos</option>' + [...new Set(items.filter(Boolean))].sort().map(item => '<option>' + escapeHtml(item) + '</option>').join('');
  if ([...select.options].some(option => option.value === selected)) select.value = selected;
}
function condition(place) { return place.nivel || 'Não verificado'; }
function classFor(level) { return {'Acessível':'accessivel','Parcialmente acessível':'parcial','Não acessível':'nao'}[level] || ''; }
function mapsUrl(place, directions = false) {
  const query = place.endereco || [place.nome, 'Unilab', 'Campus ' + place.campus].join(' ');
  return directions ? 'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(query) : 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(query);
}
// Aceita somente fotos raster locais, evitando executar conteúdo em atributos HTML.
function photoUrl(value) { return /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(value || '') ? value : ''; }
function photoMarkup(place, cssClass = 'place-photo') {
  const photo = photoUrl(place.foto);
  return photo ? '<img loading="lazy" class="' + cssClass + '" src="' + photo + '" alt="' + escapeHtml(place.fotoDescricao || 'Foto do local ' + place.nome) + '">' : '';
}
function placeSymbol(place) {
  const type = (place.tipo || '').toLocaleLowerCase('pt-BR');
  if (type.includes('banheiro')) return '♿';
  if (type.includes('rampa')) return '↗';
  if (type.includes('elevador')) return '↕';
  if (type.includes('biblioteca')) return '▤';
  if (type.includes('ônibus')) return '↔';
  return '⌂';
}
function placeCard(place) {
  const favorite = read(STORE.favorites).includes(place.id);
  const media = photoMarkup(place) || '<div class="place-placeholder"><span aria-hidden="true">' + placeSymbol(place) + '</span><small>Foto ainda não adicionada</small></div>';
  return '<article class="app-card place-card ' + classFor(condition(place)) + '">' + media +
    '<span class="badge">' + escapeHtml(condition(place)) + '</span><h2>' + escapeHtml(place.nome) + '</h2>' +
    '<p class="place-meta">' + escapeHtml(place.campus) + ' · ' + escapeHtml(place.tipo) + '</p>' +
    '<p class="place-resource"><strong>Recursos físicos:</strong> ' + escapeHtml(place.recursos) + '</p><p class="place-barrier"><strong>Barreiras:</strong> ' + escapeHtml(place.barreiras) + '</p>' +
    '<p class="field-note">' + (place.data ? 'Observação: ' + fmt(place.data) : 'Sem observação recente. Condições não verificadas.') + '</p>' +
    '<div class="card-actions"><button type="button" class="outline-button" data-place="' + escapeHtml(place.id) + '">Ver detalhes</button>' +
    '<button type="button" class="text-button" data-favorite="' + escapeHtml(place.id) + '" aria-pressed="' + favorite + '" aria-label="' + (favorite ? 'Remover dos favoritos: ' : 'Favoritar: ') + escapeHtml(place.nome) + '">' + (favorite ? '★ Favorito' : '☆ Favoritar') + '</button></div></article>';
}
function renderMap() {
  const places = rows(STORE.places), favorites = read(STORE.favorites);
  options('filterCampus', places.map(place => place.campus));
  options('filterType', places.map(place => place.tipo));
  const search = $('placeSearch').value.trim().toLocaleLowerCase('pt-BR');
  const visible = places.filter(place =>
    (!$('filterCampus').value || place.campus === $('filterCampus').value) &&
    (!$('filterType').value || place.tipo === $('filterType').value) &&
    (!$('filterLevel').value || condition(place) === $('filterLevel').value) &&
    (!$('onlyFavorites').checked || favorites.includes(place.id)) &&
    (!search || [place.nome,place.tipo,place.campus].join(' ').toLocaleLowerCase('pt-BR').includes(search))
  );
  if ($('mapSort').value === 'name') visible.sort((a,b) => String(a.nome).localeCompare(String(b.nome),'pt-BR'));
  if ($('mapSort').value === 'recent') visible.sort((a,b) => String(b.data || '').localeCompare(String(a.data || '')));
  $('placesList').innerHTML = visible.length ? visible.map(placeCard).join('') : '<p class="empty-state">Nenhum local encontrado. Tente outros filtros ou adicione um local.</p>';
  $('mapCount').textContent = visible.length === 1 ? '1 local encontrado' : visible.length + ' locais encontrados';
  const levels = [['','Todos'],['Acessível','Acessíveis'],['Parcialmente acessível','Parciais'],['Não acessível','Com barreiras'],['Não verificado','Sem verificação']];
  $('levelShortcuts').innerHTML = levels.map(([value,label]) => {
    const count = value ? places.filter(place => condition(place) === value).length : places.length;
    return '<button type="button" class="level-shortcut ' + classFor(value) + '" data-level="' + escapeHtml(value) + '" aria-pressed="' + ($('filterLevel').value === value) + '"><span class="level-dot" aria-hidden="true"></span>' + label + '<span class="level-count">' + count + '</span></button>';
  }).join('');
  const saved = places.filter(place => favorites.includes(place.id));
  $('homeFavorites').innerHTML = saved.length ? saved.map(placeCard).join('') : '<div class="empty-state favorite-empty"><span class="empty-symbol" aria-hidden="true">☆</span><div><h3>Seus lugares, sempre por perto.</h3><p>Você ainda não guardou locais favoritos.</p><button type="button" class="outline-button" data-screen="mapa">Encontrar um local →</button></div></div>';
  renderPersonalSummary();
}
['filterCampus','filterType','filterLevel','onlyFavorites'].forEach(id => $(id).addEventListener('change',renderMap));
$('placeSearch').addEventListener('input',renderMap);
$('mapSort').addEventListener('change',renderMap);
$('resetMapFilters').addEventListener('click', () => {
  for (const id of ['placeSearch','filterCampus','filterType','filterLevel']) $(id).value = '';
  $('onlyFavorites').checked = false; $('mapSort').value = 'default'; renderMap();
  $('placeSearch').focus();
});
function setMapView(view) {
  const selected = view === 'list' ? 'list' : 'grid';
  $('placesList').dataset.view = selected;
  document.querySelectorAll('[data-view]').forEach(button => button.setAttribute('aria-pressed',String(button.dataset.view === selected)));
}
document.addEventListener('click', event => {
  const levelButton = event.target.closest('[data-level]');
  if (levelButton) {
    $('filterLevel').value = levelButton.dataset.level; renderMap();
    [...$('levelShortcuts').querySelectorAll('[data-level]')].find(button => button.dataset.level === levelButton.dataset.level)?.focus();
  }
  const viewButton = event.target.closest('[data-view]');
  if (viewButton) {
    const prefs = {...read(STORE.preferences,{}),mapView:viewButton.dataset.view};
    if (write(STORE.preferences,prefs)) setMapView(prefs.mapView);
  }
});
// Somente atividade real do dispositivo alimenta o resumo pessoal.
function renderPersonalSummary() {
  const places = rows(STORE.places), favoriteIds = read(STORE.favorites);
  const favorites = places.filter(place => favoriteIds.includes(place.id)).length;
  const feedbacks = rows(STORE.feedbacks), requests = rows(STORE.requests), plans = rows(STORE.pia);
  const metrics = [
    {number:favorites,label:'Locais favoritos',screen:'mapa',icon:'☆',color:'green'},
    {number:feedbacks.length,label:'Barreiras registradas',screen:'feedback',icon:'!',color:'amber'},
    {number:requests.length,label:'Pedidos salvos',screen:'solicitacoes',icon:'＋',color:'blue'},
    {number:plans.length,label:'Planos pessoais',screen:'pia',icon:'▤',color:'green'}
  ];
  $('personalSummary').innerHTML = metrics.map(item => '<button type="button" class="summary-item" data-screen="' + item.screen + '"><span class="icon ' + item.color + '" aria-hidden="true">' + item.icon + '</span><span class="summary-number">' + item.number + '</span><span class="summary-label">' + item.label + '</span></button>').join('');
  const activity = [
    ...feedbacks.map((item,index) => ({title:item.local,label:'Barreira registrada',screen:'feedback',data:item.data,order:index,icon:'!',color:'amber'})),
    ...requests.map((item,index) => ({title:item.tipo,label:'Pedido salvo',screen:'solicitacoes',data:item.data,order:index,icon:'＋',color:'blue'})),
    ...plans.map((item,index) => ({title:item.deficiencia,label:'Plano pessoal',screen:'pia',data:item.data,order:index,icon:'▤',color:'green'}))
  ].sort((a,b) => String(b.data || '').localeCompare(String(a.data || '')) || b.order - a.order).slice(0,3);
  $('recentActivity').innerHTML = activity.length ? activity.map(item =>
    '<button type="button" class="activity-item" data-screen="' + item.screen + '"><span class="icon ' + item.color + '" aria-hidden="true">' + item.icon + '</span><span class="activity-copy"><small>' + item.label + '</small><strong>' + escapeHtml(item.title) + '</strong><span>' + fmt(item.data) + '</span></span><span aria-hidden="true">→</span></button>'
  ).join('') : '<div class="activity-empty"><span class="icon green" aria-hidden="true">▤</span><h3>Um novo começo.</h3><p>Seus pedidos, barreiras e planos recentes aparecerão aqui.</p><button class="text-button" type="button" data-screen="feedback">Registrar uma barreira →</button></div>';
}
function updateConnectionStatus() {
  $('connectionStatus').textContent = navigator.onLine ? 'Conectado' : 'Sem conexão';
  $('connectionStatus').dataset.online = String(navigator.onLine);
}
let editingPhoto = '', photoPending = false, photoGeneration = 0;
function previewPhoto() { $('photoPreview').hidden = !editingPhoto; if (editingPhoto) $('previewImage').src = editingPhoto; else $('previewImage').removeAttribute('src'); }
function beginPlace(place) {
  photoGeneration++;
  photoPending = false;
  $('placeForm').reset();
  $('placeForm').querySelector('[type="submit"]').disabled = false;
  if (place) for (const [key,value] of Object.entries(place)) {
    const field = $('placeForm').elements.namedItem(key);
    if (!field || field.type === 'file') continue;
    if (field.tagName === 'SELECT' && ![...field.options].some(option => option.value === value)) field.add(new Option(value,value));
    field.value = value;
  }
  $('placeForm').elements.data.value ||= today();
  editingPhoto = photoUrl(place?.foto);
  previewPhoto();
  message('placeMsg','');
  $('placeEditor').open = true;
  $('placeForm').elements.nome.focus();
}
$('addPlace').addEventListener('click', () => beginPlace());
$('cancelPlace').addEventListener('click', () => { photoGeneration++; photoPending = false; $('placeEditor').open = false; $('placeForm').reset(); editingPhoto = ''; previewPhoto(); $('addPlace').focus(); });
$('removePhoto').addEventListener('click', () => { photoGeneration++; photoPending = false; editingPhoto = ''; $('placePhoto').value = ''; $('placeForm').querySelector('[type="submit"]').disabled = false; previewPhoto(); });
// Redimensiona imagens antes de gravar para respeitar o espaço limitado do navegador.
async function compressPhoto(file) {
  if (!['image/jpeg','image/png','image/webp'].includes(file.type)) throw new Error('Escolha uma foto JPEG, PNG ou WebP.');
  if (file.size > 8 * 1024 * 1024) throw new Error('A foto deve ter até 8 MB.');
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1200 / Math.max(bitmap.width,bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1,Math.round(bitmap.width*scale)); canvas.height = Math.max(1,Math.round(bitmap.height*scale));
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff'; ctx.fillRect(0,0,canvas.width,canvas.height); ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);
  bitmap.close();
  return canvas.toDataURL('image/jpeg',0.72);
}
$('placePhoto').addEventListener('change', async event => {
  const file = event.target.files[0];
  if (!file) return;
  const generation = ++photoGeneration;
  photoPending = true; $('placeForm').querySelector('[type="submit"]').disabled = true;
  try { const photo = await compressPhoto(file); if (generation !== photoGeneration) return; editingPhoto = photo; previewPhoto(); message('placeMsg','Foto pronta para salvar.'); }
  catch(error) { if (generation !== photoGeneration) return; event.target.value = ''; message('placeMsg',error.message || 'Não foi possível abrir esta foto.',true); }
  finally { if (generation === photoGeneration) { photoPending = false; $('placeForm').querySelector('[type="submit"]').disabled = false; } }
});
$('placeForm').addEventListener('submit', event => {
  event.preventDefault(); if (photoPending) return;
  const data = values(event.currentTarget), list = rows(STORE.places);
  const index = list.findIndex(place => place.id === data.id);
  const place = {...(index >= 0 ? list[index] : {}),...data,id:data.id || uid(),foto:editingPhoto,demonstracao:false};
  if (index >= 0) list[index] = place; else list.push(place);
  if (!write(STORE.places,list,'placeMsg')) return;
  $('placeForm').reset(); resetDates(); $('placeEditor').open = false;
  editingPhoto = ''; previewPhoto(); renderMap(); toast('Local salvo neste dispositivo.');
  $('mapCount').focus();
});
function openPlace(place) {
  $('dialogTitle').textContent = place.nome;
  $('dialogContent').innerHTML = photoMarkup(place,'dialog-photo') +
    (place.fotoDescricao ? '<p class="photo-caption">' + escapeHtml(place.fotoDescricao) + '</p>' : '') +
    '<p><strong>Campus:</strong> ' + escapeHtml(place.campus) + '</p><p><strong>Condição:</strong> ' + escapeHtml(condition(place)) + '</p>' +
    '<p><strong>Recursos:</strong> ' + escapeHtml(place.recursos) + '</p><p><strong>Barreiras:</strong> ' + escapeHtml(place.barreiras) + '</p>' +
    '<p><strong>Observações:</strong> ' + escapeHtml(place.observacoes || 'Sem observações.') + '</p>' +
    '<p><strong>Última observação:</strong> ' + fmt(place.data) + '</p>' +
    '<p class="field-note">O Google Maps abre uma busca ou trajeto externo; a acessibilidade do percurso não é verificada pelo app.</p>' +
    '<div class="button-row"><a class="outline-button" href="' + mapsUrl(place) + '" target="_blank" rel="noopener">Ver no Google Maps ↗</a><a class="outline-button" href="' + mapsUrl(place,true) + '" target="_blank" rel="noopener">Como chegar ↗</a><button type="button" class="primary-button" data-edit-place="' + escapeHtml(place.id) + '">Atualizar local e foto</button></div>';
  $('placeDialog').showModal();
}
$('closeDialog').addEventListener('click', () => $('placeDialog').close());
document.addEventListener('click', event => {
  const favoriteButton = event.target.closest('[data-favorite]');
  if (favoriteButton) {
    const id = favoriteButton.dataset.favorite, favorites = read(STORE.favorites);
    const next = favorites.includes(id) ? favorites.filter(value => value !== id) : [...favorites,id];
    if (write(STORE.favorites,next)) {
      renderMap();
      document.querySelector('#' + (location.hash === '#mapa' ? 'placesList' : 'homeFavorites') + ' [data-favorite="' + CSS.escape(id) + '"]')?.focus();
      toast(next.includes(id) ? 'Local adicionado aos favoritos.' : 'Local removido dos favoritos.');
    }
  }
  const detailButton = event.target.closest('[data-place]');
  if (detailButton) { const place = rows(STORE.places).find(item => item.id === detailButton.dataset.place); if (place) openPlace(place); }
  const editButton = event.target.closest('[data-edit-place]');
  if (editButton) {
    const place = rows(STORE.places).find(item => item.id === editButton.dataset.editPlace);
    $('placeDialog').close();
    if (location.hash !== '#mapa') {
      window.addEventListener('hashchange', () => { if (place) beginPlace(place); }, {once:true});
      location.hash = 'mapa';
    } else if (place) beginPlace(place);
  }
});

function renderFeedbacks() {
  const list = rows(STORE.feedbacks);
  options('barrierCampus',list.map(item => item.campus)); options('barrierType',list.map(item => item.tipo));
  const visible = list.filter(item => (!$('barrierCampus').value || item.campus === $('barrierCampus').value) && (!$('barrierType').value || item.tipo === $('barrierType').value) && (!$('barrierImpact').value || item.impacto === $('barrierImpact').value));
  $('feedbackList').innerHTML = visible.length ? [...visible].reverse().map(item =>
    '<article class="app-card"><span class="badge">' + escapeHtml(item.tipo) + '</span><h2>' + escapeHtml(item.local) +
    '</h2><p>' + escapeHtml(item.campus) + ' · ' + fmt(item.data) + '</p><p><strong>Impacto:</strong> ' + escapeHtml(item.impacto || 'Não informado') +
    '</p><p>' + escapeHtml(item.comentario) + '</p><p><strong>Sugestão:</strong> ' + escapeHtml(item.sugestao || 'Não informada.') +
    '</p><div class="card-actions"><button class="outline-button" type="button" data-copy="feedbacks" data-id="' + escapeHtml(item.id) + '">Copiar relato</button><button class="danger-button" type="button" data-delete="feedbacks" data-id="' + escapeHtml(item.id) + '">Excluir</button></div></article>'
  ).join('') : '<p class="empty-state">Nenhuma barreira encontrada para esses filtros.</p>';
  renderPersonalSummary();
}
$('feedbackForm').addEventListener('submit', event => {
  event.preventDefault();
  if (!write(STORE.feedbacks,[...rows(STORE.feedbacks),{...values(event.currentTarget),id:uid()}],'feedbackMsg')) return;
  event.currentTarget.reset(); resetDates(); renderFeedbacks(); message('feedbackMsg','Barreira salva no seu diário.');
});
['barrierCampus','barrierType','barrierImpact'].forEach(id => $(id).addEventListener('change',renderFeedbacks));
function renderRequests() {
  const list = rows(STORE.requests);
  $('requestsList').innerHTML = list.length ? [...list].reverse().map(item =>
    '<article class="app-card"><span class="badge">Rascunho local</span><h2>' + escapeHtml(item.tipo) + '</h2><p>' + escapeHtml(item.descricao) +
    '</p><p><strong>Urgência:</strong> ' + escapeHtml(item.urgencia) + '</p><p><strong>Data:</strong> ' + fmt(item.data) +
    '</p><div class="card-actions"><button class="outline-button" type="button" data-copy="requests" data-id="' + escapeHtml(item.id) + '">Copiar pedido</button><button class="danger-button" type="button" data-delete="requests" data-id="' + escapeHtml(item.id) + '">Excluir</button></div></article>'
  ).join('') : '<p class="empty-state">Você ainda não salvou pedidos de apoio.</p>';
  renderPersonalSummary();
}
$('requestForm').addEventListener('submit', event => {
  event.preventDefault();
  if (!write(STORE.requests,[...rows(STORE.requests),{...values(event.currentTarget),id:uid(),status:'Rascunho local'}],'requestMsg')) return;
  event.currentTarget.reset(); resetDates(); renderRequests(); message('requestMsg','Pedido salvo. Copie o texto em Meus pedidos para encaminhar ao atendimento.');
});
function renderPlans() {
  const list = rows(STORE.pia);
  $('piaList').innerHTML = list.length ? [...list].reverse().map(item =>
    '<article class="app-card"><span class="badge">Meu plano pessoal</span><h2>' + escapeHtml(item.deficiencia) + '</h2>' +
    [['Barreiras','barreiras'],['Necessidades pedagógicas','pedagogicas'],['Tecnologia','tecnologicas'],['Comunicação','comunicacao'],['Adaptações','adaptacoes']].map(([label,key]) => '<p><strong>' + label + ':</strong> ' + escapeHtml(item[key] || 'Não informado.') + '</p>').join('') +
    '<div class="card-actions"><button class="outline-button" type="button" data-copy="pia" data-id="' + escapeHtml(item.id) + '">Copiar plano</button><button class="danger-button" type="button" data-delete="pia" data-id="' + escapeHtml(item.id) + '">Excluir</button></div></article>'
  ).join('') : '<p class="empty-state">Seu plano aparecerá aqui depois de salvar.</p>';
  renderPersonalSummary();
}
$('piaForm').addEventListener('submit', event => {
  event.preventDefault();
  if (!write(STORE.pia,[...rows(STORE.pia),{...values(event.currentTarget),id:uid(),data:today()}],'piaMsg')) return;
  event.currentTarget.reset(); renderPlans(); message('piaMsg','Plano pessoal salvo.');
});
function recordText(type,item) {
  const labels = {tipo:'Tipo',local:'Local',campus:'Campus',comentario:'Relato',sugestao:'Sugestão',impacto:'Impacto',descricao:'Necessidade',urgencia:'Urgência',data:'Data',deficiencia:'Meu perfil',barreiras:'Barreiras',pedagogicas:'Necessidades pedagógicas',tecnologicas:'Necessidades tecnológicas',comunicacao:'Comunicação',adaptacoes:'Adaptações'};
  return (type === 'requests' ? 'Pedido de apoio' : type === 'pia' ? 'Meu plano de acessibilidade' : 'Relato de barreira') + '\n\n' +
    Object.entries(labels).filter(([key]) => item[key]).map(([key,label]) => label + ': ' + (key === 'data' ? fmt(item[key]) : item[key])).join('\n');
}
function download(text, filename, mime = 'text/plain;charset=utf-8') {
  const url = URL.createObjectURL(new Blob([text],{type:mime}));
  const link = document.createElement('a'); link.href = url; link.download = filename; document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url),1000);
}
document.addEventListener('click', async event => {
  const copy = event.target.closest('[data-copy]');
  if (copy) {
    const item = rows(STORE[copy.dataset.copy]).find(value => value.id === copy.dataset.id);
    if (!item) return;
    const text = recordText(copy.dataset.copy,item);
    try { await navigator.clipboard.writeText(text); toast('Texto copiado. Você pode colar na mensagem para o atendimento.'); }
    catch { download(text,'acessivel-unilab-relato.txt'); toast('O texto foi baixado porque não foi possível copiar.'); }
  }
  const remove = event.target.closest('[data-delete]');
  if (remove && confirm('Excluir este registro do dispositivo?')) {
    const key = STORE[remove.dataset.delete];
    if (key && write(key,rows(key).filter(item => item.id !== remove.dataset.id))) { renderFeedbacks(); renderRequests(); renderPlans(); toast('Registro excluído.'); }
  }
});
$('exportData').addEventListener('click', () => {
  const data = {app:'Acessível Unilab',data:today()};
  // Inclui registros de versões anteriores no backup, embora não apareçam no app.
  for (const key of Object.keys(STORE)) data[key] = read(STORE[key]);
  for (const key of ['favoriteRoutes','radarReviews','sosAlerts']) data[key] = read('acessivelUnilab.' + key);
  download(JSON.stringify(data,null,2),'acessivel-unilab-meus-registros.json','application/json');
  message('profileMsg','Seus registros foram baixados.');
});

// Instalação progressiva e cache offline; não inclui páginas externas nem dados pessoais.
let installPrompt;
window.addEventListener('beforeinstallprompt', event => { event.preventDefault(); installPrompt = event; });
window.addEventListener('appinstalled', () => { installPrompt = null; $('installApp').hidden = true; toast('App instalado.'); });
$('installApp').addEventListener('click', async () => {
  if (installPrompt) {
    const prompt = installPrompt; installPrompt = null;
    await prompt.prompt(); await prompt.userChoice;
  } else $('installDialog').showModal();
});
$('closeInstall').addEventListener('click', () => $('installDialog').close());
if (matchMedia('(display-mode: standalone)').matches || navigator.standalone) $('installApp').hidden = true;
if ('serviceWorker' in navigator && ['http:','https:'].includes(location.protocol)) {
  navigator.serviceWorker.register('./sw.js').catch(() => { toast('O modo offline não está disponível agora. O app continua funcionando online.'); });
}
window.addEventListener('online',updateConnectionStatus);
window.addEventListener('offline', () => { updateConnectionStatus(); toast('Sem conexão. Seus registros locais continuam disponíveis.'); });
$('todayLabel').textContent = new Intl.DateTimeFormat('pt-BR',{weekday:'long',day:'numeric',month:'long',timeZone:'America/Fortaleza'}).format(new Date());
setMapView(read(STORE.preferences,{}).mapView);
updateConnectionStatus();
loadProfile(); applyPreferences(); renderMap(); renderFeedbacks(); renderRequests(); renderPlans(); showScreen(false);
