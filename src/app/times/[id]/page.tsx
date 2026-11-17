'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

import { ArrowLeft } from 'lucide-react';

import { CharacterSelect } from '~/components/character-select';
import { PersonList } from '~/components/person-list';
import { Roulette } from '~/components/roulette';
import { Roulette3D, type SpinRequest } from '~/components/roulette-3d';
import {
  CHARACTER_PREFERENCE_KEY,
  readCharacterPreference,
  serializeCharacterPreference,
} from '~/lib/character-preference';
import type { CharacterOption } from '~/types/character';
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
  const currentWinnerRef = useRef<Pessoa | null>(null);
  const spinInProgressRef = useRef(false);
  const animationRef = useRef<number | null>(null);
  const voiceAbortRef = useRef<AbortController | null>(null);
  const [characters, setCharacters] = useState<CharacterOption[]>([]);
  const [characterSlug, setCharacterSlug] = useState<string | null>(null);
  const [charactersLoading, setCharactersLoading] = useState(true);
  const [characterError, setCharacterError] = useState(false);
  const selectedCharacter = characters.find(
    ({ slug }) => slug === characterSlug,
  );
  const mode = selectedCharacter?.mode ?? '2d';
  const [rotation2D, setRotation2D] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const generatedAudioRef = useRef<{
    spinId: number;
    promise: Promise<Blob | null>;
  } | null>(null);

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

  const stopAudio = (): void => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
  };

  const cancelWinnerAudio = (): void => {
    voiceAbortRef.current?.abort();
    generatedAudioRef.current = null;
    stopAudio();
  };

  const fetchCharacters = async (signal?: AbortSignal): Promise<void> => {
    setCharactersLoading(true);
    setCharacterError(false);
    try {
      const response = await fetch('/api/personagens', { signal });
      if (!response.ok) {
        throw new Error('Erro ao carregar personagens');
      }
      const data: CharacterOption[] = await response.json();
      if (!data.length) {
        throw new Error('Não há personagens cadastrados');
      }
      setCharacters(data);
      try {
        setCharacterSlug(
          readCharacterPreference(
            localStorage.getItem(CHARACTER_PREFERENCE_KEY),
            data.map(({ slug }) => slug),
          ),
        );
      } catch {
        // O sorteio continua disponível se o navegador bloquear o armazenamento.
        setCharacterSlug(null);
      }
    } catch (error) {
      if (!signal?.aborted) {
        console.error('Erro ao carregar personagens:', error);
        setCharacterError(true);
      }
    } finally {
      if (!signal?.aborted) {
        setCharactersLoading(false);
      }
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    void fetchCharacters(controller.signal);

    return () => controller.abort();
  }, []);

  useEffect(() => {
    loadData();
    setIsSpinning(false);
    spinInProgressRef.current = false;
    setSpinRequest(null);
    setWinner(null);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      cancelWinnerAudio();
    };
  }, [teamId]);

  const changeCharacter = (slug: string | null): void => {
    if (spinInProgressRef.current) {
      return;
    }
    cancelWinnerAudio();
    setSpinRequest(null);
    setCharacterSlug(slug);
    try {
      localStorage.setItem(
        CHARACTER_PREFERENCE_KEY,
        serializeCharacterPreference(slug),
      );
    } catch {
      console.warn(
        'Não foi possível salvar a preferência de voz neste navegador.',
      );
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

  const playSpinSound = (): void => {
    if (!selectedCharacter) {
      return;
    }

    const source =
      mode === '3d' ? '/sounds/silvio.mp3' : '/sounds/tick-tick.mp3';
    const audio = new Audio(source);
    audioRef.current = audio;
    void audio.play().catch(() => {});
  };

  const requestWinnerAudio = async (
    pessoa: Pessoa,
    slug: string,
    signal: AbortSignal,
  ): Promise<Blob | null> => {
    try {
      const response = await fetch('/api/winner-voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: pessoa.nome,
          timeId: teamId,
          characterSlug: slug,
          pontos: pessoa.pontos,
        }),
        signal,
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(data?.error || `Erro ${response.status}`);
      }

      return await response.blob();
    } catch (error) {
      if (!signal.aborted) {
        console.error('Erro ao preparar a chamada do vencedor:', error);
      }

      return null;
    }
  };

  const playWinnerAudio = async (spinId: number): Promise<void> => {
    const generatedAudio = generatedAudioRef.current;

    if (!generatedAudio || generatedAudio.spinId !== spinId) {
      return;
    }

    const audioBlob = await generatedAudio.promise;

    if (!audioBlob) {
      return;
    }

    if (generatedAudioRef.current?.spinId !== spinId) {
      return;
    }

    stopAudio();
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);
    audioUrlRef.current = audioUrl;
    audioRef.current = audio;
    audio.addEventListener(
      'ended',
      () => {
        URL.revokeObjectURL(audioUrl);
        if (audioUrlRef.current === audioUrl) {
          audioUrlRef.current = null;
        }
      },
      { once: true },
    );
    void audio.play().catch((error) => {
      URL.revokeObjectURL(audioUrl);
      if (audioUrlRef.current === audioUrl) {
        audioUrlRef.current = null;
      }
      console.error('Erro ao tocar a chamada do vencedor:', error);
    });
  };

  const handleSpinEnd = (): void => {
    if (!spinInProgressRef.current) {
      return;
    }
    spinInProgressRef.current = false;
    setIsSpinning(false);
    stopAudio();

    const winnerPerson = currentWinnerRef.current;
    if (!winnerPerson) {
      return;
    }

    setWinner(winnerPerson);
    void updatePoints(winnerPerson.id, 'sorteio');
    void playWinnerAudio(spinIdRef.current);
  };

  const spinRoulette = (): void => {
    if (
      spinInProgressRef.current ||
      pessoas.length === 0 ||
      charactersLoading
    ) {
      return;
    }

    cancelWinnerAudio();
    spinInProgressRef.current = true;
    setIsSpinning(true);
    setWinner(null);
    spinIdRef.current += 1;

    // A roleta 2D usa a mesma rotação e o mesmo ponteiro para prever o resultado.
    const finalRotation = rotation2D + 1080 + Math.random() * 1080;
    const normalizedRotation = (360 - (finalRotation % 360)) % 360;
    const targetIndex =
      mode === '2d'
        ? Math.min(
            pessoas.length - 1,
            Math.floor(normalizedRotation / (360 / pessoas.length)),
          )
        : Math.floor(Math.random() * pessoas.length);
    const winnerPerson = pessoas[targetIndex];
    currentWinnerRef.current = winnerPerson;

    if (selectedCharacter) {
      const controller = new AbortController();
      voiceAbortRef.current = controller;
      generatedAudioRef.current = {
        spinId: spinIdRef.current,
        promise: requestWinnerAudio(
          winnerPerson,
          selectedCharacter.slug,
          controller.signal,
        ),
      };
    }
    playSpinSound();

    if (mode === '3d') {
      setSpinRequest({ id: spinIdRef.current, targetIndex });

      return;
    }

    const duration = 10000;
    const startTime = Date.now();
    const startRotation = rotation2D;
    const animate = (): void => {
      const progress = Math.min((Date.now() - startTime) / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      setRotation2D(startRotation + (finalRotation - startRotation) * easeOut);
      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        animationRef.current = null;
        handleSpinEnd();
      }
    };
    animationRef.current = requestAnimationFrame(animate);
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
              disabled={isSpinning || pessoas.length === 0 || charactersLoading}
              className={`mt-6 w-full max-w-md py-4 px-8 rounded-lg font-bold text-xl transition-all duration-200 ${
                isSpinning || pessoas.length === 0 || charactersLoading
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'cursor-pointer bg-linear-to-r from-green-400 to-blue-500 hover:from-green-500 hover:to-blue-600 text-white shadow-lg hover:shadow-xl transform hover:scale-105'
              }`}
            >
              {isSpinning ? '🎲 Girando...' : '🚀 Girar Roleta'}
            </button>
          </div>

          <div>
            <fieldset
              disabled={isSpinning}
              className="min-w-0 [&_button:disabled]:cursor-not-allowed [&_button:disabled]:opacity-50"
            >
              <PersonList
                pessoas={pessoas}
                configs={configs}
                onUpdatePoints={updatePoints}
                onDeletePerson={deletePerson}
                onAddPerson={addPerson}
                onClearAllPoints={clearAllPoints}
              />
            </fieldset>

            <div className="mt-4 rounded-lg bg-white p-4 shadow-sm">
              <CharacterSelect
                characters={characters}
                value={characterSlug}
                onChange={changeCharacter}
                disabled={isSpinning || charactersLoading}
              />
              {charactersLoading && (
                <p className="mt-2 text-sm text-gray-600" role="status">
                  Carregando vozes...
                </p>
              )}
              {characterError && (
                <p className="mt-2 text-sm text-gray-600" role="status">
                  Não foi possível carregar as vozes. Você pode sortear sem som.{' '}
                  <button
                    type="button"
                    className="cursor-pointer text-purple-700 underline"
                    onClick={() => void fetchCharacters()}
                  >
                    Tentar novamente
                  </button>
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
