/ src/lib/agents/context-manager.ts
// Manages conversation context and user preferences

export interface UserPreferences {
  budget?: {
    restaurants?: { min?: number; max?: number; perPerson?: boolean };
    hotels?: { min?: number; max?: number; perNight?: boolean };
    flights?: { max?: number; class?: string };
  };
  loyalty?: {
    airlines?: string[];
    hotels?: string[];
    programs?: Array<{ brand: string; number: string; tier?: string }>;
  };
  dietary?: string[];
  cuisine?: string[];
  hotelAmenities?: string[];
  seatPreference?: string;
  travelStyle?: 'budget' | 'moderate' | 'luxury';
}

export interface ConversationContext {
  currentTrip?: {
    origin?: string;
    destination?: string;
    startDate?: string;
    endDate?: string;
    purpose?: 'business' | 'leisure' | 'mixed';
    travelers?: number;
  };
  lastSearches?: {
    flights?: any[];
    hotels?: any[];
    restaurants?: any[];
  };
  preferences: UserPreferences;
  conversationHistory: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    extractedInfo?: any;
  }>;
}

export class ContextManager {
  private context: ConversationContext;

  constructor(initialContext?: Partial<ConversationContext>) {
    this.context = {
      preferences: {},
      conversationHistory: [],
      ...initialContext
    };
  }

  /**
   * Extract preferences from user message
   */
  extractPreferences(message: string): Partial<UserPreferences> {
    const preferences: Partial<UserPreferences> = {};
    const lowerMessage = message.toLowerCase();

    // Extract budget preferences
    const pricePatterns = [
      /less than \$?(\d+)/i,
      /under \$?(\d+)/i,
      /max(?:imum)? \$?(\d+)/i,
      /budget (?:of |is )?\$?(\d+)/i,
      /\$?(\d+) (?:per person|pp)/i,
      /\$?(\d+)-\$?(\d+)/i,
      /between \$?(\d+) and \$?(\d+)/i,
    ];

    for (const pattern of pricePatterns) {
      const match = message.match(pattern);
      if (match) {
        if (lowerMessage.includes('restaurant') || lowerMessage.includes('dinner') || lowerMessage.includes('lunch')) {
          preferences.budget = {
            ...preferences.budget,
            restaurants: {
              max: parseInt(match[1]),
              perPerson: lowerMessage.includes('per person') || lowerMessage.includes('pp')
            }
          };
        } else if (lowerMessage.includes('hotel') || lowerMessage.includes('stay')) {
          preferences.budget = {
            ...preferences.budget,
            hotels: {
              max: parseInt(match[1]),
              perNight: true
            }
          };
        }
      }
    }

    // Extract loyalty programs
    const hotelChains = {
      'marriott': ['marriott', 'bonvoy', 'ritz', 'westin', 'sheraton', 'st regis', 'w hotels'],
      'hilton': ['hilton', 'honors', 'conrad', 'waldorf', 'doubletree', 'hampton'],
      'hyatt': ['hyatt', 'world of hyatt', 'park hyatt', 'grand hyatt', 'andaz'],
      'ihg': ['ihg', 'intercontinental', 'holiday inn', 'crowne plaza', 'kimpton'],
      'accor': ['accor', 'sofitel', 'novotel', 'mercure', 'ibis'],
      'choice': ['choice', 'comfort inn', 'quality inn', 'clarion'],
      'wyndham': ['wyndham', 'days inn', 'ramada', 'super 8'],
    };

    const airlineAlliances = {
      'star alliance': ['united', 'lufthansa', 'air canada', 'singapore airlines', 'ana', 'swiss', 'austrian'],
      'oneworld': ['american', 'british airways', 'cathay pacific', 'qantas', 'finnair', 'iberia'],
      'skyteam': ['delta', 'air france', 'klm', 'korean air', 'aeromexico', 'virgin atlantic'],
    };

    // Check for hotel loyalty
    for (const [brand, keywords] of Object.entries(hotelChains)) {
      if (keywords.some(keyword => lowerMessage.includes(keyword))) {
        preferences.loyalty = {
          ...preferences.loyalty,
          hotels: [...(preferences.loyalty?.hotels || []), brand]
        };
      }
    }

    // Check for airline loyalty
    for (const [, airlines] of Object.entries(airlineAlliances)) {
      for (const airline of airlines) {
        if (lowerMessage.includes(airline)) {
          preferences.loyalty = {
            ...preferences.loyalty,
            airlines: [...(preferences.loyalty?.airlines || []), airline]
          };
        }
      }
    }

    // Extract dietary preferences
    const dietaryKeywords = ['vegetarian', 'vegan', 'gluten-free', 'halal', 'kosher', 'dairy-free', 'nut-free'];
    const foundDietary = dietaryKeywords.filter(diet => lowerMessage.includes(diet));
    if (foundDietary.length > 0) {
      preferences.dietary = foundDietary;
    }

    // Extract cuisine preferences
    const cuisineTypes = ['italian', 'mexican', 'chinese', 'japanese', 'thai', 'indian', 'french', 'mediterranean', 'american', 'korean', 'vietnamese'];
    const foundCuisine = cuisineTypes.filter(cuisine => lowerMessage.includes(cuisine));
    if (foundCuisine.length > 0) {
      preferences.cuisine = foundCuisine;
    }

    // Extract hotel amenities
    const amenities = ['pool', 'gym', 'spa', 'parking', 'wifi', 'breakfast', 'pet-friendly', 'kitchen', 'balcony', 'ocean view', 'business center'];
    const foundAmenities = amenities.filter(amenity => lowerMessage.includes(amenity));
    if (foundAmenities.length > 0) {
      preferences.hotelAmenities = foundAmenities;
    }

    return preferences;
  }

  /**
   * Update context with new information
   */
  updateContext(message: string, role: 'user' | 'assistant' = 'user') {
    // Extract preferences from message
    const newPreferences = this.extractPreferences(message);
    
    // Merge with existing preferences
    this.context.preferences = this.mergePreferences(this.context.preferences, newPreferences);
    
    // Add to conversation history
    this.context.conversationHistory.push({
      role,
      content: message,
      timestamp: new Date(),
      extractedInfo: newPreferences
    });

    // Extract trip information
    this.extractTripInfo(message);
    
    console.log('📊 Updated context:', {
      preferences: this.context.preferences,
      currentTrip: this.context.currentTrip
    });
  }

  /**
   * Extract trip information from message
   */
  private extractTripInfo(message: string) {
    // Extract dates
    const datePattern = /(\d{4}-\d{2}-\d{2})/g;
    const dates = message.match(datePattern);
    if (dates && dates.length > 0) {
      if (!this.context.currentTrip) {
        this.context.currentTrip = {};
      }
      this.context.currentTrip.startDate = dates[0];
      if (dates.length > 1) {
        this.context.currentTrip.endDate = dates[1];
      }
    }

    // Extract number of travelers
    const travelersPattern = /(\d+)\s*(?:people|persons|travelers|adults|passengers)/i;
    const travelersMatch = message.match(travelersPattern);
    if (travelersMatch) {
      if (!this.context.currentTrip) {
        this.context.currentTrip = {};
      }
      this.context.currentTrip.travelers = parseInt(travelersMatch[1]);
    }

    // Extract purpose
    if (message.toLowerCase().includes('business')) {
      if (!this.context.currentTrip) {
        this.context.currentTrip = {};
      }
      this.context.currentTrip.purpose = 'business';
    } else if (message.toLowerCase().includes('vacation') || message.toLowerCase().includes('leisure')) {
      if (!this.context.currentTrip) {
        this.context.currentTrip = {};
      }
      this.context.currentTrip.purpose = 'leisure';
    }
  }

  /**
   * Merge preferences intelligently
   */
  private mergePreferences(existing: UserPreferences, new_prefs: Partial<UserPreferences>): UserPreferences {
    return {
      ...existing,
      ...new_prefs,
      budget: {
        ...existing.budget,
        ...new_prefs.budget,
        restaurants: { ...existing.budget?.restaurants, ...new_prefs.budget?.restaurants },
        hotels: { ...existing.budget?.hotels, ...new_prefs.budget?.hotels },
        flights: { ...existing.budget?.flights, ...new_prefs.budget?.flights },
      },
      loyalty: {
        ...existing.loyalty,
        ...new_prefs.loyalty,
        airlines: [...new Set([...(existing.loyalty?.airlines || []), ...(new_prefs.loyalty?.airlines || [])])],
        hotels: [...new Set([...(existing.loyalty?.hotels || []), ...(new_prefs.loyalty?.hotels || [])])],
      },
      dietary: [...new Set([...(existing.dietary || []), ...(new_prefs.dietary || [])])],
      cuisine: [...new Set([...(existing.cuisine || []), ...(new_prefs.cuisine || [])])],
      hotelAmenities: [...new Set([...(existing.hotelAmenities || []), ...(new_prefs.hotelAmenities || [])])],
    };
  }

  /**
   * Get context for API calls
   */
  getContext(): ConversationContext {
    return this.context;
  }

  /**
   * Get preferences for specific tool
   */
  getPreferencesForTool(toolName: string): any {
    switch (toolName) {
      case 'search_restaurants':
        return {
          maxPrice: this.context.preferences.budget?.restaurants?.max,
          perPerson: this.context.preferences.budget?.restaurants?.perPerson,
          dietary: this.context.preferences.dietary,
          cuisine: this.context.preferences.cuisine,
        };
      
      case 'search_hotels':
        return {
          maxPrice: this.context.preferences.budget?.hotels?.max,
          perNight: this.context.preferences.budget?.hotels?.perNight,
          chains: this.context.preferences.loyalty?.hotels,
          amenities: this.context.preferences.hotelAmenities,
        };
      
      case 'search_flights':
        return {
          maxPrice: this.context.preferences.budget?.flights?.max,
          class: this.context.preferences.budget?.flights?.class,
          airlines: this.context.preferences.loyalty?.airlines,
          seatPreference: this.context.preferences.seatPreference,
        };
      
      default:
        return {};
    }
  }

  /**
   * Generate context-aware prompt additions
   */
  generateContextPrompt(): string {
    const parts = [];
    
    if (this.context.preferences.budget?.restaurants?.max) {
      parts.push(`Restaurant budget: $${this.context.preferences.budget.restaurants.max}${this.context.preferences.budget.restaurants.perPerson ? ' per person' : ''}`);
    }
    
    if (this.context.preferences.budget?.hotels?.max) {
      parts.push(`Hotel budget: $${this.context.preferences.budget.hotels.max} per night`);
    }
    
    if (this.context.preferences.loyalty?.hotels?.length) {
      parts.push(`Preferred hotel chains: ${this.context.preferences.loyalty.hotels.join(', ')}`);
    }
    
    if (this.context.preferences.loyalty?.airlines?.length) {
      parts.push(`Preferred airlines: ${this.context.preferences.loyalty.airlines.join(', ')}`);
    }
    
    if (this.context.preferences.dietary?.length) {
      parts.push(`Dietary restrictions: ${this.context.preferences.dietary.join(', ')}`);
    }
    
    if (this.context.preferences.cuisine?.length) {
      parts.push(`Cuisine preferences: ${this.context.preferences.cuisine.join(', ')}`);
    }
    
    if (parts.length > 0) {
      return `\n\nUser preferences to consider:\n${parts.join('\n')}`;
    }
    
    return '';
  }
}