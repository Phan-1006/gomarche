import React, { useState } from 'react';
import { Camera, Check, Loader2, Search, Sparkles, Trash2, Upload } from 'lucide-react';
import { LensSuggestion } from '../types';
import { api, errorMessage } from '../services/api';
import { shrinkImage, uploadImageFile } from '../services/imageUpload';
import { useApp } from '../context/AppContext';

interface ProductPhotoPickerProps {
  image: string;
  onImage: (url: string) => void;
  productName: string;
  // Détails reconnus sur la photo (nom, marque...) : le formulaire décide quoi en faire.
  onDetails?: (details: Pick<LensSuggestion, 'name' | 'brand' | 'description' | 'unit'>) => void;
}

/**
 * Photo d'un produit, sans téléversement lourd :
 * 1. l'agent photographie le produit → il est reconnu → des photos propres sont proposées ;
 * 2. ou il cherche par nom ;
 * 3. un appui sur une photo copie directement son lien dans la fiche.
 * L'envoi d'un fichier et le collage d'un lien restent possibles.
 */
export const ProductPhotoPicker: React.FC<ProductPhotoPickerProps> = ({ image, onImage, productName, onDetails }) => {
  const { siteConfig } = useApp();
  const [busy, setBusy] = useState<'lens' | 'search' | 'upload' | null>(null);
  const [images, setImages] = useState<LensSuggestion['images'] | null>(null);
  const [message, setMessage] = useState('');

  const show = (result: LensSuggestion) => {
    setImages(result.images);
    setMessage(result.images.length ? '' : 'Aucune photo trouvée. Essayez un nom plus simple, ou envoyez votre propre photo.');
  };

  const identify = async (file: File) => {
    setBusy('lens');
    setMessage('');
    try {
      const result = await api<LensSuggestion>('POST', '/lens/identify', { imageBase64: await shrinkImage(file, 1024, 0.8) });
      onDetails?.(result);
      show(result);
      if (result.name) setMessage(`Produit reconnu : ${[result.brand, result.name].filter(Boolean).join(' – ')}`);
    } catch (e) {
      setMessage(errorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  const search = async () => {
    setBusy('search');
    setMessage('');
    try {
      show(await api<LensSuggestion>('POST', '/lens/search', { query: productName }));
    } catch (e) {
      setMessage(errorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  const upload = async (file: File) => {
    setBusy('upload');
    setMessage('');
    try {
      onImage(await uploadImageFile(file));
    } catch (e) {
      setMessage(errorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  const fileInput = (onFile: (f: File) => void, capture?: boolean) => (
    <input
      type="file"
      accept="image/jpeg,image/png,image/webp"
      {...(capture ? { capture: 'environment' as const } : {})}
      disabled={!!busy}
      className="hidden"
      onChange={(e) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (file) onFile(file);
      }}
    />
  );

  const actionClass = 'flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl text-[11px] font-bold cursor-pointer transition-colors text-center';

  return (
    <div className="space-y-2 pt-1 border-t border-gray-100">
      <span className="block text-xs font-bold text-gray-700">Photo du produit</span>

      {image && (
        <div className="flex items-center gap-3 p-2 bg-gray-50 rounded-xl border border-gray-200">
          <img src={image} alt="Aperçu" className="w-14 h-14 rounded-lg object-contain bg-white border border-gray-200 p-0.5" />
          <span className="min-w-0 flex-1 text-[10px] text-gray-500 truncate">{image}</span>
          <button type="button" onClick={() => onImage('')} className="p-1 text-red-500 hover:text-red-700" aria-label="Retirer la photo">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-3 gap-2">
        {siteConfig.lensEnabled && (
          <label className={`${actionClass} bg-gray-900 text-white hover:bg-black`}>
            {busy === 'lens' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4 text-emerald-400" />}
            <span>Photographier</span>
            {fileInput(identify, true)}
          </label>
        )}
        <button
          type="button"
          onClick={search}
          disabled={!!busy || productName.trim().length < 2}
          title={productName.trim().length < 2 ? 'Saisissez d’abord le nom du produit' : undefined}
          className={`${actionClass} bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 ${siteConfig.lensEnabled ? '' : 'col-span-2'}`}
        >
          {busy === 'search' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          <span>Chercher par nom</span>
        </button>
        <label className={`${actionClass} bg-white border border-dashed border-gray-300 text-gray-700 hover:bg-gray-50`}>
          {busy === 'upload' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          <span>Envoyer un fichier</span>
          {fileInput(upload)}
        </label>
      </div>

      {busy === 'lens' && <p className="text-[11px] text-gray-500">Reconnaissance du produit et recherche de photos en cours...</p>}
      {message && (
        <p className="text-[11px] font-bold text-gray-700 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
          {message}
        </p>
      )}

      {images && images.length > 0 && (
        <div>
          <span className="text-[10px] text-gray-500 font-semibold">Touchez la photo qui vous plaît : son lien est copié dans la fiche.</span>
          <div className="grid grid-cols-4 gap-2 mt-1 max-h-48 overflow-y-auto">
            {images.map((img) => {
              const selected = image === img.url;
              return (
                <button
                  key={img.url}
                  type="button"
                  onClick={() => onImage(img.url)}
                  title={[img.title, img.source].filter(Boolean).join(' — ')}
                  className={`relative aspect-square rounded-xl border-2 bg-white overflow-hidden ${selected ? 'border-emerald-500 ring-2 ring-emerald-200' : 'border-gray-200 hover:border-gray-400'}`}
                >
                  <img
                    src={img.thumb}
                    alt={img.title || 'Photo proposée'}
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-contain"
                    onError={(e) => ((e.currentTarget.parentElement as HTMLElement).style.display = 'none')}
                  />
                  {selected && (
                    <span className="absolute top-1 right-1 bg-emerald-500 text-white rounded-full p-0.5">
                      <Check className="w-3 h-3" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <input
        type="url"
        aria-label="Lien de la photo"
        placeholder="Ou collez un lien https://.../produit.jpg"
        className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl"
        value={image}
        onChange={(e) => onImage(e.target.value)}
      />
    </div>
  );
};
