import { useState, useEffect, useRef } from 'react';
import { Send, Search, Plus, Users, MessageSquare, Phone, Video, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';
import { Conversation, Message, User } from '../../types';
import apiClient from '../../services/apiClient';
import { useTranslation } from 'react-i18next';
import { Tooltip } from '@mui/material';
import { motion } from 'framer-motion';

interface MessagesViewProps {
  directUser?: User;
  onClose?: () => void;
}

export function MessagesView({ directUser, onClose }: MessagesViewProps) {
  const { user } = useAuth();
  const { users } = useData();
  const { t } = useTranslation();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNewMessageModal, setShowNewMessageModal] = useState(false);
  const [searchUser, setSearchUser] = useState('');
  const [selectedUserForNewMessage, setSelectedUserForNewMessage] = useState<User | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 0. Flag pour ne montrer le spinner que lors du tout premier chargement des conversations
  const isFirstConversationLoad = useRef(true);

  // Fetch all conversations
  useEffect(() => {
    const fetchConversations = async () => {
      try {
        // Affiche le spinner uniquement lors du tout premier chargement
        if (isFirstConversationLoad.current && conversations.length === 0) setLoading(true);
        const response = await apiClient.get('/api/conversations/');
        const enrichedConversations = response.data.map((conv: any) => ({
          ...conv,
          lastMessage: conv.lastMessage?.content || 'No recent messages',
          lastMessageTime: conv.lastMessage?.createdAt ? new Date(conv.lastMessage.createdAt) : new Date(),
          unreadCount: 0,
          isOnline: users.some((u: any) => conv.participants.some((p: any) => p.id === u.id && u.isOnline))
        }));
        setConversations(enrichedConversations);
        setError(null);
      } catch (err) {
        setError('Impossible de charger les conversations.');
        console.error(err);
      } finally {
        if (isFirstConversationLoad.current) {
          setLoading(false);
          isFirstConversationLoad.current = false;
        }
      }
    };
    if (user) {
      fetchConversations();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, users]);

  // Effet pour ouvrir ou créer une conversation directe depuis un profil (Equipe)
  useEffect(() => {
    if (!directUser || !user || conversations.length === 0) return;
    // Chercher une conversation existante (non groupe, 2 participants, mêmes IDs)
    const found = conversations.find(conv =>
      (!('isGroup' in conv) || !conv.isGroup) && // Compatible si le champ n'existe pas ou vaut false
      conv.participants.length === 2 &&
      conv.participants.some((p: any) => p.id === user.id) &&
      conv.participants.some((p: any) => p.id === directUser.id)
    );
    if (found) {
      setSelectedConversation(found);
    } else {
      (async () => {
        try {
          const response = await apiClient.post('/api/conversations/', {
            name: `${user.fullName || user.username} & ${directUser.fullName || directUser.username}`,
            participant_ids: [user.id, directUser.id],
          });
          setConversations(prev => [...prev, response.data]);
          setSelectedConversation(response.data);
        } catch (err) {
          setError('Impossible de créer la conversation.');
        }
      })();
    }
  }, [directUser, user, conversations]);

  // 1. Polling automatique pour rafraîchir les messages toutes les 2 secondes
  const isFirstLoad = useRef(true);
  useEffect(() => {
    if (!selectedConversation) return;
    isFirstLoad.current = true;
    const fetchMessages = async () => {
      try {
        if (isFirstLoad.current) setLoading(true);
        const response = await apiClient.get(`/api/conversations/${selectedConversation.id}/messages/`);
        setMessages(response.data);
      } catch (err) {
        setError('Impossible de charger les messages pour cette conversation.');
      } finally {
        if (isFirstLoad.current) {
          setLoading(false);
          isFirstLoad.current = false;
        }
      }
    };
    fetchMessages();
    const interval = setInterval(fetchMessages, 2000); // 2 secondes
    return () => clearInterval(interval);
  }, [selectedConversation]);

  // Scroll automatique vers le bas à chaque nouveau message
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (newMessage.trim() && selectedConversation) {
      try {
        const response = await apiClient.post(`/api/conversations/${selectedConversation.id}/messages/`, {
          content: newMessage,
        });
        setMessages([...messages, response.data]);
        setNewMessage('');
        // Rafraîchir les messages après envoi
        // await refreshMessages(); // Suppression de refreshMessages
      } catch (err) {
        setError('Erreur lors de l\'envoi du message.');
      }
    }
  };

  const getParticipantDetails = (participantId: string): User | undefined => {
    return users.find((u: any) => u.id === participantId) as User | undefined;
  };

  const getConversationDisplayDetails = (conv: Conversation) => {
    if (!user) return { name: conv.name, type: (conv.participants.length > 2 ? 'group' : 'direct'), isOnline: false };
    const otherParticipants = conv.participants.filter((p: any) => p.id !== user.id);
    if (otherParticipants.length === 0) {
      return { name: 'Solo', type: 'direct', isOnline: true };
    }
    if (otherParticipants.length === 1) {
      const otherUser = otherParticipants[0];
      return {
        name: otherUser.fullName || `${otherUser.firstName} ${otherUser.lastName}` || otherUser.username,
        type: 'direct',
        isOnline: otherUser?.isOnline || false,
      };
    }
    return { name: conv.name, type: 'group', isOnline: false };
  };

  // Handler pour la modale "Nouveau message" (évite les doublons)
  const handleStartNewConversation = async () => {
    if (!selectedUserForNewMessage || !user) return;
    setError(null);
    // Chercher une conversation existante (non groupe, 2 participants, mêmes IDs)
    const found = conversations.find(conv =>
      (!('isGroup' in conv) || !conv.isGroup) && // Compatible si le champ n'existe pas ou vaut false
      conv.participants.length === 2 &&
      conv.participants.some((p: any) => p.id === user.id) &&
      conv.participants.some((p: any) => p.id === selectedUserForNewMessage.id)
    );
    if (found) {
      setSelectedConversation(found);
      setShowNewMessageModal(false);
      setSelectedUserForNewMessage(null);
      return;
    }
    try {
      const response = await apiClient.post('/api/conversations/', {
        name: `${user.fullName || user.username} & ${selectedUserForNewMessage.fullName || selectedUserForNewMessage.username}`,
        participant_ids: [user.id, selectedUserForNewMessage.id],
      });
      setConversations(prev => [...prev, response.data]);
      setSelectedConversation(response.data);
      setShowNewMessageModal(false);
      setSelectedUserForNewMessage(null);
    } catch (err) {
      setError('Impossible de créer la conversation.');
    }
  };

  // Fonction utilitaire pour afficher la photo de profil ou les initiales
  function renderProfileAvatar(u: User | null | undefined, size = 40) {
    if (!u) return null;
    if (u.profilePhoto) {
      return <img src={u.profilePhoto} alt="avatar" style={{ width: size, height: size }} className="rounded-full object-cover bg-gray-300 dark:bg-gray-600 border border-gray-200 dark:border-gray-700" />;
    }
    return (
      <span
        className="inline-flex items-center justify-center rounded-full bg-gradient-to-br from-primary-400 to-primary-700 text-white font-bold border border-gray-200 dark:border-gray-700"
        style={{ width: size, height: size, fontSize: size / 2 }}
        aria-label={u.fullName || u.username}
      >
        {(u.fullName || u.username).split(' ').map(n => n[0]).join('').slice(0, 2)}
      </span>
    );
  }

  if (loading) {
    return <div className="flex items-center justify-center h-full">Chargement des conversations...</div>;
  }
  if (error) {
    return <div className="flex items-center justify-center h-full text-red-500">{error}</div>;
  }

  // 3. Mapping enrichi des photos de profil (déjà présent)
  const enrichedMessages = messages.map((message: any) => {
    const msgAuthor = message.author || message.sender;
    if (!msgAuthor) return message;
    // Recherche par id dans la liste globale des utilisateurs
    const fullUser = users.find(u => u.id === (msgAuthor.id || msgAuthor)) || msgAuthor;
    return { ...message, author: fullUser };
  });

  // Affichage des messages avec date centrée et heure EN BAS à droite de chaque message
  let lastDate = '';

  return (
    <div className="h-full bg-gradient-to-br from-gray-50 via-primary-50 to-gray-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 transition-colors duration-200 relative">
      {onClose && (
        <button className="absolute top-2 right-2 z-10" onClick={onClose}><X className="w-5 h-5" /></button>
      )}
      <div className="flex h-full">
        {/* Sidebar conversations modernisée */}
        <aside className="w-80 bg-white/90 dark:bg-gray-900/90 border-r border-gray-200 dark:border-gray-800 flex flex-col shadow-lg">
          {/* Header sticky avec bouton "Nouveau message" */}
          <div className="sticky top-0 z-10 p-4 bg-white/95 dark:bg-gray-900/95 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t('messages.title', 'Messages')}</h2>
            <Tooltip title="Nouveau message" arrow>
              <button
                className="p-2 bg-primary-600 text-white rounded-full hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-400 transition"
                onClick={() => setShowNewMessageModal(true)}
                aria-label="Nouveau message"
              >
                <Plus className="w-5 h-5" />
              </button>
            </Tooltip>
          </div>
          {/* Barre de recherche */}
          <div className="p-2 border-b border-gray-100 dark:border-gray-800 bg-white/90 dark:bg-gray-900/90">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
              <input
                type="text"
                placeholder={t('messages.searchConversation', 'Rechercher une conversation...')}
                className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
              />
            </div>
          </div>
          {/* Liste des conversations avec avatars et statut */}
          <nav className="flex-1 overflow-y-auto custom-scrollbar">
            {conversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-500 p-8">
                <MessageSquare className="w-12 h-12 mb-2" />
                <p>Aucune conversation</p>
              </div>
            ) : conversations.map((conversation) => {
              const displayDetails = getConversationDisplayDetails(conversation);
              const otherParticipants = conversation.participants.filter((p: any) => p.id !== user?.id);
              const otherUser = otherParticipants[0];
              return (
                <motion.div
                  key={conversation.id}
                  onClick={() => setSelectedConversation(conversation)}
                  className={`group p-3 border-b border-gray-100 dark:border-gray-800 flex items-center gap-3 cursor-pointer transition-colors hover:bg-primary-50/60 dark:hover:bg-primary-900/30 ${selectedConversation?.id === conversation.id ? 'bg-primary-50 dark:bg-primary-900/20' : ''}`}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  tabIndex={0}
                  aria-label={`Ouvrir la conversation avec ${displayDetails.name}`}
                >
                  {/* Avatar et statut */}
                  <div className="relative">
                    {otherUser ? renderProfileAvatar(otherUser, 40) : <Users className="w-8 h-8 text-gray-400" />}
                    {displayDetails.isOnline && displayDetails.type === 'direct' && (
                      <span className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-900" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 dark:text-white truncate">{displayDetails.name}</span>
                      {displayDetails.type === 'direct' && displayDetails.isOnline && (
                        <span className="text-xs text-green-600 dark:text-green-400 ml-1">● En ligne</span>
                      )}
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400 truncate block">
                      {conversation.lastMessage}
                    </span>
                  </div>
                  {(conversation.unreadCount ?? 0) > 0 && (
                    <span className="ml-2 bg-primary-600 text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center animate-bounce">
                      {conversation.unreadCount}
                    </span>
                  )}
                </motion.div>
              );
            })}
          </nav>
        </aside>

        {/* Zone de chat principale avec fond subtil et header sticky */}
        <main className="flex-1 flex flex-col relative bg-gradient-to-br from-white via-primary-50 to-gray-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
          {selectedConversation ? (
            <div className="flex flex-col h-full">
              {/* Header sticky du chat */}
              {(() => {
                const otherParticipants = selectedConversation.participants.filter((p: any) => p.id !== user?.id);
                const otherUser = otherParticipants[0];
                const displayDetails = getConversationDisplayDetails(selectedConversation);
                return (
                  <div className="sticky top-0 z-10 p-4 bg-white/95 dark:bg-gray-900/95 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
                    <div className="flex items-center">
                      {renderProfileAvatar(otherUser, 40)}
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white">{displayDetails.name}</h3>
                      {displayDetails.isOnline && displayDetails.type === 'direct' && (
                        <span className="ml-2 text-xs text-green-600 dark:text-green-400">● En ligne</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Bouton Rafraîchir */}
                      {/* Suppression de refreshMessages, du bouton, et des appels associés */}
                    </div>
                  </div>
                );
              })()}

              {/* Liste des messages avec bulles et avatars */}
              <section className="flex-1 flex flex-col justify-end overflow-y-auto p-6 space-y-4 custom-scrollbar bg-[url('/chat-bg.svg')] bg-cover bg-center dark:bg-none">
                {enrichedMessages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-500">
                    <MessageSquare className="w-16 h-16 mb-2" />
                    <p>Aucun message pour l’instant.<br />Commencez la conversation !</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-4">
                    {enrichedMessages.filter(m => m && m.author && m.author.id).map((message, idx) => {
                      // Sécurité : on ne mappe que les messages avec un auteur défini
                      const isMine = message.author && message.author.id === user?.id;
                      // Gestion de la date : fallback sur createdAt si timestamp absent
                      let dateValue = message.timestamp || message.createdAt;
                      let dateObj = dateValue ? new Date(dateValue) : null;
                      const isValidDate = dateObj && !isNaN(dateObj.getTime());
                      // Date du jour pour la séparation
                      const dateLabel = isValidDate ? dateObj.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '';
                      const showDate = dateLabel && dateLabel !== lastDate;
                      if (showDate) lastDate = dateLabel;
                      // Heure pour le message
                      const heure = isValidDate ? dateObj.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '';
                      return (
                        <div key={message.id}>
                          {/* Affiche la date centrée si changement de jour */}
                          {showDate && (
                            <div className="flex justify-center my-2">
                              <span className="bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs px-3 py-1 rounded-full shadow-sm">{dateLabel}</span>
                            </div>
                          )}
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`flex items-end ${isMine ? 'justify-end' : 'justify-start'}`}
                          >
                            {/* Avatar de l’expéditeur */}
                            {!isMine && message.author && (
                              <div className="mr-2 flex-shrink-0">{renderProfileAvatar(message.author, 32)}</div>
                            )}
                            <div className={`max-w-xs lg:max-w-md px-4 py-2 pb-5 rounded-2xl shadow-md relative ${isMine ? 'bg-primary-600 text-white ml-auto' : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700'}`}
                              tabIndex={0}
                              aria-label={`Message de ${message.author?.firstName || ''} ${message.author?.lastName || ''}`}
                            >
                              {/* Affiche le nom de l'expéditeur uniquement pour les messages des autres */}
                              {!isMine && message.author && (
                                <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{message.author.firstName} {message.author.lastName}</p>
                              )}
                              <p className="text-sm break-words">{message.content}</p>
                              {/* Affiche l'heure EN BAS à droite de la bulle, avec padding et petite taille */}
                              {isValidDate && (
                                <span className={`absolute right-3 bottom-1 text-xs ${isMine ? 'text-primary-100' : 'text-gray-500 dark:text-gray-400'}`} style={{ zIndex: 1, fontSize: '0.75rem' }}>{heure}</span>
                              )}
                            </div>
                            {/* Avatar à droite pour mes messages */}
                            {isMine && (
                              <div className="ml-2 flex-shrink-0">{renderProfileAvatar(user, 32)}</div>
                            )}
                          </motion.div>
                        </div>
                      );
                    })}
                    {/* Ancre pour le scroll automatique */}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </section>

              {/* Barre d’envoi de message flottante */}
              {/* La barre de saisie est toujours collée en bas grâce à flex-col + justify-end sur le parent */}
              <form className="z-10 p-4 bg-white/95 dark:bg-gray-900/95 border-t border-gray-200 dark:border-gray-800 flex items-center gap-2 shadow-md" onSubmit={e => { e.preventDefault(); handleSendMessage(); }}>
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Tapez votre message..."
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-full focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white transition"
                  aria-label="Saisir un message"
                  autoFocus
                />
                <motion.button
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="p-2 bg-primary-600 text-white rounded-full hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  whileTap={{ scale: 0.9 }}
                  aria-label="Envoyer le message"
                >
                  <Send className="w-5 h-5" />
                </motion.button>
              </form>
            </div>
          ) : (
            /* Aucun chat sélectionné */
            <div className="flex-1 flex flex-col items-center justify-center bg-gradient-to-br from-white via-primary-50 to-gray-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
              <MessageSquare className="w-20 h-20 text-gray-300 dark:text-gray-600 mb-4" />
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Bienvenue dans la messagerie</h3>
              <p className="text-gray-600 dark:text-gray-400">Sélectionnez une conversation ou démarrez un nouveau message pour commencer à discuter.</p>
            </div>
          )}
        </main>
      </div>
      {/* Modale de nouvelle conversation */}
      {showNewMessageModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setShowNewMessageModal(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6 w-full max-w-md relative" onClick={e => e.stopPropagation()}>
            <button className="absolute top-2 right-2" onClick={() => setShowNewMessageModal(false)}><X /></button>
            <h2 className="text-lg font-semibold mb-4">Nouveau message</h2>
            <input
              type="text"
              placeholder="Rechercher un utilisateur..."
              value={searchUser}
              onChange={e => setSearchUser(e.target.value)}
              className="w-full px-3 py-2 border rounded mb-3"
              aria-label="Rechercher un utilisateur"
              autoFocus
            />
            <div className="max-h-60 overflow-y-auto custom-scrollbar">
              {users.filter(u =>
                u.id !== user?.id &&
                ((u.fullName || u.username).toLowerCase().includes(searchUser.toLowerCase()) ||
                  u.email?.toLowerCase().includes(searchUser.toLowerCase()))
              ).map(u => (
                <div
                  key={u.id}
                  className={`flex items-center gap-3 p-2 rounded cursor-pointer hover:bg-primary-50 dark:hover:bg-primary-900/20 ${selectedUserForNewMessage?.id === u.id ? 'bg-primary-100 dark:bg-primary-900/30' : ''}`}
                  onClick={() => setSelectedUserForNewMessage(u)}
                  tabIndex={0}
                  aria-label={`Sélectionner ${u.fullName || u.username}`}
                >
                  {renderProfileAvatar(u, 32)}
                  <span className="flex-1">{u.fullName || u.username} <span className="text-xs text-gray-400">{u.email}</span></span>
                  {u.isOnline && <span className="text-xs text-green-600 ml-2">●</span>}
                  {selectedUserForNewMessage?.id === u.id && <span className="text-primary-600 font-bold">✓</span>}
                </div>
              ))}
            </div>
            <button
              className="w-full bg-primary-600 text-white py-2 rounded mt-4"
              onClick={handleStartNewConversation}
              disabled={!selectedUserForNewMessage}
              aria-label="Démarrer la conversation"
            >
              Démarrer la conversation
            </button>
            {error && <div className="text-red-500 text-xs mt-2">{error}</div>}
          </div>
        </div>
      )}
    </div>
  );
}