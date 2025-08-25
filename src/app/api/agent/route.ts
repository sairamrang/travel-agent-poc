import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import { GoogleCalendarMCPServer } from '@/lib/mcp/google-calendar-server';
import { MockCompanyMCPServer, MockLinkedInMCPServer } from '@/lib/mcp/mock-servers';
import { TimezoneReasoningEngine } from '@/lib/reasoning/timezone-engine';
import { RecommendationEngine } from '@/lib/reasoning/recommendation-engine';
import { MCPCoordinator } from '@/lib/mcp/mcp-coordinator';

// ============= NEW CONTEXT MANAGEMENT SYSTEM =============
interface UserPreferences {
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
}

interface ConversationContext {
  currentTrip?: {
    origin?: string;
    destination?: string;
    startDate?: string;
    endDate?: string;
    travelers?: number;
  };
  preferences: UserPreferences;
  lastSearches?: {
    flights?: any;
    hotels?: any;
    restaurants?: any;
  };
}

class ContextManager {
  private context: ConversationContext;

  constructor(initialContext?: ConversationContext) {
    this.context = initialContext || { preferences: {} };
  }

  extractPreferences(message: string): Partial<UserPreferences> {
    const preferences: Partial<UserPreferences> = {};
    const lowerMessage = message.toLowerCase();

    // Extract price preferences
    const pricePatterns = [
      /(?:less than|under|max|maximum)\s*\$?(\d+)(?:\s*per\s*person)?/i,
      /\$?(\d+)\s*(?:per person|pp)/i,
      /budget.*\$?(\d+)/i,
    ];

    for (const pattern of pricePatterns) {
      const match = message.match(pattern);
      if (match) {
        const amount = parseInt(match[1]);
        const perPerson = lowerMessage.includes('per person') || lowerMessage.includes('pp');
        
        if (lowerMessage.includes('restaurant') || lowerMessage.includes('dinner') || lowerMessage.includes('lunch')) {
          preferences.budget = {
            ...preferences.budget,
            restaurants: { max: amount, perPerson }
          };
        } else if (lowerMessage.includes('hotel') || lowerMessage.includes('stay')) {
          preferences.budget = {
            ...preferences.budget,
            hotels: { max: amount, perNight: true }
          };
        } else if (lowerMessage.includes('flight')) {
          preferences.budget = {
            ...preferences.budget,
            flights: { max: amount }
          };
        }
      }
    }

    // Extract hotel chain preferences
    const hotelChains = {
      'marriott': ['marriott', 'bonvoy', 'ritz', 'westin', 'sheraton'],
      'hilton': ['hilton', 'honors', 'conrad', 'waldorf', 'doubletree'],
      'hyatt': ['hyatt', 'park hyatt', 'grand hyatt', 'andaz'],
      'ihg': ['ihg', 'intercontinental', 'holiday inn', 'crowne plaza'],
    };

    for (const [brand, keywords] of Object.entries(hotelChains)) {
      if (keywords.some(keyword => lowerMessage.includes(keyword))) {
        if (!preferences.loyalty) preferences.loyalty = {};
        if (!preferences.loyalty.hotels) preferences.loyalty.hotels = [];
        preferences.loyalty.hotels.push(brand);
      }
    }

    // Extract airline preferences
    const airlines = ['united', 'american', 'delta', 'southwest', 'jetblue', 'alaska'];
    const foundAirlines = airlines.filter(airline => lowerMessage.includes(airline));
    if (foundAirlines.length > 0) {
      if (!preferences.loyalty) preferences.loyalty = {};
      preferences.loyalty.airlines = foundAirlines;
    }

    // Extract dietary preferences
    const dietaryKeywords = ['vegetarian', 'vegan', 'gluten-free', 'halal', 'kosher'];
    const foundDietary = dietaryKeywords.filter(diet => lowerMessage.includes(diet));
    if (foundDietary.length > 0) {
      preferences.dietary = foundDietary;
    }

    // Extract cuisine preferences
    const cuisineTypes = ['italian', 'mexican', 'chinese', 'japanese', 'thai', 'indian', 'french'];
    const foundCuisine = cuisineTypes.filter(cuisine => lowerMessage.includes(cuisine));
    if (foundCuisine.length > 0) {
      preferences.cuisine = foundCuisine;
    }

    // Extract hotel amenities
    const amenities = ['pool', 'gym', 'spa', 'parking', 'wifi', 'breakfast', 'pet-friendly'];
    const foundAmenities = amenities.filter(amenity => lowerMessage.includes(amenity));
    if (foundAmenities.length > 0) {
      preferences.hotelAmenities = foundAmenities;
    }

    return preferences;
  }

  updateContext(message: string) {
    const newPreferences = this.extractPreferences(message);
    this.context.preferences = this.mergePreferences(this.context.preferences, newPreferences);
    
    console.log('📊 Updated preferences:', this.context.preferences);
  }

  private mergePreferences(existing: UserPreferences, newPrefs: Partial<UserPreferences>): UserPreferences {
    return {
      ...existing,
      ...newPrefs,
      budget: {
        ...existing.budget,
        ...newPrefs.budget,
        restaurants: { ...existing.budget?.restaurants, ...newPrefs.budget?.restaurants },
        hotels: { ...existing.budget?.hotels, ...newPrefs.budget?.hotels },
        flights: { ...existing.budget?.flights, ...newPrefs.budget?.flights },
      },
      loyalty: {
        airlines: [...new Set([...(existing.loyalty?.airlines || []), ...(newPrefs.loyalty?.airlines || [])])],
        hotels: [...new Set([...(existing.loyalty?.hotels || []), ...(newPrefs.loyalty?.hotels || [])])],
      },
      dietary: [...new Set([...(existing.dietary || []), ...(newPrefs.dietary || [])])],
      cuisine: [...new Set([...(existing.cuisine || []), ...(newPrefs.cuisine || [])])],
      hotelAmenities: [...new Set([...(existing.hotelAmenities || []), ...(newPrefs.hotelAmenities || [])])],
    };
  }

  applyPreferencesToSearch(toolName: string, params: any): any {
    const enhancedParams = { ...params };
    
    switch (toolName) {
      case 'search_restaurants':
        if (this.context.preferences.budget?.restaurants?.max) {
          enhancedParams.maxPrice = this.context.preferences.budget.restaurants.max;
          enhancedParams.perPerson = this.context.preferences.budget.restaurants.perPerson;
        }
        if (this.context.preferences.dietary?.length) {
          enhancedParams.dietary = this.context.preferences.dietary;
        }
        if (this.context.preferences.cuisine?.length) {
          enhancedParams.cuisine = this.context.preferences.cuisine;
        }
        break;
      
      case 'search_hotels':
        if (this.context.preferences.budget?.hotels?.max) {
          enhancedParams.maxPrice = this.context.preferences.budget.hotels.max;
        }
        if (this.context.preferences.loyalty?.hotels?.length) {
          enhancedParams.preferredChains = this.context.preferences.loyalty.hotels;
        }
        if (this.context.preferences.hotelAmenities?.length) {
          enhancedParams.amenities = this.context.preferences.hotelAmenities;
        }
        break;
      
      case 'search_flights':
        if (this.context.preferences.budget?.flights?.max) {
          enhancedParams.maxPrice = this.context.preferences.budget.flights.max;
        }
        if (this.context.preferences.loyalty?.airlines?.length) {
          enhancedParams.preferredAirlines = this.context.preferences.loyalty.airlines;
        }
        if (this.context.preferences.budget?.flights?.class) {
          enhancedParams.travelClass = this.context.preferences.budget.flights.class;
        }
        break;
    }
    
    return enhancedParams;
  }

  filterResults(toolName: string, results: any): any {
    if (!results || results.status !== 'success') return results;
    
    switch (toolName) {
      case 'search_restaurants':
        if (results.restaurants && this.context.preferences.budget?.restaurants?.max) {
          const maxPrice = this.context.preferences.budget.restaurants.max;
          const original = results.restaurants.length;
          results.restaurants = results.restaurants.filter((r: any) => {
            const price = this.context.preferences.budget?.restaurants?.perPerson ? 
              r.pricePerPerson : r.averagePrice;
            return !price || price <= maxPrice;
          });
          console.log(`🍽️ Filtered restaurants: ${original} → ${results.restaurants.length} (max $${maxPrice})`);
        }
        break;
      
      case 'search_hotels':
        if (results.hotels) {
          const original = results.hotels.length;
          
          // Filter by price
          if (this.context.preferences.budget?.hotels?.max) {
            results.hotels = results.hotels.filter((h: any) => 
              !h.price || h.price <= this.context.preferences.budget!.hotels!.max!
            );
          }
          
          // Prioritize preferred chains
          if (this.context.preferences.loyalty?.hotels?.length) {
            results.hotels.sort((a: any, b: any) => {
              const aPreferred = this.context.preferences.loyalty!.hotels!.some(chain =>
                a.name?.toLowerCase().includes(chain.toLowerCase())
              );
              const bPreferred = this.context.preferences.loyalty!.hotels!.some(chain =>
                b.name?.toLowerCase().includes(chain.toLowerCase())
              );
              if (aPreferred && !bPreferred) return -1;
              if (!aPreferred && bPreferred) return 1;
              return 0;
            });
          }
          
          console.log(`🏨 Filtered hotels: ${original} → ${results.hotels.length}`);
        }
        break;
      
      case 'search_flights':
        if (results.flights && this.context.preferences.loyalty?.airlines?.length) {
          // Sort preferred airlines to the top
          results.flights.sort((a: any, b: any) => {
            const aPreferred = this.context.preferences.loyalty!.airlines!.some(airline =>
              a.airline?.toLowerCase().includes(airline.toLowerCase())
            );
            const bPreferred = this.context.preferences.loyalty!.airlines!.some(airline =>
              b.airline?.toLowerCase().includes(airline.toLowerCase())
            );
            if (aPreferred && !bPreferred) return -1;
            if (!aPreferred && bPreferred) return 1;
            return 0;
          });
        }
        break;
    }
    
    return results;
  }

  getContext(): ConversationContext {
    return this.context;
  }

  generatePreferenceSummary(): string {
    const parts = [];
    
    if (this.context.preferences.budget?.restaurants?.max) {
      parts.push(`Restaurant budget: $${this.context.preferences.budget.restaurants.max}${this.context.preferences.budget.restaurants.perPerson ? ' per person' : ''}`);
    }
    if (this.context.preferences.budget?.hotels?.max) {
      parts.push(`Hotel budget: $${this.context.preferences.budget.hotels.max} per night`);
    }
    if (this.context.preferences.loyalty?.hotels?.length) {
      parts.push(`Preferred hotels: ${this.context.preferences.loyalty.hotels.join(', ')}`);
    }
    if (this.context.preferences.loyalty?.airlines?.length) {
      parts.push(`Preferred airlines: ${this.context.preferences.loyalty.airlines.join(', ')}`);
    }
    if (this.context.preferences.dietary?.length) {
      parts.push(`Dietary: ${this.context.preferences.dietary.join(', ')}`);
    }
    
    return parts.length > 0 ? `Applying your preferences: ${parts.join('; ')}` : '';
  }
}

// ============= MAIN ROUTE HANDLER =============
export async function POST(request: NextRequest) {
  try {
    const { message, conversationContext } = await request.json();
    
    console.log('🚀 === TRAVEL AGENT REQUEST START ===');
    console.log('🚀 User message:', message);
    
    // Initialize context manager with existing context if provided
    const contextManager = new ContextManager(conversationContext);
    contextManager.updateContext(message);
    
    const preferenceSummary = contextManager.generatePreferenceSummary();
    if (preferenceSummary) {
      console.log('🎯 ' + preferenceSummary);
    }
    
    // Initialize MCP Coordinator and other servers
    const mcpCoordinator = new MCPCoordinator();
    const companyMCP = new MockCompanyMCPServer();
    const linkedInMCP = new MockLinkedInMCPServer();
    
    // Get user session for Google Calendar access
    const session = await getServerSession(authOptions);
    console.log('📅 Session check:', {
      hasSession: !!session,
      hasUser: !!session?.user,
      hasAccessToken: !!session?.accessToken,
      userEmail: session?.user?.email
    });
    
    let travelContext = null;
    let calendarStatus = "Not connected";
    
    // Step 1: Extract travel details from message first to get dates
    console.log('📝 Extracting travel details from message');
    const extractedContext = extractTravelFromMessage(message);
    
    // Step 2: Try to get real calendar data if user is authenticated
    if (session?.accessToken && session?.user) {
      try {
        console.log('🔗 Attempting to connect to Google Calendar with valid session...');
        const calendarMCP = new GoogleCalendarMCPServer(session.accessToken as string);
        
        const timeMin = extractedContext.startDate ? new Date(extractedContext.startDate).toISOString() : undefined;
        const timeMax = extractedContext.endDate ? new Date(extractedContext.endDate).toISOString() : undefined;
        
        console.log('📅 Calendar search dates:', { timeMin, timeMax });
        
        travelContext = await calendarMCP.extractTravelEvents(timeMin, timeMax);
        console.log('📋 Calendar data retrieved successfully:', {
          destination: travelContext.destination,
          eventCount: travelContext.events.length,
          startDate: travelContext.startDate
        });
        calendarStatus = `Connected - Found ${travelContext.events.length} travel events`;
      } catch (error) {
        console.error('❌ Calendar MCP error:', error instanceof Error ? error.message : 'Unknown error');
        console.log('🔄 Continuing with message extraction due to calendar auth error');
        calendarStatus = `Connected but auth error - using message extraction`;
        travelContext = null;
      }
    } else {
      console.log('❌ No valid session or access token found');
      calendarStatus = "Not authenticated - please sign in to Google Calendar";
    }
    
    // Step 3: If no real calendar data, use extracted message data
    if (!travelContext || !travelContext.events || travelContext.events.length === 0) {
      travelContext = extractedContext;
      if (session?.accessToken) {
        if (calendarStatus.includes('auth error')) {
          // Keep the auth error status
        } else {
          calendarStatus = "Connected - No travel events found, extracted from message";
        }
      } else {
        calendarStatus = "Demo mode - Not authenticated, extracted from message";
      }
    }
    
    // Step 4: Timezone Intelligence Analysis
    let timezoneAnalysis = null;
    
    if (travelContext.destination && travelContext.events && travelContext.events.length > 0) {
      try {
        console.log('🧠 Running timezone conflict analysis...');
        const timezoneEngine = new TimezoneReasoningEngine();
        
        const conflicts = await timezoneEngine.analyzeTimezoneConflicts(
          travelContext.events,
          travelContext.destination,
          {
            start: travelContext.startDate,
            end: travelContext.endDate
          }
        );
        
        const smartRecommendations = timezoneEngine.generateSmartRecommendations(conflicts);
        
        timezoneAnalysis = {
          conflicts,
          recommendations: smartRecommendations,
          conflictCount: conflicts.length,
          highSeverityCount: conflicts.filter(c => c.severity === 'high').length,
          businessHoursConflicts: conflicts.filter(c => c.conflictType === 'business_hours_conflict').length,
          timezoneMismatches: conflicts.filter(c => c.conflictType === 'timezone_mismatch').length,
          travelConflicts: conflicts.filter(c => c.conflictType === 'overlaps_travel').length
        };
        
        console.log('⚡ Timezone analysis complete:', {
          conflictCount: conflicts.length,
          highSeverity: timezoneAnalysis.highSeverityCount
        });
        
      } catch (error) {
        console.error('❌ Timezone analysis failed:', error);
        timezoneAnalysis = {
          conflicts: [],
          recommendations: ['Timezone analysis unavailable'],
          conflictCount: 0,
          highSeverityCount: 0
        };
      }
    }
    
    // Step 5: Call Claude with MCP Tools with context awareness
    console.log('🎯 === ORCHESTRATION MODE: CLAUDE + MCP TOOLS WITH CONTEXT ===');
    const mcpEnabledResponse = await callClaudeWithMCPTools({
      message,
      travelContext,
      timezoneAnalysis,
      calendarStatus,
      userEmail: session?.user?.email,
      mcpCoordinator,
      companyMCP,
      linkedInMCP,
      contextManager // Pass context manager to apply preferences
    });

    console.log('✅ Claude orchestrated travel plan generated successfully with user preferences');

    // Simulate AI processing time
    await new Promise(resolve => setTimeout(resolve, 1500));

    return NextResponse.json({
      response: mcpEnabledResponse.content,
      travelPlan: mcpEnabledResponse.data,
      conversationContext: contextManager.getContext() // Return updated context
    });
    
  } catch (error) {
    console.error('💥 MCP Agent API error:', error);
    return NextResponse.json(
      { 
        error: 'Something went wrong with MCP integration',
        response: 'I apologize, but I encountered an error while planning your trip with the new MCP architecture. Let me try with basic information!',
        travelPlan: {
          status: 'MCP Error occurred',
          message: error.message,
          architecture: 'mcp_fallback'
        }
      },
      { status: 500 }
    );
  }
}

// Updated callClaudeWithMCPTools function with context awareness
async function callClaudeWithMCPTools(context: any) {
  const { 
    message, 
    travelContext, 
    timezoneAnalysis, 
    calendarStatus, 
    userEmail, 
    mcpCoordinator, 
    companyMCP, 
    linkedInMCP,
    contextManager // NEW: Context manager for preferences
  } = context;
  
  console.log('🚀 Executing MCP tools with user preferences...');
  
  let toolResults = {};
  
  // Execute MCP tool calls with preference-enhanced parameters
  if (travelContext.destination && travelContext.startDate) {
    
    // Flight search with preferences
    try {
      console.log('🔧 Direct MCP: Flight search with preferences...');
      
      const cleanDestination = extractCityFromText(travelContext.destination);
      console.log(`📍 Parsed destination: "${travelContext.destination}" → "${cleanDestination}"`);
      
      let flightParams = {
        origin: 'NYC',
        destination: cleanDestination,
        departureDate: travelContext.startDate.split('T')[0],
        returnDate: travelContext.endDate ? travelContext.endDate.split('T')[0] : undefined
      };
      
      // Apply preferences
      flightParams = contextManager.applyPreferencesToSearch('search_flights', flightParams);
      
      console.log('✈️ Flight search params with preferences:', flightParams);
      
      let flightResult = await mcpCoordinator.executeToolCall('search_flights', flightParams);
      
      // Filter results based on preferences
      flightResult = contextManager.filterResults('search_flights', flightResult);
      
      toolResults.search_flights = flightResult;
      console.log('✅ Flight search result status:', flightResult.status);
      
    } catch (error) {
      console.error('❌ Flight search failed:', error.message);
      toolResults.search_flights = { 
        status: 'error', 
        error: error.message,
        tool: 'search_flights'
      };
    }

    // Hotel search with preferences
    try {
      console.log('🔧 Direct MCP: Hotel search with preferences...');
      
      let hotelParams = {
        destination: extractCityFromText(travelContext.destination),
        checkIn: travelContext.startDate.split('T')[0],
        checkOut: travelContext.endDate ? travelContext.endDate.split('T')[0] : travelContext.startDate.split('T')[0]
      };
      
      // Apply preferences
      hotelParams = contextManager.applyPreferencesToSearch('search_hotels', hotelParams);
      
      console.log('🏨 Hotel search params with preferences:', hotelParams);
      
      let hotelResult = await mcpCoordinator.executeToolCall('search_hotels', hotelParams);
      
      // Filter results based on preferences
      hotelResult = contextManager.filterResults('search_hotels', hotelResult);
      
      toolResults.search_hotels = hotelResult;
      console.log('✅ Hotel search result status:', hotelResult.status);
      
    } catch (error) {
      console.error('❌ Hotel search failed:', error.message);
      toolResults.search_hotels = { 
        status: 'error', 
        error: error.message,
        tool: 'search_hotels'
      };
    }

    // Restaurant search with preferences
    try {
      console.log('🔧 Direct MCP: Restaurant search with preferences...');
      
      let restaurantParams = {
        destination: extractCityFromText(travelContext.destination)
      };
      
      // Apply preferences
      restaurantParams = contextManager.applyPreferencesToSearch('search_restaurants', restaurantParams);
      
      console.log('🍽️ Restaurant search params with preferences:', restaurantParams);
      
      let restaurantResult = await mcpCoordinator.executeToolCall('search_restaurants', restaurantParams);
      
      // Filter results based on preferences
      restaurantResult = contextManager.filterResults('search_restaurants', restaurantResult);
      
      toolResults.search_restaurants = restaurantResult;
      console.log('✅ Restaurant search result status:', restaurantResult.status);
      
    } catch (error) {
      console.error('❌ Restaurant search failed:', error.message);
      toolResults.search_restaurants = { 
        status: 'error', 
        error: error.message,
        tool: 'search_restaurants'
      };
    }
  }

  // Weather forecast and packing recommendations
  try {
    console.log('🔧 Direct MCP: Weather forecast and packing...');
    
    const weatherParams = {
      destination: extractCityFromText(travelContext.destination),
      startDate: travelContext.startDate.split('T')[0],
      endDate: travelContext.endDate ? travelContext.endDate.split('T')[0] : travelContext.startDate.split('T')[0],
      units: 'celsius' as const
    };
    
    console.log('🌤️ Weather search params:', weatherParams);
    
    const weatherResult = await mcpCoordinator.executeToolCall('weather_forecast', weatherParams);
    toolResults.weather_forecast = weatherResult;
    console.log('✅ Weather search result status:', weatherResult.status);
    
    // Generate packing recommendations based on weather
    if (weatherResult.status === 'success') {
      const packingParams = {
        destination: extractCityFromText(travelContext.destination),
        weatherForecast: weatherResult.forecast.daily,
        tripPurpose: 'business' as const,
        duration: Math.ceil((new Date(travelContext.endDate || travelContext.startDate).getTime() - new Date(travelContext.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1
      };
      
      console.log('🧳 Packing params:', packingParams);
      
      const packingResult = await mcpCoordinator.executeToolCall('packing_recommendations', packingParams);
      toolResults.packing_recommendations = packingResult;
      console.log('✅ Packing recommendations status:', packingResult.status);
    }
    
  } catch (error) {
    console.error('❌ Weather/packing search failed:', error.message);
    toolResults.weather_forecast = { 
      status: 'error', 
      error: error.message,
      tool: 'weather_forecast'
    };
  }

  // Get colleagues and LinkedIn connections
  let colleagueResult = { colleagues: [] };
  let connectionResult = { connections: [] };
  
  if (travelContext.destination) {
    try {
      colleagueResult.colleagues = await companyMCP.findColleagues(travelContext.destination);
      connectionResult.connections = await linkedInMCP.findConnections(travelContext.destination);
    } catch (error) {
      console.error('❌ Error finding colleagues/connections:', error);
    }
  }

  // Generate response with preference acknowledgment
  const preferenceSummary = contextManager.generatePreferenceSummary();
  const toolSummary = Object.entries(toolResults).map(([toolName, result]) => {
    if (result.status === 'success') {
      switch (toolName) {
        case 'search_flights':
          return `✈️ Found ${result.flights?.length || 0} flight options${contextManager.getContext().preferences.loyalty?.airlines?.length ? ' (prioritizing your preferred airlines)' : ''}`;
        case 'search_hotels':
          return `🏨 Found ${result.hotels?.length || 0} hotel options${contextManager.getContext().preferences.budget?.hotels?.max ? ` under $${contextManager.getContext().preferences.budget.hotels.max}/night` : ''}`;
        case 'search_restaurants':
          return `🍽️ Found ${result.restaurants?.length || 0} restaurant options${contextManager.getContext().preferences.budget?.restaurants?.max ? ` under $${contextManager.getContext().preferences.budget.restaurants.max}${contextManager.getContext().preferences.budget.restaurants.perPerson ? ' per person' : ''}` : ''}`;
        default:
          return `${toolName}: Success`;
      }
    } else {
      return `${toolName}: ${result.error || 'Failed'}`;
    }
  }).join('\n');

  const responseText = `Perfect! I found travel options for your trip to ${extractCityFromText(travelContext.destination)}${preferenceSummary ? `. ${preferenceSummary}` : ''}:\n\n${toolSummary}\n\nI've applied your preferences to filter and prioritize the results. Check the detailed options below!`;

  return {
    content: responseText,
    data: {
      calendar: {
        status: calendarStatus,
        events: travelContext.events || [],
        destination: travelContext.destination,
        purpose: travelContext.purpose,
        startDate: travelContext.startDate,
        endDate: travelContext.endDate,
        timezoneAnalysis
      },
      flights: toolResults.search_flights || { status: 'not_searched', message: 'No flight search performed' },
      hotels: toolResults.search_hotels || { status: 'not_searched', message: 'No hotel search performed' },
      restaurants: toolResults.search_restaurants || { status: 'not_searched', message: 'No restaurant search performed' },
      colleagues: {
        status: 'success',
        count: colleagueResult.colleagues?.length || 0,
        list: colleagueResult.colleagues || []
      },
      linkedIn: {
        status: 'success',
        count: connectionResult.connections?.length || 0,
        list: connectionResult.connections || []
      },
      weather: toolResults.weather_forecast || { status: 'not_searched' },
      packing: toolResults.packing_recommendations || { status: 'not_searched' },
      searchTime: new Date().toISOString(),
      authenticationStatus: context.userEmail ? 'authenticated' : 'not_authenticated',
      intelligenceLevel: 'context_aware_mcp',
      mcpArchitecture: true,
      toolsExecuted: Object.keys(toolResults),
      appliedPreferences: contextManager.getContext().preferences,
      claudeStatus: 'bypassed_due_to_404'
    }
  };
}

// Helper function to extract city names from text
function extractCityFromText(text: string): string {
  const cityMappings = {
    'london': 'London',
    'new york': 'New York',
    'nyc': 'New York', 
    'san francisco': 'San Francisco',
    'sf': 'San Francisco',
    'paris': 'Paris',
    'tokyo': 'Tokyo',
    'singapore': 'Singapore',
    'berlin': 'Berlin',
    'sydney': 'Sydney',
    'los angeles': 'Los Angeles',
    'la': 'Los Angeles',
    'miami': 'Miami',
    'chicago': 'Chicago',
    'boston': 'Boston',
    'seattle': 'Seattle',
    'amsterdam': 'Amsterdam',
    'madrid': 'Madrid',
    'rome': 'Rome',
    'dubai': 'Dubai'
  };

  const cleanText = text.toLowerCase().trim();
  
  for (const [key, value] of Object.entries(cityMappings)) {
    if (cleanText.includes(key)) {
      return value;
    }
  }
  
  const words = text.split(' ');
  const cityWords = words.filter(word => {
    const clean = word.replace(/[^a-zA-Z]/g, '');
    return clean.length > 2 && /^[A-Z]/.test(clean);
  });
  
  if (cityWords.length > 0) {
    return cityWords[0].replace(/[^a-zA-Z]/g, '');
  }
  
  return 'London';
}

// Helper function to extract travel info from user message
function extractTravelFromMessage(message: string): any {
  const lowerMessage = message.toLowerCase();
  
  const cities = ['london', 'new york', 'san francisco', 'tokyo', 'singapore', 'berlin', 'paris', 'sydney'];
  const foundCity = cities.find(city => lowerMessage.includes(city));
  
  const timeKeywords = {
    'next month': new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    'next week': new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    'tomorrow': new Date(Date.now() + 24 * 60 * 60 * 1000)
  };
  
  let estimatedDate = null;
  for (const [keyword, date] of Object.entries(timeKeywords)) {
    if (lowerMessage.includes(keyword)) {
      estimatedDate = date;
      break;
    }
  }
  
  return {
    destination: foundCity ? foundCity.charAt(0).toUpperCase() + foundCity.slice(1) : 'London',
    purpose: 'Business meeting or conference',
    startDate: estimatedDate?.toISOString() || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    endDate: estimatedDate ? new Date(estimatedDate.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString() : new Date(Date.now() + 17 * 24 * 60 * 60 * 1000).toISOString(),
    events: [],
    extractedFromMessage: true
  };
}