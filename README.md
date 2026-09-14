# @nature-labs/living-memory-js

The JavaScript door into a hosted space. Not the engine. Not the stdio server.

```bash
npm i @nature-labs/living-memory-js
```

```js
import { enterSpace } from "@nature-labs/living-memory-js"

const room = await enterSpace(process.env.LIVING_MEMORY_URL)
await room.remember("Customer prefers morning appointments.")
const memories = await room.search("appointment preferences")
```

That is the whole path. An address, a door, then memory.

Do not add a second way to this page. MCP stays underneath.

<details>
<summary>When it breaks</summary>

`enterSpace` throws `EnterFailed` if the address is dead or not Living Memory. A full space is still enterable; `remember()` throws `RoomFull`. `room.kind` is reserved; v1 leaves it `null` rather than guess.

`room.debug.events` is this SDK watching the door, always there. Print with `{ debug: true }` or `LIVING_MEMORY_DEBUG=1`. If enter fails, events are on `error.debug.events`.

</details>
