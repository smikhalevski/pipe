import {Pipe} from '../main/Pipe';

describe('Pipe', () => {

  const concat = (str: string, arg: string) => str + arg;

  it('invokes callback only after send was called', () => {
    const cbMock = jest.fn();
    const pipe = new Pipe(cbMock);

    expect(cbMock).not.toHaveBeenCalled();

    pipe.send(null);

    expect(cbMock).toHaveBeenCalledTimes(1);
  });

  it('allows piping callbacks without arguments', () => {
    const pipe: Pipe<string, string> = Pipe
        .to<string>()
        .to((value) => value + '++')
        .to((value) => '--' + value);

    expect(pipe.send('a')).toBe('--a++');
  });

  it('pipe can be called multiple times providing same results', () => {
    const pipe: Pipe<number, number> = Pipe
        .to<number>()
        .to((value) => value + 1)
        .to((value) => value / 2);

    expect(pipe.send(3)).toBe(2);
    expect(pipe.send(4)).toBe(2.5);
  });

  it('allows piping callbacks with arguments', () => {
    const pipe = Pipe
        .to(concat, 'b')
        .to(concat, 'c');

    expect(pipe.send('a')).toBe('abc');
  });

  it('pipes can be nested', () => {
    const pipe = Pipe
        .to(concat, 'b')
        .to(Pipe
            .to(concat, 'c')
            .to(Pipe
                .to(concat, 'd')
                .to(concat, 'e'),
            )
            .to(concat, 'f'),
        )
        .to(concat, 'g');

    expect(pipe.send('a')).toBe('abcdefg');
  });

  it('piped value can be directed to another argument position with pipe placeholder', () => {
    const pipe = Pipe
        .to<string>()
        .to(
            (a1: number, a2: string) => `_${a1}_${a2}_`,
            111,
            Pipe.any,
        );

    expect(pipe.send('a')).toBe('_111_a_');
  });

  it('piped value can be inserted multiple times via placeholder', () => {
    const pipe = Pipe
        .to<string>()
        .to(
            (a1: number, a2: string, a3: number, a4: string) => `_${a1}_${a2}_${a3}_${a4}_`,
            111,
            Pipe.any,
            222,
            Pipe.any,
        );

    expect(pipe.send('a')).toBe('_111_a_222_a_');
  });

  it('piped value can be piped before becoming an argument', () => {
    const pipe = Pipe.to(
        (a1: number, a2: string, a3: number, a4: string) => `_${a1}_${a2}_${a3}_${a4}_`,
        111,
        Pipe.to((v) => '++' + v),
        222,
        Pipe.to((v) => '--' + v),
    );

    expect(pipe.send('a')).toBe('_111_++a_222_--a_');
  });

  it('resolves Promise arguments', async () => {
    const pipe = Pipe.to((value: number, prefix: string) => prefix + value, Promise.resolve('__'));

    await expect(pipe.send(123)).resolves.toBe('__123');
  });

  it('resolves async Pipe arguments', async () => {
    const pipe = Pipe
        .to((a1: number, a2: string) => a2 + a1,
            123,
            Pipe.to((value) => Promise.resolve('' + value)),
        );

    await expect(pipe.send('__')).resolves.toBe('__123');
  });

  it('passes input to multiple pipes', async () => {
    const pipe = Pipe
        .to<string>()
        .fanOut(
            Pipe.to((value: string) => parseInt(value, 10)),
            Pipe.to((value: string) => Promise.resolve(value + ' days')),
        );

    await expect(pipe.send('123')).resolves.toEqual([123, '123 days']);
  });
});
