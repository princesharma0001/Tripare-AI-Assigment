
import { Stack } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useColorScheme } from 'react-native';

import { initializeDatabase } from '@/db/database';
import { syncCatalog } from '@/services/syncService';

export default function RootLayout() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60_000,
            retry: 2,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  const scheme = useColorScheme();

  useEffect(() => {
    let cancelled = false;

    async function startApp() {
      try {
        await initializeDatabase();
        console.log('DATABASE READY');

        if (cancelled) return;

        await syncCatalog();
        console.log('CATALOG SYNC COMPLETE');
      } catch (error: unknown) {
        console.error('DATABASE / CATALOG SYNC ERROR:', error);
      }
    }

    void startApp();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />

        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen
            name="breed/[id]"
            options={{
              headerShown: true,
              title: 'Breed details',
            }}
          />
        </Stack>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
