const identity = <T>(arg: T): T => arg;

type UnfoldArgs<A extends Array<unknown>, I> = {
  [K in keyof A]: A[K] extends Pipe<I, infer O> ? O : A[K];
};

export class Pipe<I, O> {

  /**
   * Create pipe that consumes any value and doesn't change it.
   */
  public static any<I>(): Pipe<I, I> {
    return Pipe.to(identity);
  }

  /**
   * Create pipe that maps value with a callback. Value would be provided as a first argument while other arguments may
   * be populated from rest arguments of this method.
   */
  public static to<I, O, A extends Array<any>>(cb: (value: I, ...args: A) => O, ...args: A): Pipe<I, O>;

  /**
   * Create pipe that maps value with callback. Value would be provided to pipes that are declared as varargs of this
   * method and then sent to the arguments of the callback at the same positions.
   */
  public static to<I, O, A extends Array<any>>(cb: (...args: UnfoldArgs<A, I>) => O, ...args: A): Pipe<I, O>;

  public static to<I, O>(cb: (...args: Array<any>) => O, ...args: Array<any>): Pipe<I, O> {
    return new Pipe((value) => {
      const argCount = args.length;

      if (argCount === 0) {
        return cb(value);
      }

      let a: Array<any> | undefined;

      for (let i = 0; i < argCount; ++i) {
        if (args[i] instanceof Pipe) {
          if (a) {
            if (a[i] !== args[i]) {
              continue;
            }
          } else {
            a = args.slice(0);
          }

          a[i] = a[i].send(value);

          for (let j = i + 1; j < argCount; ++j) {
            if (args[j] === args[i]) {
              a[j] = a[i];
            }
          }
        }
      }

      if (!a) {
        a = [value].concat(args);
      }

      return cb(...a);
    });
  }

  /**
   * The callback invoked by this {@link Pipe} instance.
   */
  protected readonly cb: (value: I) => O;

  /**
   * Constructs the new {@link Pipe} instance.
   *
   * @param cb The callback that the pipe must invoke.
   */
  constructor(cb: (value: I) => O) {
    this.cb = cb;
  }

  /**
   * Redirect output of this pipe to another pipe.
   */
  public to<R>(pipe: Pipe<O, R>): Pipe<I, R>;

  /**
   * Redirect output to a callback which accepts output of this pipe as a first argument and may accept an arbitrary
   * number of other arguments.
   */
  public to<R, A extends Array<any>>(cb: (value: O, ...args: A) => R, ...args: A): Pipe<I, R>;

  /**
   * Redirect output to a callback with an arbitrary set of arguments. Some of the arguments may be defined as pipes,
   * in this case those pipes receive an output of this pipe as a value and their output is passed to callback as
   * arguments.
   */
  public to<R, A extends Array<any>>(cb: (...args: UnfoldArgs<A, O>) => R, ...args: A): Pipe<I, R>;

  public to<R>(cb: ((...args: Array<any>) => R) | Pipe<O, R>, ...args: Array<any>): Pipe<I, R> {
    let pipe: Pipe<O, R>;
    if (cb instanceof Pipe) {
      pipe = cb;
    } else {
      // const a: Parameters<typeof Pipe.to> = [cb];
      // a.push(...args);

      pipe = Pipe.to(cb, ...args);
    }
    return Pipe.to((value) => pipe.send(this.cb(value)));
  }

  /**
   * Send the value down the pipe.
   */
  public send(value: I): O {
    return this.cb(value);
  }
}
