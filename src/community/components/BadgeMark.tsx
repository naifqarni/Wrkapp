import React from 'react';
import { View } from 'react-native';

import { hash } from '../handles';
import { color } from '../ui/kit';

/**
 * The face of a pseudonym: the wrk. badge holder on its lanyard, seen from above, carrying a name
 * card nobody can read. Two ink lines stand where a name would be; their lengths come from the
 * handle, so a member always carries the same badge and no two neighbours look alike.
 */
export function BadgeMark({ seed, height = 34 }: { seed: string; height?: number }) {
  const h = hash(seed);
  const strap = Math.round(height * 0.17);
  const bodyH = height - strap;
  const w = Math.round(bodyH * 0.66);
  const pad = Math.max(2, Math.round(bodyH * 0.1));
  const line = Math.max(1.5, bodyH * 0.06);
  const l1 = 0.5 + ((h & 0xff) / 255) * 0.5;
  const l2 = 0.25 + (((h >>> 8) & 0xff) / 255) * 0.4;
  return (
    <View accessible={false} style={{ width: w, height, alignItems: 'center' }}>
      {/* the 12 mm lanyard, running off the top */}
      <View style={{ width: Math.max(3, Math.round(w * 0.3)), height: strap + 2, backgroundColor: color.foil }} />
      <View style={{ width: w, height: bodyH, marginTop: -2, borderRadius: Math.max(2.5, bodyH * 0.1), backgroundColor: color.black }}>
        <View
          style={{
            position: 'absolute',
            top: bodyH * 0.2,
            bottom: pad,
            start: pad,
            end: pad,
            borderRadius: 1.5,
            backgroundColor: color.stock,
            justifyContent: 'center',
            alignItems: 'center',
            gap: Math.max(1.5, bodyH * 0.06),
          }}>
          <View style={{ width: `${Math.round(l1 * 76)}%`, height: line, backgroundColor: color.ink, borderRadius: 1 }} />
          <View style={{ width: `${Math.round(l2 * 76)}%`, height: line, backgroundColor: color.faint, borderRadius: 1 }} />
        </View>
      </View>
    </View>
  );
}
