import React, { useState } from 'react';
import { AlertCircle, CheckCircle2, Clock, Copy, Loader2 } from 'lucide-react';
import { METHOD_TO_GATEWAY, Order, PaymentMethod } from '../types';
import { useApp } from '../context/AppContext';
import { errorMessage } from '../services/api';
import { duePayment, METHOD_LABELS, PURPOSE_LABELS } from '../utils/orders';
import { MethodLogo } from './MobileMoneyLogos';

/**
 * Étape de paiement Mobile Money d'une commande : le client envoie le montant au numéro marchand
 * depuis son téléphone, puis recopie ici l'identifiant de transaction reçu par SMS. La caisse
 * vérifie ensuite la transaction avant de valider la commande.
 */
export const PaymentInstructions: React.FC<{ order: Order }> = ({ order }) => {
  const { siteConfig, orderAction, notify } = useApp();
  const payment = duePayment(order);
  const submitted = order.payments.find((p) => p.status === 'submitted');
  const [transactionRef, setTransactionRef] = useState('');
  const [payerPhone, setPayerPhone] = useState(order.customer.phone);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (!payment) {
    if (!submitted) return null;
    return (
      <div className="bg-sky-50 border border-sky-200 rounded-3xl p-5 flex items-start gap-3">
        <Clock className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-black text-gray-900">Paiement en cours de vérification</p>
          <p className="text-gray-600 mt-0.5">
            Référence <span className="font-mono font-bold">{submitted.transactionRef}</span> transmise à la caisse. Votre commande
            sera confirmée dès que la transaction aura été vérifiée — cette page se met à jour toute seule.
          </p>
        </div>
      </div>
    );
  }

  const method = payment.method as PaymentMethod;
  const gateway = siteConfig.paymentGateways[METHOD_TO_GATEWAY[method]];
  const expiresAt = order.createdAt + siteConfig.paymentTimeoutMinutes * 60_000;

  const copy = (value: string) => {
    navigator.clipboard?.writeText(value).then(
      () => notify('Copié.'),
      () => {}
    );
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await orderAction(order.id, `payments/${payment.id}/submit`, { transactionRef, payerPhone });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-white border-2 border-amber-300 rounded-3xl p-5 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <span className="text-[10px] font-black uppercase tracking-wider text-amber-800">{PURPOSE_LABELS[payment.purpose]}</span>
          <p className="text-2xl font-black text-gray-900">
            $ {payment.amountUsd.toFixed(2)}{' '}
            <span className="text-sm font-bold text-gray-500">ou {payment.amountCdf.toLocaleString('fr-FR')} FC</span>
          </p>
        </div>
        <MethodLogo method={method} gateways={siteConfig.paymentGateways} size="md" />
      </div>

      {payment.status === 'rejected' && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2 text-xs text-red-700 font-bold">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            La caisse n’a pas retrouvé votre transaction{payment.transactionRef ? ` (${payment.transactionRef})` : ''}
            {payment.note ? ` : ${payment.note}` : '.'} Vérifiez la référence et renvoyez-la.
          </span>
        </div>
      )}

      <ol className="space-y-2 text-sm text-gray-700 list-decimal list-inside">
        <li>
          Depuis votre téléphone, envoyez le montant par <strong>{gateway.displayName || METHOD_LABELS[method]}</strong> au numéro marchand :
          {gateway.merchantNumber ? (
            <button
              type="button"
              onClick={() => copy(gateway.merchantNumber)}
              className="mt-1.5 w-full flex items-center justify-between gap-2 px-4 py-3 rounded-2xl bg-gray-900 text-white"
            >
              <span>
                <span className="block font-mono text-lg font-black tracking-wide">{gateway.merchantNumber}</span>
                <span className="block text-[11px] text-gray-300">Bénéficiaire : {gateway.merchantName}</span>
              </span>
              <Copy className="w-4 h-4 text-gray-300" />
            </button>
          ) : (
            <span className="block mt-1 text-xs font-bold text-red-700">
              Numéro marchand non configuré : appelez le magasin au {siteConfig.storePhone}.
            </span>
          )}
        </li>
        <li>
          Indiquez <strong className="font-mono">{order.orderNumber}</strong> comme motif si votre opérateur le propose.
        </li>
        <li>Recopiez ci-dessous l’identifiant de transaction reçu par SMS.</li>
      </ol>
      {gateway.instructions && <p className="text-xs text-gray-600 bg-gray-50 rounded-xl p-3">{gateway.instructions}</p>}

      <form onSubmit={submit} className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor={`ref-${payment.id}`} className="block text-xs font-bold text-gray-700 mb-1">
              ID de transaction (SMS) *
            </label>
            <input
              id={`ref-${payment.id}`}
              required
              minLength={6}
              maxLength={40}
              autoComplete="off"
              value={transactionRef}
              onChange={(e) => setTransactionRef(e.target.value.toUpperCase())}
              placeholder="Ex : MP241003.1532.A12345"
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm font-mono focus:outline-hidden focus:border-[#E2001A]"
            />
          </div>
          <div>
            <label htmlFor={`payer-${payment.id}`} className="block text-xs font-bold text-gray-700 mb-1">
              Numéro qui a payé *
            </label>
            <input
              id={`payer-${payment.id}`}
              required
              inputMode="tel"
              value={payerPhone}
              onChange={(e) => setPayerPhone(e.target.value)}
              placeholder="+243 8XX XXX XXX"
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-hidden focus:border-[#E2001A]"
            />
          </div>
        </div>

        {error && (
          <div role="alert" className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs text-red-700 font-bold">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={busy}
          className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
          <span>J’ai payé — envoyer la référence</span>
        </button>
        <p className="text-[11px] text-gray-500 text-center">
          Sans paiement avant {new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(expiresAt)}, la commande est
          annulée automatiquement et les articles remis en rayon. Ne communiquez jamais votre code PIN Mobile Money.
        </p>
      </form>
    </div>
  );
};
