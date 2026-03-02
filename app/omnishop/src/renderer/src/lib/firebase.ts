import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager
} from 'firebase/firestore'

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  // In dev the custom domain (e.g. omnishop.quadkore.app) requires Firebase
  // Hosting to be fully provisioned before it resolves. Using it before that
  // causes ERR_NAME_NOT_RESOLVED for the auth popup handler and
  // ERR_BLOCKED_BY_CSP for the invisible /__/auth/iframe that the SDK embeds
  // in the main window. The default firebaseapp.com domain always resolves, so
  // we use it in dev and only switch to the custom domain in production.
  authDomain: import.meta.env.DEV
    ? `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`
    : import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)

/**
 * Firestore with IndexedDB-backed persistent cache.
 * Enables offline-first reads/writes that sync automatically on reconnect.
 * persistentMultipleTabManager allows multi-window/tab use in Electron.
 */
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
})

export default app
