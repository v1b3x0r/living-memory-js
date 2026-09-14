import { createDebug } from "./capabilities.js";
import { EnterFailed } from "./errors.js";
import { createMcp } from "./mcp.js";
import { createSpace } from "./space.js";

function asAddress(address) {
	if (typeof address !== "string" || !address.trim()) {
		throw new Error("enterSpace() needs a space address");
	}
	const url = address.trim();
	try {
		new URL(url);
	} catch {
		throw new Error(`not an address: ${url}`);
	}
	return url;
}

function fail(debug, message, extra = {}) {
	debug.record({ op: "enter", ok: false, error: message, ...extra });
	throw new EnterFailed(message, debug.view);
}

export async function enterSpace(address, options = {}) {
	const debug = createDebug(options.debug);
	const started = Date.now();

	let url;
	try {
		url = asAddress(address);
	} catch (err) {
		fail(debug, err.message);
	}

	const mcp = createMcp(url);

	let tools;
	try {
		tools = await mcp.listTools();
	} catch (err) {
		fail(debug, err.message, { address: url });
	}

	const names = new Set(tools.map((t) => t.name));
	if (!names.has("memory_add") || !names.has("memory_search")) {
		fail(debug, `not a Living Memory space: ${url}`, { address: url });
	}

	const space = createSpace({ address: url, mcp, debug });
	debug.record({
		op: "enter",
		ok: true,
		address: url,
		kind: space.kind,
		ms: Date.now() - started,
	});
	return space;
}
