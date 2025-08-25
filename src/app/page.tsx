'use client';

import { useState, useEffect } from 'react';
import { Send, Bot, User, LogIn, Settings, Maximize2, Minimize2 } from 'lucide-react';
import TravelDashboard from '@/components/TravelDashboard';

// Context Type Definition
interface ConversationContext {
  currentTrip?: {
    origin?: string;
    destination?: string;
    startDate?: string;
    endDate?: string;
    travelers?: number;
  };
  preferences: {
    budget?: {
      restaurants?: { min?: number; max?: number; perPerson?: boolean };
      hotels?: { min?: number; max?: number; perNight?: boolean };
      flights?: { max?: number; class?: string };
    };
    loyalty?: {
      airlines?: string[];
      hotels?: string[];
    };
    dietary?: string[];
    cuisine?: string[];
    hotelAmenities?: string[];
  };
  lastSearches?: {
    flights?: any;
    hotels?: any;
    restaurants?: any;
  };
}

export default function TravelAgent() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [debugInfo, setDebugInfo] = useState<{user?: {email?: string}} | null>(null);

  const [messages, setMessages] = useState<Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    data?: any;
  }>>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationContext, setConversationContext] = useState<ConversationContext | null>(null);
  const [showPreferences, setShowPreferences] = useState(false);
  
  // NEW: State for dashboard view
  const [expandedDashboard, setExpandedDashboard] = useState<number | null>(null);

  // Check authentication status
  useEffect(() => {
    fetch('/api/auth/session')
      .then(res => res.json())
      .then(data => {
        console.log('Session data:', data);
        setDebugInfo(data);
        setIsAuthenticated(!!data.user);
      })
      .catch(err => console.error('Session check failed:', err));
  }, []);

  // Initialize messages
  useEffect(() => {
    if (!isInitialized) {
      setMessages([
        {
          role: 'assistant',
          content: 'Hi! I\'m your AI travel assistant. I can access your Google Calendar to find travel events and help organize everything with a beautiful dashboard view! 📊',
          timestamp: new Date()
        }
      ]);
      setIsInitialized(true);
    }
  }, [isInitialized]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = {
      role: 'user' as const,
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: input,
          conversationContext: conversationContext
        })
      });

      const data = await response.json();
      
      if (data.conversationContext) {
        setConversationContext(data.conversationContext);
        console.log('📊 Updated context:', data.conversationContext);
      }
      
      setMessages(prev => [...prev, {
        role: 'assistant' as const,
        content: data.response || 'I\'m working on that for you!',
        timestamp: new Date(),
        data: data.travelPlan
      }]);
    } catch (error) {
      setMessages(prev => [...prev, {
        role: 'assistant' as const,
        content: 'I\'m having trouble connecting right now. Let me help you with a demo response!',
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const signIn = () => {
    window.location.href = '/api/auth/signin';
  };
  
  const signOut = () => {
    window.location.href = '/api/auth/signout';
  };
  
  // Preferences Display Component
  const PreferencesDisplay = () => {
    if (!conversationContext?.preferences) return null;
    
    const prefs = conversationContext.preferences;
    const items = [];
    
    if (prefs.budget?.restaurants?.max) {
      items.push(`🍽️ Restaurants: Under $${prefs.budget.restaurants.max}${prefs.budget.restaurants.perPerson ? ' per person' : ''}`);
    }
    if (prefs.budget?.hotels?.max) {
      items.push(`🏨 Hotels: Under $${prefs.budget.hotels.max}/night`);
    }
    if (prefs.loyalty?.airlines?.length) {
      items.push(`✈️ Airlines: ${prefs.loyalty.airlines.join(', ')}`);
    }
    if (prefs.loyalty?.hotels?.length) {
      items.push(`🏨 Chains: ${prefs.loyalty.hotels.join(', ')}`);
    }
    
    if (items.length === 0) return null;
    
    return (
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-purple-600" />
            <span className="font-medium text-purple-800 text-sm">Active Preferences</span>
          </div>
          <button
            onClick={() => setShowPreferences(!showPreferences)}
            className="text-xs text-purple-600 hover:text-purple-800"
          >
            {showPreferences ? 'Hide' : 'Show'}
          </button>
        </div>
        {showPreferences && (
          <div className="space-y-1">
            {items.map((item, idx) => (
              <div key={idx} className="text-xs text-purple-700">{item}</div>
            ))}
          </div>
        )}
      </div>
    );
  };
  
  // Auth button
  const authButton = !isAuthenticated ? (
    <button
      onClick={signIn}
      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
    >
      <LogIn className="w-4 h-4" />
      Connect Calendar
    </button>
  ) : (
    <div className="flex items-center gap-3">
      <span className="text-sm text-green-600">
        Connected: {debugInfo?.user?.email}
      </span>
      <button
        onClick={signOut}
        className="text-xs text-red-600 hover:text-red-800"
      >
        Sign Out
      </button>
    </div>
  );

  return (
    <div className="h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex flex-col">
      {/* Modern Header */}
      <div className="bg-white/80 backdrop-blur-sm shadow-sm border-b border-gray-200 p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Travel Intelligence AI</h1>
              <p className="text-xs text-gray-500">Powered by MCP Architecture</p>
            </div>
          </div>
          {authButton}
        </div>
      </div>

      {/* Chat and Dashboard Area */}
      <div className="flex-1 overflow-hidden flex">
        {/* Chat Section */}
        <div className={`${expandedDashboard !== null ? 'w-1/3' : 'w-full max-w-4xl mx-auto'} flex flex-col transition-all duration-300`}>
          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-4">
              {/* Preferences Display */}
              {conversationContext && <PreferencesDisplay />}
              
              {/* Messages */}
              {messages.map((message, index) => (
                <div key={index}>
                  {/* Message Bubble */}
                  <div className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} mb-2`}>
                    <div className={`max-w-xl rounded-2xl px-4 py-3 ${
                      message.role === 'user'
                        ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg'
                        : 'bg-white shadow-md border border-gray-100'
                    }`}>
                      <div className="flex items-start gap-3">
                        {message.role === 'assistant' && (
                          <Bot className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                        )}
                        <div className="flex-1">
                          <p className="text-sm leading-relaxed">{message.content}</p>
                          <p className={`text-xs mt-2 ${
                            message.role === 'user' ? 'text-blue-100' : 'text-gray-400'
                          }`}>
                            {isInitialized ? message.timestamp.toLocaleTimeString() : ''}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Dashboard Preview/Toggle for Assistant Messages with Data */}
                  {message.role === 'assistant' && message.data && (
                    <div className="mb-4">
                      {expandedDashboard !== index ? (
                        // Compact Dashboard Preview
                        <div className="bg-white rounded-xl shadow-md border border-gray-100 p-4 mx-auto max-w-2xl">
                          <div className="flex items-center justify-between mb-3">
                            <h3 className="font-semibold text-gray-900">
                              Trip Dashboard - {message.data.calendar?.destination || 'Your Destination'}
                            </h3>
                            <button
                              onClick={() => setExpandedDashboard(index)}
                              className="flex items-center gap-2 px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                            >
                              <Maximize2 className="w-4 h-4" />
                              Expand Dashboard
                            </button>
                          </div>
                          
                          {/* Quick Stats Preview */}
                          <div className="grid grid-cols-4 gap-3">
                            <div className="text-center p-2 bg-blue-50 rounded-lg">
                              <p className="text-2xl font-bold text-blue-600">
                                {message.data.flights?.flights?.length || 0}
                              </p>
                              <p className="text-xs text-gray-600">Flights</p>
                            </div>
                            <div className="text-center p-2 bg-green-50 rounded-lg">
                              <p className="text-2xl font-bold text-green-600">
                                {message.data.hotels?.hotels?.length || 0}
                              </p>
                              <p className="text-xs text-gray-600">Hotels</p>
                            </div>
                            <div className="text-center p-2 bg-orange-50 rounded-lg">
                              <p className="text-2xl font-bold text-orange-600">
                                {message.data.restaurants?.restaurants?.length || 0}
                              </p>
                              <p className="text-xs text-gray-600">Restaurants</p>
                            </div>
                            <div className="text-center p-2 bg-purple-50 rounded-lg">
                              <p className="text-2xl font-bold text-purple-600">
                                {(message.data.colleagues?.count || 0) + (message.data.linkedIn?.count || 0)}
                              </p>
                              <p className="text-xs text-gray-600">Connections</p>
                            </div>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              ))}
              
              {/* Loading Animation */}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-white shadow-md border rounded-2xl px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Bot className="w-5 h-5 text-blue-600" />
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Input Area */}
          <div className="bg-white/80 backdrop-blur-sm border-t border-gray-200 p-4">
            <div className="flex gap-3">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="Ask about flights, hotels, restaurants, or set preferences..."
                className="flex-1 px-4 py-3 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                disabled={isLoading}
              />
              <button
                onClick={sendMessage}
                disabled={isLoading || !input.trim()}
                className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 font-medium"
              >
                <Send className="w-4 h-4" />
                Send
              </button>
            </div>
            
            {/* Quick Actions */}
            <div className="mt-3 flex flex-wrap gap-2">
              {[
                "Plan trip to London",
                "Hotels under $200/night",
                "Find vegetarian restaurants",
                "Show flight options"
              ].map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => setInput(suggestion)}
                  className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-full text-gray-700 transition-colors"
                  disabled={isLoading}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Expanded Dashboard Section */}
        {expandedDashboard !== null && messages[expandedDashboard]?.data && (
          <div className="flex-1 overflow-y-auto p-4 bg-gray-50/50">
            <div className="mb-4 flex justify-end">
              <button
                onClick={() => setExpandedDashboard(null)}
                className="flex items-center gap-2 px-3 py-1 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm"
              >
                <Minimize2 className="w-4 h-4" />
                Minimize
              </button>
            </div>
            <TravelDashboard 
              data={messages[expandedDashboard].data}
              destination={messages[expandedDashboard].data.calendar?.destination}
            />
          </div>
        )}
      </div>
    </div>
  );
}