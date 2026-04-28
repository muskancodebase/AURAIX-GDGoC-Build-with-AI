import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { transcribe_audio } from '@/lib/gemini';
import { getSession, SESSION_COOKIE } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const user = getSession(cookieStore.get(SESSION_COOKIE)?.value);
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const body = await request.json();
    const { audio, mimeType } = body;

    if (!audio || !mimeType) {
      return NextResponse.json({ error: 'Missing audio or mimeType' }, { status: 400 });
    }

    const text = await transcribe_audio(audio, mimeType);

    if (!text) {
      return NextResponse.json({ error: 'No transcription returned' }, { status: 422 });
    }

    return NextResponse.json({ text });
  } catch (error) {
    console.error('Transcription error:', error);
    return NextResponse.json({ error: 'Transcription failed' }, { status: 500 });
  }
}
