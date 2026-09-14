export interface DebugEvent {
	t: number;
	op: "enter" | "remember" | "search";
	ok: boolean;
	[key: string]: unknown;
}

export interface Debug {
	readonly events: DebugEvent[];
}

export type SpaceErrorCode =
	| "ENTER_FAILED"
	| "MEMORY_TOO_LARGE"
	| "ROOM_FULL"
	| "REQUEST_FAILED";

export class SpaceError extends Error {
	name: "SpaceError";
	code: SpaceErrorCode;
	cause?: unknown;
	debug?: Debug;
}

export type SpaceKind = "room" | "world" | null;

export interface Memory {
	text: string;
}

export interface Space {
	readonly address: string;
	readonly kind: SpaceKind;
	readonly name: string | null;
	readonly debug: Debug;
	remember(content: string): Promise<void>;
	search(query: string): Promise<Memory[]>;
}

export interface EnterSpaceOptions {
	/** Print debug events to stderr, or pass a sink. Always recorded on `space.debug`. */
	debug?: boolean | ((event: DebugEvent) => void);
}

export function enterSpace(address: string, options?: EnterSpaceOptions): Promise<Space>;
