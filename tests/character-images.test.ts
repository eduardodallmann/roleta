import assert from 'node:assert/strict';
import { test } from 'node:test';

import { getCharacterImageContentType } from '~/lib/character-images';

test('identifica o formato dos bytes da imagem, inclusive marcas compatíveis AVIF', () => {
  const fixtures = [
    ['89504e470d0a1a0a', 'image/png'],
    ['ffd8ffe000104a4649460001', 'image/jpeg'],
    ['474946383761', 'image/gif'],
    ['474946383961', 'image/gif'],
    ['524946460c00000057454250', 'image/webp'],
    ['000000146674797061766966000000006d696631', 'image/avif'],
    ['00000014667479706d6966310000000061766966', 'image/avif'],
  ];
  for (const [hex, expected] of fixtures) {
    assert.equal(
      getCharacterImageContentType(Buffer.from(hex, 'hex')),
      expected,
    );
  }
});

test('bytes vazios, truncados e textos não são entregues como imagem', () => {
  for (const data of [
    '',
    'PNG',
    'GIF',
    'ftyp',
    '1234ftyp',
    'RIFF',
    'https://example.com/image.png',
    '<script>alert(1)</script>',
  ]) {
    assert.equal(getCharacterImageContentType(Buffer.from(data)), null);
  }
});
