import { Injectable } from '@nestjs/common';
import { Test } from '@nestjs/testing';

// Guards the option propagation added in @nestjs/testing 12.6.3: an
// `instrument.instanceDecorator` passed to Test.createTestingModule() must be
// applied to the provider instances resolved for the compiled module.
@Injectable()
class InstrumentedSampleService {
  readonly kind = 'instrumented-sample';
}

describe('Test.createTestingModule() instrumentation', () => {
  it('applies the instrument instance decorator to provider instances', async () => {
    const decoratedInstances: unknown[] = [];
    const testingModuleOptions = {
      instrument: {
        instanceDecorator: (instance: unknown) => {
          decoratedInstances.push(instance);
          return instance;
        },
      },
    } as unknown as Parameters<typeof Test.createTestingModule>[1];

    const moduleRef = await Test.createTestingModule(
      { providers: [InstrumentedSampleService] },
      testingModuleOptions,
    ).compile();

    try {
      const service = moduleRef.get(InstrumentedSampleService);

      expect(service).toBeInstanceOf(InstrumentedSampleService);
      expect(decoratedInstances).toContain(service);
    } finally {
      await moduleRef.close();
    }
  });
});
