import { NextRequest, NextResponse } from 'next/server';
import { corsHeaders } from '@/lib/utils';
import {
  buildQueuedTrack,
  SunoApiOrgClient,
  SunoApiOrgError
} from '@/lib/SunoApiOrgClient';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

function getClient() {
  return new SunoApiOrgClient(process.env.SUNOAPI_KEY);
}

function normalizeModel(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

function buildCustomInput(body: Record<string, unknown>) {
  const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
  const style = typeof body.tags === 'string' ? body.tags.trim() : undefined;
  const title = typeof body.title === 'string' ? body.title.trim() : undefined;
  const model = normalizeModel(body.model);
  const instrumental = Boolean(body.make_instrumental);

  return {
    prompt,
    customMode: true,
    instrumental,
    model,
    style,
    title
  };
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

  const message = error instanceof Error ? error.message : 'Unexpected error while generating music.';
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

export async function POST(req: NextRequest) {
  if (req.method !== 'POST') {
    return new NextResponse('Method Not Allowed', {
      headers: {
        Allow: 'POST',
        ...corsHeaders
      },
      status: 405
    });
  }

  try {
    const body = (await req.json()) as Record<string, unknown>;
    const client = getClient();
    const input = buildCustomInput(body);
    const taskId = await client.createTask({
      ...input,
      callBackUrl: typeof body.callBackUrl === 'string' ? body.callBackUrl : undefined
    });

    return NextResponse.json([
      buildQueuedTrack(taskId, {
        prompt: input.prompt,
        style: input.style,
        title: input.title,
        instrumental: input.instrumental,
        model: input.model,
        negative_tags: typeof body.negative_tags === 'string' ? body.negative_tags.trim() : undefined
      })
    ], {
      status: 200,
      headers: corsHeaders
    });
  } catch (error) {
    console.error('Error generating custom audio:', error);
    return toErrorResponse(error);
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: corsHeaders
  });
}
