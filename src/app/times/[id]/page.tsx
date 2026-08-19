'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

import { ArrowLeft } from 'lucide-react';

import { PersonList } from '~/components/person-list';
import { Roulette } from '~/components/roulette';
import { Roulette3D, type SpinRequest } from '~/components/roulette-3d';
import type { Configs } from '~/types/configs';
import type { Pessoa } from '~/types/pessoa';
import type { Time } from '~/types/time';

export default function TeamRoulettePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const teamId = Number(params.id);

  const [team, setTeam] = useState<Time | null>(null);
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [configs, setConfigs] = useState<Configs>({
    showUpDown: false,
  });
  const [isSpinning, setIsSpinning] = useState<boolean>(false);
  const [spinRequest, setSpinRequest] = useState<SpinRequest | null>(null);
  const [winner, setWinner] = useState<Pessoa | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const spinIdRef = useRef(0);
  const currentWinnerIndexRef = useRef(0);
  const animationRef = useRef<number | null>(null);
  const [mode, setMode] = useState<'3d' | '2d'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('roulette-mode');

      return saved === '2d' ? '2d' : '3d';
    }

    return '3d';
  });
  const [rotation2D, setRotation2D] = useState(0);

  const fetchConfigs = async (): Promise<void> => {
    const response = await fetch('/api/configs');
    if (response.ok) {
      const data: Configs = await response.json();
      setConfigs(data);
    }
  };

  const fetchTeam = async (): Promise<void> => {
    const response = await fetch(`/api/times/${teamId}`);

    if (response.ok) {
      const data: Time = await response.json();
      setTeam(data);
    }
  };

  const fetchPessoas = async (): Promise<void> => {
    const response = await fetch(`/api/pessoas?timeId=${teamId}`);

    if (response.ok) {
      const data: Pessoa[] = await response.json();
      setPessoas(data);
    }
  };

  const loadData = async (): Promise<void> => {
    if (!Number.isInteger(teamId) || teamId <= 0) {
      setLoading(false);

      return;
    }

    setLoading(true);

    try {
      await Promise.all([fetchTeam(), fetchPessoas(), fetchConfigs()]);
    } catch (error) {
      console.error('Erro ao carregar dados do time:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [teamId]);

  useEffect(() => {
    localStorage.setItem('roulette-mode', mode);
  }, [mode]);

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
      const response = await fetch(
        `/api/pessoas/clear-points?timeId=${teamId}`,
        {
          method: 'PUT',
        },
      );

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
        body: JSON.stringify({ nome, timeId: teamId }),
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

    if (mode === '2d') {
      const finalRotation = rotation2D + 1080 + Math.random() * 1080;
      const duration = 3000;
      const startTime = Date.now();
      const startRotation = rotation2D;

      const animate = (): void => {
        const currentTime = Date.now();
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        const easeOut = 1 - Math.pow(1 - progress, 3);
        const currentRotation =
          startRotation + (finalRotation - startRotation) * easeOut;

        setRotation2D(currentRotation);

        if (progress < 1) {
          animationRef.current = requestAnimationFrame(animate);
        } else {
          setIsSpinning(false);

          const normalizedRotation = (360 - (currentRotation % 360)) % 360;
          const anglePerSlice = 360 / pessoas.length;
          const winnerIndex = Math.floor(normalizedRotation / anglePerSlice);
          const winnerPerson = pessoas[winnerIndex];

          setWinner(winnerPerson);
          updatePoints(winnerPerson.id, 'sorteio');
        }
      };

      animationRef.current = requestAnimationFrame(animate);
    } else {
      const targetIndex = Math.floor(Math.random() * pessoas.length);
      currentWinnerIndexRef.current = targetIndex;
      spinIdRef.current += 1;

      setSpinRequest({ id: spinIdRef.current, targetIndex });
    }
  };

  const handleSpinEnd = (): void => {
    setIsSpinning(false);

    const winnerPerson = pessoas[currentWinnerIndexRef.current];
    if (!winnerPerson) {
      return;
    }

    setWinner(winnerPerson);
    updatePoints(winnerPerson.id, 'sorteio');
  };

  if (!Number.isInteger(teamId) || teamId <= 0) {
    return (
      <div className="min-h-screen bg-linear-to-br from-purple-400 via-pink-500 to-red-500 p-6 flex items-center justify-center">
        <div className="bg-white rounded-xl p-6 shadow-xl text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            Time inválido
          </h2>
          <button
            onClick={() => router.push('/')}
            className="cursor-pointer mt-3 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md"
          >
            Voltar para os times
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-linear-to-br from-purple-400 via-pink-500 to-red-500 flex items-center justify-center">
        <div className="text-white text-xl">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-purple-400 via-pink-500 to-red-500 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <button
            onClick={() => router.push('/')}
            className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white text-gray-800 hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft size={18} />
            Voltar aos times
          </button>

          <h1 className="text-4xl font-bold text-white text-center drop-shadow-lg">
            🎰 Roleta de Pontuação do Time {team?.nome ?? 'Time'}
          </h1>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          <div className="flex flex-col items-center">
            {mode === '3d' ? (
              <Roulette3D
                pessoas={pessoas}
                spinRequest={spinRequest}
                onSpinEnd={handleSpinEnd}
              />
            ) : (
              <Roulette pessoas={pessoas} rotation={rotation2D} />
            )}

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
                  : 'cursor-pointer bg-linear-to-r from-green-400 to-blue-500 hover:from-green-500 hover:to-blue-600 text-white shadow-lg hover:shadow-xl transform hover:scale-105'
              }`}
            >
              {isSpinning ? '🎲 Girando...' : '🚀 Girar Roleta'}
            </button>
          </div>

          <div>
            <PersonList
              pessoas={pessoas}
              configs={configs}
              onUpdatePoints={updatePoints}
              onDeletePerson={deletePerson}
              onAddPerson={addPerson}
              onClearAllPoints={clearAllPoints}
            />

            <div className="mt-4 flex items-center justify-center">
              <div className="inline-flex rounded-lg border border-gray-300 bg-white p-1 shadow-sm">
                <button
                  onClick={() => setMode('3d')}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    mode === '3d'
                      ? 'bg-gray-900 text-white'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  3D
                </button>
                <button
                  onClick={() => setMode('2d')}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    mode === '2d'
                      ? 'bg-gray-900 text-white'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  2D
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
