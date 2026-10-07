import React, { Suspense, useEffect, useMemo, useState } from 'react';
import {
  X,
  CheckCircle2,
  MapPin,
  ArrowRight,
  Clock,
  ChevronRight,
  Navigation,
  AlertCircle,
  Loader2,
  Banknote,
  Smartphone,
  Star,
  Store,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { DeliveryOption, LatLng, METHOD_TO_GATEWAY, Order, PaymentMethod, PaymentMode } from '../types';
import { GOMA_BOUNDS, GOMA_QUARTIERS } from '../data/mockData';
import { api, ApiError, errorMessage } from '../services/api';
import { MethodLogo } from './MobileMoneyLogos';
import { PaymentInstructions } from './PaymentInstructions';
import { useBotGuard } from './BotGuard';

const LiveMap = React.lazy(() => import('./LiveMap'));

const METHODS: PaymentMethod[] = ['mpesa', 'airtel_money', 'orange_money', 'afrimoney'];
const inGoma = (p: LatLng) =>
  p.lat >= GOMA_BOUNDS.minLat && p.lat <= GOMA_BOUNDS.maxLat && p.lng >= GOMA_BOUNDS.minLng && p.lng <= GOMA_BOUNDS.maxLng;

export const CheckoutModal: React.FC = () => {
  const {
    isCheckoutOpen,
    setIsCheckoutOpen,
    cart,
    cartTotalUsd,
    formatPrice,
    formatDualPrice,
    currentUser,
    deliveryMode,
    siteConfig,
    orders,
    clearCart,
    trackOrder,
    setActiveView,
    setIsAuthOpen,
  } = useApp();

  const [step, setStep] = useState<'info' | 'slot' | 'payment' | 'pay'>('info');
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [quartierGoma, setQuartierGoma] = useState(GOMA_QUARTIERS[0]);
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [coordinates, setCoordinates] = useState<LatLng | undefined>();
  const [showMap, setShowMap] = useState(false);
  const [locating, setLocating] = useState(false);

  const [options, setOptions] = useState<DeliveryOption[] | null>(null);
  const [optionKey, setOptionKey] = useState('');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('prepaid');
  const [method, setMethod] = useState<PaymentMethod>('mpesa');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [createdOrderId, setCreatedOrderId] = useState<string | null>(null);
  const bot = useBotGuard();

  const isDelivery = deliveryMode === 'delivery';
  const enabledMethods = useMemo(
    () => METHODS.filter((m) => siteConfig.paymentGateways[METHOD_TO_GATEWAY[m]]?.enabled),
    [siteConfig.paymentGateways]
  );

  const loadOptions = () =>
    api<{ options: DeliveryOption[] }>('GET', '/delivery-options')
      .then((d) => {
        setOptions(d.options);
        // On garde le choix du client s'il est toujours valable, sinon on revient au créneau recommandé.
        setOptionKey((prev) => (d.options.some((o) => o.key === prev) ? prev : d.options.find((o) => o.recommended)?.key || ''));
      })
      .catch(() => setOptions([]));

  useEffect(() => {
    if (!isCheckoutOpen) return;
    setStep('info');
    setError('');
    setCreatedOrderId(null);
    if (currentUser) {
      setCustomerName((v) => v || currentUser.name);
      setPhone((v) => v || currentUser.phone || '');
      setAddress((v) => v || currentUser.address || '');
      if (currentUser.commune && GOMA_QUARTIERS.includes(currentUser.commune)) setQuartierGoma(currentUser.commune);
    }
    loadOptions();
    // Les créneaux dépendent de l'heure : on les rafraîchit tant que la fenêtre reste ouverte.
    const interval = setInterval(loadOptions, 60_000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCheckoutOpen, currentUser?.id]);

  useEffect(() => {
    if (!enabledMethods.includes(method) && enabledMethods[0]) setMethod(enabledMethods[0]);
  }, [enabledMethods, method]);

  if (!isCheckoutOpen) return null;

  const handleClose = () => setIsCheckoutOpen(false);
  const primary = siteConfig.primaryColor || '#E2001A';
  const createdOrder: Order | undefined = orders.find((o) => o.id === createdOrderId);

  const option = options?.find((o) => o.key === optionKey);
  const isFreeDelivery = cartTotalUsd >= siteConfig.freeDeliveryThresholdUsd;
  const deliveryFeeUsd = !isDelivery || isFreeDelivery ? 0 : option?.priceUsd ?? 0;
  const totalUsd = Math.round((cartTotalUsd + deliveryFeeUsd) * 100) / 100;
  const depositUsd = Math.round(Math.min(totalUsd, Math.max(isDelivery ? option?.priceUsd ?? 0 : 0, 1)) * 100) / 100;
  const optionsByDay = (options || []).reduce<Record<string, DeliveryOption[]>>((acc, o) => {
    (acc[o.dayLabel] ||= []).push(o);
    return acc;
  }, {});

  const useMyPosition = () => {
    if (!navigator.geolocation) return setError('La géolocalisation n’est pas disponible sur cet appareil.');
    setLocating(true);
    setError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const p = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        if (!inGoma(p)) return setError('Votre position actuelle est en dehors de Goma. Placez le point de livraison sur la carte.');
        setCoordinates(p);
        setShowMap(true);
      },
      () => {
        setLocating(false);
        setShowMap(true);
        setError('Position GPS indisponible : autorisez la localisation ou placez le point sur la carte.');
      },
      { enableHighAccuracy: true, timeout: 12000 }
    );
  };

  const validateInfo = () => {
    if (customerName.trim().length < 2) return 'Indiquez le nom du destinataire.';
    if (phone.replace(/\D/g, '').length < 9) return 'Indiquez un numéro de téléphone valide (+243...).';
    if (isDelivery && address.trim().length < 5) return 'Indiquez l’avenue, le numéro et un repère.';
    return '';
  };

  const placeOrder = async () => {
    setError('');
    setBusy(true);
    try {
      const { order } = await api<{ order: Order }>('POST', '/orders', {
        items: cart.map((i) => ({ productId: i.product.id, quantity: i.quantity })),
        customer: { name: customerName, phone, address, quartierGoma, deliveryNotes, coordinates: isDelivery ? coordinates : undefined },
        deliveryMode,
        optionKey,
        paymentMode,
        paymentMethod: method,
        ...bot.fields,
      });
      trackOrder(order);
      setCreatedOrderId(order.id);
      clearCart();
      setStep('pay');
    } catch (e) {
      setError(errorMessage(e));
      bot.reset();
      if (e instanceof ApiError && e.code === 'slot_unavailable') {
        await loadOptions();
        setStep('slot');
      }
    } finally {
      setBusy(false);
    }
  };

  const ErrorBox = error ? (
    <div role="alert" className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2 text-xs text-red-700 font-bold">
      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
      <span>{error}</span>
    </div>
  ) : null;

  const stepClass = (active: boolean) => `font-bold ${active ? 'text-[#E2001A]' : 'text-gray-500'}`;
  const inputClass = 'w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-hidden focus:border-[#E2001A]';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div role="dialog" aria-modal="true" aria-label="Validation de la commande" className="bg-white rounded-3xl shadow-2xl max-w-xl w-full overflow-hidden border border-gray-100 flex flex-col max-h-[92vh]">
        <div className="p-4 sm:p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div>
            <h2 className="text-base font-black text-gray-900">Validation de la commande</h2>
            <p className="text-xs text-gray-500">
              {isDelivery ? 'Livraison à domicile à Goma' : 'Retrait au magasin'} • suivi en direct
            </p>
          </div>
          <button type="button" aria-label="Fermer" onClick={handleClose} className="p-1.5 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 py-2.5 bg-gray-50 border-b border-gray-100 flex items-center justify-between text-xs">
          <span className={stepClass(step === 'info')}>1. {isDelivery ? 'Adresse' : 'Contact'}</span>
          <ChevronRight className="w-4 h-4 text-gray-300" />
          <span className={stepClass(step === 'slot')}>2. Heure</span>
          <ChevronRight className="w-4 h-4 text-gray-300" />
          <span className={stepClass(step === 'payment' || step === 'pay')}>3. Paiement</span>
        </div>

        {!currentUser ? (
          <div className="p-8 text-center space-y-4">
            <p className="text-sm text-gray-700">
              Connectez-vous pour commander : votre compte permet de suivre votre livreur et de retrouver votre commande sur tous vos appareils.
            </p>
            <button
              type="button"
              onClick={() => setIsAuthOpen(true)}
              className="px-6 py-3 rounded-2xl text-white font-bold text-sm"
              style={{ backgroundColor: primary }}
            >
              Se connecter ou créer un compte
            </button>
          </div>
        ) : (
          <>
            {step === 'info' && (
              <div className="p-6 overflow-y-auto space-y-4">
                <div className="bg-red-50 border border-red-100 rounded-2xl p-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-600 font-medium">Panier :</p>
                    <p className="text-xl font-black text-gray-900">{formatDualPrice(cartTotalUsd).primary}</p>
                    <p className="text-xs text-gray-500">soit {formatDualPrice(cartTotalUsd).secondary}</p>
                  </div>
                  <span className="text-xs font-bold text-gray-700 bg-white px-3 py-1.5 rounded-xl border border-gray-200">
                    {cart.length} référence{cart.length > 1 ? 's' : ''}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="co-name" className="block text-xs font-bold text-gray-700 mb-1">Nom du destinataire *</label>
                    <input id="co-name" type="text" autoComplete="name" className={inputClass} value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
                  </div>
                  <div>
                    <label htmlFor="co-phone" className="block text-xs font-bold text-gray-700 mb-1">Téléphone joignable *</label>
                    <input id="co-phone" type="tel" inputMode="tel" autoComplete="tel" className={inputClass} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+243 8XX XXX XXX" />
                  </div>
                </div>

                {isDelivery ? (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label htmlFor="co-quartier" className="block text-xs font-bold text-gray-700 mb-1">Quartier de Goma *</label>
                        <select id="co-quartier" className={`${inputClass} bg-white font-bold`} value={quartierGoma} onChange={(e) => setQuartierGoma(e.target.value)}>
                          {GOMA_QUARTIERS.map((q) => (
                            <option key={q} value={q}>{q}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label htmlFor="co-address" className="block text-xs font-bold text-gray-700 mb-1">Avenue, numéro *</label>
                        <input id="co-address" type="text" autoComplete="street-address" className={inputClass} value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Ex : Avenue des Lilas n° 14" />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="co-notes" className="block text-xs font-bold text-gray-700 mb-1">Repère pour le livreur</label>
                      <input id="co-notes" type="text" className={inputClass} value={deliveryNotes} onChange={(e) => setDeliveryNotes(e.target.value)} placeholder="Couleur du portail, bâtiment voisin..." />
                    </div>

                    <div className="rounded-2xl border border-gray-200 p-3 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2 text-xs">
                          <MapPin className="w-4 h-4 text-[#E2001A]" />
                          <span className="font-bold text-gray-900">
                            {coordinates ? 'Point de livraison placé sur la carte' : 'Position exacte (recommandé)'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button type="button" onClick={useMyPosition} disabled={locating} className="px-3 py-1.5 rounded-xl bg-gray-900 text-white text-xs font-bold flex items-center gap-1.5 disabled:opacity-60">
                            {locating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Navigation className="w-3.5 h-3.5 text-emerald-400" />}
                            <span>Ma position</span>
                          </button>
                          <button type="button" onClick={() => setShowMap((v) => !v)} className="px-3 py-1.5 rounded-xl border border-gray-300 text-xs font-bold text-gray-700">
                            {showMap ? 'Masquer la carte' : 'Choisir sur la carte'}
                          </button>
                        </div>
                      </div>
                      {showMap && (
                        <Suspense fallback={<div className="h-56 rounded-2xl bg-gray-100 animate-pulse" />}>
                          <LiveMap
                            store={siteConfig.storeLocation}
                            destination={coordinates}
                            onPick={(p) => (inGoma(p) ? setCoordinates(p) : setError('Ce point est en dehors de la zone de livraison de Goma.'))}
                            className="h-56 w-full rounded-2xl overflow-hidden border border-gray-200 z-0"
                          />
                          <p className="text-[0.6875rem] text-gray-500">Touchez la carte à l’endroit exact de la livraison : le livreur y sera guidé.</p>
                        </Suspense>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="rounded-2xl bg-gray-50 border border-gray-200 p-4 flex items-start gap-3 text-xs text-gray-700">
                    <Store className="w-4 h-4 text-gray-500 shrink-0 mt-0.5" />
                    <span>
                      Retrait au magasin : <strong>{siteConfig.storeAddress}</strong>. Présentez votre code de retrait au comptoir.
                    </span>
                  </div>
                )}

                {ErrorBox}

                <button
                  type="button"
                  onClick={() => {
                    const problem = validateInfo();
                    setError(problem);
                    if (!problem) setStep('slot');
                  }}
                  className="w-full py-3.5 rounded-2xl text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg"
                  style={{ backgroundColor: primary }}
                >
                  <span>Choisir l’heure {isDelivery ? 'de livraison' : 'de retrait'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {step === 'slot' && (
              <div className="p-6 overflow-y-auto space-y-4">
                <div>
                  <h3 className="text-sm font-black text-gray-900">Quand souhaitez-vous {isDelivery ? 'être livré' : 'retirer vos courses'} ?</h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Service de {siteConfig.deliveryHours.start.replace(':', 'h')} à {siteConfig.deliveryHours.end.replace(':', 'h')} (heure de Goma). Seules les heures à venir sont proposées.
                  </p>
                </div>

                {options === null && <div className="h-40 rounded-2xl bg-gray-100 animate-pulse" />}
                {options?.length === 0 && (
                  <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 font-bold">
                    Aucun créneau n’est ouvert pour le moment. Réessayez un peu plus tard ou appelez le magasin au {siteConfig.storePhone}.
                  </div>
                )}

                {Object.entries(optionsByDay).map(([day, list]) => (
                  <fieldset key={day} className="space-y-2">
                    <legend className="text-[0.6875rem] font-black uppercase tracking-wider text-gray-500 mb-1">{day}</legend>
                    {list.map((o) => {
                      const selected = optionKey === o.key;
                      return (
                        <label
                          key={o.key}
                          className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all flex items-center justify-between gap-3 ${
                            selected ? 'border-[#E2001A] bg-red-50/40 ring-2 ring-red-100' : 'border-gray-200 hover:border-gray-300 bg-white'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <input type="radio" name="delivery_option" checked={selected} onChange={() => setOptionKey(o.key)} className="accent-[#E2001A] w-4 h-4 shrink-0" />
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="text-sm font-bold text-gray-900">{o.label}</span>
                                {o.recommended && (
                                  <span className="text-[0.625rem] bg-emerald-600 text-white font-black px-2 py-0.5 rounded-full uppercase flex items-center gap-1">
                                    <Star className="w-3 h-3 fill-white" /> Recommandé
                                  </span>
                                )}
                              </div>
                              <span className="text-xs text-gray-500 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {o.isExpress
                                  ? `Dans environ ${siteConfig.deliveryHours.expressMinutes} min (vers ${o.endTime.replace(':', 'h')})`
                                  : `Entre ${o.startTime.replace(':', 'h')} et ${o.endTime.replace(':', 'h')}`}
                              </span>
                            </div>
                          </div>
                          {isDelivery && (
                            <span className="text-sm font-black text-gray-900 shrink-0">
                              {isFreeDelivery ? 'Offerte' : `+ ${formatPrice(o.priceUsd)}`}
                            </span>
                          )}
                        </label>
                      );
                    })}
                  </fieldset>
                ))}

                {ErrorBox}

                <div className="flex items-center gap-3 pt-1">
                  <button type="button" onClick={() => setStep('info')} className="py-3 px-4 rounded-xl border border-gray-300 font-bold text-xs text-gray-700 hover:bg-gray-100">
                    Retour
                  </button>
                  <button
                    type="button"
                    disabled={!option}
                    onClick={() => {
                      setError('');
                      setStep('payment');
                    }}
                    className="flex-1 py-3 px-4 rounded-xl text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
                    style={{ backgroundColor: primary }}
                  >
                    <span>Continuer vers le paiement</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {step === 'payment' && option && (
              <div className="p-6 overflow-y-auto space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className={`p-4 rounded-2xl border-2 cursor-pointer ${paymentMode === 'prepaid' ? 'border-gray-900 bg-gray-50' : 'border-gray-200'}`}>
                    <input type="radio" name="payment_mode" className="sr-only" checked={paymentMode === 'prepaid'} onChange={() => setPaymentMode('prepaid')} />
                    <span className="flex items-center gap-2 text-sm font-black text-gray-900">
                      <Smartphone className="w-4 h-4" /> Payer maintenant
                    </span>
                    <span className="block text-xs text-gray-500 mt-1">Tout régler par Mobile Money : {formatPrice(totalUsd)}</span>
                  </label>
                  {siteConfig.codEnabled && (
                    <label className={`p-4 rounded-2xl border-2 cursor-pointer ${paymentMode === 'cod' ? 'border-gray-900 bg-gray-50' : 'border-gray-200'}`}>
                      <input type="radio" name="payment_mode" className="sr-only" checked={paymentMode === 'cod'} onChange={() => setPaymentMode('cod')} />
                      <span className="flex items-center gap-2 text-sm font-black text-gray-900">
                        <Banknote className="w-4 h-4" /> Payer à la {isDelivery ? 'livraison' : 'réception'}
                      </span>
                      <span className="block text-xs text-gray-500 mt-1">
                        Garantie de {formatPrice(depositUsd)} maintenant, solde de {formatPrice(totalUsd - depositUsd)} en espèces à la remise.
                      </span>
                    </label>
                  )}
                </div>

                <fieldset>
                  <legend className="text-xs font-bold text-gray-700 mb-2">
                    Opérateur Mobile Money pour {paymentMode === 'cod' ? 'la garantie' : 'le paiement'} :
                  </legend>
                  <div className="grid grid-cols-2 gap-3">
                    {enabledMethods.map((m) => (
                      <label key={m} className={`p-3 rounded-2xl border-2 cursor-pointer flex items-center gap-2 ${method === m ? 'border-gray-900 bg-gray-50 ring-2 ring-gray-900' : 'border-gray-200 hover:border-gray-300'}`}>
                        <input type="radio" name="method" checked={method === m} onChange={() => setMethod(m)} className="accent-red-600" />
                        <MethodLogo method={m} gateways={siteConfig.paymentGateways} />
                      </label>
                    ))}
                  </div>
                </fieldset>

                <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between text-gray-600">
                    <span>Articles :</span>
                    <span className="font-bold text-gray-900">{formatPrice(cartTotalUsd)}</span>
                  </div>
                  <div className="flex items-center justify-between text-gray-600">
                    <span>{isDelivery ? 'Livraison' : 'Retrait'} • {option.dayLabel}, {option.label} :</span>
                    <span className="font-bold text-gray-900">{deliveryFeeUsd === 0 ? 'Gratuit' : `+ ${formatPrice(deliveryFeeUsd)}`}</span>
                  </div>
                  <div className="pt-2 border-t border-gray-200 flex items-baseline justify-between text-sm">
                    <span className="font-black text-gray-900">Total :</span>
                    <span className="font-black text-base text-[#E2001A]">
                      {formatDualPrice(totalUsd).primary} <span className="text-xs text-gray-500">({formatDualPrice(totalUsd).secondary})</span>
                    </span>
                  </div>
                  {paymentMode === 'cod' && (
                    <div className="flex items-center justify-between text-emerald-800 font-bold pt-1">
                      <span>À régler maintenant (garantie) :</span>
                      <span>{formatPrice(depositUsd)}</span>
                    </div>
                  )}
                </div>

                {bot.element}
                {ErrorBox}

                <div className="flex items-center gap-3">
                  <button type="button" onClick={() => setStep('slot')} className="py-3 px-4 rounded-xl border border-gray-300 font-bold text-xs text-gray-700 hover:bg-gray-100">
                    Retour
                  </button>
                  <button
                    type="button"
                    onClick={placeOrder}
                    disabled={busy || cart.length === 0 || bot.pending}
                    className="flex-1 py-3 px-4 rounded-xl text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg disabled:opacity-60"
                    style={{ backgroundColor: primary }}
                  >
                    {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    <span>Confirmer la commande</span>
                  </button>
                </div>
              </div>
            )}

            {step === 'pay' && createdOrder && (
              <div className="p-6 overflow-y-auto space-y-4">
                <div className="text-center">
                  <h3 className="text-lg font-black text-gray-900">Commande {createdOrder.orderNumber} enregistrée</h3>
                  <p className="text-xs text-gray-500 mt-1">
                    {createdOrder.status === 'awaiting_payment'
                      ? 'Dernière étape : réglez par Mobile Money pour lancer la préparation.'
                      : 'Paiement validé : la préparation peut commencer.'}
                  </p>
                </div>

                <PaymentInstructions order={createdOrder} />

                <button
                  type="button"
                  onClick={() => {
                    trackOrder(createdOrder);
                    setActiveView('orders');
                    handleClose();
                  }}
                  className="w-full py-3 rounded-xl bg-gray-900 hover:bg-black text-white font-bold text-xs flex items-center justify-center gap-2"
                >
                  <Navigation className="w-4 h-4 text-emerald-400" />
                  <span>Suivre ma commande</span>
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
