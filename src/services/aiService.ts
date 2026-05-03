import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = (typeof process !== 'undefined' && process.env.GEMINI_API_KEY) || "";
const genAI = new GoogleGenerativeAI(apiKey);

export async function generateCollectionMessage(
  clientName: string,
  amount: number,
  dueDate: string,
  tone: 'friendly' | 'firm' | 'urgent',
  isPremium: boolean = false
) {
  const model = genAI.getGenerativeModel({ 
    model: isPremium ? "gemini-1.5-pro" : "gemini-1.5-flash" 
  });

  const performancePrompt = isPremium 
    ? "Use técnicas avançadas de gatilhos mentais da psicologia comportamental (como antecipação e reciprocidade). Adapte a linguagem para ser extremamente personalizada e persuasiva, mantendo a elegância."
    : "Use uma linguagem profissional, clara e direta para incentivar o pagamento.";

  const prompt = `
    Você é um especialista em cobrança e recuperação de crédito de alta performance, treinado em negociação e psicologia.
    Crie uma mensagem irresistível para WhatsApp para cobrar um cliente.
    
    ESTRATÉGIA: ${performancePrompt}
    
    Dados:
    Cliente: ${clientName}
    Valor: R$ ${amount.toFixed(2)}
    Vencimento: ${dueDate}
    Tom: ${tone === 'friendly' ? 'Amigável' : tone === 'firm' ? 'Firme' : 'Crítico/Urgente'}
    
    CONSTITUIÇÃO E ÉTICA (OBRIGATÓRIO):
    1. Respeite o Artigo 42 do CDC brasileiro: nada de intimidação ou constrangimento.
    2. Linguagem elegante. Prefira "conciliação", "pendência", "ajuste de fluxo".
    
    REGRAS:
    - Máximo 350 caracteres.
    - Use emojis profissionais (🤝, ✅, ⏳).
    - FOCO: Gerar o pagamento imediato ou uma resposta.
    - Retorne APENAS o texto.
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Erro ao gerar mensagem por IA:", error);
    // Fallback caso a IA falhe
    return `Olá ${clientName}, notamos que o pagamento de R$ ${amount.toFixed(2)} vencido em ${dueDate} ainda não consta em nosso sistema. Poderia nos enviar o comprovante?`;
  }
}
