// Migration Cargo : cargo-optimizer-fca82 → sasfr-chantiers (CommonJS)
// Usage : node migrate-cargo.cjs
const { readFileSync } = require('fs');
const path = require('path');

// Utiliser firebase-admin depuis TOTAL
const admin = require('C:/DATA-MC-2030/TOTAL/node_modules/firebase-admin');

const CARGO_API_KEY = 'AIzaSyDyk2XwTDY2tjbnUsVRI-hg3jptd9sNe2Y';
const CARGO_PROJECT = 'cargo-optimizer-fca82';
const REST_BASE = `https://firestore.googleapis.com/v1/projects/${CARGO_PROJECT}/databases/(default)/documents`;

// Init Admin SDK pour sasfr-chantiers
const saPath = path.join(__dirname, 'sasfr-chantiers-firebase-adminsdk-fbsvc-b3e958fc2a.json');
const sa = JSON.parse(readFileSync(saPath, 'utf8'));
admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

// Conversion REST API → objet JS
function restToJS(fields) {
  if (!fields || typeof fields !== 'object') return null;
  const result = {};
  for (const [key, val] of Object.entries(fields)) {
    if (val.stringValue !== undefined) result[key] = val.stringValue;
    else if (val.integerValue !== undefined) result[key] = parseInt(val.integerValue);
    else if (val.doubleValue !== undefined) result[key] = parseFloat(val.doubleValue);
    else if (val.booleanValue !== undefined) result[key] = val.booleanValue;
    else if (val.timestampValue) result[key] = admin.firestore.Timestamp.fromDate(new Date(val.timestampValue));
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

  for (const d of sessionsRest) {
    const id = d.name.split('/').pop();
    const name = d.fields?.name?.stringValue || '?';
    console.log(`     • ${id} (${name})`);
  }

  // 2. Écrire dans sasfr-chantiers
  console.log('\n--- ÉCRITURE CIBLE (sasfr-chantiers) ---');

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

  const verifySessions = await db.collection('cargo_sessions').count().get();
  const verifyConfigs = await db.collection('cargo_config').count().get();
  console.log(`\n   VÉRIFICATION sasfr-chantiers:`);
  console.log(`   cargo_sessions: ${verifySessions.data().count} documents`);
  console.log(`   cargo_config: ${verifyConfigs.data().count} documents`);
  console.log('\n✅ Migration terminée.');
}

migrate().catch(e => { console.error('❌', e); process.exit(1); });
