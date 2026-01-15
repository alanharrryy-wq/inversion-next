import { http, HttpResponse, delay } from 'msw';
import { mockPortfolio, mockPerformance, mockUser } from './data';

export const handlers = [
  http.get('/api/me', async () => {
    await delay(180);
    return HttpResponse.json(mockUser);
  }),

  http.get('/api/portfolio', async () => {
    await delay(320);
    return HttpResponse.json(mockPortfolio);
  }),

  http.get('/api/performance', async ({ request }) => {
    await delay(280);
    const url = new URL(request.url);
    const range = (url.searchParams.get('range') || '30d') as keyof typeof mockPerformance;
    const payload = mockPerformance[range] || mockPerformance['30d'];
    return HttpResponse.json(payload);
  }),
];
