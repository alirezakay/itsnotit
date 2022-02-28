import * as React from 'react';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import CameraApp from './application/CameraApp';

export default function App() {
  return (
    <SafeAreaProvider>
      <CameraApp />
    </SafeAreaProvider>
  );
}
