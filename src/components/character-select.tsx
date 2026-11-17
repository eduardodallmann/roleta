'use client';

import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';

import { Check, ChevronDown, UserRound, VolumeX } from 'lucide-react';
import { createPortal } from 'react-dom';

import type { CharacterOption } from '~/types/character';

const CharacterAvatar = ({
  character,
}: {
  character: CharacterOption | null;
}) => {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  let avatar = character ? <UserRound size={19} /> : <VolumeX size={19} />;
  if (character?.imagem_url && failedUrl !== character.imagem_url) {
    avatar = (
      <img
        src={character.imagem_url}
        alt=""
        className="h-full w-full object-cover"
        onError={() => setFailedUrl(character.imagem_url)}
      />
    );
  }

  return (
    <span
      className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-purple-100 text-purple-700"
      aria-hidden="true"
    >
      {avatar}
    </span>
  );
};

type CharacterSelectProps = {
  characters: CharacterOption[];
  value: string | null;
  onChange: (slug: string | null) => void;
  disabled?: boolean;
};

type MenuPosition = {
  left: number;
  width: number;
  maxHeight: number;
  top?: number;
  bottom?: number;
};

export const CharacterSelect = ({
  characters,
  value,
  onChange,
  disabled,
}: CharacterSelectProps) => {
  const id = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [open, setOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<MenuPosition | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const options = [null, ...characters];
  const selectedIndex = Math.max(
    0,
    options.findIndex((option) => (option?.slug ?? null) === value),
  );

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const closeOutside = (event: PointerEvent) => {
      if (
        !rootRef.current?.contains(event.target as Node) &&
        !listRef.current?.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('pointerdown', closeOutside);

    return () => document.removeEventListener('pointerdown', closeOutside);
  }, [open]);

  useLayoutEffect(() => {
    if (!open) {
      return undefined;
    }

    const updatePosition = () => {
      const trigger = triggerRef.current;
      if (!trigger) {
        return;
      }

      const rect = trigger.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      if (rect.bottom <= 0 || rect.top >= viewportHeight) {
        setOpen(false);

        return;
      }

      const margin = 8;
      const maxHeight = 288;
      const viewportWidth = document.documentElement.clientWidth;
      const spaceAbove = Math.max(0, rect.top - margin * 2);
      const spaceBelow = Math.max(0, viewportHeight - rect.bottom - margin * 2);
      const opensAbove = spaceBelow < maxHeight && spaceAbove > spaceBelow;
      const width = Math.min(rect.width, viewportWidth - margin * 2);
      setMenuPosition({
        left: Math.max(
          margin,
          Math.min(rect.left, viewportWidth - margin - width),
        ),
        width,
        maxHeight: Math.min(maxHeight, opensAbove ? spaceAbove : spaceBelow),
        top: opensAbove ? undefined : rect.bottom + margin,
        bottom: opensAbove ? viewportHeight - rect.top + margin : undefined,
      });
    };

    const handleScroll = (event: Event) => {
      if (!listRef.current?.contains(event.target as Node)) {
        updatePosition();
      }
    };
    updatePosition();
    const observer = new ResizeObserver(updatePosition);
    if (triggerRef.current) {
      observer.observe(triggerRef.current);
    }
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', handleScroll, true);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [open]);

  useEffect(() => {
    const list = listRef.current;
    const option = document.getElementById(`${id}-option-${activeIndex}`);
    if (!open || !list || !option) {
      return;
    }

    // Navegar entre opções deve rolar apenas a lista, sem mover a página.
    if (option.offsetTop < list.scrollTop) {
      list.scrollTop = option.offsetTop;
    } else if (
      option.offsetTop + option.offsetHeight >
      list.scrollTop + list.clientHeight
    ) {
      list.scrollTop =
        option.offsetTop + option.offsetHeight - list.clientHeight;
    }
  }, [open, activeIndex, id, menuPosition]);

  const choose = (index: number) => {
    onChange(options[index]?.slug ?? null);
    setOpen(false);
    triggerRef.current?.focus();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const lastIndex = options.length - 1;
    switch (event.key) {
      case 'ArrowDown':

      case 'ArrowUp': {
        event.preventDefault();
        setOpen(true);
        const step = event.key === 'ArrowDown' ? 1 : -1;
        setActiveIndex(
          open
            ? (activeIndex + step + options.length) % options.length
            : selectedIndex,
        );
        break;
      }

      case 'Home':

      case 'End':
        event.preventDefault();
        setOpen(true);
        setActiveIndex(event.key === 'Home' ? 0 : lastIndex);
        break;

      case 'Enter':

      case ' ':
        event.preventDefault();
        if (open) {
          choose(activeIndex);
        } else {
          setActiveIndex(selectedIndex);
          setOpen(true);
        }
        break;

      case 'Escape':

      case 'Tab':
        setOpen(false);
        break;

      default:
        if (event.key.length === 1) {
          const query = event.key.toLocaleLowerCase('pt-BR');
          const next = options.findIndex(
            (option, index) =>
              index > activeIndex &&
              (option?.nome ?? 'Sem som')
                .toLocaleLowerCase('pt-BR')
                .startsWith(query),
          );
          if (next >= 0) {
            setOpen(true);
            setActiveIndex(next);
          }
        }
    }
  };

  return (
    <div ref={rootRef} className="relative w-full">
      <label
        id={`${id}-label`}
        htmlFor={`${id}-trigger`}
        className="mb-2 block text-sm font-medium text-gray-700"
      >
        Voz do sorteio
      </label>
      <button
        ref={triggerRef}
        id={`${id}-trigger`}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${id}-list`}
        aria-labelledby={`${id}-label ${id}-value`}
        aria-activedescendant={open ? `${id}-option-${activeIndex}` : undefined}
        disabled={disabled}
        onClick={() => {
          setActiveIndex(selectedIndex);
          setOpen(!open);
        }}
        onKeyDown={handleKeyDown}
        className="flex w-full items-center gap-3 rounded-lg border border-gray-300 bg-white p-3 text-left text-gray-900 shadow-sm focus-visible:outline-2 focus-visible:outline-purple-600 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <CharacterAvatar character={options[selectedIndex]} />
        <span id={`${id}-value`} className="min-w-0 flex-1">
          {options[selectedIndex]?.nome ?? 'Sem som'}
        </span>
        <ChevronDown size={18} aria-hidden="true" />
      </button>
      {open &&
        !disabled &&
        menuPosition &&
        createPortal(
          <ul
            ref={listRef}
            id={`${id}-list`}
            role="listbox"
            aria-labelledby={`${id}-label`}
            style={menuPosition}
            className="fixed z-50 overflow-y-auto overscroll-contain rounded-lg border border-gray-200 bg-white p-1 shadow-xl"
          >
            {options.map((character, index) => (
              <li
                id={`${id}-option-${index}`}
                key={character?.slug ?? 'sem-som'}
                role="option"
                aria-selected={index === selectedIndex}
                onPointerMove={() => setActiveIndex(index)}
                onPointerDown={(event) => event.preventDefault()}
                onClick={() => choose(index)}
                className={`flex cursor-pointer items-center gap-3 rounded-md p-2 text-gray-900 ${index === activeIndex ? 'bg-purple-100' : ''}`}
              >
                <CharacterAvatar character={character} />
                <span className="min-w-0 flex-1">
                  {character?.nome ?? 'Sem som'}
                </span>
                {index === selectedIndex && (
                  <Check
                    size={18}
                    className="text-purple-700"
                    aria-hidden="true"
                  />
                )}
              </li>
            ))}
          </ul>,
          document.body,
        )}
    </div>
  );
};
