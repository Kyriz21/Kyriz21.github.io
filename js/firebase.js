/* DiRi LDR Playroom — Firebase Web SDK configuration */
import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js';
import {
  getDatabase, ref, get, set, update, remove, onValue,
  runTransaction, onDisconnect, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-database.js';

// This is the client-side Firebase config supplied for project ldr-playroom-diri.
export const firebaseConfig = {
  apiKey: 'AIzaSyAwyBmNBnV8STojq-grG161d9H0F_jSsgM',
  authDomain: 'ldr-playroom-diri.firebaseapp.com',
  databaseURL: 'https://ldr-playroom-diri-default-rtdb.asia-southeast1.firebasedatabase.app',
  projectId: 'ldr-playroom-diri',
  storageBucket: 'ldr-playroom-diri.firebasestorage.app',
  messagingSenderId: '139253379985',
  appId: '1:139253379985:web:c361e0d1e5418413a3a030'
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);

export {
  ref, get, set, update, remove, onValue,
  runTransaction, onDisconnect, serverTimestamp,
  onAuthStateChanged, signInAnonymously
};

let authReady;
export function waitForAuth() {
  if (!authReady) {
    authReady = new Promise((resolve, reject) => {
      let unsubscribe = () => {};
      unsubscribe = onAuthStateChanged(auth, (user) => {
        unsubscribe();
        resolve(user);
      }, reject);
    });
  }
  return authReady;
}

export async function ensureSignedIn() {
  const existing = await waitForAuth();
  if (existing) return existing;
  const credential = await signInAnonymously(auth);
  return credential.user;
}
