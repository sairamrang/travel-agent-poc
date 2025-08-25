// src/lib/mcp/weather-mcp-server.ts
export interface WeatherDay {
    date: string;
    high: number;
    low: number;
    condition: string;
    icon: string;
    rainProbability: number;
    humidity: number;
    windSpeed: number;
    uvIndex: number;
    sunrise: string;
    sunset: string;
  }
  
  export interface PackingRecommendation {
    category: string;
    items: string[];
    priority: 'essential' | 'recommended' | 'optional';
    reason: string;
  }
  
  export interface WeatherForecast {
    location: string;
    timezone: string;
    current: {
      temperature: number;
      condition: string;
      icon: string;
      feelsLike: number;
      humidity: number;
      windSpeed: number;
      visibility: number;
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
  
  export class WeatherMCPServer {
    async getWeatherForecast(params: {
      destination: string;
      startDate: string;
      endDate: string;
      units?: 'celsius' | 'fahrenheit';
    }) {
      try {
        console.log('🌤️ Weather MCP: Getting forecast for:', params);
  
        // In production, this would integrate with OpenWeatherMap API or similar
        const forecast = this.generateWeatherForecast(params);
  
        return {
          tool: 'weather_forecast',
          status: 'success',
          forecast,
          destination: params.destination,
          searchParams: params
        };
  
      } catch (error) {
        console.error('❌ Weather MCP forecast failed:', error);
        return {
          tool: 'weather_forecast',
          status: 'error',
          error: error.message,
          searchParams: params
        };
      }
    }
  
    async getPackingRecommendations(params: {
      destination: string;
      weatherForecast: WeatherDay[];
      tripPurpose: 'business' | 'leisure' | 'mixed';
      duration: number;
    }) {
      try {
        console.log('🧳 Packing MCP: Generating recommendations for:', params);
  
        const packingList = this.generateIntelligentPackingList(params);
  
        return {
          tool: 'packing_recommendations',
          status: 'success',
          recommendations: packingList,
          destination: params.destination,
          searchParams: params
        };
  
      } catch (error) {
        console.error('❌ Packing recommendations failed:', error);
        return {
          tool: 'packing_recommendations',
          status: 'error',
          error: error.message,
          searchParams: params
        };
      }
    }
  
    private generateWeatherForecast(params: any): WeatherForecast {
      const destination = params.destination.toLowerCase();
      
      // Weather patterns by destination and season
      const weatherData = {
        'london': {
          pattern: 'Variable with frequent rain',
          avgHigh: 18,
          avgLow: 12,
          rainChance: 60,
          conditions: ['Partly Cloudy', 'Light Rain', 'Overcast', 'Sunny', 'Drizzle']
        },
        'paris': {
          pattern: 'Mild with occasional showers',
          avgHigh: 22,
          avgLow: 14,
          rainChance: 40,
          conditions: ['Sunny', 'Partly Cloudy', 'Light Rain', 'Clear', 'Overcast']
        },
        'new york': {
          pattern: 'Warm with humidity',
          avgHigh: 26,
          avgLow: 19,
          rainChance: 35,
          conditions: ['Sunny', 'Partly Cloudy', 'Thunderstorms', 'Clear', 'Humid']
        },
        'tokyo': {
          pattern: 'Hot and humid with rain',
          avgHigh: 28,
          avgLow: 22,
          rainChance: 50,
          conditions: ['Humid', 'Thunderstorms', 'Partly Cloudy', 'Rain', 'Hot']
        }
      };
  
      const cityWeather = weatherData[destination] || weatherData['london'];
      
      // Generate daily forecast
      const startDate = new Date(params.startDate);
      const endDate = new Date(params.endDate);
      const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      
      const daily: WeatherDay[] = Array.from({ length: Math.min(days, 7) }, (_, i) => {
        const date = new Date(startDate);
        date.setDate(date.getDate() + i);
        
        const tempVariation = (Math.random() - 0.5) * 8; // ±4 degrees variation
        const rainVar = Math.random() * 40; // 0-40% variation
        
        return {
          date: date.toISOString().split('T')[0],
          high: Math.round(cityWeather.avgHigh + tempVariation),
          low: Math.round(cityWeather.avgLow + tempVariation),
          condition: cityWeather.conditions[Math.floor(Math.random() * cityWeather.conditions.length)],
          icon: this.getWeatherIcon(cityWeather.conditions[0]),
          rainProbability: Math.min(100, Math.max(0, cityWeather.rainChance + rainVar)),
          humidity: Math.round(60 + Math.random() * 30),
          windSpeed: Math.round(10 + Math.random() * 15),
          uvIndex: Math.round(3 + Math.random() * 5),
          sunrise: '06:30',
          sunset: '19:45'
        };
      });
  
      const avgHigh = Math.round(daily.reduce((sum, day) => sum + day.high, 0) / daily.length);
      const avgLow = Math.round(daily.reduce((sum, day) => sum + day.low, 0) / daily.length);
      const totalRainDays = daily.filter(day => day.rainProbability > 50).length;
  
      const packingRecommendations = this.generatePackingRecommendations({
        avgHigh,
        avgLow,
        totalRainDays,
        destination,
        weatherPattern: cityWeather.pattern
      });
  
      return {
        location: params.destination,
        timezone: this.getTimezone(destination),
        current: {
          temperature: daily[0]?.high || 20,
          condition: daily[0]?.condition || 'Partly Cloudy',
          icon: daily[0]?.icon || '⛅',
          feelsLike: (daily[0]?.high || 20) + 2,
          humidity: daily[0]?.humidity || 65,
          windSpeed: daily[0]?.windSpeed || 12,
          visibility: 10
        },
        daily,
        summary: {
          avgHigh,
          avgLow,
          totalRainDays,
          weatherPattern: cityWeather.pattern,
          packingAdvice: this.generatePackingAdvice(avgHigh, avgLow, totalRainDays)
        },
        packingRecommendations
      };
    }
  
    private generatePackingRecommendations(weatherSummary: any): PackingRecommendation[] {
      const { avgHigh, avgLow, totalRainDays, destination } = weatherSummary;
      const recommendations: PackingRecommendation[] = [];
  
      // Temperature-based clothing
      if (avgHigh > 25) {
        recommendations.push({
          category: 'Summer Clothing',
          items: ['Lightweight shirts', 'Breathable pants', 'Shorts', 'Sundresses', 'Sandals'],
          priority: 'essential',
          reason: `High temperatures averaging ${avgHigh}°C require breathable, light fabrics`
        });
      } else if (avgHigh > 15) {
        recommendations.push({
          category: 'Transitional Clothing',
          items: ['Long-sleeve shirts', 'Light sweater', 'Jeans', 'Comfortable walking shoes', 'Light jacket'],
          priority: 'essential',
          reason: `Moderate temperatures (${avgLow}°C - ${avgHigh}°C) require layerable clothing`
        });
      } else {
        recommendations.push({
          category: 'Cool Weather Clothing',
          items: ['Warm sweaters', 'Heavy jacket', 'Long pants', 'Closed-toe shoes', 'Scarf'],
          priority: 'essential',
          reason: `Cool temperatures averaging ${avgHigh}°C require warm layers`
        });
      }
  
      // Rain protection
      if (totalRainDays > 2) {
        recommendations.push({
          category: 'Rain Protection',
          items: ['Waterproof jacket', 'Compact umbrella', 'Waterproof shoes', 'Quick-dry clothes'],
          priority: 'essential',
          reason: `${totalRainDays} days with rain expected - stay dry and comfortable`
        });
      } else if (totalRainDays > 0) {
        recommendations.push({
          category: 'Light Rain Gear',
          items: ['Light rain jacket', 'Small umbrella'],
          priority: 'recommended',
          reason: `Some rain expected - be prepared for light showers`
        });
      }
  
      // Business travel additions
      recommendations.push({
        category: 'Business Attire',
        items: ['Business suits', 'Dress shirts', 'Professional shoes', 'Ties/accessories', 'Blazer'],
        priority: 'essential',
        reason: 'Professional meetings require appropriate business attire'
      });
  
      // Destination-specific items
      if (destination.includes('london')) {
        recommendations.push({
          category: 'London Essentials',
          items: ['Comfortable walking shoes', 'Layers for tube travel', 'Compact umbrella'],
          priority: 'recommended',
          reason: 'London requires lots of walking and variable indoor/outdoor temperatures'
        });
      }
  
      // General travel essentials
      recommendations.push({
        category: 'Travel Essentials',
        items: ['Comfortable shoes', 'Phone charger', 'Adapter plugs', 'Toiletries', 'Medications'],
        priority: 'essential',
        reason: 'Standard travel necessities for any trip'
      });
  
      return recommendations;
    }
  
    private generateIntelligentPackingList(params: any): PackingRecommendation[] {
      const { weatherForecast, tripPurpose, duration } = params;
      
      // Analyze weather patterns
      const temps = weatherForecast.map((day: WeatherDay) => day.high);
      const maxTemp = Math.max(...temps);
      const minTemp = Math.min(...weatherForecast.map((day: WeatherDay) => day.low));
      const rainDays = weatherForecast.filter((day: WeatherDay) => day.rainProbability > 50).length;
      
      return this.generatePackingRecommendations({
        avgHigh: maxTemp,
        avgLow: minTemp,
        totalRainDays: rainDays,
        destination: params.destination,
        duration
      });
    }
  
    private getWeatherIcon(condition: string): string {
      const iconMap: { [key: string]: string } = {
        'sunny': '☀️',
        'clear': '☀️',
        'partly cloudy': '⛅',
        'cloudy': '☁️',
        'overcast': '☁️',
        'light rain': '🌦️',
        'rain': '🌧️',
        'heavy rain': '⛈️',
        'thunderstorms': '⛈️',
        'drizzle': '🌦️',
        'humid': '💨',
        'hot': '🌡️'
      };
      
      return iconMap[condition.toLowerCase()] || '⛅';
    }
  
    private getTimezone(destination: string): string {
      const timezones: { [key: string]: string } = {
        'london': 'Europe/London',
        'paris': 'Europe/Paris',
        'new york': 'America/New_York',
        'tokyo': 'Asia/Tokyo',
        'singapore': 'Asia/Singapore'
      };
      
      return timezones[destination.toLowerCase()] || 'UTC';
    }
  
    private generatePackingAdvice(avgHigh: number, avgLow: number, rainDays: number): string {
      let advice = '';
      
      if (avgHigh > 25) {
        advice += 'Pack light, breathable fabrics. ';
      } else if (avgLow < 10) {
        advice += 'Bring warm layers and a heavy coat. ';
      } else {
        advice += 'Layer-friendly clothing is ideal. ';
      }
      
      if (rainDays > 2) {
        advice += 'Waterproof gear is essential. ';
      } else if (rainDays > 0) {
        advice += 'Pack a compact umbrella. ';
      }
      
      advice += 'Don\'t forget business attire for meetings.';
      
      return advice;
    }
  
    // Helper method for API integration setup
    getWeatherAPIConfig() {
      return {
        openWeatherMap: {
          baseURL: 'https://api.openweathermap.org/data/2.5',
          endpoints: {
            current: '/weather',
            forecast: '/forecast',
            oneCall: '/onecall'
          },
          requiredParams: ['appid', 'q', 'units']
        },
        weatherAPI: {
          baseURL: 'https://api.weatherapi.com/v1',
          endpoints: {
            current: '/current.json',
            forecast: '/forecast.json'
          },
          requiredParams: ['key', 'q', 'days']
        }
      };
    }
  }