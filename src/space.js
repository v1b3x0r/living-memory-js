import {
	REQUEST_FAILED,
	SpaceError,
	classifyWrite,
	publicMessage,
} from "./errors.js";

function memoriesFrom(text) {
	if (!text || !text.trim()) return [];
	const parts = text
		.split(/\n(?=• )/)
		.map((s) => s.replace(/^• /, "").trim())
		.filter(Boolean);
	return (parts.length ? parts : [text.trim()]).map((entry) => ({ text: entry }));
}

export function createSpace({ address, mcp, debug, name = null }) {
	// kind is discovered, never guessed. Live ONS rooms expose world_list and
	// handoff, so tool names are not a discriminator. v1 leaves it null.
	const kind = null;

	function fail(op, extra, err, result) {
		const code = classifyWrite(err, result);
		const error = new SpaceError(code, publicMessage(code), {
			cause: err ?? new Error(result?.text ?? "request failed"),
			debug: debug.view,
		});
		debug.record({ op, ok: false, error: error.code, ...extra });
		throw error;
	}

	async function remember(content) {
		if (typeof content !== "string" || !content.trim()) {
			throw new SpaceError(REQUEST_FAILED, publicMessage(REQUEST_FAILED), {
				cause: new Error("remember() needs a non-empty string"),
				debug: debug.view,
			});
		}
		const started = Date.now();
		const text = content.trim();
		let result;
		try {
			result = await mcp.tool("memory_add", { content: text });
		} catch (err) {
			fail("remember", { bytes: text.length, ms: Date.now() - started }, err);
		}
		if (result.isError) {
			fail("remember", { bytes: text.length, ms: Date.now() - started }, null, result);
		}
		debug.record({
			op: "remember",
			ok: true,
			bytes: text.length,
			ms: Date.now() - started,
		});
	}

	async function search(query) {
		if (typeof query !== "string" || !query.trim()) {
			throw new SpaceError(REQUEST_FAILED, publicMessage(REQUEST_FAILED), {
				cause: new Error("search() needs a non-empty string"),
				debug: debug.view,
			});
		}
		const started = Date.now();
		const q = query.trim();
		let result;
		try {
			result = await mcp.tool("memory_search", { query: q });
		} catch (err) {
			const error = new SpaceError(REQUEST_FAILED, publicMessage(REQUEST_FAILED), {
				cause: err,
				debug: debug.view,
			});
			debug.record({
				op: "search",
				ok: false,
				query: q,
				ms: Date.now() - started,
				error: error.code,
			});
			throw error;
		}
		if (result.isError) {
			const error = new SpaceError(REQUEST_FAILED, publicMessage(REQUEST_FAILED), {
				cause: new Error(result.text),
				debug: debug.view,
			});
			debug.record({
				op: "search",
				ok: false,
				query: q,
				ms: Date.now() - started,
				error: error.code,
			});
			throw error;
		}
		const memories = memoriesFrom(result.text);
		debug.record({
			op: "search",
			ok: true,
			query: q,
			hits: memories.length,
			ms: Date.now() - started,
		});
		return memories;
	}

	return {
		get address() {
			return address;
		},
		get kind() {
			return kind;
		},
		get name() {
			return name;
		},
		get debug() {
			return debug.view;
		},
		remember,
		search,
	};
}
