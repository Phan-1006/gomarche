import React, { useState, useEffect } from 'react';
import {
  X,
  CheckCircle2,
  Phone,
  MapPin,
  User,
  ShieldCheck,
  ArrowRight,
  Clock,
  ChevronRight,
  Smartphone,
  Lock,
  Zap,
  Navigation,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { PaymentMethod, Order } from '../types';
import { GOMA_QUARTIERS } from '../data/mockData';
import { AirtelMoneyLogo, OrangeMoneyLogo, MpesaLogo, AfriMoneyLogo } from './MobileMoneyLogos';

export const CheckoutModal: React.FC = () => {
  const {
    isCheckoutOpen,
    setIsCheckoutOpen,
    cart,
    cartTotalUsd,
    cartTotalCdf,
    formatPrice,
    convertUsdToCdf,
    currency,
    currentUser,
    deliveryMode,
    siteConfig,
    createOrder,
    setActiveView,
    setSelectedOrder,
  } = useApp();

  const [step, setStep] = useState<'info' | 'slot' | 'operator' | 'simulating_ussd' | 'success'>('info');
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('mpesa');
  const [customerName, setCustomerName] = useState(currentUser?.name || '');
  const [phone, setPhone] = useState(currentUser?.phone || '+243 812 000 000');
  const [address, setAddress] = useState(currentUser?.address || 'Avenue des Lilas N° 14');
  const [quartierGoma, setQuartierGoma] = useState(currentUser?.commune || 'Himbi');
  const [deliveryNotes, setDeliveryNotes] = useState('Portail métallique blanc, proche du lac Kivu.');

  // Delivery slot selection
  const [selectedSlotId, setSelectedSlotId] = useState(siteConfig.deliverySlots[0]?.id || 'slot-express');

  // USSD Simulation state
  const [ussdTimer, setUssdTimer] = useState(25);
  const [pinCode, setPinCode] = useState('');
  const [ussdStatus, setUssdStatus] = useState<'waiting' | 'verifying' | 'confirmed'>('waiting');
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null);

  useEffect(() => {
    if (currentUser) {
      if (!customerName) setCustomerName(currentUser.name);
      if (currentUser.phone && phone === '+243 812 000 000') setPhone(currentUser.phone);
      if (currentUser.address && address === 'Avenue des Lilas N° 14') setAddress(currentUser.address);
    }
  }, [currentUser, isCheckoutOpen]);

  // Selected delivery slot and fee
  const selectedSlot = siteConfig.deliverySlots.find((s) => s.id === selectedSlotId) || siteConfig.deliverySlots[0];
  const isFreeDelivery = cartTotalUsd >= siteConfig.freeDeliveryThresholdUsd;
  const deliveryFeeUsd = isFreeDelivery ? 0 : (selectedSlot?.priceUsd ?? 2.5);
  const deliveryFeeCdf = convertUsdToCdf(deliveryFeeUsd);
  const finalTotalUsd = cartTotalUsd + deliveryFeeUsd;
  const finalTotalCdf = cartTotalCdf + deliveryFeeCdf;

  // Countdown timer
  useEffect(() => {
    let interval: any;
    if (step === 'simulating_ussd' && ussdStatus === 'waiting' && ussdTimer > 0) {
      interval = setInterval(() => {
        setUssdTimer((prev) => prev - 1);
      }, 1000);
    } else if (ussdTimer === 0 && ussdStatus === 'waiting') {
      handleConfirmPin();
    }
    return () => clearInterval(interval);
  }, [step, ussdTimer, ussdStatus]);

  if (!isCheckoutOpen) return null;

  const gateways = siteConfig.paymentGateways || {} as any;

  const operatorInfo = {
    airtel_money: {
      name: gateways.airtel?.displayName || 'Airtel Money RDC (Goma)',
      color: '#E40000',
      prefix: gateways.airtel?.phonePrefix || '097, 099, 098',
      logo: <AirtelMoneyLogo size="md" customLogoUrl={gateways.airtel?.customLogoUrl} />,
    },
    orange_money: {
      name: gateways.orange?.displayName || 'Orange Money RDC (Goma)',
      color: '#FF6600',
      prefix: gateways.orange?.phonePrefix || '084, 085, 089',
      logo: <OrangeMoneyLogo size="md" customLogoUrl={gateways.orange?.customLogoUrl} />,
    },
    mpesa: {
      name: gateways.mpesa?.displayName || 'Vodacom M-Pesa (Goma)',
      color: '#00A859',
      prefix: gateways.mpesa?.phonePrefix || '081, 082, 083',
      logo: <MpesaLogo size="md" customLogoUrl={gateways.mpesa?.customLogoUrl} />,
    },
    afrimoney: {
      name: gateways.afrimoney?.displayName || 'Africell AfriMoney (Goma)',
      color: '#6C207E',
      prefix: gateways.afrimoney?.phonePrefix || '090, 091',
      logo: <AfriMoneyLogo size="md" customLogoUrl={gateways.afrimoney?.customLogoUrl} />,
    },
  }[selectedMethod];

  const handleStartPayment = () => {
    setUssdTimer(25);
    setPinCode('');
    setUssdStatus('waiting');
    setStep('simulating_ussd');
  };

  const handleConfirmPin = () => {
    setUssdStatus('verifying');
    // Automatic instant validation via Mobile Money API
    setTimeout(() => {
      setUssdStatus('confirmed');

      const prefix = {
        airtel_money: 'AIRTEL-GOMA',
        orange_money: 'OM-GOMA',
        mpesa: 'MPESA-GOMA',
        afrimoney: 'AFRI-GOMA',
      }[selectedMethod];

      const ref = `${prefix}-${Math.floor(100000 + Math.random() * 900000)}`;

      const newOrder = createOrder({
        customer: {
          name: customerName || 'Client Gomarché',
          email: currentUser?.email || 'client@gomarche.cd',
          phone: phone || '+243 812 000 000',
          address: address || 'Goma',
          quartierGoma: quartierGoma || 'Himbi',
          city: 'Goma',
          deliveryNotes,
        },
        items: [...cart],
        subtotalUsd: cartTotalUsd,
        subtotalCdf: cartTotalCdf,
        deliveryFeeUsd,
        deliveryFeeCdf,
        totalUsd: finalTotalUsd,
        totalCdf: finalTotalCdf,
        paymentMethod: selectedMethod,
        paymentStatus: 'completed',
        transactionRef: ref,
        status: 'paid',
        deliveryMode,
        deliverySlotId: selectedSlot.id,
        deliverySlotName: `${selectedSlot.label} (${selectedSlot.timeRange})`,
        loyaltyPointsEarned: Math.round(finalTotalUsd),
      });

      setCompletedOrder(newOrder);
      setStep('success');
    }, 1200);
  };

  const handleClose = () => {
    setIsCheckoutOpen(false);
    setStep('info');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full overflow-hidden border border-gray-100 flex flex-col max-h-[92vh]">
        {/* Top Header */}
        <div className="p-4 sm:p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center gap-2.5">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center text-white font-black text-xl"
              style={{ backgroundColor: siteConfig.primaryColor || '#E2001A' }}
            >
              G
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-base font-black text-gray-900">
                  Validation Commande & Paiement
                </h2>
                <span className="text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md">
                  Goma
                </span>
              </div>
              <p className="text-xs text-gray-500">
                Service exclusif Ville de Goma • Suivi GPS & Reçu Sécurisé
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Steps indicator */}
        <div className="px-5 py-2.5 bg-gray-50 border-b border-gray-100 flex items-center justify-between text-xs">
          <span className={`font-bold ${step === 'info' ? 'text-[#E2001A]' : 'text-gray-600'}`}>
            1. Adresse Goma
          </span>
          <ChevronRight className="w-4 h-4 text-gray-300" />
          <span className={`font-bold ${step === 'slot' ? 'text-[#E2001A]' : 'text-gray-600'}`}>
            2. Créneau & Frais
          </span>
          <ChevronRight className="w-4 h-4 text-gray-300" />
          <span className={`font-bold ${step === 'operator' || step === 'simulating_ussd' ? 'text-[#E2001A]' : 'text-gray-600'}`}>
            3. Mobile Money
          </span>
        </div>

        {/* Step 1: Destination in Goma */}
        {step === 'info' && (
          <div className="p-6 overflow-y-auto space-y-4">
            <div className="bg-red-50 border border-red-100 rounded-2xl p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600 font-medium">Panier Articles :</p>
                <p className="text-xl font-black text-gray-900">
                  {formatPrice(cartTotalUsd)}
                </p>
                <p className="text-xs text-gray-500">
                  soit {currency === 'USD' ? `${cartTotalCdf.toLocaleString('fr-FR')} FC` : `$ ${cartTotalUsd.toFixed(2)}`}
                </p>
              </div>
              <span className="text-xs font-bold text-gray-700 bg-white px-3 py-1.5 rounded-xl border border-gray-200">
                {cart.length} référence{cart.length > 1 ? 's' : ''}
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Nom complet du destinataire *
              </label>
              <input
                type="text"
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-hidden focus:border-[#E2001A]"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Ex: Mireille Tshimanga"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Numéro Mobile Money (+243) pour notification push *
              </label>
              <input
                type="text"
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-hidden focus:border-[#E2001A]"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+243 812 345 678"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Quartier de Goma *
                </label>
                <select
                  aria-label="Sélectionner le quartier de Goma"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-hidden focus:border-[#E2001A] bg-white font-bold"
                  value={quartierGoma}
                  onChange={(e) => setQuartierGoma(e.target.value)}
                >
                  {GOMA_QUARTIERS.map((q) => (
                    <option key={q} value={q}>
                      {q}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Ville (Exclusivité)
                </label>
                <input
                  type="text"
                  disabled
                  value="Goma (Nord-Kivu)"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm bg-gray-100 font-bold text-gray-700 cursor-not-allowed"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Avenue, Numéro et repère exact à Goma *
              </label>
              <input
                type="text"
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-hidden focus:border-[#E2001A]"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Ex: Avenue des Lilas N° 14, vers le lac Kivu"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Instructions pour le coursier moto
              </label>
              <input
                type="text"
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-hidden focus:border-[#E2001A]"
                value={deliveryNotes}
                onChange={(e) => setDeliveryNotes(e.target.value)}
                placeholder="Couleur du portail, sonnette, repère..."
              />
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setStep('slot')}
                className="w-full py-3.5 rounded-2xl text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition-transform transform active:scale-95"
                style={{ backgroundColor: siteConfig.primaryColor || '#E2001A' }}
              >
                <span>Choisir l'horaire de livraison & frais</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Delivery Slot & Fee (Calculated and added to total) */}
        {step === 'slot' && (
          <div className="p-6 overflow-y-auto space-y-4">
            <div>
              <h3 className="text-sm font-black text-gray-900">
                Sélectionnez votre créneau de livraison à Goma
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Les frais sont fixés selon l'urgence et s'additionnent à votre panier.
              </p>
            </div>

            {/* List of Time Slots */}
            <div className="space-y-2.5">
              {siteConfig.deliverySlots.map((slot) => {
                const isSelected = selectedSlotId === slot.id;
                return (
                  <div
                    key={slot.id}
                    onClick={() => setSelectedSlotId(slot.id)}
                    className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-center justify-between ${
                      isSelected
                        ? 'border-[#E2001A] bg-red-50/40 shadow-md ring-2 ring-red-100'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="delivery_slot"
                        checked={isSelected}
                        onChange={() => setSelectedSlotId(slot.id)}
                        className="accent-[#E2001A] w-4 h-4"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-gray-900">{slot.label}</span>
                          {slot.isExpress && (
                            <span className="text-[10px] bg-red-600 text-white font-black px-2 py-0.5 rounded-full uppercase">
                              Prioritaire
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-gray-500">{slot.timeRange}</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-sm font-black text-gray-900 block">
                        + {formatPrice(slot.priceUsd)}
                      </span>
                      <span className="text-[10px] text-gray-500">
                        {convertUsdToCdf(slot.priceUsd).toLocaleString('fr-FR')} FC
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pricing Recap Box */}
            <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200 space-y-1.5 text-xs">
              <div className="flex items-center justify-between text-gray-600">
                <span>Sous-total articles :</span>
                <span className="font-bold text-gray-900">{formatPrice(cartTotalUsd)}</span>
              </div>
              <div className="flex items-center justify-between text-gray-600">
                <span>Frais de livraison Goma ({selectedSlot.label}) :</span>
                <span className="font-black text-emerald-700">
                  + {formatPrice(deliveryFeeUsd)}
                </span>
              </div>
              <div className="pt-2 border-t border-gray-200 flex items-baseline justify-between text-sm">
                <span className="font-black text-gray-900">Total à payer :</span>
                <span className="font-black text-base text-[#E2001A]">
                  {formatPrice(finalTotalUsd)} ({currency === 'USD' ? `${finalTotalCdf.toLocaleString('fr-FR')} FC` : `$ ${finalTotalUsd.toFixed(2)}`})
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setStep('info')}
                className="py-3 px-4 rounded-xl border border-gray-300 font-bold text-xs text-gray-700 hover:bg-gray-100"
              >
                Retour
              </button>
              <button
                type="button"
                onClick={() => setStep('operator')}
                className="flex-1 py-3 px-4 rounded-xl text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg"
                style={{ backgroundColor: siteConfig.primaryColor || '#E2001A' }}
              >
                <span>Choisir l'opérateur Mobile Money</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Choose Mobile Money Operator */}
        {step === 'operator' && (
          <div className="p-6 overflow-y-auto space-y-4">
            <p className="text-xs text-gray-600">
              Sélectionnez votre compte Mobile Money pour valider automatiquement la transaction :
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(['mpesa', 'airtel_money', 'orange_money', 'afrimoney'] as PaymentMethod[]).map((method) => {
                const isSelected = selectedMethod === method;
                return (
                  <div
                    key={method}
                    onClick={() => setSelectedMethod(method)}
                    className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-center justify-between ${
                      isSelected
                        ? 'border-gray-900 bg-gray-50 shadow-md ring-2 ring-gray-900'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="method"
                        checked={isSelected}
                        onChange={() => setSelectedMethod(method)}
                        className="accent-red-600"
                      />
                      {method === 'airtel_money' && <AirtelMoneyLogo size="sm" customLogoUrl={gateways.airtel?.customLogoUrl} />}
                      {method === 'orange_money' && <OrangeMoneyLogo size="sm" customLogoUrl={gateways.orange?.customLogoUrl} />}
                      {method === 'mpesa' && <MpesaLogo size="sm" customLogoUrl={gateways.mpesa?.customLogoUrl} />}
                      {method === 'afrimoney' && <AfriMoneyLogo size="sm" customLogoUrl={gateways.afrimoney?.customLogoUrl} />}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 text-xs space-y-1">
              <div className="flex items-center justify-between text-gray-600">
                <span>Numéro client :</span>
                <span className="font-bold text-gray-900">{phone}</span>
              </div>
              <div className="flex items-center justify-between text-gray-600">
                <span>Créneau :</span>
                <span className="font-bold text-gray-900">{selectedSlot.label}</span>
              </div>
              <div className="flex items-center justify-between text-gray-900 font-bold pt-1 border-t border-gray-200">
                <span>Montant total :</span>
                <span className="text-emerald-700 font-black">{formatPrice(finalTotalUsd)}</span>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setStep('slot')}
                className="py-3 px-4 rounded-xl border border-gray-300 font-bold text-xs text-gray-700 hover:bg-gray-100"
              >
                Retour
              </button>
              <button
                type="button"
                onClick={handleStartPayment}
                className="flex-1 py-3 px-4 rounded-xl text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg"
                style={{ backgroundColor: operatorInfo.color }}
              >
                <span>Valider le débit avec {operatorInfo.name}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 4: USSD Push Phone Simulation */}
        {step === 'simulating_ussd' && (
          <div className="p-6 overflow-y-auto text-center space-y-5">
            <div className="mx-auto w-16 h-16 rounded-full bg-amber-50 border-2 border-amber-300 flex items-center justify-center text-amber-600 animate-pulse">
              <Smartphone className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-lg font-black text-gray-900">
                Notification Push Envoyée à Goma
              </h3>
              <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                Veuillez confirmer le débit de <span className="font-black text-gray-900">{formatPrice(finalTotalUsd)}</span> sur votre téléphone ({phone}).
              </p>
            </div>

            {/* Mobile Push Simulator */}
            <div className="max-w-xs mx-auto bg-gray-900 text-white rounded-3xl p-5 shadow-2xl border-4 border-gray-800 text-left">
              <div className="flex items-center justify-between pb-2 border-b border-gray-800 text-[10px] text-gray-400">
                <span>Gomarché Goma Gateway</span>
                <span>{ussdTimer}s</span>
              </div>
              <p className="text-xs text-amber-300 font-bold mt-2">
                Paiement Mobile Money automatique :
              </p>
              <p className="text-xs text-gray-300 mt-1">
                Entrez votre code PIN secret pour confirmer la commande.
              </p>

              <div className="mt-3 flex justify-center gap-2">
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className={`w-9 h-10 rounded-lg border flex items-center justify-center text-lg font-black ${
                      pinCode.length > i
                        ? 'border-emerald-400 bg-emerald-950/60 text-emerald-400'
                        : 'border-gray-700 bg-gray-800 text-gray-500'
                    }`}
                  >
                    {pinCode.length > i ? '●' : ''}
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() => {
                  setPinCode('1234');
                  setTimeout(() => handleConfirmPin(), 300);
                }}
                className="w-full mt-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{ussdStatus === 'verifying' ? 'Validation via API...' : 'Valider mon PIN sur mobile'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Step 5: Success & Access to Virtual Receipt / GPS Tracking */}
        {step === 'success' && completedOrder && (
          <div className="p-6 overflow-y-auto space-y-5 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div>
              <span className="text-[11px] font-black uppercase text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full">
                Paiement Validé Automatiquement via API
              </span>
              <h3 className="text-xl font-black text-gray-900 mt-2">
                Commande Confirmée à Goma !
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                Votre reçu virtuel a été généré avec votre Code Secret de Réception.
              </p>
            </div>

            {/* Secret Code Card */}
            <div className="bg-amber-50 rounded-2xl p-4 border border-amber-200 text-center">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-900 block mb-1">
                Votre Code Secret de Confirmation :
              </span>
              <span className="font-mono text-3xl font-black text-gray-900 tracking-widest">
                {completedOrder.confirmationCode}
              </span>
              <p className="text-[11px] text-gray-600 mt-1">
                Présentez ce code au coursier à Goma pour valider la livraison.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedOrder(completedOrder);
                  setActiveView('orders');
                  handleClose();
                }}
                className="py-3 px-4 rounded-xl bg-gray-900 hover:bg-black text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md"
              >
                <Navigation className="w-4 h-4 text-emerald-400" />
                <span>Voir mon Reçu & Tracé GPS</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveView('home');
                  handleClose();
                }}
                className="py-3 px-4 rounded-xl border border-gray-300 hover:bg-gray-100 font-bold text-xs text-gray-700"
              >
                Retour aux rayons
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
