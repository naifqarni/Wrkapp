/**
 * Android home-screen widget (rendered by Glance through expo-widgets): where the current order is.
 * Card-stock surface, ink text, one Material progress line.
 */
import { Column, LinearProgressIndicator, Row, Spacer, Text } from '@expo/ui/jetpack-compose';
import { background, cornerRadius, fillMaxSize, fillMaxWidth, height, paddingAll, weight } from '@expo/ui/jetpack-compose/modifiers';
import { createWidget } from 'expo-widgets';
import { EMPTY_SURFACE, type OrderSurfaceProps } from '../orderProps';

const OrderWidget = (props: OrderSurfaceProps) => {
  'widget';
  const paper = '#F3F2EE';
  const ink = '#111112';
  const mute = '#6B6A66';
  const line = '#DCDAD3';
  const fraction = props.step < 0 ? 0 : props.step / (props.steps - 1);
  return (
    <Column modifiers={[fillMaxSize(), background(paper), cornerRadius(24), paddingAll(16)]}>
      <Row modifiers={[fillMaxWidth()]}>
        <Text color={ink} style={{ fontSize: 17, fontWeight: '300' }}>
          wrk.
        </Text>
        <Spacer modifiers={[weight(1)]} />
        {props.active && props.eta ? (
          <Text color={mute} style={{ fontSize: 13 }}>
            {props.eta}
          </Text>
        ) : null}
      </Row>
      <Spacer modifiers={[weight(1)]} />
      <Text color={props.active ? ink : mute} maxLines={2} style={{ fontSize: 20, fontWeight: '300' }}>
        {props.label}
      </Text>
      {props.active ? <Spacer modifiers={[height(8)]} /> : null}
      {props.active ? <LinearProgressIndicator progress={fraction} color={ink} trackColor={line} modifiers={[fillMaxWidth()]} /> : null}
      {props.active ? <Spacer modifiers={[height(6)]} /> : null}
      {props.active ? (
        <Text color={mute} style={{ fontSize: 12 }}>
          {`#${props.number}  ${props.items}`}
        </Text>
      ) : null}
    </Column>
  );
};

/** Name must match the `widgets[].name` entry in app.json. */
export const orderWidget = createWidget<OrderSurfaceProps>('OrderWidget', OrderWidget, EMPTY_SURFACE);
