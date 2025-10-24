const Groq = require("groq-sdk");

const groq = new Groq((api_key = process.env.GROQ_API_KEY));

async function main() {
  const completion = await groq.chat.completions
    .create({
      messages: [
        {
          role: "user",
          content: "what is the quality of Georgia tech Stinger buses?",
        },
      ],
      model: "llama-3.1-8b-instant",
    })
    .then((chatCompletion) => {
      process.stdout.write(chatCompletion.choices[0]?.message?.content || "");
    });
}

main();