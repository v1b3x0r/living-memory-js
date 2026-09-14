export const ENTER_FAILED = "ENTER_FAILED";
export const MEMORY_TOO_LARGE = "MEMORY_TOO_LARGE";
export const ROOM_FULL = "ROOM_FULL";
export const REQUEST_FAILED = "REQUEST_FAILED";

export class SpaceError extends Error {
	constructor(code, message, options = {}) {
		super(message, { cause: options.cause });
		this.name = "SpaceError";
		this.code = code;
		if (options.debug) this.debug = options.debug;
	}
}

export function isTooLarge(text) {
	return /too large|65536|64\s*ki?b|payload/i.test(text ?? "");
}

export function isFull(text) {
	if (isTooLarge(text)) return false;
	return /ROOM_FULL|world is full|space is full|room is full|will not take/i.test(
		text ?? "",
	);
}

export function publicMessage(code) {
	switch (code) {
		case ENTER_FAILED:
			return "could not enter this space";
		case MEMORY_TOO_LARGE:
			return "this memory is too large for the space";
		case ROOM_FULL:
			return "this space will not take another memory";
		default:
			return "the space did not complete the request";
	}
}

export function classifyWrite(err, result) {
	const text = [err?.message, err?.body, result?.text].filter(Boolean).join(" ");
	if (isTooLarge(text)) return MEMORY_TOO_LARGE;
	if (isFull(text)) return ROOM_FULL;
	return REQUEST_FAILED;
}
