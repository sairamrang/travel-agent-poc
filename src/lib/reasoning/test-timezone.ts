import { TimezoneReasoningEngine } from './timezone-engine';

// Test data
const sampleEvents = [
  {
    id: '1',
    summary: 'Early morning standup',
    start: { dateTime: '2025-08-30T05:00:00-04:00' },
    end: { dateTime: '2025-08-30T05:30:00-04:00' },
    attendees: [{ email: 'team@company.com' }]
  },
  {
    id: '2', 
    summary: 'Client presentation',
    start: { dateTime: '2025-08-31T23:00:00-04:00' },
    end: { dateTime: '2025-09-01T00:00:00-04:00' },
    attendees: [{ email: 'client@external.com' }]
  }
];

export async function testTimezoneReasoning() {
  const engine = new TimezoneReasoningEngine();
  
  const conflicts = await engine.analyzeTimezoneConflicts(
    sampleEvents,
    'London',
    { start: '2025-08-30', end: '2025-09-05' }
  );
  
  console.log('Timezone Conflicts Found:', conflicts);
  
  const recommendations = engine.generateSmartRecommendations(conflicts);
  console.log('Smart Recommendations:', recommendations);
}