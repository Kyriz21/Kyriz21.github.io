/*
 * DiRi / LDR Playroom — Firebase client bootstrap
 * Firebase web configuration is public client configuration, not a server secret.
 * Do not add Admin SDK credentials or service-account keys to this repository.
 */
import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js';
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence
} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js';
import {
  getDatabase,
  ref,
  get,
  set,
  update,
  remove,
  onValue,
  runTransaction,
  onDisconnect,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-database.js';

export const firebaseConfig = {
  apiKey: 'AIzaSyAwyBmNBnV8STojq-grG161d9H0F_jSsgM',
  authDomain: 'ldr-playroom-diri.firebaseapp.com',
  databaseURL: 'https://ldr-playroom-diri-default-rtdb.asia-southeast1.firebasedatabase.app',
  projectId: 'ldr-playroom-diri',
  storageBucket: 'ldr-playroom-diri.firebasestorage.app',
  messagingSenderId: '139253379985',
  appId: '1:139253379985:web:c361e0d1e5418413a3a030'
};

const firebaseApp = initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);
export const db = getDatabase(firebaseApp);

export {
  ref, get, set, update, remove, onValue,
  runTransaction, onDisconnect, serverTimestamp,
  onAuthStateChanged, signInAnonymously,
  setPersistence, browserLocalPersistence
};

let authPromise;

/** Keep the anonymous UID stable across refreshes in the same browser profile. */
export async function ensureSignedIn() {
  await setPersistence(auth, browserLocalPersistence);
  if (auth.currentUser) return auth.currentUser;
  if (!authPromise) {
    authPromise = new Promise((resolve, reject) => {
      let unsubscribe = () => {};
      unsubscribe = onAuthStateChanged(auth, async (user) => {
        unsubscribe();
        try {
          if (user) {
            resolve(user);
            return;
          }
          const credential = await signInAnonymously(auth);
          resolve(credential.user);
        } catch (error) {
          reject(error);
        }
      }, reject);
    }).finally(() => {
      authPromise = null;
    });
  }
  return authPromise;
}
