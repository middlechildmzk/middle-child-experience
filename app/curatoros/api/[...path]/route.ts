import { NextRequest, NextResponse } from 'next/server';

const UPSTREAM = 'https://curatoros-rho.vercel.app';

async function forward(req: NextRequest, context: { params: Promise<{ path?: string[] }> }) {
  const { path = [] } = await context.params;
  const target = new URL('/api/' + path.join('/'), UPSTREAM);
  target.search = req.nextUrl.search;

  const headers = new Headers();
  for (const name of ['authorization', 'content-type', 'accept']) {
    const value = req.headers.get(name);
    if (value) headers.set(name, value);
  }

  const method = req.method;
  const body = method === 'GET' || method === 'HEAD' ? undefined : await req.arrayBuffer();

  const upstream = await fetch(target, {
    method,
    headers,
    body,
    redirect: 'manual',
    cache: 'no-store',
  });

  const responseHeaders = new Headers();
  const contentType = upstream.headers.get('content-type');
  if (contentType) responseHeaders.set('content-type', contentType);
  responseHeaders.set('cache-control', 'no-store');

  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  });
}

export const GET = forward;
export const POST = forward;
export const PUT = forward;
export const PATCH = forward;
export const DELETE = forward;
export const OPTIONS = forward;
