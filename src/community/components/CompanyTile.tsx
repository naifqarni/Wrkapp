import React, { useState } from 'react';
import { Image, View } from 'react-native';

import { color, font, T } from '../ui/kit';

/**
 * How a company is shown: a neutral rounded tile holding its own icon, untouched: not recoloured,
 * not cropped, not redrawn, with clear space around it. When there is no icon (or it fails to load,
 * or the company asked for it to be hidden) the tile carries a wrk. monogram: the first letter of
 * the name, ink on card stock.
 */
export function CompanyTile({ name, iconUrl, size = 44 }: { name: string; iconUrl?: string | null; size?: number }) {
  const [failed, setFailed] = useState(false);
  const letter = (name.trim().replace(/^ال/, '')[0] ?? name.trim()[0] ?? '').toUpperCase();
  const show = !!iconUrl && !failed;
  return (
    <View
      accessible={false}
      style={{ width: size, height: size, borderRadius: Math.round(size * 0.26), backgroundColor: color.stock, borderWidth: 1, borderColor: color.line, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
      {show ? (
        <Image source={{ uri: iconUrl! }} onError={() => setFailed(true)} resizeMode="contain" style={{ width: Math.round(size * 0.58), height: Math.round(size * 0.58) }} />
      ) : (
        <T style={{ fontFamily: /[A-Za-z]/.test(letter) ? font.mark : font.display, fontSize: Math.round(size * 0.44), lineHeight: Math.round(size * 0.7), color: color.ink }}>{letter}</T>
      )}
    </View>
  );
}
