import { VystaClient } from 'vysta-client';

const client = new VystaClient({
  baseUrl: 'http://localhost:8080',
});

// Create and append HTML elements
const container = document.createElement('div');
container.innerHTML = `
  <div style="max-width: 400px; margin: 40px auto; padding: 20px;">
    <h2>Authentication Example</h2>
    
    <!-- Auth Status -->
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
      <div id="authStatus" style="flex-grow: 1; padding: 10px; background: #f3f4f6; border-radius: 4px;">
        Checking authentication status...
      </div>
      <button id="logoutButton" style="margin-left: 10px; padding: 10px; background: #ef4444; color: white; border: none; border-radius: 4px; display: none;">
        Logout
      </button>
    </div>

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

    <!-- OAuth Providers -->
    <div id="providers" style="display: flex; flex-direction: column; gap: 10px;"></div>

    <!-- Status Messages -->
    <div id="status" style="margin-top: 20px; padding: 10px;"></div>

    <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
    <!-- Signup Form -->
    <div style="margin-bottom: 0;">
      <form id="signupForm" style="margin-bottom: 10px;">
        <div style="margin-bottom: 10px;">
          <label>Signup Email:</label>
          <input type="email" id="signupEmail" required style="width: 100%; padding: 8px;">
        </div>
        <div style="margin-bottom: 10px;">
          <label>Redirect URL:</label>
          <input type="url" id="signupRedirectUrl" required value="https://example.com/redirect" style="width: 100%; padding: 8px;">
        </div>
        <button type="submit" style="width: 100%; padding: 10px; background: #22c55e; color: white; border: none; border-radius: 4px;">
          Sign up
        </button>
      </form>
    </div>
  </div>
`;

document.body.appendChild(container);

// Get DOM elements
const loginForm = document.getElementById('loginForm') as HTMLFormElement;
const providersContainer = document.getElementById('providers')!;
const statusDiv = document.getElementById('status')!;
const logoutButton = document.getElementById('logoutButton')!;
const signupForm = document.getElementById('signupForm') as HTMLFormElement;
const signupEmail = document.getElementById('signupEmail') as HTMLInputElement;
const signupRedirectUrl = document.getElementById('signupRedirectUrl') as HTMLInputElement;

// Helper function to show status
function showStatus(message: string, isError = false) {
  statusDiv.textContent = message;
  statusDiv.style.color = isError ? 'red' : '#22c55e'; // Green for success, red for error
}

// Handle password login
loginForm.addEventListener('submit', async e => {
  e.preventDefault();
  const email = (document.getElementById('email') as HTMLInputElement).value;
  const password = (document.getElementById('password') as HTMLInputElement).value;

  try {
    showStatus('Logging in...');
    const result = await client.login(email, password);
    showStatus(`Logged in successfully! Token: ${result.accessToken.slice(0, 20)}...`);
    await checkAuthStatus();
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
      button.style.cssText =
        'padding: 10px; background: white; border: 1px solid #007bff; color: #007bff; border-radius: 4px;';

      button.addEventListener('click', async () => {
        try {
          console.log(`[OAuth] Initiating ${provider.name} login...`);
          const url = await client.getAuthorizeUrl(provider.id);
          window.location.href = url;
        } catch (error) {
          console.error('[OAuth] Failed to get authorize URL:', error);
        }
      });

      providersContainer.appendChild(button);
    });
  } catch (error) {
    showStatus(
      `Failed to load providers: ${error instanceof Error ? error.message : String(error)}`,
      true,
    );
  }
}

// Check if we're handling a redirect
const urlParams = new URLSearchParams(window.location.search);
const token = urlParams.get('Token');
const redirectUrl = urlParams.get('RedirectUrl');

if (token) {
  // Handle OAuth redirect
  (async () => {
    console.log('[OAuth] Processing redirect with token...');
    try {
      await client.exchangeToken(token);
      console.log('[OAuth] Token exchange successful');

      if (redirectUrl) {
        console.log('[OAuth] Redirecting to:', redirectUrl);
        window.location.replace(redirectUrl || '/');
      }
    } catch (error) {
      console.error('[OAuth] Token exchange failed:', error);
    }
  })();
} else {
  // Load providers for initial page load
  loadProviders();
}

// Add logout button handler
logoutButton.addEventListener('click', async () => {
  await client.logout();
  await checkAuthStatus();
  showStatus('Logged out successfully');
});

// Update check auth status function
async function checkAuthStatus() {
  const authStatus = document.getElementById('authStatus')!;
  try {
    const profile = await client.getUserProfile();
    authStatus.textContent = `Welcome, ${profile.name}`;
    authStatus.style.background = '#dcfce7';
    authStatus.style.color = '#166534';
    logoutButton.style.display = 'block';
  } catch {
    // Removed unused _error variable
    authStatus.textContent = 'Not authenticated';
    authStatus.style.background = '#fee2e2';
    authStatus.style.color = '#991b1b';
    logoutButton.style.display = 'none';
  }
}

// Call it on load and after successful login
checkAuthStatus();

// Handle signup
signupForm.addEventListener('submit', async e => {
  e.preventDefault();
  const email = signupEmail.value;
  const redirectUrl = signupRedirectUrl.value;
  try {
    showStatus('Sending signup request...');
    await client['auth'].signup(email, redirectUrl);
    showStatus('Signup request sent! Check your email for further instructions.');
  } catch (error) {
    showStatus(`Signup failed: ${error instanceof Error ? error.message : String(error)}`, true);
  }
});
