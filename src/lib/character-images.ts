export const getCharacterImageContentType = (image: Buffer): string | null => {
  if (image.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex'))) {
    return 'image/png';
  }
  if (image.subarray(0, 3).equals(Buffer.from('ffd8ff', 'hex'))) {
    return 'image/jpeg';
  }
  const signature = image.toString('ascii', 0, 6);
  if (signature === 'GIF87a' || signature === 'GIF89a') {
    return 'image/gif';
  }
  if (
    image.toString('ascii', 0, 4) === 'RIFF' &&
    image.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return 'image/webp';
  }
  if (image.toString('ascii', 4, 8) === 'ftyp') {
    // AVIF pode aparecer como marca principal ou como marca compatível no contêiner.
    const boxLength = Math.min(image.readUInt32BE(0), image.length);
    const brands = [image.toString('ascii', 8, 12)];
    for (let offset = 16; offset + 4 <= boxLength; offset += 4) {
      brands.push(image.toString('ascii', offset, offset + 4));
    }
    if (brands.includes('avif') || brands.includes('avis')) {
      return 'image/avif';
    }
  }

  return null;
};
