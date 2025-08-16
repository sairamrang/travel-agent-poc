import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import { GoogleCalendarMCPServer } from '@/lib/mcp/google-calendar-server';
import { MockCompanyMCPServer, MockLinkedInMCPServer } from '@/lib/mcp/mock-servers';
import { TimezoneReasoningEngine } from '@/lib/reasoning/timezone-engine';
import { RecommendationEngine } from '@/lib/reasoning/recommendation-engine';
import { MCPCoordinator } from '@/lib/mcp/mcp-coordinator'; // NEW MCP IMPORT

export async function POST(request: NextRequest) {
  try {
    const { message } = await request.json();
    
    console.log('🚀 Starting MCP-enabled travel planning for:', message);
    
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
        
        // Use extracted dates if available, otherwise use default 15-day range
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
        // Don't throw here, continue with extraction
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
    
    // Step 5: Call Claude with MCP Tools instead of direct API calls
    const mcpEnabledResponse = await callClaudeWithMCPTools({
      message,
      travelContext,
      timezoneAnalysis,
      calendarStatus,
      userEmail: session?.user?.email,
      mcpCoordinator,
      companyMCP,
      linkedInMCP
    });

    console.log('✅ MCP-enabled travel plan generated');

    // Simulate AI processing time
    await new Promise(resolve => setTimeout(resolve, 1500));

    return NextResponse.json({
      response: mcpEnabledResponse.content,
      travelPlan: mcpEnabledResponse.data
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

// NEW: MCP-enabled Claude integration
// Replace the callClaudeWithMCPTools function in your agent route

async function callClaudeWithMCPTools(context: any) {
  const { message, travelContext, timezoneAnalysis, calendarStatus, userEmail, mcpCoordinator, companyMCP, linkedInMCP } = context;
  
  const mcpTools = mcpCoordinator.getAvailableTools();

  // Simplified, more direct prompt that encourages tool use
  const systemPrompt = `You are a travel assistant with access to these tools:
1. search_flights - Search for flights between cities
2. search_hotels - Find hotels in destination cities  
3. search_restaurants - Find restaurants for business dining

TRAVEL REQUEST: User wants to travel to ${travelContext.destination} from ${travelContext.startDate} to ${travelContext.endDate}

IMPORTANT: Always use the available tools when the user asks for flights, hotels, or restaurants. Don't just describe what you would do - actually use the tools.

For this request, you should:
1. Use search_flights to find flights to ${travelContext.destination}
2. Use search_hotels to find accommodation  
3. Use search_restaurants to find dining options

Use the tools now to help with this travel request.`;

  try {
    console.log('🤖 Calling Claude with MCP tools...');
    
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'tools-2024-04-04'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 4000,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: `${message}\n\nPlease use your available tools to search for flights, hotels, and restaurants for my trip to ${travelContext.destination}.`
          }
        ],
        tools: mcpTools,
        tool_choice: { type: "auto" }
      })
    });

    if (!response.ok) {
      throw new Error(`Claude API error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    console.log('🤖 Claude response received:', result);
    
    // Execute MCP tool calls
    let toolsUsed = [];
    let toolResults = {};
    
    if (result.content) {
      for (const content of result.content) {
        if (content.type === 'tool_use') {
          console.log(`🔧 Executing MCP tool: ${content.name} with params:`, content.input);
          try {
            const toolResult = await mcpCoordinator.executeToolCall(content.name, content.input);
            console.log(`✅ Tool ${content.name} result:`, toolResult);
            toolsUsed.push({
              name: content.name,
              input: content.input,
              result: toolResult
            });
            toolResults[content.name] = toolResult;
          } catch (toolError) {
            console.error(`❌ Tool ${content.name} failed:`, toolError);
            toolResults[content.name] = {
              status: 'error',
              error: toolError.message
            };
          }
        }
      }
    } else {
      console.log('⚠️ No content in Claude response, forcing tool calls...');
      
      // Force tool calls if Claude didn't use them
      if (travelContext.destination && travelContext.startDate) {
        console.log('🔧 Forcing flight search...');
        try {
          const flightResult = await mcpCoordinator.executeToolCall('search_flights', {
            origin: 'NYC',
            destination: travelContext.destination,
            departureDate: travelContext.startDate.split('T')[0],
            returnDate: travelContext.endDate ? travelContext.endDate.split('T')[0] : undefined
          });
          toolResults.search_flights = flightResult;
          console.log('✅ Forced flight search result:', flightResult);
        } catch (error) {
          console.error('❌ Forced flight search failed:', error);
          toolResults.search_flights = { status: 'error', error: error.message };
        }

        console.log('🔧 Forcing hotel search...');
        try {
          const hotelResult = await mcpCoordinator.executeToolCall('search_hotels', {
            destination: travelContext.destination,
            checkIn: travelContext.startDate.split('T')[0],
            checkOut: travelContext.endDate ? travelContext.endDate.split('T')[0] : undefined
          });
          toolResults.search_hotels = hotelResult;
          console.log('✅ Forced hotel search result:', hotelResult);
        } catch (error) {
          console.error('❌ Forced hotel search failed:', error);
          toolResults.search_hotels = { status: 'error', error: error.message };
        }

        console.log('🔧 Forcing restaurant search...');
        try {
          const restaurantResult = await mcpCoordinator.executeToolCall('search_restaurants', {
            destination: travelContext.destination
          });
          toolResults.search_restaurants = restaurantResult;
          console.log('✅ Forced restaurant search result:', restaurantResult);
        } catch (error) {
          console.error('❌ Forced restaurant search failed:', error);
          toolResults.search_restaurants = { status: 'error', error: error.message };
        }
      }
    }

    // Get colleagues and LinkedIn connections (keep existing logic)
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

    // Generate final response with tool results
    let finalResponseText = '';
    
    if (toolsUsed.length > 0 || Object.keys(toolResults).length > 0) {
      const toolSummary = Object.entries(toolResults).map(([toolName, result]) => {
        if (result.status === 'success') {
          switch (toolName) {
            case 'search_flights':
              return `✈️ Found ${result.flights?.length || 0} flight options`;
            case 'search_hotels':
              return `🏨 Found ${result.hotels?.length || 0} hotel options`;
            case 'search_restaurants':
              return `🍽️ Found ${result.restaurants?.length || 0} restaurant options`;
            default:
              return `${toolName}: Success`;
          }
        } else {
          return `${toolName}: ${result.error || 'Failed'}`;
        }
      }).join('\n');

      finalResponseText = `Great! I found travel options for your trip to ${travelContext.destination}:\n\n${toolSummary}\n\nI've searched for flights, hotels, and restaurants using the MCP tools. Check the detailed results below!`;
    } else {
      finalResponseText = extractTextContent(result) || `I understand you want to travel to ${travelContext.destination}. I'm working on finding the best options for you!`;
    }

    return {
      content: finalResponseText,
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
        flights: toolResults.search_flights || { status: 'not_searched', message: 'No flight search performed via MCP' },
        hotels: toolResults.search_hotels || { status: 'not_searched', message: 'No hotel search performed via MCP' },
        restaurants: toolResults.search_restaurants || { status: 'not_searched', message: 'No restaurant search performed via MCP' },
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
        searchTime: new Date().toISOString(),
        authenticationStatus: context.userEmail ? 'authenticated' : 'not_authenticated',
        intelligenceLevel: 'mcp_enabled',
        mcpArchitecture: true,
        toolsExecuted: Object.keys(toolResults)
      }
    };

  } catch (error) {
    console.error('❌ Claude MCP call failed:', error);
    
    // Fallback: Force tool execution even if Claude fails
    const fallbackResults = {};
    
    if (travelContext.destination && travelContext.startDate) {
      console.log('🔄 Fallback: Executing tools directly...');
      
      try {
        fallbackResults.search_flights = await mcpCoordinator.executeToolCall('search_flights', {
          origin: 'NYC',
          destination: travelContext.destination,
          departureDate: travelContext.startDate.split('T')[0],
          returnDate: travelContext.endDate ? travelContext.endDate.split('T')[0] : undefined
        });
      } catch (e) {
        fallbackResults.search_flights = { status: 'error', error: e.message };
      }

      try {
        fallbackResults.search_hotels = await mcpCoordinator.executeToolCall('search_hotels', {
          destination: travelContext.destination,
          checkIn: travelContext.startDate.split('T')[0],
          checkOut: travelContext.endDate ? travelContext.endDate.split('T')[0] : undefined
        });
      } catch (e) {
        fallbackResults.search_hotels = { status: 'error', error: e.message };
      }

      try {
        fallbackResults.search_restaurants = await mcpCoordinator.executeToolCall('search_restaurants', {
          destination: travelContext.destination
        });
      } catch (e) {
        fallbackResults.search_restaurants = { status: 'error', error: e.message };
      }
    }
    
    return {
      content: `I found travel options for your trip to ${travelContext.destination} using MCP tools (fallback mode due to Claude API issue).`,
      data: {
        calendar: { status: calendarStatus, events: travelContext.events || [], timezoneAnalysis },
        flights: fallbackResults.search_flights || { status: 'error', error: 'MCP integration failed' },
        hotels: fallbackResults.search_hotels || { status: 'error', error: 'MCP integration failed' },
        restaurants: fallbackResults.search_restaurants || { status: 'error', error: 'MCP integration failed' },
        intelligenceLevel: 'fallback_mode',
        toolsExecuted: Object.keys(fallbackResults)
      }
    };
  }
}

// Helper function for Claude's final response
async function getClaudeFinalResponse(systemPrompt: string, originalMessage: string, toolResults: any[], additionalData: any) {
  const toolSummary = toolResults.map(tool => 
    `${tool.name}: ${JSON.stringify(tool.result, null, 2)}`
  ).join('\n\n');

  const additionalInfo = `
COLLEAGUES: ${additionalData.colleagues?.length || 0} found
LINKEDIN CONNECTIONS: ${additionalData.connections?.length || 0} found
TIMEZONE ANALYSIS: ${additionalData.timezoneAnalysis?.conflictCount || 0} conflicts detected
`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4000,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: `${originalMessage}\n\nMCP Tool Results:\n${toolSummary}\n\nAdditional Data:\n${additionalInfo}\n\nPlease provide a comprehensive travel recommendation based on this data, addressing timezone conflicts and highlighting the best options.`
        }
      ]
    })
  });

  return await response.json();
}

// Helper function to extract text from Claude response
function extractTextContent(claudeResponse: any): string {
  if (claudeResponse.content) {
    return claudeResponse.content
      .filter((c: any) => c.type === 'text')
      .map((c: any) => c.text)
      .join('\n');
  }
  return claudeResponse.message || 'No response generated';
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

// Enhanced fallback response (in case Claude API fails)
function generateEnhancedFallbackResponse(message: string, travelPlan: any): string {
  const { calendar, flights, colleagues, linkedIn } = travelPlan;
  
  let response = '';
  
  // Calendar section with auth status awareness and timezone intelligence
  if (calendar.events && calendar.events.length > 0) {
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
  } else if (calendar.status && calendar.status.includes('Not authenticated')) {
    response += `I'd love to check your calendar for travel events! Please connect your Google Calendar, then I can find your specific trips and analyze timezone conflicts. For now, I understand you're planning to travel to ${calendar.destination}. `;
  } else if (calendar.status && calendar.status.includes('auth error')) {
    response += `I had trouble accessing your calendar (authentication issue), but based on your message, I understand you're planning to travel to ${calendar.destination}. `;
  } else {
    response += `I checked your calendar but didn't find specific travel events. Based on your message, I understand you're planning to travel to ${calendar.destination}. `;
  }
  
  // Flight section with MCP status
  if (flights.status === 'success' && flights.flights && flights.flights.length > 0) {
    const bestFlight = flights.flights[0];
    response += `I found ${flights.flights.length} flight options via MCP! The best value is ${bestFlight.airline} for $${bestFlight.price.total}. `;
  } else if (flights.status === 'not_searched') {
    response += `I'm ready to search for flights using the new MCP architecture. `;
  } else {
    response += `Flight search via MCP encountered an issue, but I can help you find alternatives. `;
  }
  
  // Colleagues section
  if (colleagues && colleagues.count > 0) {
    response += `I found ${colleagues.count} colleagues in your destination. `;
  }
  
  // LinkedIn section
  if (linkedIn && linkedIn.count > 0) {
    response += `Plus ${linkedIn.count} LinkedIn connections who you might want to meet with. `;
  }
  
  response += `I can help you book flights and schedule meetings using the new MCP tools - what would you like to do next?`;
  
  return response;
}