import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager
} from 'firebase/firestore'

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: 'AIzaSyDbcKJkSKLJLz1MCbrKzfwIZ2FkWhuRoJ8',
  authDomain: 'kimputerhauz-4c6d7.firebaseapp.com',
  projectId: 'kimputerhauz-4c6d7',
  storageBucket: 'kimputerhauz-4c6d7.firebasestorage.app',
  messagingSenderId: '247816421238',
  appId: '1:247816421238:web:00098ec6608c612774c457',
  measurementId: 'G-XFNEE1Y2N6'
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
