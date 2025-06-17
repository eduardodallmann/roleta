'use client';

import { useEffect, useRef, useState, type ChangeEvent } from 'react';

export default function Home() {
  const [names, setNames] = useState([
    'João',
    'Maria',
    'Pedro',
    'Ana',
    'Carlos',
    'Lucia',
  ]);
  const [textareaValue, setTextareaValue] = useState(
    'João\nMaria\nPedro\nAna\nCarlos\nLucia',
  );
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [winner, setWinner] = useState('');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);

  // Cores para as fatias da roleta
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
  ];

  useEffect(() => {
    drawRoulette();
  }, [names, rotation]);

  const drawRoulette = () => {
    const canvas = canvasRef.current;
    if (!canvas) {
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

    if (names.length === 0) {
      return;
    }

    const anglePerSlice = (2 * Math.PI) / names.length;

    // Desenhar as fatias
    names.forEach((name, index) => {
      const startAngle = index * anglePerSlice + (rotation * Math.PI) / 180;
      const endAngle = (index + 1) * anglePerSlice + (rotation * Math.PI) / 180;

      // Fatia
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = colors[index % colors.length];
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Texto
      const textAngle = startAngle + anglePerSlice / 2;
      const textRadius = radius * 0.7;
      const textX = centerX + Math.cos(textAngle) * textRadius;
      const textY = centerY + Math.sin(textAngle) * textRadius;

      ctx.save();
      ctx.translate(textX, textY);
      ctx.rotate(textAngle + Math.PI / 2);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 14px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(name, 0, 0);
      ctx.restore();
    });

    // Ponteiro
    ctx.beginPath();
    ctx.moveTo(centerX + radius - 10, centerY);
    ctx.lineTo(centerX + radius + 20, centerY - 15);
    ctx.lineTo(centerX + radius + 20, centerY + 15);
    ctx.closePath();
    ctx.fillStyle = '#333333';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();
  };

  const handleTextareaChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const { value } = e.target;
    setTextareaValue(value);

    const newNames = value
      .split('\n')
      .map((name) => name.trim())
      .filter((name) => name.length > 0);

    setNames(newNames);
  };

  const spinRoulette = () => {
    if (isSpinning || names.length === 0) {
      return;
    }

    setIsSpinning(true);
    setWinner('');

    // Rotação aleatória entre 1080 e 2160 graus (3-6 voltas completas)
    const finalRotation = rotation + 1080 + Math.random() * 1080;
    const duration = 3000; // 3 segundos
    const startTime = Date.now();
    const startRotation = rotation;

    const animate = () => {
      const currentTime = Date.now();
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Easing function para desaceleração
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const currentRotation =
        startRotation + (finalRotation - startRotation) * easeOut;

      setRotation(currentRotation);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setIsSpinning(false);

        // Calcular o vencedor
        const normalizedRotation = (360 - (currentRotation % 360)) % 360;
        const anglePerSlice = 360 / names.length;
        const winnerIndex = Math.floor(normalizedRotation / anglePerSlice);
        setWinner(names[winnerIndex]);
      }
    };

    animationRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-400 via-pink-500 to-red-500 p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-white text-center mb-8 drop-shadow-lg">
          🎰 Roleta de Nomes
        </h1>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Roleta */}
          <div className="flex flex-col items-center">
            <div className="bg-white rounded-full p-4 shadow-2xl">
              <canvas
                ref={canvasRef}
                width={400}
                height={400}
                className="rounded-full"
              />
            </div>

            {winner && (
              <div className="mt-6 p-4 bg-yellow-400 rounded-lg shadow-lg animate-bounce">
                <h2 className="text-2xl font-bold text-gray-800 text-center">
                  🎉 Vencedor: {winner} 🎉
                </h2>
              </div>
            )}
          </div>

          {/* Controles */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg p-6 shadow-xl">
              <h3 className="text-xl font-semibold text-gray-800 mb-4">
                📝 Lista de Nomes
              </h3>
              <textarea
                value={textareaValue}
                onChange={handleTextareaChange}
                placeholder="Digite um nome por linha..."
                className="w-full h-64 p-4 border-2 border-gray-300 rounded-lg resize-none focus:border-purple-500 focus:outline-none font-mono"
              />
              <p className="text-sm text-gray-600 mt-2">
                Total de nomes: {names.length}
              </p>
            </div>

            <button
              onClick={spinRoulette}
              disabled={isSpinning || names.length === 0}
              className={`w-full py-4 px-8 rounded-lg font-bold text-xl transition-all duration-200 ${
                isSpinning || names.length === 0
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-green-400 to-blue-500 hover:from-green-500 hover:to-blue-600 text-white shadow-lg hover:shadow-xl transform hover:scale-105'
              }`}
            >
              {isSpinning ? '🎲 Girando...' : '🚀 Girar Roleta'}
            </button>

            {names.length === 0 && (
              <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded-lg">
                ⚠️ Adicione pelo menos um nome para usar a roleta!
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 text-center text-white">
          <p className="text-sm opacity-75">
            💡 Dica: Digite um nome por linha na caixa de texto
          </p>
        </div>
      </div>
    </div>
  );
}
