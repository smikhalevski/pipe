import {Pipe} from '../main/Pipe';

describe('Pipe', () => {

  const concat = (str: string, arg: string) => str + arg;

  it('calls provided function only after get was called', () => {
    const fn = jest.fn();
    const p = new Pipe(fn);
    expect(fn).not.toHaveBeenCalled();
    p.send(null);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('allows piping callbacks without arguments', () => {
    expect(
        Pipe.from((v) => v + '++')
            .to((v) => '--' + v)
            .send('a'),
    ).toBe('--a++');
  });

  it('pipe can be called multiple times providing same results', () => {
    const p = Pipe.from<number>().to((v) => v + 1).to((v) => v / 2);

    expect(p.send(3)).toBe(2);
    expect(p.send(4)).toBe(2.5);
  });

  it('allows piping callbacks with arguments', () => {
    expect(
        Pipe.from<string>()
            .to(concat, 'b')
            .to(concat, 'c')
            .send('a'),
    ).toBe('abc');
  });

  it('provides shorthand constructor function', () => {
    expect(
        Pipe.from<string>()
            .to(concat, 'b')
            .to(concat, 'c')
            .send('a'),
    ).toBe('abc');
  });

  it('pipes can be nested', () => {
    expect(
        Pipe.from<string>()
            .to(concat, 'b')
            .to(Pipe.from<string>()
                .to(concat, 'c')
                .to(Pipe.from<string>()
                    .to(concat, 'd')
                    .to(concat, 'e'),
                )
                .to(concat, 'f'),
            )
            .to(concat, 'g')
            .send('a'),
    ).toBe('abcdefg');
  });

  it('piped value can be directed to another argument position with pipe placeholder', () => {
    expect(
        Pipe.from<string>()
            .to(
                (a1: number, a2: string) => `_${a1}_${a2}_`,
                111,
                Pipe.any,
            )
            .send('a'),
    ).toBe('_111_a_');
  });

  it('piped value can be inserted multiple times via placeholder', () => {
    expect(
        Pipe.from<string>()
            .to(
                (a1: number, a2: string, a3: number, a4: string) => `_${a1}_${a2}_${a3}_${a4}_`,
                111,
                Pipe.any,
                222,
                Pipe.any,
            )
            .send('a'),
    ).toBe('_111_a_222_a_');
  });

  it('piped value can be piped before becoming an argument', () => {
    expect(
        Pipe.from(
            (a1: number, a2: string, a3: number, a4: string) => `_${a1}_${a2}_${a3}_${a4}_`,
            111,
            Pipe.from((v) => '++' + v),
            222,
            Pipe.from((v) => '--' + v),
        )
            .send('a'),
    ).toBe('_111_++a_222_--a_');
  });
});
