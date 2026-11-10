import { parse, quote } from 'shell-quote';

describe('React Native developer-tools shell quoting', () => {
  it.each(['\n', '\r', '\u2028', '\u2029'])('rejects a line terminator after a comment (%j)', (terminator) => {
    // Only build a string: never execute the potentially unsafe shell output.
    expect(() => quote(['echo', 'ok', { comment: 'fixture' }, `argument${terminator}unexpected-command`]))
      .toThrow(TypeError);
  });

  it('preserves ordinary quoting, parsing and safe comments', () => {
    const tokens = ['echo', 'hello world', "single'quote", 'a;b', '$HOME'];
    expect(parse(quote(tokens))).toEqual(tokens);
    expect(quote(['echo', 'ok', { comment: 'fixture' }, 'safe argument']))
      .toBe("echo ok #fixture 'safe argument'");
  });
});
