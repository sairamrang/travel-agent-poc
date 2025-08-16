import React from 'react';
import { MapPin, Clock, Users, Star, Utensils, Wine, Calendar, DollarSign } from 'lucide-react';

// Types based on your recommendation engine
interface RestaurantRecommendation {
  id: string;
  name: string;
  cuisine: string;
  rating: number;
  priceRange: 'budget' | 'mid-range' | 'upscale';
  location: {
    address: string;
    district: string;
    proximityToHotel: string;
    proximityToMeetings: string;
    walkingTime: string;
  };
  diningStyle: 'casual' | 'fine-dining' | 'business-casual';
  atmosphere: 'business' | 'romantic' | 'casual' | 'formal';
  specialties: string[];
  businessFeatures: string[];
  contextualReasons: string[];
  availability: {
    lunch: boolean;
    dinner: boolean;
    businessHours: string;
  };
  reservationUrl: string;
  averagePrice: {
    lunch: number;
    dinner: number;
    currency: string;
  };
}

interface RestaurantRecommendationCardsProps {
  recommendations?: RestaurantRecommendation[]; // Made optional
  destination: string;
  meetingContext?: string;
}

const RestaurantRecommendationCards: React.FC<RestaurantRecommendationCardsProps> = ({ 
  recommendations = [], // Default to empty array
  destination,
  meetingContext = "your meetings"
}) => {
  const getPriceRangeColor = (priceRange: string) => {
    switch (priceRange) {
      case 'budget': return 'text-green-600 bg-green-50';
      case 'mid-range': return 'text-blue-600 bg-blue-50';
      case 'upscale': return 'text-purple-600 bg-purple-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getAtmosphereColor = (atmosphere: string) => {
    switch (atmosphere) {
      case 'business': return 'text-blue-700 bg-blue-50';
      case 'formal': return 'text-purple-700 bg-purple-50';
      case 'casual': return 'text-green-700 bg-green-50';
      case 'romantic': return 'text-pink-700 bg-pink-50';
      default: return 'text-gray-700 bg-gray-50';
    }
  };

  const getRatingStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${
          i < Math.floor(rating) 
            ? 'text-yellow-400 fill-current' 
            : 'text-gray-300'
        }`}
      />
    ));
  };

  const getPriceSymbols = (priceRange: string) => {
    switch (priceRange) {
      case 'budget': return '$';
      case 'mid-range': return '$$';
      case 'upscale': return '$$$';
      default: return '$';
    }
  };

  // Mock data for demo - replace with your actual recommendations
  const mockRecommendations: RestaurantRecommendation[] = [
    {
      id: '1',
      name: 'The Ledbury',
      cuisine: 'Modern European',
      rating: 4.8,
      priceRange: 'upscale',
      location: {
        address: '127 Ledbury Road, London W11 2AQ',
        district: 'Notting Hill',
        proximityToHotel: '0.5 miles from your hotel',
        proximityToMeetings: '1.2 miles from meeting location',
        walkingTime: '8 min walk from hotel'
      },
      diningStyle: 'fine-dining',
      atmosphere: 'business',
      specialties: ['Seasonal Tasting Menu', 'Wine Pairing', 'Private Dining'],
      businessFeatures: ['Private Rooms', 'Wine Sommelier', 'Business Atmosphere'],
      contextualReasons: [
        'Perfect for client dinner after your 6 PM meeting',
        'Michelin-starred venue impresses international clients',
        'Private dining available for confidential discussions'
      ],
      availability: {
        lunch: true,
        dinner: true,
        businessHours: '12:00 PM - 10:30 PM'
      },
      reservationUrl: '#',
      averagePrice: {
        lunch: 85,
        dinner: 150,
        currency: 'USD'
      }
    },
    {
      id: '2',
      name: 'Dishoom Canary Wharf',
      cuisine: 'Indian',
      rating: 4.6,
      priceRange: 'mid-range',
      location: {
        address: '22 Cabot Square, London E14 4QW',
        district: 'Business District',
        proximityToHotel: '0.1 miles from your hotel',
        proximityToMeetings: '0.2 miles from meeting location',
        walkingTime: '3 min walk from hotel'
      },
      diningStyle: 'business-casual',
      atmosphere: 'casual',
      specialties: ['Black Daal', 'Railway Lamb Curry', 'Pau Bhaji'],
      businessFeatures: ['Group Dining', 'Quick Service', 'Business WiFi'],
      contextualReasons: [
        'Convenient for lunch between meetings',
        'Popular with local business community',
        'Flexible timing fits your packed schedule'
      ],
      availability: {
        lunch: true,
        dinner: true,
        businessHours: '8:00 AM - 11:00 PM'
      },
      reservationUrl: '#',
      averagePrice: {
        lunch: 25,
        dinner: 35,
        currency: 'USD'
      }
    },
    {
      id: '3',
      name: 'Sketch',
      cuisine: 'Contemporary French',
      rating: 4.4,
      priceRange: 'upscale',
      location: {
        address: '9 Conduit Street, London W1S 2XG',
        district: 'Mayfair',
        proximityToHotel: '2.1 miles from your hotel',
        proximityToMeetings: '1.8 miles from meeting location',
        walkingTime: '15 min taxi ride'
      },
      diningStyle: 'fine-dining',
      atmosphere: 'formal',
      specialties: ['Afternoon Tea', 'Art & Dining Experience', 'Cocktail Bar'],
      businessFeatures: ['Unique Venue', 'Cocktail Reception', 'Memorable Experience'],
      contextualReasons: [
        'Unique venue for memorable client entertainment',
        'Instagram-worthy setting builds personal connections',
        'Combines art gallery experience with fine dining'
      ],
      availability: {
        lunch: true,
        dinner: true,
        businessHours: '12:00 PM - 1:30 AM'
      },
      reservationUrl: '#',
      averagePrice: {
        lunch: 65,
        dinner: 120,
        currency: 'USD'
      }
    }
  ];

  // Helper function to safely get restaurant data with fallbacks
  const safeRestaurantData = (restaurant: any) => ({
    id: restaurant.id || Math.random().toString(),
    name: restaurant.name || 'Restaurant Name',
    cuisine: restaurant.cuisine || 'International',
    rating: restaurant.rating || 4.0,
    priceRange: restaurant.priceRange || 'mid-range',
    location: {
      address: restaurant.location?.address || 'Address not available',
      district: restaurant.location?.district || 'District',
      proximityToHotel: restaurant.location?.proximityToHotel || '0.5 miles from your hotel',
      proximityToMeetings: restaurant.location?.proximityToMeetings || '0.3 miles from meeting location',
      walkingTime: restaurant.location?.walkingTime || '5 min walk'
    },
    diningStyle: restaurant.diningStyle || 'business-casual',
    atmosphere: restaurant.atmosphere || 'business',
    specialties: restaurant.specialties || ['Local Cuisine'],
    businessFeatures: restaurant.businessFeatures || ['Group Dining', 'Business WiFi'],
    contextualReasons: restaurant.contextualReasons || ['Perfect for business dining'],
    availability: {
      lunch: restaurant.availability?.lunch !== false,
      dinner: restaurant.availability?.dinner !== false,
      businessHours: restaurant.availability?.businessHours || '11:00 AM - 10:00 PM'
    },
    reservationUrl: restaurant.reservationUrl || '#',
    averagePrice: {
      lunch: restaurant.averagePrice?.lunch || restaurant.estimatedPrice || 30,
      dinner: restaurant.averagePrice?.dinner || restaurant.estimatedPrice || 50,
      currency: restaurant.averagePrice?.currency || 'USD'
    }
  });

  // Safe check for recommendations array
  const validRecommendations = Array.isArray(recommendations) ? recommendations : [];
  const displayRecommendations = validRecommendations.length > 0 ? validRecommendations : mockRecommendations;
  const safeRecommendations = displayRecommendations.map(safeRestaurantData);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            🍽️ Smart Restaurant Recommendations
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Context-aware dining suggestions for business meals in {destination}
          </p>
        </div>
        <div className="bg-orange-50 text-orange-700 px-3 py-1 rounded-full text-sm font-medium">
          {safeRecommendations.length} matches
        </div>
      </div>

      {/* Restaurant Cards */}
      <div className="grid gap-4">
        {safeRecommendations.map((restaurant) => (
          <div
            key={restaurant.id}
            className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow"
          >
            {/* Header Row */}
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="text-xl font-semibold text-gray-900">{restaurant.name}</h4>
                  <span className="text-sm text-gray-500">• {restaurant.cuisine}</span>
                </div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="flex items-center gap-1">
                    {getRatingStars(restaurant.rating)}
                    <span className="text-sm text-gray-600 ml-1">({restaurant.rating})</span>
                  </div>
                  <div className="text-lg font-bold text-gray-700">
                    {getPriceSymbols(restaurant.priceRange)}
                  </div>
                  <div className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getPriceRangeColor(restaurant.priceRange)}`}>
                    {restaurant.priceRange}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-600">Dinner from</div>
                <div className="text-2xl font-bold text-gray-900">
                  ${restaurant.averagePrice?.dinner || 50}
                </div>
                <div className={`inline-block px-2 py-1 rounded-full text-xs font-medium mt-1 ${getAtmosphereColor(restaurant.atmosphere || 'business')}`}>
                  {restaurant.atmosphere || 'business'}
                </div>
              </div>
            </div>

            {/* Location & Proximity */}
            <div className="bg-green-50 rounded-lg p-3 mb-4">
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-green-600 mt-0.5" />
                <div className="flex-1">
                  <div className="text-sm font-medium text-green-800">
                    {restaurant.location.proximityToHotel}
                  </div>
                  <div className="text-xs text-green-600">
                    {restaurant.location.district} • {restaurant.location.walkingTime}
                  </div>
                </div>
                <div className="text-xs text-green-700 bg-green-100 px-2 py-1 rounded-full">
                  {restaurant.location.proximityToMeetings}
                </div>
              </div>
            </div>

            {/* Contextual Intelligence */}
            <div className="mb-4">
              <div className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                Perfect for your business trip:
              </div>
              <div className="space-y-1">
                {(restaurant.contextualReasons || []).map((reason, index) => (
                  <div key={index} className="text-sm text-gray-600 flex items-start gap-2">
                    <div className="w-1 h-1 bg-gray-400 rounded-full mt-2"></div>
                    {reason}
                  </div>
                ))}
              </div>
            </div>

            {/* Specialties & Business Features */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <div className="text-sm font-medium text-gray-700 mb-2">Specialties</div>
                <div className="space-y-1">
                  {(restaurant.specialties || []).slice(0, 3).map((specialty, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-1 text-xs text-gray-600"
                    >
                      <Utensils className="w-3 h-3 text-gray-400" />
                      {specialty}
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-700 mb-2">Business Features</div>
                <div className="space-y-1">
                  {(restaurant.businessFeatures || []).map((feature, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-1 text-xs text-blue-700"
                    >
                      <Users className="w-3 h-3 text-blue-500" />
                      {feature}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Availability & Pricing */}
            <div className="bg-gray-50 rounded-lg p-3 mb-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-500" />
                  <div>
                    <div className="font-medium text-gray-700">Hours</div>
                    <div className="text-gray-600">{restaurant.availability?.businessHours || '11:00 AM - 10:00 PM'}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-gray-500" />
                  <div>
                    <div className="font-medium text-gray-700">Lunch</div>
                    <div className="text-gray-600">${restaurant.averagePrice?.lunch || 25} avg</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Wine className="w-4 h-4 text-gray-500" />
                  <div>
                    <div className="font-medium text-gray-700">Dinner</div>
                    <div className="text-gray-600">${restaurant.averagePrice?.dinner || 50} avg</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
              <div className="text-xs text-gray-500 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Available for reservation
              </div>
              <div className="flex gap-2">
                <button className="border border-gray-300 text-gray-700 px-3 py-1.5 rounded-lg text-sm hover:bg-gray-50 transition-colors">
                  View Menu
                </button>
                <button className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-1.5 rounded-lg text-sm font-medium transition-colors">
                  Reserve Table
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Intelligence Footer */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex items-start gap-2">
          <div className="w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center">
            <Utensils className="w-3 h-3 text-orange-600" />
          </div>
          <div>
            <div className="text-sm font-medium text-gray-700">Restaurant Intelligence Engine</div>
            <div className="text-xs text-gray-600 mt-1">
              Restaurants recommended based on your meeting schedule, hotel location, cuisine preferences, and business dining context. Suggestions automatically adjust based on your calendar timing and client entertainment needs.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RestaurantRecommendationCards;