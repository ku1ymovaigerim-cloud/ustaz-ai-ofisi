const GROQ_MODEL = "llama-3.3-70b-versatile";

const SCHOOL = `Сен Қазақстан мектебінің мұғаліміне қазақ тілінде көмектесесің. Материалды берілген пәнге, сыныпқа және Қазақстанның оқу бағдарламасындағы оқу мақсатына сәйкестендір. Мыналар міндетті: оқу мақсаты, сабақ мақсаты, бағалау критерийлері, өлшенетін дескрипторлар; сабақтың басы, ортасы, соңы және рефлексия. Тапсырмалар, жауаптар және бағалау бір-біріне сәйкес болсын. Уақыт көрсетілмесе 45 минут деп болжап, оны ашық көрсет. Ресми оқу мақсаты коды берілмесе «Ресми оқу мақсатының кодын мұғалім нақтылайды» деп жаз. Markdown қолдан.`;

const SYSTEMS = {
  ayala: SCHOOL + ` Сен Аяла — ҚМЖ агентісің. №130 бұйрықтағы ҚМЖ нысанының 5 бағаны бар Markdown кестесін міндетті түрде жаса: Сабақтың кезеңі / уақыт | Педагогтің әрекеті | Оқушының әрекеті | Бағалау | Ресурстар. Алдымен мектеп, бөлім, педагог, күн, сынып, тақырып, оқу және сабақ мақсаттарын кестеде көрсет. Критерийлер, дескрипторлар, саралау, үй тапсырмасы мен рефлексияны қос.`,
  emma: SCHOOL + ` Сен Эмма — презентация агентісің. Әр слайдты дәл «## СЛАЙД 1: Тақырыбы» форматынан баста. Слайдта 3–5 қысқа ой болсын. Мұғалімге түсіндірмені «Ескерту:» деп жаз. Соңында жауаптар мен рефлексия болсын.`,
  akbar: SCHOOL + ` Сен Эмма — презентация агентісің. Әр слайдты дәл «## СЛАЙД 1: Тақырыбы» форматынан баста. Слайдта 3–5 қысқа ой болсын. Мұғалімге түсіндірмені «Ескерту:» деп жаз.`,
  einstein: SCHOOL + ` Сен Эйнштейн — есептер агентісің. Әр есепке деңгейі, шарты, берілгені, SI жүйесі, формула, қадамдық шешім, жауап, бағалау критерийі және дескрипторлар бер.`,
  galileo: SCHOOL + ` Сен Галилей — ойын агентісің. Тек таза JSON қайтар: {"title":"...","objective":"...","assessment":["..."],"descriptors":["..."],"stages":{"start":"...","middle":"...","end":"..."},"questions":[{"question":"...","options":["...","...","...","..."],"answer":0,"explanation":"..."}]}. Әдепкі 10 сұрақ болсын.`
};

const REVIEW_SYSTEM = `Сен Акбар — бас координаторсың. Тек JSON қайтар: {"checks":{"agent_id":{"passed":true,"feedback":"Тексерілді"}}}.`;

export default async function handler(req, res) {
  const send = (status, value) => res.status(status).json(value);
  if (req.method !== 'POST') return send(405, { error: 'Тек POST.' });

  try {
    const key = (process.env.GROQ_API_KEY || "").replace(/\s+/g, '');
    if (!key) return send(503, { error: 'Vercel-де GROQ_API_KEY орнатылмаған.' });

    let body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const mode = body.mode || 'agent';
    const prompt = String(body.prompt || '').trim();
    if (!prompt) return send(400, { error: 'Тапсырма бос.' });

    const agentId = String(body.agent || 'ayala').toLowerCase();
    const isGame = agentId === 'galileo' || mode === 'review';
    const system = mode === 'review' ? REVIEW_SYSTEM : (SYSTEMS[agentId] || SYSTEMS.ayala);

    const host = ["api", "groq", "com"].join(".");
    const groqUrl = `https://${host}/openai/v1/chat/completions`;

    const response = await fetch(groqUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + key
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: prompt }
        ],
        temperature: 0.35,
        max_tokens: 4096,
        ...(isGame ? { response_format: { type: 'json_object' } } : {})
      })
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return send(502, {
        error: 'Groq қатесі: ' + (data?.error?.message || response.status) + ' [Кілт басы: ' + key.slice(0, 8) + ', ұзындығы: ' + key.length + ']'
      });
    }

    const firstChoice = Array.isArray(data?.choices) ? data.choices.at(0) : null;
    const text = firstChoice?.message?.content || '';

    if (mode === 'review') {
      try { return send(200, JSON.parse(text)); } catch { return send(200, { checks: {} }); }
    }
    if (agentId === 'galileo') {
      const game = JSON.parse(text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, ''));
      return send(200, { text, game });
    }
    return send(200, { text });
  } catch (err) {
    return send(500, { error: err.message || 'Сервер қатесі.' });
  }
}

