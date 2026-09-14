import { EnterFailed } from "./errors.js";

function parseSse(text) {
	const lines = text.split(/\r?\n/);
	const payloads = [];
	for (const line of lines) {
		if (line.startsWith("data:")) payloads.push(line.slice(5).trim());
	}
	if (payloads.length === 0) return JSON.parse(text);
	return JSON.parse(payloads[payloads.length - 1]);
}

export function createMcp(address) {
	let id = 0;
	let initialised = false;

	async function call(method, params) {
		const body = { jsonrpc: "2.0", id: ++id, method };
		if (params !== undefined) body.params = params;

		let res;
		try {
			res = await fetch(address, {
				method: "POST",
				headers: {
					"content-type": "application/json",
					accept: "application/json, text/event-stream",
				},
				body: JSON.stringify(body),
			});
		} catch (err) {
			throw new EnterFailed(`could not reach ${address}: ${err.message}`);
		}

		const text = await res.text();
		if (!res.ok) {
			const error = new Error(`MCP ${method} → HTTP ${res.status}: ${text.slice(0, 300)}`);
			error.status = res.status;
			error.body = text;
			throw error;
		}

		let payload;
		try {
			payload = parseSse(text);
		} catch {
			throw new EnterFailed(`not a Living Memory space: ${address}`);
		}
		if (payload.error) {
			const error = new Error(
				`MCP ${method} → ${payload.error.code}: ${payload.error.message}`,
			);
			error.code = payload.error.code;
			throw error;
		}
		return payload.result;
	}

	async function init() {
		if (initialised) return;
		await call("initialize", {
			protocolVersion: "2025-06-18",
			capabilities: {},
			clientInfo: { name: "living-memory", version: "0.1.0" },
		});
		initialised = true;
	}

	async function tool(name, args) {
		await init();
		const result = await call("tools/call", { name, arguments: args });
		const text = (result?.content ?? [])
			.filter((c) => c.type === "text")
			.map((c) => c.text)
			.join("\n");
		return { text, structured: result?.structuredContent, isError: result?.isError === true };
	}

	async function listTools() {
		await init();
		const result = await call("tools/list");
		return result?.tools ?? [];
	}

	return { call, init, tool, listTools };
}
