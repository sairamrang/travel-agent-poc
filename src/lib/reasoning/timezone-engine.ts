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
  conflictType: 'very_early' | 'very_late' | 'outside_business_hours' | 'overlaps_travel' | 'timezone_mismatch' | 'business_hours_conflict';
  homeTime: string;
  destinationTime: string;
  severity: 'low' | 'medium' | 'high';
  reason: string;
  rescheduleOptions: RescheduleOption[];
  businessHoursAnalysis: {
    localStartTime: string;
    localEndTime: string;
    destinationStartTime: string;
    destinationEndTime: string;
    isWithinBusinessHours: boolean;
    businessHoursRange: string;
  };
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
    const eventEndTime = new Date(event.end.dateTime);
    
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
    
    // Get hours in destination timezone for analysis
    const destStartHour = parseInt(new Intl.DateTimeFormat('en-US', {
      timeZone: destinationTimezone,
      hour: '2-digit',
      hour12: false
    }).format(eventTime));
    
    const destEndHour = parseInt(new Intl.DateTimeFormat('en-US', {
      timeZone: destinationTimezone,
      hour: '2-digit',
      hour12: false
    }).format(eventEndTime));
    
    // Business hours analysis (8:30 AM - 5:00 PM local time)
    const businessHoursAnalysis = this.analyzeBusinessHours(
      event,
      homeTimezone,
      destinationTimezone,
      destination
    );
    
    // Analyze for conflicts
    let conflictType: TimezoneConflict['conflictType'] | null = null;
    let severity: TimezoneConflict['severity'] = 'low';
    let reason = '';
    
    // Check for business hours conflicts first
    if (!businessHoursAnalysis.isWithinBusinessHours) {
      if (destStartHour < 6) {
        conflictType = 'very_early';
        severity = destStartHour < 4 ? 'high' : 'medium';
        reason = `Meeting at ${destinationTime} in ${destination} is very early (${destStartHour}:00) - outside business hours`;
      } else if (destStartHour > 22) {
        conflictType = 'very_late';
        severity = destStartHour > 23 ? 'high' : 'medium';
        reason = `Meeting at ${destinationTime} in ${destination} is very late (${destStartHour}:00) - outside business hours`;
      } else {
        conflictType = 'business_hours_conflict';
        severity = 'medium';
        reason = `Meeting at ${destinationTime} in ${destination} is outside business hours (${businessHoursAnalysis.businessHoursRange})`;
      }
    }
    
    // Check for timezone mismatches (if event timezone doesn't match destination)
    if (event.start.timeZone && event.start.timeZone !== destinationTimezone) {
      conflictType = 'timezone_mismatch';
      severity = 'medium';
      reason = `Meeting timezone (${event.start.timeZone}) doesn't match destination timezone (${destinationTimezone})`;
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
      destStartHour,
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
      rescheduleOptions,
      businessHoursAnalysis
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
    
    // Option 1: Move to optimal business hours (8:30 AM - 5:00 PM local time)
    if (conflictType === 'very_early' || conflictType === 'very_late' || conflictType === 'business_hours_conflict') {
      // Calculate optimal time based on conflict type
      let optimalHour: number;
      if (currentDestHour < 6) {
        optimalHour = 9; // 9 AM for very early meetings
      } else if (currentDestHour > 22) {
        optimalHour = 14; // 2 PM for very late meetings
      } else {
        optimalHour = 10; // 10 AM for other business hours conflicts
      }
      
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
        reason: `Move to optimal business hours (${optimalHour}:00 AM/PM) in destination`,
        confidence: 0.9,
        attendeeImpact: 'minimal'
      });
    }
    
    // Option 2: Make it virtual (for most conflicts except travel overlaps)
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
    
    // Option 3: Move to previous/next day (for travel conflicts)
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
    
    // Option 4: Delegate meeting (for high-severity conflicts)
    if (conflictType === 'very_early' && currentDestHour < 4) {
      options.push({
        newDateTime: event.start.dateTime, // Keep same time
        newTimeDescription: 'Keep current time',
        reason: 'Consider delegating this very early meeting',
        confidence: 0.6,
        attendeeImpact: 'significant',
        alternativeAction: 'delegate'
      });
    }
    
    // Option 5: Adjust timezone settings (for timezone mismatches)
    if (conflictType === 'timezone_mismatch') {
      options.push({
        newDateTime: event.start.dateTime, // Keep same time
        newTimeDescription: 'Keep current time',
        reason: 'Update meeting timezone settings to match destination',
        confidence: 0.7,
        attendeeImpact: 'minimal'
      });
    }
    
    return options;
  }
  
  private analyzeBusinessHours(
    event: CalendarEvent,
    homeTimezone: string,
    destinationTimezone: string,
    destination: string
  ): TimezoneConflict['businessHoursAnalysis'] {
    const eventStart = new Date(event.start.dateTime);
    const eventEnd = new Date(event.end.dateTime);
    
    // Convert event times to both timezones
    const localStartTime = new Intl.DateTimeFormat('en-US', {
      timeZone: homeTimezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).format(eventStart);
    
    const localEndTime = new Intl.DateTimeFormat('en-US', {
      timeZone: homeTimezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).format(eventEnd);
    
    const destinationStartTime = new Intl.DateTimeFormat('en-US', {
      timeZone: destinationTimezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).format(eventStart);
    
    const destinationEndTime = new Intl.DateTimeFormat('en-US', {
      timeZone: destinationTimezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).format(eventEnd);
    
    // Get hours in 24-hour format for business hours check
    const localStartHour = parseInt(new Intl.DateTimeFormat('en-US', {
      timeZone: homeTimezone,
      hour: '2-digit',
      hour12: false
    }).format(eventStart));
    
    const localEndHour = parseInt(new Intl.DateTimeFormat('en-US', {
      timeZone: homeTimezone,
      hour: '2-digit',
      hour12: false
    }).format(eventEnd));
    
    // Check if within business hours (8:30 AM - 5:00 PM local time)
    const isWithinBusinessHours = localStartHour >= 8.5 && localEndHour <= 17;
    
    return {
      localStartTime,
      localEndTime,
      destinationStartTime,
      destinationEndTime,
      isWithinBusinessHours,
      businessHoursRange: '8:30 AM - 5:00 PM local time'
    };
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
    const businessHoursConflicts = conflicts.filter(c => c.conflictType === 'business_hours_conflict').length;
    const timezoneMismatches = conflicts.filter(c => c.conflictType === 'timezone_mismatch').length;
    const travelConflicts = conflicts.filter(c => c.conflictType === 'overlaps_travel').length;
    
    // High severity recommendations
    if (highSeverityCount > 2) {
      recommendations.push('🚨 Consider extending your trip by a day to reduce scheduling conflicts');
    }
    
    if (highSeverityCount > 0) {
      recommendations.push('⚠️ High-priority conflicts detected - review these meetings immediately');
    }
    
    // Business hours recommendations
    if (businessHoursConflicts > 0) {
      recommendations.push('🕐 Several meetings fall outside business hours (8:30 AM - 5:00 PM) - consider rescheduling');
    }
    
    if (earlyMeetingCount > 1) {
      recommendations.push('🌅 Block morning hours (8:30-10:00 AM) for the first 2 days to adjust to timezone');
    }
    
    if (lateMeetingCount > 1) {
      recommendations.push('🌙 Suggest virtual alternatives for late evening meetings');
    }
    
    // Timezone-specific recommendations
    if (timezoneMismatches > 0) {
      recommendations.push('🌍 Update meeting timezone settings to match your destination timezone');
    }
    
    if (travelConflicts > 0) {
      recommendations.push('✈️ Meetings conflict with travel time - consider moving to day before/after travel');
    }
    
    // Positive feedback
    if (conflicts.length === 0) {
      recommendations.push('✅ Great! No major timezone conflicts detected for your trip');
    } else if (conflicts.length <= 2) {
      recommendations.push('✅ Only minor conflicts detected - your schedule looks manageable');
    }
    
    // General business hours advice
    recommendations.push('💼 Remember: Business hours are 8:30 AM - 5:00 PM in your local timezone');
    
    return recommendations;
  }
}