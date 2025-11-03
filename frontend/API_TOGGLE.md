# Intégrer l'API au frontend (toggle démo/API)

Dans `frontend/index.html`, ajouter en haut (avant vos scripts) :
```html
<script>
  window.__USE_API__ = true; // passez à false pour rester en mode démo local
  window.__API_BASE__ = 'http://localhost:3000';
  window.__API_KEY__ = 'CHANGE_ME';
</script>
```

Dans `frontend/app.js`, ajoutez ce client :
```js
const ApiClient = (() => {
  const base = window.__API_BASE__ || '';
  const key = window.__API_KEY__ || '';
  async function _fetch(path, options={}){
    const res = await fetch(base + path, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key
      }
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }
  return {
    async fetchItems({ tab, search='', tags=[], sources=[], since='', page=1, pageSize=10 }){
      const qs = new URLSearchParams({
        tab, search,
        tags: tags.join(','),
        sources: sources.join(','),
        since, page, pageSize
      });
      return _fetch(`/api/items?` + qs.toString());
    },
    async addItem({ tab_key, title, link, summary='', tags=[] }){
      return _fetch('/api/items', {
        method: 'POST',
        body: JSON.stringify({ tab_key, title, link, summary, tags })
      });
    }
  };
})();
```
