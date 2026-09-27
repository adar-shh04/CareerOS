import { BadRequestException } from '@nestjs/common';

import { JobsController } from './jobs.controller';
import type { JobsService } from './jobs.service';

describe('JobsController list query parsing', () => {
  const listByWorkspace = jest.fn().mockResolvedValue([]);
  const controller = new JobsController({
    listByWorkspace,
  } as unknown as JobsService);

  beforeEach(() => listByWorkspace.mockClear());

  it('passes numeric limit/offset and the server-side filters through', async () => {
    await controller.listJobs(
      'ws-1',
      ' react ',
      'true',
      'GraphQL',
      'true',
      'true',
      '20',
      '40',
    );
    expect(listByWorkspace).toHaveBeenCalledWith('ws-1', {
      query: 'react',
      remoteOnly: true,
      skill: 'GraphQL',
      savedOnly: true,
      hideDismissed: true,
      limit: 20,
      offset: 40,
    });
  });

  it('defaults to the first page of 50', async () => {
    await controller.listJobs('ws-1');
    expect(listByWorkspace).toHaveBeenCalledWith(
      'ws-1',
      expect.objectContaining({ limit: 50, offset: 0 }),
    );
  });

  it.each([
    ['abc', undefined],
    ['-1', undefined],
    ['1.5', undefined],
    ['0', undefined],
    ['101', undefined],
    [undefined, 'x'],
  ])('rejects limit=%p offset=%p with 400', async (limit, offset) => {
    await expect(
      controller.listJobs(
        'ws-1',
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        limit,
        offset,
      ),
    ).rejects.toThrow(BadRequestException);
    expect(listByWorkspace).not.toHaveBeenCalled();
  });
});
