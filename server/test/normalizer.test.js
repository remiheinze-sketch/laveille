diff --git a/server/test/normalizer.test.js b/server/test/normalizer.test.js
new file mode 100644
index 0000000000000000000000000000000000000000..c4c2fb9a5fbc6a9909829b048dc45f8677e363a3
--- /dev/null
+++ b/server/test/normalizer.test.js
@@ -0,0 +1,64 @@
+import test from 'node:test';
+import assert from 'node:assert/strict';
+import crypto from 'node:crypto';
+
+import { normalizeItem } from '../src/lib/normalizer.js';
+
+test('normalizeItem generates a deterministic id based on link and tab key', () => {
+  const input = {
+    tab_key: 'tech',
+    title: 'Interesting article',
+    link: 'https://example.com/articles/42'
+  };
+
+  const result = normalizeItem(input);
+  const expectedId = crypto.createHash('sha1').update(`${input.link}-${input.tab_key}`).digest('hex');
+
+  assert.equal(result.id, expectedId);
+});
+
+test('normalizeItem applies default values when optional fields are omitted', () => {
+  const now = Date.now();
+  const { date_iso, tags, pinned, read, summary, source_id, person_id } = normalizeItem({
+    tab_key: 'news',
+    title: 'Daily News',
+    link: 'https://example.com/news'
+  });
+
+  assert.ok(typeof date_iso === 'string' && !Number.isNaN(Date.parse(date_iso)));
+  assert.ok(Date.parse(date_iso) >= now - 1000, 'date_iso should be recent');
+  assert.deepEqual(tags, []);
+  assert.equal(pinned, false);
+  assert.equal(read, false);
+  assert.equal(summary, '');
+  assert.equal(source_id, null);
+  assert.equal(person_id, null);
+});
+
+test('normalizeItem keeps provided attributes unchanged', () => {
+  const input = {
+    tab_key: 'science',
+    source_id: 'source-123',
+    person_id: 'person-456',
+    title: 'Black hole discovery',
+    summary: 'Scientists find new evidence of black holes.',
+    link: 'https://example.com/science/black-hole',
+    tags: ['space', 'research'],
+    date_iso: '2024-01-02T03:04:05.678Z',
+    pinned: true,
+    read: true
+  };
+
+  const result = normalizeItem(input);
+
+  assert.equal(result.tab_key, input.tab_key);
+  assert.equal(result.source_id, input.source_id);
+  assert.equal(result.person_id, input.person_id);
+  assert.equal(result.title, input.title);
+  assert.equal(result.summary, input.summary);
+  assert.equal(result.link, input.link);
+  assert.deepEqual(result.tags, input.tags);
+  assert.equal(result.date_iso, input.date_iso);
+  assert.equal(result.pinned, input.pinned);
+  assert.equal(result.read, input.read);
+});
