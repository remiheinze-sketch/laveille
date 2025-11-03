/**
 * Dashboard de Veille - Application SPA
 * Architecture modulaire en vanilla JavaScript
 */

(function() {
  'use strict';

  // ===========================
  // CONFIGURATION
  // ===========================
  
  const CONFIG = {
    STORAGE_KEY: 'dashboard-veille',
    PAGE_SIZE: 10,
    TOAST_DURATION: 3000,
    NEW_ITEM_INTERVAL: 45000, // 45 secondes pour la démo
    TABS: {
      budget: { name: 'Budget 2026 & PLFSS', emoji: '📊' },
      metz: { name: 'Metz', emoji: '🏛️' },
      social: { name: 'Réseaux sociaux', emoji: '👥' }
    },
    SOURCES: {
      budget: ['Assemblée Nationale', 'Sénat', 'PLF 2026', 'PLFSS 2026', 'Communiqué Bercy'],
      metz: ['Presse locale', 'Communiqué Ville de Metz', 'Blog local', 'Interview'],
      social: ['Facebook', 'LinkedIn', 'X', 'Instagram']
    },
    TAGS: {
      budget: ['fiscalité', 'santé', 'éducation', 'défense', 'environnement'],
      metz: ['urbanisme', 'transport', 'culture', 'événement', 'infrastructure'],
      social: ['annonce', 'engagement', 'vidéo', 'débat', 'ressource']
    }
  };

  // ===========================
  // UTILITAIRES
  // ===========================
  
  const Utils = {
    /**
     * Génère un ID unique
     */
    generateId() {
      return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    },

    /**
     * Formatte une date en relatif ("il y a X minutes")
     */
    formatRelativeDate(dateISO) {
      const date = new Date(dateISO);
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return 'À l\'instant';
      if (diffMins < 60) return `Il y a ${diffMins} min`;
      if (diffHours < 24) return `Il y a ${diffHours}h`;
      if (diffDays === 1) return 'Hier';
      if (diffDays < 7) return `Il y a ${diffDays}j`;
      
      return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
    },

    /**
     * Échappe les caractères HTML
     */
    escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    },

    /**
     * Copie du texte dans le presse-papiers
     */
    async copyToClipboard(text) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch (err) {
        console.error('Erreur de copie:', err);
        return false;
      }
    },

    /**
     * Télécharge un fichier
     */
    downloadFile(content, filename, type) {
      const blob = new Blob([content], { type });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },

    /**
     * Filtre les items selon les critères
     */
    filterItems(items, { search, sources, tags, dateFilter }) {
      return items.filter(item => {
        // Recherche textuelle
        if (search) {
          const searchLower = search.toLowerCase();
          const matchTitle = item.title.toLowerCase().includes(searchLower);
          const matchSummary = item.summary.toLowerCase().includes(searchLower);
          if (!matchTitle && !matchSummary) return false;
        }

        // Filtre par sources
        if (sources && sources.length > 0) {
          if (!sources.includes(item.source)) return false;
        }

        // Filtre par tags
        if (tags && tags.length > 0) {
          const hasTag = tags.some(tag => item.tags.includes(tag));
          if (!hasTag) return false;
        }

        // Filtre par date
        if (dateFilter && dateFilter !== 'all') {
          const itemDate = new Date(item.dateISO);
          const now = new Date();
          const diffMs = now - itemDate;
          const diffHours = diffMs / 3600000;
          const diffDays = diffMs / 86400000;

          if (dateFilter === '24h' && diffHours > 24) return false;
          if (dateFilter === '7d' && diffDays > 7) return false;
          if (dateFilter === '30d' && diffDays > 30) return false;
        }

        return true;
      });
    },

    /**
     * Trie les items
     */
    sortItems(items, sortType) {
      const sorted = [...items];
      
      switch (sortType) {
        case 'date-desc':
          sorted.sort((a, b) => new Date(b.dateISO) - new Date(a.dateISO));
          break;
        case 'date-asc':
          sorted.sort((a, b) => new Date(a.dateISO) - new Date(b.dateISO));
          break;
        case 'title-asc':
          sorted.sort((a, b) => a.title.localeCompare(b.title));
          break;
      }

      return sorted;
    }
  };

  // ===========================
  // PROVIDERS DE DONNÉES
  // ===========================

  class BudgetProvider {
    constructor() {
      this.items = this._generateInitialItems();
    }

    _generateInitialItems() {
      const titles = [
        'Adoption de l\'article 12 du PLF 2026 sur la fiscalité écologique',
        'Débat au Sénat : augmentation des crédits pour la santé publique',
        'PLFSS 2026 : réforme des retraites reportée à 2027',
        'Bercy annonce une baisse de la TVA sur les produits de première nécessité',
        'Budget de la défense : investissements massifs dans le cyber',
        'Éducation nationale : 5000 postes supplémentaires prévus',
        'PLF 2026 : nouvelles mesures pour soutenir les PME',
        'Assemblée Nationale : vote du budget environnement en hausse de 12%',
        'Réforme fiscale : simplification de l\'impôt sur le revenu',
        'PLFSS : renforcement du remboursement des soins dentaires',
        'Budget culture : enveloppe exceptionnelle de 500M€',
        'Sénat : commission des finances examine le budget recherche',
        'PLF 2026 : crédit d\'impôt pour la transition énergétique',
        'Budget logement : plan de construction de 100 000 logements sociaux',
        'Assemblée : débat sur la fiscalité des grandes entreprises',
        'PLFSS 2026 : amélioration du congé paternité',
        'Bercy : nouvelles aides pour l\'emploi des jeunes',
        'Budget agriculture : soutien aux exploitations bio renforcé',
        'PLF 2026 : investissements dans les infrastructures ferroviaires',
        'Débat budgétaire : réduction de la dette publique prioritaire'
      ];

      const summaries = [
        'Le texte prévoit une refonte complète du système fiscal pour encourager les pratiques écologiques.',
        'Les sénateurs débattent d\'une augmentation significative des moyens alloués à la santé.',
        'La réforme structurelle des retraites est repoussée pour permettre une concertation plus large.',
        'Cette mesure vise à améliorer le pouvoir d\'achat des ménages les plus modestes.',
        'Le gouvernement mise sur la cyberdéfense face aux menaces croissantes.',
        'Recrutement massif d\'enseignants pour réduire les effectifs par classe.',
        'Un dispositif d\'accompagnement fiscal et financier pour les PME innovantes.',
        'L\'enveloppe environnement connaît sa plus forte hausse depuis 10 ans.',
        'Objectif : rendre la déclaration d\'impôts plus accessible et compréhensible.',
        'Extension de la prise en charge des soins dentaires et orthodontiques.',
        'Relance du secteur culturel après la crise sanitaire.',
        'Examen des crédits alloués à la recherche fondamentale et appliquée.',
        'Incitation fiscale pour les travaux d\'isolation et de rénovation énergétique.',
        'Programme ambitieux pour répondre à la crise du logement.',
        'Question de la contribution fiscale des multinationales au centre des échanges.',
        'Allongement de la durée et revalorisation des indemnités.',
        'Dispositifs pour favoriser l\'insertion professionnelle des moins de 26 ans.',
        'Encouragement de la transition vers une agriculture durable.',
        'Modernisation du réseau ferré national pour améliorer les liaisons régionales.',
        'Stratégie pluriannuelle de désendettement présentée par le ministre.'
      ];

      const items = [];
      const count = 20;
      
      for (let i = 0; i < count; i++) {
        const daysAgo = Math.floor(Math.random() * 30);
        const hoursAgo = Math.floor(Math.random() * 24);
        const date = new Date();
        date.setDate(date.getDate() - daysAgo);
        date.setHours(date.getHours() - hoursAgo);

        items.push({
          id: Utils.generateId(),
          title: titles[i % titles.length],
          summary: summaries[i % summaries.length],
          link: `https://example.com/budget/${i}`,
          source: CONFIG.SOURCES.budget[i % CONFIG.SOURCES.budget.length],
          tags: this._getRandomTags(CONFIG.TAGS.budget, 2, 3),
          dateISO: date.toISOString(),
          pinned: i < 2,
          read: i > 5
        });
      }

      return items;
    }

    _getRandomTags(tagPool, min, max) {
      const count = min + Math.floor(Math.random() * (max - min + 1));
      const shuffled = [...tagPool].sort(() => 0.5 - Math.random());
      return shuffled.slice(0, count);
    }

    fetchItems() {
      return {
        items: [...this.items],
        total: this.items.length
      };
    }

    addItem(item) {
      this.items.unshift(item);
    }
  }

  class MetzProvider {
    constructor() {
      this.items = this._generateInitialItems();
    }

    _generateInitialItems() {
      const titles = [
        'Le maire de Metz annonce un nouveau plan de mobilité douce',
        'Inauguration du centre culturel rénové dans le quartier Borny',
        'Interview : François Grosdidier sur les projets 2026',
        'Ville de Metz : lancement de la consultation citoyenne sur l\'urbanisme',
        'Metz accueillera un sommet européen des villes vertes',
        'Nouveau pont piétonnier sur la Moselle : début des travaux',
        'Blog local : les transformations du centre-ville depuis 2020',
        'Communiqué : extension des horaires des transports en commun',
        'Metz élue ville la plus attractive de Lorraine',
        'Projet de rénovation de la gare : calendrier dévoilé',
        'Le maire visite les nouveaux logements sociaux de Queuleu',
        'Metz 2030 : présentation de la stratégie climat',
        'Presse locale : polémique autour du projet de parking souterrain',
        'Interview du maire : bilan des 100 premiers jours',
        'Festival de théâtre : Metz capitale culturelle régionale',
        'Communiqué : nouvelles aides pour les commerçants du centre',
        'Urbanisme : consultation sur le PLU révisé',
        'Metz connectée : déploiement de la fibre dans tous les quartiers',
        'Le maire répond aux critiques sur la gestion budgétaire',
        'Inauguration du skatepark : succès auprès des jeunes'
      ];

      const summaries = [
        'Déploiement de pistes cyclables et piétonnisation progressive du centre historique.',
        'Après 18 mois de rénovation, le centre culturel rouvre avec une programmation ambitieuse.',
        'Le maire détaille ses priorités pour l\'année à venir lors d\'un entretien exclusif.',
        'Les habitants sont invités à donner leur avis sur l\'avenir de leur ville.',
        'Metz organise cet événement majeur réunissant 50 villes européennes engagées.',
        'Infrastructure stratégique reliant les deux rives pour les piétons et cyclistes.',
        'Analyse des mutations urbaines et économiques du cœur de ville.',
        'Amélioration de la desserte en soirée et le week-end pour faciliter les déplacements.',
        'Reconnaissance nationale pour la qualité de vie et le dynamisme économique.',
        'Modernisation complète du bâtiment prévue d\'ici 2028.',
        'Visite officielle et échanges avec les nouveaux résidents du quartier.',
        'Plan ambitieux pour atteindre la neutralité carbone d\'ici 2050.',
        'Le projet divise élus et riverains sur l\'impact environnemental.',
        'Retour sur les premières actions du nouveau mandat municipal.',
        'Programme exceptionnel avec des compagnies nationales et internationales.',
        'Dispositif de soutien pour dynamiser le commerce de proximité.',
        'Réunions publiques organisées dans tous les quartiers.',
        'Achèvement du très haut débit pour tous les Messins d\'ici fin 2026.',
        'Clarifications sur les choix budgétaires et les priorités d\'investissement.',
        'Équipement moderne très attendu par les associations sportives locales.'
      ];

      const items = [];
      const count = 20;
      
      for (let i = 0; i < count; i++) {
        const daysAgo = Math.floor(Math.random() * 25);
        const hoursAgo = Math.floor(Math.random() * 24);
        const date = new Date();
        date.setDate(date.getDate() - daysAgo);
        date.setHours(date.getHours() - hoursAgo);

        items.push({
          id: Utils.generateId(),
          title: titles[i % titles.length],
          summary: summaries[i % summaries.length],
          link: `https://example.com/metz/${i}`,
          source: CONFIG.SOURCES.metz[i % CONFIG.SOURCES.metz.length],
          tags: this._getRandomTags(CONFIG.TAGS.metz, 1, 3),
          dateISO: date.toISOString(),
          pinned: i < 3,
          read: i > 7
        });
      }

      return items;
    }

    _getRandomTags(tagPool, min, max) {
      const count = min + Math.floor(Math.random() * (max - min + 1));
      const shuffled = [...tagPool].sort(() => 0.5 - Math.random());
      return shuffled.slice(0, count);
    }

    fetchItems() {
      return {
        items: [...this.items],
        total: this.items.length
      };
    }

    addItem(item) {
      this.items.unshift(item);
    }
  }

  class SocialProvider {
    constructor() {
      this.items = this._generateInitialItems();
    }

    _generateInitialItems() {
      const titles = [
        '[LinkedIn] Marie Dupont partage une étude sur l\'IA en santé',
        '[Facebook] Jean Martin annonce le lancement de son nouveau projet',
        '[X] Thread viral sur les enjeux climatiques',
        '[Instagram] Vidéo inspirante : 100k vues en 24h',
        '[LinkedIn] Débat : l\'avenir du télétravail post-pandémie',
        '[Facebook] Événement : conférence sur l\'innovation le 15 mars',
        '[X] Pierre Leroy réagit aux dernières actualités politiques',
        '[Instagram] Story : coulisses d\'une journée d\'entrepreneur',
        '[LinkedIn] Ressource gratuite : guide complet du management agile',
        '[Facebook] Sondage : quelle priorité pour votre entreprise en 2026 ?',
        '[X] Thread : 10 conseils pour améliorer sa productivité',
        '[Instagram] Live Q&A avec un expert en marketing digital',
        '[LinkedIn] Anne Bertrand publie un article sur la diversité en entreprise',
        '[Facebook] Groupe : discussion animée sur la transition écologique',
        '[X] Engagement massif sur le post de Sophie Laurent',
        '[Instagram] Reels tendance : astuces de communication',
        '[LinkedIn] Annonce : nouveau partenariat stratégique',
        '[Facebook] Vidéo : témoignage client touchant',
        '[X] Débat sur la régulation des réseaux sociaux',
        '[Instagram] Carrousel : statistiques clés 2025'
      ];

      const summaries = [
        'Publication d\'une recherche approfondie sur l\'utilisation de l\'intelligence artificielle dans le domaine médical.',
        'Présentation d\'un projet entrepreneurial ambitieux avec appel à collaboration.',
        'Discussion approfondie des défis environnementaux avec plus de 5000 retweets.',
        'Contenu motivant sur le parcours personnel devenu viral sur la plateforme.',
        'Échanges nourris entre professionnels sur l\'évolution des modes de travail.',
        'Invitation à un événement professionnel rassemblant les acteurs de l\'innovation.',
        'Analyse critique et nuancée de l\'actualité politique française.',
        'Immersion dans le quotidien d\'un chef d\'entreprise à succès.',
        'Document PDF téléchargeable gratuitement pour les abonnés.',
        'Consultation de la communauté sur les orientations stratégiques.',
        'Série de recommandations pratiques très partagées.',
        'Session interactive avec réponses en direct aux questions.',
        'Réflexion sur les pratiques inclusives dans le monde du travail.',
        'Échanges passionnés entre membres sur les solutions durables.',
        'Post ayant généré des milliers de commentaires et partages.',
        'Format court et dynamique avec conseils actionnables.',
        'Communication officielle d\'une collaboration inter-entreprises.',
        'Retour d\'expérience authentique d\'un client satisfait.',
        'Questionnements sur le rôle et les responsabilités des plateformes.',
        'Infographies synthétiques sur les tendances de l\'année écoulée.'
      ];

      const items = [];
      const count = 20;
      
      for (let i = 0; i < count; i++) {
        const daysAgo = Math.floor(Math.random() * 20);
        const hoursAgo = Math.floor(Math.random() * 24);
        const date = new Date();
        date.setDate(date.getDate() - daysAgo);
        date.setHours(date.getHours() - hoursAgo);

        items.push({
          id: Utils.generateId(),
          title: titles[i % titles.length],
          summary: summaries[i % summaries.length],
          link: `https://example.com/social/${i}`,
          source: CONFIG.SOURCES.social[i % CONFIG.SOURCES.social.length],
          tags: this._getRandomTags(CONFIG.TAGS.social, 1, 3),
          dateISO: date.toISOString(),
          pinned: i < 1,
          read: i > 8
        });
      }

      return items;
    }

    _getRandomTags(tagPool, min, max) {
      const count = min + Math.floor(Math.random() * (max - min + 1));
      const shuffled = [...tagPool].sort(() => 0.5 - Math.random());
      return shuffled.slice(0, count);
    }

    fetchItems() {
      return {
        items: [...this.items],
        total: this.items.length
      };
    }

    addItem(item) {
      this.items.unshift(item);
    }
  }

  // ===========================
  // REGISTRE DES PROVIDERS
  // ===========================

  class ProviderRegistry {
    constructor() {
      this.providers = {
        budget: new BudgetProvider(),
        metz: new MetzProvider(),
        social: new SocialProvider()
      };
    }

    getProvider(tabId) {
      return this.providers[tabId];
    }
  }

  // ===========================
  // GESTION DU STOCKAGE
  // ===========================

  const Storage = {
    _storage: {},

    _init() {
      // Utilise un objet en mémoire au lieu de localStorage
      this._storage = {
        activeTab: 'budget',
        readItems: {},
        pinnedItems: {},
        filters: {},
        sort: 'date-desc'
      };
    },

    get(key) {
      return this._storage[key];
    },

    set(key, value) {
      this._storage[key] = value;
    },

    getReadStatus(tabId, itemId) {
      const readItems = this._storage.readItems || {};
      const tabReads = readItems[tabId] || {};
      return tabReads[itemId] || false;
    },

    setReadStatus(tabId, itemId, status) {
      if (!this._storage.readItems) this._storage.readItems = {};
      if (!this._storage.readItems[tabId]) this._storage.readItems[tabId] = {};
      this._storage.readItems[tabId][itemId] = status;
    },

    getPinnedStatus(tabId, itemId) {
      const pinnedItems = this._storage.pinnedItems || {};
      const tabPinned = pinnedItems[tabId] || {};
      return tabPinned[itemId] || false;
    },

    setPinnedStatus(tabId, itemId, status) {
      if (!this._storage.pinnedItems) this._storage.pinnedItems = {};
      if (!this._storage.pinnedItems[tabId]) this._storage.pinnedItems[tabId] = {};
      this._storage.pinnedItems[tabId][itemId] = status;
    }
  };

  // ===========================
  // ÉTAT GLOBAL
  // ===========================

  const State = {
    activeTab: 'budget',
    filters: {
      search: '',
      sources: [],
      tags: [],
      dateFilter: 'all'
    },
    sort: 'date-desc',
    page: 1,
    pageSize: CONFIG.PAGE_SIZE,
    cache: {},

    init() {
      Storage._init();
      this.activeTab = Storage.get('activeTab') || 'budget';
      this.sort = Storage.get('sort') || 'date-desc';
    },

    setActiveTab(tabId) {
      this.activeTab = tabId;
      this.page = 1;
      Storage.set('activeTab', tabId);
    },

    setFilters(filters) {
      this.filters = { ...this.filters, ...filters };
      this.page = 1;
    },

    setSort(sort) {
      this.sort = sort;
      Storage.set('sort', sort);
    },

    setPage(page) {
      this.page = page;
    }
  };

  // ===========================
  // SYSTÈME DE TOASTS
  // ===========================

  const Toast = {
    container: null,

    init() {
      this.container = document.getElementById('toast-container');
    },

    show(message, type = 'info') {
      const toast = document.createElement('div');
      toast.className = `toast ${type}`;
      
      const icons = {
        success: '✓',
        error: '✗',
        warning: '⚠',
        info: 'ℹ'
      };

      toast.innerHTML = `
        <span class="toast-icon">${icons[type] || icons.info}</span>
        <span class="toast-message">${Utils.escapeHtml(message)}</span>
      `;

      this.container.appendChild(toast);

      setTimeout(() => {
        toast.style.animation = 'slideIn 250ms cubic-bezier(0.16, 1, 0.3, 1) reverse';
        setTimeout(() => toast.remove(), 250);
      }, CONFIG.TOAST_DURATION);
    }
  };

  // ===========================
  // EXPORT DE DONNÉES
  // ===========================

  const Exporter = {
    toCSV(items) {
      const headers = ['Titre', 'Résumé', 'Source', 'Tags', 'Date', 'Lien'];
      const rows = items.map(item => [
        item.title,
        item.summary,
        item.source,
        item.tags.join('; '),
        new Date(item.dateISO).toLocaleString('fr-FR'),
        item.link
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
      ].join('\n');

      return csvContent;
    },

    toJSON(items) {
      return JSON.stringify(items, null, 2);
    }
  };

  // ===========================
  // GÉNÉRATION DE RAPPORT EMAIL
  // ===========================

  const Reporter = {
    buildMailtoReport(items, tabName) {
      const subject = encodeURIComponent(`Rapport de veille - ${tabName}`);
      const topItems = items.slice(0, 5);
      
      let body = `Bonjour,\n\nVoici un résumé de la veille ${tabName} :\n\n`;
      body += `Nombre total d'éléments : ${items.length}\n\n`;
      body += `Top 5 des contenus :\n\n`;
      
      topItems.forEach((item, index) => {
        body += `${index + 1}. ${item.title}\n`;
        body += `   Source : ${item.source}\n`;
        body += `   Lien : ${item.link}\n\n`;
      });
      
      body += `Cordialement`;
      
      return `mailto:?subject=${subject}&body=${encodeURIComponent(body)}`;
    }
  };

  // ===========================
  // ROUTEUR
  // ===========================

  const Router = {
    init() {
      window.addEventListener('hashchange', () => this.handleRoute());
      this.handleRoute();
    },

    handleRoute() {
      const hash = window.location.hash.slice(1) || State.activeTab;
      const tabId = ['budget', 'metz', 'social'].includes(hash) ? hash : 'budget';
      
      if (tabId !== State.activeTab) {
        State.setActiveTab(tabId);
        UI.render();
      }
    },

    navigate(tabId) {
      window.location.hash = tabId;
    }
  };

  // ===========================
  // INTERFACE UTILISATEUR
  // ===========================

  const UI = {
    providerRegistry: null,

    init() {
      this.providerRegistry = new ProviderRegistry();
      this.bindEvents();
      this.render();
    },

    bindEvents() {
      // Navigation par onglets
      document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const tabId = e.currentTarget.dataset.tab;
          Router.navigate(tabId);
        });
      });

      // Recherche
      const searchInput = document.getElementById('search-input');
      let searchTimeout;
      searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
          State.setFilters({ search: e.target.value });
          this.render();
        }, 300);
      });

      // Filtres de date
      document.querySelectorAll('input[name="date-filter"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
          State.setFilters({ dateFilter: e.target.value });
          this.render();
        });
      });

      // Tri
      document.getElementById('sort-select').addEventListener('change', (e) => {
        State.setSort(e.target.value);
        this.render();
      });

      // Marquer tout comme lu
      document.getElementById('btn-mark-all-read').addEventListener('click', () => {
        this.markAllAsRead();
      });

      // Modales
      document.getElementById('btn-export').addEventListener('click', () => {
        this.openExportModal();
      });

      document.getElementById('btn-report').addEventListener('click', () => {
        this.openReportModal();
      });

      document.getElementById('btn-add-manual').addEventListener('click', () => {
        this.openAddModal();
      });

      // Fermeture des modales
      document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const modal = e.target.closest('.modal');
          modal.setAttribute('hidden', '');
        });
      });

      // Export CSV/JSON
      document.getElementById('btn-export-csv').addEventListener('click', () => {
        this.exportData('csv');
      });

      document.getElementById('btn-export-json').addEventListener('click', () => {
        this.exportData('json');
      });

      // Générer mailto
      document.getElementById('btn-generate-mailto').addEventListener('click', () => {
        this.generateMailto();
      });

      // Formulaire d'ajout
      document.getElementById('form-add-item').addEventListener('submit', (e) => {
        e.preventDefault();
        this.addManualItem();
      });

      // Fermer modales sur clic backdrop
      document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
        backdrop.addEventListener('click', (e) => {
          const modal = e.target.closest('.modal');
          modal.setAttribute('hidden', '');
        });
      });
    },

    render() {
      this.updateTabs();
      this.updateFilters();
      this.updateContent();
      this.updateBadges();
    },

    updateTabs() {
      document.querySelectorAll('.tab-btn').forEach(btn => {
        const tabId = btn.dataset.tab;
        btn.setAttribute('aria-selected', tabId === State.activeTab);
      });
    },

    updateFilters() {
      // Filtres par sources
      const sourcesContainer = document.getElementById('sources-filters');
      const sources = CONFIG.SOURCES[State.activeTab];
      
      sourcesContainer.innerHTML = sources.map(source => `
        <label class="filter-option">
          <input type="checkbox" value="${Utils.escapeHtml(source)}" ${State.filters.sources.includes(source) ? 'checked' : ''}>
          <span>${Utils.escapeHtml(source)}</span>
        </label>
      `).join('');

      sourcesContainer.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
        checkbox.addEventListener('change', () => {
          const selectedSources = Array.from(sourcesContainer.querySelectorAll('input:checked')).map(cb => cb.value);
          State.setFilters({ sources: selectedSources });
          this.render();
        });
      });

      // Filtres par tags
      const tagsContainer = document.getElementById('tags-filters');
      const tags = CONFIG.TAGS[State.activeTab];
      
      tagsContainer.innerHTML = tags.map(tag => `
        <button class="filter-pill ${State.filters.tags.includes(tag) ? 'active' : ''}" data-tag="${Utils.escapeHtml(tag)}">
          ${Utils.escapeHtml(tag)}
        </button>
      `).join('');

      tagsContainer.querySelectorAll('.filter-pill').forEach(pill => {
        pill.addEventListener('click', (e) => {
          const tag = e.currentTarget.dataset.tag;
          const tags = State.filters.tags.includes(tag)
            ? State.filters.tags.filter(t => t !== tag)
            : [...State.filters.tags, tag];
          State.setFilters({ tags });
          this.render();
        });
      });
    },

    updateContent() {
      const provider = this.providerRegistry.getProvider(State.activeTab);
      const { items } = provider.fetchItems();

      // Appliquer le statut lu/épinglé depuis le storage
      items.forEach(item => {
        item.read = Storage.getReadStatus(State.activeTab, item.id) || item.read;
        item.pinned = Storage.getPinnedStatus(State.activeTab, item.id) || item.pinned;
      });

      // Filtrer
      let filteredItems = Utils.filterItems(items, State.filters);

      // Trier
      filteredItems = Utils.sortItems(filteredItems, State.sort);

      // Séparer les épinglés
      const pinnedItems = filteredItems.filter(item => item.pinned);
      const unpinnedItems = filteredItems.filter(item => !item.pinned);
      const sortedItems = [...pinnedItems, ...unpinnedItems];

      // Pagination
      const total = sortedItems.length;
      const start = (State.page - 1) * State.pageSize;
      const end = start + State.pageSize;
      const pageItems = sortedItems.slice(start, end);

      // Mettre à jour le titre et les stats
      document.getElementById('content-title').textContent = CONFIG.TABS[State.activeTab].name;
      document.getElementById('content-stats').textContent = `${total} résultat(s)`;

      // Afficher les items
      this.renderItems(pageItems);

      // Afficher la pagination
      this.renderPagination(total);
    },

    renderItems(items) {
      const container = document.getElementById('items-container');

      if (items.length === 0) {
        container.innerHTML = `
          <div class="empty-state">
            <div class="empty-state-icon">🔍</div>
            <h3 class="empty-state-title">Aucun résultat</h3>
            <p class="empty-state-message">Essayez de modifier vos filtres de recherche.</p>
          </div>
        `;
        return;
      }

      container.innerHTML = items.map(item => `
        <article class="item-card ${item.read ? '' : 'unread'} ${item.pinned ? 'pinned' : ''}" role="article" data-item-id="${item.id}">
          <div class="item-header">
            <h3 class="item-title">${Utils.escapeHtml(item.title)}</h3>
          </div>
          <div class="item-meta">
            <span class="item-source">${Utils.escapeHtml(item.source)}</span>
            <span class="item-date">🕒 ${Utils.formatRelativeDate(item.dateISO)}</span>
          </div>
          <p class="item-summary">${Utils.escapeHtml(item.summary)}</p>
          <div class="item-tags">
            ${item.tags.map(tag => `<span class="item-tag">${Utils.escapeHtml(tag)}</span>`).join('')}
          </div>
          <div class="item-actions">
            <button class="item-action-btn" data-action="copy" aria-label="Copier le lien">
              📋 Copier
            </button>
            <button class="item-action-btn" data-action="toggle-read" aria-label="${item.read ? 'Marquer comme non lu' : 'Marquer comme lu'}">
              ${item.read ? '👁 Non lu' : '✓ Lu'}
            </button>
            <button class="item-action-btn" data-action="toggle-pin" aria-label="${item.pinned ? 'Désépingler' : 'Épingler'}">
              ${item.pinned ? '📌 Épinglé' : '📍 Épingler'}
            </button>
            <a href="${Utils.escapeHtml(item.link)}" target="_blank" class="item-action-btn primary" rel="noopener noreferrer">
              🔗 Ouvrir
            </a>
          </div>
        </article>
      `).join('');

      // Bind actions
      container.querySelectorAll('.item-card').forEach(card => {
        const itemId = card.dataset.itemId;
        
        card.querySelector('[data-action="copy"]').addEventListener('click', async () => {
          const item = items.find(i => i.id === itemId);
          const success = await Utils.copyToClipboard(item.link);
          if (success) {
            Toast.show('Lien copié dans le presse-papiers', 'success');
          } else {
            Toast.show('Erreur lors de la copie', 'error');
          }
        });

        card.querySelector('[data-action="toggle-read"]').addEventListener('click', () => {
          this.toggleReadStatus(itemId);
        });

        card.querySelector('[data-action="toggle-pin"]').addEventListener('click', () => {
          this.togglePinStatus(itemId);
        });
      });
    },

    renderPagination(total) {
      const container = document.getElementById('pagination');
      const totalPages = Math.ceil(total / State.pageSize);

      if (totalPages <= 1) {
        container.innerHTML = '';
        return;
      }

      const pages = [];
      for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= State.page - 1 && i <= State.page + 1)) {
          pages.push(i);
        } else if (pages[pages.length - 1] !== '...') {
          pages.push('...');
        }
      }

      container.innerHTML = `
        <button class="pagination-btn" ${State.page === 1 ? 'disabled' : ''} data-page="prev">
          ← Précédent
        </button>
        ${pages.map(page => {
          if (page === '...') {
            return '<span class="pagination-info">...</span>';
          }
          return `
            <button class="pagination-btn ${page === State.page ? 'active' : ''}" data-page="${page}">
              ${page}
            </button>
          `;
        }).join('')}
        <button class="pagination-btn" ${State.page === totalPages ? 'disabled' : ''} data-page="next">
          Suivant →
        </button>
      `;

      container.querySelectorAll('[data-page]').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const page = e.currentTarget.dataset.page;
          if (page === 'prev') {
            State.setPage(Math.max(1, State.page - 1));
          } else if (page === 'next') {
            State.setPage(Math.min(totalPages, State.page + 1));
          } else {
            State.setPage(parseInt(page));
          }
          this.render();
          window.scrollTo({ top: 0, behavior: 'smooth' });
        });
      });
    },

    updateBadges() {
      ['budget', 'metz', 'social'].forEach(tabId => {
        const badge = document.getElementById(`badge-${tabId}`);
        const provider = this.providerRegistry.getProvider(tabId);
        const { items } = provider.fetchItems();
        
        // Compter les non-lus
        const unreadCount = items.filter(item => {
          const isRead = Storage.getReadStatus(tabId, item.id) || item.read;
          return !isRead;
        }).length;
        
        badge.textContent = unreadCount;
      });
    },

    toggleReadStatus(itemId) {
      const provider = this.providerRegistry.getProvider(State.activeTab);
      const { items } = provider.fetchItems();
      const item = items.find(i => i.id === itemId);
      
      if (item) {
        const currentStatus = Storage.getReadStatus(State.activeTab, item.id) || item.read;
        Storage.setReadStatus(State.activeTab, item.id, !currentStatus);
        this.render();
        Toast.show(currentStatus ? 'Marqué comme non lu' : 'Marqué comme lu', 'success');
      }
    },

    togglePinStatus(itemId) {
      const provider = this.providerRegistry.getProvider(State.activeTab);
      const { items } = provider.fetchItems();
      const item = items.find(i => i.id === itemId);
      
      if (item) {
        const currentStatus = Storage.getPinnedStatus(State.activeTab, item.id) || item.pinned;
        Storage.setPinnedStatus(State.activeTab, item.id, !currentStatus);
        this.render();
        Toast.show(currentStatus ? 'Désépinglé' : 'Épinglé', 'success');
      }
    },

    markAllAsRead() {
      const provider = this.providerRegistry.getProvider(State.activeTab);
      const { items } = provider.fetchItems();
      
      items.forEach(item => {
        Storage.setReadStatus(State.activeTab, item.id, true);
      });
      
      this.render();
      Toast.show('Tous les éléments ont été marqués comme lus', 'success');
    },

    openExportModal() {
      const provider = this.providerRegistry.getProvider(State.activeTab);
      const { items } = provider.fetchItems();
      let filteredItems = Utils.filterItems(items, State.filters);
      filteredItems = Utils.sortItems(filteredItems, State.sort);
      
      document.getElementById('export-count').textContent = filteredItems.length;
      
      const modal = document.getElementById('modal-export');
      modal.removeAttribute('hidden');
    },

    exportData(format) {
      const provider = this.providerRegistry.getProvider(State.activeTab);
      const { items } = provider.fetchItems();
      let filteredItems = Utils.filterItems(items, State.filters);
      filteredItems = Utils.sortItems(filteredItems, State.sort);

      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `veille-${State.activeTab}-${timestamp}.${format}`;
      
      if (format === 'csv') {
        const csv = Exporter.toCSV(filteredItems);
        Utils.downloadFile(csv, filename, 'text/csv');
      } else if (format === 'json') {
        const json = Exporter.toJSON(filteredItems);
        Utils.downloadFile(json, filename, 'application/json');
      }
      
      document.getElementById('modal-export').setAttribute('hidden', '');
      Toast.show(`Export ${format.toUpperCase()} réussi`, 'success');
    },

    openReportModal() {
      const provider = this.providerRegistry.getProvider(State.activeTab);
      const { items } = provider.fetchItems();
      let filteredItems = Utils.filterItems(items, State.filters);
      filteredItems = Utils.sortItems(filteredItems, State.sort);
      
      document.getElementById('report-tab').textContent = CONFIG.TABS[State.activeTab].name;
      document.getElementById('report-count').textContent = filteredItems.length;
      
      const topItems = filteredItems.slice(0, 5);
      const itemsList = document.getElementById('report-items');
      itemsList.innerHTML = topItems.map(item => `
        <li>${Utils.escapeHtml(item.title)}</li>
      `).join('');
      
      const modal = document.getElementById('modal-report');
      modal.removeAttribute('hidden');
    },

    generateMailto() {
      const provider = this.providerRegistry.getProvider(State.activeTab);
      const { items } = provider.fetchItems();
      let filteredItems = Utils.filterItems(items, State.filters);
      filteredItems = Utils.sortItems(filteredItems, State.sort);
      
      const mailto = Reporter.buildMailtoReport(filteredItems, CONFIG.TABS[State.activeTab].name);
      window.open(mailto, '_blank');
      
      document.getElementById('modal-report').setAttribute('hidden', '');
      Toast.show('Brouillon d\'email généré', 'success');
    },

    openAddModal() {
      document.getElementById('form-add-item').reset();
      const modal = document.getElementById('modal-add');
      modal.removeAttribute('hidden');
      document.getElementById('add-title').focus();
    },

    addManualItem() {
      const title = document.getElementById('add-title').value;
      const url = document.getElementById('add-url').value;
      const summary = document.getElementById('add-summary').value || 'Aucun résumé fourni.';
      const source = document.getElementById('add-source').value;
      const tagsInput = document.getElementById('add-tags').value;
      const tags = tagsInput.split(',').map(t => t.trim()).filter(t => t);

      const item = {
        id: Utils.generateId(),
        title,
        summary,
        link: url,
        source,
        tags,
        dateISO: new Date().toISOString(),
        pinned: false,
        read: false
      };

      const provider = this.providerRegistry.getProvider(State.activeTab);
      provider.addItem(item);
      
      document.getElementById('modal-add').setAttribute('hidden', '');
      this.render();
      Toast.show('Élément ajouté avec succès', 'success');
    }
  };

  // ===========================
  // SIMULATEUR DE NOUVELLES ENTRÉES
  // ===========================

  const NewItemsSimulator = {
    interval: null,

    init() {
      this.interval = setInterval(() => {
        this.injectNewItems();
      }, CONFIG.NEW_ITEM_INTERVAL);
    },

    injectNewItems() {
      const tabs = Object.keys(CONFIG.TABS);
      const randomTab = tabs[Math.floor(Math.random() * tabs.length)];
      const count = Math.random() > 0.5 ? 1 : 2;

      const provider = UI.providerRegistry.getProvider(randomTab);
      
      for (let i = 0; i < count; i++) {
        const item = this.generateRandomItem(randomTab);
        provider.addItem(item);
      }

      const tabName = CONFIG.TABS[randomTab].name;
      Toast.show(`${count} nouveau${count > 1 ? 'x' : ''} contenu${count > 1 ? 's' : ''} dans ${tabName}`, 'info');
      
      // Rafraîchir si on est sur l'onglet concerné
      if (State.activeTab === randomTab) {
        UI.render();
      } else {
        UI.updateBadges();
      }
    },

    generateRandomItem(tabId) {
      const sources = CONFIG.SOURCES[tabId];
      const tags = CONFIG.TAGS[tabId];
      
      const titles = {
        budget: [
          'Nouvelle proposition de loi sur la fiscalité verte',
          'Amendement budgétaire adopté à l\'unanimité',
          'Rapport de la Cour des Comptes sur les dépenses publiques',
          'Budget rectificatif : ajustements en cours de discussion'
        ],
        metz: [
          'Annonce du maire : nouveau projet de rénovation urbaine',
          'Metz accueille une délégation européenne',
          'Consultation citoyenne : participez au futur de la ville',
          'Inauguration d\'un nouveau complexe sportif'
        ],
        social: [
          '[LinkedIn] Tendances RH 2026 : ce qui va changer',
          '[Facebook] Événement communautaire : inscriptions ouvertes',
          '[X] Débat enflammé sur les nouvelles régulations',
          '[Instagram] Campagne virale : 500k vues en quelques heures'
        ]
      };

      const summaries = {
        budget: [
          'Le texte vise à encourager la transition écologique par des incitations fiscales innovantes.',
          'Un consensus rare sur un amendement structurant pour le budget 2026.',
          'Analyse approfondie des postes de dépenses et recommandations.',
          'Discussions en cours pour ajuster les prévisions budgétaires.'
        ],
        metz: [
          'Projet ambitieux de transformation du quartier avec concertation citoyenne.',
          'Rencontre stratégique pour échanger sur les bonnes pratiques urbaines.',
          'Les habitants sont invités à donner leur avis via une plateforme dédiée.',
          'Nouvel équipement sportif moderne pour les associations locales.'
        ],
        social: [
          'Analyse des nouvelles pratiques de management et de recrutement.',
          'Grande rencontre entre acteurs locaux pour discuter de projets communs.',
          'Échanges passionnés sur l\'impact des nouvelles législations.',
          'Contenu viral générant des milliers d\'interactions en peu de temps.'
        ]
      };

      const titlePool = titles[tabId];
      const summaryPool = summaries[tabId];
      const randomIndex = Math.floor(Math.random() * titlePool.length);

      return {
        id: Utils.generateId(),
        title: titlePool[randomIndex],
        summary: summaryPool[randomIndex],
        link: `https://example.com/${tabId}/${Date.now()}`,
        source: sources[Math.floor(Math.random() * sources.length)],
        tags: [tags[Math.floor(Math.random() * tags.length)], tags[Math.floor(Math.random() * tags.length)]],
        dateISO: new Date().toISOString(),
        pinned: false,
        read: false
      };
    }
  };

  // ===========================
  // INITIALISATION
  // ===========================

  document.addEventListener('DOMContentLoaded', () => {
    State.init();
    Toast.init();
    Router.init();
    UI.init();
    NewItemsSimulator.init();
  });

})();