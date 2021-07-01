type Async<T> = Promise<T> | T;

type Pipes<I, A extends Array<unknown>> = {
  [K in keyof A]: Pipe<I, A[K]>;
};

type AsyncPipes<I, A extends Array<unknown>> = {
  [K in keyof A]: Pipe<I, Async<A[K]>>;
};

type AsyncArgs<A extends Array<unknown>> = {
  [K in keyof A]: Async<A[K]>;
};

type PipedArgs<I, A extends Array<unknown>> = {
  [K in keyof A]: Pipe<I, A[K]> | A[K];
};

type AsyncPipedArgs<I, A extends Array<unknown>> = {
  [K in keyof A]: Pipe<I, Async<A[K]>> | Async<A[K]>;
};

export class Pipe<I, O> {

  /**
   * The identity pipe that takes any argument and returns it as is.
   */
  public static any = Pipe.to((value: any) => value);

  /**
   * Create the pipe that consumes a value of the given type and returns it as is.
   *
   * @see Pipe.any
   */
  public static to<I>(): Pipe<I, I>;

  /**
   * Create the pipe that maps value with a callback. Value would be provided as a first argument while other arguments
   * may be populated from rest arguments of this method.
   */
  public static to<I, O, A extends Array<unknown> = []>(cb: (value: I, ...args: A) => O, ...args: A): Pipe<I, O>;

  /**
   * Create the pipe that maps value with a callback. Value would be provided as a first argument while other arguments
   * may be populated from rest arguments of this method.
   */
  public static to<I, O, A extends Array<unknown> = []>(cb: (value: I, ...args: A) => Async<O>, ...args: AsyncArgs<A>): Pipe<I, Promise<O>>;

  /**
   * Create the pipe that maps value with callback. Value would be provided to pipes that are declared as varargs of
   * this method and then sent to the arguments of the callback at the same positions.
   */
  public static to<I, O, A extends Array<unknown> = []>(cb: (...args: A) => O, ...args: PipedArgs<I, A>): Pipe<I, O>;

  /**
   * Create the pipe that maps value with callback. Value would be provided to pipes that are declared as varargs of
   * this method and then sent to the arguments of the callback at the same positions.
   */
  public static to<I, O, A extends Array<unknown> = []>(cb: (...args: A) => Async<O>, ...args: AsyncPipedArgs<I, A>): Pipe<I, Promise<O>>;

  public static to<I, O>(cb?: (...args: Array<unknown>) => O, ...args: Array<unknown>) {
    if (!cb) {
      return Pipe.any;
    }

    return new Pipe<I, Async<O>>((value) => {
      const argCount = args.length;

      if (argCount === 0) {
        return cb(value);
      }

      let arr: Array<unknown> | undefined;
      let async = false;

      for (let i = 0; i < argCount; ++i) {
        const arg = args[i];

        let result = arg;

        if (arg instanceof Pipe) {

          arr ||= args.slice(0);

          if (arr[i] !== arg) {
            continue;
          }

          result = arr[i] = arg.send(value);

          for (let j = i + 1; j < argCount; ++j) {
            if (args[j] === arg) {
              arr[j] = result;
            }
          }
        }

        async ||= result instanceof Promise;
      }

      arr ||= [value, ...args];

      if (async) {
        return Promise.all(arr).then((a) => cb(...a));
      }
      return cb(...arr);
    });
  }

  public static fanOut<I, R extends Array<unknown>>(...pipes: Pipes<I, R>): Pipe<I, R>;

  public static fanOut<I, R extends Array<unknown>>(...pipes: AsyncPipes<I, R>): Pipe<I, Promise<R>>;

  public static fanOut<I, R extends Array<unknown>>(...pipes: Pipes<I, R>) {
    return new Pipe<I, Async<R>>((value) => {

      const arr = pipes.map((pipe) => pipe.send(value));

      if (arr.some((value) => value instanceof Promise)) {
        return Promise.all(arr) as Promise<R>;
      }
      return arr as R;
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
  public to<R, A extends Array<unknown> = []>(cb: (value: O, ...args: A) => R, ...args: A): Pipe<I, R>;

  /**
   * Redirect output to a callback which accepts output of this pipe as a first argument and may accept an arbitrary
   * number of other arguments.
   */
  public to<R, A extends Array<unknown> = []>(cb: (value: O, ...args: A) => Async<R>, ...args: AsyncArgs<A>): Pipe<I, Promise<R>>;

  /**
   * Redirect output to a callback with an arbitrary set of arguments. Some of the arguments may be defined as pipes,
   * in this case those pipes receive an output of this pipe as a value and their output is passed to callback as
   * arguments.
   */
  public to<R, A extends Array<unknown> = []>(cb: (...args: A) => R, ...args: PipedArgs<O, A>): Pipe<I, R>;

  /**
   * Redirect output to a callback with an arbitrary set of arguments. Some of the arguments may be defined as pipes,
   * in this case those pipes receive an output of this pipe as a value and their output is passed to callback as
   * arguments.
   */
  public to<R, A extends Array<unknown> = []>(cb: (...args: A) => Async<R>, ...args: AsyncPipedArgs<O, A>): Pipe<I, Promise<R>>;

  public to<R>(cb: ((...args: Array<any>) => R) | Pipe<O, R>, ...args: Array<unknown>): Pipe<I, R> {
    let pipe: Pipe<O, R>;
    if (cb instanceof Pipe) {
      pipe = cb;
    } else {
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
