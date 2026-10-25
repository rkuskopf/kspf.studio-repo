import { describe, expect, it } from 'vitest';
import { legacyHomeBlocks, mapHomeBlocks } from './homepage-blocks';
const body = () => legacyHomeBlocks('site-uuid');
const permutations = [[0,1,2],[0,2,1],[1,0,2],[1,2,0],[2,0,1],[2,1,0]];
describe('homepage body', () => {
  it.each(permutations)('preserves saved order %j', (...order) => {
    const blocks = body();
    const value = order.map(index => blocks[index]);
    expect(mapHomeBlocks(value)).toEqual(value);
  });
  it.each([undefined, null, [], {}, [body()[0]], [...body(), body()[0]]])('rejects invalid body %j', value => {
    expect(() => mapHomeBlocks(value)).toThrow(/Storyblok home body/);
  });
  it.each(['_uid','component','site'])('rejects a missing %s', field => {
    const blocks: any[] = body(); delete blocks[0][field];
    expect(() => mapHomeBlocks(blocks)).toThrow(/Storyblok home body/);
  });
  it('rejects unknown components, duplicate components, duplicate UIDs and collections', () => {
    for (const edit of [
      (v: any[]) => v[0].component = 'experience',
      (v: any[]) => v[1] = {...v[0], _uid:'other'},
      (v: any[]) => v[1]._uid = v[0]._uid,
      (v: any[]) => v[2].collection = 'archive/',
      (v: any[]) => v[0].site = ' ',
    ]) { const value = body(); edit(value); expect(() => mapHomeBlocks(value)).toThrow(); }
  });
});
