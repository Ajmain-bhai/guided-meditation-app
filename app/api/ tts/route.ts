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
    console.log('========== POLLY DEBUG ==========');
    console.log('AWS KEY EXISTS:', !!process.env.AWS_ACCESS_KEY_ID);
    console.log('AWS SECRET EXISTS:', !!process.env.AWS_SECRET_ACCESS_KEY);
    console.log('AWS REGION:', process.env.AWS_REGION);
    console.log('=================================');

    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
      return NextResponse.json(
        { error: 'TTS not configured - AWS credentials missing' },
        { status: 500 }
      );
    }

    const { text } = await request.json();

    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'Invalid text' },
        { status: 400 }
      );
    }

    console.log('Text length:', text.length);
    console.log('Calling AWS Polly...');

    const command = new SynthesizeSpeechCommand({
      Text: text.slice(0, 3000),
      OutputFormat: 'mp3',
      VoiceId: 'Joanna',
      Engine: 'neural',
      TextType: 'text',
    });

    const response = await polly.send(command);

    console.log('Polly Success');

    const audioBytes = await response.AudioStream?.transformToByteArray();

    if (!audioBytes) {
      return NextResponse.json(
        { error: 'No audio returned from Polly' },
        { status: 500 }
      );
    }

    console.log('Audio bytes:', audioBytes.byteLength);

    return new Response(audioBytes, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBytes.byteLength.toString(),
        'Cache-Control': 'no-store',
      },
    });

  } catch (error) {
    console.error('========================');
    console.error('POLLY FULL ERROR');
    console.error(error);
    console.error('========================');

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Unknown Polly error',
      },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';