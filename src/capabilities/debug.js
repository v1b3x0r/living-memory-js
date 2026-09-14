const LIMIT = 100;

function defaultSink(event) {
	console.error("[living-memory]", event.op, event);
}

function resolveSink(option) {
	if (option === true) return defaultSink;
	if (typeof option === "function") return option;
	if (option == null && process.env.LIVING_MEMORY_DEBUG) return defaultSink;
	return null;
}

export function createDebug(option) {
	const events = [];
	const sink = resolveSink(option);

	function record(event) {
		const entry = { t: Date.now(), ...event };
		events.push(entry);
		if (events.length > LIMIT) events.shift();
		if (sink) sink(entry);
	}

	return {
		record,
		view: {
			get events() {
				return events.slice();
			},
		},
	};
}
