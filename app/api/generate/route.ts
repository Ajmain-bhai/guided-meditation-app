import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

interface GenerateRequest {
  goal: string;
}

interface GenerateResponse {
  success: boolean;
  script?: string;
  error?: string;
}

export async function POST(request: NextRequest) {
  try {
    if (!process.env.GROQ_API_KEY) {
      console.error('GROQ_API_KEY is not set in environment variables');
      return NextResponse.json(
        { success: false, error: 'Server configuration error. Please contact support.' } as GenerateResponse,
        { status: 500 }
      );
    }

    const body: GenerateRequest = await request.json();

    if (!body.goal || typeof body.goal !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Invalid request. Please provide a goal for your meditation.' } as GenerateResponse,
        { status: 400 }
      );
    }

    const goal = body.goal.trim();

    if (goal.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Goal cannot be empty.' } as GenerateResponse,
        { status: 400 }
      );
    }

    if (goal.length > 500) {
      return NextResponse.json(
        { success: false, error: 'Goal is too long. Please keep it under 500 characters.' } as GenerateResponse,
        { status: 400 }
      );
    }

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: `You are an expert meditation guide and mindfulness instructor. Create calming, peaceful, and deeply relaxing guided meditation scripts. 

Your scripts should:
- Be 2-3 minutes in length when read aloud at a calm pace
- Use soothing, gentle language
- Include breathing exercises and body awareness
- Guide the listener through visualization
- End with a gentle return to awareness
- Be written in second person ("you")
- Use present tense
- Include natural pauses indicated by "..."

Format the script as flowing prose with clear paragraph breaks.`,
        },
        {
          role: 'user',
          content: `Create a guided meditation script for this goal: "${goal}"

Generate a complete 2-3 minute meditation script that helps achieve this goal.`,
        },
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.7,
      max_tokens: 1500,
      top_p: 0.9,
    });

    const script = chatCompletion.choices[0]?.message?.content;

    if (!script) {
      return NextResponse.json(
        { success: false, error: 'Failed to generate meditation script. Please try again.' } as GenerateResponse,
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, script: script.trim() } as GenerateResponse,
      { status: 200 }
    );

  } catch (error) {
    console.error('Error generating meditation script:', error);

    if (error instanceof Error) {
      if (error.message.includes('rate limit')) {
        return NextResponse.json(
          { success: false, error: 'Too many requests. Please try again in a moment.' } as GenerateResponse,
          { status: 429 }
        );
      }
      if (error.message.includes('authentication') || error.message.includes('API key')) {
        return NextResponse.json(
          { success: false, error: 'Server configuration error. Please contact support.' } as GenerateResponse,
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      { success: false, error: 'An error occurred while generating your meditation. Please try again.' } as GenerateResponse,
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
