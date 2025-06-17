'use client';

import { useEffect, useRef } from 'react';

import type { Pessoa } from '~/types/pessoa';

interface RouletteProps {
  pessoas: Pessoa[];
  rotation: number;
}

export const Roulette: React.FC<RouletteProps> = ({ pessoas, rotation }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const colors = [
    '#FF6B6B',
    '#4ECDC4',
    '#45B7D1',
    '#96CEB4',
    '#FFEAA7',
    '#DDA0DD',
    '#98D8C8',
    '#F7DC6F',
    '#BB8FCE',
    '#85C1E9',
    '#FF9F43',
    '#10AC84',
    '#5F27CD',
    '#00D2D3',
    '#FF6348',
    '#2E86AB',
    '#A23B72',
    '#F18F01',
    '#C73E1D',
    '#6C5CE7',
  ];

  useEffect(() => {
    drawRoulette();
  }, [pessoas, rotation]);

  const drawRoulette = (): void => {
    const canvas = canvasRef.current;
    if (!canvas || pessoas.length === 0) {
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(centerX, centerY) - 10;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const anglePerSlice = (2 * Math.PI) / pessoas.length;

    // Calcular tamanho da fonte baseado no número de pessoas
    let fontSize = 14;
    let pointsSize = 10;
    if (pessoas.length > 10) {
      fontSize = Math.max(8, 14 - Math.floor(pessoas.length / 5));
      pointsSize = Math.max(6, 10 - Math.floor(pessoas.length / 5));
    }

    pessoas.forEach((pessoa, index) => {
      const startAngle = index * anglePerSlice + (rotation * Math.PI) / 180;
      const endAngle = (index + 1) * anglePerSlice + (rotation * Math.PI) / 180;

      // Desenhar fatia
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = colors[index % colors.length];
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Calcular posição do texto (centro da fatia)
      const textAngle = startAngle + anglePerSlice / 2;
      const textRadius = radius * 0.65;
      const textX = centerX + Math.cos(textAngle) * textRadius;
      const textY = centerY + Math.sin(textAngle) * textRadius;

      // Função para desenhar texto com borda
      const drawTextWithBorder = (
        text: string,
        x: number,
        y: number,
        fontSize: number,
        fillColor = '#ffffff',
        strokeColor = '#000000',
      ) => {
        ctx.font = `bold ${fontSize}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Configurar borda mais suave
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 2;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.strokeText(text, x, y);

        // Desenhar texto principal
        ctx.fillStyle = fillColor;
        ctx.fillText(text, x, y);
      };

      // Truncar nome se muito longo
      let displayName = pessoa.nome;
      if (pessoas.length > 12 && displayName.length > 10) {
        displayName = `${displayName.substring(0, 8)}...`;
      } else if (pessoas.length > 8 && displayName.length > 12) {
        displayName = `${displayName.substring(0, 10)}...`;
      }

      // Desenhar nome (sempre horizontal)
      drawTextWithBorder(displayName, textX, textY - fontSize / 3, fontSize);

      // Desenhar pontos (sempre horizontal)
      drawTextWithBorder(
        `${pessoa.pontos} pts`,
        textX,
        textY + fontSize / 2,
        pointsSize,
      );
    });

    // Desenhar círculo central para melhor visual
    ctx.beginPath();
    ctx.arc(centerX, centerY, 30, 0, 2 * Math.PI);
    ctx.fillStyle = '#333333';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Ponteiro melhorado
    ctx.beginPath();
    ctx.moveTo(centerX + radius - 5, centerY);
    ctx.lineTo(centerX + radius + 25, centerY - 20);
    ctx.lineTo(centerX + radius + 25, centerY + 20);
    ctx.closePath();
    ctx.fillStyle = '#333333';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Sombra do ponteiro
    ctx.beginPath();
    ctx.moveTo(centerX + radius - 5, centerY);
    ctx.lineTo(centerX + radius + 25, centerY - 20);
    ctx.lineTo(centerX + radius + 25, centerY + 20);
    ctx.closePath();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fill();
  };

  return (
    <div className="bg-white rounded-full p-4 shadow-2xl">
      <canvas
        ref={canvasRef}
        width={400}
        height={400}
        className="rounded-full"
      />
    </div>
  );
};
