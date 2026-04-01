require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') })
const admin = require('firebase-admin')

const email = process.env.SEED_MERCHANT_EMAIL || 'merchant@kkbuting.test'
const password = process.env.SEED_MERCHANT_PASSWORD || 'KKMerchant123!'
const displayName = process.env.SEED_MERCHANT_NAME || 'KK Test Merchant'
const businessName = process.env.SEED_MERCHANT_BUSINESS || 'KK Buting Test Cafe'
const category = process.env.SEED_MERCHANT_CATEGORY || 'Food & Beverage'
const address = process.env.SEED_MERCHANT_ADDRESS || 'Buting, Pasig City'
const shortDescription =
  process.env.SEED_MERCHANT_DESCRIPTION ||
  'Test merchant account for Expo Go login, QR scans, promotions, and products.'
const pointsRate = Number(process.env.SEED_MERCHANT_POINTS_RATE || 50)

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

async function seedMerchant() {
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

  await auth.setCustomUserClaims(userRecord.uid, {
    ...(userRecord.customClaims || {}),
    role: 'merchant',
  })

  await db.collection('users').doc(userRecord.uid).set(
    {
      uid: userRecord.uid,
      UserName: displayName,
      email,
      role: 'merchant',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  )

  const existingMerchantSnap = await db
    .collection('merchants')
    .where('ownerId', '==', userRecord.uid)
    .limit(1)
    .get()

  const merchantPayload = {
    ownerId: userRecord.uid,
    ownerName: displayName,
    ownerEmail: email,
    name: businessName,
    businessName,
    category,
    address,
    description: shortDescription,
    shortDescription,
    businessInfo: 'Open daily for testing merchant features in the app.',
    discountInfo: 'Use the youth QR before checkout to earn points.',
    termsAndConditions: 'Test merchant account for development use only.',
    pointsRate,
    status: 'approved',
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    approvedAt: admin.firestore.FieldValue.serverTimestamp(),
  }

  let merchantId
  if (existingMerchantSnap.empty) {
    const merchantRef = await db.collection('merchants').add({
      ...merchantPayload,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    })
    merchantId = merchantRef.id
  } else {
    const merchantRef = existingMerchantSnap.docs[0].ref
    await merchantRef.set(merchantPayload, { merge: true })
    merchantId = merchantRef.id
  }

  console.log('Merchant account ready:')
  console.log(`Email: ${email}`)
  console.log(`Password: ${password}`)
  console.log(`UID: ${userRecord.uid}`)
  console.log(`Merchant ID: ${merchantId}`)
  console.log(`Business Name: ${businessName}`)
}

seedMerchant()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Failed to seed merchant account.')
    console.error(error)
    process.exit(1)
  })
