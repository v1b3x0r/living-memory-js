export interface DebugEvent {
	t: number;
	op: "enter" | "remember" | "search";
	ok: boolean;
	[key: string]: unknown;
}

export interface Debug {
	readonly events: DebugEvent[];
}

export class EnterFailed extends Error {
	name: "EnterFailed";
	debug?: Debug;
}

export class RoomFull extends Error {
	name: "RoomFull";
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
