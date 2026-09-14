/**
 * Two kinds of capability. Do not mix them.
 *
 * Client — always on the object this SDK returns. They describe the door,
 * not the place. `debug` is the first (and for v1, the only) one.
 *
 * Space — discovered after enter, omitted if the place does not have them.
 * Never a method that throws "Worlds only". v1 ships none (handoff later).
 *
 * `room.debug` is therefore not a claim that the space offers debugging.
 * It is this SDK watching itself.
 */

export { createDebug } from "./capabilities/debug.js";
