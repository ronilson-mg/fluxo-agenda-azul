import { GoogleGenAI } from "@google/genai";

// Inicialização segura da IA seguindo as diretrizes oficiais
const ai = new GoogleGenAI({ 
  apiKey: (typeof process !== 'undefined' && process.env.GEMINI_API_KEY) || "" 
});

export async function generateCollectionMessage(
  clientName: string,
  amount: number,
  dueDate: string,
  tone: 'friendly' | 'firm' | 'urgent',
  isPremium: boolean = false,
  pixKey?: string,
  companyName?: string
) {
  // Fallback imediato se não houver chave (evita erro de rede)
  if (!(typeof process !== 'undefined' && process.env.GEMINI_API_KEY)) {
    let fallbackText = `Olá ${clientName}, verifiquei aqui que o pagamento de R$ ${amount.toFixed(2)} (vencimento ${dueDate}) ainda não foi identificado. Como posso te ajudar a regularizar isso hoje?`;
    if (pixKey) {
      fallbackText += `\n\n🔑 *Chave PIX:* ${pixKey}${companyName ? `\n🏦 *Favorecido:* ${companyName}` : ''}`;
    }
    return fallbackText;
  }

  // Seleção de modelo baseada no plano: Pro para Premium/Elite, Flash para os demais
  const modelName = isPremium ? "gemini-3.1-pro-preview" : "gemini-3-flash-preview";

  const performancePrompt = isPremium 
    ? "Aplique gatilhos mentais de reciprocidade, escassez e compromisso. Use uma linguagem extremamente personalizada, elegante e altamente persuasiva para garantir prioridade no pagamento."
    : "Use uma linguagem clara, profissional e direta para incentivar o pagamento de forma amigável.";

  const prompt = `
    Persona: Especialista em cobrança de alta performance e psicologia comportamental.
    Tarefa: Criar uma mensagem curta (máx 350 caracteres) para WhatsApp.
    
    ESTRATÉGIA: ${performancePrompt}
    TOM: ${tone === 'friendly' ? 'Amigável' : tone === 'firm' ? 'Firme' : 'Crítico/Urgente'}
    
    DADOS:
    - Cliente: ${clientName}
    - Valor: R$ ${amount.toFixed(2)}
    - Vencimento: ${dueDate}
    ${pixKey ? `- Chave PIX do nosso cliente para receber: ${pixKey}` : ''}
    ${companyName ? `- Nome do Favorecido/Empresa: ${companyName}` : ''}
    
    REGRAS CRÍTICAS (Art. 42 CDC):
    - SEM constrangimento ou ameaças.
    - Use termos como "pendência", "conciliação" ou "ajuste de fluxo".
    - FOCO: Gerar ação (Pix/Resposta) imediata.
    ${pixKey ? `- OBRIGATÓRIO: Apresente de forma amigável e visível a Chave PIX: ${pixKey}${companyName ? ` (Favorecido: ${companyName})` : ''} ao final da mensagem.` : ''}
    
    Retorne APENAS o texto da mensagem com emojis profissionais.
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
    });

    if (response.text) return response.text;
    
    let fallbackText = `Olá ${clientName}, notei que o valor de R$ ${amount.toFixed(2)} está em aberto. Podemos fechar esse acerto agora para manter seu histórico positivo?`;
    if (pixKey) {
      fallbackText += `\n\n🔑 *Chave PIX:* ${pixKey}${companyName ? `\n🏦 *Favorecido:* ${companyName}` : ''}`;
    }
    return fallbackText;
  } catch (error) {
    console.error("Erro na Gemini API:", error);
    // Fallback de contingência para garantir que o usuário sempre tenha uma mensagem
    let fallbackText = `Olá ${clientName}, verifiquei que o pagamento de R$ ${amount.toFixed(2)} (vencimento ${dueDate}) ainda não consta no sistema. Poderia me confirmar se já foi realizado?`;
    if (pixKey) {
      fallbackText += `\n\n🔑 *Chave PIX:* ${pixKey}${companyName ? `\n🏦 *Favorecido:* ${companyName}` : ''}`;
    }
    return fallbackText;
  }
}
