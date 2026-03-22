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

function parseTaskIds(searchParams: URLSearchParams) {
  const idsParam = searchParams.get('ids');
  if (!idsParam) {
    return [];
  }

  return Array.from(
    new Set(
      idsParam
        .split(',')
        .map(value => value.trim())
        .filter(Boolean)
    )
  );
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

  const message = error instanceof Error ? error.message : 'Unexpected error while fetching task status.';
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
    const url = new URL(req.url);
    const taskIds = parseTaskIds(url.searchParams);

    if (taskIds.length === 0) {
      return NextResponse.json(
        {
          code: 400,
          msg: 'ids query parameter is required.',
          error: 'ids query parameter is required.'
        },
        {
          status: 400,
          headers: corsHeaders
        }
      );
    }

    const client = getClient();
    const tracks = [];

    for (const taskId of taskIds) {
      try {
        const taskInfo = await client.getTaskInfo(taskId);
        tracks.push(...client.mapTaskInfoToTracks(taskInfo, taskId));
      } catch (error) {
        if (error instanceof SunoApiOrgError) {
          tracks.push(client.buildErrorTrack(taskId, error.message));
          continue;
        }

        throw error;
      }
    }

    return NextResponse.json(tracks, {
      status: 200,
      headers: corsHeaders
    });
  } catch (error) {
    console.error('Error fetching audio:', error);
    return toErrorResponse(error);
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: corsHeaders
  });
}
