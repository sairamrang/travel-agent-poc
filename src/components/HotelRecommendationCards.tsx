import React from 'react';
import { MapPin, Wifi, Car, Utensils, Dumbbell, Users, Star, Clock, DollarSign } from 'lucide-react';

// Types based on your recommendation engine
interface HotelRecommendation {
  id: string;
  name: string;
  chain: string;
  rating: number;
  priceRange: 'budget' | 'mid-range' | 'luxury';
  location: {
    address: string;
    district: string;
    proximityToMeetings: string;
    walkingTime: string;
  };
  amenities: string[];
  roomTypes: string[];
  businessFeatures: string[];
  contextualReasons: string[];
  bookingUrl: string;
  price: {
    amount: number;
    currency: string;
    period: string;
  };
}

interface HotelRecommendationCardsProps {
  recommendations: HotelRecommendation[];
  destination: string;
}

const HotelRecommendationCards: React.FC<HotelRecommendationCardsProps> = ({ 
  recommendations, 
  destination 
}) => {
  const getAmenityIcon = (amenity: string) => {
    const amenityLower = amenity.toLowerCase();
    if (amenityLower.includes('wifi')) return <Wifi className="w-4 h-4" />;
    if (amenityLower.includes('parking') || amenityLower.includes('valet')) return <Car className="w-4 h-4" />;
    if (amenityLower.includes('restaurant') || amenityLower.includes('dining')) return <Utensils className="w-4 h-4" />;
    if (amenityLower.includes('fitness') || amenityLower.includes('gym')) return <Dumbbell className="w-4 h-4" />;
    if (amenityLower.includes('business') || amenityLower.includes('meeting')) return <Users className="w-4 h-4" />;
    return <Star className="w-4 h-4" />;
  };

  const getPriceRangeColor = (priceRange: string) => {
    switch (priceRange) {
      case 'budget': return 'text-green-600 bg-green-50';
      case 'mid-range': return 'text-blue-600 bg-blue-50';
      case 'luxury': return 'text-purple-600 bg-purple-50';
      default: return 'text-gray-600 bg-gray-50';
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

  // Mock data for demo - replace with your actual recommendations
  const mockRecommendations: HotelRecommendation[] = [
    {
      id: '1',
      name: 'The Business Hub London',
      chain: 'Marriott',
      rating: 4.5,
      priceRange: 'mid-range',
      location: {
        address: '123 Canary Wharf, London E14 5AB',
        district: 'Business District',
        proximityToMeetings: '0.3 miles from meeting location',
        walkingTime: '5 min walk'
      },
      amenities: ['Business Center', 'WiFi', 'Fitness Center', 'Restaurant', 'Valet Parking'],
      roomTypes: ['Executive Suite', 'Standard Room'],
      businessFeatures: ['24/7 Business Center', 'Meeting Rooms', 'Executive Lounge'],
      contextualReasons: [
        'Perfect for your 9 AM client meeting',
        'Business district location matches your itinerary',
        'Executive amenities for professional stays'
      ],
      bookingUrl: '#',
      price: {
        amount: 280,
        currency: 'USD',
        period: 'per night'
      }
    },
    {
      id: '2',
      name: 'InterContinental London Tower',
      chain: 'InterContinental',
      rating: 4.8,
      priceRange: 'luxury',
      location: {
        address: '1 Thomas More Square, London E1W 1AZ',
        district: 'City Center',
        proximityToMeetings: '0.8 miles from meeting location',
        walkingTime: '12 min walk'
      },
      amenities: ['Concierge', 'WiFi', 'Spa', 'Fine Dining', 'Valet Parking'],
      roomTypes: ['Thames Suite', 'Premium Room'],
      businessFeatures: ['Executive Floor', 'Butler Service', 'Private Meetings'],
      contextualReasons: [
        'Luxury setting for important client entertainment',
        'Thames views for impressive dinner meetings',
        'Concierge can arrange last-minute business needs'
      ],
      bookingUrl: '#',
      price: {
        amount: 450,
        currency: 'USD',
        period: 'per night'
      }
    },
    {
      id: '3',
      name: 'Premier Inn London Canary Wharf',
      chain: 'Premier Inn',
      rating: 4.2,
      priceRange: 'budget',
      location: {
        address: '30 Marsh Wall, London E14 9TP',
        district: 'Business District',
        proximityToMeetings: '0.1 miles from meeting location',
        walkingTime: '2 min walk'
      },
      amenities: ['WiFi', 'Restaurant', 'Business Facilities'],
      roomTypes: ['Standard Room', 'Family Room'],
      businessFeatures: ['Work Desk', 'Meeting Space', 'Business WiFi'],
      contextualReasons: [
        'Closest to your morning meetings',
        'Cost-effective for frequent business travel',
        'Reliable business amenities'
      ],
      bookingUrl: '#',
      price: {
        amount: 120,
        currency: 'USD',
        period: 'per night'
      }
    }
  ];

  // Helper function to safely get hotel data with fallbacks
  const safeHotelData = (hotel: any) => ({
    id: hotel.id || Math.random().toString(),
    name: hotel.name || 'Hotel Name',
    chain: hotel.chain || 'Hotel Chain',
    rating: hotel.rating || 4.0,
    priceRange: hotel.priceRange || 'mid-range',
    location: {
      address: hotel.location?.address || 'Address not available',
      district: hotel.location?.district || 'District',
      proximityToMeetings: hotel.location?.proximityToMeetings || '0.5 miles from meeting location',
      walkingTime: hotel.location?.walkingTime || '10 min walk'
    },
    amenities: hotel.amenities || ['WiFi', 'Business Center'],
    roomTypes: hotel.roomTypes || ['Standard Room'],
    businessFeatures: hotel.businessFeatures || ['Business Center', 'WiFi'],
    contextualReasons: hotel.contextualReasons || ['Perfect for business travel'],
    bookingUrl: hotel.bookingUrl || '#',
    price: {
      amount: hotel.price?.amount || hotel.estimatedPrice || 200,
      currency: hotel.price?.currency || 'USD',
      period: hotel.price?.period || 'per night'
    }
  });

  const displayRecommendations = recommendations.length > 0 ? recommendations : mockRecommendations;
  const safeRecommendations = displayRecommendations.map(safeHotelData);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            🏨 Smart Hotel Recommendations
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            AI-curated hotels based on your meetings and preferences in {destination}
          </p>
        </div>
        <div className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm font-medium">
          {safeRecommendations.length} matches
        </div>
      </div>

      {/* Hotel Cards */}
      <div className="grid gap-4">
        {safeRecommendations.map((hotel) => (
          <div
            key={hotel.id}
            className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow"
          >
            {/* Header Row */}
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="text-xl font-semibold text-gray-900">{hotel.name}</h4>
                  <span className="text-sm text-gray-500">• {hotel.chain}</span>
                </div>
                <div className="flex items-center gap-1 mb-2">
                  {getRatingStars(hotel.rating)}
                  <span className="text-sm text-gray-600 ml-1">({hotel.rating})</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-gray-900">
                  ${hotel.price.amount}
                </div>
                <div className="text-sm text-gray-500">{hotel.price.period}</div>
                <div className={`inline-block px-2 py-1 rounded-full text-xs font-medium mt-1 ${getPriceRangeColor(hotel.priceRange)}`}>
                  {hotel.priceRange}
                </div>
              </div>
            </div>

            {/* Location & Proximity */}
            <div className="bg-green-50 rounded-lg p-3 mb-4">
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-green-600 mt-0.5" />
                <div>
                  <div className="text-sm font-medium text-green-800">
                    {hotel.location.proximityToMeetings}
                  </div>
                  <div className="text-xs text-green-600">
                    {hotel.location.district} • {hotel.location.walkingTime}
                  </div>
                </div>
              </div>
            </div>

            {/* Contextual Intelligence */}
            <div className="mb-4">
              <div className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                Why this hotel fits your trip:
              </div>
              <div className="space-y-1">
                {(hotel.contextualReasons || []).map((reason, index) => (
                  <div key={index} className="text-sm text-gray-600 flex items-start gap-2">
                    <div className="w-1 h-1 bg-gray-400 rounded-full mt-2"></div>
                    {reason}
                  </div>
                ))}
              </div>
            </div>

            {/* Amenities */}
            <div className="mb-4">
              <div className="text-sm font-medium text-gray-700 mb-2">Key Amenities</div>
              <div className="flex flex-wrap gap-2">
                {(hotel.amenities || []).slice(0, 5).map((amenity, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-1 bg-gray-50 px-2 py-1 rounded-full text-xs text-gray-700"
                  >
                    {getAmenityIcon(amenity)}
                    {amenity}
                  </div>
                ))}
                {(hotel.amenities || []).length > 5 && (
                  <div className="bg-gray-50 px-2 py-1 rounded-full text-xs text-gray-600">
                    +{(hotel.amenities || []).length - 5} more
                  </div>
                )}
              </div>
            </div>

            {/* Business Features */}
            <div className="mb-4">
              <div className="text-sm font-medium text-gray-700 mb-2">Business Features</div>
              <div className="flex flex-wrap gap-2">
                {(hotel.businessFeatures || []).map((feature, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-1 rounded-full text-xs"
                  >
                    <Users className="w-3 h-3" />
                    {feature}
                  </div>
                ))}
              </div>
            </div>

            {/* Action Button */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
              <div className="text-xs text-gray-500">
                <Clock className="w-3 h-3 inline mr-1" />
                Best rates available now
              </div>
              <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                View & Book
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Intelligence Footer */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex items-start gap-2">
          <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
          </div>
          <div>
            <div className="text-sm font-medium text-gray-700">AI Recommendation Engine</div>
            <div className="text-xs text-gray-600 mt-1">
              Hotels selected based on your calendar events, meeting locations, business preferences, and contextual travel needs. Recommendations update automatically as your itinerary changes.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HotelRecommendationCards;