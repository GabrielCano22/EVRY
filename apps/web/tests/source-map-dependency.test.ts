import { describe, expect, it } from 'vitest';
import { SourceMapConsumer, type MappingItem } from 'source-map-js';

// This lock-boundary characterization never serializes the malicious map:
// old versions must fail the assertion without actually blocking the event loop.
describe('source-map dependency boundary', () => {
  it('rejects an indexed offset that could amplify a tiny input into unbounded work', () => {
    const map = JSON.parse('{"version":3,"sections":[{"offset":{"line":1000000000,"column":0},"map":{"version":3,"sources":["fixture.ts"],"names":[],"mappings":"AAAA"}}]}');
    expect(() => new SourceMapConsumer(map)).toThrow();
  });

  it('preserves legitimate indexed source positions', () => {
    const map = JSON.parse('{"version":3,"sections":[{"offset":{"line":2,"column":0},"map":{"version":3,"sources":["fixture.ts"],"names":[],"mappings":"AAAA"}}]}');
    const consumer = new SourceMapConsumer(map);
    const mappings: MappingItem[] = [];
    consumer.eachMapping(mapping => mappings.push(mapping));
    expect(mappings).toEqual([{
      source: 'fixture.ts', generatedLine: 3, generatedColumn: 0,
      originalLine: 1, originalColumn: 0, name: null,
    }]);
  });
});
