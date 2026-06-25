// Script de migration Cargo : cargo-optimizer-fca82 → sasfr-chantiers
// Exécution : node migrate-cargo.js
// Prérequis : être dans C:\DATA-MC-2030\SASFR-HUB

const admin = require('firebase-admin');
const { initializeApp } = require('@firebase/app');
const { getFirestore, getDocs, collection, doc, setDoc, deleteDoc } = require('@firebase/firestore');
const { getAuth, signInAnonymously } = require('@firebase/auth');

// ===== CONFIG =====
const CARGO_PROJECT = 'cargo-optimizer-fca82';
const SASFR_PROJECT = 'sasfr-chantiers';
const PREFIX = 'cargo_'; // préfixe pour éviter collisions

// ===== INIT SOURCE (cargo-optimizer-fca82) via client SDK =====
const cargoApp = initializeApp({
  apiKey: "AIzaSyDyk2XwTDY2tjbnUsVRI-hg3jptd9sNe2Y",
  authDomain: "cargo-optimizer-fca82.firebaseapp.com",
  projectId: CARGO_PROJECT,
  storageBucket: "cargo-optimizer-fca82.firebasestorage.app"
}, 'cargo-source');
const cargoDb = getFirestore(cargoApp);

// ===== INIT CIBLE (sasfr-chantiers) via Admin SDK =====
const serviceAccount = require('./sasfr-chantiers-firebase-adminsdk-fbsvc-b3e958fc2a.json');
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const targetDb = admin.firestore();

// ===== COLLECTIONS À MIGRER =====
const collections = [
  { source: 'cargo_sessions', target: PREFIX + 'sessions' },
  { source: 'cargo_config',   target: PREFIX + 'config' }
];

async function migrate() {
  console.log('═══════════════════════════════════════');
  console.log('MIGRATION CARGO → sasfr-chantiers');
  console.log('═══════════════════════════════════════');

  // Auth anonyme sur Cargo (règles ouvertes)
  try {
    const auth = getAuth(cargoApp);
    await signInAnonymously(auth);
    console.log('✅ Auth anonyme Cargo OK');
  } catch(e) {
    console.log('⚠️ Auth ignorée:', e.code);
  }

  for (const col of collections) {
    console.log(`\n📥 Lecture ${col.source}...`);
    try {
      const snap = await getDocs(collection(cargoDb, col.source));
      console.log(`   ${snap.docs.length} documents trouvés`);

      let copied = 0;
      for (const docSnap of snap.docs) {
        const data = docSnap.data();
        const targetDoc = targetDb.collection(col.target).doc(docSnap.id);

        // Vérifier si existe déjà (ne pas écraser)
        const existing = await targetDoc.get();
        if (existing.exists) {
          console.log(`   ⏭️ ${docSnap.id} — existe déjà, skip`);
          continue;
        }

        await targetDoc.set(data);
        copied++;
        console.log(`   ✅ ${docSnap.id} — copié (${JSON.stringify(data).length} octets)`);
      }
      console.log(`   📊 ${col.source}: ${copied} copiés, ${snap.docs.length - copied} skip`);
    } catch(e) {
      console.error(`   ❌ ${col.source}:`, e.message);
    }
  }

  // Vérification
  console.log('\n═══════════════════════════════════════');
  console.log('VÉRIFICATION');
  console.log('═══════════════════════════════════════');
  for (const col of collections) {
    const snap = await targetDb.collection(col.target).get();
    console.log(`   ${col.target}: ${snap.docs.length} documents`);
  }

  console.log('\n✅ Migration terminée.');
}

migrate().catch(e => {
  console.error('❌ Erreur:', e);
  process.exit(1);
});
