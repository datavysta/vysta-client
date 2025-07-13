import { VystaClient, PasswordResetStatus, InvitationStatus } from 'vysta-client';

// Initialize the client
const client = new VystaClient({
  baseUrl: 'http://localhost:8080',
  debug: true,
});

// Global variables for demo
let currentResetEmail = '';
let currentResetCode = '';
let currentInvitationId = '';

// Utility functions
function showStatus(message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info', containerId: string = 'resetStatus') {
  const statusDiv = document.getElementById(containerId) as HTMLDivElement;
  if (statusDiv) {
    statusDiv.textContent = message;
    statusDiv.className = `status ${type}`;
    statusDiv.style.display = 'block';
    console.log(`[${type.toUpperCase()}] ${message}`);
  }
}

function updateAuthStatus() {
  const authStatusDiv = document.getElementById('authStatus') as HTMLDivElement;
  if (authStatusDiv) {
    const isAuthenticated = client['auth'].isAuthenticated();
    if (isAuthenticated) {
      authStatusDiv.textContent = 'Authenticated - Client ready for API calls';
      authStatusDiv.className = 'status success';
    } else {
      authStatusDiv.textContent = 'Not authenticated';
      authStatusDiv.className = 'status info';
    }
  }
}

function logDebugInfo(action: string, data: any) {
  const debugDiv = document.getElementById('debugInfo') as HTMLDivElement;
  if (debugDiv) {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${action}:\n${JSON.stringify(data, null, 2)}\n\n`;
    debugDiv.textContent += logEntry;
    debugDiv.scrollTop = debugDiv.scrollHeight;
  }
}

function getPasswordResetStatusMessage(status: PasswordResetStatus): string {
  switch (status) {
    case PasswordResetStatus.VALID:
      return 'Valid - Operation successful';
    case PasswordResetStatus.EXPIRED:
      return 'Expired - Code has expired';
    case PasswordResetStatus.NOT_FOUND:
      return 'Not Found - Code not found';
    case PasswordResetStatus.INVALID_CODE:
      return 'Invalid Code - Code is not valid';
    case PasswordResetStatus.COMPLETED:
      return 'Completed - Operation successful, code marked as used';
    case PasswordResetStatus.PASSWORDS_MUST_MATCH:
      return 'Passwords Must Match - Passwords do not match';
    case PasswordResetStatus.PASSWORD_REUSED:
      return 'Password Reused - Cannot reuse previous password';
    default:
      return 'Unknown status';
  }
}

function getInvitationStatusMessage(status: InvitationStatus): string {
  switch (status) {
    case InvitationStatus.VALID:
      return 'Valid - Invitation is valid';
    case InvitationStatus.EXPIRED:
      return 'Expired - Invitation has expired';
    case InvitationStatus.NOT_FOUND:
      return 'Not Found - Invitation not found';
    case InvitationStatus.ALREADY_ACCEPTED:
      return 'Already Accepted - Invitation has already been used';
    default:
      return 'Unknown status';
  }
}

// Password Reset Functions
async function forgotPassword() {
  try {
    const emailInput = document.getElementById('resetEmail') as HTMLInputElement;
    const email = emailInput.value.trim();
    
    if (!email) {
      showStatus('Please enter an email address', 'error');
      return;
    }
    
    currentResetEmail = email;
    showStatus('Sending password reset request...', 'info');
    
    logDebugInfo('FORGOT_PASSWORD_REQUEST', { email });
    
    const response = await client.forgotPassword(email);
    
    logDebugInfo('FORGOT_PASSWORD_RESPONSE', response);
    
    if (response.exists) {
      showStatus('Password reset email sent successfully! Check your email for the reset code.', 'success');
    } else {
      showStatus('User not found. Please check your email address.', 'warning');
    }
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    showStatus(`Failed to send reset email: ${errorMessage}`, 'error');
    logDebugInfo('FORGOT_PASSWORD_ERROR', { error: errorMessage });
  }
};

async function validateResetCode() {
  try {
    const codeInput = document.getElementById('resetCode') as HTMLInputElement;
    const code = codeInput.value.trim();
    
    if (!code) {
      showStatus('Please enter the reset code', 'error');
      return;
    }
    
    if (!currentResetEmail) {
      showStatus('Please initiate password reset first', 'error');
      return;
    }
    
    currentResetCode = code;
    showStatus('Validating reset code...', 'info');
    
    const requestData = {
      email: currentResetEmail,
      code: code,
    };
    
    logDebugInfo('VALIDATE_CODE_REQUEST', requestData);
    
    const response = await client.validateCode(requestData);
    
    logDebugInfo('VALIDATE_CODE_RESPONSE', response);
    
    const statusMessage = getPasswordResetStatusMessage(response.status);
    
    if (response.status === PasswordResetStatus.VALID) {
      showStatus(`Code validation successful: ${statusMessage}`, 'success');
    } else {
      showStatus(`Code validation failed: ${statusMessage}`, 'error');
    }
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    showStatus(`Failed to validate code: ${errorMessage}`, 'error');
    logDebugInfo('VALIDATE_CODE_ERROR', { error: errorMessage });
  }
};

async function changePassword() {
  try {
    const newPasswordInput = document.getElementById('newPassword') as HTMLInputElement;
    const confirmPasswordInput = document.getElementById('confirmPassword') as HTMLInputElement;
    
    const newPassword = newPasswordInput.value;
    const confirmPassword = confirmPasswordInput.value;
    
    if (!newPassword || !confirmPassword) {
      showStatus('Please enter both password fields', 'error');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      showStatus('Passwords do not match', 'error');
      return;
    }
    
    if (newPassword.length < 8) {
      showStatus('Password must be at least 8 characters long', 'error');
      return;
    }
    
    if (!currentResetEmail || !currentResetCode) {
      showStatus('Please complete the previous steps first', 'error');
      return;
    }
    
    showStatus('Changing password...', 'info');
    
    const requestData = {
      email: currentResetEmail,
      code: currentResetCode,
      password: newPassword,
      passwordConfirmed: confirmPassword,
    };
    
    logDebugInfo('CHANGE_PASSWORD_REQUEST', { 
      email: currentResetEmail, 
      code: currentResetCode,
      passwordLength: newPassword.length,
      passwordsMatch: newPassword === confirmPassword
    });
    
    const response = await client.changePassword(requestData);
    
    logDebugInfo('CHANGE_PASSWORD_RESPONSE', response);
    
    const statusMessage = getPasswordResetStatusMessage(response.status);
    
    if (response.status === PasswordResetStatus.VALID || response.status === PasswordResetStatus.COMPLETED) {
      showStatus(`Password changed successfully: ${statusMessage}`, 'success');
      
      // Check if user was auto-logged in
      if (response.authenticationResult) {
        showStatus('Password changed and user automatically logged in!', 'success');
        updateAuthStatus();
        logDebugInfo('AUTO_LOGIN_SUCCESS', response.authenticationResult);
      }
      
      // Clear form
      newPasswordInput.value = '';
      confirmPasswordInput.value = '';
      
    } else {
      showStatus(`Password change failed: ${statusMessage}`, 'error');
    }
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    showStatus(`Failed to change password: ${errorMessage}`, 'error');
    logDebugInfo('CHANGE_PASSWORD_ERROR', { error: errorMessage });
  }
};

// Invitation Functions
async function validateInvitation() {
  try {
    const invitationIdInput = document.getElementById('invitationId') as HTMLInputElement;
    const invitationId = invitationIdInput.value.trim();
    
    if (!invitationId) {
      showStatus('Please enter the invitation ID', 'error', 'invitationStatus');
      return;
    }
    
    currentInvitationId = invitationId;
    showStatus('Validating invitation...', 'info', 'invitationStatus');
    
    const requestData = {
      id: invitationId,
    };
    
    logDebugInfo('VALIDATE_INVITATION_REQUEST', requestData);
    
    const response = await client.validateInvitation(requestData);
    
    logDebugInfo('VALIDATE_INVITATION_RESPONSE', response);
    
    const statusMessage = getInvitationStatusMessage(response.status);
    
    if (response.status === InvitationStatus.VALID) {
      showStatus(`Invitation validation successful: ${statusMessage}`, 'success', 'invitationStatus');
    } else {
      showStatus(`Invitation validation failed: ${statusMessage}`, 'error', 'invitationStatus');
    }
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    showStatus(`Failed to validate invitation: ${errorMessage}`, 'error', 'invitationStatus');
    logDebugInfo('VALIDATE_INVITATION_ERROR', { error: errorMessage });
  }
};

async function acceptInvitation() {
  try {
    const passwordInput = document.getElementById('invitePassword') as HTMLInputElement;
    const confirmPasswordInput = document.getElementById('inviteConfirmPassword') as HTMLInputElement;
    
    const password = passwordInput.value;
    const confirmPassword = confirmPasswordInput.value;
    
    if (!password || !confirmPassword) {
      showStatus('Please enter both password fields', 'error', 'invitationStatus');
      return;
    }
    
    if (password !== confirmPassword) {
      showStatus('Passwords do not match', 'error', 'invitationStatus');
      return;
    }
    
    if (password.length < 8) {
      showStatus('Password must be at least 8 characters long', 'error', 'invitationStatus');
      return;
    }
    
    if (!currentInvitationId) {
      showStatus('Please validate the invitation first', 'error', 'invitationStatus');
      return;
    }
    
    showStatus('Accepting invitation...', 'info', 'invitationStatus');
    
    const requestData = {
      id: currentInvitationId,
      password: password,
      passwordConfirmed: confirmPassword,
    };
    
    logDebugInfo('ACCEPT_INVITATION_REQUEST', { 
      id: currentInvitationId,
      passwordLength: password.length,
      passwordsMatch: password === confirmPassword
    });
    
    const response = await client.acceptInvitation(requestData);
    
    logDebugInfo('ACCEPT_INVITATION_RESPONSE', response);
    
    const statusMessage = getPasswordResetStatusMessage(response.status);
    
    if (response.status === PasswordResetStatus.VALID || response.status === PasswordResetStatus.COMPLETED) {
      showStatus(`Invitation accepted successfully: ${statusMessage}`, 'success', 'invitationStatus');
      
      // Check if user was auto-logged in
      if (response.authenticationResult) {
        showStatus('Invitation accepted and user automatically logged in!', 'success', 'invitationStatus');
        updateAuthStatus();
        logDebugInfo('AUTO_LOGIN_SUCCESS', response.authenticationResult);
      }
      
      // Clear form
      passwordInput.value = '';
      confirmPasswordInput.value = '';
      
    } else {
      showStatus(`Invitation acceptance failed: ${statusMessage}`, 'error', 'invitationStatus');
    }
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    showStatus(`Failed to accept invitation: ${errorMessage}`, 'error', 'invitationStatus');
    logDebugInfo('ACCEPT_INVITATION_ERROR', { error: errorMessage });
  }
};

// Utility Functions
async function checkAuthStatus() {
  try {
    updateAuthStatus();
    
    const isAuthenticated = client['auth'].isAuthenticated();
    
    if (isAuthenticated) {
      // Try to get user profile to test authentication
      const profile = await client.getUserProfile();
      logDebugInfo('USER_PROFILE', profile);
      showStatus(`Authenticated as: ${profile.name} (${profile.email})`, 'success', 'authStatus');
    } else {
      showStatus('Not authenticated', 'info', 'authStatus');
    }
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    showStatus(`Authentication check failed: ${errorMessage}`, 'error', 'authStatus');
    logDebugInfo('AUTH_CHECK_ERROR', { error: errorMessage });
  }
};

async function logout() {
  try {
    await client.logout();
    updateAuthStatus();
    showStatus('Logged out successfully', 'info', 'authStatus');
    logDebugInfo('LOGOUT', { timestamp: new Date().toISOString() });
    
    // Clear form data
    currentResetEmail = '';
    currentResetCode = '';
    currentInvitationId = '';
    
    // Clear form inputs
    const inputs = document.querySelectorAll('input');
    inputs.forEach(input => input.value = '');
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    showStatus(`Logout failed: ${errorMessage}`, 'error', 'authStatus');
    logDebugInfo('LOGOUT_ERROR', { error: errorMessage });
  }
};

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
  // Set update time
  const updateTimeElement = document.getElementById('updateTime');
  if (updateTimeElement) {
    updateTimeElement.textContent = new Date().toLocaleString();
  }
  
  updateAuthStatus();
  logDebugInfo('PAGE_INITIALIZED', { 
    baseUrl: 'http://localhost:8080',
    debug: true,
    timestamp: new Date().toISOString()
  });
  
  // Add event listeners to all buttons
  const forgotPasswordBtn = document.getElementById('forgotPasswordBtn');
  const validateResetCodeBtn = document.getElementById('validateResetCodeBtn');
  const changePasswordBtn = document.getElementById('changePasswordBtn');
  const validateInvitationBtn = document.getElementById('validateInvitationBtn');
  const acceptInvitationBtn = document.getElementById('acceptInvitationBtn');
  const checkAuthStatusBtn = document.getElementById('checkAuthStatusBtn');
  const logoutBtn = document.getElementById('logoutBtn');
  
  if (forgotPasswordBtn) forgotPasswordBtn.addEventListener('click', forgotPassword);
  if (validateResetCodeBtn) validateResetCodeBtn.addEventListener('click', validateResetCode);
  if (changePasswordBtn) changePasswordBtn.addEventListener('click', changePassword);
  if (validateInvitationBtn) validateInvitationBtn.addEventListener('click', validateInvitation);
  if (acceptInvitationBtn) acceptInvitationBtn.addEventListener('click', acceptInvitation);
  if (checkAuthStatusBtn) checkAuthStatusBtn.addEventListener('click', checkAuthStatus);
  if (logoutBtn) logoutBtn.addEventListener('click', logout);
  
  // Add demo data buttons for testing
  const demoSection = document.createElement('div');
  demoSection.className = 'section';
  demoSection.innerHTML = `
    <h2>Demo Data (For Testing)</h2>
    <p>Use these buttons to populate forms with test data:</p>
    <button id="fillDemoPasswordResetBtn">Fill Password Reset Demo</button>
    <button id="fillDemoInvitationBtn">Fill Invitation Demo</button>
  `;
  
  const container = document.querySelector('.container');
  if (container) {
    container.appendChild(demoSection);
    
    // Add event listeners to demo buttons
    const fillDemoPasswordResetBtn = document.getElementById('fillDemoPasswordResetBtn');
    const fillDemoInvitationBtn = document.getElementById('fillDemoInvitationBtn');
    
    if (fillDemoPasswordResetBtn) fillDemoPasswordResetBtn.addEventListener('click', fillDemoPasswordReset);
    if (fillDemoInvitationBtn) fillDemoInvitationBtn.addEventListener('click', fillDemoInvitation);
  }
  
  console.log('Password reset demo initialized successfully');
});

// Demo data functions
function fillDemoPasswordReset() {
  (document.getElementById('resetEmail') as HTMLInputElement).value = 'test@example.com';
  (document.getElementById('resetCode') as HTMLInputElement).value = 'demo-reset-code-123';
  (document.getElementById('newPassword') as HTMLInputElement).value = 'newPassword123';
  (document.getElementById('confirmPassword') as HTMLInputElement).value = 'newPassword123';
  
  showStatus('Demo data filled for password reset', 'info');
};

function fillDemoInvitation() {
  (document.getElementById('invitationId') as HTMLInputElement).value = 'demo-invitation-uuid-456';
  (document.getElementById('invitePassword') as HTMLInputElement).value = 'invitePassword123';
  (document.getElementById('inviteConfirmPassword') as HTMLInputElement).value = 'invitePassword123';
  
  showStatus('Demo data filled for invitation', 'info', 'invitationStatus');
};

// Module loaded successfully
console.log('Password reset example module loaded');

// Export for potential use in other modules
export { client }; 