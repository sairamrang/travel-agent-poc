// src/lib/mcp/mcp-coordinator.ts - Cleaned and extended with Instagram + Weather
import { AmadeusMCPServer } from './amadeus-mcp-server';
import { HotelMCPServer } from './hotel-mcp-server';
import { RestaurantMCPServer } from './restaurant-mcp-server';
import { InstagramMCPServer } from './instagram-mcp-server';
import { WeatherMCPServer } from './weather-mcp-server';

export class MCPCoordinator {
  private amadeusMCP: AmadeusMCPServer;
  private hotelMCP: HotelMCPServer;
  private restaurantMCP: RestaurantMCPServer;
  private instagramMCP: InstagramMCPServer;
  private weatherMCP: WeatherMCPServer;

  constructor() {
    this.amadeusMCP = new AmadeusMCPServer();
    this.hotelMCP = new HotelMCPServer();
    this.restaurantMCP = new RestaurantMCPServer();
    this.instagramMCP = new InstagramMCPServer();
    this.weatherMCP = new WeatherMCPServer();
  }

  async executeToolCall(toolName: string, params: any) {
    switch (toolName) {
      case 'search_flights':
        return await this.amadeusMCP.searchFlights(params);
      case 'search_hotels':
        return await this.hotelMCP.searchHotels(params);
      case 'search_restaurants':
        return await this.restaurantMCP.searchRestaurants(params);
      case 'instagram_trending_restaurants':
        return await this.instagramMCP.findTrendingRestaurants(params);
      case 'instagram_restaurant_insights':
        return await this.instagramMCP.getRestaurantSocialInsights(params.restaurantHandle);
      case 'weather_forecast':
        return await this.weatherMCP.getWeatherForecast(params);
      case 'packing_recommendations':
        return await this.weatherMCP.getPackingRecommendations(params);
      default:
        throw new Error(`Unknown MCP tool: ${toolName}`);
    }
  }

  getAvailableTools() {
    return [
      {
        name: 'search_flights',
        description: 'Search for flights using Amadeus API via MCP',
        input_schema: {
          type: 'object',
          properties: {
            origin: { type: 'string', description: 'Origin airport code or city' },
            destination: { type: 'string', description: 'Destination airport code or city' },
            departureDate: { type: 'string', description: 'Departure date (YYYY-MM-DD)' },
            returnDate: { type: 'string', description: 'Return date (YYYY-MM-DD)' },
            adults: { type: 'number', description: 'Number of adults', default: 1 }
          },
          required: ['origin', 'destination', 'departureDate']
        }
      },
      {
        name: 'search_hotels',
        description: 'Search for business hotels via MCP',
        input_schema: {
          type: 'object',
          properties: {
            destination: { type: 'string', description: 'Destination city' },
            checkIn: { type: 'string', description: 'Check-in date (YYYY-MM-DD)' },
            checkOut: { type: 'string', description: 'Check-out date (YYYY-MM-DD)' },
            guests: { type: 'number', description: 'Number of guests', default: 1 }
          },
          required: ['destination', 'checkIn', 'checkOut']
        }
      },
      {
        name: 'search_restaurants',
        description: 'Find business-appropriate restaurants via MCP',
        input_schema: {
          type: 'object',
          properties: {
            destination: { type: 'string', description: 'Destination city' },
            cuisine: { type: 'string', description: 'Preferred cuisine type' },
            atmosphere: { type: 'string', description: 'Restaurant atmosphere' },
            meetingLocation: { type: 'string', description: 'Nearby meeting location' }
          },
          required: ['destination']
        }
      },
      {
        name: 'instagram_trending_restaurants',
        description: 'Find trending restaurants on Instagram for impressive dining experiences',
        input_schema: {
          type: 'object',
          properties: {
            destination: { type: 'string', description: 'Destination city' },
            cuisine: { type: 'string', description: 'Preferred cuisine type (optional)' },
            trendingPeriod: { type: 'string', description: 'Trending timeframe', enum: ['week', 'month', 'quarter'], default: 'month' },
            minEngagement: { type: 'number', description: 'Minimum engagement rate (optional)', minimum: 0, maximum: 20 }
          },
          required: ['destination']
        }
      },
      {
        name: 'instagram_restaurant_insights',
        description: 'Get detailed social media insights for a specific restaurant',
        input_schema: {
          type: 'object',
          properties: {
            restaurantHandle: { type: 'string', description: 'Instagram handle of the restaurant (e.g., @restaurant_name)' }
          },
          required: ['restaurantHandle']
        }
      },
      {
        name: 'weather_forecast',
        description: 'Get a 7-day weather forecast and summary for the destination',
        input_schema: {
          type: 'object',
          properties: {
            destination: { type: 'string', description: 'Destination city' },
            startDate: { type: 'string', description: 'Start date (YYYY-MM-DD)' },
            endDate: { type: 'string', description: 'End date (YYYY-MM-DD)' },
            units: { type: 'string', description: 'Units (celsius|fahrenheit)', enum: ['celsius', 'fahrenheit'], default: 'celsius' }
          },
          required: ['destination', 'startDate', 'endDate']
        }
      },
      {
        name: 'packing_recommendations',
        description: 'Generate intelligent packing list based on weather and trip details',
        input_schema: {
          type: 'object',
          properties: {
            destination: { type: 'string', description: 'Destination city' },
            weatherForecast: { type: 'array', description: 'Daily weather forecast array' },
            tripPurpose: { type: 'string', description: 'Purpose of the trip', enum: ['business', 'leisure', 'mixed'], default: 'business' },
            duration: { type: 'number', description: 'Trip duration in days' }
          },
          required: ['destination', 'weatherForecast', 'tripPurpose', 'duration']
        }
      }
    ];
  }

  getInstagramTools() {
    return this.getAvailableTools().filter(tool => tool.name.startsWith('instagram_'));
  }

  async getComprehensiveSocialInsights(destination: string, cuisine?: string) {
    try {
      console.log('📱 Getting comprehensive social insights for:', destination);
      const trendingResult = await this.instagramMCP.findTrendingRestaurants({ destination, cuisine, trendingPeriod: 'month' });
      if (trendingResult.status === 'success') {
        const restaurants = Array.isArray(trendingResult.restaurants) ? trendingResult.restaurants : [];
        const topRestaurants = restaurants.slice(0, 3);
        const insightsPromises = topRestaurants.map((restaurant: any) => this.instagramMCP.getRestaurantSocialInsights(restaurant.instagramHandle));
        const insights = await Promise.all(insightsPromises);
        return {
          trending: trendingResult,
          insights: insights.filter((i: any) => i.status === 'success'),
          summary: {
            totalTrending: restaurants.length,
            avgEngagement: trendingResult.metadata?.avgEngagementRate,
            topCuisines: this.extractTopCuisines(restaurants)
          }
        };
      }
      return { error: 'Failed to get trending restaurants' };
    } catch (error: any) {
      console.error('❌ Comprehensive social insights failed:', error);
      return { error: error.message };
    }
  }

  private extractTopCuisines(restaurants: any[]): string[] {
    const cuisineCount = restaurants.reduce((acc: Record<string, number>, restaurant: any) => {
      acc[restaurant.cuisine] = (acc[restaurant.cuisine] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    return Object.entries(cuisineCount)
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .slice(0, 3)
      .map(([cuisine]) => cuisine);
  }
}