import { Handler, HandlerResponse } from '@netlify/functions';
import { createLogoutCookie } from '../../src/auth.js';

export const handler: Handler = async (event, context): Promise<HandlerResponse> => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ ok: false, error: 'Method not allowed' })
    };
  }

  try {
    // Create logout cookie that clears the session
    const logoutCookie = createLogoutCookie();

    // Return success with logout cookie and redirect instruction
    return {
      statusCode: 302,
      headers: {
        'Location': '/login.html',
        'Set-Cookie': logoutCookie,
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      },
      body: ''
    };

  } catch (error) {
    console.error('Logout error:', error);
    
    // Even on error, try to clear session and redirect
    return {
      statusCode: 302,
      headers: {
        'Location': '/login.html',
        'Set-Cookie': createLogoutCookie(),
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      },
      body: ''
    };
  }
};