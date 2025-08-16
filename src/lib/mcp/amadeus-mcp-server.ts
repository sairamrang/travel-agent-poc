// src/lib/mcp/amadeus-mcp-server.ts - Fixed import
const Amadeus = require('amadeus'); // Use require instead of import

export class AmadeusMCPServer {
  private amadeus: any;

  constructor() {
    this.amadeus = new Amadeus({
      clientId: process.env.AMADEUS_CLIENT_ID!,
      clientSecret: process.env.AMADEUS_CLIENT_SECRET!,
      hostname: process.env.AMADEUS_HOSTNAME || 'test'
    });
  }

  async searchFlights(params: {
    origin: string;
    destination: string;
    departureDate: string;
    returnDate?: string;
    adults?: number;
  }) {
    try {
      console.log('🛫 MCP Amadeus flight search:', params);

      const searchParams = {
        originLocationCode: this.getAirportCode(params.origin),
        destinationLocationCode: this.getAirportCode(params.destination),
        departureDate: params.departureDate,
        adults: params.adults || 1,
        nonStop: 'false',
        max: 10
      };

      if (params.returnDate) {
        searchParams.returnDate = params.returnDate;
      }

      const response = await this.amadeus.shopping.flightOffersSearch.get(searchParams);
      
      return {
        tool: 'search_flights',
        status: 'success',
        flights: this.formatFlightResults(response.data),
        origin: params.origin,
        destination: params.destination,
        searchParams: params
      };

    } catch (error) {
      console.error('❌ Amadeus MCP flight search failed:', error);
      return {
        tool: 'search_flights',
        status: 'error',
        error: error.message,
        searchParams: params
      };
    }
  }

  private formatFlightResults(flightOffers: any[]) {
    if (!flightOffers || flightOffers.length === 0) {
      return [];
    }

    return flightOffers.slice(0, 5).map(offer => {
      try {
        const firstSegment = offer.itineraries[0].segments[0];
        const lastSegment = offer.itineraries[0].segments[offer.itineraries[0].segments.length - 1];
        
        return {
          id: offer.id,
          airline: this.getAirlineName(firstSegment.carrierCode),
          price: {
            total: parseFloat(offer.price.total),
            currency: offer.price.currency
          },
          departure: {
            airport: firstSegment.departure.iataCode,
            time: firstSegment.departure.at,
            terminal: firstSegment.departure.terminal || 'N/A'
          },
          arrival: {
            airport: lastSegment.arrival.iataCode,
            time: lastSegment.arrival.at,
            terminal: lastSegment.arrival.terminal || 'N/A'
          },
          duration: offer.itineraries[0].duration,
          segments: offer.itineraries[0].segments.length,
          bookingClass: offer.travelerPricings?.[0]?.fareDetailsBySegment?.[0]?.cabin || 'Economy'
        };
      } catch (error) {
        console.error('❌ Error formatting flight offer:', error);
        return null;
      }
    }).filter(Boolean); // Remove any null entries
  }

  private getAirportCode(location: string): string {
    const cityToAirport: { [key: string]: string } = {
      'new york': 'JFK',
      'london': 'LHR',
      'paris': 'CDG',
      'tokyo': 'NRT',
      'singapore': 'SIN',
      'dubai': 'DXB',
      'sydney': 'SYD',
      'los angeles': 'LAX',
      'san francisco': 'SFO',
      'miami': 'MIA',
      'nyc': 'JFK',
      'la': 'LAX',
      'sf': 'SFO'
    };
    
    const normalized = location.toLowerCase().trim();
    return cityToAirport[normalized] || location.toUpperCase();
  }

  private getAirlineName(code: string): string {
    const airlines: { [key: string]: string } = {
      'AA': 'American Airlines',
      'BA': 'British Airways',
      'LH': 'Lufthansa',
      'AF': 'Air France',
      'KL': 'KLM',
      'UA': 'United Airlines',
      'DL': 'Delta Air Lines',
      'VS': 'Virgin Atlantic',
      'EK': 'Emirates',
      'QR': 'Qatar Airways',
      'IB': 'Iberia',
      'LX': 'Swiss International',
      'OS': 'Austrian Airlines',
      'SN': 'Brussels Airlines'
    };
    
    return airlines[code] || `${code} Airlines`;
  }
}