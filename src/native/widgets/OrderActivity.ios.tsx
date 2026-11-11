/**
 * The order on the Lock Screen and in the Dynamic Island, from payment to the door.
 *
 * Lock Screen banner: card stock, ink text, the five-step line.
 * Dynamic Island: the island is the one black object. Compact shows "wrk." and the state;
 * expanded shows the state, the ETA and the line; minimal is a small ring.
 */
import { Capsule, HStack, ProgressView, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import { activityBackgroundTint, font, foregroundStyle, frame, padding, progressViewStyle, tint } from '@expo/ui/swift-ui/modifiers';
import { createLiveActivity, type LiveActivityEnvironment } from 'expo-widgets';
import type { OrderSurfaceProps } from '../orderProps';

const OrderActivity = (props: OrderSurfaceProps, env: LiveActivityEnvironment) => {
  'widget';
  const stock = '#FBFAF7';
  const ink = '#111112';
  const mute = '#6B6A66';
  const line = '#DCDAD3';
  const onBlack = '#F3F2EE';
  const dim = '#47474B';
  const fraction = props.step < 0 ? 0 : props.step / (props.steps - 1);
  const segments = [0, 1, 2, 3, 4];
  const stale = env.isStale === true;

  const bar = (on: string, off: string) => (
    <HStack spacing={4}>
      {segments.map((i) => (
        <Capsule key={i} modifiers={[foregroundStyle(i <= props.step ? on : off), frame({ height: 3 })]} />
      ))}
    </HStack>
  );

  return {
    banner: (
      <VStack alignment="leading" spacing={10} modifiers={[padding({ all: 16 }), activityBackgroundTint(stock)]}>
        <HStack>
          <Text modifiers={[font({ size: 15, weight: 'light' }), foregroundStyle(mute)]}>wrk.</Text>
          <Spacer />
          <Text modifiers={[font({ size: 13 }), foregroundStyle(mute)]}>{`#${props.number}`}</Text>
        </HStack>
        <HStack alignment="firstTextBaseline">
          <Text modifiers={[font({ size: 22, weight: 'light' }), foregroundStyle(stale ? mute : ink)]}>{props.label}</Text>
          <Spacer />
          {props.eta ? <Text modifiers={[font({ size: 15 }), foregroundStyle(ink)]}>{props.eta}</Text> : null}
        </HStack>
        {bar(ink, line)}
      </VStack>
    ),
    bannerSmall: (
      <VStack alignment="leading" spacing={4} modifiers={[padding({ all: 10 }), activityBackgroundTint(stock)]}>
        <Text modifiers={[font({ size: 14, weight: 'medium' }), foregroundStyle(ink)]}>{props.label}</Text>
        {bar(ink, line)}
      </VStack>
    ),
    compactLeading: <Text modifiers={[font({ size: 14, weight: 'light' }), foregroundStyle(onBlack)]}>wrk.</Text>,
    compactTrailing: <Text modifiers={[font({ size: 13 }), foregroundStyle(onBlack)]}>{props.eta || props.label}</Text>,
    minimal: <ProgressView value={fraction} modifiers={[progressViewStyle('circular'), tint(onBlack)]} />,
    expandedLeading: <Text modifiers={[font({ size: 17, weight: 'light' }), foregroundStyle(onBlack), padding({ leading: 6 })]}>wrk.</Text>,
    expandedTrailing: props.eta ? (
      <Text modifiers={[font({ size: 15 }), foregroundStyle(onBlack), padding({ trailing: 6 })]}>{props.eta}</Text>
    ) : undefined,
    expandedBottom: (
      <VStack alignment="leading" spacing={10} modifiers={[padding({ horizontal: 6, bottom: 6 })]}>
        <Text modifiers={[font({ size: 20, weight: 'light' }), foregroundStyle(onBlack)]}>{props.label}</Text>
        {bar(onBlack, dim)}
        <Text modifiers={[font({ size: 12 }), foregroundStyle('#8E8D89')]}>{`#${props.number}  ${props.items}`}</Text>
      </VStack>
    ),
  };
};

export const orderActivity = createLiveActivity<OrderSurfaceProps>('OrderActivity', OrderActivity);
