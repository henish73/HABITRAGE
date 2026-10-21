import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import fetch from "node-fetch";
import { GoogleGenAI } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // API Routes
  app.post("/api/distill", async (req, res) => {
    const { text, uid, openRouterKey, model: requestedModel } = req.body;
    
    if (!text || !uid) {
      return res.status(400).json({ error: "Missing text or uid" });
    }

    if (!openRouterKey) {
      return res.status(401).json({ error: "OpenRouter API Key is required for distillation." });
    }

    let selectedModel = requestedModel;
    if (!selectedModel || selectedModel.includes('gemini')) {
      selectedModel = 'deepseek/deepseek-chat';
    }

    try {
      const orResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${openRouterKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://habitrage.io",
          "X-Title": "HABITRAGE"
        },
        body: JSON.stringify({
          model: selectedModel,
          messages: [
            { 
              role: "system", 
              content: `You are a highly efficient personal data distiller for HABITRAGE. 
              Output strictly valid JSON matching the required schema.
              
              Schema:
              - type: 'transaction' | 'task' | 'health_log' | 'journal_entry'
              - payload: 
                - For transaction: { amount, category, merchant, type: 'expense'|'income', isImpulse }
                - For task: { title, dueDate, priority: 'low'|'medium'|'high' }
                - For health_log: { weightKg, sleepHours, recoveryScore, energyTag }
                - For journal_entry: { text, sentimentScore }
              - summary: string (human confirmation)
              `
            },
            { role: "user", content: `Distill this input: "${text}"` }
          ],
          response_format: { type: "json_object" }
        })
      });

      if (!orResponse.ok) {
        const errBody = await orResponse.text();
        throw new Error(`OpenRouter API failed: ${errBody}`);
      }

      const orData: any = await orResponse.json();
      const content = JSON.parse(orData.choices[0].message.content);
      
      return res.json({
        ...content,
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      console.error("Distillation error:", error);
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  });

  app.post("/api/vision", async (req, res) => {
    const { image, openRouterKey, model = "openai/gpt-4o" } = req.body;
    
    if (!image || !openRouterKey) {
      return res.status(400).json({ error: "Missing image or API key" });
    }

    try {
      const orResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${openRouterKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://habitrage.io",
          "X-Title": "HABITRAGE"
        },
        body: JSON.stringify({
          model: model,
          messages: [
            { 
              role: "system", 
              content: `You are a precision health telemetry extractor for HABITRAGE. 
              Extract physical metrics from the provided image of a smart scale or body composition report.
              Output strictly valid JSON matching the HealthLog schema.
              
              Fields to extract:
              - weightKg (number)
              - bmi (number)
              - bodyFatPct (number)
              - skeletalMusclePct (number)
              - fatFreeMassKg (number)
              - subcutaneousFatPct (number)
              - visceralFatGrade (number)
              - bodyWaterPct (number)
              - muscleMassKg (number)
              - boneMassKg (number)
              - proteinPct (number)
              - bmrKcal (number)
              - metabolicAge (number)
              
              If a metric is not found, omit it from the JSON.
              `
            },
            {
              role: "user",
              content: [
                { type: "text", text: "Extract metrics from this health readout." },
                { type: "image_url", image_url: { url: image } }
              ]
            }
          ],
          response_format: { type: "json_object" }
        })
      });

      if (!orResponse.ok) {
        const errBody = await orResponse.text();
        throw new Error(`OpenRouter Vision API failed: ${errBody}`);
      }

      const orData: any = await orResponse.json();
      const content = JSON.parse(orData.choices[0].message.content);
      
      return res.json(content);

    } catch (error: any) {
      console.error("Vision extraction error:", error);
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  });

  app.post("/api/distill-journal", async (req, res) => {
    const { text, openRouterKey, model = "openai/gpt-4o" } = req.body;
    
    if (!text || !openRouterKey) {
      return res.status(400).json({ error: "Missing text or API key" });
    }

    try {
      const orResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${openRouterKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://habitrage.io",
          "X-Title": "HABITRAGE"
        },
        body: JSON.stringify({
          model: model,
          messages: [
            { 
              role: "system", 
              content: `You are a cognitive distillation engine for HABITRAGE.
              Analyze the provided journal reflection.
              1. Extract a sentiment score from -1.0 (extremely negative) to 1.0 (extremely positive).
              2. Identify actionable tasks that should be added to the user's workflow.
              
              Output strictly valid JSON:
              {
                "sentimentScore": number,
                "extractedActionItems": string[]
              }
              `
            },
            {
              role: "user",
              content: text
            }
          ],
          response_format: { type: "json_object" }
        })
      });

      if (!orResponse.ok) {
        const errBody = await orResponse.text();
        throw new Error(`OpenRouter Distillation API failed: ${errBody}`);
      }

      const orData: any = await orResponse.json();
      const content = JSON.parse(orData.choices[0].message.content);
      
      return res.json(content);

    } catch (error: any) {
      console.error("Distillation error:", error);
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  });

  app.post("/api/transcribe", async (req, res) => {
    const { audio, openRouterKey, model = "openai/whisper-large-v3" } = req.body;
    
    if (!audio || !openRouterKey) {
      return res.status(400).json({ error: "Missing audio or API key" });
    }

    try {
      const orResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${openRouterKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://habitrage.io",
          "X-Title": "HABITRAGE"
        },
        body: JSON.stringify({
          model: model,
          messages: [
            { 
              role: "user",
              content: [
                { type: "text", text: "Transcribe this audio." },
                { type: "input_audio", input_audio: { data: audio.split(',')[1], format: "wav" } }
              ]
            }
          ]
        })
      });

      if (!orResponse.ok) {
        const errBody = await orResponse.text();
        throw new Error(`OpenRouter Transcription API failed: ${errBody}`);
      }

      const orData: any = await orResponse.json();
      return res.json({ text: orData.choices[0].message.content });

    } catch (error: any) {
      console.error("Transcription error:", error);
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  });

  app.post("/api/ai/copilot", async (req, res) => {
    const { message, context } = req.body;

    try {
      const systemInstruction = `You are the AI Financial Copilot and Personal Finance Assistant integrated into a custom personal finance application. Your core mission is to help the user understand their spending habits, track cash flow, analyze transaction categories, and provide actionable financial insights based on their uploaded financial data.

### DATA SOURCES & CONTEXT
You have access to historical transaction datasets comprising credit card statements and bank accounts.
Current Application Context:
${JSON.stringify(context, null, 2)}

### CORE CAPABILITIES & TASKS
1. Transaction Categorization & Matching:
   - Help map new, incoming raw transaction descriptions to existing categories based on historical patterns.
   - Flag unrecognized or ambiguous merchant names and ask clarifying questions.

2. Spending & Cash Flow Analysis:
   - Break down expenses by category, time period (weekly/monthly), or source file.
   - Compute net cash flow by analyzing inflows (deposits, e-transfers in) versus outflows (e-transfers out, bank fees, purchases).

3. Subscription & Fee Detection:
   - Identify recurring fixed expenses, subscription services, and recurring bank fees.

4. Conversational Financial Advisor:
   - Answer natural language questions about spending trends, top merchants, and category-specific totals clearly and concisely.
   - Provide non-judgmental, practical guidance on optimizing daily budgets.

### RESPONSE GUIDELINES
- Be precise, analytical, and direct. When providing numbers or calculations, verify them carefully.
- Use clean formatting (bullet points, bold text, and tables) to make financial breakdowns easy to scan at a glance.
- If a user request requires data outside the scope of the loaded transaction records, politely explain what is missing.
- Maintain an encouraging, professional, and supportive tone.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: message,
        config: {
          systemInstruction,
        },
      });

      return res.json({ text: response.text });
    } catch (error: any) {
      console.error("Gemini Copilot error:", error);
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    console.log(`Serving static files from: ${distPath}`);
    
    app.use(express.static(distPath, {
      setHeaders: (res, path) => {
        if (path.endsWith('.webmanifest')) {
          res.setHeader('Content-Type', 'application/manifest+json');
        }
      }
    }));
    
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.get("/health", (req, res) => {
    res.json({ status: "ok", mode: process.env.NODE_ENV || "development" });
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT} in ${process.env.NODE_ENV || "development"} mode`);
  });
}

startServer();
