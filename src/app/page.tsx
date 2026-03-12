'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { ArrowRight, Trophy, Users } from 'lucide-react';

import type { Time } from '~/types/time';

export default function Home() {
  const router = useRouter();
  const [times, setTimes] = useState<Time[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchTimes = async (): Promise<void> => {
    try {
      const response = await fetch('/api/times');
      if (response.ok) {
        const data: Time[] = await response.json();
        setTimes(data);
      }
    } catch (error) {
      console.error('Erro ao buscar times:', error);
    } finally {
      setLoading(false);
    }
  };

  const addTime = async (): Promise<void> => {
    const nome = prompt('Digite o nome do novo time:');

    if (!nome || nome.trim() === '') {
      return;
    }

    try {
      const response = await fetch('/api/times', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome }),
      });

      if (response.ok) {
        await fetchTimes();

        return;
      }

      const data = await response.json();
      alert(data.error ?? 'Não foi possível criar o time.');
    } catch (error) {
      console.error('Erro ao criar time:', error);
      alert('Erro ao criar time. Tente novamente.');
    }
  };

  useEffect(() => {
    fetchTimes();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-linear-to-br from-purple-400 via-pink-500 to-red-500 flex items-center justify-center">
        <div className="text-white text-xl">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-purple-400 via-pink-500 to-red-500 p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        <h1 className="text-4xl font-bold text-white text-center mb-8 drop-shadow-lg">
          🎰 Roleta de Pontuação
        </h1>

        <div className="bg-white/15 backdrop-blur-sm border border-white/20 rounded-2xl p-6 shadow-2xl">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div>
              <h2 className="text-2xl font-bold text-white drop-shadow">
                Times
              </h2>
              <p className="text-white/90">
                Escolha um time para abrir a roleta ou crie um novo.
              </p>
            </div>
            <button
              onClick={addTime}
              className="cursor-pointer bg-green-500 hover:bg-green-600 text-white px-5 py-3 rounded-lg font-semibold shadow-lg transition-colors"
            >
              + Novo time
            </button>
          </div>

          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {times.map((time) => (
              <button
                key={time.id}
                onClick={() => router.push(`/times/${time.id}`)}
                className="cursor-pointer text-left rounded-xl bg-white p-5 shadow-lg hover:shadow-xl transition-all hover:-translate-y-1"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-lg bg-linear-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center">
                    <Users size={18} />
                  </div>
                  <ArrowRight className="text-gray-500" size={18} />
                </div>

                <h3 className="text-lg font-bold text-gray-800 mb-4">
                  {time.nome}
                </h3>

                <div className="flex items-center gap-3 text-sm text-gray-700">
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
                    <Users size={14} />
                    {time.totalPessoas ?? 0} pessoas
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full">
                    <Trophy size={14} />
                    {time.totalPontos ?? 0} pts
                  </span>
                </div>
              </button>
            ))}

            {times.length === 0 && (
              <div className="sm:col-span-2 xl:col-span-3 text-center bg-white rounded-xl p-10 text-gray-600">
                Nenhum time cadastrado. Clique em "Novo time" para começar.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
