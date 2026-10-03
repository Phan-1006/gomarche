import React, { useState } from 'react';
import { AlertCircle, Loader2, Save, ShieldCheck, Upload } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { GatewayKey, PaymentGatewayConfig, PaymentGatewayItemConfig, PaymentMethod } from '../../types';
import { errorMessage } from '../../services/api';
import { uploadImageFile } from '../../services/imageUpload';
import { METHOD_LABELS } from '../../utils/orders';
import { MethodLogo } from '../MobileMoneyLogos';

const GATEWAYS: { key: GatewayKey; method: PaymentMethod }[] = [
  { key: 'mpesa', method: 'mpesa' },
  { key: 'airtel', method: 'airtel_money' },
  { key: 'orange', method: 'orange_money' },
  { key: 'afrimoney', method: 'afrimoney' },
];

const inputClass = 'w-full px-3 py-2 text-sm border border-gray-300 rounded-xl focus:outline-hidden focus:border-[#E2001A]';

/** Moyens de paiement : numéros marchands affichés aux clients, paiement à la livraison, délais. */
export const PaymentsTab: React.FC = () => {
  const { siteConfig, saveSiteConfig, notify } = useApp();
  const [gateways, setGateways] = useState<PaymentGatewayConfig>(siteConfig.paymentGateways);
  const [codEnabled, setCodEnabled] = useState(siteConfig.codEnabled);
  const [timeout, setTimeoutMinutes] = useState(siteConfig.paymentTimeoutMinutes);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const setGateway = (key: GatewayKey, patch: Partial<PaymentGatewayItemConfig>) =>
    setGateways((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));

  const save = async () => {
    setError('');
    setBusy(true);
    const res = await saveSiteConfig({ paymentGateways: gateways, codEnabled, paymentTimeoutMinutes: timeout });
    setBusy(false);
    if (!res.success) return setError(res.message || 'Enregistrement impossible.');
    notify('Moyens de paiement enregistrés.');
  };

  const missingNumber = GATEWAYS.filter((g) => gateways[g.key].enabled && !gateways[g.key].merchantNumber);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-sm space-y-2">
        <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-600" /> Comment une commande est payée
        </h3>
        <ol className="text-xs text-gray-600 list-decimal list-inside space-y-1">
          <li>Le client envoie le montant à votre numéro marchand depuis son téléphone, puis saisit l’identifiant de la transaction.</li>
          <li>Un agent caissier vérifie la transaction sur le téléphone ou le portail marchand et la valide : la commande part en préparation.</li>
          <li>Sans paiement dans le délai ci-dessous, la commande est annulée et le stock libéré automatiquement.</li>
        </ol>
        <p className="text-xs text-gray-500">
          Aucune clé d’API ni mot de passe n’est saisi ici : ces secrets ne doivent jamais transiter par le navigateur. La validation automatique par un
          agrégateur se branche côté serveur (variable <code className="font-mono">PAYMENT_WEBHOOK_SECRET</code>, voir le README).
        </p>
      </div>

      {missingNumber.length > 0 && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2 text-xs text-amber-900 font-bold">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            Numéro marchand manquant pour : {missingNumber.map((g) => METHOD_LABELS[g.method]).join(', ')}. Tant qu’il est vide, les clients ne savent pas où payer.
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {GATEWAYS.map(({ key, method }) => {
          const g = gateways[key];
          return (
            <div key={key} className={`bg-white rounded-3xl p-5 border shadow-sm space-y-3 ${g.enabled ? 'border-gray-200' : 'border-gray-200 opacity-70'}`}>
              <div className="flex items-center justify-between gap-3">
                <MethodLogo method={method} gateways={gateways} size="md" />
                <label className="flex items-center gap-2 text-xs font-bold text-gray-700 cursor-pointer">
                  <input type="checkbox" checked={g.enabled} onChange={(e) => setGateway(key, { enabled: e.target.checked })} className="w-4 h-4 accent-emerald-600" />
                  Proposé aux clients
                </label>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 mb-1">Numéro marchand *</label>
                  <input aria-label={`Numéro marchand ${METHOD_LABELS[method]}`} inputMode="tel" className={`${inputClass} font-mono`} value={g.merchantNumber} onChange={(e) => setGateway(key, { merchantNumber: e.target.value })} placeholder="+243 8XX XXX XXX" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 mb-1">Nom du bénéficiaire</label>
                  <input aria-label="Nom du bénéficiaire" className={inputClass} value={g.merchantName} onChange={(e) => setGateway(key, { merchantName: e.target.value })} />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 mb-1">Nom affiché</label>
                  <input aria-label="Nom affiché" className={inputClass} value={g.displayName || ''} onChange={(e) => setGateway(key, { displayName: e.target.value })} placeholder={METHOD_LABELS[method]} />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 mb-1">Préfixes</label>
                  <input aria-label="Préfixes" className={inputClass} value={g.phonePrefix} onChange={(e) => setGateway(key, { phonePrefix: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-600 mb-1">Consigne affichée au client (facultatif)</label>
                <input aria-label="Consigne" className={inputClass} value={g.instructions || ''} onChange={(e) => setGateway(key, { instructions: e.target.value })} placeholder="Ex : composez *1122# puis Payer un marchand" />
              </div>
              <label className="inline-flex items-center gap-2 text-xs font-bold text-gray-700 cursor-pointer border border-dashed border-gray-300 rounded-xl px-3 py-2 hover:bg-gray-50">
                <Upload className="w-3.5 h-3.5" />
                <span>{g.customLogoUrl ? 'Changer le logo' : 'Logo personnalisé'}</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    e.target.value = '';
                    if (!file) return;
                    try {
                      setGateway(key, { customLogoUrl: await uploadImageFile(file) });
                    } catch (err) {
                      notify(errorMessage(err), 'error');
                    }
                  }}
                />
              </label>
              {g.customLogoUrl && (
                <button type="button" onClick={() => setGateway(key, { customLogoUrl: undefined })} className="ml-3 text-xs font-bold text-red-600 hover:underline">
                  Retirer le logo
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-sm grid grid-cols-1 sm:grid-cols-2 gap-5">
        <label className="flex items-start gap-3 cursor-pointer">
          <input type="checkbox" checked={codEnabled} onChange={(e) => setCodEnabled(e.target.checked)} className="mt-0.5 w-5 h-5 accent-emerald-600" />
          <span>
            <span className="block text-sm font-black text-gray-900">Paiement à la livraison</span>
            <span className="block text-xs text-gray-500">
              Le client règle d’abord les frais de livraison par Mobile Money (garantie), puis le solde en espèces au livreur, qui le remet à la caisse.
            </span>
          </span>
        </label>
        <div>
          <label htmlFor="pay-timeout" className="block text-sm font-black text-gray-900">Délai de paiement (minutes)</label>
          <span className="block text-xs text-gray-500 mb-1.5">Passé ce délai sans paiement, la commande est annulée.</span>
          <input id="pay-timeout" type="number" min={10} max={1440} className={`${inputClass} max-w-[140px]`} value={timeout} onChange={(e) => setTimeoutMinutes(Number(e.target.value))} />
        </div>
      </div>

      {error && (
        <div role="alert" className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs text-red-700 font-bold">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="flex justify-end">
        <button type="button" onClick={save} disabled={busy} className="px-6 py-3 rounded-2xl bg-[#E2001A] hover:bg-red-700 text-white font-black text-sm flex items-center gap-2 disabled:opacity-60">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          <span>Enregistrer les paiements</span>
        </button>
      </div>
    </div>
  );
};
