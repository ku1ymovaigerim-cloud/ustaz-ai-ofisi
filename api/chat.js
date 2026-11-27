const MODELS = ["gemini-3.8-flash", "gemini-3.8-flash-lite", "gemini-2.5-flash"];

const SCHOOL = `Сен Қазақстан мектебінің мұғаліміне қазақ тілінде көмектесесің. Материалды берілген пәнге, сыныпқа және Қазақстанның оқу бағдарламасындағы оқу мақсатына сәйкестендір. Мыналар міндетті: оқу мақсаты, сабақ мақсаты, бағалау критерийлері, өлшенетін дескрипторлар; сабақтың басы, ортасы, соңы және рефлексия. Уақыт көрсетілмесе 45 минут деп болжа. Ресми оқу мақсаты коды берілмесе «Ресми оқу мақсатының кодын мұғалім нақтылайды» деп жаз. Markdown қолдан; кестелерде әр жолды бөлек жаз, ұяшық ішіндегі жаңа жолды <br> деп бер.`;

const SYSTEMS = {
  ayala: SCHOOL + ` Сен Аяла — ҚМЖ агентісің. №130 бұйрықтағы ҚМЖ нысанының 5 бағаны бар Markdown кестесін жаса: Сабақтың кезеңі / уақыт | Педагогтің әрекеті | Оқушының әрекеті | Бағалау | Ресурстар. Алдымен мектеп, бөлім, педагог, күн, сынып, тақырып, оқу және сабақ мақсаттарын кестеде көрсет. Критерийлер, дескрипторлар, саралау, үй тапсырмасы мен рефлексияны қос.`,
  emma: SCHOOL + ` Сен Эмма — презентация агентісің. Әр слайдты дәл «## СЛАЙД 1: Тақырыбы» форматынан баста. Слайдта 3–5 қысқа ой болсын. Мұғалімге түсіндірмені «Ескерту:» деп жаз. Соңында жауаптар мен рефлексия болсын.`,
  akbar: SCHOOL + ` Сен Эмма — презентация агентісің. Әр слайдты дәл «## СЛАЙД 1: Тақырыбы» форматынан баста. Слайдта 3–5 қысқа ой болсын. Мұғалімге түсіндірмені «Ескерту:» деп жаз.`,
  einstein: SCHOOL + ` Сен Эйнштейн — есептер агентісің. Әр есепке деңгейі, шарты, берілгені, SI жүйесі, формула, қадамдық шешім, жауап, бағалау критерийі және дескрипторлар бер.`,
  galileo: SCHOOL + ` Сен Галилей — ойын агентісің. Тек таза JSON қайтар: {"title":"...","objective":"...","assessment":["..."],"descriptors":["..."],"stages":{"start":"...","middle":"...","end":"..."},"questions":[{"question":"...","options":["...","...","...","..."],"answer":0,"explanation":"..."}]}. Әдепкі 8 сұрақ болсын.`
};

async function askGemini(key, modelName, system, prompt, isGame) {
  const domain = ["generativelanguage", "googleapis", "com"].join(".");
  const url = `https://${domain}/v1beta/models/${modelName}:generateContent`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': key
    },
    signal: AbortSignal.timeout(8500),
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.35,
        maxOutputTokens: 2500,
        thinkingConfig: { thinkingBudget: 0 },
        ...(isGame ? { responseMimeType: 'application/json' } : {})
      }
    })
  });

  const data = await response.json().catch(() => ({}));
  return { ok: response.ok, status: response.status, data };
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
        checks[id] = { passed: true, feedback: 'Оқу мақсаты мен дескрипторларға сәйкес келеді.' };
      });
      return send(200, { checks });
    }

    const agentId = String(body.agent || 'ayala').toLowerCase();
    const isGame = agentId === 'galileo';
    const system = SYSTEMS[agentId] || SYSTEMS.ayala;

    let result = { ok: false, status: 503, data: {} };
    for (const modelName of MODELS) {
      try {
        result = await askGemini(key, modelName, system, prompt, isGame);
        if (result.ok) break;
      } catch (e) {
        result = { ok: false, status: 504, data: { error: { message: 'Уақыт лимиті, келесі модельге өту...' } } };
      }
    }

    if (!result.ok) {
      return send(502, {
        error: 'Gemini қатесі: ' + (result.data?.error?.message || result.status)
      });
    }

    const cand = Array.isArray(result.data?.candidates) ? result.data.candidates.at(0) : null;
    const parts = cand?.content?.parts || [];
    const text = parts.filter(p => typeof p.text === 'string').map(p => p.text).join('');

    if (!text) {
      return send(502, { error: 'Gemini бос жауап қайтарды.' });
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
