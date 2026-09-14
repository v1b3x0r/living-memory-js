import { createDebug } from "./capabilities.js";
import { ENTER_FAILED, SpaceError, publicMessage } from "./errors.js";
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

function fail(debug, cause, extra = {}) {
	const message = publicMessage(ENTER_FAILED);
	debug.record({ op: "enter", ok: false, error: message, ...extra });
	throw new SpaceError(ENTER_FAILED, message, { cause, debug: debug.view });
}

export async function enterSpace(address, options = {}) {
	const debug = createDebug(options.debug);
	const started = Date.now();

	let url;
	try {
		url = asAddress(address);
	} catch (err) {
		fail(debug, err);
	}

	const mcp = createMcp(url);

	let tools;
	try {
		tools = await mcp.listTools();
	} catch (err) {
		fail(debug, err, { address: url });
	}

	const names = new Set(tools.map((t) => t.name));
	if (!names.has("memory_add") || !names.has("memory_search")) {
		fail(debug, new Error("not a Living Memory space"), { address: url });
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
