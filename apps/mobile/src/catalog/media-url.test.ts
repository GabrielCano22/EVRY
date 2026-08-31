import { mediaUrl } from './media-url';

describe('mediaUrl', () => {
  it('keeps absolute URLs and resolves catalog paths against the server origin', () => {
    expect(mediaUrl('https://cdn.example/exercise.jpg', 'https://api.example/api/v1'))
      .toBe('https://cdn.example/exercise.jpg');
    expect(mediaUrl('/media/exercises/1.jpg', 'https://api.example/api/v1'))
      .toBe('https://api.example/media/exercises/1.jpg');
  });

  it('returns null when the catalog has no media', () => {
    expect(mediaUrl(null, 'https://api.example/api/v1')).toBeNull();
    expect(mediaUrl('   ', 'https://api.example/api/v1')).toBeNull();
  });

  it('resolves raw catalog paths under the backend media route', () => {
    expect(mediaUrl('images/1.jpg', 'https://api.example/api/v1')).toBe('https://api.example/media/exercises/images/1.jpg');
    expect(mediaUrl('videos/1.gif', 'https://api.example/api/v1')).toBe('https://api.example/media/exercises/videos/1.gif');
  });
});
