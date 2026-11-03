import { authenticate, failure } from '@/lib/server/http';
export async function GET(request: Request) {
  try {
    await authenticate(request);
    return Response.json({ now: Date.now() }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return failure(error);
  }
}
