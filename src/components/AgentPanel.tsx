import React, { useState } from 'react';
import {
  Layers,
  Plus,
  Edit,
  Trash2,
  DollarSign,
  TrendingUp,
  Tag,
  Check,
  Package,
  ShoppingBag,
  ArrowRight,
  Flame,
  ShieldCheck,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Product } from '../types';

export const AgentPanel: React.FC = () => {
  const {
    currentUser,
    categories,
    products,
    addProduct,
    updateProduct,
    deleteProduct,
    formatPrice,
    convertUsdToCdf,
    setActiveView,
    setIsAuthOpen,
  } = useApp();

  // Access check
  if (currentUser?.role !== 'category_agent' && currentUser?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 border border-emerald-200 shadow-2xl max-w-md w-full text-center space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black text-gray-900">Espace Agent de Rayon Réservé</h2>
          <p className="text-xs text-gray-600 leading-relaxed">
            Cette interface de gestion de rayon est strictement réservée aux agents habilités du supermarché Gomarché Goma.
          </p>
          <div className="pt-2 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => setIsAuthOpen(true)}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-colors"
            >
              Se connecter avec mes identifiants Agent
            </button>
            <button
              type="button"
              onClick={() => setActiveView('home')}
              className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl transition-colors"
            >
              Retour à la boutique
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Find category assigned to this agent
  const assignedCat = categories.find((c) => c.id === currentUser?.assignedCategoryId) || categories[0];
  const [selectedCatId, setSelectedCatId] = useState(assignedCat.id);

  const activeCategory = categories.find((c) => c.id === selectedCatId) || assignedCat;

  // Filter products for this rayon
  const rayonProducts = products.filter((p) => p.categoryId === activeCategory.id);

  // New product form
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('Gomarché Sélection');
  const [priceUsd, setPriceUsd] = useState(5.0);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [unit, setUnit] = useState('le kg');
  const [stock, setStock] = useState(40);
  const [image, setImage] = useState('');
  const [description, setDescription] = useState('');

  const [toast, setToast] = useState('');

  const triggerToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingProduct) {
      updateProduct({
        ...editingProduct,
        name,
        brand,
        priceUsd: Number(priceUsd),
        discountPercent: Number(discountPercent),
        unit,
        stockCount: Number(stock),
        inStock: Number(stock) > 0,
        image: image || editingProduct.image,
        description,
        isPromo: Number(discountPercent) > 0 || activeCategory.isPromoCategory,
      });
      triggerToast('Produit mis à jour avec succès !');
    } else {
      addProduct({
        name,
        categoryId: activeCategory.id,
        brand,
        priceUsd: Number(priceUsd),
        discountPercent: Number(discountPercent),
        unit,
        rating: 4.8,
        reviewCount: 1,
        stockCount: Number(stock),
        inStock: Number(stock) > 0,
        image: image || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=600&q=80',
        description,
        isPromo: Number(discountPercent) > 0 || activeCategory.isPromoCategory,
      });
      triggerToast('Nouveau produit publié dans votre rayon !');
    }
    setIsModalOpen(false);
    setEditingProduct(null);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2 font-bold text-sm">
          <Check className="w-5 h-5 bg-white text-emerald-600 rounded-full p-0.5" />
          <span>{toast}</span>
        </div>
      )}

      {/* Top Banner */}
      <div className="bg-[#1C2024] text-white">
        <div className="max-w-7xl mx-auto px-4 py-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-lg">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black">
                  Espace Gestionnaire de Rayon Gomarché
                </h1>
                <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-black uppercase px-2 py-0.5 rounded-full border border-emerald-500/30">
                  Agent de Rayon
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                Connecté : <span className="text-white font-bold">{currentUser?.name}</span> ({currentUser?.email})
              </p>
            </div>
          </div>

          {/* Rayon Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">Rayon actif :</span>
            <select
              aria-label="Sélectionner le rayon actif"
              className="bg-gray-800 text-white text-xs font-bold px-3 py-2 rounded-xl border border-gray-700 cursor-pointer"
              value={selectedCatId}
              onChange={(e) => setSelectedCatId(e.target.value)}
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.isPromoCategory ? '🔥 (Promos)' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        {/* Rayon Header Card */}
        <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <img
              src={activeCategory.image}
              alt={activeCategory.name}
              className="w-16 h-16 rounded-2xl object-cover border border-gray-200"
            />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-gray-900">{activeCategory.name}</h2>
                {activeCategory.isPromoCategory && (
                  <span className="text-xs bg-red-100 text-red-600 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Flame className="w-3 h-3 fill-red-600" />
                    Rayon Promotions
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">{activeCategory.description}</p>
              <p className="text-xs font-semibold text-emerald-600 mt-1">
                Responsable : {activeCategory.assignedAgentName || currentUser?.name}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setEditingProduct(null);
              setName('');
              setBrand('Gomarché Sélection');
              setPriceUsd(4.5);
              setDiscountPercent(activeCategory.isPromoCategory ? 20 : 0);
              setUnit('le kg');
              setStock(50);
              setImage('');
              setDescription('');
              setIsModalOpen(true);
            }}
            className="px-5 py-3 rounded-2xl bg-gray-900 hover:bg-black text-white font-bold text-xs flex items-center gap-2 shadow-md transition-transform transform active:scale-95 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Publier un article dans ce rayon</span>
          </button>
        </div>

        {/* Products in this Rayon */}
        <div className="bg-white rounded-3xl border border-gray-200 overflow-hidden shadow-xs">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-black text-sm text-gray-900">
              Articles gérés par votre rayon ({rayonProducts.length})
            </h3>
            <span className="text-xs text-gray-400">
              Changement immédiat des prix et des stocks
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-gray-500 uppercase font-bold text-[10px] border-b border-gray-200">
                <tr>
                  <th className="p-3.5">Produit</th>
                  <th className="p-3.5">Prix USD</th>
                  <th className="p-3.5">Prix CDF (FC)</th>
                  <th className="p-3.5">Remise Promotionnelle</th>
                  <th className="p-3.5">Niveau de Stock</th>
                  <th className="p-3.5 text-right">Actions Rayon</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rayonProducts.map((prod) => (
                  <tr key={prod.id} className="hover:bg-gray-50">
                    <td className="p-3.5 flex items-center gap-3">
                      <img
                        src={prod.image}
                        alt={prod.name}
                        className="w-12 h-12 rounded-xl object-contain bg-gray-50 p-1 border border-gray-200 shrink-0"
                      />
                      <div>
                        <p className="font-bold text-gray-900 line-clamp-1">{prod.name}</p>
                        <p className="text-[10px] text-gray-400 font-semibold">{prod.brand} • {prod.unit}</p>
                      </div>
                    </td>
                    <td className="p-3.5 font-bold text-gray-900">${prod.priceUsd.toFixed(2)}</td>
                    <td className="p-3.5 font-semibold text-gray-600">
                      {convertUsdToCdf(prod.priceUsd).toLocaleString('fr-FR')} FC
                    </td>
                    <td className="p-3.5">
                      {prod.discountPercent ? (
                        <span className="bg-red-100 text-red-700 font-black px-2 py-0.5 rounded text-[10px]">
                          -{prod.discountPercent}%
                        </span>
                      ) : (
                        <span className="text-gray-400">Tarif standard</span>
                      )}
                    </td>
                    <td className="p-3.5">
                      <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full text-[10px]">
                        {prod.stockCount} unités
                      </span>
                    </td>
                    <td className="p-3.5 text-right space-x-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingProduct(prod);
                          setName(prod.name);
                          setBrand(prod.brand);
                          setPriceUsd(prod.priceUsd);
                          setDiscountPercent(prod.discountPercent || 0);
                          setUnit(prod.unit);
                          setStock(prod.stockCount);
                          setImage(prod.image);
                          setDescription(prod.description);
                          setIsModalOpen(true);
                        }}
                        className="px-3 py-1 bg-gray-100 hover:bg-gray-200 font-bold rounded-lg text-gray-700"
                      >
                        Ajuster Prix / Stock
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteProduct(prod.id)}
                        className="p-1 text-red-500 hover:text-red-700 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal to add or edit product by agent */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-base font-black text-gray-900">
              {editingProduct ? 'Modifier l’Article du Rayon' : `Ajouter un Article à ${activeCategory.name}`}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Nom du produit *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Spaghetti Barilla 500g"
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Marque</label>
                <input
                  type="text"
                  placeholder="Ex: Gomarché Sélection / Nestlé"
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Prix ($ USD)</label>
                  <input
                    type="number"
                    step="0.05"
                    required
                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl font-bold"
                    value={priceUsd}
                    onChange={(e) => setPriceUsd(Number(e.target.value))}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Remise (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="90"
                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl font-bold text-red-600"
                    value={discountPercent}
                    onChange={(e) => setDiscountPercent(Number(e.target.value))}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Stock</label>
                  <input
                    type="number"
                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl"
                    value={stock}
                    onChange={(e) => setStock(Number(e.target.value))}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Conditionnement / Unité</label>
                <input
                  type="text"
                  placeholder="Ex: le sachet 1kg, la boîte"
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">URL Image Produit</label>
                <input
                  type="text"
                  placeholder="https://..."
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl"
                  value={image}
                  onChange={(e) => setImage(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Caractéristiques du produit..."
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold bg-emerald-600 text-white rounded-xl shadow-md hover:bg-emerald-700"
                >
                  Valider et Publier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
