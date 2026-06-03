import { NextRequest, NextResponse } from 'next/server';
import { PollyClient, SynthesizeSpeechCommand } from '@aws-sdk/client-polly';

const polly = new PollyClient({
  region: process.env.AWS_REGION || 'ap-south-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export async function POST(request: NextRequest) {
  try {
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
      return NextResponse.json({ error: 'TTS not configured' }, { status: 500 });
    }

    const { text } = await request.json();

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Invalid text' }, { status: 400 });
    }

    const command = new SynthesizeSpeechCommand({
      Text: text.slice(0, 3000), // Polly max safe limit
      OutputFormat: 'mp3',
      VoiceId: 'Joanna',         // Calm neural female voice
      Engine: 'neural',
      TextType: 'text',
    });

    const response = await polly.send(command);
    const audioBytes = await response.AudioStream?.transformToByteArray();

    if (!audioBytes) {
      return NextResponse.json({ error: 'No audio returned' }, { status: 500 });
    }

    return new Response(audioBytes, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBytes.byteLength.toString(),
      },
    });

  } catch (error) {
    console.error('Polly TTS error:', error);
    return NextResponse.json(
      { error: 'TTS generation failed' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
