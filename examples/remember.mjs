import { enterSpace } from "../src/index.js";

const url = process.env.LIVING_MEMORY_URL;
if (!url) {
	console.error("set LIVING_MEMORY_URL to a space address");
	process.exit(1);
}

const room = await enterSpace(url);
console.log(room.kind, room.address);

const note =
	process.argv.slice(2).join(" ") ||
	"The blue door on the left opens onto the rooftop.";
await room.remember(note);
const memories = await room.search(note);
for (const memory of memories) console.log("-", memory.text);
