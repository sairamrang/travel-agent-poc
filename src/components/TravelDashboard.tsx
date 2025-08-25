// src/components/TravelDashboard.tsx
'use client';

import { useState } from 'react';
import { 
  Calendar, Plane, Hotel, Utensils, Users, Cloud, Package,
  TrendingUp, Clock, MapPin, DollarSign, Star, Wifi, 
  Car, Coffee, Briefcase, ChevronRight, AlertCircle,
  BarChart3, PieChart, Activity, Globe
} from 'lucide-react';

interface TravelDashboardProps {
  data: any;
  destination?: string;
}

export default function TravelDashboard({ data, destination = "your destination" }: TravelDashboardProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'flights' | 'hotels' | 'dining' | 'insights'>('overview');

  // Calculate statistics with better error handling
  const stats = {
    totalFlights: data?.flights?.flights?.length || data?.flights?.offers?.length || 0,
    avgFlightPrice: calculateAvgPrice(data?.flights?.flights || data?.flights?.offers || []),
    totalHotels: data?.hotels?.hotels?.length || data?.hotels?.recommendations?.length || 0,
    avgHotelPrice: calculateAvgPrice(data?.hotels?.hotels || data?.hotels?.recommendations || []),
    totalRestaurants: data?.restaurants?.restaurants?.length || data?.restaurants?.recommendations?.length || 0,
    colleagues: data?.colleagues?.count || 0,
    connections: data?.linkedIn?.count || 0,
    timezoneConflicts: data?.calendar?.timezoneAnalysis?.conflictCount || 0,
  };

  function calculateAvgPrice(items: any[]): number {
    if (!items || items.length === 0) return 0;
    const total = items.reduce((acc: number, item: any) => {
      const price = item.price?.total || item.price || 0;
      return acc + (typeof price === 'number' ? price : 0);
    }, 0);
    return total / items.length;
  }

  // Get the correct arrays for flights, hotels, restaurants
  const flights = data?.flights?.flights || data?.flights?.offers || [];
  const hotels = data?.hotels?.hotels || data?.hotels?.recommendations || [];
  const restaurants = data?.restaurants?.restaurants || data?.restaurants?.recommendations || [];

  // Price distribution for chart
  const flightPrices = flights.map((f: any) => f.price?.total || f.price || 0).filter((p: number) => p > 0);
  const hotelPrices = hotels.map((h: any) => h.price || 0).filter((p: number) => p > 0);

  return (
    <div className="w-full bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-6 shadow-xl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Globe className="w-6 h-6 text-blue-600" />
              Trip to {destination}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {data?.calendar?.startDate ? new Date(data.calendar.startDate).toLocaleDateString() : 'Dates TBD'}
              {data?.calendar?.endDate && ` - ${new Date(data.calendar.endDate).toLocaleDateString()}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {data?.calendar?.timezoneAnalysis?.conflictCount > 0 && (
              <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {data.calendar.timezoneAnalysis.conflictCount} Conflicts
              </span>
            )}
            <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
              {data?.calendar?.purpose || 'Business Trip'}
            </span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex gap-1 bg-white rounded-lg p-1 shadow-sm">
          {[
            { id: 'overview', label: 'Overview', icon: BarChart3 },
            { id: 'flights', label: 'Flights', icon: Plane },
            { id: 'hotels', label: 'Hotels', icon: Hotel },
            { id: 'dining', label: 'Dining', icon: Utensils },
            { id: 'insights', label: 'Insights', icon: Activity }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md transition-all ${
                activeTab === tab.id 
                  ? 'bg-blue-600 text-white shadow-md' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span className="text-sm font-medium">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content Area */}
      <div className="space-y-6">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <>
            {/* Key Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <MetricCard
                title="Avg Flight"
                value={`$${Math.round(stats.avgFlightPrice)}`}
                icon={Plane}
                trend={stats.totalFlights > 0 ? 'up' : 'neutral'}
                subtitle={`${stats.totalFlights} options`}
              />
              <MetricCard
                title="Avg Hotel"
                value={`$${Math.round(stats.avgHotelPrice)}`}
                icon={Hotel}
                trend={stats.totalHotels > 0 ? 'up' : 'neutral'}
                subtitle={`${stats.totalHotels} options`}
              />
              <MetricCard
                title="Restaurants"
                value={stats.totalRestaurants}
                icon={Utensils}
                subtitle="Recommended"
              />
              <MetricCard
                title="Connections"
                value={stats.colleagues + stats.connections}
                icon={Users}
                subtitle="To meet"
              />
            </div>

            {/* Price Distribution Chart */}
            {(flightPrices.length > 0 || hotelPrices.length > 0) && (
              <div className="bg-white rounded-lg p-6 shadow-sm">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <PieChart className="w-5 h-5 text-blue-600" />
                  Price Distribution
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {flightPrices.length > 0 && (
                    <PriceChart 
                      title="Flight Prices" 
                      prices={flightPrices} 
                      color="blue"
                    />
                  )}
                  {hotelPrices.length > 0 && (
                    <PriceChart 
                      title="Hotel Prices" 
                      prices={hotelPrices} 
                      color="green"
                    />
                  )}
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <QuickAction
                title="Best Flight Deal"
                subtitle={data?.flights?.flights?.[0] ? 
                  `$${data.flights.flights[0].price?.total} - ${data.flights.flights[0].airlines?.[0]}` : 
                  'No flights found'}
                icon={TrendingUp}
                color="blue"
              />
              <QuickAction
                title="Top Hotel Pick"
                subtitle={data?.hotels?.hotels?.[0] ? 
                  `$${data.hotels.hotels[0].price}/night - ${data.hotels.hotels[0].name}` : 
                  'No hotels found'}
                icon={Star}
                color="green"
              />
              <QuickAction
                title="Must-Try Restaurant"
                subtitle={data?.restaurants?.restaurants?.[0]?.name || 'No restaurants found'}
                icon={Coffee}
                color="orange"
              />
            </div>
          </>
        )}

        {/* Flights Tab */}
        {activeTab === 'flights' && (
          <div className="space-y-4">
            {flights.length > 0 ? (
              <>
                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Plane className="w-5 h-5 text-blue-600" />
                    Available Flights ({flights.length})
                  </h3>
                  <div className="space-y-3">
                    {flights.slice(0, 5).map((flight: any, idx: number) => (
                      <FlightCard key={idx} flight={flight} index={idx} />
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <EmptyState icon={Plane} message="No flights found" />
            )}
          </div>
        )}

        {/* Hotels Tab */}
        {activeTab === 'hotels' && (
          <div className="space-y-4">
            {hotels.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {hotels.slice(0, 6).map((hotel: any, idx: number) => (
                  <HotelCard key={idx} hotel={hotel} index={idx} />
                ))}
              </div>
            ) : (
              <EmptyState icon={Hotel} message="No hotels found" />
            )}
          </div>
        )}

        {/* Dining Tab */}
        {activeTab === 'dining' && (
          <div className="space-y-4">
            {restaurants.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {restaurants.slice(0, 6).map((restaurant: any, idx: number) => (
                  <RestaurantCard key={idx} restaurant={restaurant} index={idx} />
                ))}
              </div>
            ) : (
              <EmptyState icon={Utensils} message="No restaurants found" />
            )}
          </div>
        )}

        {/* Insights Tab */}
        {activeTab === 'insights' && (
          <div className="space-y-4">
            {/* Travel Intelligence */}
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Activity className="w-5 h-5 text-purple-600" />
                Travel Intelligence
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InsightCard
                  title="Best Travel Time"
                  value={data?.calendar?.timezoneAnalysis?.recommendations?.[0] || "Schedule meetings between 10 AM - 2 PM local time"}
                  icon={Clock}
                  color="purple"
                />
                <InsightCard
                  title="Network Opportunities"
                  value={`${stats.colleagues} colleagues and ${stats.connections} LinkedIn connections in ${destination}`}
                  icon={Users}
                  color="blue"
                />
                <InsightCard
                  title="Weather Forecast"
                  value={
                    data?.weather?.forecast?.summary 
                      ? `${data.weather.forecast.summary.weatherPattern} • ${data.weather.forecast.summary.avgHigh}°/${data.weather.forecast.summary.avgLow}°`
                      : "Check weather closer to travel date"
                  }
                  icon={Cloud}
                  color="cyan"
                />
                <InsightCard
                  title="Packing Suggestion"
                  value={data?.packing?.essentials?.[0] || "Business casual recommended"}
                  icon={Package}
                  color="green"
                />
              </div>
            </div>

            {/* Timezone Conflicts */}
            {data?.calendar?.timezoneAnalysis?.conflicts?.length > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-yellow-800">
                  <AlertCircle className="w-5 h-5" />
                  Timezone Conflicts ({data.calendar.timezoneAnalysis.conflictCount})
                </h3>
                <div className="space-y-3">
                  {data.calendar.timezoneAnalysis.conflicts.slice(0, 3).map((conflict: any, idx: number) => (
                    <div key={idx} className="bg-white rounded-lg p-4 border border-yellow-300">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-gray-900">{conflict.event.summary}</p>
                          <p className="text-sm text-gray-600 mt-1">{conflict.reason}</p>
                        </div>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          conflict.severity === 'high' ? 'bg-red-100 text-red-700' :
                          conflict.severity === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {conflict.severity}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Sub-components
function MetricCard({ title, value, icon: Icon, trend, subtitle }: any) {
  return (
    <div className="bg-white rounded-lg p-4 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {subtitle && (
            <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
          )}
        </div>
        <div className="p-2 bg-blue-50 rounded-lg">
          <Icon className="w-5 h-5 text-blue-600" />
        </div>
      </div>
    </div>
  );
}

function PriceChart({ title, prices, color }: any) {
  const maxPrice = Math.max(...prices);
  const minPrice = Math.min(...prices);
  const avgPrice = prices.reduce((a: number, b: number) => a + b, 0) / prices.length;

  return (
    <div>
      <h4 className="text-sm font-medium text-gray-700 mb-3">{title}</h4>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">Min</span>
          <div className="flex-1 mx-3 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className={`h-full bg-${color}-400 rounded-full`}
              style={{ width: `${(minPrice / maxPrice) * 100}%` }}
            />
          </div>
          <span className="text-sm font-medium">${Math.round(minPrice)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">Avg</span>
          <div className="flex-1 mx-3 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className={`h-full bg-${color}-500 rounded-full`}
              style={{ width: `${(avgPrice / maxPrice) * 100}%` }}
            />
          </div>
          <span className="text-sm font-medium">${Math.round(avgPrice)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">Max</span>
          <div className="flex-1 mx-3 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div className={`h-full bg-${color}-600 rounded-full`} style={{ width: '100%' }} />
          </div>
          <span className="text-sm font-medium">${Math.round(maxPrice)}</span>
        </div>
      </div>
    </div>
  );
}

function QuickAction({ title, subtitle, icon: Icon, color }: any) {
  return (
    <div className={`bg-white rounded-lg p-4 shadow-sm border-l-4 border-${color}-500 hover:shadow-md transition-shadow cursor-pointer`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-700">{title}</p>
          <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
        </div>
        <Icon className={`w-5 h-5 text-${color}-600`} />
      </div>
    </div>
  );
}

function FlightCard({ flight, index }: any) {
  const isNonStop = flight.itineraries?.[0]?.stops === 0;
  
  return (
    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
      <div className="flex items-center gap-4">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
          index === 0 ? 'bg-green-100' : 'bg-blue-100'
        }`}>
          <Plane className={`w-5 h-5 ${index === 0 ? 'text-green-600' : 'text-blue-600'}`} />
        </div>
        <div>
          <p className="font-medium text-gray-900">
            {flight.airlines?.[0] || 'Unknown Airline'}
            {isNonStop && (
              <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Non-stop</span>
            )}
          </p>
          <p className="text-sm text-gray-600">
            {flight.itineraries?.[0]?.segments?.[0]?.departure?.airport} → {' '}
            {flight.itineraries?.[0]?.segments?.[flight.itineraries[0].segments.length - 1]?.arrival?.airport}
          </p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-lg font-bold text-gray-900">${flight.price?.total}</p>
        <p className="text-xs text-gray-500">{flight.bookingClass || 'Economy'}</p>
      </div>
    </div>
  );
}

function HotelCard({ hotel, index }: any) {
  // Handle location as either string or object
  const getLocation = () => {
    if (typeof hotel.location === 'string') {
      return hotel.location;
    } else if (hotel.location && typeof hotel.location === 'object') {
      // If location is an object, extract meaningful parts
      return hotel.location.district || hotel.location.address || 'City Center';
    }
    return 'City Center';
  };

  // Handle proximity info if available
  const getProximityInfo = () => {
    if (hotel.location && typeof hotel.location === 'object' && hotel.location.walkingTime) {
      return `${hotel.location.walkingTime} walk`;
    }
    return null;
  };

  return (
    <div className="bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h4 className="font-medium text-gray-900">{hotel.name}</h4>
          <p className="text-sm text-gray-600">{getLocation()}</p>
          {getProximityInfo() && (
            <p className="text-xs text-blue-600 mt-1">{getProximityInfo()}</p>
          )}
        </div>
        <div className="text-right">
          <p className="text-lg font-bold text-gray-900">
            ${typeof hotel.price === 'object' ? hotel.price.amount : hotel.price}
          </p>
          <p className="text-xs text-gray-500">
            {typeof hotel.price === 'object' ? hotel.price.period : 'per night'}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 mt-3 flex-wrap">
        {hotel.amenities?.includes('wifi') && (
          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded flex items-center gap-1">
            <Wifi className="w-3 h-3" /> WiFi
          </span>
        )}
        {hotel.amenities?.includes('parking') && (
          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded flex items-center gap-1">
            <Car className="w-3 h-3" /> Parking
          </span>
        )}
        {hotel.businessFriendly && (
          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded flex items-center gap-1">
            <Briefcase className="w-3 h-3" /> Business
          </span>
        )}
        {hotel.location?.proximityToMeetings && (
          <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
            Near Meetings
          </span>
        )}
      </div>
    </div>
  );
}

function RestaurantCard({ restaurant, index }: any) {
  // Handle location as either string or object
  const getLocation = () => {
    if (typeof restaurant.location === 'string') {
      return restaurant.location;
    } else if (restaurant.location && typeof restaurant.location === 'object') {
      return restaurant.location.address || restaurant.location.district || '';
    }
    return '';
  };

  // Handle proximity info
  const getProximityInfo = () => {
    if (restaurant.location && typeof restaurant.location === 'object') {
      if (restaurant.location.walkingTime) {
        return restaurant.location.walkingTime;
      }
      if (restaurant.location.proximityToMeetings) {
        return 'Near meeting venues';
      }
    }
    return null;
  };

  return (
    <div className="bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h4 className="font-medium text-gray-900">{restaurant.name}</h4>
          <p className="text-sm text-gray-600">{restaurant.cuisine || 'International'}</p>
          {getLocation() && (
            <p className="text-xs text-gray-500 mt-1">{getLocation()}</p>
          )}
          {getProximityInfo() && (
            <p className="text-xs text-blue-600 mt-1">{getProximityInfo()}</p>
          )}
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs text-gray-500">
              {restaurant.priceRange || restaurant.pricePerPerson ? `${restaurant.pricePerPerson}/person` : '$ - $'}
            </span>
            {restaurant.businessLunch && (
              <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                Business Lunch
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Star className="w-4 h-4 text-yellow-500 fill-current" />
          <span className="text-sm font-medium">{restaurant.rating || '4.5'}</span>
        </div>
      </div>
    </div>
  );
}

function InsightCard({ title, value, icon: Icon, color }: any) {
  return (
    <div className={`p-4 bg-${color}-50 rounded-lg border border-${color}-200`}>
      <div className="flex items-start gap-3">
        <div className={`p-2 bg-${color}-100 rounded-lg`}>
          <Icon className={`w-5 h-5 text-${color}-600`} />
        </div>
        <div>
          <p className={`text-sm font-medium text-${color}-900`}>{title}</p>
          <p className={`text-xs text-${color}-700 mt-1`}>{value}</p>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ icon: Icon, message }: any) {
  return (
    <div className="bg-white rounded-lg p-12 text-center">
      <Icon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
      <p className="text-gray-500">{message}</p>
    </div>
  );
}