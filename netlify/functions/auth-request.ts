import { Handler, HandlerResponse } from '@netlify/functions';
import { generateMagicToken, isValidEmail, checkRateLimit } from '../../src/auth.js';

const SITE_URL = process.env.SITE_URL || process.env.URL;

if (!SITE_URL) {
  throw new Error('SITE_URL or URL environment variable is required');
}

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
    const body = JSON.parse(event.body || '{}');
    const { email, consent } = body;

    // Validate required fields
    if (!email || typeof email !== 'string') {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ok: false, error: 'Email is required' })
      };
    }

    // Validate consent
    if (consent !== true) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          ok: false, 
          error: 'You must agree to the terms and privacy policy to proceed' 
        })
      };
    }

    // Validate email format
    if (!isValidEmail(email)) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ok: false, error: 'Invalid email format' })
      };
    }

    // Rate limiting by IP
    const clientIP = event.headers['x-forwarded-for'] || event.headers['client-ip'] || 'unknown';
    if (!checkRateLimit(`auth-request:${clientIP}`, 3, 60000)) {
      return {
        statusCode: 429,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          ok: false, 
          error: 'Too many requests. Please wait before trying again.' 
        })
      };
    }

    // Rate limiting by email
    if (!checkRateLimit(`auth-request:${email}`, 3, 60000)) {
      return {
        statusCode: 429,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          ok: false, 
          error: 'Too many requests for this email. Please wait before trying again.' 
        })
      };
    }

    // Generate magic link token
    const token = generateMagicToken(email);
    const magicLink = `${SITE_URL}/.netlify/functions/auth-callback?token=${encodeURIComponent(token)}`;

    // TODO: Replace with actual email sending (SMTP)
    console.log('=== MAGIC LINK (TODO: Send via SMTP) ===');
    console.log(`To: ${email}`);
    console.log(`Subject: ALI Monitor Jurídico - Link de Acesso`);
    console.log(`Link: ${magicLink}`);
    console.log('========================================');

    // Always return success (don't expose if email exists)
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        ok: true, 
        message: 'If the email exists in our system, you will receive an access link.' 
      })
    };

  } catch (error) {
    console.error('Auth request error:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        ok: false, 
        error: 'Internal server error' 
      })
    };
  }
};