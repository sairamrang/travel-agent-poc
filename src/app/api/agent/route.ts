import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import { GoogleCalendarMCPServer } from '@/lib/mcp/google-calendar-server';
import { AmadeusFlightMCPServer } from '@/lib/mcp/amadeus-server';
import { MockCompanyMCPServer, MockLinkedInMCPServer } from '@/lib/mcp/mock-servers';

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
    console.log('📅 Session found:', !!session, 'Access token:', !!session?.accessToken);
    
    let travelContext = null;
    let calendarStatus = "Not connected";
    
    // Step 1: Get real calendar data if user is authenticated
    if (session?.accessToken) {
      try {
        console.log('🔗 Attempting to connect to Google Calendar...');
        const calendarMCP = new GoogleCalendarMCPServer(session.accessToken as string);
        travelContext = await calendarMCP.extractTravelEvents();
        console.log('📋 Calendar data retrieved:', {
          destination: travelContext.destination,
          eventCount: travelContext.events.length,
          startDate: travelContext.startDate
        });
        calendarStatus = `Connected - Found ${travelContext.events.length} travel events`;
      } catch (error) {
        console.error('❌ Calendar MCP error:', error);
        calendarStatus = `Connected but error: ${error.message}`;
      }
    }
    
    // Step 2: If no real calendar data, extract from message
    if (!travelContext || travelContext.events.length === 0) {
      console.log('📝 Extracting travel details from message');
      travelContext = extractTravelFromMessage(message);
      if (session?.accessToken) {
        calendarStatus = "Connected - No travel events found, extracted from message";
      } else {
        calendarStatus = "Demo mode - Extracted from message";
      }
    }
    
    // Step 3: Search for flights (parallel with other searches)
    const searchPromises = [];
    
    if (travelContext.destination && travelContext.startDate) {
      console.log('✈️ Searching flights for:', travelContext.destination);
      
      // Determine origin airport (you could make this dynamic based on user location)
        // Determine origin airport (you could make this dynamic based on user location)
        const origin = 'JFK'; // Default to New York, could be made configurable

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
    
    // Step 6: Compile comprehensive travel plan
    const completeTravelPlan = {
      // Calendar information
      calendar: {
        status: calendarStatus,
        events: travelContext.events,
        destination: travelContext.destination,
        purpose: travelContext.purpose,
        startDate: travelContext.startDate,
        endDate: travelContext.endDate
      },
      
      // Flight information
      flights: flightResult.flights ? {
        status: 'success',
        origin: flightResult.flights.origin,
        destination: flightResult.flights.destination,
        departureDate: flightResult.flights.departureDate,
        returnDate: flightResult.flights.returnDate,
        offers: flightResult.flights.offers.slice(0, 3), // Top 3 options
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
      searchDuration: '2.3 seconds' // Could make this real
    };
    
    // Step 7: Generate intelligent response
    const response = await generateComprehensiveResponse(message, completeTravelPlan);
    
    console.log('✅ Comprehensive travel plan generated:', {
      calendarEvents: completeTravelPlan.calendar.events.length,
      flightOptions: completeTravelPlan.flights.status === 'success' ? completeTravelPlan.flights.totalOptions : 0,
      colleagues: completeTravelPlan.colleagues.count,
      linkedInConnections: completeTravelPlan.linkedIn.count
    });
    
    // Simulate AI processing time
    await new Promise(resolve => setTimeout(resolve, 2000));
    
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

// Helper function to generate comprehensive response
// Helper function to generate intelligent response using Claude
    async function generateComprehensiveResponse(message: string, travelPlan: any): Promise<string> {
        try {
        const { Anthropic } = await import('@anthropic-ai/sdk');
        const anthropic = new Anthropic({
            apiKey: process.env.ANTHROPIC_API_KEY!,
        });
    
        const { calendar, flights, colleagues, linkedIn } = travelPlan;
        
        // Create rich context for Claude
        const contextPrompt = `You are an AI travel assistant helping with trip planning. Here's what you found:
    
    USER MESSAGE: "${message}"
    
    CALENDAR ANALYSIS:
    - Status: ${calendar.status}
    - Events found: ${calendar.events.length}
    - Destination: ${calendar.destination || 'Not specified'}
    - Purpose: ${calendar.purpose || 'Not specified'}
    ${calendar.events.length > 0 ? `- Key Event: "${calendar.events[0].summary}" from ${calendar.startDate} to ${calendar.endDate}` : ''}
    
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
    
    Provide a helpful, professional response that:
    1. Acknowledges what you found in their calendar
    2. Highlights the best flight options with specific details
    3. Suggests meeting with relevant colleagues/connections
    4. Offers to help with next steps (booking flights, scheduling meetings)
    5. Keep it conversational and under 150 words
    
    Be specific about names, prices, and times when you have that data.`;
    
        console.log('🤖 Calling Claude API...');
        
        const response = await anthropic.messages.create({
            model: "claude-3-haiku-20240307",
            max_tokens: 300,
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
        
        console.log('🤖 Claude AI response:', claudeResponse);
        
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
    
    // Calendar section
    if (calendar.events.length > 0) {
      const event = calendar.events[0];
      response += `Perfect! I found your "${event.summary}" in your calendar for ${calendar.destination}. `;
    } else {
      response += `I understand you're planning to travel to ${calendar.destination}. `;
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