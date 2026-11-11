/**
 * Android's answer to the Live Activity: one ongoing notification that follows the order.
 * It updates in place (alert only once), shows the five-step line, and opens the order when tapped.
 */
import { Column, LinearProgressIndicator, Row, Spacer, Text } from '@expo/ui/jetpack-compose';
import { fillMaxWidth, height, weight } from '@expo/ui/jetpack-compose/modifiers';
import { createCustomNotification } from 'expo-widgets';
import type { OrderSurfaceProps } from '../orderProps';

const OrderNotification = (props: OrderSurfaceProps) => {
  'widget';
  const ink = '#111112';
  const mute = '#6B6A66';
  const line = '#DCDAD3';
  const fraction = props.step < 0 ? 0 : props.step / (props.steps - 1);
  const head = (
    <Row modifiers={[fillMaxWidth()]}>
      <Text color={ink} maxLines={1} style={{ fontSize: 16, fontWeight: '400' }}>
        {props.label}
      </Text>
      <Spacer modifiers={[weight(1)]} />
      {props.eta ? (
        <Text color={mute} style={{ fontSize: 13 }}>
          {props.eta}
        </Text>
      ) : null}
    </Row>
  );
  return {
    collapsed: (
      <Column modifiers={[fillMaxWidth()]}>
        {head}
        <Spacer modifiers={[height(6)]} />
        <LinearProgressIndicator progress={fraction} color={ink} trackColor={line} modifiers={[fillMaxWidth()]} />
      </Column>
    ),
    expanded: (
      <Column modifiers={[fillMaxWidth()]}>
        {head}
        <Spacer modifiers={[height(8)]} />
        <LinearProgressIndicator progress={fraction} color={ink} trackColor={line} modifiers={[fillMaxWidth()]} />
        <Spacer modifiers={[height(8)]} />
        <Text color={mute} style={{ fontSize: 13 }}>
          {`wrk.  #${props.number}  ${props.items}`}
        </Text>
      </Column>
    ),
  };
};

export const orderNotification = createCustomNotification<OrderSurfaceProps>('OrderNotification', OrderNotification);
