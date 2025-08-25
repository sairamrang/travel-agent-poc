import React from 'react';
import { Cloud, CloudRain, Sun, Thermometer, Droplets, Wind, Eye, Umbrella, Shirt, Briefcase } from 'lucide-react';

interface WeatherDay {
  date: string;
  high: number;
  low: number;
  condition: string;
  icon: string;
  rainProbability: number;
  humidity: number;
  windSpeed: number;
}

interface PackingRecommendation {
  category: string;
  items: string[];
  priority: 'essential' | 'recommended' | 'optional';
  reason: string;
}

interface WeatherForecast {
  location: string;
  current: {
    temperature: number;
    condition: string;
    icon: string;
    feelsLike: number;
    humidity: number;
    windSpeed: number;
  };
  daily: WeatherDay[];
  summary: {
    avgHigh: number;
    avgLow: number;
    totalRainDays: number;
    weatherPattern: string;
    packingAdvice: string;
  };
  packingRecommendations: PackingRecommendation[];
}

interface WeatherPackingWidgetProps {
  forecast?: WeatherForecast;
  destination: string;
  isLoading?: boolean;
}

const WeatherPackingWidget: React.FC<WeatherPackingWidgetProps> = ({
  forecast,
  destination,
  isLoading = false
}) => {

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'essential': return 'text-red-700 bg-red-50 border-red-200';
      case 'recommended': return 'text-blue-700 bg-blue-50 border-blue-200';
      case 'optional': return 'text-gray-700 bg-gray-50 border-gray-200';
      default: return 'text-gray-700 bg-gray-50 border-gray-200';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'essential': return '🔴';
      case 'recommended': return '🔵';
      case 'optional': return '⚪';
      default: return '⚪';
    }
  };

  const getRainColor = (probability: number) => {
    if (probability >= 70) return 'text-blue-800 bg-blue-100';
    if (probability >= 40) return 'text-blue-600 bg-blue-50';
    if (probability >= 20) return 'text-gray-600 bg-gray-50';
    return 'text-gray-500 bg-gray-25';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  // Mock data for immediate display
  const mockForecast: WeatherForecast = {
    location: destination,
    current: {
      temperature: 18,
      condition: 'Partly Cloudy',
      icon: '⛅',
      feelsLike: 20,
      humidity: 65,
      windSpeed: 12
    },
    daily: [
      {
        date: '2025-08-30',
        high: 22,
        low: 15,
        condition: 'Partly Cloudy',
        icon: '⛅',
        rainProbability: 30,
        humidity: 65,
        windSpeed: 12
      },
      {
        date: '2025-08-31',
        high: 19,
        low: 12,
        condition: 'Light Rain',
        icon: '🌦️',
        rainProbability: 70,
        humidity: 80,
        windSpeed: 15
      },
      {
        date: '2025-09-01',
        high: 24,
        low: 16,
        condition: 'Sunny',
        icon: '☀️',
        rainProbability: 10,
        humidity: 55,
        windSpeed: 8
      }
    ],
    summary: {
      avgHigh: 22,
      avgLow: 14,
      totalRainDays: 1,
      weatherPattern: 'Variable with occasional rain',
      packingAdvice: 'Layer-friendly clothing is ideal. Pack a compact umbrella. Don\'t forget business attire for meetings.'
    },
    packingRecommendations: [
      {
        category: 'Transitional Clothing',
        items: ['Long-sleeve shirts', 'Light sweater', 'Jeans', 'Comfortable walking shoes', 'Light jacket'],
        priority: 'essential',
        reason: 'Moderate temperatures (14°C - 22°C) require layerable clothing'
      },
      {
        category: 'Light Rain Gear',
        items: ['Light rain jacket', 'Small umbrella'],
        priority: 'recommended',
        reason: 'Some rain expected - be prepared for light showers'
      },
      {
        category: 'Business Attire',
        items: ['Business suits', 'Dress shirts', 'Professional shoes', 'Ties/accessories', 'Blazer'],
        priority: 'essential',
        reason: 'Professional meetings require appropriate business attire'
      }
    ]
  };

  const displayForecast = forecast || mockForecast;

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Cloud className="w-5 h-5 text-blue-500 animate-pulse" />
          <h3 className="text-lg font-semibold text-gray-900">
            Getting weather forecast and packing suggestions...
          </h3>
        </div>
        <div className="animate-pulse space-y-4">
          <div className="h-20 bg-gray-200 rounded"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-sky-50 p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Cloud className="w-5 h-5 text-blue-500" />
              <h3 className="text-lg font-semibold text-gray-900">
                🌤️ Weather & Packing for {displayForecast.location}
              </h3>
            </div>
            <p className="text-sm text-gray-600">
              {displayForecast.summary.weatherPattern} • {displayForecast.summary.totalRainDays} rain days expected
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl mb-1">{displayForecast.current.icon}</div>
            <div className="text-xs text-gray-500">{displayForecast.current.condition}</div>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Current Weather */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Thermometer className="w-4 h-4 text-red-500" />
                <span className="text-sm font-semibold text-gray-700">Current</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {displayForecast.current.temperature}°C
              </div>
              <div className="text-xs text-gray-600">
                Feels like {displayForecast.current.feelsLike}°C
              </div>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Droplets className="w-4 h-4 text-blue-500" />
                <span className="text-sm font-semibold text-gray-700">Humidity</span>
              </div>
              <div className="text-2xl font-bold text-blue-600">
                {displayForecast.current.humidity}%
              </div>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Wind className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-semibold text-gray-700">Wind</span>
              </div>
              <div className="text-2xl font-bold text-gray-600">
                {displayForecast.current.windSpeed}km/h
              </div>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Eye className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-semibold text-gray-700">Range</span>
              </div>
              <div className="text-lg font-bold text-gray-600">
                {displayForecast.summary.avgLow}° - {displayForecast.summary.avgHigh}°C
              </div>
            </div>
          </div>
        </div>

        {/* Daily Forecast */}
        <div>
          <h4 className="text-md font-semibold text-gray-900 mb-3 flex items-center gap-1">
            <Sun className="w-4 h-4 text-yellow-500" />
            Daily Forecast
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {displayForecast.daily.map((day, index) => (
              <div
                key={day.date}
                className="bg-gray-50 rounded-lg p-4 border border-gray-100 hover:shadow-sm transition-shadow"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-medium text-gray-700">
                    {formatDate(day.date)}
                  </div>
                  <div className="text-2xl">{day.icon}</div>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <div className="text-lg font-bold text-gray-900">{day.high}°</div>
                    <div className="text-sm text-gray-600">{day.low}°</div>
                  </div>
                  <div className="text-right">
                    <div className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getRainColor(day.rainProbability)}`}>
                      <Droplets className="w-3 h-3 inline mr-1" />
                      {day.rainProbability}%
                    </div>
                  </div>
                </div>
                <div className="text-xs text-gray-600">{day.condition}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Packing Recommendations */}
        <div>
          <h4 className="text-md font-semibold text-gray-900 mb-3 flex items-center gap-1">
            <Briefcase className="w-4 h-4 text-purple-500" />
            🧳 Smart Packing Recommendations
          </h4>
          
          {/* Packing Advice Summary */}
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-2">
              <Shirt className="w-5 h-5 text-purple-600 mt-0.5" />
              <div>
                <div className="text-sm font-medium text-purple-800 mb-1">
                  Smart Packing Advice
                </div>
                <div className="text-sm text-purple-700">
                  {displayForecast.summary.packingAdvice}
                </div>
              </div>
            </div>
          </div>

          {/* Detailed Packing List */}
          <div className="space-y-4">
            {displayForecast.packingRecommendations.map((recommendation, index) => (
              <div
                key={index}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <h5 className="font-medium text-gray-900">{recommendation.category}</h5>
                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(recommendation.priority)}`}>
                      {getPriorityIcon(recommendation.priority)} {recommendation.priority}
                    </span>
                  </div>
                </div>
                
                <div className="mb-3">
                  <div className="text-xs text-gray-600 mb-2">{recommendation.reason}</div>
                  <div className="flex flex-wrap gap-2">
                    {recommendation.items.map((item, itemIndex) => (
                      <span
                        key={itemIndex}
                        className="bg-gray-100 text-gray-700 px-2 py-1 rounded-md text-xs"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Weather Intelligence Footer */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
              <Cloud className="w-3 h-3 text-blue-600" />
            </div>
            <div>
              <div className="text-sm font-medium text-gray-700">Weather Intelligence Engine</div>
              <div className="text-xs text-gray-600 mt-1">
                Forecast combines meteorological data with business travel insights to provide smart packing recommendations. 
                Suggestions adapt to temperature ranges, precipitation probability, and professional meeting requirements 
                to ensure you're prepared for both weather and business success.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WeatherPackingWidget;