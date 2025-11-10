// L'Oréal Routine Builder — front-end
// Works on GitHub Pages; calls your Cloudflare Worker
import { WORKER_URL } from './secrets.js';

const state = {
  routine: { AM: [], PM: [] },
  products: [],
  messages: [
    { role: 'system', content: [
      'You are a helpful beauty advisor for L’Oréal.',
      'Ask a few clarifying questions then suggest 3–6 products and a concise AM/PM routine.',
      'Only give general guidance; do not make medical claims.',
      'When a user mentions a product ID from our list, format a short line: [ADD id=...] to hint UI actions.'
    ].join(' ') }
  ]
};

// DOM
const tabs = document.querySelectorAll('.tab-btn');
const panels = document.querySelectorAll('.tab');
const chatLog = document.getElementById('chat-log');
const chatForm = document.getElementById('chat-form');
const chatInput = document.getElementById('chat-input');
const productGrid = document.getElementById('product-grid');
const categoryFilter = document.getElementById('category-filter');
const concernFilter = document.getElementById('concern-filter');
const searchFilter = document.getElementById('search-filter');
const amList = document.getElementById('routine-am');
const pmList = document.getElementById('routine-pm');
const exportBtn = document.getElementById('export-routine');
const downloadLink = document.getElementById('download-link');

// Tabs
// Tabs with persistence (localStorage)
function activateTab(name){
  tabs.forEach(b => b.classList.remove('is-active'));
  panels.forEach(p => p.classList.remove('is-active'));
  const btn = Array.from(tabs).find(x => x.dataset.tab === name) || tabs[0];
  btn.classList.add('is-active');
  const panel = document.getElementById('tab-' + btn.dataset.tab);
  if(panel) panel.classList.add('is-active');
  try{ localStorage.setItem('selectedTab', btn.dataset.tab); }catch{}
}

tabs.forEach(btn => {
  btn.addEventListener('click', () => activateTab(btn.dataset.tab));
});

// Restore selected tab from localStorage on load
try{
  const saved = localStorage.getItem('selectedTab');
  if(saved) activateTab(saved);
}catch{}

// Chat helpers
function addMsg(role, text){
  const row = document.createElement('div');
  row.className = 'msg ' + (role === 'user' ? 'user' : 'bot');
  const av = document.createElement('div');
  av.className = 'avatar';
  av.textContent = role === 'user' ? 'U' : 'AI';
  const bubble = document.createElement('div');
  bubble.className = 'bubble';
  bubble.textContent = text;
  row.appendChild(av); row.appendChild(bubble);
  chatLog.appendChild(row);
  chatLog.scrollTop = chatLog.scrollHeight;
}

// Parse assistant response for [ADD id=...] hints
function parseAddHints(text){
  const pattern = /\[ADD\s+id=(.*?)\]/g;
  const ids = [];
  let m; 
  while((m = pattern.exec(text))){
    ids.push(m[1].trim());
  }
  return ids;
}

// Routine management
function renderRoutine(){
  function render(listEl, items){
    listEl.innerHTML = '';
    items.forEach(p => {
      const li = document.createElement('li');
      li.className = 'routine-item';
      li.innerHTML = `<span>${p.name}</span><button class="ghost" data-id="${p.id}">Remove</button>`;
      li.querySelector('button').addEventListener('click', () => {
        const group = listEl === amList ? 'AM' : 'PM';
        state.routine[group] = state.routine[group].filter(x => x.id !== p.id);
        renderRoutine();
      });
      listEl.appendChild(li);
    });
  }
  render(amList, state.routine.AM);
  render(pmList, state.routine.PM);
  localStorage.setItem('routine', JSON.stringify(state.routine));
}

function addToRoutineById(id){
  const p = state.products.find(x => x.id === id);
  if(!p) return;
  (p.steps || []).forEach(step => {
    const list = state.routine[step];
    if(list && !list.some(x => x.id === p.id)){
      list.push(p);
    }
  });
  renderRoutine();
}

// Product grid + filters
async function loadProducts(){
  const res = await fetch('./data/products.json');
  state.products = await res.json();
  renderProducts();
  // restore routine
  try{
    const saved = JSON.parse(localStorage.getItem('routine') || '{}');
    if(saved.AM && saved.PM) { state.routine = saved; renderRoutine(); }
  }catch{}
}

function renderProducts(){
  const cat = categoryFilter.value;
  const con = concernFilter.value;
  const q = (searchFilter.value || '').toLowerCase();
  const list = state.products.filter(p => {
    const catOK = !cat || p.category === cat;
    const conOK = !con || (p.concerns || []).some(c => c.toLowerCase() === con.toLowerCase());
    const qOK = !q || [p.name, p.brand, ...(p.keyIngredients||[])].join(' ').toLowerCase().includes(q);
    return catOK && conOK && qOK;
  });

  productGrid.innerHTML = '';
  list.forEach(p => {
    const card = document.createElement('article');
    card.className = 'card';
    card.innerHTML = `
      <h3>${p.name}</h3>
      <div class="badges">
        <span class="badge">${p.brand}</span>
        <span class="badge">${p.category}</span>
        ${(p.concerns||[]).slice(0,2).map(c => `<span class="badge">${c}</span>`).join('')}
      </div>
      <p>${p.notes || ''}</p>
      <button class="ghost" data-id="${p.id}">Add to routine</button>
    `;
    card.querySelector('button').addEventListener('click', () => addToRoutineById(p.id));
    productGrid.appendChild(card);
  });
}

[categoryFilter, concernFilter, searchFilter].forEach(el => el.addEventListener('input', renderProducts));

// Chat submit
chatForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const text = chatInput.value.trim();
  if(!text) return;
  chatInput.value = '';

  addMsg('user', text);
  state.messages.push({ role: 'user', content: text });

  addMsg('assistant', '…thinking');
  const thinkingEl = chatLog.lastElementChild.querySelector('.bubble');

  try {
    const res = await fetch(WORKER_URL, {
      method:'POST',
      headers:{ 'Content-Type':'application/json' },
      body: JSON.stringify({ messages: state.messages })
    });
    const data = await res.json();
    // Cloudflare worker should return OpenAI shape: { choices: [{ message: { role, content } }] }
    const content = data?.choices?.[0]?.message?.content ?? String(data);
    thinkingEl.textContent = content;
    state.messages.push({ role: 'assistant', content });

    // auto-add hints
    parseAddHints(content).forEach(addToRoutineById);
  } catch (err){
    thinkingEl.textContent = 'Network error. Please try again.';
    console.error(err);
  }
});

// Export routine
exportBtn.addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(state.routine, null, 2)], { type:'application/json' });
  const url = URL.createObjectURL(blob);
  downloadLink.href = url;
  downloadLink.download = 'routine.json';
  downloadLink.classList.remove('hidden');
});

// Init
loadProducts();
