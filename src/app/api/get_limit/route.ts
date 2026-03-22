import { NextRequest, NextResponse } from 'next/server';
import { corsHeaders } from '@/lib/utils';
import {
  SunoApiOrgClient,
  SunoApiOrgError
} from '@/lib/SunoApiOrgClient';

export const dynamic = 'force-dynamic';

function getClient() {
  return new SunoApiOrgClient(process.env.SUNOAPI_KEY);
}

function toErrorResponse(error: unknown) {
  if (error instanceof SunoApiOrgError) {
    return NextResponse.json(
      {
        code: error.status,
        msg: error.message,
        error: error.message
      },
      {
        status: error.status,
        headers: corsHeaders
      }
    );
  }

  const message = error instanceof Error ? error.message : 'Unexpected error while fetching credits.';
  return NextResponse.json(
    {
      code: 500,
      msg: message,
      error: message
    },
    {
      status: 500,
      headers: corsHeaders
    }
  );
}

export async function GET(req: NextRequest) {
  if (req.method !== 'GET') {
    return new NextResponse('Method Not Allowed', {
      headers: {
        Allow: 'GET',
        ...corsHeaders
      },
      status: 405
    });
  }

  try {
    const client = getClient();
    const creditsLeft = await client.getCredits();

    return NextResponse.json(
      {
        code: 200,
        msg: 'success',
        data: {
          credits_left: creditsLeft,
          period: 'month',
          monthly_limit: creditsLeft,
          monthly_usage: 0
        }
      },
      {
        status: 200,
        headers: corsHeaders
      }
    );
  } catch (error) {
    console.error('Error fetching limit:', error);
    return toErrorResponse(error);
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: corsHeaders
  });
}
