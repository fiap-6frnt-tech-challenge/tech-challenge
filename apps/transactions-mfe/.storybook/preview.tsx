import '../src/index.css';
import { Provider } from 'react-redux';
import { QueryClientProvider } from '@tanstack/react-query';
import type { Preview } from '@storybook/react-vite';
import { store } from '@bytebank/stores';
import { queryClient } from '@bytebank/api-client';

const preview: Preview = {
  decorators: [
    (Story) => (
      <Provider store={store}>
        <QueryClientProvider client={queryClient}>
          <Story />
        </QueryClientProvider>
      </Provider>
    ),
  ],
  parameters: {
    viewport: {
      options: {
        mobile: { name: 'Mobile', styles: { width: '390px', height: '844px' } },
        tablet: { name: 'Tablet', styles: { width: '768px', height: '1024px' } },
        desktop: { name: 'Desktop', styles: { width: '1280px', height: '900px' } },
      },
    },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    a11y: {
      test: 'error',
    },
  },
};

export default preview;
