import { useState, useEffect } from 'react';
import { Send, Search, Plus, Users, MessageSquare, Phone, Video } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';
import { Conversation, Message, User } from '../../types';
import apiClient from '../../services/apiClient';
import { useTranslation } from 'react-i18next';


export function MessagesView() {
  const { user } = useAuth();
  const { users } = useData();
  const { t } = useTranslation();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchConversations = async () => {
      try {
        setLoading(true);
        const response = await apiClient.get('/api/conversations/');
        // Enrich conversations with last message details if available
        const enrichedConversations = response.data.map((conv: any) => ({
          ...conv,
          lastMessage: conv.messages?.[0]?.content || 'No recent messages',
          lastMessageTime: conv.messages?.[0]?.timestamp ? new Date(conv.messages[0].timestamp) : new Date(),
          unreadCount: 0, // Logic to be implemented
          isOnline: users.some((u: any) => conv.participants.includes(u.id) && u.isOnline)
        }));
        setConversations(enrichedConversations);
        setError(null);
      } catch (err) {
        setError('Impossible de charger les conversations.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchConversations();
    }
  }, [user, users]);

  useEffect(() => {
    const fetchMessages = async () => {
      if (selectedConversation) {
        try {
          const response = await apiClient.get(`/api/conversations/${selectedConversation.id}/messages/`);
          setMessages(response.data);
        } catch (err) {
          console.error('Impossible de charger les messages:', err);
          setError('Impossible de charger les messages pour cette conversation.');
        }
      }
    };

    fetchMessages();
  }, [selectedConversation]);

  const handleSendMessage = async () => {
    if (newMessage.trim() && selectedConversation) {
      try {
        const response = await apiClient.post(`/api/conversations/${selectedConversation.id}/messages/`, {
          content: newMessage,
        });
        setMessages([...messages, response.data]);
        setNewMessage('');
      } catch (err) {
        console.error('Erreur lors de l\'envoi du message:', err);
        setError('Erreur lors de l\'envoi du message.');
      }
    }
  };

  const getParticipantDetails = (participantId: string): User | undefined => {
    return users.find((u: any) => u.id === participantId) as User | undefined;
  };

  const getConversationDisplayDetails = (conv: Conversation) => {
    if (!user) return { name: conv.name, type: 'group', isOnline: false };

    const otherParticipants = conv.participants.filter((p: any) => p.id !== user.id);

    if (otherParticipants.length === 0) {
        return { name: 'Solo Conversation', type: 'direct', isOnline: true };
    }

    if (otherParticipants.length === 1) {
        const otherUser = getParticipantDetails(otherParticipants[0].id);
        return {
            name: otherUser ? `${otherUser.firstName} ${otherUser.lastName}` : 'Unknown user',
            type: 'direct',
            isOnline: otherUser?.isOnline || false,
        };
    }

    return { name: conv.name, type: 'group', isOnline: false };
  };


  if (loading) {
    return <div className="flex items-center justify-center h-full">Chargement des conversations...</div>;
  }

  if (error) {
    return <div className="flex items-center justify-center h-full text-red-500">{error}</div>;
  }

  return (
    <div className="h-full bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      <div className="flex h-full">
        {/* Conversations Sidebar */}
        <div className="w-80 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{t('messages.title', 'Messages')}</h2>
              <button className="p-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
                <Plus className="w-4 h-4" />
              </button>
            </div>
            
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
              <input
                type="text"
                placeholder={t('messages.searchConversation', 'Rechercher une conversation...')}
                className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              />
            </div>
          </div>

          {/* Conversations List */}
          <div className="flex-1 overflow-y-auto">
            {conversations.map((conversation) => {
              const displayDetails = getConversationDisplayDetails(conversation);
              return (
                <div
                  key={conversation.id}
                  onClick={() => setSelectedConversation(conversation)}
                  className={`p-4 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors ${
                    selectedConversation?.id === conversation.id ? 'bg-primary-50 dark:bg-primary-900/20' : ''
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <div className="relative">
                      <div className="w-10 h-10 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center">
                        {displayDetails.type === 'group' ? (
                          <Users className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                        ) : (
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {displayDetails.name.split(' ').map((n: string) => n[0]).join('')}
                          </span>
                        )}
                      </div>
                      {displayDetails.isOnline && displayDetails.type === 'direct' && (
                        <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-800" />
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium text-gray-900 dark:text-white truncate">
                          {displayDetails.name}
                        </h3>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {conversation.lastMessageTime && new Date(conversation.lastMessageTime).toLocaleTimeString('fr-FR', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between mt-1">
                        <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                          {conversation.lastMessage}
                        </p>
                        {(conversation.unreadCount ?? 0) > 0 && (
                          <span className="bg-primary-600 text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center">
                            {conversation.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          {selectedConversation ? (
            (() => {
              const displayDetails = getConversationDisplayDetails(selectedConversation);
              return (
                <>
                  {/* Chat Header */}
                  <div className="p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center">
                          {displayDetails.type === 'group' ? (
                            <Users className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                          ) : (
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              {displayDetails.name.split(' ').map((n: string) => n[0]).join('')}
                            </span>
                          )}
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900 dark:text-white">
                            {displayDetails.name}
                          </h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {displayDetails.type === 'group' 
                              ? `${selectedConversation.participants.length} participants`
                              : displayDetails.isOnline ? 'En ligne' : 'Hors ligne'
                            }
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <button className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                          <Phone className="w-5 h-5" />
                        </button>
                        <button className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                          <Video className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-900">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.author.id === user?.id ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                          message.author.id === user?.id
                            ? 'bg-primary-600 text-white'
                            : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700'
                        }`}>
                          {message.author.id !== user?.id && (
                            <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                              {message.author.firstName} {message.author.lastName}
                            </p>
                          )}
                          <p className="text-sm">{message.content}</p>
                          <p className={`text-xs mt-1 ${
                            message.author.id === user?.id 
                              ? 'text-primary-100' 
                              : 'text-gray-500 dark:text-gray-400'
                          }`}>
                            {new Date(message.timestamp).toLocaleTimeString('fr-FR', { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Message Input */}
                  <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Tapez votre message..."
                        className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                      />
                      <button
                        onClick={handleSendMessage}
                        disabled={!newMessage.trim()}
                        className="p-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <Send className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </>
              );
            })()
          ) : (
            /* No Conversation Selected */
            <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-900">
              <div className="text-center">
                <MessageSquare className="w-16 h-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">{t('messages.selectConversation')}</h3>
                <p className="text-gray-600 dark:text-gray-400">{t('messages.selectConversationSubtitle')}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}