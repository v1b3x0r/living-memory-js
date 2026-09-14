/**
 * Public ontology of `living-memory`.
 *
 * Callers import from here — not from the files behind it.
 * Pattern: svelte-newbie-stores `user.ts` — factory stays private,
 * the object you get back is the thing you use.
 *
 * Constraint (2026-09-14): design until a small model can follow
 * the README without reasoning about MCP. Canonical path is three
 * words — enter, remember, search — in one place. Do not add a
 * second door. MCP stays underneath. debug/kind/errors are for
 * when it breaks, not vocabulary the happy path must learn.
 *
 *   import { enterSpace } from "@nature-labs/living-memory-js"
 *   const room = await enterSpace(url)
 */

export { enterSpace } from "./enter-space.js";
export { EnterFailed, RoomFull } from "./errors.js";
