import { Handler, HandlerResponse } from '@netlify/functions';
import { verifyMagicToken, generateSessionToken, createSessionCookie } from '../../src/auth.js';
import { emailHash, getUserProfile, putUserProfile } from '../../src/gh-storage.js';

const SITE_URL = process.env.SITE_URL || process.env.URL;

if (!SITE_URL) {
  throw new Error('SITE_URL or URL environment variable is required');
}

export const handler: Handler = async (event, context): Promise<HandlerResponse> => {
  // Only allow GET requests
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers: {
        'Content-Type': 'text/html'
      },
      body: '<h1>Method Not Allowed</h1><p>This endpoint only accepts GET requests.</p>'
    };
  }

  try {
    const token = event.queryStringParameters?.token;

    if (!token) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'text/html'
        },
        body: `
          <h1>Invalid Link</h1>
          <p>This link is missing the required token parameter.</p>
          <p><a href="/login.html">Try logging in again</a></p>
        `
      };
    }

    // Verify the magic link token
    let payload;
    try {
      payload = verifyMagicToken(token);
    } catch (error) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'text/html'
        },
        body: `
          <h1>Expired or Invalid Link</h1>
          <p>This login link has expired or is invalid. Please request a new one.</p>
          <p><a href="/login.html">Request new login link</a></p>
        `
      };
    }

    const { email } = payload;
    const userEmailHash = emailHash(email);

    // Get or create user profile
    const { content: profile, sha } = await getUserProfile(userEmailHash);
    const now = new Date().toISOString();

    let userProfile = profile;

    if (!userProfile || Object.keys(userProfile).length === 0) {
      // Create new user profile with consent
      userProfile = {
        email: email,
        consentAt: now,
        createdAt: now
      };
      
      await putUserProfile(userEmailHash, userProfile);
    } else {
      // Update existing profile with consent if not already set
      if (!userProfile.consentAt) {
        userProfile.consentAt = now;
        await putUserProfile(userEmailHash, userProfile, sha);
      }
    }

    // Generate session token
    const sessionToken = generateSessionToken(userEmailHash, email);
    const sessionCookie = createSessionCookie(sessionToken);

    // Redirect to main application with session cookie
    return {
      statusCode: 302,
      headers: {
        'Location': '/',
        'Set-Cookie': sessionCookie,
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      },
      body: ''
    };

  } catch (error) {
    console.error('Auth callback error:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'text/html'
      },
      body: `
        <h1>Authentication Error</h1>
        <p>An error occurred while processing your login. Please try again.</p>
        <p><a href="/login.html">Return to login</a></p>
      `
    };
  }
};