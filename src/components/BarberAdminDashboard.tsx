import React, { useState, useEffect } from 'react';

// Interface para tipagem segura dos agendamentos
interface Agendamento {
  id: string | number;
  cliente: string;
  servico: string;
  data: string;
  hora: string;
}

export default function BarberAdminDashboard() {
  // Inicializa estritamente como uma array vazia para evitar quebras
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const buscarAgendamentos = async () => {
      try {
        setLoading(true);
        
        // REQUISIÇÃO REAL: Altere aqui para a chamada correta da sua API se necessário
        // const response = await fetch('/api/agendamentos');
        // const dados = await response.json();
        const dados: any = []; // Simulação de banco de dados vindo vazio do sistema

        // PROTEÇÃO 1: Se os dados forem nulos, indefinidos ou não forem uma lista, força uma array vazia
        if (!dados || !Array.isArray(dados)) {
          setAgendamentos([]);
          return;
        }

        // FILTRO DE SEGURANÇA: Remove duplicados apenas se a lista contiver itens
        const agendamentosFiltrados = dados.filter((item, index, self) =>
          item && item.id && index === self.findIndex((t) => t && t.id === item.id)
        );

        setAgendamentos(agendamentosFiltrados);
      } catch (err) {
        setError('Falha ao carregar agendamentos do servidor.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    buscarAgendamentos();
  }, []);

  if (loading) return <div style={{ padding: '20px' }}>Carregando painel do administrador...</div>;
  if (error) return <div style={{ padding: '20px', color: 'red' }}>{error}</div>;

  // PROTEÇÃO 2: Se a variável não existir ou o tamanho for zero, exibe a mensagem de segurança imediatamente
  if (!agendamentos || agendamentos.length === 0) {
    return (
      <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto', textAlign: 'center' }}>
        <h2>Painel de Agendamentos do Barbeiro</h2>
        <div style={{ marginTop: '30px', padding: '20px', background: '#f9f9f9', borderRadius: '8px', border: '1px solid #eee' }}>
          <p style={{ fontSize: '18px', color: '#666' }}>📅 Nenhum agendamento encontrado no momento.</p>
          <p style={{ fontSize: '14px', color: '#999' }}>Os novos horários marcados pelos clientes aparecerão nesta tela automaticamente.</p>
        </div>
      </div>
    );
  }

  // PROTEÇÃO 3: O bloco abaixo só roda se houver obrigatoriamente itens na array
  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h2>Painel de Agendamentos do Barbeiro</h2>
      
      <div style={{ overflowX: 'auto', marginTop: '20px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #ddd', background: '#f5f5f5' }}>
              <th style={{ padding: '12px' }}>Cliente</th>
              <th style={{ padding: '12px' }}>Serviço</th>
              <th style={{ padding: '12px' }}>Data</th>
              <th style={{ padding: '12px' }}>Horário</th>
            </tr>
          </thead>
          <tbody>
            {agendamentos.map((item, index) => (
              <tr key={`admin-item-${item?.id || index}-${index}`} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '12px' }}>{item?.cliente || 'Não informado'}</td>
                <td style={{ padding: '12px' }}>{item?.servico || 'Não informado'}</td>
                <td style={{ padding: '12px' }}>{item?.data || '---'}</td>
                <td style={{ padding: '12px' }}>{item?.hora || '---'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
