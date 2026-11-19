import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { WebSocketServer, WebSocket } from 'ws';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

function generateLuhnValidNumber(brand: 'Visa' | 'Mastercard'): string {
  const prefix = brand === 'Visa' ? '453289' : '541275';
  const digits: number[] = prefix.split('').map(Number);

  while (digits.length < 15) {
    digits.push(Math.floor(Math.random() * 10));
  }

  let sum = 0;
  for (let i = 0; i < 15; i++) {
    let d = digits[14 - i];
    if (i % 2 === 0) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }

  const checkDigit = (10 - (sum % 10)) % 10;
  digits.push(checkDigit);
  return digits.join('').replace(/(.{4})/g, '$1 ').trim();
}

interface WsClientMeta {
  room: string;
  senderUid?: string;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  const server = http.createServer(app);
  const wss = new WebSocketServer({ server, path: '/ws' });
  const clientRooms = new Map<WebSocket, WsClientMeta>();
  const recentRoomMessages = new Map<string, unknown[]>();

  wss.on('connection', (ws) => {
    clientRooms.set(ws, { room: 'community:global' });

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        if (msg.type === 'join' && typeof msg.room === 'string') {
          clientRooms.set(ws, { room: msg.room, senderUid: msg.senderUid });
          const history = recentRoomMessages.get(msg.room) || [];
          ws.send(JSON.stringify({ type: 'history', room: msg.room, messages: history }));
          return;
        }

        if (msg.type === 'chat:message' && typeof msg.room === 'string' && msg.payload) {
          const room = msg.room;
          const list = recentRoomMessages.get(room) || [];
          const exists = list.some((m: any) => m.id === msg.payload.id);
          if (!exists) {
            list.push(msg.payload);
            if (list.length > 60) list.shift();
            recentRoomMessages.set(room, list);
          }

          const out = JSON.stringify({
            type: 'chat:message',
            room,
            payload: msg.payload,
          });

          for (const [client, meta] of clientRooms.entries()) {
            if (meta.room === room && client.readyState === WebSocket.OPEN) {
              client.send(out);
            }
          }
        }
      } catch (err) {
        console.error('WebSocket message error:', err);
      }
    });

    ws.on('close', () => {
      clientRooms.delete(ws);
    });
  });

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', service: 'g-wallet-server' });
  });

  app.post('/api/ai/virtual-card', async (req, res) => {
    try {
      const { brand, cardholderName, countryCode, depositUsd } = req.body as {
        brand?: 'Visa' | 'Mastercard';
        cardholderName?: string;
        countryCode?: string;
        depositUsd?: number;
      };

      const chosenBrand: 'Visa' | 'Mastercard' = brand === 'Mastercard' ? 'Mastercard' : 'Visa';
      const holder = (cardholderName || 'G WALLET MEMBER').toUpperCase().slice(0, 40);
      const region = (countryCode || 'GLOBAL').toUpperCase();
      const deposit = Number(depositUsd || 25);

      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({
          error: 'GEMINI_API_KEY is not configured in server environment secrets.',
        });
      }

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `Design a luxury virtual ${chosenBrand} card profile for G Wallet member "${holder}" in region "${region}" with initial load $${deposit} USD. Return a tierName (concise 2-4 words), aiDesignTheme (one of: "obsidian-gold", "royal-navy", "emerald-vault", "crimson-elite"), and exactly 4 crisp practical payment benefits (each under 60 characters).`,
        config: {
          systemInstruction: 'You are the G Wallet virtual card product architect. Output strictly valid JSON matching the schema.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              tierName: {
                type: Type.STRING,
                description: 'Luxury virtual card tier title, 2 to 4 words.',
              },
              aiDesignTheme: {
                type: Type.STRING,
                description: 'Visual theme token: obsidian-gold, royal-navy, emerald-vault, or crimson-elite.',
              },
              aiBenefits: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'Four concise cardholder benefits.',
              },
            },
            required: ['tierName', 'aiDesignTheme', 'aiBenefits'],
          },
        },
      });

      const parsed = JSON.parse((response.text ?? '{}').trim());
      const allowedThemes = ['obsidian-gold', 'royal-navy', 'emerald-vault', 'crimson-elite'];
      const theme = allowedThemes.includes(parsed.aiDesignTheme) ? parsed.aiDesignTheme : 'obsidian-gold';
      const benefits = Array.isArray(parsed.aiBenefits) && parsed.aiBenefits.length > 0
        ? parsed.aiBenefits.slice(0, 4).map((b: unknown) => String(b).slice(0, 100))
        : [
            '3D Secure global online checkout',
            'Zero G Wallet marketplace fee',
            'Instant freeze & single-use controls',
            'Multi-currency auto settlement',
          ];

      const fullNumber = generateLuhnValidNumber(chosenBrand);
      const compact = fullNumber.replace(/\s+/g, '');
      const last4 = compact.slice(-4);
      const maskedNumber = `${compact.slice(0, 4)} •••• •••• ${last4}`;
      const cvv = String(Math.floor(100 + Math.random() * 900));
      const now = new Date();
      const expMonth = String(now.getMonth() + 1).padStart(2, '0');
      const expYear = String((now.getFullYear() + 4) % 100).padStart(2, '0');

      res.json({
        brand: chosenBrand,
        cardholderName: holder,
        fullNumber,
        maskedNumber,
        last4,
        cvv,
        expiry: `${expMonth}/${expYear}`,
        tierName: String(parsed.tierName || `G Wallet ${chosenBrand} Sovereign`).slice(0, 50),
        aiDesignTheme: theme,
        aiBenefits: benefits,
      });
    } catch (err: any) {
      console.error('Gemini Virtual Card generation failed:', err);
      res.status(500).json({
        error: err?.message || 'Failed to generate AI virtual card profile.',
      });
    }
  });

  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`G Wallet server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
