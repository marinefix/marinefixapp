interface Env {
  AI: any;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const body = await context.request.json<{ text?: string }>();
    const text = typeof body.text === "string" ? body.text.trim() : "";

    if (!text) {
      return Response.json({ error: "Text is required." }, { status: 400 });
    }

    if (text.length > 12000) {
      return Response.json({ error: "Text is too long for one translation." }, { status: 400 });
    }

    const prompt = `You are the English language assistant inside MarineFix, a marine troubleshooting knowledge-sharing platform.\n\nTranslate the author's text into clear, professional technical English. The author may write in Tamil, Tanglish, Hindi, Hinglish, Telugu, Kannada, Malayalam, or another language.\n\nSTRICT RULES:\n- Translate the author's meaning; do not invent or add technical facts.\n- Do not add measurements, readings, component ratings, fault codes, causes, diagnoses, tools, PPE, procedures, repairs, or results that the author did not state.\n- Preserve every technical detail, equipment name, component name, relay/terminal number, sequence, observation, and result from the source.\n- Do not shorten detailed technical content.\n- Do not explain your changes.\n- Return ONLY the English translation.\n\nAuthor text:\n${text}`;

    const result = await context.env.AI.run("@cf/google/gemma-4-26b-a4b-it", {
      messages: [
        { role: "system", content: "You translate technical marine troubleshooting text into professional English without inventing information." },
        { role: "user", content: prompt },
      ],
    });

    const translatedText = extractText(result).trim();
    if (!translatedText) {
      return Response.json({ error: "The AI returned an empty translation." }, { status: 502 });
    }

    return Response.json({ translatedText });
  } catch (error) {
    console.error("Translation error:", error);
    return Response.json({ error: "Translation failed. Please try again." }, { status: 500 });
  }
};

function extractText(value: any): string {
  if (typeof value === "string") return value;
  if (typeof value?.response === "string") return value.response;
  if (typeof value?.result === "string") return value.result;
  if (typeof value?.result?.response === "string") return value.result.response;
  if (typeof value?.choices?.[0]?.message?.content === "string") return value.choices[0].message.content;
  if (typeof value?.choices?.[0]?.text === "string") return value.choices[0].text;
  return "";
}
