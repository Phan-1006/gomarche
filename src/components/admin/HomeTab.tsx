import React, { useState } from 'react';
import { AlertCircle, ArrowDown, ArrowUp, Image as ImageIcon, Loader2, Plus, RotateCcw, Save, Trash2, Upload } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { HeroBanner, HomeTexts } from '../../types';
import { DEFAULT_HOME_TEXTS, homeTextsOf } from '../../data/mockData';
import { errorMessage } from '../../services/api';
import { uploadImageFile } from '../../services/imageUpload';

const inputClass = 'w-full px-3 py-2 text-sm border border-gray-300 rounded-xl focus:outline-hidden focus:border-[#E2001A]';
const MAX_BANNERS = 10;

// Regroupement des textes tel qu'ils apparaissent sur la page, de haut en bas.
const TEXT_GROUPS: { title: string; hint: string; fields: { key: keyof HomeTexts; label: string; long?: boolean }[] }[] = [
  {
    title: 'En-tête',
    hint: 'Le bandeau noir tout en haut (ordinateur) et la ligne sous le logo.',
    fields: [
      { key: 'announcement', label: 'Bandeau d’annonce' },
      { key: 'logoTagline', label: 'Ligne sous le logo' },
    ],
  },
  {
    title: 'Bannière',
    hint: 'Éléments communs à toutes les images défilantes.',
    fields: [
      { key: 'heroPromoButton', label: 'Second bouton' },
      { key: 'heroPoint1', label: 'Argument 1' },
      { key: 'heroPoint2', label: 'Argument 2' },
      { key: 'heroPoint3', label: 'Argument 3' },
    ],
  },
  {
    title: 'Bloc « rayons »',
    hint: '',
    fields: [
      { key: 'categoriesKicker', label: 'Sur-titre' },
      { key: 'categoriesTitle', label: 'Titre' },
      { key: 'categoriesSubtitle', label: 'Sous-titre', long: true },
    ],
  },
  {
    title: 'Bloc « promotions » (rouge)',
    hint: '',
    fields: [
      { key: 'dealsBadge', label: 'Étiquette' },
      { key: 'dealsTitle', label: 'Titre' },
      { key: 'dealsSubtitle', label: 'Sous-titre', long: true },
    ],
  },
  {
    title: 'Bloc « essentiels »',
    hint: '',
    fields: [
      { key: 'essentialsTitle', label: 'Titre' },
      { key: 'essentialsSubtitle', label: 'Sous-titre', long: true },
    ],
  },
  {
    title: 'Bloc « les plus demandés »',
    hint: '',
    fields: [
      { key: 'popularTitle', label: 'Titre' },
      { key: 'popularSubtitle', label: 'Sous-titre', long: true },
    ],
  },
  {
    title: 'Bloc « nouveautés »',
    hint: '',
    fields: [
      { key: 'newTitle', label: 'Titre' },
      { key: 'newSubtitle', label: 'Sous-titre', long: true },
    ],
  },
];

/** Page d'accueil : images défilantes de la bannière et textes des différents blocs. */
export const HomeTab: React.FC = () => {
  const { siteConfig, categories, saveSiteConfig, notify } = useApp();
  const [banners, setBanners] = useState<HeroBanner[]>(siteConfig.heroBanners);
  const [texts, setTexts] = useState<HomeTexts>(homeTextsOf(siteConfig));
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const setBanner = (id: string, patch: Partial<HeroBanner>) => setBanners((prev) => prev.map((b) => (b.id === id ? { ...b, ...patch } : b)));

  const move = (index: number, delta: number) =>
    setBanners((prev) => {
      const next = [...prev];
      const [item] = next.splice(index, 1);
      next.splice(index + delta, 0, item);
      return next;
    });

  const upload = async (id: string, file: File) => {
    setUploadingId(id);
    try {
      // Une bannière occupe toute la largeur : on garde plus de définition que pour une photo produit.
      setBanner(id, { image: await uploadImageFile(file, 1920, 0.8) });
    } catch (e) {
      notify(errorMessage(e), 'error');
    } finally {
      setUploadingId(null);
    }
  };

  const save = async () => {
    setError('');
    const incomplete = banners.find((b) => !b.image || !b.title.trim());
    if (incomplete) return setError('Chaque bannière doit avoir une image et un titre.');
    setBusy(true);
    const res = await saveSiteConfig({ heroBanners: banners, homeTexts: texts });
    setBusy(false);
    if (!res.success) return setError(res.message || 'Enregistrement impossible.');
    notify('Page d’accueil enregistrée. Les visiteurs la verront dans moins d’une minute.');
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-black text-gray-900">Images défilantes de la bannière</h3>
            <p className="text-xs text-gray-500">
              Elles défilent toutes les 6 secondes, dans cet ordre. Utilisez des photos larges (paysage), idéalement 1920 × 800 pixels : le texte se
              pose sur la partie gauche, assombrie.
            </p>
          </div>
          <button
            type="button"
            disabled={banners.length >= MAX_BANNERS}
            onClick={() =>
              setBanners([
                ...banners,
                { id: `banner-${Date.now()}`, image: '', tag: '', title: '', subtitle: '', ctaText: 'Faire mes courses', badgeBg: siteConfig.primaryColor },
              ])
            }
            className="px-4 py-2.5 rounded-xl bg-gray-900 text-white font-bold text-xs flex items-center gap-2 disabled:opacity-40"
          >
            <Plus className="w-4 h-4" />
            <span>Ajouter une bannière</span>
          </button>
        </div>

        {banners.length === 0 && (
          <p className="p-6 text-center text-sm text-gray-500 bg-gray-50 rounded-2xl">Aucune bannière : la page d’accueil commence directement par les rayons.</p>
        )}

        <div className="space-y-4">
          {banners.map((banner, index) => (
            <div key={banner.id} className="rounded-2xl border border-gray-200 p-4 grid grid-cols-1 lg:grid-cols-[18rem_1fr] gap-4">
              {/* Aperçu fidèle : même dégradé et même disposition que sur le site */}
              <div className="space-y-2">
                <div className="relative aspect-[5/2] rounded-xl overflow-hidden bg-gray-900 text-white">
                  {banner.image ? (
                    <img src={banner.image} alt="" className="absolute inset-0 w-full h-full object-cover" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-gray-500">
                      <ImageIcon className="w-8 h-8" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/60 to-transparent" />
                  <div className="relative p-3 space-y-1 max-w-[75%]">
                    {banner.tag && (
                      <span className="inline-block px-1.5 py-0.5 rounded-full text-[0.5rem] font-black uppercase" style={{ backgroundColor: banner.badgeBg || siteConfig.primaryColor }}>
                        {banner.tag}
                      </span>
                    )}
                    <p className="text-xs font-black leading-tight line-clamp-2">{banner.title || 'Titre de la bannière'}</p>
                    <p className="text-[0.5625rem] text-gray-200 line-clamp-2">{banner.subtitle}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <label className="flex-1 inline-flex items-center justify-center gap-2 text-xs font-bold text-gray-700 cursor-pointer border border-dashed border-gray-300 rounded-xl px-3 py-2 hover:bg-gray-50">
                    {uploadingId === banner.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                    <span>{banner.image ? 'Changer l’image' : 'Choisir une image'}</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      disabled={uploadingId !== null}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        e.target.value = '';
                        if (file) upload(banner.id, file);
                      }}
                    />
                  </label>
                  <button type="button" aria-label="Monter" disabled={index === 0} onClick={() => move(index, -1)} className="p-2 rounded-xl border border-gray-300 text-gray-700 disabled:opacity-30">
                    <ArrowUp className="w-4 h-4" />
                  </button>
                  <button type="button" aria-label="Descendre" disabled={index === banners.length - 1} onClick={() => move(index, 1)} className="p-2 rounded-xl border border-gray-300 text-gray-700 disabled:opacity-30">
                    <ArrowDown className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    aria-label="Supprimer cette bannière"
                    onClick={() => confirm('Supprimer cette bannière ?') && setBanners(banners.filter((b) => b.id !== banner.id))}
                    className="p-2 rounded-xl text-red-500 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 content-start">
                <div className="sm:col-span-2">
                  <label className="block text-[0.6875rem] font-bold text-gray-600 mb-1">Titre *</label>
                  <input aria-label={`Titre de la bannière ${index + 1}`} maxLength={120} className={inputClass} value={banner.title} onChange={(e) => setBanner(banner.id, { title: e.target.value })} />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[0.6875rem] font-bold text-gray-600 mb-1">Sous-titre</label>
                  <textarea aria-label={`Sous-titre de la bannière ${index + 1}`} rows={2} maxLength={240} className={inputClass} value={banner.subtitle} onChange={(e) => setBanner(banner.id, { subtitle: e.target.value })} />
                </div>
                <div>
                  <label className="block text-[0.6875rem] font-bold text-gray-600 mb-1">Étiquette (au-dessus du titre)</label>
                  <div className="flex items-center gap-2">
                    <input aria-label="Étiquette" maxLength={80} className={inputClass} value={banner.tag} onChange={(e) => setBanner(banner.id, { tag: e.target.value })} />
                    <input
                      type="color"
                      aria-label="Couleur de l’étiquette"
                      className="w-10 h-10 rounded-xl border border-gray-300 cursor-pointer shrink-0"
                      value={banner.badgeBg || siteConfig.primaryColor}
                      onChange={(e) => setBanner(banner.id, { badgeBg: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[0.6875rem] font-bold text-gray-600 mb-1">Texte du bouton</label>
                  <input aria-label="Texte du bouton" maxLength={40} className={inputClass} value={banner.ctaText} onChange={(e) => setBanner(banner.id, { ctaText: e.target.value })} />
                </div>
                <div>
                  <label className="block text-[0.6875rem] font-bold text-gray-600 mb-1">Le bouton mène à</label>
                  <select aria-label="Destination du bouton" className={`${inputClass} bg-white`} value={banner.categoryId || ''} onChange={(e) => setBanner(banner.id, { categoryId: e.target.value || undefined })}>
                    <option value="">Toute la boutique</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>Rayon : {c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[0.6875rem] font-bold text-gray-600 mb-1">Ou lien de l’image (https)</label>
                  <input aria-label="Lien de l’image" type="url" className={inputClass} value={banner.image} onChange={(e) => setBanner(banner.id, { image: e.target.value })} placeholder="https://.../photo.jpg" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-sm space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-black text-gray-900">Textes de la page d’accueil</h3>
            <p className="text-xs text-gray-500">Dans l’ordre où ils apparaissent. Un champ laissé vide n’affiche rien.</p>
          </div>
          <button
            type="button"
            onClick={() => confirm('Remettre tous les textes d’origine ? (à confirmer ensuite avec « Enregistrer »)') && setTexts(DEFAULT_HOME_TEXTS)}
            className="px-3 py-2 rounded-xl border border-gray-300 text-xs font-bold text-gray-700 hover:bg-gray-50 flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Textes d’origine</span>
          </button>
        </div>

        {TEXT_GROUPS.map((group) => (
          <fieldset key={group.title} className="space-y-2">
            <legend className="text-sm font-black text-gray-900">{group.title}</legend>
            {group.hint && <p className="text-xs text-gray-500">{group.hint}</p>}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {group.fields.map((field) => (
                <div key={field.key} className={field.long ? 'sm:col-span-2' : undefined}>
                  <label htmlFor={`ht-${field.key}`} className="block text-[0.6875rem] font-bold text-gray-600 mb-1">{field.label}</label>
                  <input id={`ht-${field.key}`} maxLength={200} className={inputClass} value={texts[field.key]} onChange={(e) => setTexts({ ...texts, [field.key]: e.target.value })} />
                </div>
              ))}
            </div>
          </fieldset>
        ))}
      </div>

      {error && (
        <div role="alert" className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs text-red-700 font-bold">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="sticky bottom-20 md:bottom-4 flex justify-end">
        <button type="button" onClick={save} disabled={busy || uploadingId !== null} className="px-6 py-3 rounded-2xl bg-[#E2001A] hover:bg-red-700 text-white font-black text-sm flex items-center gap-2 shadow-xl disabled:opacity-60">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          <span>Enregistrer la page d’accueil</span>
        </button>
      </div>
    </div>
  );
};
