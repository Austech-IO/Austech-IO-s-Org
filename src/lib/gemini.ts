/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

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
  image?: { data: string; mimeType: string },
  onChunk?: (chunk: string) => void
): Promise<string> => {
  const ai = getAIClient();

  const contents = history.map(msg => ({
    role: msg.role === 'user' ? 'user' : 'model',
    parts: [
      ...(msg.image ? [{ inlineData: msg.image }] : []),
      { text: msg.text }
    ]
  }));

  contents.push({
    role: 'user',
    parts: [
      ...(image ? [{ inlineData: image }] : []),
      { text: prompt }
    ]
  });

  const model = "gemini-2.0-flash"; // Switched for maximum speed and robustness

  if (onChunk) {
    const result = await ai.models.generateContentStream({
      model,
      contents,
      config: {
        systemInstruction: "You are Lumina, an elite AI Software Architect. \n" +
          "1. CONCISE: Be direct and technical. \n" +
          "2. MERMAID SYNTAX: Use strictly alphanumeric IDs (e.g., ID1, AppServer) with NO spaces or quotes. \n" +
          "3. DESCRIPTIVE LABELS: Put all descriptive text in double-quoted labels (e.g., ID1[\"User Service\"] or ID2{\"Decision?\"}). \n" +
          "4. NO QUOTED IDs: Never put double quotes around the node ID itself (e.g., NEVER \"ID1\"[\"Label\"]). \n" +
          "5. DIAGRAM STRUCTURE: Start with 'graph TD'. Match every 'subgraph' with an 'end'. Quote subgraph titles properly. \n" +
          "6. NO SPECIAL CHARS: Never use /, &, (, ), -, or spaces in node IDs. Use them ONLY inside double-quoted labels. \n" +
          "7. ZIP CONTEXT: Use <PROJECT_ZIP_CONTEXT> if present for project-specific insights.",
      }
    });

    let fullText = "";
    for await (const chunk of result) {
      const chunkText = chunk.text || "";
      fullText += chunkText;
      onChunk(chunkText);
    }
    return fullText;
  }

  const response: GenerateContentResponse = await ai.models.generateContent({
    model,
    contents,
    config: {
      systemInstruction: "You are Lumina, an elite AI Software Architect. \n" +
        "1. CONCISE: Be direct and technical. \n" +
        "2. MERMAID SYNTAX: Use strictly alphanumeric IDs (e.g., ID1, AppServer) with NO spaces or quotes. \n" +
        "3. DESCRIPTIVE LABELS: Put all descriptive text in double-quoted labels (e.g., ID1[\"User Service\"] or ID2{\"Decision?\"}). \n" +
        "4. NO QUOTED IDs: Never put double quotes around the node ID itself (e.g., NEVER \"ID1\"[\"Label\"]). \n" +
        "5. DIAGRAM STRUCTURE: Start with 'graph TD'. Match every 'subgraph' with an 'end'. Quote subgraph titles properly. \n" +
        "6. NO SPECIAL CHARS: Never use /, &, (, ), -, or spaces in node IDs. Use them ONLY inside double-quoted labels. \n" +
        "7. ZIP CONTEXT: Use <PROJECT_ZIP_CONTEXT> if present for project-specific insights.",
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
