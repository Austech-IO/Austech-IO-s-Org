/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI, GenerateContentResponse, ThinkingLevel } from "@google/genai";

// Initialize AI client lazily to avoid crashing if key is missing
let aiClient: GoogleGenAI | null = null;

const getAIClient = () => {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not configured in the environment.");
    }
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
};

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  image?: {
    data: string;
    mimeType: string;
  };
}

export const generateAIResponse = async (
  prompt: string,
  history: ChatMessage[] = [],
  image?: { data: string; mimeType: string }
): Promise<string> => {
  const ai = getAIClient();

  const contents = history.map(msg => ({
    role: msg.role === 'user' ? 'user' : 'model',
    parts: [
      ...(msg.image ? [{ inlineData: msg.image }] : []),
      { text: msg.text }
    ]
  }));

  // Append current message
  contents.push({
    role: 'user',
    parts: [
      ...(image ? [{ inlineData: image }] : []),
      { text: prompt }
    ]
  });

  const response: GenerateContentResponse = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents,
    config: {
      systemInstruction: "You are Lumina, an elite AI Software Architect and Engineer. \n\n" +
        "1. ARCHITECTURE: When asked for architectural diagrams, use Mermaid JS syntax. Wrap diagrams in ```mermaid blocks. \n" +
        "2. CODE GENERATION: Provide modular, clean code. Use correct language tags. \n" +
        "3. DEBUGGING: When an error is provided, analyze the stack trace, identify the root cause, and offer a 'Fix' and a 'Prevention' strategy. \n" +
        "4. EXPLANATIONS: Use structured markdown. When explaining code, break it down by logic blocks. \n" +
        "5. REFACTORING: When asked to refactor, prioritize readability, performance, and DRY principles. \n" +
        "6. INTERACTIVITY: You can answer follow-up questions about specific parts of your previous responses.",
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW }
    }
  });

  return response.text || "I'm sorry, I couldn't generate a response.";
};

export const generateAIImage = async (prompt: string): Promise<string | null> => {
  const ai = getAIClient();

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: [{ parts: [{ text: prompt }] }],
    config: {
      imageConfig: {
        aspectRatio: "1:1",
      },
    },
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
    }
  }

  return null;
};
