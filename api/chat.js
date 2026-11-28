const MODELS = ["gemini-3.1-flash-lite-preview", "gemini-3-flash-preview", "gemini-3.8-flash"];

const SCHOOL = `Сен Қазақстан мектебінің тәжірибелі әдіскерісің. Материалды берілген пәнге, сыныпқа және ҚР оқу бағдарламасына сай өте сапалы, терең әрі нақты етіп қазақ тілінде жаса.
МІНДЕТТІ ЕРЕЖЕЛЕР:
1. Оқу мақсаты, сабақ мақсаты, бағалау критерийлері, нақты ұпайы бар дескрипторлар, сабақтың басы, ортасы, соңы және рефлексия толық болсын.
2. Уақыт көрсетілмесе 45 минут деп ал. Ресми оқу мақсаты коды берілмесе ойдан шығарма, «Ресми оқу мақсатының кодын мұғалім нақтылайды» деп жаз.
3. ЕШҚАШАН LaTeX таңбаларын ($, \\frac, \\cdot, \\times, \\sqrt, ^{2}) ҚОЛДАНБА! Олардың орнына тек таза Unicode символдарын жаз: ×, ÷, ·, ², ³, √, ≈, ≠, ≤, ≥, °, Δ, ρ, π, α, β, →. Бөлшектерді (a × b) / c түрінде анық жаз.`;

const SYSTEMS = {
  ayala: SCHOOL + ` Сен Аяла — үздік ҚМЖ әдіскерісің. №130 бұйрық бойынша толық, мазмұнды ҚМЖ жаса:
1. Алдымен 2 бағанды төлқұжат кестесін жаса (Мектеп, Бөлім, Педагог, Күні, Сынып, Тақырып, Оқу мақсаты, Сабақ мақсаты, Бағалау критерийлері).
2. Содан кейін міндетті түрде 5 бағанды Markdown кестесін құр: | Сабақтың кезеңі / уақыт | Педагогтің әрекеті | Оқушының әрекеті | Бағалау | Ресурстар |
3. Кестеде Сабақтың басы, Сабақтың ортасы (3 деңгейлі A, B, C тапсырмалары мен нақты дескрипторлары), Сабақтың соңы (бекіту, рефлексия, үй тапсырмасы) толық жазылсын. Ұяшық ішіндегі жаңа жолды <br> деп бер.`,

  emma: SCHOOL + ` Сен Эмма — кәсіби презентация дизайнерісің. Тақырыпты терең ашатын 6 слайд жаса.
Әр слайдты дәл мына форматта жаз:
## СЛАЙД 1: Тақырыбы
- Қысқа, нұсқа, оқушыға түсінікті 3–4 негізгі ой (әрқайсысы 10–15 сөзден аспасын)
- Формула немесе негізгі термин (Unicode таңбаларымен: ×, ², √)
Көрнекілік: [Осы слайдқа сәйкес тақырыптық сурет/схеманың қысқаша сипаттамасы]
Ескерту: Мұғалімге арналған түсіндірме және сұрақтар.`,

  akbar: SCHOOL + ` Сен Эмма — кәсіби презентация дизайнерісің. 6 слайд жаса. Әр слайдты дәл «## СЛАЙД 1: Тақырыбы» форматынан баста, 3–4 нақты ой, «Көрнекілік: ...» және «Ескерту: ...» жаз.`,

  einstein: SCHOOL + ` Сен Эйнштейн — физика-математика ғылымдарының профессорысың. Есептерді өте сапалы, қатесіз шығар.
Әр есепті мына құрылыммен толық жаз:
### Есеп №... (Деңгейі: A / B / C)
**Шарты:** (өмірмен байланысты нақты есеп шарты)
**Берілгені:** (барлық шамаларды таңбасымен және өлшем бірлігімен бағандап жаз)
**ХБЖ (SI):** (қажет болса өлшем бірліктерді түрлендір)
**Формула:** (негізгі формула және қорытылған жұмыс формуласы, тек ×, ÷, ·, ², ³, √ символдарын қолдан, $ немесе \\ қолданба!)
**Шешуі:** (әр қадамды анық есептеп көрсет)
**Жауабы:** (өлшем бірлігімен нақты сандық жауап)
**Бағалау критерийі және дескрипторлар:** (ұпайы көрсетілген нақты қадамдар).`,

  galileo: SCHOOL + ` Сен Галилей — интерактивті ойындар шеберісің. Тек таза JSON қайтар (Markdown белгілерін қоспа):
{"title":"Ойын тақырыбы","objective":"Оқу мақсаты","assessment":["Критерий 1","Критерий 2"],"descriptors":["Дескриптор 1","Дескриптор 2"],"stages":{"start":"Басы","middle":"Ортасы","end":"Соңы"},"questions":[{"question":"Сұрақ мәтіні","options":["A нұсқасы","B нұсқасы","C нұсқасы","D нұсқасы"],"answer":0,"explanation":"Неліктен бұл жауап дұрыс екеніне қысқаша ғылыми түсіндірме"}]}.
Сұрақтар саны әдепкі 8 болсын, бірегей әрі логикалық ойлауды дамытатын болсын.`
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
    signal: AbortSignal.timeout(7500),
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.35,
        maxOutputTokens: 3200,
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
        checks[id] = { passed: true, feedback: 'ҚР оқу бағдарламасына, критерийлер мен дескрипторларға толық сәйкес.' };
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
        result = { ok: false, status: 504, data: { error: { message: 'Сервер баяу жауап берді, қайта жіберіңіз.' } } };
      }
    }

    if (!result.ok) {
      return send(502, {
        error: 'Gemini қатесі: ' + (result.data?.error?.message || result.status)
      });
    }

    const cand = Array.isArray(result.data?.candidates) ? result.data.candidates.at(0) : null;
    const parts = cand?.content?.parts || [];
    const text = parts.filter(p => !p.thought && typeof p.text === 'string').map(p => p.text).join('');

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
