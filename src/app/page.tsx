'use client';

import { useState, useEffect } from 'react';
import { Send, Bot, User, Plane, Calendar, Users, MapPin, LogIn } from 'lucide-react';

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

  // Initialize messages on client side to avoid hydration mismatch
  useEffect(() => {
    if (!isInitialized) {
      setMessages([
        {
          role: 'assistant',
          content: 'Hi! I\'m your AI travel assistant. I can access your Google Calendar to find travel events and help organize everything!',
          timestamp: new Date()
        }
      ]);
      setIsInitialized(true);
    }
  }, [isInitialized]);

  const signIn = () => {
    window.location.href = '/api/auth/signin';
  };

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
        body: JSON.stringify({ message: input })
      });

      const data = await response.json();
      
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

  // Auth button with proper connection status
  const authButton = !isAuthenticated ? (
    <div className="flex gap-2">
      <button
        onClick={signIn}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
      >
        <LogIn className="w-4 h-4" />
        Connect Google Calendar
      </button>
    </div>
  ) : (
    <div className="flex items-center gap-2 text-green-600">
      <Calendar className="w-4 h-4" />
      <span className="text-sm">
        Connected: {debugInfo?.user?.email} 
        <span className="ml-2 text-xs bg-green-100 px-2 py-1 rounded">
          Calendar Active
        </span>
      </span>
    </div>
  );

  return (
    <div className="h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col">
      {/* Header */}
      <div className="bg-white shadow-sm border-b p-4">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Bot className="w-8 h-8 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">Travel Agent AI</h1>
          </div>
          <div className="ml-auto flex items-center gap-4">
            {authButton}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-4xl mx-auto space-y-6">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-3xl rounded-lg p-4 ${
                  message.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white shadow-md border'
                }`}
              >
                <div className="flex items-start gap-3">
                  {message.role === 'assistant' && (
                    <Bot className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  )}
                  {message.role === 'user' && (
                    <User className="w-5 h-5 text-blue-100 mt-0.5 flex-shrink-0" />
                  )}
                  <div className="flex-1">
                    <p className="text-sm leading-relaxed">{message.content}</p>
                    {message.data && (
                      <div className="mt-4 space-y-3">
                        {/* Calendar Section */}
                        {message.data.calendar && (
                          <div className="p-3 bg-blue-50 rounded border-l-4 border-blue-400">
                            <div className="flex items-center gap-2 mb-2">
                              <Calendar className="w-4 h-4 text-blue-600" />
                              <span className="font-medium text-blue-800">
                                Calendar Events ({message.data.calendar.events.length} found)
                              </span>
                            </div>
                            <p className="text-sm text-blue-700 mb-3">
                              Status: {message.data.calendar.status}
                            </p>
                            
                            {message.data.calendar.events.length > 0 && (
                              <div className="bg-white rounded border overflow-hidden">
                                <table className="w-full text-xs">
                                  <thead className="bg-gray-50">
                                    <tr>
                                      <th className="text-left p-2 font-medium">Event</th>
                                      <th className="text-left p-2 font-medium">Date</th>
                                      <th className="text-left p-2 font-medium">Location</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {message.data.calendar.events.map((event: any, idx: number) => (
                                      <tr key={idx} className="border-t">
                                        <td className="p-2 font-medium">{event.summary}</td>
                                        <td className="p-2 text-gray-600">
                                          {isInitialized ? new Date(event.start.dateTime).toLocaleDateString() : ''}
                                        </td>
                                        <td className="p-2 text-gray-600">{event.location || 'No location'}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        )}
                        
                        {/* Flight Section */}
                        {message.data.flights && message.data.flights.status === 'success' && (
                          <div className="p-3 bg-green-50 rounded border-l-4 border-green-400">
                            <div className="flex items-center gap-2 mb-2">
                              <Plane className="w-4 h-4 text-green-600" />
                              <span className="font-medium text-green-800">Flight Options</span>
                            </div>
                            <div className="space-y-2">
                              {message.data.flights.offers.slice(0, 2).map((flight: any, idx: number) => (
                                <div key={idx} className="text-sm text-green-700 bg-white p-2 rounded">
                                  <strong>{flight.airline}</strong> - ${flight.price.total} 
                                  <br />
                                  {flight.departure.airport} → {flight.arrival.airport}
                                  <br />
                                  Departure: {isInitialized ? new Date(flight.departure.time).toLocaleString() : ''}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Colleagues Section */}
                        {message.data.colleagues && message.data.colleagues.count > 0 && (
                          <div className="p-3 bg-purple-50 rounded border-l-4 border-purple-400">
                            <div className="flex items-center gap-2 mb-2">
                              <Users className="w-4 h-4 text-purple-600" />
                              <span className="font-medium text-purple-800">Company Colleagues</span>
                            </div>
                            <div className="text-sm text-purple-700">
                              {message.data.colleagues.list.slice(0, 3).map((colleague: any, idx: number) => (
                                <div key={idx}>• {colleague.name} - {colleague.role}</div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* LinkedIn Section */}
                        {message.data.linkedIn && message.data.linkedIn.count > 0 && (
                          <div className="p-3 bg-blue-50 rounded border-l-4 border-blue-400">
                            <div className="flex items-center gap-2 mb-2">
                              <MapPin className="w-4 h-4 text-blue-600" />
                              <span className="font-medium text-blue-800">LinkedIn Connections</span>
                            </div>
                            <div className="text-sm text-blue-700">
                              {message.data.linkedIn.list.slice(0, 3).map((connection: any, idx: number) => (
                                <div key={idx}>• {connection.name} - {connection.role} at {connection.company}</div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    <p className="text-xs opacity-70 mt-2">
                      {isInitialized ? message.timestamp.toLocaleTimeString() : ''}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white shadow-md border rounded-lg p-4 max-w-xs">
                <div className="flex items-center gap-3">
                  <Bot className="w-5 h-5 text-blue-600" />
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce delay-75"></div>
                    <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce delay-150"></div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Input */}
      <div className="bg-white border-t p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex gap-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Tell me about your travel plans... (e.g., 'I'm going to London next month')"
              className="flex-1 p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isLoading}
            />
            <button
              onClick={sendMessage}
              disabled={isLoading || !input.trim()}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              Send
            </button>
          </div>
          
          {/* Quick suggestions */}
          <div className="mt-3 flex flex-wrap gap-2">
            {[
              "I'm traveling to London for a conference",
              "Going to Singapore for meetings",
              "Planning a trip to Tokyo next month"
            ].map((suggestion, index) => (
              <button
                key={index}
                onClick={() => setInput(suggestion)}
                className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-full text-gray-700"
                disabled={isLoading}
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}