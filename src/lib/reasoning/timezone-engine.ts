export interface CalendarEvent {
  id: string;
  summary: string;
  start: { dateTime: string; timeZone?: string };
  end: { dateTime: string; timeZone?: string };
  location?: string;
  attendees?: Array<{ email: string; name?: string }>;
  description?: string;
}

export interface TimezoneConflict {
  event: CalendarEvent;
  conflictType: 'very_early' | 'very_late' | 'outside_business_hours' | 'overlaps_travel';
  homeTime: string;
  destinationTime: string;
  severity: 'low' | 'medium' | 'high';
  reason: string;
  rescheduleOptions: RescheduleOption[];
}

export interface RescheduleOption {
  newDateTime: string;
  newTimeDescription: string;
  reason: string;
  confidence: number;
  attendeeImpact: 'minimal' | 'moderate' | 'significant';
  alternativeAction?: 'make_virtual' | 'delegate' | 'reschedule';
}

export interface TravelContext {
  destination: string;
  homeTimezone: string;
  destinationTimezone: string;
  travelDates: { start: string; end: string };
  purpose: string;
}

export class TimezoneReasoningEngine {
  private getTimezoneForCity(city: string): string {
    const cityTimezones: { [key: string]: string } = {
      'london': 'Europe/London',
      'new york': 'America/New_York',
      'san francisco': 'America/Los_Angeles',
      'tokyo': 'Asia/Tokyo',
      'singapore': 'Asia/Singapore',
      'paris': 'Europe/Paris',
      'berlin': 'Europe/Berlin',
      'sydney': 'Australia/Sydney',
      'dubai': 'Asia/Dubai',
      'amsterdam': 'Europe/Amsterdam'
    };
    
    return cityTimezones[city.toLowerCase()] || 'Europe/London';
  }

  async analyzeTimezoneConflicts(
    events: CalendarEvent[],
    travelDestination: string,
    travelDates: { start: string; end: string },
    homeTimezone: string = 'America/New_York'
  ): Promise<TimezoneConflict[]> {
    console.log('🕐 Analyzing timezone conflicts for travel to', travelDestination);
    
    const destinationTimezone = this.getTimezoneForCity(travelDestination);
    const conflicts: TimezoneConflict[] = [];
    
    // Filter events during travel period
    const travelStart = new Date(travelDates.start);
    const travelEnd = new Date(travelDates.end);
    
    const eventsToAnalyze = events.filter(event => {
      const eventDate = new Date(event.start.dateTime);
      return eventDate >= travelStart && eventDate <= travelEnd;
    });
    
    console.log(`🔍 Analyzing ${eventsToAnalyze.length} events during travel period`);
    
    for (const event of eventsToAnalyze) {
      const conflict = this.analyzeEventForConflicts(
        event,
        homeTimezone,
        destinationTimezone,
        travelDestination
      );
      
      if (conflict) {
        conflicts.push(conflict);
      }
    }
    
    // Sort by severity (high first)
    return conflicts.sort((a, b) => {
      const severityOrder = { high: 3, medium: 2, low: 1 };
      return severityOrder[b.severity] - severityOrder[a.severity];
    });
  }
  
  private analyzeEventForConflicts(
    event: CalendarEvent,
    homeTimezone: string,
    destinationTimezone: string,
    destination: string
  ): TimezoneConflict | null {
    const eventTime = new Date(event.start.dateTime);
    
    // Convert to destination timezone
    const destinationTime = new Intl.DateTimeFormat('en-US', {
      timeZone: destinationTimezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    }).format(eventTime);
    
    const homeTime = new Intl.DateTimeFormat('en-US', {
      timeZone: homeTimezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    }).format(eventTime);
    
    // Get hour in destination timezone for analysis
    const destHour = parseInt(new Intl.DateTimeFormat('en-US', {
      timeZone: destinationTimezone,
      hour: '2-digit',
      hour12: false
    }).format(eventTime));
    
    // Analyze for conflicts
    let conflictType: TimezoneConflict['conflictType'] | null = null;
    let severity: TimezoneConflict['severity'] = 'low';
    let reason = '';
    
    if (destHour < 6) {
      conflictType = 'very_early';
      severity = destHour < 4 ? 'high' : 'medium';
      reason = `Meeting at ${destinationTime} in ${destination} is very early (${destHour}:00)`;
    } else if (destHour > 22) {
      conflictType = 'very_late';
      severity = destHour > 23 ? 'high' : 'medium';
      reason = `Meeting at ${destinationTime} in ${destination} is very late (${destHour}:00)`;
    } else if (destHour < 8 || destHour > 20) {
      conflictType = 'outside_business_hours';
      severity = 'medium';
      reason = `Meeting at ${destinationTime} in ${destination} is outside typical business hours`;
    }
    
    // Check if it's a travel day
    if (this.isOnTravelDay(eventTime, event)) {
      conflictType = 'overlaps_travel';
      severity = 'high';
      reason = `Meeting conflicts with travel time to ${destination}`;
    }
    
    if (!conflictType) {
      return null; // No conflict detected
    }
    
    // Generate reschedule options
    const rescheduleOptions = this.generateRescheduleOptions(
      event,
      destHour,
      destinationTimezone,
      conflictType
    );
    
    return {
      event,
      conflictType,
      homeTime,
      destinationTime,
      severity,
      reason,
      rescheduleOptions
    };
  }
  
  private generateRescheduleOptions(
    event: CalendarEvent,
    currentDestHour: number,
    destinationTimezone: string,
    conflictType: TimezoneConflict['conflictType']
  ): RescheduleOption[] {
    const options: RescheduleOption[] = [];
    const eventDate = new Date(event.start.dateTime);
    
    // Option 1: Move to optimal business hours (9 AM - 5 PM destination time)
    if (conflictType === 'very_early' || conflictType === 'very_late') {
      const optimalHour = currentDestHour < 6 ? 9 : 14; // 9 AM or 2 PM
      const newDateTime = new Date(eventDate);
      newDateTime.setHours(optimalHour, 0, 0, 0);
      
      const newTimeDesc = new Intl.DateTimeFormat('en-US', {
        timeZone: destinationTimezone,
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        weekday: 'short',
        month: 'short',
        day: 'numeric'
      }).format(newDateTime);
      
      options.push({
        newDateTime: newDateTime.toISOString(),
        newTimeDescription: newTimeDesc,
        reason: `Optimal business hours in destination`,
        confidence: 0.9,
        attendeeImpact: 'minimal'
      });
    }
    
    // Option 2: Make it virtual
    if (conflictType !== 'overlaps_travel') {
      options.push({
        newDateTime: event.start.dateTime, // Keep same time
        newTimeDescription: 'Keep current time',
        reason: 'Convert to virtual meeting - join from destination',
        confidence: 0.8,
        attendeeImpact: 'minimal',
        alternativeAction: 'make_virtual'
      });
    }
    
    // Option 3: Move to previous/next day
    if (conflictType === 'overlaps_travel') {
      const previousDay = new Date(eventDate);
      previousDay.setDate(previousDay.getDate() - 1);
      previousDay.setHours(14, 0, 0, 0); // 2 PM day before
      
      const prevDayDesc = new Intl.DateTimeFormat('en-US', {
        timeZone: destinationTimezone,
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        weekday: 'short',
        month: 'short',
        day: 'numeric'
      }).format(previousDay);
      
      options.push({
        newDateTime: previousDay.toISOString(),
        newTimeDescription: prevDayDesc,
        reason: 'Move to day before travel',
        confidence: 0.7,
        attendeeImpact: 'moderate'
      });
    }
    
    return options;
  }
  
  private isOnTravelDay(eventTime: Date, event: CalendarEvent): boolean {
    // Simple heuristic: if event contains travel-related keywords
    const travelKeywords = ['flight', 'airport', 'travel', 'departure', 'arrival'];
    const eventText = `${event.summary} ${event.description || ''}`.toLowerCase();
    
    return travelKeywords.some(keyword => eventText.includes(keyword));
  }
  
  // Helper method for smart recommendations
  generateSmartRecommendations(conflicts: TimezoneConflict[]): string[] {
    const recommendations: string[] = [];
    
    const highSeverityCount = conflicts.filter(c => c.severity === 'high').length;
    const earlyMeetingCount = conflicts.filter(c => c.conflictType === 'very_early').length;
    const lateMeetingCount = conflicts.filter(c => c.conflictType === 'very_late').length;
    
    if (highSeverityCount > 2) {
      recommendations.push('Consider extending your trip by a day to reduce scheduling conflicts');
    }
    
    if (earlyMeetingCount > 1) {
      recommendations.push('Block morning hours for the first 2 days to adjust to timezone');
    }
    
    if (lateMeetingCount > 1) {
      recommendations.push('Suggest virtual alternatives for late evening meetings');
    }
    
    if (conflicts.length === 0) {
      recommendations.push('Great! No major timezone conflicts detected for your trip');
    }
    
    return recommendations;
  }
}