import React, { useState } from 'react';
import { AlertCircle, CheckCircle2, KeyRound, X } from 'lucide-react';
import { Order } from '../types';
import { useApp } from '../context/AppContext';
import { errorMessage } from '../services/api';
import { cashDue } from '../utils/orders';

/** Remise d'une commande : le code à 6 chiffres du client prouve qu'il a bien reçu ses courses. */
export const HandoverDialog: React.FC<{ order: Order; onClose: () => void }> = ({ order, onClose }) => {
  const { orderAction, notify } = useApp();
  const [code, setCode] = useState('');
  const [cashCollected, setCashCollected] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const cash = cashDue(order);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await orderAction(order.id, 'handover', { code, cashCollected });
      notify('Remise validée.');
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div role="dialog" aria-modal="true" aria-label="Validation de la remise" className="bg-white rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl relative">
        <button type="button" aria-label="Fermer" onClick={onClose} className="absolute top-4 right-4 p-1 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100">
          <X className="w-5 h-5" />
        </button>
        <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
          <KeyRound className="w-6 h-6" />
        </div>
        <div className="text-center">
          <h3 className="text-lg font-black text-gray-900">Remise de {order.orderNumber}</h3>
          <p className="text-xs text-gray-500 mt-1">Demandez au client le code à 6 chiffres affiché sur sa commande.</p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <input
            type="text"
            inputMode="numeric"
            autoComplete="off"
            aria-label="Code de remise du client"
            required
            maxLength={6}
            placeholder="• • • • • •"
            className="w-full text-center font-mono text-3xl font-black px-4 py-3 rounded-2xl border-2 border-emerald-500 bg-emerald-50/50 tracking-[0.4em] text-gray-900 focus:outline-hidden"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            autoFocus
          />

          {cash && (
            <label className="flex items-start gap-3 p-3 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-gray-800 cursor-pointer">
              <input type="checkbox" checked={cashCollected} onChange={(e) => setCashCollected(e.target.checked)} className="mt-0.5 w-4 h-4 accent-emerald-600" />
              <span>
                J’ai encaissé <strong>$ {cash.amountUsd.toFixed(2)}</strong> (ou <strong>{cash.amountCdf.toLocaleString('fr-FR')} FC</strong>) en espèces
                {order.deliveryMode === 'delivery' ? ', à remettre à la caisse.' : '.'}
              </span>
            </label>
          )}

          {error && (
            <div role="alert" className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs text-red-700 font-bold">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={code.length !== 6 || busy || (!!cash && !cashCollected)}
            className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Valider la remise</span>
          </button>
        </form>
      </div>
    </div>
  );
};
