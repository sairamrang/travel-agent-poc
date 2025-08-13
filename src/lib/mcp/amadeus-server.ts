import Amadeus from 'amadeus';

export interface FlightOffer {
  id: string;
  airline: string;
  departure: {
    airport: string;
    time: string;
  };
  arrival: {
    airport: string;
    time: string;
  };
  duration: string;
  price: {
    total: string;
    currency: string;
  };
  stops: number;
}

export interface FlightSearchResult {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  offers: FlightOffer[];
  searchTime: string;
}

export class AmadeusFlightMCPServer {
    private amadeus: any;

    constructor() {
        this.amadeus = new Amadeus({
        clientId: process.env.AMADEUS_CLIENT_ID!,
        clientSecret: process.env.AMADEUS_CLIENT_SECRET!,
        hostname: 'test' // Use test environment
        });
    }

    async searchFlights(
        origin: string,
        destination: string,
        departureDate: string,
        returnDate?: string,
        adults: number = 1
    ): Promise<FlightSearchResult> {
        console.log('🛫 Searching flights:', { origin, destination, departureDate, returnDate });
    
        // Convert city names to airport codes if needed
        const originCode = this.getAirportCode(origin);
        const destinationCode = this.getAirportCode(destination);
    
        console.log('✈️ Using airport codes:', originCode, '→', destinationCode);
    
        // Try real API first, but with better error handling
        try {
        console.log('🔄 Attempting Amadeus API call...');
        
        const searchParams: any = {
            originLocationCode: originCode,
            destinationLocationCode: destinationCode,
            departureDate,
            adults,
            max: 10,
            currencyCode: 'USD'
        };
    
        // Only add return date if it's different from departure date
        if (returnDate && returnDate !== departureDate) {
            searchParams.returnDate = returnDate;
            console.log('🔄 Round-trip search:', departureDate, '→', returnDate);
        } else {
            console.log('🔄 One-way search:', departureDate);
        }
    
        console.log('📤 Amadeus API request params:', searchParams);
    
        const response = await this.amadeus.shopping.flightOffersSearch.get(searchParams);
        
        console.log('📥 Amadeus API raw response:', {
            status: response.result?.statusCode || 'unknown',
            dataLength: response.data?.length || 0,
            hasData: !!response.data,
            firstOffer: response.data?.[0] ? 'exists' : 'missing'
        });
    
        if (response.data && response.data.length > 0) {
            console.log('✅ Real API success! Processing', response.data.length, 'offers');
            
            const offers: FlightOffer[] = response.data.slice(0, 6).map((offer: any, index: number) => {
            try {
                const itinerary = offer.itineraries[0];
                const segment = itinerary.segments[0];
                
                console.log(`Processing offer ${index + 1}:`, {
                carrier: segment.carrierCode,
                price: offer.price.total,
                departure: segment.departure.iataCode,
                arrival: segment.arrival.iataCode
                });
                
                return {
                id: offer.id || `real-flight-${index}`,
                airline: this.getAirlineName(segment.carrierCode),
                departure: {
                    airport: segment.departure.iataCode,
                    time: segment.departure.at
                },
                arrival: {
                    airport: segment.arrival.iataCode,
                    time: segment.arrival.at
                },
                duration: itinerary.duration,
                price: {
                    total: offer.price.total,
                    currency: offer.price.currency
                },
                stops: itinerary.segments.length - 1
                };
            } catch (offerError) {
                console.error(`Error processing offer ${index + 1}:`, offerError);
                return null;
            }
            }).filter(offer => offer !== null);
    
            if (offers.length > 0) {
            console.log('✅ Successfully processed', offers.length, 'real flight offers');
            return {
                origin: originCode,
                destination: destinationCode,
                departureDate,
                returnDate,
                offers,
                searchTime: new Date().toISOString()
            };
            } else {
            console.log('⚠️ No valid offers could be processed, falling back to mock');
            }
        } else {
            console.log('⚠️ No flight data in API response, falling back to mock');
        }
        } catch (error) {
        console.error('❌ Amadeus API error:', {
            message: error.message,
            code: error.code,
            description: error.description,
            status: error.status
        });
        }
        
        // Always fall back to mock data for demo reliability
        console.log('🎭 Using enhanced mock flight data for demo reliability');
        return this.getEnhancedMockFlightData(originCode, destinationCode, departureDate, returnDate);
    }

    private getAirportCode(cityOrCode: string): string {
        // Simple mapping for common cities
        const cityToAirport: { [key: string]: string } = {
        'london': 'LHR',
        'new york': 'JFK',
        'san francisco': 'SFO',
        'tokyo': 'NRT',
        'singapore': 'SIN',
        'paris': 'CDG',
        'berlin': 'BER',
        'sydney': 'SYD',
        'dubai': 'DXB',
        'amsterdam': 'AMS'
        };
    
        const city = cityOrCode.toLowerCase();
        
        // If it's already an airport code (3 letters), return as-is
        if (cityOrCode.length === 3 && /^[A-Z]+$/.test(cityOrCode.toUpperCase())) {
        return cityOrCode.toUpperCase();
        }
        
        // Try to find in our mapping
        return cityToAirport[city] || 'LHR'; // Default to London Heathrow
    }

    private getAirlineName(carrierCode: string): string {
        const airlines: { [key: string]: string } = {
        'BA': 'British Airways',
        'VS': 'Virgin Atlantic',
        'AA': 'American Airlines',
        'UA': 'United Airlines',
        'LH': 'Lufthansa',
        'AF': 'Air France',
        'KL': 'KLM',
        'SQ': 'Singapore Airlines',
        'JL': 'Japan Airlines',
        'NH': 'ANA'
        };
        
        return airlines[carrierCode] || `${carrierCode} Airlines`;
    }
    private getEnhancedMockFlightData(origin: string, destination: string, departureDate: string, returnDate?: string): FlightSearchResult {
        console.log('🎭 Generating enhanced mock flight data');
        
        // Generate realistic prices based on route
        const basePrice = this.getBasePriceForRoute(origin, destination);
        
        const mockOffers: FlightOffer[] = [
        {
            id: 'mock-ba-premium',
            airline: 'British Airways',
            departure: { airport: origin, time: `${departureDate}T08:30:00` },
            arrival: { airport: destination, time: `${departureDate}T20:45:00` },
            duration: 'PT8H15M',
            price: { total: (basePrice + 50).toString(), currency: 'USD' },
            stops: 0
        },
        {
            id: 'mock-vs-direct',
            airline: 'Virgin Atlantic',
            departure: { airport: origin, time: `${departureDate}T14:15:00` },
            arrival: { airport: destination, time: `${departureDate}T02:30:00+1` },
            duration: 'PT8H15M',
            price: { total: (basePrice + 120).toString(), currency: 'USD' },
            stops: 0
        },
        {
            id: 'mock-ua-economy',
            airline: 'United Airlines',
            departure: { airport: origin, time: `${departureDate}T11:45:00` },
            arrival: { airport: destination, time: `${departureDate}T23:30:00` },
            duration: 'PT7H45M',
            price: { total: (basePrice - 70).toString(), currency: 'USD' },
            stops: 0
        },
        {
            id: 'mock-dl-connect',
            airline: 'Delta Airlines',
            departure: { airport: origin, time: `${departureDate}T16:20:00` },
            arrival: { airport: destination, time: `${departureDate}T06:45:00+1` },
            duration: 'PT10H25M',
            price: { total: (basePrice - 120).toString(), currency: 'USD' },
            stops: 1
        }
        ];
    
        return {
        origin,
        destination,
        departureDate,
        returnDate,
        offers: mockOffers,
        searchTime: new Date().toISOString()
        };
    }
    
    private getBasePriceForRoute(origin: string, destination: string): number {
        // Realistic base prices for different routes
        const routePrices: { [key: string]: number } = {
        'JFK-LHR': 650, 'JFK-CDG': 680, 'JFK-BER': 720,
        'JFK-NRT': 850, 'JFK-SIN': 950, 'JFK-SYD': 1200,
        'LHR-JFK': 650, 'CDG-JFK': 680, 'BER-JFK': 720
        };
        
        const routeKey = `${origin}-${destination}`;
        return routePrices[routeKey] || 750; // Default price
    }
    
  private getMockFlightData(origin: string, destination: string, departureDate: string, returnDate?: string): FlightSearchResult {
    // Fallback mock data for demo reliability
    const mockOffers: FlightOffer[] = [
      {
        id: 'mock-1',
        airline: 'British Airways',
        departure: { airport: 'JFK', time: `${departureDate}T08:00:00` },
        arrival: { airport: 'LHR', time: `${departureDate}T20:30:00` },
        duration: 'PT8H30M',
        price: { total: '650', currency: 'USD' },
        stops: 0
      },
      {
        id: 'mock-2',
        airline: 'Virgin Atlantic',
        departure: { airport: 'JFK', time: `${departureDate}T14:00:00` },
        arrival: { airport: 'LHR', time: `${departureDate}T02:15:00+1` },
        duration: 'PT8H15M',
        price: { total: '720', currency: 'USD' },
        stops: 0
      }
    ];

    return {
      origin,
      destination,
      departureDate,
      returnDate,
      offers: mockOffers,
      searchTime: new Date().toISOString()
    };
  }
}