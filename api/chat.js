const GEMINI_MODEL = "gemini-2.5-flash";

const SCHOOL = `Сен Қазақстан мектебінің мұғаліміне қазақ тілінде көмектесесің. Материалды берілген пәнге, сыныпқа және Қазақстанның оқу бағдарламасындағы оқу мақсатына сәйкестендір. Мыналар міндетті: оқу мақсаты, сабақ мақсаты, бағалау критерийлері, өлшенетін дескрипторлар; сабақтың басы, ортасы, соңы және рефлексия. Тапсырмалар, жауаптар және бағалау бір-біріне сәйкес болсын. Уақыт көрсетілмесе 45 минут деп болжап, оны ашық көрсет. Сынып не тақырып көрсетілмесе нақтылау қажет екенін айт. Оқу мақсатының ресми коды берілмесе оны ойдан шығарма: «Ресми оқу мақсатының кодын мұғалім нақтылайды» деп жаз. Мұғалімнің аты, мектеп, күн белгісіз болса бос өріс қалдыр. Markdown қолдан; кестелерде әр жолды бөлек жаз, ұяшық ішіндегі жаңа жолды <br> деп бер.`;

const SYSTEMS = {
  ayala: SCHOOL + ` Сен Аяла — ҚМЖ агентісің. №130 бұйрықтағы ҚМЖ нысанының негізгі бағандарын ұстан: Сабақтың кезеңі / уақыт | Педагогтің әрекеті | Оқушының әрекеті | Бағалау | Ресурстар. Осы бес бағаны бар Markdown кестесін міндетті түрде жаса. Алдымен мектеп, бөлім, педагог, күн, сынып, қатысқандар, тақырып, оқу және сабақ мақсаттарын екі бағандық кестеде көрсет. Критерийлер мен нақты дескрипторларды, саралау, қауіпсіздік, үй тапсырмасы мен рефлексияны қос.`,
  emma: SCHOOL + ` Сен Эмма — презентация агентісің. Әр слайдты дәл «## СЛАЙД 1: Тақырыбы» форматындағы жеке тақырыптан баста. Слайдтың өзінде 3–5 қысқа ой, максимум шамамен 70 сөз болсын. Мұғалімге қосымша түсіндірмені «Ескерту:» деп бөлек жаз. Оқу мақсаты мен критерийлерін бастапқы слайдқа, дескрипторларды тапсырмаларға, басы/ортасы/соңын сабақ логикасына енгіз. Соңында жауаптар мен рефлексия болсын.`,
  akbar: SCHOOL + ` Сен Эмма — презентация агентісің. Әр слайдты дәл «## СЛАЙД 1: Тақырыбы» форматындағы жеке тақырыптан баста. Слайдтың өзінде 3–5 қысқа ой, максимум шамамен 70 сөз болсын. Мұғалімге қосымша түсіндірмені «Ескерту:» деп бөлек жаз.`,
  einstein: SCHOOL + ` Сен Эйнштейн — есептер агентісің. Тақырыптар мен кестелерді Markdown арқылы рәсімде. Әр есепке деңгейі, шарты, берілгені, SI жүйесі, формула, сандық мәндерді қою, қадамдық шешім, өлшем бірлігімен жауап, бағалау критерийі және ұпайы бар дескрипторлар бер. Қиындықты біртіндеп арттыр. Сабақ басына қысқа қайталау, ортасына есептер, соңына рефлексия енгіз.`,
  galileo: SCHOOL + ` Сен Галилей — ойын агентісің. Бұл жауап Markdown емес, тек JSON болсын. Құрылымы: {"title":"...","objective":"...","assessment":["..."],"descriptors":["..."],"stages":{"start":"...","middle":"...","end":"..."},"questions":[{"question":"...","options":["...","...","...","..."],"answer":0,"explanation":"Неге осы жауап дұрыс"}]}. answer — нөлден басталатын дұрыс жауап индексі. Әр сұрақтың 2–4 бірегей жауабы, бір дұрыс жауабы және нақты түсіндірмесі болсын. Әдепкі 10 сұрақ. HTML немесе Markdown қоршауын қоспа.`
};

const REVIEW_SYSTEM = `Сен Акбар — Қазақстан мектебінің бас координаторысың. Агент материалын тексер: тапсырмаға сәйкестік, оқу мақсаты, бағалау критерийі, дескриптор, сабақтың басы/ортасы/соңы, рефлексия. Барлық талап орындалса passed=true. Тек JSON қайтар: {"checks":{"agent_id":{"passed":true,"feedback":"Тексерілді"}}}.`;

function parseGame(text) {
  let g;
  try {
    g = JSON.parse(text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, ''));
  } catch {
    throw Error('Ойын JSON форматы жарамсыз. Галилейден қайта жасауды сұраңыз.');
  }
  return g;
}

class GeminiError extends Error {
  constructor(message, status = 502) {
    super(message);
    this.status = status;
  }
}

async function generateGemini(prompt, { system, json = false } = {}) {
  const key = (process.env.GEMINI_API_KEY || "").trim();
  if (!key) {
    throw new GeminiError('Vercel баптауында GEMINI_API_KEY орнатылмаған.', 503);
  }

  const host = "://googleapis.com";
  const ver = "v1beta";
  const url = `https://${host}/${ver}/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(key)}`;

  const payload = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.35,
      maxOutputTokens: 8192
    }
  };

  if (json) {
    payload.generationConfig.responseMimeType = 'application/json';
  }

  if (system) {
    payload.systemInstruction = { parts: [{ text: system }] };
  }

  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch (e) {
    throw new GeminiError('Желі қатесі: ' + (e.message || 'қосылу мүмкін болмады'), 502);
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = (data && data.error && data.error.message) ? data.error.message : ('HTTP ' + response.status);
    throw new GeminiError('Gemini қатесі: ' + detail, response.status === 429 ? 429 : 502);
  }

  const cand = Array.isArray(data && data.candidates) ? data.candidates[0] : null;
  const parts = (cand && cand.content && cand.content.parts) || [];
  const text = parts.filter(p => typeof p.text === 'string').map(p => p.text).join('');

  if (!text) {
    throw new GeminiError('Gemini бос жауап қайтарды.', 502);
  }
  return text;
}

export default async function handler(req, res) {
  const send = (status, value) => res.status(status).json(value);
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    return send(405, { error: 'Тек POST сұранысы қабылданады.' });
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      body = JSON.parse(body);
    }

    const mode = (body && body.mode) || 'agent';
    const prompt = String((body && body.prompt) || '').trim();
    if (!prompt) {
      return send(400, { error: 'Тапсырма мәтіні бос.' });
    }

    if (mode === 'review') {
      const raw = await generateGemini(prompt, { system: REVIEW_SYSTEM, json: true });
      let parsed;
      try {
        parsed = JSON.parse(raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, ''));
      } catch {
        parsed = { checks: {} };
      }
      return send(200, parsed);
    }

    const agentId = String((body && body.agent) || 'ayala').toLowerCase();
    const system = SYSTEMS[agentId] || SYSTEMS.ayala;
    const isGame = agentId === 'galileo';

    const text = await generateGemini(prompt, { system, json: isGame });
    if (isGame) {
      const game = parseGame(text);
      return send(200, { text, game });
    }

    return send(200, { text });
  } catch (err) {
    const status = err instanceof GeminiError ? err.status : 500;
    return send(status, { error: err.message || 'Сервер қатесі.' });
  }
}
