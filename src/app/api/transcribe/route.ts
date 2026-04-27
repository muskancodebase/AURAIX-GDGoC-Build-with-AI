import { NextRequest, NextResponse } from 'next/server';
import { transcribe_audio } from '@/lib/gemini';

export async function POST(request: NextRequest) {
  try {
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
