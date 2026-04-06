/**
 * Case Chat Component - Real-time chat for case messages
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../providers/AuthProvider';
import { Send, Loader2, Clock, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import toast from 'react-hot-toast';

interface CaseMessage {
  id: string;
  message: string;
  createdAt: string;
  isRead: boolean;
  user: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    role: string;
  };
}

interface CaseChatProps {
  caseId: string;
  currentUserId: string;
  currentUserRole: string;
  caseStatus: string;
}

export function CaseChat({
  caseId,
  currentUserId,
  currentUserRole,
  caseStatus,
}: CaseChatProps) {
  const [messages, setMessages] = useState<CaseMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchMessages();

    // Subscribe to new messages
    const channel = supabase
      .channel(`case-messages-${caseId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'CaseMessage',
          filter: `caseId=eq.${caseId}`,
        },
        (payload) => {
          console.log('New message received via realtime:', payload);
          // Fetch updated messages when new message is inserted
          fetchMessages();
        }
      )
      .subscribe((status) => {
        console.log('Subscription status:', status);
      });

    return () => {
      console.log('Cleaning up subscription for case:', caseId);
      supabase.removeChannel(channel);
    };
  }, [caseId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchMessages = async () => {
    try {
      // Don't show loading spinner if we're just refreshing
      if (messages.length === 0) {
        setLoading(true);
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      const headers: HeadersInit = {};
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch(`/api/cases/${caseId}/messages`, {
        headers,
        credentials: 'include',
      });

      const result = await response.json();
      if (result.success) {
        // Preserve optimistic messages (those with temp IDs) when updating
        setMessages((prev) => {
          const optimisticMessages = prev.filter((m) => m.id.startsWith('temp-'));
          // Merge: keep optimistic messages and add/update real messages
          const realMessages = result.data.messages;
          const realMessageIds = new Set(realMessages.map((m: CaseMessage) => m.id));

          // Remove optimistic messages that have been replaced by real ones
          const remainingOptimistic = optimisticMessages.filter(
            (opt) => !realMessages.some((real: CaseMessage) =>
              real.message === opt.message &&
              Math.abs(new Date(real.createdAt).getTime() - new Date(opt.createdAt).getTime()) < 5000
            )
          );

          // Combine real messages with remaining optimistic ones
          return [...realMessages, ...remainingOptimistic].sort(
            (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );
        });
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast.error('Error al cargar mensajes');
    } finally {
      setLoading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || sending) return;

    if (caseStatus === 'CLOSED' && currentUserRole !== 'superadmin') {
      toast.error('No se pueden enviar mensajes a un caso cerrado');
      return;
    }

    const messageText = newMessage.trim();
    const tempMessageId = `temp-${Date.now()}`;

    // Create optimistic message
    const optimisticMessage: CaseMessage = {
      id: tempMessageId,
      message: messageText,
      createdAt: new Date().toISOString(),
      isRead: false,
      user: {
        id: currentUserId,
        email: '',
        firstName: null,
        lastName: null,
        role: currentUserRole,
      },
    };

    // Add optimistic message immediately
    setMessages((prev) => [...prev, optimisticMessage]);
    setNewMessage('');
    setSending(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch(`/api/cases/${caseId}/messages`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({ message: messageText }),
      });

      const result = await response.json();
      if (result.success) {
        // The real message will be added via realtime subscription
        // But if realtime doesn't work, fetch after a short delay
        setTimeout(() => {
          fetchMessages();
        }, 300);

        // Also set a timeout to remove optimistic message if real one doesn't arrive
        setTimeout(() => {
          setMessages((prev) => {
            // Only remove if it's still there (real message should have replaced it)
            const hasTemp = prev.some((m) => m.id === tempMessageId);
            if (hasTemp) {
              // Real message didn't arrive, fetch again
              fetchMessages();
              return prev.filter((m) => m.id !== tempMessageId);
            }
            return prev;
          });
        }, 2000);
      } else {
        // Remove optimistic message on error
        setMessages((prev) => prev.filter((m) => m.id !== tempMessageId));
        setNewMessage(messageText); // Restore message text
        toast.error(result.error || 'Error al enviar mensaje');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      // Remove optimistic message on error
      setMessages((prev) => prev.filter((m) => m.id !== tempMessageId));
      setNewMessage(messageText); // Restore message text
      toast.error('Error al enviar mensaje');
    } finally {
      setSending(false);
    }
  };

  const isBusinessHours = () => {
    const now = new Date();
    const hour = now.getHours();
    return hour >= 10 && hour < 19; // 10 AM to 7 PM
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="flex h-[600px] flex-col rounded-lg border border-gray-200 bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
        <h3 className="font-semibold text-gray-900">Chat en Vivo</h3>
        <p className="mt-1 text-xs text-gray-600">
          Tiempo de respuesta: 10:00 AM - 7:00 PM
          {!isBusinessHours() && (
            <span className="ml-2 text-orange-600">
              (Fuera de horario - responderemos pronto)
            </span>
          )}
        </p>
      </div>

      {/* Messages */}
      <div
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4"
      >
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                <MessageSquare className="h-6 w-6 text-blue-600" />
              </div>
              <p className="text-lg font-medium text-gray-900">
                Uno de nuestros agentes te atenderá lo más pronto posible
              </p>
              <p className="mt-2 text-sm text-gray-600">
                Puedes escribir un mensaje si tienes alguna pregunta adicional
              </p>
            </div>
          </div>
        ) : (
          messages.map((message) => {
            const isOwnMessage = message.user.id === currentUserId;
            const isSuperadmin = message.user.role === 'superadmin';
            const userName =
              message.user.firstName && message.user.lastName
                ? `${message.user.firstName} ${message.user.lastName}`
                : isSuperadmin
                  ? 'Soporte Upick'
                  : message.user.email;

            return (
              <div
                key={message.id}
                className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-2 ${isOwnMessage
                      ? 'bg-primary-600 text-white'
                      : isSuperadmin
                        ? 'bg-blue-100 text-blue-900'
                        : 'bg-gray-100 text-gray-900'
                    }`}
                >
                  <div className="text-xs font-medium opacity-75">{userName}</div>
                  <div className="mt-1 whitespace-pre-wrap break-words">
                    {message.message}
                  </div>
                  <div className="mt-1 text-xs opacity-75">
                    {format(new Date(message.createdAt), 'h:mm a', { locale: es })}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      {caseStatus !== 'CLOSED' || currentUserRole === 'superadmin' ? (
        <div className="border-t border-gray-200 p-4">
          <div className="flex gap-2">
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="Escribe un mensaje..."
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              rows={2}
              disabled={sending}
            />
            <button
              onClick={sendMessage}
              disabled={!newMessage.trim() || sending}
              className="rounded-lg bg-primary-600 px-4 py-2 text-white transition-colors hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sending ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>
      ) : (
        <div className="border-t border-gray-200 bg-gray-50 px-4 py-3 text-center text-sm text-gray-600">
          Este caso está cerrado. No se pueden enviar más mensajes.
        </div>
      )}
    </div>
  );
}

