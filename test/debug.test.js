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
	tools: [{ name: "memory_add" }, { name: "memory_search" }],
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

function liveRoom(callHandler) {
	return byMethod({
		initialize: ok({ protocolVersion: "2025-06-18" }),
		"tools/list": ok(roomTools),
		"tools/call": callHandler,
	});
}

test("debug is on the space even when quiet", async () => {
	const restore = mockFetch(
		liveRoom(() => ok({ content: [{ type: "text", text: "ok" }] })),
	);
	try {
		const room = await enterSpace("https://example.test/t/abc/mcp");
		assert.equal(room.handoff, undefined);
		assert.ok(Array.isArray(room.debug.events));
		assert.equal(room.debug.events[0].op, "enter");
		assert.equal(room.debug.events[0].ok, true);
	} finally {
		restore();
	}
});

test("remember and search append debug events", async () => {
	const restore = mockFetch(
		liveRoom((body) => {
			if (body.params.name === "memory_search") {
				return ok({ content: [{ type: "text", text: "• hello" }] });
			}
			return ok({ content: [{ type: "text", text: "ok" }] });
		}),
	);
	try {
		const room = await enterSpace("https://example.test/t/abc/mcp");
		await room.remember("hello");
		await room.search("hello");
		const ops = room.debug.events.map((e) => e.op);
		assert.deepEqual(ops, ["enter", "remember", "search"]);
		assert.equal(room.debug.events[2].hits, 1);
	} finally {
		restore();
	}
});

test("failed enter still carries debug events", async () => {
	await assert.rejects(
		() => enterSpace("not-a-url"),
		(err) =>
			err instanceof EnterFailed &&
			err.debug.events.length === 1 &&
			err.debug.events[0].ok === false &&
			err.debug.events[0].op === "enter",
	);
});

test("debug sink receives events when enabled", async () => {
	const seen = [];
	const restore = mockFetch(
		liveRoom(() => ok({ content: [{ type: "text", text: "ok" }] })),
	);
	try {
		const room = await enterSpace("https://example.test/t/abc/mcp", {
			debug: (event) => seen.push(event.op),
		});
		await room.remember("x");
		assert.deepEqual(seen, ["enter", "remember"]);
	} finally {
		restore();
	}
});

test("RoomFull is recorded as a failed remember", async () => {
	const restore = mockFetch(
		liveRoom(() => new Response(jsonRpcError("ROOM_FULL"), { status: 200 })),
	);
	try {
		const room = await enterSpace("https://example.test/t/full/mcp");
		await assert.rejects(() => room.remember("one more"), RoomFull);
		const last = room.debug.events.at(-1);
		assert.equal(last.op, "remember");
		assert.equal(last.ok, false);
	} finally {
		restore();
	}
});
