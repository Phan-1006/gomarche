import { api } from './api';

/**
 * Envoi d'images vers le serveur. La photo est réduite dans le navigateur avant l'envoi
 * (une photo de téléphone de 6 Mo devient ~200 Ko), puis stockée côté serveur : le lien
 * renvoyé est le même pour tous les appareils.
 */
export function shrinkImage(file: File, maxSide = 1200, quality = 0.85): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('Traitement de l’image impossible sur cet appareil.'));
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      // Le PNG conserve la transparence (logos) ; le reste part en JPEG, bien plus léger.
      resolve(canvas.toDataURL(file.type === 'image/png' ? 'image/png' : 'image/jpeg', quality));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Fichier image illisible. Utilisez un JPG, PNG ou WebP.'));
    };
    img.src = url;
  });
}

export async function uploadImageFile(file: File): Promise<string> {
  const imageBase64 = await shrinkImage(file);
  const { url } = await api<{ url: string }>('POST', '/upload', { imageBase64 });
  return url;
}
