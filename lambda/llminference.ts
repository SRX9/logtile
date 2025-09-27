import { GoogleGenAI } from "@google/genai";
import { AzureOpenAI } from "openai";

export const llmInferenceGoogle = async (
  prompt: string,
  systemPrompt: string
) => {
  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
  });
  const config = {
    thinkingConfig: {
      thinkingBudget: 0,
    },
    responseMimeType: "text/plain",
    stream: false,
  };
  const model = "gemini-2.5-flash-lite-preview-06-17";
  const contents = [
    {
      role: "user",
      parts: [
        {
          text: prompt,
        },
      ],
    },
  ];
  try {
    const response = await ai.models.generateContent({
      model,
      config,
      contents,
    });
    return response.text;
  } catch (error) {
    try {
      const response = await ai.models.generateContent({
        model,
        config,
        contents,
      });
      return response.text;
    } catch (error) {
      console.error("Error fetching latest info", error);
      return null;
    }
  }
};

export const llmInferenceAzure = async (
  prompt: string,
  systemPrompt: string
) => {
  const apiKey = process.env.AZURE_API_KEY;
  const apiVersion = "2025-01-01-preview";
  const endpoint =
    "https://soulinference5063864998.openai.azure.com/openai/deployments/gpt-5/chat/completions?api-version=2025-01-01-preview/";
  try {
    const modelName = "gpt-5";
    const deployment = "gpt-5";
    const options = { endpoint, apiKey, deployment, apiVersion };

    const client = new AzureOpenAI(options);
    const response = await client.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ],
      max_completion_tokens: 3000,
      reasoning_effort: "low",
      model: modelName,
    });

    const gpt5Response = response.choices[0].message.content;

    return gpt5Response;
  } catch (error) {
    console.log("Error fetching latest info 1", error);
    try {
      const modelName = "gpt-5-mini";
      const deployment = "gpt-5-mini-2";
      const options = { endpoint, apiKey, deployment, apiVersion };

      const client = new AzureOpenAI(options);
      const response = await client.chat.completions.create({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt },
        ],
        max_completion_tokens: 3000,
        reasoning_effort: "low",
        model: modelName,
      });
      return response.choices[0].message.content;
    } catch (error) {
      console.log("Error fetching latest info 2", error);
      return null;
    }
  }
};
