import { VystaClient } from '../../src/VystaClient';

async function oauthExample() {
  const client = new VystaClient({
    baseUrl: 'http://localhost:8080',
  });

  try {
    // 1. Get available sign-in methods
    const signInMethods = await client.getSignInMethods();
    console.log('Available sign-in methods:', signInMethods);

    // 2. Get authorization URL (in real app, this would be triggered by button click)
    const oktaSignIn = signInMethods.find(m => m.name === 'Okta');
    if (oktaSignIn) {
      const authUrl = await client.getAuthorizeUrl(oktaSignIn.id);
      console.log('Redirect URL:', authUrl);
      // In real app: window.location.href = authUrl;
    }

    // 3. Handle redirect (in real app, this would be in your redirect route handler)
    const mockToken = 'mock-token-from-redirect';
    const authResult = await client.handleAuthenticationRedirect(mockToken);
    console.log('Authenticated:', authResult);
  } catch (error) {
    console.error('Error:', error);
  }
}

// Run example
oauthExample();
