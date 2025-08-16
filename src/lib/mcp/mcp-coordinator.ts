// src/lib/mcp/mcp-coordinator.ts
import { AmadeusMCPServer } from './amadeus-mcp-server';
import { HotelMCPServer } from './hotel-mcp-server';
import { RestaurantMCPServer } from './restaurant-mcp-server';

export class MCPCoordinator {
  private amadeusMCP: AmadeusMCPServer;
  private hotelMCP: HotelMCPServer;
  private restaurantMCP: RestaurantMCPServer;

  constructor() {
    this.amadeusMCP = new AmadeusMCPServer();
    this.hotelMCP = new HotelMCPServer();
    this.restaurantMCP = new RestaurantMCPServer();
  }

  async executeToolCall(toolName: string, params: any) {
    switch (toolName) {
      case 'search_flights':
        return await this.amadeusMCP.searchFlights(params);
      case 'search_hotels':
        return await this.hotelMCP.searchHotels(params);
      case 'search_restaurants':
        return await this.restaurantMCP.searchRestaurants(params);
      default:
        throw new Error(`Unknown MCP tool: ${toolName}`);
    }
  }

  getAvailableTools() {
    return [
      {
        name: "search_flights",
        description: "Search for flights using Amadeus API via MCP",
        input_schema: {
          type: "object",
          properties: {
            origin: { type: "string", description: "Origin airport code or city" },
            destination: { type: "string", description: "Destination airport code or city" },
            departureDate: { type: "string", description: "Departure date (YYYY-MM-DD)" },
            returnDate: { type: "string", description: "Return date (YYYY-MM-DD)" },
            adults: { type: "number", description: "Number of adults", default: 1 }
          },
          required: ["origin", "destination", "departureDate"]
        }
      },
      {
        name: "search_hotels",
        description: "Search for business hotels via MCP",
        input_schema: {
          type: "object",
          properties: {
            destination: { type: "string", description: "Destination city" },
            checkIn: { type: "string", description: "Check-in date (YYYY-MM-DD)" },
            checkOut: { type: "string", description: "Check-out date (YYYY-MM-DD)" },
            guests: { type: "number", description: "Number of guests", default: 1 }
          },
          required: ["destination", "checkIn", "checkOut"]
        }
      },
      {
        name: "search_restaurants",
        description: "Find business-appropriate restaurants via MCP",
        input_schema: {
          type: "object",
          properties: {
            destination: { type: "string", description: "Destination city" },
            cuisine: { type: "string", description: "Preferred cuisine type" },
            atmosphere: { type: "string", description: "Restaurant atmosphere" },
            meetingLocation: { type: "string", description: "Nearby meeting location" }
          },
          required: ["destination"]
        }
      }
    ];
  }
}