// Migration Cargo : cargo-optimizer-fca82 → sasfr-chantiers
// Usage : node migrate-cargo.mjs
// Lit via REST API (règles ouvertes), écrit via Admin SDK

// Node.js 18+ a fetch() natif — pas besoin de node-fetch
import { readFileSync } from 'fs';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const CARGO_API_KEY = 'AIzaSyDyk2XwTDY2tjbnUsVRI-hg3jptd9sNe2Y';
const CARGO_PROJECT = 'cargo-optimizer-fca82';
const REST_BASE = `https://firestore.googleapis.com/v1/projects/${CARGO_PROJECT}/databases/(default)/documents`;

// Init Admin SDK pour sasfr-chantiers
const sa = JSON.parse(readFileSync('./sasfr-chantiers-firebase-adminsdk-fbsvc-b3e958fc2a.json', 'utf8'));
if (!getApps().length) initializeApp({ credential: cert(sa) });
const db = getFirestore();

// Conversion REST API → objet JS
function restToJS(fields) {
  if (!fields || typeof fields !== 'object') return null;
  const result = {};
  for (const [key, val] of Object.entries(fields)) {
    if (val.stringValue !== undefined) result[key] = val.stringValue;
    else if (val.integerValue !== undefined) result[key] = parseInt(val.integerValue);
    else if (val.doubleValue !== undefined) result[key] = parseFloat(val.doubleValue);
    else if (val.booleanValue !== undefined) result[key] = val.booleanValue;
    else if (val.timestampValue) result[key] = new Date(val.timestampValue);
    else if (val.mapValue) result[key] = restToJS(val.mapValue.fields);
    else if (val.arrayValue) result[key] = (val.arrayValue.values || []).map(v => restToJS(v.mapValue?.fields || {}));
    else if (val.nullValue !== undefined) result[key] = null;
    else result[key] = val;
  }
  return result;
}

async function fetchCollection(name) {
  const url = `${REST_BASE}/${name}?key=${CARGO_API_KEY}`;
  console.log(`📥 GET ${name}...`);
  const resp = await fetch(url);
  const data = await resp.json();
  if (!data.documents) {
    console.log(`   ⚠️ Aucun document dans ${name}`);
    return [];
  }
  // Pagination
  let allDocs = [...data.documents];
  let pageToken = data.nextPageToken;
  while (pageToken) {
    console.log(`   📄 Page suivante...`);
    const pResp = await fetch(`${url}&pageToken=${pageToken}`);
    const pData = await pResp.json();
    if (pData.documents) allDocs.push(...pData.documents);
    pageToken = pData.nextPageToken;
  }
  return allDocs;
}

async function migrate() {
  console.log('═══════════════════════════════════════');
  console.log('MIGRATION CARGO → sasfr-chantiers');
  console.log('═══════════════════════════════════════\n');

  // 1. Lire depuis Cargo (REST API)
  console.log('--- LECTURE SOURCE (cargo-optimizer-fca82) ---');
  const sessionsRest = await fetchCollection('cargo_sessions');
  const configsRest = await fetchCollection('cargo_config');

  console.log(`\n   cargo_sessions: ${sessionsRest.length} documents`);
  console.log(`   cargo_config: ${configsRest.length} documents`);

  // Afficher IDs
  for (const d of sessionsRest) {
    const id = d.name.split('/').pop();
    const name = d.fields?.name?.stringValue || '?';
    console.log(`     • ${id} (${name})`);
  }

  // 2. Convertir et écrire dans sasfr-chantiers
  console.log('\n--- ÉCRITURE CIBLE (sasfr-chantiers) ---');

  // cargo_sessions → cargo_sessions (même nom, pas de conflit)
  let copiedSessions = 0, skippedSessions = 0;
  for (const doc of sessionsRest) {
    const id = doc.name.split('/').pop();
    const data = restToJS(doc.fields);
    const name = data.name || '?';
    try {
      const existing = await db.collection('cargo_sessions').doc(id).get();
      if (existing.exists) {
        console.log(`   ⏭️ ${id} (${name}) — déjà présent`);
        skippedSessions++;
        continue;
      }
      await db.collection('cargo_sessions').doc(id).set(data);
      copiedSessions++;
      console.log(`   ✅ ${id} (${name}) — copié`);
    } catch(e) {
      console.error(`   ❌ ${id}: ${e.message}`);
    }
  }

  // cargo_config → cargo_config
  let copiedConfigs = 0, skippedConfigs = 0;
  for (const doc of configsRest) {
    const id = doc.name.split('/').pop();
    const data = restToJS(doc.fields);
    try {
      const existing = await db.collection('cargo_config').doc(id).get();
      if (existing.exists) {
        console.log(`   ⏭️ ${id} — déjà présent`);
        skippedConfigs++;
        continue;
      }
      await db.collection('cargo_config').doc(id).set(data);
      copiedConfigs++;
      console.log(`   ✅ ${id} — copié`);
    } catch(e) {
      console.error(`   ❌ ${id}: ${e.message}`);
    }
  }

  // 3. Résumé
  console.log('\n═══════════════════════════════════════');
  console.log('RÉSUMÉ');
  console.log(`   cargo_sessions: ${copiedSessions} copiés, ${skippedSessions} skip`);
  console.log(`   cargo_config: ${copiedConfigs} copiés, ${skippedConfigs} skip`);

  // Vérification
  const verifySessions = await db.collection('cargo_sessions').count().get();
  const verifyConfigs = await db.collection('cargo_config').count().get();
  console.log(`\n   VÉRIFICATION sasfr-chantiers:`);
  console.log(`   cargo_sessions: ${verifySessions.data().count} documents`);
  console.log(`   cargo_config: ${verifyConfigs.data().count} documents`);
  console.log('\n✅ Migration terminée.');
}

migrate().catch(e => { console.error('❌', e); process.exit(1); });
