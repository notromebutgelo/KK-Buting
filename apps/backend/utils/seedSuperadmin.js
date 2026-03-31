require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') })
const admin = require('firebase-admin')

const email = process.env.SEED_SUPERADMIN_EMAIL || 'superadmin@kkbuting.test'
const password = process.env.SEED_SUPERADMIN_PASSWORD || 'KKSuperAdmin123!'
const displayName = process.env.SEED_SUPERADMIN_NAME || 'KK Superadmin'

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    }),
    storageBucket:
      process.env.FIREBASE_STORAGE_BUCKET ||
      `${process.env.FIREBASE_PROJECT_ID || ''}.appspot.com`,
  })
}

const auth = admin.auth()
const db = admin.firestore()
if (process.env.FIREBASE_DATABASE_ID) {
  db.settings({ databaseId: process.env.FIREBASE_DATABASE_ID })
}

async function seedSuperadmin() {
  let userRecord

  try {
    userRecord = await auth.getUserByEmail(email)
    await auth.updateUser(userRecord.uid, {
      password,
      displayName,
      emailVerified: true,
    })
  } catch (error) {
    if (error && error.code === 'auth/user-not-found') {
      userRecord = await auth.createUser({
        email,
        password,
        displayName,
        emailVerified: true,
      })
    } else {
      throw error
    }
  }

  await auth.setCustomUserClaims(userRecord.uid, { role: 'superadmin' })

  let firestoreStatus = 'synced'
  try {
    await db.collection('users').doc(userRecord.uid).set(
      {
        uid: userRecord.uid,
        UserName: displayName,
        email,
        role: 'superadmin',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    )
  } catch (error) {
    firestoreStatus = 'failed'
    console.warn('Firestore user document was not written.')
    console.warn(String(error && error.message ? error.message : error))
  }

  console.log('Superadmin account ready:')
  console.log(`Email: ${email}`)
  console.log(`Password: ${password}`)
  console.log(`UID: ${userRecord.uid}`)
  console.log(`Firestore sync: ${firestoreStatus}`)
}

seedSuperadmin()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Failed to seed superadmin account.')
    console.error(error)
    process.exit(1)
  })
