type PackPipes<I, R extends Array<unknown>> = {
  [K in keyof R]: Pipe<I, R[K]>;
};

type PackArgs<I, R extends Array<unknown>> = {
  [K in keyof R]: Pipe<I, R[K]> | R[K];
};

export class Pipe<I, O> {

  public static any = Pipe.from((value: any) => value);

  /**
   * Create the pipe that consumes a value of the given type and returns it as is.
   */
  public static from<I>(): Pipe<I, I>;

  /**
   * Create the pipe that maps value with a callback. Value would be provided as a first argument while other arguments
   * may be populated from rest arguments of this method.
   */
  public static from<I, O, A extends Array<unknown>>(cb: (value: I, ...args: A) => O, ...args: A): Pipe<I, O>;

  /**
   * Create the pipe that maps value with callback. Value would be provided to pipes that are declared as varargs of
   * this method and then sent to the arguments of the callback at the same positions.
   */
  public static from<I, O, A extends Array<unknown>>(cb: (...args: A) => O, ...args: PackArgs<I, A>): Pipe<I, O>;

  public static from<I, O>(cb?: (...args: Array<unknown>) => O, ...args: Array<unknown>): Pipe<I, O> {
    if (!cb) {
      return Pipe.any;
    }

    return new Pipe((value) => {
      const argCount = args.length;

      if (argCount === 0) {
        return cb(value);
      }

      let a: Array<unknown> | undefined;

      for (let i = 0; i < argCount; ++i) {
        const arg = args[i];

        if (arg instanceof Pipe) {

          a ||= args.slice(0);

          if (a[i] !== arg) {
            continue;
          }

          const result = a[i] = arg.send(value);

          for (let j = i + 1; j < argCount; ++j) {
            if (args[j] === arg) {
              a[j] = result;
            }
          }
        }
      }

      a ||= [value, ...args];

      return cb(...a);
    });
  }

  public static fanOut<I, R extends Array<unknown>>(...pipes: PackPipes<I, R>): Pipe<I, R> {
    return new Pipe((value) => pipes.map((pipe) => pipe.send(value)) as R);
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
  public to<R, A extends Array<unknown>>(cb: (value: O, ...args: A) => R, ...args: A): Pipe<I, R>;

  /**
   * Redirect output to a callback with an arbitrary set of arguments. Some of the arguments may be defined as pipes,
   * in this case those pipes receive an output of this pipe as a value and their output is passed to callback as
   * arguments.
   */
  public to<R, A extends Array<unknown>>(cb: (...args: A) => R, ...args: PackArgs<O, A>): Pipe<I, R>;

  public to<R>(cb: ((...args: Array<any>) => R) | Pipe<O, R>, ...args: Array<unknown>): Pipe<I, R> {
    let pipe: Pipe<O, R>;
    if (cb instanceof Pipe) {
      pipe = cb;
    } else {
      pipe = Pipe.from(cb, ...args);
    }
    return Pipe.from((value) => pipe.send(this.cb(value)));
  }

  /**
   * Send the value down the pipe.
   */
  public send(value: I): O {
    return this.cb(value);
  }
}
