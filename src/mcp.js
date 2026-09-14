function parseSse(text) {
	const lines = text.split(/\r?\n/);
	const payloads = [];
	for (const line of lines) {
		if (line.startsWith("data:")) payloads.push(line.slice(5).trim());
	}
	if (payloads.length === 0) return JSON.parse(text);
	return JSON.parse(payloads[payloads.length - 1]);
}

/** Wire failure. Not a public error — enter/remember/search map it. */
export class TransportError extends Error {
	constructor(message, extra = {}) {
		super(message);
		this.name = "TransportError";
		if (extra.status != null) this.status = extra.status;
		if (extra.body != null) this.body = extra.body;
		if (extra.rpcCode != null) this.rpcCode = extra.rpcCode;
	}
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
			throw new TransportError(err.message, { cause: err });
		}

		const text = await res.text();
		if (!res.ok) {
			throw new TransportError(text.slice(0, 300) || `HTTP ${res.status}`, {
				status: res.status,
				body: text,
			});
		}

		let payload;
		try {
			payload = parseSse(text);
		} catch {
			throw new TransportError("response was not a Living Memory space", { body: text });
		}
		if (payload.error) {
			throw new TransportError(payload.error.message || "request failed", {
				rpcCode: payload.error.code,
				body: payload.error.message,
			});
		}
		return payload.result;
	}

	async function init() {
		if (initialised) return;
		await call("initialize", {
			protocolVersion: "2025-06-18",
			capabilities: {},
			clientInfo: { name: "living-memory-js", version: "0.1.0" },
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
