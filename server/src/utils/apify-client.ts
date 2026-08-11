import axios from 'axios';

const APIFY_BASE_URL = 'https://api.apify.com/v2/acts';

export async function runApifyActor<TInput, TOutput>(
  actorId: string,
  input: TInput,
  timeoutSecs: number = 120
): Promise<TOutput[]> {
  const token = process.env.APIFY_API_TOKEN;
  if (!token) {
    throw new Error('APIFY_API_TOKEN is not configured');
  }

  const url = `${APIFY_BASE_URL}/${actorId}/run-sync-get-dataset-items`;

  const response = await axios.post<TOutput[]>(url, input, {
    params: { token },
    headers: { 'Content-Type': 'application/json' },
    timeout: timeoutSecs * 1000,
  });

  return response.data;
}
