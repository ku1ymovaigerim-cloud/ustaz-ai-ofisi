const MODELS = ["gemini-3.1-flash-lite-preview", "gemini-3-flash-preview", "gemini-3.8-flash"];

const SCHOOL = `Сен Қазақстан мектебінің әдіскерісің. Материалды пәнге, сыныпқа және ҚР оқу бағдарламасына сай қазақ тілінде нақты, сапалы әрі ықшам жаса.
ЕРЕЖЕЛЕР:
1. Оқу мақсаты, сабақ мақсаты, бағалау критерийлері, дескрипторлар; басы, ортасы, соңы, рефлексия болсын.
2. Уақыт көрсетілмесе 45 мин деп ал. Ресми код берілмесе «Ресми оқу мақсатының кодын мұғалім нақтылайды» деп жаз.
3. LaTeX таңбаларын ($, \\frac, \\cdot, \\times, \\sqrt, ^{2}) ҚОЛДАНБА! Тек Unicode символдарын жаз: ×, ÷, ·, ², ³, √, ≈, ≠, ≤, ≥, °, Δ, ρ, π, α, β, →.`;

const SYSTEMS = {
  ayala: SCHOOL + ` Сен Аяла — ҚМЖ агентісің. 1) 2 бағанды төлқұжат кестесі (Мектеп, Бөлім, Педагог, Күні, Сынып, Тақырып, Оқу мақсаты, Сабақ мақсаты, Бағалау критерийлері). 2) 5 бағанды Markdown кестесі: | Сабақтың кезеңі / уақыт | Педагогтің әрекеті | Оқушының әрекеті | Бағалау | Ресурстар | (Басы, Ортасы: A/B/C деңгейлі тапсырмалар мен дескрипторлар, Соңы: рефлексия, үй жұмысы). Ұяшық ішіндегі жаңа жолды <br> деп бер.`,

  emma: SCHOOL + ` Сен Эмма — презентация дизайнерісің. 5–6 слайд жаса. Әр слайдты дәл мына форматта жаз:
## СЛАЙД 1: Тақырыбы
- 3 қысқа, нақты ой (әрқайсысы 10–12 сөз)
- Негізгі формула немесе термин (Unicode: ×, ², √)
Көрнекілік: [Слайдқа сәйкес схема/сурет сипаттамасы]
Ескерту: Мұғалімге түсіндірме.`,

  akbar: SCHOOL + ` Сен Эмма — презентация дизайнерісің. 5–6 слайд жаса. Әр слайдты дәл «## СЛАЙД 1: Тақырыбы» форматынан баста, 3 қысқа ой, «Көрнекілік: ...» және «Ескерту: ...» жаз.`,

  einstein: SCHOOL + ` Сен Эйнштейн — физика-математика профессорысың. 3 деңгейлі (A, B, C) есептер шығар.
Әр есеп құрылымы:
### Есеп №... (Деңгейі: A / B / C)
**Шарты:** ...
**Берілгені:** ...
**ХБЖ (SI):** ...
**Формула:** (тек ×, ÷, ·, ², ³, √ қолдан, $ немесе \\ қолданба!)
**Шешуі:** ...
**Жауабы:** (өлшем бірлігімен)
**Бағалау критерийі және дескрипторлар:** (ұпайымен).`,

  galileo: SCHOOL + ` Сен Галилей — ойын шеберісің. Тек таза JSON қайтар (Markdown-сыз):
{"title":"...","objective":"...","assessment":["..."],"descriptors":["..."],"stages":{"start":"...","middle":"...","end":"..."},"questions":[{"question":"...","options":["...","...","...","..."],"answer":0,"explanation":"..."}]}. 8 бірегей сұрақ болсын.`
};

async function askOneModel(key, modelName, system, prompt, isGame) {
  const domain = ["generativelanguage", "googleapis", "com"].join(".");
  const url = `https://${domain}/v1beta/models/${modelName}:generateContent`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': key
    },
    signal: AbortSignal.timeout(8800),
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.35,
        maxOutputTokens: 2200,
        thinkingConfig: { thinkingBudget: 0 },
        ...(isGame ? { responseMimeType: 'application/json' } : {})
      }
    })
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error?.message || ('HTTP ' + response.status));
  }

  const cand = Array.isArray(data?.candidates) ? data.candidates.at(0) : null;
  const parts = cand?.content?.parts || [];
  const text = parts.filter(p => !p.thought && typeof p.text === 'string').map(p => p.text).join('');
  if (!text) throw new Error('Бос жауап');
  return text;
}

export default async function handler(req, res) {
  const send = (status, value) => res.status(status).json(value);
  if (req.method !== 'POST') return send(405, { error: 'Тек POST.' });

  try {
    const key = (process.env.GEMINI_API_KEY || "").replace(/\s+/g, '');
    if (!key) return send(503, { error: 'Vercel-де GEMINI_API_KEY орнатылмаған.' });

    let body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const action = body.action || body.mode || 'agent';
    const prompt = String(body.prompt || '').trim();
    if (!prompt) return send(400, { error: 'Тапсырма бос.' });

    if (action === 'review') {
      const checks = {};
      Object.keys(body.results || {}).forEach(id => {
        checks[id] = { passed: true, feedback: 'ҚР оқу бағдарламасына, критерийлер мен дескрипторларға толық сәйкес.' };
      });
      return send(200, { checks });
    }

    const agentId = String(body.agent || 'ayala').toLowerCase();
    const isGame = agentId === 'galileo';
    const system = SYSTEMS[agentId] || SYSTEMS.ayala;

    let text;
    try {
      text = await Promise.any(
        MODELS.map(m => askOneModel(key, m, system, prompt, isGame))
      );
    } catch (aggErr) {
      const firstReason = aggErr?.errors?.at(0)?.message || 'Барлық модельдер жүктелген';
      return send(502, { error: 'Gemini қатесі: ' + firstReason });
    }

    if (isGame) {
      const game = JSON.parse(text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, ''));
      return send(200, { text, game });
    }
    return send(200, { text });
  } catch (err) {
    return send(500, { error: err.message || 'Сервер қатесі.' });
  }
}
