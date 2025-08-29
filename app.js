/* Hamza TikTok Project — Auth + Optional Azure SAS Uploads */
const feedEl = document.getElementById('feed');
const viewer = document.getElementById('viewer');
const uploader = document.getElementById('uploader');
const connectAzure = document.getElementById('connectAzure');

const statVideos = document.getElementById('statVideos');
const statLikes = document.getElementById('statLikes');
const statComments = document.getElementById('statComments');

const btnUpload = document.getElementById('btnUpload');
const btnConnect = document.getElementById('btnConnect');

const viewerVideo = document.getElementById('viewerVideo');
const viewerTitle = document.getElementById('viewerTitle');
const viewerAuthor = document.getElementById('viewerAuthor');
const viewerDuration = document.getElementById('viewerDuration');
const likeBtn = document.getElementById('likeBtn');
const likeCount = document.getElementById('likeCount');
const copyLinkBtn = document.getElementById('copyLinkBtn');
const commentList = document.getElementById('commentList');
const commentForm = document.getElementById('commentForm');
const commentInput = document.getElementById('commentInput');
const commentHint = document.getElementById('commentHint');

const uploadForm = document.getElementById('uploadForm');
const videoFile = document.getElementById('videoFile');
const videoTitle = document.getElementById('videoTitle');
const preview = document.getElementById('preview');
const uploadStatus = document.getElementById('uploadStatus');

const connectForm = document.getElementById('connectForm');
const sasUrlInput = document.getElementById('sasUrl');

let manifest = [];
let current = null;

// Utilities
function $(qs, el=document){ return el.querySelector(qs); }
function h(tag, attrs={}, ...children) {
  const el = document.createElement(tag);
  Object.entries(attrs).forEach(([k,v]) => {
    if (k === 'class') el.className = v;
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v);
  });
  for (const c of children) el.append(c);
  return el;
}
function fmtDuration(sec) {
  sec = Math.round(sec || 0);
  const m = Math.floor(sec/60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2,'0')}`;
}
function loadAzureSAS() {
  const saved = localStorage.getItem('azure_sas_url');
  if (saved) window.APP_CONFIG.AZURE_SAS_URL = saved;
}
loadAzureSAS();

// Load manifest (seed videos) + any Azure uploads
async function loadFeed() {
  const res = await fetch('data/videos.json');
  const base = await res.json();
  manifest = base;

  // If Azure SAS is set, try to list uploads and append
  const sas = window.APP_CONFIG.AZURE_SAS_URL?.trim();
  if (sas && sas.includes('blob.core.windows.net') && sas.includes('?')) {
    try {
      const uploads = await listAzureUploads(sas);
      manifest.push(...uploads);
    } catch (e) {
      console.warn('Azure list failed:', e);
    }
  }

  // Render
  feedEl.innerHTML = '';
  let totalLikes = 0, totalComments = 0;
  manifest.forEach(item => {
    totalLikes += item.likes || 0;
    totalComments += (item.comments?.length || 0) + getLocalComments(item.id).length;
    feedEl.append(renderCard(item));
  });
  statVideos.textContent = manifest.length;
  statLikes.textContent = totalLikes;
  statComments.textContent = totalComments;
}

function renderCard(item) {
  const card = h('article', { class: 'card' });
  const thumb = h('video', { class: 'thumb', muted: true, playsinline: true });
  thumb.src = item.url;
  thumb.addEventListener('mouseenter', ()=> thumb.play().catch(()=>{}));
  thumb.addEventListener('mouseleave', ()=> { thumb.pause(); thumb.currentTime = 0; });
  thumb.addEventListener('click', ()=> openViewer(item));

  const meta = h('div', { class: 'meta' },
    h('h3', {}, item.title),
    h('div', { class: 'chips' },
      h('span', { class: 'chip' }, (item.likes||0)+' ❤'),
      h('span', { class: 'chip' }, ( (item.comments?.length||0) + getLocalComments(item.id).length )+' 💬')
    )
  );
  card.append(thumb, meta);
  return card;
}

// Viewer
function openViewer(item) {
  current = item;
  viewerVideo.src = item.url;
  viewerTitle.textContent = item.title;
  viewerAuthor.textContent = item.author || 'hamza';
  likeCount.textContent = String((item.likes || 0) + getLocalLikes(item.id));
  viewer.showModal();

  viewerVideo.addEventListener('loadedmetadata', () => {
    viewerDuration.textContent = fmtDuration(viewerVideo.duration);
  }, { once: true });

  renderComments(item);
  refreshCommentUI();
}

function getLocalLikes(id) {
  const k = 'likes_'+id;
  return Number(localStorage.getItem(k) || 0);
}
function setLocalLikes(id, v) {
  localStorage.setItem('likes_'+id, String(v));
}
function getLocalComments(id) {
  const k = 'comments_'+id;
  try { return JSON.parse(localStorage.getItem(k) || '[]'); } catch { return []; }
}
function setLocalComments(id, arr) {
  localStorage.setItem('comments_'+id, JSON.stringify(arr));
}

likeBtn.addEventListener('click', () => {
  if (!current) return;
  const now = getLocalLikes(current.id) + 1;
  setLocalLikes(current.id, now);
  likeCount.textContent = String((current.likes||0) + now);
});

copyLinkBtn.addEventListener('click', async () => {
  if (!current) return;
  try {
    await navigator.clipboard.writeText(current.url);
    copyLinkBtn.textContent = 'Copied!';
    setTimeout(()=> copyLinkBtn.textContent = 'Copy Link', 1200);
  } catch {}
});

function renderComments(item) {
  commentList.innerHTML = '';
  const seeded = item.comments || [];
  const local = getLocalComments(item.id);
  for (const c of [...seeded, ...local]) {
    const li = h('li', {}, `${c.author}: ${c.text}`);
    commentList.append(li);
  }
}

function refreshCommentUI() {
  const u = window.appAuth.getUser();
  const canComment = !!u;
  commentForm.style.display = canComment ? '' : 'none';
  commentHint.textContent = canComment ? '' : 'Sign in to comment.';
}

commentForm.addEventListener('submit', (e)=> {
  e.preventDefault();
  if (!current) return;
  const u = window.appAuth.getUser();
  if (!u) { alert('Please sign in to comment.'); return; }
  const text = commentInput.value.trim();
  if (!text) return;
  const arr = getLocalComments(current.id);
  arr.push({ author: u.username, text });
  setLocalComments(current.id, arr);
  commentInput.value='';
  renderComments(current);
  // update feed chip
  const chips = [...document.querySelectorAll('.card .chip:last-child')];
  const idx = manifest.findIndex(m => m.id === current.id);
  if (idx>=0 && chips[idx]) {
    const count = (manifest[idx].comments?.length || 0) + getLocalComments(current.id).length;
    chips[idx].textContent = count + ' 💬';
  }
});

// Upload (requires sign-in)
btnUpload.addEventListener('click', ()=>{
  const u = window.appAuth.getUser();
  if (!u) {
    document.getElementById('signin').showModal();
    return;
  }
  uploader.showModal();
});

videoFile.addEventListener('change', () => {
  const f = videoFile.files?.[0];
  if (!f) return;
  preview.src = URL.createObjectURL(f);
  preview.style.display = 'block';
});

uploadForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  uploadStatus.textContent = '';
  const u = window.appAuth.getUser();
  if (!u) { uploadStatus.textContent = 'Please sign in.'; return; }
  const file = videoFile.files?.[0];
  const title = videoTitle.value.trim();
  if (!file || !title) { uploadStatus.textContent = 'Pick a video and title.'; return; }

  const sas = window.APP_CONFIG.AZURE_SAS_URL?.trim();
  if (!sas) {
    uploadStatus.textContent = 'Local demo upload complete (no Azure SAS).';
    const url = URL.createObjectURL(file);
    const item = { id: 'local_'+Date.now(), title, url, author: u.username, likes: 0,
      comments: [{author:u.username, text:'my first local upload!'}] };
    manifest.unshift(item);
    feedEl.prepend(renderCard(item));
    statVideos.textContent = manifest.length;
    uploader.close();
    return;
  }

  try {
    const uploadedUrl = await azureUploadBlob(sas, file);
    uploadStatus.textContent = 'Uploaded to Azure ✔';
    const item = { id: 'azure_'+Date.now(), title, url: uploadedUrl, author: u.username, likes: 0,
      comments: [{author:u.username, text:'uploaded via Azure SAS!'}] };
    manifest.unshift(item);
    feedEl.prepend(renderCard(item));
    statVideos.textContent = manifest.length;
    setTimeout(()=> uploader.close(), 600);
  } catch (err) {
    console.error(err);
    uploadStatus.textContent = 'Azure upload failed. Check SAS and CORS.';
  }
});

// Azure helpers
function splitSAS(sasUrl) {
  const [base, qs] = sasUrl.split('?');
  const u = new URL(sasUrl);
  const account = u.hostname.split('.')[0];
  const container = u.pathname.replace(/^\//,'').split('/')[0];
  return { base, qs, account, container };
}

async function azureUploadBlob(sasUrl, file) {
  const { base, qs } = splitSAS(sasUrl);
  const blobName = 'uploads/' + Date.now() + '_' + encodeURIComponent(file.name);
  const url = `${base}/${blobName}?${qs}`;
  const resp = await fetch(url, {
    method: 'PUT',
    headers: {
      'x-ms-blob-type': 'BlockBlob',
      'x-ms-version': '2021-12-02',
      'Content-Type': file.type || 'application/octet-stream'
    },
    body: file
  });
  if (!resp.ok) { throw new Error('Upload failed: ' + resp.status + ' ' + await resp.text()); }
  return url.split('?')[0];
}

async function listAzureUploads(sasUrl) {
  const { base, qs } = splitSAS(sasUrl);
  const listUrl = `${base}?restype=container&comp=list&prefix=uploads/&${qs}`;
  const resp = await fetch(listUrl);
  if (!resp.ok) throw new Error('List failed '+resp.status);
  const xml = await resp.text();
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  const blobs = [...doc.querySelectorAll('Blob')].map(b => ({ name: b.querySelector('Name')?.textContent || '' }));
  return blobs.filter(b => b.name.toLowerCase().match(/\.(mp4|webm|mov|m4v)$/)).map((b) => ({
    id: 'az_' + b.name,
    title: 'Azure: ' + b.name.split('/').pop(),
    url: base + '/' + b.name,
    author: 'azure-uploader',
    likes: 0,
    comments: [{author:'system', text:'from Azure uploads'}]
  }));
}

// Connect Azure
btnConnect.addEventListener('click', ()=>{
  sasUrlInput.value = window.APP_CONFIG.AZURE_SAS_URL || '';
  connectAzure.showModal();
});
connectForm.addEventListener('submit', (e)=>{
  e.preventDefault();
  const v = sasUrlInput.value.trim();
  if (!v.includes('blob.core.windows.net') || !v.includes('?')) return;
  localStorage.setItem('azure_sas_url', v);
  window.APP_CONFIG.AZURE_SAS_URL = v;
  connectAzure.close();
  loadFeed();
});

// Tabs
document.querySelectorAll('.tab').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));
    btn.classList.add('active');
    if (btn.dataset.tab === 'upload') {
      const u = window.appAuth.getUser();
      if (!u) { document.getElementById('signin').showModal(); return; }
      uploader.showModal();
    }
    if (btn.dataset.tab === 'about') alert('Hamza TikTok Project — static demo with sign-in required for uploads and comments. Azure Blob uploads via SAS optional.');
    if (btn.dataset.tab === 'feed') window.scrollTo({top:0, behavior:'smooth'});
  });
});

// React to sign-in/out to update comment form hint in viewer
document.addEventListener('auth:changed', ()=>{
  refreshCommentUI();
});

// Boot
loadFeed();
