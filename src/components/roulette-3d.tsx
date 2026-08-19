'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import type { Pessoa } from '~/types/pessoa';

export type SpinRequest = {
  id: number;
  targetIndex: number;
};

type Roulette3DProps = {
  pessoas: Pessoa[];
  spinRequest: SpinRequest | null;
  onSpinEnd: () => void;
};

/*
 * Todas as medidas são derivadas do tamanho do palco (--wheel-size efetivo),
 * medido via ResizeObserver. Nenhuma dimensão interna é fixa: cada raio,
 * largura e perspectiva é uma fração de `size`.
 */
const PETAL_COUNT = 36;
const MIN_SPIN_TURNS = 4;
const RANDOM_EXTRA_TURNS = 3;
const SPIN_DURATION_MS = 4300;
const SPIN_EASING = 'cubic-bezier(0.12, 0.76, 0.16, 1)';
const GOLD_RING =
  'conic-gradient(from 210deg, #8a5a00, #f5c542 12%, #fff3b0 22%, #d9a115 38%, #8a5a00 52%, #f7d060 66%, #b8860b 80%, #8a5a00)';
const BEZEL_METAL =
  'conic-gradient(from 140deg, #2b3442, #9fb0c4 12%, #f2f6fb 22%, #8a99ad 34%, #222b38 50%, #aab9cc 64%, #dde6f0 74%, #55627a 88%, #2b3442)';

const SEGMENT_COLORS = [
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

type WheelLayout = {
  size: number;
  center: number;
  ringOuterRadius: number;
  discRadius: number;
  bezelWidth: number;
  holeRadius: number;
  holeOuterRadius: number;
  petalWidth: number;
  petalLength: number;
  petalMidRadius: number;
  perspective: number;
  faceWidth: number;
  faceHeight: number;
  drumRadius: number;
  faceFontSize: number;
  pointerWidth: number;
  pointerHeight: number;
};

const clampNumber = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

/*
 * Silhueta individual da pétala (gota alongada).
 * Coordenadas locais: y=0 é a ponta externa (arredondada e larga),
 * y=h é a extremidade interna (estreita, afunilada em direção ao centro).
 * A largura cresce da base estreita até o bojo mais largo logo abaixo da
 * ponta e a própria ponta fecha com uma cúpula arredondada — sem recortes
 * côncavos e sem formato de triângulo/setor de pizza.
 */
const buildPetalPath = (w: number, h: number): string => {
  const round2 = (v: number): number => Math.round(v * 100) / 100;
  const cx = w / 2;
  const topR = w * 0.47; // raio da cúpula da ponta externa (bem arredondada/larga)
  const wideHalf = w * 0.5; // controles da curva (bojo)
  const innerHalf = w * 0.11; // meia-largura da extremidade interna (estreita)
  const topCY = topR;
  const capCY = h - innerHalf;
  const yWide = h * 0.34;
  const midTopY = (topCY + yWide) / 2;
  const midBotY = (yWide + capCY) / 2;

  const c = (n: number): string => round2(n).toString();

  return [
    `M ${c(cx)} 0`,
    `A ${c(topR)} ${c(topR)} 0 0 1 ${c(cx + topR)} ${c(topCY)}`,
    `C ${c(cx + wideHalf)} ${c(midTopY)}, ${c(cx + wideHalf)} ${c(midBotY)}, ${c(cx + innerHalf)} ${c(capCY)}`,
    `A ${c(innerHalf)} ${c(innerHalf)} 0 0 1 ${c(cx - innerHalf)} ${c(capCY)}`,
    `C ${c(cx - wideHalf)} ${c(midBotY)}, ${c(cx - wideHalf)} ${c(midTopY)}, ${c(cx - topR)} ${c(topCY)}`,
    `A ${c(topR)} ${c(topR)} 0 0 1 ${c(cx)} 0`,
    'Z',
  ].join(' ');
};

const computeLayout = (size: number, participantCount: number): WheelLayout => {
  const center = size / 2;
  const ringOuterRadius = size * 0.485;
  const discRadius = ringOuterRadius - size * 0.042;
  const bezelWidth = size * 0.02;
  const holeRadius = size * 0.176;
  const holeOuterRadius = holeRadius + bezelWidth;

  const petalsInnerRadius = holeOuterRadius - size * 0.01;
  const petalsOuterRadius = discRadius - size * 0.018;
  const petalLength = petalsOuterRadius - petalsInnerRadius;
  const petalMidRadius = (petalsInnerRadius + petalsOuterRadius) / 2;
  const petalSlot = (Math.PI * 2 * petalMidRadius) / PETAL_COUNT;
  const petalWidth = petalSlot * 1.12;

  const windowBox = holeRadius * 2;
  const perspective = windowBox * 3;

  const segmentCount = Math.max(participantCount, 2);
  const tangent = Math.tan(Math.PI / segmentCount);

  let faceWidth: number;
  let drumRadius: number;

  if (segmentCount <= 2) {
    faceWidth = windowBox * 0.9;
    drumRadius = faceWidth / 2;
  } else {
    faceWidth = windowBox * 0.38;
    drumRadius = faceWidth / (2 * tangent);
  }

  const faceHeight = windowBox * 1.02;
  const faceFontSize = clampNumber(faceWidth * 0.2, 8, 17);

  return {
    size,
    center,
    ringOuterRadius,
    discRadius,
    bezelWidth,
    holeRadius,
    holeOuterRadius,
    petalWidth,
    petalLength,
    petalMidRadius,
    perspective,
    faceWidth,
    faceHeight,
    drumRadius,
    faceFontSize,
    pointerWidth: size * 0.042,
    pointerHeight: size * 0.052,
  };
};

export const Roulette3D: React.FC<Roulette3DProps> = ({
  pessoas,
  spinRequest,
  onSpinEnd,
}) => {
  const stageRef = useRef<HTMLDivElement>(null);
  const drumRef = useRef<HTMLDivElement>(null);
  const handledSpinIdRef = useRef<number | null>(null);
  const onSpinEndRef = useRef(onSpinEnd);
  const initializedRef = useRef(false);

  const [size, setSize] = useState(500);
  const [rotationDeg, setRotationDeg] = useState(0);
  const [instant, setInstant] = useState(true);

  useEffect(() => {
    onSpinEndRef.current = onSpinEnd;
  });

  useEffect(() => {
    if (initializedRef.current || pessoas.length === 0) {
      return;
    }

    initializedRef.current = true;
    setRotationDeg(360 / pessoas.length / 2);
  }, [pessoas]);

  useEffect(() => {
    const element = stageRef.current;
    let observer: ResizeObserver | undefined;

    if (element) {
      const update = (): void => {
        const width = element.clientWidth;
        if (width > 0) {
          setSize(width);
        }
      };

      update();
      observer = new ResizeObserver(update);
      observer.observe(element);
    }

    return () => observer?.disconnect();
  }, []);

  useEffect(() => {
    if (
      !spinRequest ||
      handledSpinIdRef.current === spinRequest.id ||
      pessoas.length === 0
    ) {
      return;
    }

    handledSpinIdRef.current = spinRequest.id;

    const deltaAngle = 360 / pessoas.length;
    const targetAngle =
      (360 - ((spinRequest.targetIndex * deltaAngle) % 360)) % 360;
    const turns =
      MIN_SPIN_TURNS + Math.floor(Math.random() * RANDOM_EXTRA_TURNS);

    setInstant(false);
    setRotationDeg((previous) => {
      const nextFullTurn = Math.ceil(previous / 360) * 360;

      return nextFullTurn + turns * 360 + targetAngle;
    });
  }, [spinRequest, pessoas]);

  const handleDrumTransitionEnd = (
    event: React.TransitionEvent<HTMLDivElement>,
  ): void => {
    if (
      event.target !== drumRef.current ||
      event.propertyName !== 'transform'
    ) {
      return;
    }

    setInstant(true);
    setRotationDeg((previous) => previous % 360);
    onSpinEndRef.current();
  };

  const layout = useMemo(
    () => computeLayout(size, pessoas.length),
    [size, pessoas.length],
  );

  const {
    center,
    ringOuterRadius,
    discRadius,
    bezelWidth,
    holeOuterRadius,
    petalWidth,
    petalLength,
    petalMidRadius,
    perspective,
    faceWidth,
    faceHeight,
    drumRadius,
    faceFontSize,
    pointerWidth,
    pointerHeight,
  } = layout;

  const deltaAngle = pessoas.length > 0 ? 360 / pessoas.length : 360;

  const petalPath = useMemo(
    () => buildPetalPath(petalWidth, petalLength),
    [petalWidth, petalLength],
  );

  return (
    <div
      ref={stageRef}
      className="relative aspect-square w-full max-w-[520px] select-none"
    >
      {/* Aro dourado externo (fixo) */}
      <div
        className="absolute rounded-full"
        style={{
          inset: center - ringOuterRadius,
          background: GOLD_RING,
          boxShadow:
            '0 14px 30px rgba(20, 5, 40, 0.45), 0 2px 6px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.3)',
        }}
      />

      {/* Fundo roxo (fixo) */}
      <div
        className="absolute rounded-full"
        style={{
          inset: center - discRadius,
          background:
            'radial-gradient(circle at 50% 45%, #43307a 0%, #2f1f5d 55%, #221448 78%, #180d38 100%)',
          boxShadow: 'inset 0 0 18px rgba(10, 2, 25, 0.55)',
        }}
      />

      {/* Pétalas/pás brancas (fixas, peças individuais em gota alongada) */}
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full"
        viewBox={`0 0 ${size} ${size}`}
      >
        <defs>
          <linearGradient id="petal-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#cfcfd8" />
            <stop offset="18%" stopColor="#ffffff" />
            <stop offset="55%" stopColor="#f6f6fa" />
            <stop offset="82%" stopColor="#e2e2ea" />
            <stop offset="100%" stopColor="#c9c9d4" />
          </linearGradient>
          <filter
            id="petal-shadow"
            x="-40%"
            y="-20%"
            width="180%"
            height="140%"
          >
            <feDropShadow
              dx="0"
              dy="2"
              stdDeviation="2"
              floodColor="#0c041e"
              floodOpacity="0.35"
            />
          </filter>
        </defs>

        {Array.from({ length: PETAL_COUNT }, (_, petalIndex) => (
          <g
            key={`petal-${petalIndex}`}
            transform={`rotate(${(360 / PETAL_COUNT) * petalIndex} ${center} ${center}) translate(${center - petalWidth / 2} ${center - petalMidRadius - petalLength / 2})`}
          >
            <path
              d={petalPath}
              fill="url(#petal-fill)"
              stroke="rgba(140, 140, 165, 0.25)"
              strokeWidth="0.5"
              filter="url(#petal-shadow)"
            />
          </g>
        ))}
      </svg>

      {/* Miolo: aro metálico + carrossel 3D */}
      <div
        className="absolute"
        style={{
          left: center - holeOuterRadius,
          top: center - holeOuterRadius,
          width: holeOuterRadius * 2,
          height: holeOuterRadius * 2,
        }}
      >
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: BEZEL_METAL,
            boxShadow:
              '0 8px 18px rgba(5, 2, 15, 0.55), 0 1px 2px rgba(0, 0, 0, 0.5)',
          }}
        />

        <div
          className="absolute overflow-hidden rounded-full"
          style={{
            inset: bezelWidth,
            background:
              'radial-gradient(circle at 50% 42%, #241541 0%, #190d33 65%, #120826 100%)',
          }}
        >
          <div
            className="absolute inset-0"
            style={{ perspective: `${perspective}px` }}
          >
            <div
              ref={drumRef}
              className="absolute left-1/2 top-1/2"
              style={{
                width: faceWidth,
                height: faceHeight,
                marginLeft: -faceWidth / 2,
                marginTop: -faceHeight / 2,
                transformStyle: 'preserve-3d',
                transform: `rotateY(${rotationDeg}deg)`,
                transition: instant
                  ? 'none'
                  : `transform ${SPIN_DURATION_MS}ms ${SPIN_EASING}`,
              }}
              onTransitionEnd={handleDrumTransitionEnd}
            >
              {pessoas.map((pessoa, index) => (
                <div
                  key={pessoa.id}
                  title={`${pessoa.nome} — ${pessoa.pontos} pts`}
                  className="absolute flex flex-col items-center justify-center overflow-hidden"
                  style={{
                    width: faceWidth,
                    height: faceHeight,
                    transform: `rotateY(${deltaAngle * index}deg) translateZ(${drumRadius}px)`,
                    backfaceVisibility: 'hidden',
                    background: `linear-gradient(180deg, rgba(255, 255, 255, 0.16), rgba(255, 255, 255, 0) 30%), ${SEGMENT_COLORS[index % SEGMENT_COLORS.length]}`,
                    borderLeft: '1px solid rgba(0, 0, 0, 0.28)',
                    borderRight: '1px solid rgba(255, 255, 255, 0.22)',
                    fontSize: faceFontSize,
                  }}
                >
                  <span
                    className="max-w-full truncate px-0.5 font-bold leading-tight text-white"
                    style={{ textShadow: '0 1px 2px rgba(0, 0, 0, 0.7)' }}
                  >
                    {pessoa.nome}
                  </span>

                  {faceWidth >= 26 && (
                    <span
                      className="text-white/85"
                      style={{
                        fontSize: Math.max(6, faceFontSize - 3),
                        textShadow: '0 1px 2px rgba(0, 0, 0, 0.7)',
                      }}
                    >
                      {pessoa.pontos} pts
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Sombras fixas que reforçam a leitura cilíndrica */}
          <div
            className="pointer-events-none absolute inset-0 rounded-full"
            style={{
              background:
                'linear-gradient(90deg, rgba(9, 3, 20, 0.9) 0%, rgba(9, 3, 20, 0.4) 13%, rgba(0, 0, 0, 0) 34%, rgba(0, 0, 0, 0) 66%, rgba(9, 3, 20, 0.4) 87%, rgba(9, 3, 20, 0.9) 100%)',
            }}
          />
          <div
            className="pointer-events-none absolute inset-0 rounded-full"
            style={{
              background:
                'linear-gradient(180deg, rgba(255, 255, 255, 0.22) 0%, rgba(255, 255, 255, 0) 26%, rgba(0, 0, 0, 0) 72%, rgba(9, 3, 20, 0.5) 100%)',
            }}
          />
          {/* Rebordo interno do aro, por cima do tambor */}
          <div
            className="pointer-events-none absolute rounded-full"
            style={{
              inset: 0,
              boxShadow: 'inset 0 2px 6px rgba(0, 0, 0, 0.6)',
            }}
          />
        </div>

        {/* Ponteiro fixo: indica a face frontal, posição usada no cálculo */}
        <div
          className="absolute left-1/2"
          style={{
            top: -pointerHeight * 0.35,
            transform: 'translateX(-50%)',
            width: pointerWidth,
            height: pointerHeight,
            filter: 'drop-shadow(0 3px 3px rgba(0, 0, 0, 0.5))',
          }}
        >
          <div
            style={{
              width: 0,
              height: 0,
              borderLeft: `${pointerWidth / 2}px solid transparent`,
              borderRight: `${pointerWidth / 2}px solid transparent`,
              borderTop: `${pointerHeight}px solid #f59e0b`,
            }}
          />
        </div>
      </div>
    </div>
  );
};
