import { google } from 'googleapis';

export interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  start: {
    dateTime: string;
    timeZone?: string;
  };
  end: {
    dateTime: string;
    timeZone?: string;
  };
}

export interface TravelContext {
  destination?: string;
  startDate?: string;
  endDate?: string;
  purpose?: string;
  events: CalendarEvent[];
}

export class GoogleCalendarMCPServer {
  private calendar;

  constructor(accessToken: string) {
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });
    this.calendar = google.calendar({ version: 'v3', auth });
  }

  async extractTravelEvents(timeMin?: string, timeMax?: string): Promise<TravelContext> {
    try {
      // Get events from today to next 15 days (or use provided dates)
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()); // Start of today
      const next15Days = new Date(today.getTime() + 15 * 24 * 60 * 60 * 1000); // 15 days from today

      const response = await this.calendar.events.list({
        calendarId: 'primary',
        timeMin: timeMin || today.toISOString(),
        timeMax: timeMax || next15Days.toISOString(),
        singleEvents: true,
        orderBy: 'startTime',
        maxResults: 50,
      });

        const events = response.data.items || [];

        // Debug: Log all events found
        console.log('🔍 === CALENDAR DEBUG INFO ===');
        console.log('📅 Search range:', today.toISOString(), 'to', next15Days.toISOString());
        console.log('📋 Total events found:', events.length);
        console.log('📝 All events details:');

        events.forEach((event, index) => {
        console.log(`Event ${index + 1}:`, {
            summary: event.summary,
            description: event.description,
            location: event.location,
            start: event.start?.dateTime || event.start?.date,
            end: event.end?.dateTime || event.end?.date
        });
        });

        // Filter for travel-related events
        const travelEvents = events.filter(event => {
            const isTravel = this.isTravelEvent(event.summary || '', event.description || '', event.location || '');
            console.log(`🔎 Event "${event.summary}" - Travel event? ${isTravel}`);
            return isTravel;
        });

        console.log('✈️ Travel events found:', travelEvents.length);
        console.log('=== END CALENDAR DEBUG ===');

      // Extract travel context from the most relevant event
      const context = this.extractTravelContext(travelEvents);

      return {
        ...context,
        events: travelEvents.map(event => ({
          id: event.id!,
          summary: event.summary || '',
          description: event.description,
          location: event.location,
          start: {
            dateTime: event.start?.dateTime || event.start?.date || '',
            timeZone: event.start?.timeZone
          },
          end: {
            dateTime: event.end?.dateTime || event.end?.date || '',
            timeZone: event.end?.timeZone
          }
        }))
      };
    } catch (error) {
      console.error('Error fetching calendar events:', error);
      throw new Error('Failed to fetch calendar events');
    }
  }

  private isTravelEvent(summary: string, description: string, location: string): boolean {
    const travelKeywords = [
      'travel', 'trip', 'flight', 'conference', 'summit', 'meeting',
      'visit', 'vacation', 'business trip', 'convention', 'workshop',
      'training', 'seminar', 'client meeting', 'site visit', 'demo',
      // Add more flexible keywords
      'london', 'paris', 'tokyo', 'singapore', 'new york', 'berlin',
      'business', 'work', 'client', 'project', 'presentation'
    ];
  
    const text = `${summary} ${description} ${location}`.toLowerCase();
    console.log(`🔍 Checking text: "${text}"`);
    
    const matches = travelKeywords.filter(keyword => text.includes(keyword));
    console.log(`🎯 Matching keywords: [${matches.join(', ')}]`);
    
    return matches.length > 0;
  }

  private extractTravelContext(events: any[]): Partial<TravelContext> {
    if (events.length === 0) return {};

    // Find the most relevant/upcoming travel event
    const now = new Date();
    const upcomingEvents = events.filter(event => 
      new Date(event.start?.dateTime || event.start?.date) > now
    );
    
    const relevantEvent = upcomingEvents[0] || events[0];
    
    if (!relevantEvent) return {};

    return {
      destination: this.extractDestination(relevantEvent.location || relevantEvent.summary || ''),
      startDate: relevantEvent.start?.dateTime || relevantEvent.start?.date,
      endDate: relevantEvent.end?.dateTime || relevantEvent.end?.date,
      purpose: relevantEvent.summary
    };
  }

  private extractDestination(text: string): string {
    // Simple destination extraction - look for city names or locations
    const cities = ['London', 'New York', 'San Francisco', 'Tokyo', 'Singapore', 'Berlin', 'Paris', 'Sydney', 'Dubai', 'Amsterdam'];
    const lowerText = text.toLowerCase();
    
    for (const city of cities) {
      if (lowerText.includes(city.toLowerCase())) {
        return city;
      }
    }
    
    // If no known city found, try to extract from location field
    if (text.includes(',')) {
      return text.split(',')[0].trim();
    }
    
    return text.trim() || 'Unknown';
  }

  async createMeeting(summary: string, start: string, end: string, attendees: string[] = []): Promise<CalendarEvent> {
    try {
      const response = await this.calendar.events.insert({
        calendarId: 'primary',
        requestBody: {
          summary,
          start: { dateTime: start },
          end: { dateTime: end },
          attendees: attendees.map(email => ({ email }))
        }
      });

      return {
        id: response.data.id!,
        summary: response.data.summary!,
        location: response.data.location,
        start: {
          dateTime: response.data.start!.dateTime!,
          timeZone: response.data.start!.timeZone
        },
        end: {
          dateTime: response.data.end!.dateTime!,
          timeZone: response.data.end!.timeZone
        }
      };
    } catch (error) {
      console.error('Error creating calendar event:', error);
      throw new Error('Failed to create calendar event');
    }
  }
}