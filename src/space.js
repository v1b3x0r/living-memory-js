import { RoomFull } from "./errors.js";

function isFull(err, result) {
	if (result?.isError && /full/i.test(result.text ?? "")) return true;
	if (err?.status === 429) return true;
	if (err && /full|ROOM_FULL/i.test(err.message ?? "")) return true;
	return false;
}

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

	async function remember(content) {
		if (typeof content !== "string" || !content.trim()) {
			throw new Error("remember() needs a non-empty string");
		}
		const started = Date.now();
		const text = content.trim();
		let result;
		try {
			result = await mcp.tool("memory_add", { content: text });
		} catch (err) {
			debug.record({
				op: "remember",
				ok: false,
				bytes: text.length,
				ms: Date.now() - started,
				error: err.message,
			});
			if (isFull(err)) throw new RoomFull(err.message);
			throw err;
		}
		if (isFull(null, result)) {
			debug.record({
				op: "remember",
				ok: false,
				bytes: text.length,
				ms: Date.now() - started,
				error: result.text,
			});
			throw new RoomFull(result.text);
		}
		if (result.isError) {
			debug.record({
				op: "remember",
				ok: false,
				bytes: text.length,
				ms: Date.now() - started,
				error: result.text,
			});
			throw new Error(result.text);
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
			throw new Error("search() needs a non-empty string");
		}
		const started = Date.now();
		const q = query.trim();
		const result = await mcp.tool("memory_search", { query: q });
		if (result.isError) {
			debug.record({
				op: "search",
				ok: false,
				query: q,
				ms: Date.now() - started,
				error: result.text,
			});
			throw new Error(result.text);
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
