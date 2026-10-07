import React, { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, History, KeyRound, Loader2, Mail, Trash2, UserPlus } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { AuditEntry, ROLE_LABELS, STAFF_ROLES, StaffMember, StaffRole } from '../../types';
import { api, errorMessage } from '../../services/api';
import { formatDateTime } from '../../utils/orders';

const inputClass = 'w-full px-3 py-2 text-sm border border-gray-300 rounded-xl focus:outline-hidden focus:border-[#E2001A]';

const ROLE_HINTS: Record<StaffRole, string> = {
  order_agent: 'Prend en charge les commandes payées, les prépare et les déclare prêtes.',
  delivery_driver: 'Prend les courses prêtes, partage sa position GPS, remet le colis avec le code du client.',
  cashier: 'Vérifie les paiements Mobile Money, reçoit les espèces des livreurs, traite les remboursements.',
  category_agent: 'Ajoute les produits, ajuste prix et stocks des rayons qui lui sont confiés.',
};

/**
 * Personnel : l'admin nomme un employé par son adresse e-mail. Dès que cette personne se connecte
 * avec cette adresse, son espace de travail s'ouvre ; la retirer de la liste lui ferme l'accès.
 */
export const StaffTab: React.FC = () => {
  const { categories, notify } = useApp();
  const [staff, setStaff] = useState<StaffMember[] | null>(null);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [customers, setCustomers] = useState(0);

  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<StaffRole>('delivery_driver');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [assigned, setAssigned] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () => {
    api<{ staff: StaffMember[] }>('GET', '/admin/staff').then((d) => setStaff(d.staff)).catch((e) => notify(errorMessage(e), 'error'));
    api<{ audit: AuditEntry[]; customers: number }>('GET', '/admin/audit')
      .then((d) => {
        setAudit(d.audit);
        setCustomers(d.customers);
      })
      .catch(() => {});
  };
  useEffect(load, []); // eslint-disable-line react-hooks/exhaustive-deps

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const d = await api<{ staff: StaffMember[] }>('POST', '/admin/staff', {
        email, name, role, phone: phone || undefined, password: password || undefined, assignedCategoryIds: assigned,
      });
      setStaff(d.staff);
      notify(`${name} peut maintenant se connecter avec ${email}.`);
      setEmail('');
      setName('');
      setPhone('');
      setPassword('');
      setAssigned([]);
      load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const update = async (member: StaffMember, patch: Partial<StaffMember> & { password?: string }, success: string) => {
    try {
      const d = await api<{ staff: StaffMember[] }>('PUT', `/admin/staff/${encodeURIComponent(member.email)}`, { ...member, ...patch });
      setStaff(d.staff);
      notify(success);
    } catch (err) {
      notify(errorMessage(err), 'error');
    }
  };

  const remove = async (member: StaffMember) => {
    if (!confirm(`Retirer ${member.name} du personnel ? Son accès est coupé immédiatement.`)) return;
    try {
      setStaff((await api<{ staff: StaffMember[] }>('DELETE', `/admin/staff/${encodeURIComponent(member.email)}`)).staff);
      notify('Accès retiré.');
    } catch (err) {
      notify(errorMessage(err), 'error');
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={add} className="bg-white rounded-3xl p-6 border border-gray-200 shadow-sm space-y-4">
        <div>
          <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-[#E2001A]" /> Nommer un employé
          </h3>
          <p className="text-xs text-gray-500">
            Saisissez son adresse e-mail et son rôle. Quand il se connecte avec Google sur cette adresse, il arrive directement dans son espace.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label htmlFor="st-email" className="block text-xs font-bold text-gray-700 mb-1">Adresse e-mail *</label>
            <input id="st-email" type="email" required className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="prenom.nom@gmail.com" />
          </div>
          <div>
            <label htmlFor="st-name" className="block text-xs font-bold text-gray-700 mb-1">Nom complet *</label>
            <input id="st-name" required minLength={2} className={inputClass} value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label htmlFor="st-role" className="block text-xs font-bold text-gray-700 mb-1">Rôle *</label>
            <select id="st-role" className={`${inputClass} bg-white font-bold`} value={role} onChange={(e) => setRole(e.target.value as StaffRole)}>
              {STAFF_ROLES.map((r) => (
                <option key={r} value={r}>{ROLE_LABELS[r]}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="st-phone" className="block text-xs font-bold text-gray-700 mb-1">Téléphone {role === 'delivery_driver' ? '*' : ''}</label>
            <input id="st-phone" inputMode="tel" required={role === 'delivery_driver'} className={inputClass} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+243 9XX XXX XXX" />
          </div>
        </div>
        <p className="text-xs text-gray-600 bg-gray-50 rounded-xl p-3">{ROLE_HINTS[role]}</p>

        {role === 'category_agent' && (
          <fieldset>
            <legend className="text-xs font-bold text-gray-700 mb-1.5">Rayons confiés (aucun coché = tous les rayons)</legend>
            <div className="flex flex-wrap gap-2">
              {categories.map((c) => {
                const on = assigned.includes(c.id);
                return (
                  <button key={c.id} type="button" aria-pressed={on} onClick={() => setAssigned(on ? assigned.filter((id) => id !== c.id) : [...assigned, c.id])} className={`px-3 py-1.5 rounded-xl text-xs font-bold border ${on ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-white border-gray-300 text-gray-700'}`}>
                    {c.name}
                  </button>
                );
              })}
            </div>
          </fieldset>
        )}

        <div className="max-w-sm">
          <label htmlFor="st-pass" className="block text-xs font-bold text-gray-700 mb-1">Mot de passe provisoire (facultatif)</label>
          <input id="st-pass" type="text" autoComplete="off" minLength={8} className={inputClass} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Seulement s’il n’a pas de compte Google" />
          <p className="text-[0.6875rem] text-gray-500 mt-1">À lui remettre en main propre ; il pourra le changer. Inutile s’il se connecte avec Google.</p>
        </div>

        {error && (
          <div role="alert" className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs text-red-700 font-bold">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <button type="submit" disabled={busy} className="px-6 py-3 rounded-2xl bg-gray-900 hover:bg-black text-white font-black text-sm flex items-center gap-2 disabled:opacity-60">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
          <span>Ajouter au personnel</span>
        </button>
      </form>

      <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-black text-sm text-gray-900">Personnel ({staff?.length ?? '…'})</h3>
          <span className="text-xs text-gray-500">{customers} compte(s) au total sur le site</span>
        </div>
        {staff === null ? (
          <div className="p-8 text-center text-gray-400"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></div>
        ) : staff.length === 0 ? (
          <p className="p-8 text-center text-sm text-gray-500">Aucun employé pour le moment. Commencez par un préparateur, un caissier et un livreur.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {staff.map((m) => (
              <li key={m.email} className={`p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3 ${m.active ? '' : 'bg-gray-50'}`}>
                <div className="min-w-0 text-xs">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-black text-gray-900">{m.name}</span>
                    <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full">{ROLE_LABELS[m.role]}</span>
                    {!m.active && <span className="font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded-full">Suspendu</span>}
                  </div>
                  <p className="text-gray-600 flex flex-wrap items-center gap-x-3 mt-0.5">
                    <span className="inline-flex items-center gap-1"><Mail className="w-3 h-3" />{m.email}</span>
                    {m.phone && <span>{m.phone}</span>}
                  </p>
                  <p className={`mt-0.5 font-bold ${m.hasAccount ? 'text-emerald-700' : 'text-amber-700'}`}>
                    {m.hasAccount ? (
                      <span className="inline-flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Compte actif{m.lastLoginAt ? ` • dernière connexion ${formatDateTime(m.lastLoginAt)}` : ''}
                      </span>
                    ) : (
                      'Ne s’est pas encore connecté'
                    )}
                  </p>
                  {m.role === 'category_agent' && (
                    <p className="text-gray-500 mt-0.5">
                      Rayons : {m.assignedCategoryIds?.length ? m.assignedCategoryIds.map((id) => categories.find((c) => c.id === id)?.name || id).join(', ') : 'tous'}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <select
                    aria-label={`Rôle de ${m.name}`}
                    className="px-3 py-2 text-xs font-bold border border-gray-300 rounded-xl bg-white"
                    value={m.role}
                    onChange={(e) => update(m, { role: e.target.value as StaffRole }, 'Rôle modifié.')}
                  >
                    {STAFF_ROLES.map((r) => (
                      <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                    ))}
                  </select>
                  <button type="button" onClick={() => update(m, { active: !m.active }, m.active ? 'Accès suspendu.' : 'Accès rétabli.')} className="px-3 py-2 text-xs font-bold border border-gray-300 rounded-xl hover:bg-gray-50">
                    {m.active ? 'Suspendre' : 'Réactiver'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const pw = prompt(`Nouveau mot de passe provisoire pour ${m.name} (8 caractères minimum) :`);
                      if (pw) update(m, { password: pw }, 'Mot de passe défini. Ses anciennes sessions sont fermées.');
                    }}
                    className="px-3 py-2 text-xs font-bold border border-gray-300 rounded-xl hover:bg-gray-50 flex items-center gap-1.5"
                  >
                    <KeyRound className="w-3.5 h-3.5" /> Mot de passe
                  </button>
                  <button type="button" aria-label={`Retirer ${m.name}`} onClick={() => remove(m)} className="p-2 text-red-500 hover:bg-red-50 rounded-xl">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-100">
          <h3 className="font-black text-sm text-gray-900 flex items-center gap-2">
            <History className="w-4 h-4" /> Journal des actions sensibles
          </h3>
          <p className="text-xs text-gray-500">Paiements validés, prix modifiés, accès accordés ou retirés : qui a fait quoi, et quand.</p>
        </div>
        {audit.length === 0 ? (
          <p className="p-6 text-center text-xs text-gray-500">Aucune action enregistrée.</p>
        ) : (
          <ul className="divide-y divide-gray-100 max-h-96 overflow-y-auto text-xs">
            {audit.map((a) => (
              <li key={a.id} className="px-5 py-2.5 flex flex-wrap items-baseline gap-x-3">
                <span className="text-gray-400 w-28 shrink-0">{formatDateTime(a.at)}</span>
                <span className="font-mono font-bold text-gray-900">{a.action}</span>
                <span className="text-gray-600 min-w-0 break-words">{a.detail}</span>
                <span className="text-gray-400 ml-auto">{a.actorEmail}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
