import React, { useEffect, useRef, useState } from 'react';
import { Send, MessageCircle } from 'lucide-react';
import { ChatMessage, Order } from '../types';
import { api, errorMessage } from '../services/api';
import { useApp } from '../context/AppContext';
import { formatTime } from '../utils/orders';

/** Messagerie d'une commande entre le client, son livreur et le magasin. */
export const OrderChat: React.FC<{ order: Order }> = ({ order }) => {
  const { currentUser, notify } = useApp();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;
    const load = () =>
      api<{ messages: ChatMessage[] }>('GET', `/orders/${order.id}/messages`)
        .then((d) => alive && setMessages(d.messages))
        .catch(() => {});
    load();
    const interval = setInterval(() => document.visibilityState === 'visible' && load(), 4000);
    return () => {
      alive = false;
      clearInterval(interval);
    };
  }, [order.id]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages.length]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = text.trim();
    if (!value || sending) return;
    setSending(true);
    try {
      const { message } = await api<{ message: ChatMessage }>('POST', `/orders/${order.id}/messages`, { text: value });
      setMessages((prev) => [...prev, message]);
      setText('');
    } catch (err) {
      notify(errorMessage(err), 'error');
    } finally {
      setSending(false);
    }
  };

  const roleLabel = (m: ChatMessage) =>
    m.senderRole === 'customer' ? 'Client' : m.senderRole === 'delivery_driver' ? 'Livreur' : 'Magasin';

  return (
    <div className="bg-white rounded-3xl border border-gray-200 overflow-hidden flex flex-col">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
        <MessageCircle className="w-4 h-4 text-blue-600" />
        <h3 className="text-sm font-black text-gray-900">Messages • {order.orderNumber}</h3>
      </div>

      <div ref={listRef} className="h-56 overflow-y-auto p-4 space-y-2 bg-gray-50">
        {messages.length === 0 && (
          <p className="text-xs text-gray-500 text-center pt-16">
            Aucun message. Indiquez un repère, un changement de dernière minute...
          </p>
        )}
        {messages.map((m) => {
          const mine = m.senderId === currentUser?.id;
          return (
            <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm ${mine ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-900'}`}>
                {!mine && (
                  <span className="block text-[10px] font-black text-gray-500">
                    {m.senderName} • {roleLabel(m)}
                  </span>
                )}
                <span className="whitespace-pre-wrap break-words">{m.text}</span>
                <span className={`block text-[10px] mt-0.5 text-right ${mine ? 'text-blue-100' : 'text-gray-400'}`}>{formatTime(m.at)}</span>
              </div>
            </div>
          );
        })}
      </div>

      <form onSubmit={send} className="p-3 border-t border-gray-100 flex items-center gap-2">
        <input
          type="text"
          aria-label="Votre message"
          maxLength={1000}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Écrire un message..."
          className="flex-1 px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-hidden focus:border-blue-500"
        />
        <button
          type="submit"
          disabled={sending || !text.trim()}
          aria-label="Envoyer"
          className="p-2.5 rounded-xl bg-blue-600 text-white disabled:opacity-40"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
