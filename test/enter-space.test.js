import { test } from "node:test";
import assert from "node:assert/strict";
import { enterSpace, EnterFailed, RoomFull } from "../src/index.js";

function sse(result) {
	return `event: message\ndata: ${JSON.stringify({ jsonrpc: "2.0", id: 1, result })}\n\n`;
}

function jsonRpcError(message) {
	return `event: message\ndata: ${JSON.stringify({ jsonrpc: "2.0", id: 1, error: { code: -32000, message } })}\n\n`;
}

const roomTools = {
	tools: [
		{ name: "memory_add" },
		{ name: "memory_search" },
		{ name: "memory_state" },
	],
};

const worldTools = {
	tools: [
		{ name: "memory_add" },
		{ name: "memory_search" },
		{ name: "world_list" },
	],
};

function mockFetch(handler) {
	const original = globalThis.fetch;
	globalThis.fetch = handler;
	return () => {
		globalThis.fetch = original;
	};
}

function byMethod(replies) {
	return async (url, init) => {
		const body = JSON.parse(init.body);
		const reply = replies[body.method];
		if (!reply) throw new Error(`unexpected method ${body.method}`);
		if (typeof reply === "function") return reply(body);
		return reply;
	};
}

function ok(result) {
	return new Response(sse(result), { status: 200 });
}

test("rejects a missing address at the door", async () => {
	await assert.rejects(() => enterSpace(""), EnterFailed);
	await assert.rejects(() => enterSpace("not-a-url"), EnterFailed);
});

test("fails at the door when the address is dead", async () => {
	const restore = mockFetch(async () => {
		throw new Error("fetch failed");
	});
	try {
		await assert.rejects(
			() => enterSpace("https://example.test/mcp"),
			(err) => err instanceof EnterFailed && /could not reach/.test(err.message),
		);
	} finally {
		restore();
	}
});

test("fails at the door when it is not a Living Memory space", async () => {
	const restore = mockFetch(
		byMethod({
			initialize: ok({ protocolVersion: "2025-06-18", serverInfo: { name: "other" } }),
			"tools/list": ok({ tools: [{ name: "weather" }] }),
		}),
	);
	try {
		await assert.rejects(() => enterSpace("https://example.test/mcp"), EnterFailed);
	} finally {
		restore();
	}
});

test("enters a room and remembers then searches", async () => {
	const restore = mockFetch(
		byMethod({
			initialize: ok({ protocolVersion: "2025-06-18", serverInfo: { name: "living-memory" } }),
			"tools/list": ok(roomTools),
			"tools/call": (body) => {
				const name = body.params.name;
				if (name === "memory_add") {
					return ok({ content: [{ type: "text", text: "remembered" }] });
				}
				if (name === "memory_search") {
					return ok({
						content: [
							{
								type: "text",
								text: "• Customer prefers morning appointments.\n• Closed Mondays.",
							},
						],
					});
				}
				throw new Error(name);
			},
		}),
	);
	try {
		const room = await enterSpace("https://example.test/t/abc/mcp");
		assert.equal(room.kind, null);
		assert.equal(room.address, "https://example.test/t/abc/mcp");
		await room.remember("Customer prefers morning appointments.");
		const found = await room.search("appointment preferences");
		assert.equal(found.length, 2);
		assert.equal(found[0].text, "Customer prefers morning appointments.");
	} finally {
		restore();
	}
});

test("does not grow handoff just because the server lists it", async () => {
	const restore = mockFetch(
		byMethod({
			initialize: ok({ protocolVersion: "2025-06-18" }),
			"tools/list": ok(worldTools),
		}),
	);
	try {
		const space = await enterSpace("https://example.test/mcp");
		assert.equal(typeof space.remember, "function");
		assert.equal(space.handoff, undefined);
		assert.equal(space.kind, null);
	} finally {
		restore();
	}
});

test("a full room is enterable; remember throws RoomFull", async () => {
	const restore = mockFetch(
		byMethod({
			initialize: ok({ protocolVersion: "2025-06-18" }),
			"tools/list": ok(roomTools),
			"tools/call": () =>
				new Response(jsonRpcError("ROOM_FULL"), { status: 200 }),
		}),
	);
	try {
		const room = await enterSpace("https://example.test/t/full/mcp");
		assert.equal(room.kind, null);
		await assert.rejects(() => room.remember("one more thing"), RoomFull);
	} finally {
		restore();
	}
});
