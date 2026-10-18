import { NextRequest, NextResponse } from 'next/server';
import env from '@/lib/config/env';
import logger from '@/lib/utils/logger';

/**
 * Meta WhatsApp Webhook Endpoint
 * 
 * 1. GET: Meta Webhook Verification handshake.
 *    Meta sends hub.mode, hub.verify_token, and hub.challenge as query params.
 *    If hub.verify_token matches our configured token, return hub.challenge with 200.
 * 
 * 2. POST: Meta event notifications (message status: sent, delivered, read, failed; incoming messages).
 *    Always respond 200 promptly so Meta marks delivery as successful.
 */

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const mode = searchParams.get('hub.mode');
    const token = searchParams.get('hub.verify_token');
    const challenge = searchParams.get('hub.challenge');

    const expectedToken = env.whatsapp.verifyToken || 'campusweb_wa_verify_2026';

    if (mode === 'subscribe' && token === expectedToken) {
      logger.info('WhatsApp webhook verified successfully by Meta');
      return new Response(challenge || '', {
        status: 200,
        headers: { 'Content-Type': 'text/plain' },
      });
    }

    logger.warn('WhatsApp webhook verification failed: Token mismatch', {
      receivedToken: token,
      mode,
    });
    return new Response('Forbidden', { status: 403 });
  } catch (err) {
    logger.error('WhatsApp webhook GET verification error', {
      error: err instanceof Error ? err.message : String(err),
    });
    return new Response('Internal Server Error', { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Log incoming event (delivery receipts or student replies)
    if (body.object === 'whatsapp_business_account') {
      const entries = body.entry || [];
      for (const entry of entries) {
        const changes = entry.changes || [];
        for (const change of changes) {
          const value = change.value;
          if (value?.statuses) {
            // Status update: sent, delivered, read, failed
            for (const status of value.statuses) {
              logger.info('WhatsApp message status update', {
                recipientId: status.recipient_id,
                status: status.status,
                id: status.id,
              });
            }
          }
          if (value?.messages) {
            // Inbound message received from a user
            for (const msg of value.messages) {
              logger.info('WhatsApp incoming message received', {
                from: msg.from,
                type: msg.type,
              });
            }
          }
        }
      }
    }

    // Acknowledge receipt immediately within 3s as required by Meta
    return NextResponse.json({ status: 'EVENT_RECEIVED' }, { status: 200 });
  } catch (err) {
    logger.error('WhatsApp webhook POST error', {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ status: 'EVENT_RECEIVED' }, { status: 200 });
  }
}
