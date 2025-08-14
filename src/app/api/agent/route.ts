import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import { GoogleCalendarMCPServer } from '@/lib/mcp/google-calendar-server';
import { AmadeusFlightMCPServer } from '@/lib/mcp/amadeus-server';
import { MockCompanyMCPServer, MockLinkedInMCPServer } from '@/lib/mcp/mock-servers';
import { TimezoneReasoningEngine } from '@/lib/reasoning/timezone-engine';

export async function POST(request: NextRequest) {
  try {
    const { message } = await request.json();
    
    console.log('🚀 Starting comprehensive travel planning for:', message);
    
    // Initialize all MCP servers
    const amadeusFlightMCP = new AmadeusFlightMCPServer();
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
    
    // Step 1: Try to get real calendar data if user is authenticated
    if (session?.accessToken && session?.user) {
      try {
        console.log('🔗 Attempting to connect to Google Calendar with valid session...');
        const calendarMCP = new GoogleCalendarMCPServer(session.accessToken as string);
        travelContext = await calendarMCP.extractTravelEvents();
        console.log('📋 Calendar data retrieved successfully:', {
          destination: travelContext.destination,
          eventCount: travelContext.events.length,
          startDate: travelContext.startDate
        });
        calendarStatus = `Connected - Found ${travelContext.events.length} travel events`;
      } catch (error) {
        console.error('❌ Calendar MCP error:', error.message);
        console.log('🔄 Continuing with message extraction due to calendar auth error');
        calendarStatus = `Connected but auth error - using message extraction`;
        // Don't throw here, continue with extraction
        travelContext = null;
      }
    } else {
      console.log('❌ No valid session or access token found');
      calendarStatus = "Not authenticated - please sign in to Google Calendar";
    }
    
    // Step 2: If no real calendar data, extract from message
    if (!travelContext || !travelContext.events || travelContext.events.length === 0) {
      console.log('📝 Extracting travel details from message');
      travelContext = extractTravelFromMessage(message);
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
    
    // Step 3: Search for flights (parallel with other searches)
    const searchPromises = [];
    
    if (travelContext.destination && travelContext.startDate) {
      console.log('✈️ Searching flights for:', travelContext.destination);
      
      // Determine origin airport
      const origin = 'JFK'; // Default to New York
      
      // Smart date handling
      let departureDate, returnDate;

      if (travelContext.startDate) {
        const startDate = new Date(travelContext.startDate);
        const endDate = travelContext.endDate ? new Date(travelContext.endDate) : null;
        
        // Check if dates are valid and not the same
        if (endDate && endDate.getTime() !== startDate.getTime() && endDate > startDate) {
          departureDate = startDate.toISOString().split('T')[0];
          returnDate = endDate.toISOString().split('T')[0];
        } else {
          // If no valid return date, make it 7 days later
          departureDate = startDate.toISOString().split('T')[0];
          const returnDateObj = new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000);
          returnDate = returnDateObj.toISOString().split('T')[0];
        }
      } else {
        // If no start date, use today and 7 days later
        const today = new Date();
        departureDate = today.toISOString().split('T')[0];
        const weekLater = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
        returnDate = weekLater.toISOString().split('T')[0];
      }

      console.log('📅 Flight search dates:', { departureDate, returnDate });
      
      searchPromises.push(
        amadeusFlightMCP.searchFlights(origin, travelContext.destination, departureDate, returnDate)
          .then(flights => {
            console.log('✈️ Flight search successful:', {
              origin: flights.origin,
              destination: flights.destination,
              departureDate: flights.departureDate,
              returnDate: flights.returnDate,
              offersFound: flights.offers.length
            });
            return { flights };
          })
          .catch(error => {
            console.error('❌ Flight search failed:', error);
            return { flights: null, flightError: error.message };
          })
      );
    } else {
      searchPromises.push(Promise.resolve({ flights: null }));
    }
    
    // Step 4: Search for colleagues and LinkedIn connections
    if (travelContext.destination) {
      console.log('👥 Searching colleagues and LinkedIn connections for:', travelContext.destination);
      
      searchPromises.push(
        companyMCP.findColleagues(travelContext.destination)
          .then(colleagues => ({ colleagues }))
          .catch(error => ({ colleagues: [], colleagueError: error.message }))
      );
      
      searchPromises.push(
        linkedInMCP.findConnections(travelContext.destination)
          .then(connections => ({ connections }))
          .catch(error => ({ connections: [], linkedInError: error.message }))
      );
    } else {
      searchPromises.push(Promise.resolve({ colleagues: [] }));
      searchPromises.push(Promise.resolve({ connections: [] }));
    }
    
    // Step 5: Execute all searches in parallel
    console.log('🔄 Executing parallel searches...');
    const [flightResult, colleagueResult, connectionResult] = await Promise.all(searchPromises);
    
    // Step 6: Enhanced calendar analysis with timezone intelligence
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
          highSeverityCount: conflicts.filter(c => c.severity === 'high').length
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
    
    // Step 7: Compile comprehensive travel plan with intelligence
    const completeTravelPlan = {
      // Enhanced calendar information with timezone intelligence
      calendar: {
        status: calendarStatus,
        events: travelContext.events || [],
        destination: travelContext.destination,
        purpose: travelContext.purpose,
        startDate: travelContext.startDate,
        endDate: travelContext.endDate,
        // NEW: Add timezone intelligence
        timezoneAnalysis: timezoneAnalysis
      },
      
      // Flight information
      flights: flightResult.flights ? {
        status: 'success',
        origin: flightResult.flights.origin,
        destination: flightResult.flights.destination,
        departureDate: flightResult.flights.departureDate,
        returnDate: flightResult.flights.returnDate,
        offers: flightResult.flights.offers.slice(0, 4), // Top 4 options
        totalOptions: flightResult.flights.offers.length
      } : {
        status: 'error',
        error: flightResult.flightError || 'No flight search performed'
      },
      
      // Company colleagues
      colleagues: {
        status: 'success',
        count: colleagueResult.colleagues?.length || 0,
        list: colleagueResult.colleagues || []
      },
      
      // LinkedIn connections
      linkedIn: {
        status: 'success',
        count: connectionResult.connections?.length || 0,
        list: connectionResult.connections || []
      },
      
      // Metadata
      searchTime: new Date().toISOString(),
      authenticationStatus: session?.user ? 'authenticated' : 'not_authenticated',
      intelligenceLevel: 'timezone_reasoning_enabled' // NEW: Mark as intelligent
    };
    
    // Step 8: Generate intelligent response
    const response = await generateComprehensiveResponse(message, completeTravelPlan);
    
    console.log('✅ Comprehensive travel plan generated:', {
      calendarEvents: completeTravelPlan.calendar.events.length,
      flightOptions: completeTravelPlan.flights.status === 'success' ? completeTravelPlan.flights.totalOptions : 0,
      colleagues: completeTravelPlan.colleagues.count,
      linkedInConnections: completeTravelPlan.linkedIn.count,
      authStatus: completeTravelPlan.authenticationStatus,
      timezoneConflicts: completeTravelPlan.calendar.timezoneAnalysis?.conflictCount || 0
    });
    
    // Simulate AI processing time
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    return NextResponse.json({
      response,
      travelPlan: completeTravelPlan
    });
    
  } catch (error) {
    console.error('💥 Agent API error:', error);
    return NextResponse.json(
      { 
        error: 'Something went wrong',
        response: 'I apologize, but I encountered an error while planning your trip. Let me try with basic information!',
        travelPlan: {
          status: 'Error occurred',
          message: error.message
        }
      },
      { status: 500 }
    );
  }
}

// Helper function to extract travel info from user message
function extractTravelFromMessage(message: string): any {
  const lowerMessage = message.toLowerCase();
  
  // Extract destination
  const cities = ['london', 'new york', 'san francisco', 'tokyo', 'singapore', 'berlin', 'paris', 'sydney'];
  const foundCity = cities.find(city => lowerMessage.includes(city));
  
  // Extract time references
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

// Helper function to generate intelligent response using Claude
async function generateComprehensiveResponse(message: string, travelPlan: any): Promise<string> {
  try {
    const { Anthropic } = await import('@anthropic-ai/sdk');
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY!,
    });

    const { calendar, flights, colleagues, linkedIn } = travelPlan;
    
    // Create rich context for Claude with timezone intelligence
    const contextPrompt = `You are an AI travel assistant with intelligent reasoning capabilities. Here's what you found:

    USER MESSAGE: "${message}"

    CALENDAR ANALYSIS:
    - Status: ${calendar.status}
    - Events found: ${calendar.events.length}
    - Destination: ${calendar.destination || 'Not specified'}
    - Purpose: ${calendar.purpose || 'Not specified'}
    ${calendar.events.length > 0 ? `- Key Event: "${calendar.events[0].summary}" from ${calendar.startDate} to ${calendar.endDate}` : ''}

    TIMEZONE INTELLIGENCE:
    ${calendar.timezoneAnalysis ? `- Conflicts detected: ${calendar.timezoneAnalysis.conflictCount}
    - High priority issues: ${calendar.timezoneAnalysis.highSeverityCount}
    - Smart recommendations: ${calendar.timezoneAnalysis.recommendations.join('; ')}
    ${calendar.timezoneAnalysis.conflicts.length > 0 ? 
    `- Top conflict: "${calendar.timezoneAnalysis.conflicts[0].event.summary}" - ${calendar.timezoneAnalysis.conflicts[0].reason}` : 
    '- No timezone conflicts detected'}` : '- Timezone analysis not available'}

    FLIGHT SEARCH:
    - Status: ${flights.status}
    ${flights.status === 'success' ? `- Found ${flights.totalOptions} flight options
    - Best option: ${flights.offers[0].airline} for $${flights.offers[0].price.total}
    - Route: ${flights.offers[0].departure.airport} → ${flights.offers[0].arrival.airport}
    - Departure: ${flights.offers[0].departure.time}` : '- No flights found'}

    COLLEAGUES IN DESTINATION:
    - Found ${colleagues.count} company colleagues
    ${colleagues.list.slice(0, 3).map(c => `- ${c.name} (${c.role})`).join('\n')}

    LINKEDIN CONNECTIONS:
    - Found ${linkedIn.count} LinkedIn connections in the area
    ${linkedIn.list.slice(0, 3).map(c => `- ${c.name} (${c.role} at ${c.company})`).join('\n')}

    Provide a helpful, intelligent response that:
    1. Acknowledges timezone conflicts and provides specific recommendations if any exist
    2. Highlights the best flight options with specific details
    3. Suggests optimal meeting times considering timezone differences
    4. Recommends which colleagues/connections to prioritize
    5. Shows intelligent reasoning beyond just listing information
    6. Keep it conversational and under 200 words

    Be specific about timezone recommendations and show intelligent problem-solving capabilities.`;

    console.log('🤖 Calling Claude API...');
    
    const response = await anthropic.messages.create({
      model: "claude-3-haiku-20240307",
      max_tokens: 400,
      messages: [{
        role: "user",
        content: contextPrompt
      }]
    });

    // Properly extract the text from Claude's response
    let claudeResponse = '';
    if (response.content && response.content.length > 0) {
      const firstContent = response.content[0];
      if (firstContent.type === 'text') {
        claudeResponse = firstContent.text;
      }
    }
    
    console.log('🤖 Claude AI response generated');
    
    // Return the text response, or fallback if empty
    return claudeResponse || generateEnhancedFallbackResponse(message, travelPlan);
    
  } catch (error) {
    console.error('❌ Claude API error:', error);
    
    // Fallback to enhanced template response if Claude API fails
    return generateEnhancedFallbackResponse(message, travelPlan);
  }
}

// Enhanced fallback response (in case Claude API fails)
function generateEnhancedFallbackResponse(message: string, travelPlan: any): string {
  const { calendar, flights, colleagues, linkedIn } = travelPlan;
  
  let response = '';
  
  // Calendar section with auth status awareness and timezone intelligence
  if (calendar.events.length > 0) {
    const event = calendar.events[0];
    response += `Perfect! I found your "${event.summary}" in your calendar for ${calendar.destination}. `;
    
    // Add timezone intelligence
    if (calendar.timezoneAnalysis && calendar.timezoneAnalysis.conflictCount > 0) {
      response += `I detected ${calendar.timezoneAnalysis.conflictCount} timezone conflicts that need attention. `;
      if (calendar.timezoneAnalysis.highSeverityCount > 0) {
        response += `${calendar.timezoneAnalysis.highSeverityCount} are high priority. `;
      }
    } else if (calendar.timezoneAnalysis) {
      response += `Good news - no timezone conflicts detected! `;
    }
  } else if (calendar.status.includes('Not authenticated')) {
    response += `I'd love to check your calendar for travel events! Please connect your Google Calendar, then I can find your specific trips and analyze timezone conflicts. For now, I understand you're planning to travel to ${calendar.destination}. `;
  } else if (calendar.status.includes('auth error')) {
    response += `I had trouble accessing your calendar (authentication issue), but based on your message, I understand you're planning to travel to ${calendar.destination}. `;
  } else {
    response += `I checked your calendar but didn't find specific travel events. Based on your message, I understand you're planning to travel to ${calendar.destination}. `;
  }
  
  // Flight section with specific details
  if (flights.status === 'success' && flights.offers.length > 0) {
    const bestFlight = flights.offers[0];
    response += `I found ${flights.totalOptions} flight options! The best value is ${bestFlight.airline} departing ${bestFlight.departure.airport} at ${new Date(bestFlight.departure.time).toLocaleTimeString()} for $${bestFlight.price.total}. `;
  }
  
  // Colleagues section
  if (colleagues.count > 0) {
    response += `I found ${colleagues.count} colleagues in ${calendar.destination}: ${colleagues.list.slice(0, 2).map(c => c.name).join(' and ')}. `;
  }
  
  // LinkedIn section
  if (linkedIn.count > 0) {
    response += `Plus ${linkedIn.count} LinkedIn connections who you might want to meet with. `;
  }
  
  response += `I can help you book flights and schedule meetings - what would you like to do next?`;
  
  return response;
}