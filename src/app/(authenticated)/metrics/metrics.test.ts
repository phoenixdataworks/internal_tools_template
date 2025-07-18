import { startOfDay, endOfDay } from 'date-fns';
import { createClient } from '@/lib/supabase/client';

jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn().mockReturnValue({
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
  }),
}));

describe('Metrics Page', () => {
  test('should not apply date filters when querying by livestream_id', () => {
    const streamId = '72115ef0-9085-4eb1-8239-7db677252f3e';
    const startDate = new Date('2025-04-25T07:00:00.000Z');
    const endDate = new Date('2025-05-03T06:59:59.999Z');

    const mockSupabase = createClient();
    mockSupabase
      .from('livestream_metrics')
      .select('timestamp,viewer_count,chat_activity')
      .eq('livestream_id', streamId)
      .order('timestamp', { ascending: true });

    expect(mockSupabase.from).toHaveBeenCalledWith('livestream_metrics');
    expect(mockSupabase.select).toHaveBeenCalledWith('timestamp,viewer_count,chat_activity');
    expect(mockSupabase.eq).toHaveBeenCalledWith('livestream_id', streamId);
    expect(mockSupabase.order).toHaveBeenCalledWith('timestamp', { ascending: true });

    expect(mockSupabase.gte).not.toHaveBeenCalledWith(
      'timestamp',
      startOfDay(startDate).toISOString()
    );
    expect(mockSupabase.lte).not.toHaveBeenCalledWith('timestamp', endOfDay(endDate).toISOString());
  });
});
