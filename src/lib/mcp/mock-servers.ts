// Mock Company Directory MCP Server
export class MockCompanyMCPServer {
    async findColleagues(city: string): Promise<any[]> {
      const colleaguesByCity: { [key: string]: any[] } = {
        'london': [
          { name: 'Sarah Chen', role: 'Product Manager', office: 'London', email: 'sarah.chen@company.com' },
          { name: 'Mike Johnson', role: 'Engineering Lead', office: 'London', email: 'mike.johnson@company.com' },
          { name: 'Alex Kumar', role: 'Data Scientist', office: 'London', email: 'alex.kumar@company.com' }
        ],
        'singapore': [
          { name: 'Lisa Wong', role: 'Regional Director', office: 'Singapore', email: 'lisa.wong@company.com' },
          { name: 'David Tan', role: 'Solutions Architect', office: 'Singapore', email: 'david.tan@company.com' }
        ],
        'tokyo': [
          { name: 'Yuki Tanaka', role: 'Partnership Manager', office: 'Tokyo', email: 'yuki.tanaka@company.com' },
          { name: 'Hiroshi Sato', role: 'Product Lead', office: 'Tokyo', email: 'hiroshi.sato@company.com' }
        ]
      };
  
      const cityKey = city.toLowerCase();
      return colleaguesByCity[cityKey] || [
        { name: 'John Smith', role: 'Business Development', office: city, email: 'john.smith@company.com' }
      ];
    }
  }
  
  // Mock LinkedIn MCP Server
  export class MockLinkedInMCPServer {
    async findConnections(city: string): Promise<any[]> {
      const connectionsByCity: { [key: string]: any[] } = {
        'london': [
          { name: 'Emma Wilson', company: 'TechCorp', location: 'London', lastInteraction: '2 weeks ago', role: 'VP Engineering' },
          { name: 'James Brown', company: 'FinanceHub', location: 'London', lastInteraction: '1 month ago', role: 'Chief Technology Officer' },
          { name: 'Sophie Davis', company: 'AI Innovations', location: 'London', lastInteraction: '3 weeks ago', role: 'Head of Product' }
        ],
        'singapore': [
          { name: 'Rachel Lim', company: 'SouthEast Tech', location: 'Singapore', lastInteraction: '1 week ago', role: 'CEO' },
          { name: 'Mark Ng', company: 'Digital Solutions', location: 'Singapore', lastInteraction: '2 months ago', role: 'CTO' }
        ],
        'tokyo': [
          { name: 'Kenji Nakamura', company: 'Tokyo Innovations', location: 'Tokyo', lastInteraction: '1 month ago', role: 'Head of AI' },
          { name: 'Akiko Yamamoto', company: 'Future Systems', location: 'Tokyo', lastInteraction: '3 weeks ago', role: 'VP Product' }
        ]
      };
  
      const cityKey = city.toLowerCase();
      return connectionsByCity[cityKey] || [
        { name: 'Global Contact', company: 'International Corp', location: city, lastInteraction: '1 month ago', role: 'Director' }
      ];
    }
  }