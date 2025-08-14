export interface UserPreferences {
    hotels: {
      chains: string[];
      amenities: string[];
      priceRange: 'budget' | 'mid-range' | 'luxury';
      roomType: 'standard' | 'suite' | 'executive';
      location: 'city-center' | 'business-district' | 'airport' | 'quiet';
    };
    restaurants: {
      cuisines: string[];
      diningStyle: 'casual' | 'fine-dining' | 'quick-service';
      dietaryRestrictions: string[];
      priceRange: 'budget' | 'mid-range' | 'expensive';
      atmosphere: 'business' | 'romantic' | 'casual' | 'trendy';
    };
    meetingPreferences: {
      preferredMeetingTimes: string[];
      meetingLocations: 'hotel' | 'office' | 'restaurant' | 'cafe';
      businessEntertainment: boolean;
    };
  }
  
  export interface HotelRecommendation {
    id: string;
    name: string;
    chain?: string;
    location: {
      address: string;
      distanceToMeetings: string;
      neighborhood: string;
    };
    amenities: string[];
    priceRange: 'budget' | 'mid-range' | 'luxury';
    rating: number;
    reviewCount: number;
    businessFeatures: string[];
    reasoning: string;
    confidence: number;
    bookingUrl?: string;
  }
  
  export interface RestaurantRecommendation {
    id: string;
    name: string;
    cuisine: string;
    location: {
      address: string;
      distanceToHotel: string;
      neighborhood: string;
    };
    diningStyle: 'casual' | 'fine-dining' | 'quick-service';
    priceRange: 'budget' | 'mid-range' | 'expensive';
    rating: number;
    atmosphere: string[];
    businessFriendly: boolean;
    reasoning: string;
    confidence: number;
    reservationRequired: boolean;
    recommendedFor: 'breakfast' | 'lunch' | 'dinner' | 'business-meeting';
  }
  
  export interface TravelContext {
    destination: string;
    dates: { start: string; end: string };
    purpose: string;
    meetingLocations: string[];
    calendarEvents: any[];
    budget?: 'low' | 'medium' | 'high';
  }
  
  export class RecommendationEngine {
    private cityData: { [key: string]: any } = {
      'london': {
        businessDistricts: ['City of London', 'Canary Wharf', 'Mayfair'],
        hotelChains: ['Hilton', 'Marriott', 'InterContinental', 'Premier Inn'],
        cuisines: ['British', 'Indian', 'Italian', 'French', 'Asian'],
        businessAreas: ['Liverpool Street', 'Bank', 'London Bridge']
      },
      'new york': {
        businessDistricts: ['Midtown Manhattan', 'Financial District', 'Times Square'],
        hotelChains: ['Marriott', 'Hilton', 'Hyatt', 'W Hotels'],
        cuisines: ['American', 'Italian', 'Asian', 'Mexican', 'Steakhouse'],
        businessAreas: ['Wall Street', 'Midtown', 'SoHo']
      },
      'singapore': {
        businessDistricts: ['Central Business District', 'Marina Bay', 'Orchard Road'],
        hotelChains: ['Shangri-La', 'Marriott', 'Hilton', 'Mandarin Oriental'],
        cuisines: ['Singaporean', 'Chinese', 'Malay', 'Indian', 'International'],
        businessAreas: ['Raffles Place', 'Marina Bay', 'Orchard']
      }
    };
  
    async generateHotelRecommendations(
      context: TravelContext,
      preferences: UserPreferences
    ): Promise<HotelRecommendation[]> {
      console.log('🏨 Generating intelligent hotel recommendations for', context.destination);
      
      const cityInfo = this.cityData[context.destination.toLowerCase()] || this.cityData['london'];
      const recommendations: HotelRecommendation[] = [];
      
      // Analyze meeting locations to determine best hotel area
      const optimalLocation = this.analyzeOptimalLocation(context, cityInfo);
      
      // Generate recommendations based on context and preferences
      if (context.purpose.toLowerCase().includes('conference') || context.purpose.toLowerCase().includes('summit')) {
        // Business conference recommendations
        recommendations.push(...this.generateConferenceHotels(context, preferences, cityInfo, optimalLocation));
      } else if (context.purpose.toLowerCase().includes('meeting')) {
        // Business meeting recommendations
        recommendations.push(...this.generateBusinessHotels(context, preferences, cityInfo, optimalLocation));
      } else {
        // General business travel recommendations
        recommendations.push(...this.generateGeneralHotels(context, preferences, cityInfo, optimalLocation));
      }
      
      // Sort by confidence and return top 3
      return recommendations
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 3)
        .map((rec, index) => ({ ...rec, id: `hotel-${index + 1}` }));
    }
    
    async generateRestaurantRecommendations(
      context: TravelContext,
      preferences: UserPreferences,
      hotelLocation?: string
    ): Promise<RestaurantRecommendation[]> {
      console.log('🍽️ Generating intelligent restaurant recommendations for', context.destination);
      
      const cityInfo = this.cityData[context.destination.toLowerCase()] || this.cityData['london'];
      const recommendations: RestaurantRecommendation[] = [];
      
      // Analyze calendar events for business dining opportunities
      const businessDinnerNeeds = this.analyzeDiningNeeds(context);
      
      // Generate recommendations for each day/meal type
      recommendations.push(...this.generateBusinessDinnerOptions(context, preferences, cityInfo, businessDinnerNeeds));
      recommendations.push(...this.generateCasualDiningOptions(context, preferences, cityInfo));
      recommendations.push(...this.generateBreakfastLunchOptions(context, preferences, cityInfo));
      
      // Sort by confidence and context relevance
      return recommendations
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 4)
        .map((rec, index) => ({ ...rec, id: `restaurant-${index + 1}` }));
    }
    
    private analyzeOptimalLocation(context: TravelContext, cityInfo: any): string {
      // Analyze meeting locations to find optimal hotel location
      const meetingAreas = context.meetingLocations || [];
      const businessDistricts = cityInfo.businessDistricts || [];
      
      // Simple heuristic: if most meetings are in business district, recommend business district hotel
      if (meetingAreas.some(location => 
        businessDistricts.some(district => location.toLowerCase().includes(district.toLowerCase()))
      )) {
        return businessDistricts[0]; // Primary business district
      }
      
      return 'city-center'; // Default to city center
    }
    
    private generateConferenceHotels(
      context: TravelContext,
      preferences: UserPreferences,
      cityInfo: any,
      optimalLocation: string
    ): HotelRecommendation[] {
      return [
        {
          id: 'conf-1',
          name: `${cityInfo.hotelChains[0]} ${context.destination} Conference Hotel`,
          chain: cityInfo.hotelChains[0],
          location: {
            address: `${optimalLocation}, ${context.destination}`,
            distanceToMeetings: '0.2 miles to conference venue',
            neighborhood: optimalLocation
          },
          amenities: ['Business Center', 'Conference Rooms', 'High-Speed WiFi', 'Executive Lounge'],
          priceRange: preferences.hotels.priceRange || 'mid-range',
          rating: 4.3,
          reviewCount: 1240,
          businessFeatures: ['24/7 Business Center', 'Meeting Rooms', 'Concierge Service'],
          reasoning: `Optimal for conference attendance with business amenities and close proximity to ${context.purpose}`,
          confidence: 0.95,
          bookingUrl: `https://booking.com/hotel/${context.destination}-conference`
        },
        {
          id: 'conf-2',
          name: `${cityInfo.hotelChains[1]} Executive Suites`,
          chain: cityInfo.hotelChains[1],
          location: {
            address: `${optimalLocation}, ${context.destination}`,
            distanceToMeetings: '0.5 miles to conference venue',
            neighborhood: optimalLocation
          },
          amenities: ['Executive Floors', 'Fitness Center', 'Restaurant', 'Room Service'],
          priceRange: 'luxury',
          rating: 4.5,
          reviewCount: 890,
          businessFeatures: ['Executive Lounge', 'Butler Service', 'Premium WiFi'],
          reasoning: 'Premium option with executive amenities for important business conferences',
          confidence: 0.88,
          bookingUrl: `https://booking.com/hotel/${context.destination}-executive`
        }
      ];
    }
    
    private generateBusinessHotels(
      context: TravelContext,
      preferences: UserPreferences,
      cityInfo: any,
      optimalLocation: string
    ): HotelRecommendation[] {
      return [
        {
          id: 'biz-1',
          name: `${cityInfo.hotelChains[0]} Business District`,
          chain: cityInfo.hotelChains[0],
          location: {
            address: `${optimalLocation}, ${context.destination}`,
            distanceToMeetings: '0.3 miles to business meetings',
            neighborhood: optimalLocation
          },
          amenities: ['Business Center', 'Fitness Center', 'Restaurant', 'WiFi'],
          priceRange: preferences.hotels.priceRange || 'mid-range',
          rating: 4.2,
          reviewCount: 2100,
          businessFeatures: ['Express Check-in', 'Business Lounge', 'Meeting Rooms'],
          reasoning: `Strategically located for business meetings with excellent business facilities`,
          confidence: 0.92,
          bookingUrl: `https://booking.com/hotel/${context.destination}-business`
        }
      ];
    }
    
    private generateGeneralHotels(
      context: TravelContext,
      preferences: UserPreferences,
      cityInfo: any,
      optimalLocation: string
    ): HotelRecommendation[] {
      return [
        {
          id: 'gen-1',
          name: `${cityInfo.hotelChains[2]} City Center`,
          chain: cityInfo.hotelChains[2],
          location: {
            address: `City Center, ${context.destination}`,
            distanceToMeetings: '1.2 miles average to meetings',
            neighborhood: 'City Center'
          },
          amenities: ['WiFi', 'Restaurant', 'Gym', 'Concierge'],
          priceRange: preferences.hotels.priceRange || 'mid-range',
          rating: 4.0,
          reviewCount: 1850,
          businessFeatures: ['Business Corner', 'Meeting Room', '24/7 Front Desk'],
          reasoning: 'Central location with good access to multiple business areas and amenities',
          confidence: 0.85,
          bookingUrl: `https://booking.com/hotel/${context.destination}-center`
        }
      ];
    }
    
    private analyzeDiningNeeds(context: TravelContext): any {
      // Analyze calendar events to determine business dining needs
      const events = context.calendarEvents || [];
      const businessDinnerNeeds = {
        hasEveningMeetings: false,
        hasClientMeetings: false,
        hasTeamDinners: false,
        conferenceNetworking: false
      };
      
      events.forEach(event => {
        const summary = event.summary?.toLowerCase() || '';
        const hour = new Date(event.start?.dateTime || event.start?.date).getHours();
        
        if (hour >= 17) businessDinnerNeeds.hasEveningMeetings = true;
        if (summary.includes('client') || summary.includes('customer')) businessDinnerNeeds.hasClientMeetings = true;
        if (summary.includes('team') || summary.includes('dinner')) businessDinnerNeeds.hasTeamDinners = true;
        if (summary.includes('conference') || summary.includes('networking')) businessDinnerNeeds.conferenceNetworking = true;
      });
      
      return businessDinnerNeeds;
    }
    
    private generateBusinessDinnerOptions(
      context: TravelContext,
      preferences: UserPreferences,
      cityInfo: any,
      businessNeeds: any
    ): RestaurantRecommendation[] {
      const recommendations: RestaurantRecommendation[] = [];
      
      if (businessNeeds.hasClientMeetings || businessNeeds.hasEveningMeetings) {
        recommendations.push({
          id: 'biz-dinner-1',
          name: `The Executive ${cityInfo.cuisines[0]} Restaurant`,
          cuisine: cityInfo.cuisines[0],
          location: {
            address: `${cityInfo.businessAreas[0]}, ${context.destination}`,
            distanceToHotel: '0.3 miles',
            neighborhood: cityInfo.businessAreas[0]
          },
          diningStyle: 'fine-dining',
          priceRange: 'expensive',
          rating: 4.6,
          atmosphere: ['business-friendly', 'upscale', 'quiet'],
          businessFriendly: true,
          reasoning: 'Perfect for client dinners with excellent business atmosphere and quality cuisine',
          confidence: 0.93,
          reservationRequired: true,
          recommendedFor: 'dinner'
        });
      }
      
      return recommendations;
    }
    
    private generateCasualDiningOptions(
      context: TravelContext,
      preferences: UserPreferences,
      cityInfo: any
    ): RestaurantRecommendation[] {
      return [
        {
          id: 'casual-1',
          name: `Local ${cityInfo.cuisines[1]} Bistro`,
          cuisine: cityInfo.cuisines[1],
          location: {
            address: `City Center, ${context.destination}`,
            distanceToHotel: '0.5 miles',
            neighborhood: 'City Center'
          },
          diningStyle: 'casual',
          priceRange: 'mid-range',
          rating: 4.3,
          atmosphere: ['casual', 'local-favorite', 'relaxed'],
          businessFriendly: true,
          reasoning: 'Great for casual business meals or personal dining with authentic local cuisine',
          confidence: 0.88,
          reservationRequired: false,
          recommendedFor: 'lunch'
        }
      ];
    }
    
    private generateBreakfastLunchOptions(
      context: TravelContext,
      preferences: UserPreferences,
      cityInfo: any
    ): RestaurantRecommendation[] {
      return [
        {
          id: 'breakfast-1',
          name: `Business Breakfast Cafe`,
          cuisine: 'International',
          location: {
            address: `${cityInfo.businessAreas[0]}, ${context.destination}`,
            distanceToHotel: '0.2 miles',
            neighborhood: cityInfo.businessAreas[0]
          },
          diningStyle: 'quick-service',
          priceRange: 'budget',
          rating: 4.1,
          atmosphere: ['business-casual', 'efficient', 'wifi-friendly'],
          businessFriendly: true,
          reasoning: 'Convenient for business breakfast meetings with fast service and WiFi',
          confidence: 0.85,
          reservationRequired: false,
          recommendedFor: 'breakfast'
        }
      ];
    }
    
    // Learning functions for future preference updates
    recordHotelChoice(userId: string, choice: HotelRecommendation, satisfaction: number): void {
      console.log('📚 Learning from hotel choice:', choice.name, 'Satisfaction:', satisfaction);
      // This would integrate with the preference learning system
    }
    
    recordRestaurantChoice(userId: string, choice: RestaurantRecommendation, satisfaction: number): void {
      console.log('📚 Learning from restaurant choice:', choice.name, 'Satisfaction:', satisfaction);
      // This would integrate with the preference learning system
    }
  }