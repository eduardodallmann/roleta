'use client';

import { useEffect, useRef, useState } from 'react';

import { PersonList } from '~/components/person-list';
import { Roulette } from '~/components/roulette';
import type { Configs } from '~/types/configs';
import type { Pessoa } from '~/types/pessoa';

export default function Home() {
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [configs, setConfigs] = useState<Configs>({
    showUpDown: false,
  });
  const [isSpinning, setIsSpinning] = useState<boolean>(false);
  const [rotation, setRotation] = useState<number>(0);
  const [winner, setWinner] = useState<Pessoa | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    fetchPessoas();
    fetchConfigs();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  const fetchConfigs = async (): Promise<void> => {
    try {
      const response = await fetch('/api/configs');
      if (response.ok) {
        const data: Configs = await response.json();
        setConfigs(data);
      }
    } catch (error) {
      console.error('Erro ao buscar pessoas:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPessoas = async (): Promise<void> => {
    try {
      const response = await fetch('/api/pessoas');
      if (response.ok) {
        const data: Pessoa[] = await response.json();
        setPessoas(data);
      }
    } catch (error) {
      console.error('Erro ao buscar pessoas:', error);
    } finally {
      setLoading(false);
    }
  };

  const updatePoints = async (
    id: number,
    acao: 'aumentar' | 'diminuir' | 'sorteio',
  ): Promise<void> => {
    try {
      const response = await fetch(`/api/pessoas/${id}/pontos`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ acao }),
      });

      if (response.ok) {
        await fetchPessoas();
      }
    } catch (error) {
      console.error('Erro ao atualizar pontos:', error);
    }
  };

  const clearAllPoints = async (): Promise<void> => {
    try {
      const response = await fetch('/api/pessoas/clear-points', {
        method: 'PUT',
      });

      if (response.ok) {
        const result = await response.json();
        await fetchPessoas();
        alert(result.message);
      } else {
        const error = await response.json();
        alert(`Erro: ${error.error}`);
      }
    } catch (error) {
      console.error('Erro ao limpar pontos:', error);
      alert('Erro ao limpar pontos. Tente novamente.');
    }
  };

  const deletePerson = async (pessoa: Pessoa): Promise<void> => {
    const confirmed = confirm(
      `Tem certeza que deseja excluir ${pessoa.nome}?\n\nEsta ação não pode ser desfeita.`,
    );

    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch(`/api/pessoas/${pessoa.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchPessoas();
        alert(`${pessoa.nome} foi excluído(a) com sucesso!`);
      } else {
        const error = await response.json();
        alert(`Erro ao excluir pessoa: ${error.error}`);
      }
    } catch (error) {
      console.error('Erro ao excluir pessoa:', error);
      alert('Erro ao excluir pessoa. Tente novamente.');
    }
  };

  const addPerson = async (nome: string): Promise<void> => {
    try {
      const response = await fetch('/api/pessoas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome }),
      });

      if (response.ok) {
        await fetchPessoas();
      } else {
        const error = await response.json();
        alert(error.error);
      }
    } catch (error) {
      console.error('Erro ao adicionar pessoa:', error);
    }
  };

  const spinRoulette = (): void => {
    if (isSpinning || pessoas.length === 0) {
      return;
    }

    setIsSpinning(true);
    setWinner(null);

    const finalRotation = rotation + 1080 + Math.random() * 1080;
    const duration = 3000;
    const startTime = Date.now();
    const startRotation = rotation;

    const animate = (): void => {
      const currentTime = Date.now();
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      const easeOut = 1 - Math.pow(1 - progress, 3);
      const currentRotation =
        startRotation + (finalRotation - startRotation) * easeOut;

      setRotation(currentRotation);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setIsSpinning(false);

        // Calcular vencedor
        const normalizedRotation = (360 - (currentRotation % 360)) % 360;
        const anglePerSlice = 360 / pessoas.length;
        const winnerIndex = Math.floor(normalizedRotation / anglePerSlice);
        const winnerPerson = pessoas[winnerIndex];

        setWinner(winnerPerson);

        // Adicionar ponto ao vencedor
        updatePoints(winnerPerson.id, 'sorteio');
      }
    };

    animationRef.current = requestAnimationFrame(animate);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-400 via-pink-500 to-red-500 flex items-center justify-center">
        <div className="text-white text-xl">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-400 via-pink-500 to-red-500 p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-white text-center mb-8 drop-shadow-lg">
          🎰 Roleta de Pontuação
        </h1>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Roleta */}
          <div className="flex flex-col items-center">
            <Roulette pessoas={pessoas} rotation={rotation} />

            {winner && (
              <div className="mt-6 p-4 bg-yellow-400 rounded-lg shadow-lg animate-bounce">
                <h2 className="text-2xl font-bold text-gray-800 text-center">
                  🎉 Vencedor: {winner.nome} 🎉
                </h2>
                <p className="text-center text-gray-700">
                  +1 ponto! Total: {winner.pontos + 1} pontos
                </p>
              </div>
            )}

            <button
              onClick={spinRoulette}
              disabled={isSpinning || pessoas.length === 0}
              className={`mt-6 w-full max-w-md py-4 px-8 rounded-lg font-bold text-xl transition-all duration-200 ${
                isSpinning || pessoas.length === 0
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-green-400 to-blue-500 hover:from-green-500 hover:to-blue-600 text-white shadow-lg hover:shadow-xl transform hover:scale-105'
              }`}
            >
              {isSpinning ? '🎲 Girando...' : '🚀 Girar Roleta'}
            </button>
          </div>

          {/* Lista de Pessoas */}
          <div>
            <PersonList
              pessoas={pessoas}
              configs={configs}
              onUpdatePoints={updatePoints}
              onDeletePerson={deletePerson}
              onAddPerson={addPerson}
              onClearAllPoints={clearAllPoints}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
