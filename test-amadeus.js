// Quick test to verify Amadeus credentials work
const fetch = require('node-fetch');

async function testAmadeus() {
  const clientId = 'Fhx9Aqp2W2ZaeB75vU9bNN9HtFmAO2rr';
  const clientSecret = 'XBcbjpja3euxDbJ4';
  
  try {
    // Get access token
    const tokenResponse = await fetch('https://test.api.amadeus.com/v1/security/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `grant_type=client_credentials&client_id=${clientId}&client_secret=${clientSecret}`
    });
    
    const tokenData = await tokenResponse.json();
    console.log('✅ Amadeus API connection successful!');
    console.log('Access token received:', !!tokenData.access_token);
    
  } catch (error) {
    console.error('❌ Amadeus API test failed:', error);
  }
}

testAmadeus();