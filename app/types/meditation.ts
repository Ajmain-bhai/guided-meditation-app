// Request type for meditation generation
export interface GenerateMeditationRequest {
  goal: string;
}

// Response type for successful meditation generation
export interface GenerateMeditationResponse {
  success: boolean;
  script?: string;
  error?: string;
}

// Client-side meditation data
export interface Meditation {
  id: string;
  goal: string;
  script: string;
  createdAt: Date;
}