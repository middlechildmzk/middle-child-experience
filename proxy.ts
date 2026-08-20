import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export function proxy(request: NextRequest) {
  const host = request.headers.get('host')?.split(':')[0].toLowerCase();

  if (host === 'www.bvssfvm.com') {
    const url = request.nextUrl.clone();
    url.protocol = 'https:';
    url.hostname = 'bvssfvm.com';
    url.port = '';
    return NextResponse.redirect(url, 308);
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/:path*',
};
