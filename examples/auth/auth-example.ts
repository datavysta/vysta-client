import { VystaClient } from '../../src/VystaClient';
import { SignInInfo } from '../../src/VystaAuth';

const client = new VystaClient({
  baseUrl: 'http://localhost:8080',
});

// Create and append HTML elements
const container = document.createElement('div');
container.innerHTML = `
  <div style="max-width: 400px; margin: 40px auto; padding: 20px;">
    <h2>Authentication Example</h2>
    
    <!-- Password Login Form -->
    <form id="loginForm" style="margin-bottom: 20px;">
      <div style="margin-bottom: 10px;">
        <label>Email:</label>
        <input type="email" id="email" required style="width: 100%; padding: 8px;">
      </div>
      <div style="margin-bottom: 10px;">
        <label>Password:</label>
        <input type="password" id="password" required style="width: 100%; padding: 8px;">
      </div>
      <button type="submit" style="width: 100%; padding: 10px; background: #007bff; color: white; border: none; border-radius: 4px;">
        Sign in with Password
      </button>
    </form>

    <!-- Test OAuth Redirect -->
    <div style="margin: 20px 0; padding-top: 20px; border-top: 1px solid #eee;">
      <h3>Test OAuth Redirect</h3>
      <button id="testRedirect" style="width: 100%; padding: 10px; background: #f3f4f6; color: #374151; border: 1px solid #d1d5db; border-radius: 4px;">
        Simulate OAuth Redirect
      </button>
    </div>

    <!-- OAuth Providers -->
    <div id="providers" style="display: flex; flex-direction: column; gap: 10px;">
      <!-- Dynamically added provider buttons will go here -->
    </div>

    <!-- Status Messages -->
    <div id="status" style="margin-top: 20px; padding: 10px;"></div>
  </div>
`;

document.body.appendChild(container);

// Get DOM elements
const loginForm = document.getElementById('loginForm') as HTMLFormElement;
const providersContainer = document.getElementById('providers')!;
const statusDiv = document.getElementById('status')!;
const testRedirectButton = document.getElementById('testRedirect')!;

// Helper function to show status
function showStatus(message: string, isError = false) {
  statusDiv.textContent = message;
  statusDiv.style.color = isError ? 'red' : '#22c55e'; // Green for success, red for error
}

// Handle password login
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = (document.getElementById('email') as HTMLInputElement).value;
  const password = (document.getElementById('password') as HTMLInputElement).value;

  try {
    showStatus('Logging in...');
    const result = await client.login(email, password);
    showStatus(`Logged in successfully! Token: ${result.accessToken.slice(0, 20)}...`);
  } catch (error) {
    showStatus(`Login failed: ${error instanceof Error ? error.message : String(error)}`, true);
  }
});

// Load and render OAuth providers
async function loadProviders() {
  try {
    const providers = await client.getSignInMethods();
    
    providers.forEach(provider => {
      const button = document.createElement('button');
      button.textContent = `Sign in with ${provider.name}`;
      button.style.cssText = 'padding: 10px; background: white; border: 1px solid #007bff; color: #007bff; border-radius: 4px;';
      
      button.addEventListener('click', async () => {
        try {
          showStatus(`Getting authorization URL for ${provider.name}...`);
          const url = await client.getAuthorizeUrl(provider.id);
          showStatus(`Redirecting to ${provider.name}...`);
          window.location.href = url;
        } catch (error) {
          showStatus(`Failed to get authorization URL: ${error instanceof Error ? error.message : String(error)}`, true);
        }
      });

      providersContainer.appendChild(button);
    });
  } catch (error) {
    showStatus(`Failed to load providers: ${error instanceof Error ? error.message : String(error)}`, true);
  }
}

// Check if we're handling a redirect
const urlParams = new URLSearchParams(window.location.search);
const token = urlParams.get('Token');
const redirectUrl = urlParams.get('RedirectUrl');

if (token) {
  // Handle OAuth redirect
  (async () => {
    try {
      showStatus('Exchanging token...');
      const authResult = await client.exchangeToken(token);
      showStatus(`OAuth login successful! Token: ${authResult.accessToken.slice(0, 20)}...`);
      
      // Redirect if URL provided
      if (redirectUrl) {
        window.location.replace(redirectUrl || '/');
      }
    } catch (error) {
      showStatus(`Authentication failed: ${error instanceof Error ? error.message : String(error)}`, true);
    }
  })();
} else {
  // Load providers for initial page load
  loadProviders();
}

// Add the test redirect handler
testRedirectButton.addEventListener('click', () => {
  // Simulate the redirect by adding parameters to current URL
  const testToken = 'test-mock-token';
  const testRedirectUrl = '/examples/auth/auth.html';
  
  const currentUrl = new URL(window.location.href);
  currentUrl.searchParams.set('Token', testToken);
  currentUrl.searchParams.set('RedirectUrl', testRedirectUrl);
  
  // Update the URL and trigger the redirect handler
  window.location.href = currentUrl.toString();
}); 