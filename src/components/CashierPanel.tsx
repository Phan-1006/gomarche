import React, { useMemo, useState } from 'react';
import { Banknote, CheckCircle2, Clock, Loader2, Phone, ReceiptText, RotateCcw, XCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Order, PaymentRecord } from '../types';
import { errorMessage } from '../services/api';
import { formatDateTime, METHOD_LABELS, PAYMENT_STATUS_LABELS, PURPOSE_LABELS, STATUS_LABELS } from '../utils/orders';
import { EmptyState, StaffShell, TabButton } from './StaffShell';

type Row = { order: Order; payment: PaymentRecord };
type Tab = 'verify' | 'pending' | 'cash' | 'refunds' | 'journal';

const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

/** Espace caisse : vérifier les paiements Mobile Money, recevoir les espèces des livreurs, rembourser. */
export const CashierPanel: React.FC = () => {
  const { workOrders, orderAction, notify } = useApp();
  const [tab, setTab] = useState<Tab>('verify');
  const [busyId, setBusyId] = useState<string | null>(null);

  const rows: Row[] = useMemo(() => workOrders.flatMap((order) => order.payments.map((payment) => ({ order, payment }))), [workOrders]);

  const groups: Record<Tab, Row[]> = {
    verify: rows.filter((r) => r.payment.status === 'submitted'),
    pending: rows.filter((r) => r.payment.status === 'pending' && r.payment.method !== 'cash' && r.order.status !== 'cancelled'),
    cash: rows.filter((r) => r.payment.method === 'cash' && r.payment.status === 'pending' && r.order.status !== 'cancelled'),
    refunds: rows.filter((r) => r.payment.status === 'refund_due'),
    journal: rows
      .filter((r) => r.payment.status === 'confirmed' || r.payment.status === 'refunded' || r.payment.status === 'rejected')
      .sort((a, b) => (b.payment.confirmedAt || b.order.createdAt) - (a.payment.confirmedAt || a.order.createdAt))
      .slice(0, 100),
  };

  const today = startOfToday();
  const confirmedToday = rows.filter((r) => r.payment.status === 'confirmed' && (r.payment.confirmedAt || 0) >= today);
  const sum = (list: Row[]) => list.reduce((s, r) => s + r.payment.amountUsd, 0);
  const cashWithDrivers = groups.cash.filter((r) => r.payment.collectedByDriverAt);

  const act = async (row: Row, action: 'confirm' | 'reject' | 'refund', body?: object) => {
    setBusyId(row.payment.id);
    try {
      await orderAction(row.order.id, `payments/${row.payment.id}/${action}`, body);
      notify(action === 'confirm' ? 'Paiement validé.' : action === 'reject' ? 'Paiement refusé : le client est prévenu.' : 'Remboursement enregistré.');
    } catch (e) {
      notify(errorMessage(e), 'error');
    } finally {
      setBusyId(null);
    }
  };

  const tiles = [
    { label: 'Encaissé aujourd’hui', value: `$ ${sum(confirmedToday).toFixed(2)}`, hint: `${confirmedToday.length} paiement(s) validé(s)` },
    { label: 'À vérifier', value: String(groups.verify.length), hint: `$ ${sum(groups.verify).toFixed(2)} déclarés par les clients` },
    { label: 'Espèces chez les livreurs', value: `$ ${sum(cashWithDrivers).toFixed(2)}`, hint: `${cashWithDrivers.length} remise(s) à recevoir` },
    { label: 'Remboursements dus', value: String(groups.refunds.length), hint: `$ ${sum(groups.refunds).toFixed(2)}` },
  ];

  const emptyText: Record<Tab, string> = {
    verify: 'Aucun paiement à vérifier',
    pending: 'Aucun paiement en attente du client',
    cash: 'Aucune espèce à recevoir',
    refunds: 'Aucun remboursement dû',
    journal: 'Aucun paiement traité',
  };

  return (
    <StaffShell
      roles={['cashier', 'admin']}
      title="Caisse & paiements"
      subtitle="Aucune commande ne part en préparation sans paiement validé ici"
      actions={
        <>
          <TabButton active={tab === 'verify'} onClick={() => setTab('verify')}>À vérifier ({groups.verify.length})</TabButton>
          <TabButton active={tab === 'pending'} onClick={() => setTab('pending')}>En attente ({groups.pending.length})</TabButton>
          <TabButton active={tab === 'cash'} onClick={() => setTab('cash')}>Espèces ({groups.cash.length})</TabButton>
          <TabButton active={tab === 'refunds'} onClick={() => setTab('refunds')}>Remboursements ({groups.refunds.length})</TabButton>
          <TabButton active={tab === 'journal'} onClick={() => setTab('journal')}>Journal</TabButton>
        </>
      }
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {tiles.map((t) => (
          <div key={t.label} className="bg-white rounded-2xl p-4 border border-gray-200">
            <p className="text-[10px] font-black uppercase tracking-wider text-gray-500">{t.label}</p>
            <p className="text-2xl font-black text-gray-900 mt-1">{t.value}</p>
            <p className="text-[11px] text-gray-500">{t.hint}</p>
          </div>
        ))}
      </div>

      {tab === 'verify' && groups.verify.length > 0 && (
        <p className="text-xs text-gray-600 bg-amber-50 border border-amber-200 rounded-2xl p-3">
          Avant de valider, retrouvez la transaction sur le téléphone ou le portail marchand : <strong>même référence, même montant, même numéro payeur</strong>.
          Une référence inventée ne doit jamais être validée.
        </p>
      )}

      {groups[tab].length === 0 ? (
        <EmptyState icon={<ReceiptText className="w-10 h-10" />} title={emptyText[tab]} />
      ) : (
        <div className="bg-white rounded-3xl border border-gray-200 divide-y divide-gray-100 overflow-hidden">
          {groups[tab].map((row) => {
            const { order, payment } = row;
            const busy = busyId === payment.id;
            return (
              <div key={payment.id} className="p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                <div className="min-w-0 text-xs space-y-0.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono font-black text-sm text-gray-900">{order.orderNumber}</span>
                    <span className="font-bold text-gray-700">{PURPOSE_LABELS[payment.purpose]}</span>
                    <span className="text-gray-400">• {METHOD_LABELS[payment.method]}</span>
                    <span className="text-gray-400">• commande {STATUS_LABELS[order.status].toLowerCase()}</span>
                  </div>
                  <p className="text-gray-600">
                    {order.customer.name} •{' '}
                    <a href={`tel:${order.customer.phone}`} className="text-blue-600 font-bold inline-flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      {order.customer.phone}
                    </a>{' '}
                    • passée le {formatDateTime(order.createdAt)}
                  </p>
                  {payment.transactionRef && (
                    <p className="text-gray-900">
                      Réf. <span className="font-mono font-black bg-gray-100 px-2 py-0.5 rounded">{payment.transactionRef}</span>
                      {payment.payerPhone && <span> • payeur {payment.payerPhone}</span>}
                    </p>
                  )}
                  {payment.method === 'cash' && (
                    <p className={payment.collectedByDriverAt ? 'text-emerald-700 font-bold' : 'text-gray-500'}>
                      {payment.collectedByDriverAt
                        ? `Encaissé par ${order.deliveryDriverName || 'le livreur'} le ${formatDateTime(payment.collectedByDriverAt)} — à recevoir en caisse`
                        : 'Sera encaissé à la remise de la commande'}
                    </p>
                  )}
                  {payment.note && <p className="text-amber-800">{payment.note}</p>}
                  {tab === 'journal' && (
                    <p className="text-gray-500">
                      {PAYMENT_STATUS_LABELS[payment.status]}
                      {payment.confirmedByName && ` par ${payment.confirmedByName}`}
                      {payment.confirmedAt && ` le ${formatDateTime(payment.confirmedAt)}`}
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <div className="text-right mr-2">
                    <p className="text-base font-black text-gray-900">$ {payment.amountUsd.toFixed(2)}</p>
                    <p className="text-[11px] text-gray-500">{payment.amountCdf.toLocaleString('fr-FR')} FC</p>
                  </div>

                  {(tab === 'verify' || tab === 'pending') && (
                    <button type="button" disabled={busy} onClick={() => act(row, 'confirm')} className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl flex items-center gap-1.5 disabled:opacity-60">
                      {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                      <span>{tab === 'verify' ? 'Transaction trouvée : valider' : 'Paiement reçu : valider'}</span>
                    </button>
                  )}
                  {tab === 'verify' && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        const note = prompt('Motif du refus (visible par le client) :', 'Transaction introuvable chez l’opérateur.');
                        if (note !== null) act(row, 'reject', { note });
                      }}
                      className="px-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs rounded-xl flex items-center gap-1.5"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>Introuvable</span>
                    </button>
                  )}
                  {tab === 'cash' &&
                    (payment.collectedByDriverAt ? (
                      <button type="button" disabled={busy} onClick={() => act(row, 'confirm')} className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl flex items-center gap-1.5 disabled:opacity-60">
                        <Banknote className="w-4 h-4" />
                        <span>Espèces reçues du livreur</span>
                      </button>
                    ) : (
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" /> Livraison en cours
                      </span>
                    ))}
                  {tab === 'refunds' && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => confirm(`Confirmer que $ ${payment.amountUsd.toFixed(2)} ont été renvoyés au client ?`) && act(row, 'refund')}
                      className="px-4 py-2.5 bg-gray-900 hover:bg-black text-white font-black text-xs rounded-xl flex items-center gap-1.5 disabled:opacity-60"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>Remboursement effectué</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </StaffShell>
  );
};
