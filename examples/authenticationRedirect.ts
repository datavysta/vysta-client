import { VystaClient } from '../src/VystaClient';

const client = new VystaClient({
  baseUrl: 'http://localhost:8080',
});

// Get URL parameters
const urlParams = new URLSearchParams(window.location.search);
const token = urlParams.get('Token');
const redirectUrl = urlParams.get('RedirectUrl');

if (token) {
  (async () => {
    console.log('[OAuth] Processing authentication redirect...');
    try {
      await client.exchangeToken(token);
      console.log('[OAuth] Authentication successful, session initialized');

      // Log the intended redirect URL
      console.log('[OAuth] Original redirect destination was:', redirectUrl || 'none specified');

      // Test authentication by making a sample request
      try {
        const profile = await client.getUserProfile();
        console.log(
          '[OAuth] Authentication test:',
          profile ? `PASSED (Logged in as ${profile.name})` : 'FAILED (no profile found)',
        );
      } catch (error) {
        console.error('[OAuth] Authentication test failed:', error);
      }

      // Redirect back to auth test page
      window.location.replace('/auth/auth.html');
    } catch (error) {
      console.error('[OAuth] Authentication failed:', error);
      // Still redirect back to auth page to show error state
      window.location.replace('/auth/auth.html');
    }
  })();
} else {
  console.error('[OAuth] No token provided in redirect');
  window.location.replace('/auth/auth.html');
}
