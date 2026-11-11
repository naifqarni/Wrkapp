/**
 * iOS home-screen and Lock Screen widget: where the current order is.
 * Families: small, medium, and the three Lock Screen accessories.
 * Paper background, ink text, one thin progress line. With no order it shows only "wrk." and one line.
 */
import { HStack, Spacer, Text, VStack, Capsule, ProgressView } from '@expo/ui/swift-ui';
import { containerBackground, font, foregroundStyle, frame, progressViewStyle, tint, widgetURL } from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';
import { EMPTY_SURFACE, type OrderSurfaceProps } from '../orderProps';

const OrderWidget = (props: OrderSurfaceProps, env: WidgetEnvironment) => {
  'widget';
  const paper = '#F3F2EE';
  const ink = '#111112';
  const mute = '#6B6A66';
  const line = '#DCDAD3';
  const family = env.widgetFamily ?? 'systemSmall';
  const fraction = props.step < 0 ? 0 : props.step / (props.steps - 1);

  if (family === 'accessoryInline') {
    return <Text>{props.active ? `wrk. ${props.label}` : 'wrk.'}</Text>;
  }
  if (family === 'accessoryCircular') {
    return (
      <ProgressView value={fraction} modifiers={[progressViewStyle('circular'), widgetURL(props.url)]}>
        <Text modifiers={[font({ size: 11, weight: 'light' })]}>wrk.</Text>
      </ProgressView>
    );
  }
  if (family === 'accessoryRectangular') {
    return (
      <VStack alignment="leading" spacing={2} modifiers={[widgetURL(props.url)]}>
        <Text modifiers={[font({ size: 13, weight: 'light' })]}>wrk.</Text>
        <Text modifiers={[font({ size: 15, weight: 'medium' })]}>{props.label}</Text>
        {props.active ? <ProgressView value={fraction} modifiers={[progressViewStyle('linear'), tint('#FFFFFF')]} /> : null}
      </VStack>
    );
  }

  const segments = [0, 1, 2, 3, 4];
  return (
    <VStack
      alignment="leading"
      spacing={6}
      modifiers={[containerBackground(paper, 'widget'), widgetURL(props.url), frame({ maxWidth: 10000, maxHeight: 10000, alignment: 'topLeading' })]}>
      <HStack>
        <Text modifiers={[font({ size: 17, weight: 'light' }), foregroundStyle(ink)]}>wrk.</Text>
        <Spacer />
        {props.active && props.eta ? <Text modifiers={[font({ size: 13 }), foregroundStyle(mute)]}>{props.eta}</Text> : null}
      </HStack>
      <Spacer />
      <Text modifiers={[font({ size: family === 'systemSmall' ? 20 : 24, weight: 'light' }), foregroundStyle(props.active ? ink : mute)]}>
        {props.label}
      </Text>
      {props.active ? (
        <HStack spacing={4}>
          {segments.map((i) => (
            <Capsule key={i} modifiers={[foregroundStyle(i <= props.step ? ink : line), frame({ height: 3 })]} />
          ))}
        </HStack>
      ) : null}
      {props.active ? (
        <HStack>
          <Text modifiers={[font({ size: 12, design: 'default' }), foregroundStyle(mute)]}>{`#${props.number}`}</Text>
          <Spacer />
          {family !== 'systemSmall' ? <Text modifiers={[font({ size: 12 }), foregroundStyle(mute)]}>{props.items}</Text> : null}
        </HStack>
      ) : null}
    </VStack>
  );
};

/** Name must match the `widgets[].name` entry in app.json. */
export const orderWidget = createWidget<OrderSurfaceProps>('OrderWidget', OrderWidget, EMPTY_SURFACE);
