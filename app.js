// frontend/app.js

/* ===========================================================
   DASHBOARD DE VEILLE — version stabilisée (JSON + épinglage)
   =========================================================== */

/* ------------------------------ Variables globales ------------------------------ */
let currentTab = 'budget';
let allItems = [];
const pinnedSet = new Set(JSON.parse(localStorage.getItem("pinned") || "[]"));
const TABS = ['budget', 'metz', 'social'];

/* ------------------------------ Utilitaires ------------------------------ */

// Fetch des fichiers JSON générés par GitHub Actions
async function fetchTabData(tabKey) {
  const url = `./data/${tabKey}.json?ts=${Date.now()}`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(res.status);
    return await res.json();
  } catch (e) {
    console.warn(`Erreur de chargement JSON ${tabKey}`, e);
    return { items: [], updatedAt: '' };
  }
}

// Sauvegarde des épingles localement
function savePinned() {
  localStorage.setItem("pinned", JSON.stringify([...pinnedSet]));
}

// Formatage des dates
function formatDate(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleString('fr-FR', {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
    });
  } catch {
    return '';
  }
}

/* ------------------------------ Épinglage ------------------------------ */

function togglePin(id) {
  if (pinnedSet.has(id)) pinnedSet.delete(id);
  else pinnedSet.add(id);
  savePinned();
  renderItems(allItems);
}

/* ------------------------------ Rendu HTML ------------------------------ */

function renderItems(items) {
  const container = document.getElementById('items-container');
  container.innerHTML = '';

  if (!items.length) {
    container.innerHTML = `<p class="text-gray-500 text-center mt-8">Aucun contenu pour le moment.</p>`;
    return;
  }

  items.forEach(item => {
    const isPinned = pinnedSet.has(item.id);
    const div = document.createElement('div');
    div.className = `bg-white rounded-2xl shadow p-4 mb-4 hover:shadow-lg transition`;

    div.innerHTML = `
      <div class="flex justify-between items-start">
        <a href="${item.link}" target="_blank" class="text-lg font-semibold text-blue-700 hover:underline max-w-[85%] break-words">
          ${item.title || '(sans titre)'}
        </a>
        <button 
          class="text-sm ${isPinned ? 'text-yellow-600' : 'text-gray-400 hover:text-yellow-600'}"
          title="Épingler / désépingler"
          onclick="togglePin('${item.id}')"
        >
          ${isPinned ? '📌' : '📍'}
        </button>
      </div>
      <p class="text-gray-700 mt-2 text-sm">${item.summary || ''}</p>
      <div class="flex justify-between items-center mt-3 text-xs text-gray-500">
        <span>${item.source || ''}</span>
        <span>${formatDate(item.dateISO)}</span>
      </div>
    `;
    container.appendChild(div);
  });
}

/* ------------------------------ Navigation ------------------------------ */

async function changeTab(tabKey) {
  currentTab = tabKey;
  TABS.forEach(tab => {
    const btn = document.getElementById(`tab-${tab}`);
    if (btn) {
      if (tab === tabKey) btn.classList.add('bg-blue-600', 'text-white');
      else btn.classList.remove('bg-blue-600', 'text-white');
    }
  });

  const data = await fetchTabData(tabKey);
  allItems = [
    ...data.items.sort((a, b) => new Date(b.dateISO) - new Date(a.dateISO))
  ];
  renderItems(allItems);
}

/* ------------------------------ Initialisation ------------------------------ */

async function initDashboard() {
  // Création des boutons d'onglet si non déjà dans le HTML
  const tabsBar = document.getElementById('tabsBar');
  if (tabsBar) {
    tabsBar.innerHTML = `
      <div class="flex gap-2 justify-center mt-4">
        ${TABS.map(tab => `
          <button id="tab-${tab}" onclick="changeTab('${tab}')" 
            class="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 transition capitalize">
            ${tab}
          </button>
        `).join('')}
      </div>
    `;
  }

  await changeTab(currentTab);
}

// Lancement au chargement
document.addEventListener('DOMContentLoaded', initDashboard);
