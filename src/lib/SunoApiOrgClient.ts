export const SUNO_API_ORG_BASE_URL = 'https://api.sunoapi.org/api/v1';
export const DEFAULT_SUNO_API_ORG_MODEL = 'V4_5ALL';

export type SunoApiOrgTrack = {
  id: string;
  task_id?: string;
  title?: string;
  image_url?: string;
  lyric?: string;
  audio_url?: string;
  video_url?: string;
  created_at?: string;
  model_name?: string;
  prompt?: string;
  tags?: string;
  negative_tags?: string;
  status?: string;
  error_message?: string;
  duration?: string | number;
};

export type SunoApiOrgGenerateInput = {
  prompt: string;
  customMode?: boolean;
  instrumental?: boolean;
  model?: string;
  style?: string;
  title?: string;
  callBackUrl?: string;
};

export type SunoApiOrgGenerateResponse = {
  code?: number;
  msg?: string;
  data?: {
    taskId?: string;
  };
};

export type SunoApiOrgTaskInfo = {
  taskId?: string;
  status?: string;
  response?: {
    data?: unknown;
    sunoData?: unknown;
  } | unknown;
  errorMessage?: string;
  error?: string;
};

export type SunoApiOrgTaskResponse = {
  code?: number;
  msg?: string;
  data?: SunoApiOrgTaskInfo;
};

export type SunoApiOrgCreditsResponse = {
  code?: number;
  msg?: string;
  data?: number;
};

export class SunoApiOrgError extends Error {
  public readonly status: number;
  public readonly payload: unknown;

  constructor(message: string, status = 500, payload?: unknown) {
    super(message);
    this.name = 'SunoApiOrgError';
    this.status = status;
    this.payload = payload;
  }
}

function normalizeString(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function normalizeTrackStatus(status?: string): string {
  const normalized = (status ?? '').trim().toUpperCase();

  switch (normalized) {
    case 'SUCCESS':
    case 'SUCCEEDED':
    case 'COMPLETED':
    case 'DONE':
      return 'complete';
    case 'GENERATING':
    case 'PROCESSING':
    case 'RUNNING':
      return 'streaming';
    case 'PENDING':
    case 'QUEUED':
      return 'queued';
    case 'FAILED':
    case 'ERROR':
      return 'error';
    case 'SUBMITTED':
      return 'submitted';
    default:
      return normalizeString(status)?.toLowerCase() || 'submitted';
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function extractTracks(response: unknown): Record<string, unknown>[] {
  if (Array.isArray(response)) {
    return response
      .map(item => asRecord(item))
      .filter((item): item is Record<string, unknown> => Boolean(item));
  }

  const record = asRecord(response);
  if (!record) {
    return [];
  }

  const nestedData = record.data;
  if (Array.isArray(nestedData)) {
    return nestedData
      .map(item => asRecord(item))
      .filter((item): item is Record<string, unknown> => Boolean(item));
  }

  const nestedResponse = asRecord(nestedData);
  if (nestedResponse) {
    const sunoData = nestedResponse.sunoData;
    if (Array.isArray(sunoData)) {
      return sunoData
        .map(item => asRecord(item))
        .filter((item): item is Record<string, unknown> => Boolean(item));
    }

    if (asRecord(sunoData)) {
      return [asRecord(sunoData)!];
    }

    return [nestedResponse];
  }

  const sunoData = record.sunoData;
  if (Array.isArray(sunoData)) {
    return sunoData
      .map(item => asRecord(item))
      .filter((item): item is Record<string, unknown> => Boolean(item));
  }

  if (asRecord(sunoData)) {
    return [asRecord(sunoData)!];
  }

  return [record];
}

function resolveStatusFromTask(taskStatus: string | undefined, itemStatus: string | undefined): string {
  return normalizeTrackStatus(itemStatus || taskStatus);
}

export function buildQueuedTrack(
  taskId: string,
  input: Pick<SunoApiOrgGenerateInput, 'prompt' | 'style' | 'title' | 'instrumental' | 'model'> & {
    negative_tags?: string;
  }
): SunoApiOrgTrack {
  return {
    id: taskId,
    task_id: taskId,
    title: input.title,
    prompt: input.prompt,
    tags: input.style,
    negative_tags: input.negative_tags,
    model_name: input.model,
    status: 'submitted',
    created_at: new Date().toISOString()
  };
}

export function buildErrorTrack(taskId: string, message: string): SunoApiOrgTrack {
  return {
    id: taskId,
    task_id: taskId,
    status: 'error',
    error_message: message,
    created_at: new Date().toISOString()
  };
}

export function mapTaskInfoToTracks(taskInfo: SunoApiOrgTaskInfo, fallbackTaskId: string): SunoApiOrgTrack[] {
  const taskId = normalizeString(taskInfo.taskId) || fallbackTaskId;
  const taskStatus = normalizeString(taskInfo.status);
  const errorMessage = normalizeString(taskInfo.errorMessage) || normalizeString(taskInfo.error);
  const items = extractTracks(taskInfo.response);

  if ((taskStatus ?? '').toUpperCase() === 'FAILED') {
    return [buildErrorTrack(taskId, errorMessage || 'Generation failed')];
  }

  if (items.length === 0) {
    return [{
      id: taskId,
      task_id: taskId,
      status: resolveStatusFromTask(taskStatus, undefined),
      error_message: errorMessage,
      created_at: new Date().toISOString()
    }];
  }

  return items.map(item => {
    const id = normalizeString(item.id) || taskId;
    const itemStatus = normalizeString(item.status);
    return {
      id,
      task_id: taskId,
      title: normalizeString(item.title),
      image_url: normalizeString(item.image_url),
      lyric: normalizeString(item.lyric),
      audio_url: normalizeString(item.audio_url),
      video_url: normalizeString(item.video_url),
      created_at: normalizeString(item.created_at),
      model_name: normalizeString(item.model_name),
      prompt: normalizeString(item.prompt),
      tags: normalizeString(item.tags),
      negative_tags: normalizeString(item.negative_tags),
      status: resolveStatusFromTask(taskStatus, itemStatus),
      error_message: errorMessage,
      duration: item.duration as string | number | undefined
    };
  });
}

export class SunoApiOrgClient {
  private readonly apiKey: string;
  private readonly baseUrl = SUNO_API_ORG_BASE_URL;

  constructor(apiKey: string | undefined) {
    const normalizedApiKey = normalizeString(apiKey);
    if (!normalizedApiKey) {
      throw new Error('SUNOAPI_KEY is required.');
    }

    this.apiKey = normalizedApiKey;
  }

  private async requestJson<T>(path: string, init?: RequestInit): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        ...init,
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          ...(init?.headers || {})
        }
      });

      const rawText = await response.text();
      let payload: unknown = null;

      if (rawText.length > 0) {
        try {
          payload = JSON.parse(rawText);
        } catch {
          payload = rawText;
        }
      }

      if (!response.ok) {
        const errorMessage = this.extractMessage(payload, response.statusText);
        throw new SunoApiOrgError(errorMessage, response.status, payload);
      }

      const record = asRecord(payload);
      if (record && typeof record.code === 'number' && record.code !== 200) {
        throw new SunoApiOrgError(this.extractMessage(record, 'Request failed'), record.code, record);
      }

      return payload as T;
    } catch (error: any) {
      if (error instanceof SunoApiOrgError) {
        throw error;
      }

      if (error?.name === 'AbortError') {
        throw new SunoApiOrgError('Request to Suno API timed out.', 504);
      }

      throw new SunoApiOrgError(error?.message || 'Failed to reach Suno API.', 502, error);
    } finally {
      clearTimeout(timeout);
    }
  }

  private extractMessage(payload: unknown, fallback: string): string {
    const record = asRecord(payload);
    if (!record) {
      if (typeof payload === 'string' && payload.trim().length > 0) {
        return payload;
      }
      return fallback;
    }

    return (
      normalizeString(record.msg) ||
      normalizeString(record.message) ||
      normalizeString(record.detail) ||
      normalizeString(record.error) ||
      fallback
    );
  }

  async createTask(input: SunoApiOrgGenerateInput): Promise<string> {
    const response = await this.requestJson<SunoApiOrgGenerateResponse>('/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(input)
    });

    const taskId = normalizeString(response.data?.taskId);
    if (!taskId) {
      throw new SunoApiOrgError('Suno API did not return a taskId.', 502, response);
    }

    return taskId;
  }

  async getTaskInfo(taskId: string): Promise<SunoApiOrgTaskInfo> {
    const normalizedTaskId = normalizeString(taskId);
    if (!normalizedTaskId) {
      throw new SunoApiOrgError('taskId is required.', 400);
    }

    const response = await this.requestJson<SunoApiOrgTaskResponse>(
      `/generate/record-info?taskId=${encodeURIComponent(normalizedTaskId)}`
    );

    const taskInfo = response.data;
    if (!taskInfo) {
      throw new SunoApiOrgError('Suno API did not return task details.', 502, response);
    }

    return taskInfo;
  }

  async getCredits(): Promise<number> {
    const response = await this.requestJson<SunoApiOrgCreditsResponse>('/generate/credit');
    const credits = response.data;

    if (typeof credits !== 'number' || !Number.isFinite(credits)) {
      throw new SunoApiOrgError('Suno API did not return a numeric credit balance.', 502, response);
    }

    return credits;
  }

  createTaskPlaceholder(
    input: Pick<SunoApiOrgGenerateInput, 'prompt' | 'style' | 'title' | 'instrumental' | 'model'> & { negative_tags?: string },
    taskId: string
  ): SunoApiOrgTrack {
    return buildQueuedTrack(taskId, input);
  }

  mapTaskInfoToTracks(taskInfo: SunoApiOrgTaskInfo, fallbackTaskId: string): SunoApiOrgTrack[] {
    return mapTaskInfoToTracks(taskInfo, fallbackTaskId);
  }

  buildErrorTrack(taskId: string, message: string): SunoApiOrgTrack {
    return buildErrorTrack(taskId, message);
  }
}
