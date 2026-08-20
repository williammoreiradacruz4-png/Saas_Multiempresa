import { BarberPromotionBanner } from '../types';

/**
 * Banco de Imagens Curadas da Web / Google / Unsplash com alta resolução
 */
export const SAMPLE_GOOGLE_BARBER_IMAGES = [
  {
    title: 'Degradê / Fade Navalhado Moderno',
    category: 'Cortes',
    url: 'https://images.unsplash.com/photo-1622286342621-4bd786c2447c?auto=format&fit=crop&w=1200&q=80',
  },
  {
    title: 'Barboterapia com Toalha Quente & Navalha',
    category: 'Barba',
    url: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=1200&q=80',
  },
  {
    title: 'Corte Clássico na Tesoura & Acabamento',
    category: 'Cortes',
    url: 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&w=1200&q=80',
  },
  {
    title: 'Experiência VIP / Dia do Noivo',
    category: 'VIP',
    url: 'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?auto=format&fit=crop&w=1200&q=80',
  },
  {
    title: 'Ambiente Barber Lounge & Cerveja',
    category: 'Lounge',
    url: 'https://images.unsplash.com/photo-1512690459411-b9245aed614b?auto=format&fit=crop&w=1200&q=80',
  },
  {
    title: 'Pai & Filho no Estilo',
    category: 'Combo',
    url: 'https://images.unsplash.com/photo-1517832606299-7ae9b720a186?auto=format&fit=crop&w=1200&q=80',
  },
  {
    title: 'Tratamento de Barba & Óleos Nobres',
    category: 'Barba',
    url: 'https://images.unsplash.com/photo-1621605815971-fbc98d665033?auto=format&fit=crop&w=1200&q=80',
  },
  {
    title: 'Produtos & Pomadas Modeladoras',
    category: 'Produtos',
    url: 'https://images.unsplash.com/photo-1534778356534-d3d45b6df1da?auto=format&fit=crop&w=1200&q=80',
  },
  {
    title: 'Acabamento Preciso com Navalhete',
    category: 'Acabamento',
    url: 'https://images.unsplash.com/photo-1622287162716-f311baa1a2b8?auto=format&fit=crop&w=1200&q=80',
  },
  {
    title: 'Corte Infantil & Jovem Estiloso',
    category: 'Kids/Jovem',
    url: 'https://images.unsplash.com/photo-1605497788044-5a32c7078486?auto=format&fit=crop&w=1200&q=80',
  },
  {
    title: 'Nevou / Platinado Perfeito',
    category: 'Química',
    url: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=1200&q=80',
  },
  {
    title: 'Barbearia Vintage Premium',
    category: 'Lounge',
    url: 'https://images.unsplash.com/photo-1593702295094-aea22597af65?auto=format&fit=crop&w=1200&q=80',
  },
];

/**
 * 15 Banners Iniciais de Promoções de Alto Impacto para a Barbearia
 */
export const DEFAULT_PROMOTION_BANNERS: BarberPromotionBanner[] = [
  {
    id: 'banner-1',
    title: 'Combo Supremo: Cabelo + Barba Alinhada',
    subtitle: 'Ganhe hidratação capilar e uma cerveja artesanal gelada cortesia.',
    badge: '🔥 30% OFF',
    imageUrl: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=1200&q=80',
    ctaText: 'Agendar Combo Promocional',
    ctaAction: 'booking',
    serviceTargetId: 'srv-3',
    serviceTargetName: 'Combo Cabelo + Barba',
    originalPrice: 85.0,
    promoPrice: 59.9,
    discountPercentage: 30,
    expiresAt: 'Válido até domingo',
    active: true,
    order: 1,
    themeColor: 'amber',
  },
  {
    id: 'banner-2',
    title: 'Terça & Quarta Maluca do Corte',
    subtitle: 'Corte Degradê navalhado com desconto especial nos dias mais tranquilos.',
    badge: '⚡ SÓ TER & QUA',
    imageUrl: 'https://images.unsplash.com/photo-1622286342621-4bd786c2447c?auto=format&fit=crop&w=1200&q=80',
    ctaText: 'Garantir Horário na Quarta',
    ctaAction: 'booking',
    serviceTargetId: 'srv-4',
    serviceTargetName: 'Corte Degradê / Fade',
    originalPrice: 55.0,
    promoPrice: 39.9,
    discountPercentage: 28,
    expiresAt: 'Toda terça e quarta-feira',
    active: true,
    order: 2,
    themeColor: 'emerald',
  },
  {
    id: 'banner-3',
    title: 'Barboterapia Vip com Toalha Quente',
    subtitle: 'Alinhamento com navalha, esfoliação facial e massagem relaxante.',
    badge: '💈 EXPERIÊNCIA VIP',
    imageUrl: 'https://images.unsplash.com/photo-1621605815971-fbc98d665033?auto=format&fit=crop&w=1200&q=80',
    ctaText: 'Experimentar Barboterapia',
    ctaAction: 'booking',
    serviceTargetId: 'srv-2',
    serviceTargetName: 'Barba Premium',
    originalPrice: 45.0,
    promoPrice: 35.0,
    discountPercentage: 22,
    expiresAt: 'Vagas limitadas por dia',
    active: true,
    order: 3,
    themeColor: 'gold',
  },
  {
    id: 'banner-4',
    title: 'Fidelidade em Dobro nesta Sexta',
    subtitle: 'Qualquer serviço agendado pelo App vale 2 selos no seu cartão fidelidade.',
    badge: '⭐ SELO EM DOBRO',
    imageUrl: 'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?auto=format&fit=crop&w=1200&q=80',
    ctaText: 'Acumular 2x Selos Agora',
    ctaAction: 'booking',
    expiresAt: 'Exclusivo nas sextas',
    active: true,
    order: 4,
    themeColor: 'purple',
  },
  {
    id: 'banner-5',
    title: 'Combo Pai & Filho: Estilo em Família',
    subtitle: 'Traga seu filho e ganhe 50% de desconto no segundo corte.',
    badge: '👨‍👦 PAI & FILHO',
    imageUrl: 'https://images.unsplash.com/photo-1517832606299-7ae9b720a186?auto=format&fit=crop&w=1200&q=80',
    ctaText: 'Agendar para os Dois',
    ctaAction: 'booking',
    originalPrice: 90.0,
    promoPrice: 67.5,
    discountPercentage: 25,
    expiresAt: 'Válido todo sábado e domingo',
    active: true,
    order: 5,
    themeColor: 'blue',
  },
  {
    id: 'banner-6',
    title: 'Primeira Vez na Barbearia? -20% OFF',
    subtitle: 'Seja bem-vindo! Desconto automático no seu primeiro agendamento pelo App.',
    badge: '🎁 BOAS-VINDAS',
    imageUrl: 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&w=1200&q=80',
    ctaText: 'Resgatar Desconto de Boas-Vindas',
    ctaAction: 'booking',
    discountPercentage: 20,
    expiresAt: 'Válido no 1º cadastro',
    active: true,
    order: 6,
    themeColor: 'emerald',
  },
  {
    id: 'banner-7',
    title: 'Happy Hour Barbearia: Corte + Chopp Free',
    subtitle: 'Das 17h às 20h de quinta e sexta, seu corte acompanha um Chopp trincando.',
    badge: '🍺 CHOPP LIBERADO',
    imageUrl: 'https://images.unsplash.com/photo-1512690459411-b9245aed614b?auto=format&fit=crop&w=1200&q=80',
    ctaText: 'Marcar no Happy Hour',
    ctaAction: 'booking',
    expiresAt: 'Quinta e Sexta das 17h às 20h',
    active: true,
    order: 7,
    themeColor: 'amber',
  },
  {
    id: 'banner-8',
    title: 'Platinado dos Sonhos / Nevou na Cabeça',
    subtitle: 'Descoloração global sem agredir os fios + matização e finalização premium.',
    badge: '❄️ NEVOU 2026',
    imageUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=1200&q=80',
    ctaText: 'Consultar & Agendar Nevou',
    ctaAction: 'booking',
    originalPrice: 150.0,
    promoPrice: 119.9,
    discountPercentage: 20,
    expiresAt: 'Quarta a sábado',
    active: true,
    order: 8,
    themeColor: 'blue',
  },
  {
    id: 'banner-9',
    title: 'Dia do Noivo & Padrinhos VIP',
    subtitle: 'Espaço exclusivo, barba na toalha, massagem, café especial e brindes.',
    badge: '💍 PACOTE NOIVO',
    imageUrl: 'https://images.unsplash.com/photo-1593702295094-aea22597af65?auto=format&fit=crop&w=1200&q=80',
    ctaText: 'Reservar Pacote Noivo',
    ctaAction: 'booking',
    expiresAt: 'Reserva antecipada',
    active: true,
    order: 9,
    themeColor: 'gold',
  },
  {
    id: 'banner-10',
    title: 'Sobrancelha na Navalha Grátis no Combo',
    subtitle: 'Faça corte + barba e o design de sobrancelha sai totalmente por nossa conta.',
    badge: '✨ CORTESIA EXTRA',
    imageUrl: 'https://images.unsplash.com/photo-1622287162716-f311baa1a2b8?auto=format&fit=crop&w=1200&q=80',
    ctaText: 'Aproveitar Sobrancelha Grátis',
    ctaAction: 'booking',
    expiresAt: 'Válido essa semana',
    active: true,
    order: 10,
    themeColor: 'emerald',
  },
  {
    id: 'banner-11',
    title: 'Linha de Pomadas & Óleos com 15% OFF',
    subtitle: 'Compre pomada efeito matte ou óleo de barba direto na recepção pelo App.',
    badge: '🧴 PRODUTOS',
    imageUrl: 'https://images.unsplash.com/photo-1534778356534-d3d45b6df1da?auto=format&fit=crop&w=1200&q=80',
    ctaText: 'Ver Produtos da Linha',
    ctaAction: 'service',
    discountPercentage: 15,
    expiresAt: 'Enquanto durar o estoque',
    active: true,
    order: 11,
    themeColor: 'rose',
  },
  {
    id: 'banner-12',
    title: 'Corte Infantil sem Choro & com Estilo',
    subtitle: 'Atendimento paciente com games, capa de super-herói e pirulito no final.',
    badge: '🎮 KIDS STYLE',
    imageUrl: 'https://images.unsplash.com/photo-1605497788044-5a32c7078486?auto=format&fit=crop&w=1200&q=80',
    ctaText: 'Agendar Corte Kids',
    ctaAction: 'booking',
    originalPrice: 45.0,
    promoPrice: 35.0,
    discountPercentage: 22,
    expiresAt: 'Todos os dias',
    active: true,
    order: 12,
    themeColor: 'blue',
  },
  {
    id: 'banner-13',
    title: 'Assinatura Mensal Club da Navalha',
    subtitle: 'Cortes ilimitados o mês todo com horário prioritário e 10% em produtos.',
    badge: '👑 CLUBE MENSAL',
    imageUrl: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=1200&q=80',
    ctaText: 'Conhecer Clube Mensal',
    ctaAction: 'info',
    promoPrice: 119.0,
    expiresAt: 'Assinatura recorrente',
    active: true,
    order: 13,
    themeColor: 'purple',
  },
  {
    id: 'banner-14',
    title: 'Alinhamento Capilar & Botox Masculino',
    subtitle: 'Redução de volume e frizz com brilho natural sem perder o movimento.',
    badge: '💆 ALINHAMENTO',
    imageUrl: 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&w=1200&q=80',
    ctaText: 'Agendar Alinhamento',
    ctaAction: 'booking',
    originalPrice: 80.0,
    promoPrice: 60.0,
    discountPercentage: 25,
    expiresAt: 'Segunda a quinta',
    active: true,
    order: 14,
    themeColor: 'amber',
  },
  {
    id: 'banner-15',
    title: 'Indique um Amigo e Ganhe R$ 15 no Próximo',
    subtitle: 'Compartilhe o app com seus amigos. Quando eles cortarem, seu desconto entra na hora.',
    badge: '👥 INDIQUE & GANHE',
    imageUrl: 'https://images.unsplash.com/photo-1512690459411-b9245aed614b?auto=format&fit=crop&w=1200&q=80',
    ctaText: 'Indicar Amigos Agora',
    ctaAction: 'whatsapp',
    expiresAt: 'Campanha por tempo indeterminado',
    active: true,
    order: 15,
    themeColor: 'emerald',
  },
];

/**
 * Temas para o Assistente Criativo de IA de Marketing
 */
export const AI_PROMO_PRESETS = [
  {
    id: 'combo-barba',
    name: 'Combo Cabelo + Barba',
    keywords: 'combo cabelo barba desconto cerveja toalha quente',
    tone: 'Impactante & Moderno',
  },
  {
    id: 'quarta-maluca',
    name: 'Promoção Quarta Maluca',
    keywords: 'quarta maluca corte fade metade do preco horario tranquilo',
    tone: 'Urgência & Desconto',
  },
  {
    id: 'fidelidade-dobro',
    name: 'Selo de Fidelidade em Dobro',
    keywords: 'cartao fidelidade 2 selos premio corte gratis rapido',
    tone: 'Recompensa & Gamificação',
  },
  {
    id: 'happy-hour',
    name: 'Happy Hour com Chopp Free',
    keywords: 'happy hour chopp artesanal gratis corte final do dia amigos',
    tone: 'Descontraído & VIP',
  },
  {
    id: 'pai-filho',
    name: 'Especial Pai & Filho',
    keywords: 'pai e filho estilo familia desconto segundo corte sabado',
    tone: 'Emocional & Estiloso',
  },
  {
    id: 'nevou',
    name: 'Nevou / Platinado Masculino',
    keywords: 'nevou platinado loiro matizacao degradê fim de semana',
    tone: 'Jovem & Tendência',
  },
  {
    id: 'primeira-vez',
    name: 'Boas-Vindas Novo Cliente',
    keywords: 'primeira vez primeira visita desconto cupom 30% off',
    tone: 'Convidativo & Acolhedor',
  },
  {
    id: 'barboterapia',
    name: 'Barboterapia & Relaxamento',
    keywords: 'barboterapia toalha quente oleos essenciais massagem barba perfeita',
    tone: 'Luxo & Sofisticação',
  },
];

/**
 * Gerador de Textos Criativos com IA de Marketing para Barbearia
 */
export function generateAIBannerCopy(options: {
  themeName: string;
  serviceTarget?: string;
  discountNumber?: number;
  toneStyle?: string;
}): {
  title: string;
  subtitle: string;
  badge: string;
  ctaText: string;
  themeColor: 'amber' | 'emerald' | 'blue' | 'rose' | 'purple' | 'gold';
  suggestedImageUrl: string;
} {
  const { themeName, discountNumber = 30, serviceTarget = 'Corte + Barba' } = options;
  const t = themeName.toLowerCase();
  const disc = discountNumber || 30;

  if (t.includes('quarta') || t.includes('terça') || t.includes('maluca')) {
    return {
      title: `Quarta Maluca: ${serviceTarget} com Preço de Balcão`,
      subtitle: `Economize ${disc}% e saia alinhado para o restante da semana com bebida cortesia.`,
      badge: `⚡ SÓ ESSA SEMANA • -${disc}%`,
      ctaText: 'Garantir Meu Horário na Quarta',
      themeColor: 'emerald',
      suggestedImageUrl: 'https://images.unsplash.com/photo-1622286342621-4bd786c2447c?auto=format&fit=crop&w=1200&q=80',
    };
  }

  if (t.includes('fidelidade') || t.includes('selo') || t.includes('dobro')) {
    return {
      title: `Turbine sua Fidelidade: Ganhe Selos em Dobro!`,
      subtitle: `Agendando hoje pelo aplicativo você recebe 2x carimbos e fica a 1 passo do corte grátis.`,
      badge: `⭐ 2X SELOS NA CONTA`,
      ctaText: 'Agendar e Dobrar Meus Selos',
      themeColor: 'purple',
      suggestedImageUrl: 'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?auto=format&fit=crop&w=1200&q=80',
    };
  }

  if (t.includes('barba') || t.includes('barboterapia') || t.includes('navalha')) {
    return {
      title: `Ritual Barba de Respeito com Toalha Quente`,
      subtitle: `Esfoliação facial, óleos nobres, navalhete cirúrgico e massagem pós-barba relaxante.`,
      badge: `💈 EXPERIÊNCIA PREMIUM`,
      ctaText: 'Quero Minha Barba Perfeita',
      themeColor: 'gold',
      suggestedImageUrl: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=1200&q=80',
    };
  }

  if (t.includes('chopp') || t.includes('happy') || t.includes('cerveja')) {
    return {
      title: `Happy Hour na Barbearia: Corte Feito + Chopp Gelado`,
      subtitle: `Atendimento impecável com seu estilo renovado e cerveja artesanal na faixa.`,
      badge: `🍺 CHOPP ARTESANAL GRÁTIS`,
      ctaText: 'Marcar no Happy Hour',
      themeColor: 'amber',
      suggestedImageUrl: 'https://images.unsplash.com/photo-1512690459411-b9245aed614b?auto=format&fit=crop&w=1200&q=80',
    };
  }

  if (t.includes('pai') || t.includes('filho') || t.includes('familia')) {
    return {
      title: `Combo Família: Pai & Filho no Mesmo Estilo`,
      subtitle: `Corte em dose dupla com 50% de desconto no segundo atendimento neste final de semana.`,
      badge: `👨‍👦 DUPLA DE RESPEITO`,
      ctaText: 'Agendar Pai & Filho',
      themeColor: 'blue',
      suggestedImageUrl: 'https://images.unsplash.com/photo-1517832606299-7ae9b720a186?auto=format&fit=crop&w=1200&q=80',
    };
  }

  if (t.includes('nevou') || t.includes('platinado') || t.includes('loiro')) {
    return {
      title: `Efeito Nevou: Platinado de Respeito sem Danificar`,
      subtitle: `Descoloração profissional com pigmento importado e matização platinum ultra brilhante.`,
      badge: `❄️ NEVOU TENDÊNCIA 2026`,
      ctaText: 'Quero Platinar meu Cabelo',
      themeColor: 'blue',
      suggestedImageUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=1200&q=80',
    };
  }

  if (t.includes('primeira') || t.includes('boas') || t.includes('novo')) {
    return {
      title: `Seu Primeiro Corte com -${disc}% de Desconto`,
      subtitle: `Conheça a melhor experiência de barbearia da região com condição exclusiva no App.`,
      badge: `🎁 PRESENTE DE BOAS-VINDAS`,
      ctaText: 'Resgatar Desconto de Boas-Vindas',
      themeColor: 'emerald',
      suggestedImageUrl: 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&w=1200&q=80',
    };
  }

  // Fallback padrão criativo
  return {
    title: `Combo Especial ${serviceTarget}: O Toque que seu Visual Merece`,
    subtitle: `Aproveite ${disc}% de desconto exclusivo agendando diretamente pelo nosso aplicativo oficial.`,
    badge: `🔥 PROMOÇÃO EXCLUSIVA -${disc}%`,
    ctaText: 'Aproveitar Oferta Especial',
    themeColor: 'amber',
    suggestedImageUrl: 'https://images.unsplash.com/photo-1622286342621-4bd786c2447c?auto=format&fit=crop&w=1200&q=80',
  };
}
