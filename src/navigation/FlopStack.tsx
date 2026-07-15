import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import FlopListScreen from '../screens/FlopListScreen';
import FlopNoteScreen from '../screens/FlopNoteScreen';
import { useReducedMotion } from '../hooks/useReducedMotion';
import type { FlopStackParamList } from './types';

const Stack = createNativeStackNavigator<FlopStackParamList>();

// Flop's one transition: drilling in slides the new page in from the right, so the
// tree gains spatial continuity — deeper is rightward. Reduced motion fades instead.
export default function FlopStack() {
  const reducedMotion = useReducedMotion();

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: reducedMotion ? 'fade' : 'slide_from_right',
        animationDuration: 200,
      }}
    >
      <Stack.Screen name="FlopList" component={FlopListScreen} />
      <Stack.Screen name="FlopNote" component={FlopNoteScreen} />
    </Stack.Navigator>
  );
}
