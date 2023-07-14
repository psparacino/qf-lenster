import { PendingVoteContextProvider } from '@components/Common/Providers/PendingVotesProvider';
import getLivepeerTheme from '@lib/getLivepeerTheme';
import { initLocale } from '@lib/i18n';
import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import { createReactClient, LivepeerConfig, studioProvider } from '@livepeer/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { IS_MAINNET, LIVEPEER_TOKEN } from 'data/constants';
import { ApolloProvider, webClient } from 'lens/apollo';
import { ThemeProvider } from 'next-themes';
import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { configureChains, createClient, WagmiConfig } from 'wagmi';
import { mainnet, polygon, polygonMumbai } from 'wagmi/chains';
import { InjectedConnector } from 'wagmi/connectors/injected';
import { WalletConnectConnector } from 'wagmi/connectors/walletConnect';
import { alchemyProvider } from 'wagmi/providers/alchemy';
import { jsonRpcProvider } from 'wagmi/providers/jsonRpc';
import { publicProvider } from 'wagmi/providers/public';

import ErrorBoundary from '../ErrorBoundary';
import Layout from '../Layout';
import FeatureFlagsProvider from './FeatureFlagsProvider';
import TelemetryProvider from './TelemetryProvider';

const { chains, provider } = configureChains(
  [IS_MAINNET ? polygon : polygonMumbai, mainnet],
  [
    alchemyProvider({
      apiKey: IS_MAINNET
        ? process.env.NEXT_PUBLIC_ALCHEMY_KEY_MAINNET!
        : process.env.NEXT_PUBLIC_ALCHEMY_KEY_MUMBAI!
    }),
    jsonRpcProvider({
      rpc: (chain) => {
        const rpcURLs: Record<number, string> = {
          137: `https://poly-mainnet.gateway.pokt.network/v1/lb/${process.env.NEXT_PUBLIC_POKT_ID!}`,
          80001: `https://polygon-mumbai.gateway.pokt.network/v1/lb/${process.env.NEXT_PUBLIC_POKT_ID!}`
        };

        return { http: rpcURLs[chain.id] };
      }
    }),
    publicProvider()
  ]
);

const connectors = () => {
  return [
    new InjectedConnector({ chains, options: { shimDisconnect: true } }),
    new WalletConnectConnector({
      chains,
      options: { projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID! }
    })
  ];
};

const wagmiClient = createClient({
  autoConnect: true,
  provider,
  connectors: connectors
});

const livepeerClient = createReactClient({
  provider: studioProvider({ apiKey: LIVEPEER_TOKEN })
});

const queryClient = new QueryClient();
const apolloClient = webClient;

const Providers = ({ children }: { children: ReactNode }) => {
  useEffect(() => {
    initLocale();
  }, []);

  return (
    <I18nProvider i18n={i18n}>
      <ErrorBoundary>
        <FeatureFlagsProvider>
          <TelemetryProvider />
          <WagmiConfig client={wagmiClient}>
            <ApolloProvider client={apolloClient}>
              <QueryClientProvider client={queryClient}>
                <PendingVoteContextProvider>
                  <LivepeerConfig client={livepeerClient} theme={getLivepeerTheme}>
                    <ThemeProvider defaultTheme="light" attribute="class">
                      <Layout>{children}</Layout>
                    </ThemeProvider>
                  </LivepeerConfig>
                </PendingVoteContextProvider>
                <ReactQueryDevtools />
              </QueryClientProvider>
            </ApolloProvider>
          </WagmiConfig>
        </FeatureFlagsProvider>
      </ErrorBoundary>
    </I18nProvider>
  );
};

export default Providers;
