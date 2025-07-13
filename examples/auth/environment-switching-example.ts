import { VystaClient, EnvironmentAvailable } from 'vysta-client';
import { CustomerService } from '../querying/services';

const client = new VystaClient({
  baseUrl: 'http://localhost:8080',
});

// Initialize customer service for testing
const customerService = new CustomerService(client);

// Create and append HTML elements
const container = document.createElement('div');
container.innerHTML = `
  <div style="max-width: 600px; margin: 40px auto; padding: 20px;">
    <h2>Environment Switching Example</h2>
    
    <!-- Auth Status -->
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
      <div id="authStatus" style="flex-grow: 1; padding: 10px; background: #f3f4f6; border-radius: 4px;">
        Checking authentication status...
      </div>
      <button id="logoutButton" style="margin-left: 10px; padding: 10px; background: #ef4444; color: white; border: none; border-radius: 4px; display: none;">
        Logout
      </button>
    </div>

    <!-- Current Environment Info -->
    <div id="currentEnvironment" style="margin-bottom: 20px; padding: 15px; background: #e0f2fe; border-radius: 4px;">
      <h3 style="margin: 0 0 10px 0; color: #0369a1;">Current Environment</h3>
      <div id="currentEnvInfo">Not authenticated</div>
    </div>

    <!-- Login Form -->
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
        Sign in
      </button>
    </form>

    <!-- Available Environments -->
    <div id="environmentsSection" style="display: none;">
      <h3 style="color: #374151;">Available Environments</h3>
      <div style="margin-bottom: 15px; display: flex; gap: 10px;">
        <button id="loadEnvironments" style="padding: 10px; background: #10b981; color: white; border: none; border-radius: 4px;">
          Load Available Environments
        </button>
        <button id="testCustomers" style="padding: 10px; background: #f59e0b; color: white; border: none; border-radius: 4px;">
          Test Customers Query
        </button>
      </div>
      <div id="environments" style="display: flex; flex-direction: column; gap: 10px;"></div>
    </div>

    <!-- Status Messages -->
    <div id="status" style="margin-top: 20px; padding: 10px;"></div>

    <!-- Debug Information -->
    <div id="debugInfo" style="margin-top: 20px; padding: 15px; background: #f9fafb; border-radius: 4px; font-family: monospace; font-size: 12px; display: none;">
      <h4 style="margin: 0 0 10px 0;">Debug Information</h4>
      <div id="debugContent"></div>
    </div>
  </div>
`;

document.body.appendChild(container);

// Get DOM elements
const loginForm = document.getElementById('loginForm') as HTMLFormElement;
const environmentsSection = document.getElementById('environmentsSection')!;
const environmentsContainer = document.getElementById('environments')!;
const statusDiv = document.getElementById('status')!;
const logoutButton = document.getElementById('logoutButton')!;
const loadEnvironmentsButton = document.getElementById('loadEnvironments')!;
const testCustomersButton = document.getElementById('testCustomers')!;
const currentEnvInfo = document.getElementById('currentEnvInfo')!;
const debugInfo = document.getElementById('debugInfo')!;
const debugContent = document.getElementById('debugContent')!;

// Helper function to show status
function showStatus(message: string, isError = false) {
  statusDiv.textContent = message;
  statusDiv.style.color = isError ? 'red' : '#22c55e';
}

// Helper function to show debug info
function showDebugInfo(info: any) {
  debugContent.innerHTML = `<pre>${JSON.stringify(info, null, 2)}</pre>`;
  debugInfo.style.display = 'block';
}

// Helper function to update current environment display
function updateCurrentEnvironmentDisplay() {
  const currentEnv = client['auth'].getCurrentEnvironmentInfo();
  if (currentEnv) {
    currentEnvInfo.innerHTML = `
      <div><strong>Tenant ID:</strong> ${currentEnv.tenantId}</div>
      <div><strong>Environment ID:</strong> ${currentEnv.envId}</div>
      <div><strong>Current Host:</strong> ${client['baseUrl']}</div>
    `;
  } else {
    currentEnvInfo.textContent = 'Not authenticated';
  }
}

// Handle login
loginForm.addEventListener('submit', async e => {
  e.preventDefault();
  const email = (document.getElementById('email') as HTMLInputElement).value;
  const password = (document.getElementById('password') as HTMLInputElement).value;

  try {
    showStatus('Logging in...');
    const result = await client.login(email, password);
    showStatus(`Logged in successfully!`);
    await checkAuthStatus();
    
    // Show debug info for the login result
    showDebugInfo({
      message: 'Login successful',
      accessTokenPreview: result.accessToken.slice(0, 20) + '...',
      host: result.host,
      principal: result.principal
    });
  } catch (error) {
    showStatus(`Login failed: ${error instanceof Error ? error.message : String(error)}`, true);
  }
});

// Load available environments
loadEnvironmentsButton.addEventListener('click', async () => {
  try {
    showStatus('Loading available environments...');
    const environments = await client['auth'].getAvailableEnvironments();
    
    showStatus(`Found ${environments.length} available environments`);
    
    // Clear existing environments
    environmentsContainer.innerHTML = '';
    
    // Group environments by tenant
    const environmentsByTenant = environments.reduce((acc, env) => {
      if (!acc[env.tenantName]) {
        acc[env.tenantName] = [];
      }
      acc[env.tenantName].push(env);
      return acc;
    }, {} as Record<string, EnvironmentAvailable[]>);
    
    // Display environments grouped by tenant
    (Object.entries(environmentsByTenant) as [string, EnvironmentAvailable[]][]).forEach(([tenantName, envs]) => {
      const tenantSection = document.createElement('div');
      tenantSection.style.cssText = 'margin-bottom: 15px; padding: 10px; border: 1px solid #e5e7eb; border-radius: 4px;';
      
      const tenantHeader = document.createElement('h4');
      tenantHeader.textContent = tenantName;
      tenantHeader.style.cssText = 'margin: 0 0 10px 0; color: #374151;';
      tenantSection.appendChild(tenantHeader);
      
      envs.forEach(env => {
        const envButton = document.createElement('button');
        envButton.textContent = `${env.environmentName} (${env.host})`;
        envButton.style.cssText = 'margin: 2px; padding: 8px 12px; background: #f3f4f6; border: 1px solid #d1d5db; border-radius: 4px; cursor: pointer;';
        
        // Add hover effect
        envButton.addEventListener('mouseenter', () => {
          envButton.style.background = '#e5e7eb';
        });
        envButton.addEventListener('mouseleave', () => {
          envButton.style.background = '#f3f4f6';
        });
        
        // Handle environment switch
        envButton.addEventListener('click', async () => {
          await switchToEnvironment(env);
        });
        
        tenantSection.appendChild(envButton);
      });
      
      environmentsContainer.appendChild(tenantSection);
    });
    
    // Show debug info for available environments
    showDebugInfo({
      message: 'Available environments loaded',
      count: environments.length,
      environments: environments
    });
    
  } catch (error) {
    showStatus(`Failed to load environments: ${error instanceof Error ? error.message : String(error)}`, true);
  }
});

// Test customers query
testCustomersButton.addEventListener('click', async () => {
  try {
    showStatus('Testing customers query...');
    
    // Query customers with a small limit to test connectivity
    const result = await customerService.getAll({
      limit: 5,
      recordCount: true
    });
    
    showStatus(`✅ Customers query successful! Found ${result.count} total customers, retrieved ${result.data.length} records`);
    
    // Show debug info
    showDebugInfo({
      message: 'Customers query successful',
      totalCount: result.count,
      retrievedCount: result.data.length,
      currentEnvironment: client['auth'].getCurrentEnvironmentInfo(),
      currentHost: client['baseUrl'],
      sampleData: result.data.slice(0, 2) // Show first 2 records
    });
    
  } catch (error) {
    showStatus(`❌ Customers query failed: ${error instanceof Error ? error.message : String(error)}`, true);
    
    showDebugInfo({
      message: 'Customers query failed',
      error: error instanceof Error ? error.message : String(error),
      currentEnvironment: client['auth'].getCurrentEnvironmentInfo(),
      currentHost: client['baseUrl']
    });
  }
});

// Switch to a specific environment
async function switchToEnvironment(environment: EnvironmentAvailable) {
  try {
    showStatus(`Switching to ${environment.environmentName}...`);
    
    // Step 1: Get exchange token
    const exchangeToken = await client['auth'].switchEnvironment(environment.tenantId, environment.environmentId);
    
    showStatus(`Got exchange token, preparing to switch...`);
    
    // Step 2: Construct redirect URL (simulate the redirect process)
    const redirectUrl = client['auth'].constructAuthenticationRedirectUrl(
      exchangeToken,
      environment.host,
      '/examples/auth/environment-switching.html'
    );
    
    showDebugInfo({
      message: 'Environment switch initiated',
      targetEnvironment: environment,
      exchangeToken: exchangeToken.slice(0, 20) + '...',
      redirectUrl: redirectUrl
    });
    
    // Step 3: Simulate the redirect by exchanging the token directly
    // In a real application, you would redirect to the URL above
    showStatus('Exchanging token for new authentication...');
    
    const newAuthResult = await client['auth'].exchangeToken(exchangeToken);
    
    // Step 4: Update the client's host
    client.setHost(environment.host);
    
    showStatus(`Successfully switched to ${environment.environmentName}!`);
    
    // Update the current environment display
    updateCurrentEnvironmentDisplay();
    
    // Show debug info for the successful switch
    showDebugInfo({
      message: 'Environment switch completed',
      newEnvironment: environment,
      newAuthResult: {
        accessTokenPreview: newAuthResult.accessToken.slice(0, 20) + '...',
        host: newAuthResult.host,
        principal: newAuthResult.principal
      },
      newClientHost: client['baseUrl']
    });
    
  } catch (error) {
    showStatus(`Environment switch failed: ${error instanceof Error ? error.message : String(error)}`, true);
    
    showDebugInfo({
      message: 'Environment switch failed',
      error: error instanceof Error ? error.message : String(error),
      targetEnvironment: environment
    });
  }
}

// Check if we're handling an authentication redirect
const urlParams = new URLSearchParams(window.location.search);
const token = urlParams.get('Token');
const redirectUrl = urlParams.get('RedirectUrl');

if (token) {
  // Handle authentication redirect (from environment switch)
  (async () => {
    try {
      showStatus('Processing authentication redirect...');
      await client['auth'].exchangeToken(token);
      showStatus('Authentication redirect successful!');
      
      if (redirectUrl) {
        window.location.replace(redirectUrl);
      } else {
        await checkAuthStatus();
      }
    } catch (error) {
      showStatus(`Authentication redirect failed: ${error instanceof Error ? error.message : String(error)}`, true);
    }
  })();
}

// Logout handler
logoutButton.addEventListener('click', async () => {
  await client.logout();
  await checkAuthStatus();
  showStatus('Logged out successfully');
  environmentsSection.style.display = 'none';
  debugInfo.style.display = 'none';
});

// Check authentication status
async function checkAuthStatus() {
  const authStatus = document.getElementById('authStatus')!;
  try {
    const profile = await client.getUserProfile();
    authStatus.textContent = `Welcome, ${profile.name}`;
    authStatus.style.background = '#dcfce7';
    authStatus.style.color = '#166534';
    logoutButton.style.display = 'block';
    environmentsSection.style.display = 'block';
    
    updateCurrentEnvironmentDisplay();
  } catch {
    authStatus.textContent = 'Not authenticated';
    authStatus.style.background = '#fee2e2';
    authStatus.style.color = '#991b1b';
    logoutButton.style.display = 'none';
    environmentsSection.style.display = 'none';
    currentEnvInfo.textContent = 'Not authenticated';
  }
}

// Initialize
checkAuthStatus(); 