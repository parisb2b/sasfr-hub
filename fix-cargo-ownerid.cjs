// Ajoute ownerId aux sessions Cargo migrées sans propriétaire
const admin = require('C:/DATA-MC-2030/TOTAL/node_modules/firebase-admin');
const { readFileSync } = require('fs');
const path = require('path');

const saPath = path.join(__dirname, 'sasfr-chantiers-firebase-adminsdk-fbsvc-b3e958fc2a.json');
const sa = JSON.parse(readFileSync(saPath, 'utf8'));
admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

async function fix() {
  // Trouver l'UID de parisb2b@gmail.com
  const usersSnap = await db.collection('users').where('email', '==', 'parisb2b@gmail.com').get();
  let adminUid = null;
  if (!usersSnap.empty) {
    adminUid = usersSnap.docs[0].id;
    console.log('Admin UID:', adminUid);
  } else {
    console.log('Admin non trouvé — recherche alternative...');
    const allUsers = await db.collection('users').limit(10).get();
    allUsers.forEach(d => console.log('  User:', d.id, d.data().email));
    if (!allUsers.empty) {
      adminUid = allUsers.docs[0].id;
      console.log('Fallback UID:', adminUid);
    }
  }

  // Corriger cargo_sessions sans ownerId
  const snap = await db.collection('cargo_sessions').get();
  console.log(`\nSessions totales: ${snap.docs.length}`);

  let fixed = 0;
  for (const doc of snap.docs) {
    const data = doc.data();
    if (!data.ownerId) {
      await doc.ref.update({
        ownerId: adminUid || 'parisb2b@gmail.com'
      });
      fixed++;
      console.log(`  ✅ ${doc.id} (${data.name || '?'}) — ownerId ajouté`);
    } else {
      console.log(`  ⏭️ ${doc.id} (${data.name || '?'}) — déjà ownerId=${data.ownerId}`);
    }
  }

  // Corriger cargo_config
  const configSnap = await db.collection('cargo_config').get();
  console.log(`\nConfigs totales: ${configSnap.docs.length}`);
  for (const doc of configSnap.docs) {
    const data = doc.data();
    console.log(`  ${doc.id}: ${Object.keys(data).join(', ')}`);
  }

  console.log(`\n✅ ${fixed} sessions corrigées.`);
}

fix().catch(e => { console.error('❌', e); process.exit(1); });
