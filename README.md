# pipe [![build](https://github.com/smikhalevski/pipe/actions/workflows/master.yml/badge.svg?branch=master&event=push)](https://github.com/smikhalevski/pipe/actions/workflows/master.yml)

The callback piping utility.

```ts
import Pipe from '@smikhalevski/pipe';

const pipe = Pipe
    .to<string>()
    .to((value) => value + '!')
    .to((value) => 'Hello, ' + value)

pipe.send('Bob'); // → 'Hello, Bob!'
```

## Features

1. Pipe nesting

```ts
const pipe2 = Pipe
    .to(pipe)
    .to((value) => value + ' Have a good day!')

pipe2.send('Bob'); // → 'Hello, Bob! Have a good day!'
```

2. Argument redirection

```ts
const pipe = Pipe
    .to<string>()
    .to((days: number, value: string) => `${value}, I haven't seen you for ${days} days`,
        10,
        Pipe.any,
    );

pipe.send('Bob'); // → 'Bob, I haven\'t seen you for 10 days'
```

3. Piping arguments

```ts
const pipe = Pipe
    .to<string>()
    .to((product: string, value: string) => `${value} Did you buy ${product}?`,
        'apples',
        Pipe.to((value: string) => `Hello, ${value}!`),
    );

pipe.send('Bob'); // → 'Hello, Bob! Did you buy apples?'
```

4. Async first

Promises are always resolved before being passed as arguments to pipes.

```ts
const pipe = Pipe
    .to<string>()
    .to((product: string, value: string) => `${value} Did you buy ${product}?`,
        Promise.resolve('apples'),
        Pipe.to(async (value: string) => `Hello, ${value}!`),
    );

await pipe.send('Bob'); // → 'Hello, Bob! Did you buy apples?'
```

5. Fan out

Map an input argument using an array of pipes.

```ts
const pipe = Pipe
    .to<string>()
    .fanOut(
        Pipe.to((value: string) => parseInt(value, 10)),
        Pipe.to((value: string) => Promise.resolve(value + ' days')),
    );

await pipe.send('123'); // → [123, '123 days']
```
