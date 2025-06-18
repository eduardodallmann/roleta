'use client';

import { Minus, Plus, RotateCcw, Trash2 } from 'lucide-react';

import type { Configs } from '~/types/configs';
import type { Pessoa } from '~/types/pessoa';

type PersonListProps = {
  pessoas: Pessoa[];
  configs: Configs;
  onUpdatePoints: (id: number, acao: 'aumentar' | 'diminuir') => Promise<void>;
  onDeletePerson: (pessoa: Pessoa) => void;
  onAddPerson: (nome: string) => Promise<void>;
  onClearAllPoints: () => void;
};

export const PersonList: React.FC<PersonListProps> = ({
  pessoas,
  configs,
  onUpdatePoints,
  onDeletePerson,
  onAddPerson,
  onClearAllPoints,
}) => {
  const handleAddPerson = (): void => {
    const nome = prompt('Digite o nome da nova pessoa:');
    if (nome && nome.trim()) {
      onAddPerson(nome.trim());
    }
  };

  const handleClearPoints = (): void => {
    const totalPontos = pessoas.reduce((sum, pessoa) => sum + pessoa.pontos, 0);

    if (totalPontos === 0) {
      alert('Todos os pontos já estão zerados!');

      return;
    }

    const confirmed = confirm(
      `Tem certeza que deseja zerar todos os pontos?\n\nIsto irá remover ${totalPontos} pontos de ${pessoas.length} pessoa(s).`,
    );

    if (confirmed) {
      onClearAllPoints();
    }
  };

  return (
    <div className="bg-white rounded-lg p-6 shadow-xl">
      <div className="flex flex-col gap-2 items-center justify-between mb-6">
        <h3 className="text-xl font-semibold text-gray-800">
          👥 Lista de Pessoas ({pessoas.length})
        </h3>
        <div className="flex gap-2">
          <button
            onClick={handleClearPoints}
            className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-md flex items-center gap-2 transition-colors"
            title="Zerar todos os pontos"
          >
            <RotateCcw size={16} />
            Limpar Pontos
          </button>
          <button
            onClick={handleAddPerson}
            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-md flex items-center gap-2 transition-colors"
            title="Adicionar nova pessoa"
          >
            <Plus size={16} />
            Adicionar
          </button>
        </div>
      </div>

      <div className="space-y-3 max-h-96 overflow-y-auto">
        {pessoas.map((pessoa) => (
          <div
            key={pessoa.id}
            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
          >
            <div className="flex-1">
              <span className="font-medium text-gray-800">{pessoa.nome}</span>
              <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
                {pessoa.pontos} pts
              </span>
            </div>

            <div className="flex items-center gap-2">
              {configs.showUpDown && (
                <button
                  onClick={() => onUpdatePoints(pessoa.id, 'aumentar')}
                  className="p-2 bg-green-500 hover:bg-green-600 text-white rounded-md transition-colors"
                  title="Aumentar pontos"
                >
                  <Plus size={16} />
                </button>
              )}

              {configs.showUpDown && (
                <button
                  onClick={() => onUpdatePoints(pessoa.id, 'diminuir')}
                  className="p-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-md transition-colors"
                  title="Diminuir pontos"
                >
                  <Minus size={16} />
                </button>
              )}

              <button
                onClick={() => onDeletePerson(pessoa)}
                className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-md transition-colors"
                title="Excluir pessoa"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}

        {pessoas.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            Nenhuma pessoa cadastrada. Clique em "Adicionar" para começar!
          </div>
        )}
      </div>
    </div>
  );
};
