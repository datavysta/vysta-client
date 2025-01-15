import { VystaClient } from '../src/VystaClient';
import { ProductService } from './querying/services';

const client = new VystaClient({
  baseUrl: 'http://localhost:8080'
});

const products = new ProductService(client);

// Get URL parameters
const urlParams = new URLSearchParams(window.location.search);
const token = urlParams.get('Token');
const redirectUrl = urlParams.get('RedirectUrl');

if (token) {
  (async () => {
    console.log('[OAuth] Processing authentication redirect...');
    try {
      const authResult = await client.exchangeToken(token);
      console.log('[OAuth] Authentication successful, session initialized');
      
      // Log the intended redirect URL
      console.log('[OAuth] Original redirect destination was:', redirectUrl || 'none specified');

      // Test authentication by making a sample request
      try {
        const response = await products.getAll({ recordCount: true });
        console.log('[OAuth] Authentication test:', 
          response.data.length > 0 
            ? `PASSED (${response.count} total products)` 
            : 'FAILED (no products found)');
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