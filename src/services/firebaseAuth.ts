import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Firebase ne sert qu'à prouver l'identité Google : le jeton obtenu est vérifié par notre
// serveur, qui ouvre ensuite sa propre session. Aucun rôle n'est décidé ici.
const auth = getAuth(initializeApp(firebaseConfig));

const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: 'select_account' });

/** Ouvre la fenêtre Google et renvoie le jeton d'identité à faire vérifier par le serveur. */
export async function googleIdToken(): Promise<string> {
  const result = await signInWithPopup(auth, provider);
  const idToken = await result.user.getIdToken();
  // La session vit côté serveur (cookie) : inutile de garder une session Firebase ouverte.
  await signOut(auth).catch(() => {});
  return idToken;
}
