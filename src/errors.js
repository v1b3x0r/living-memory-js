/** Could not cross the door. Dead, forbidden, or not a Living Memory space. */
export class EnterFailed extends Error {
	constructor(message, debug) {
		super(message);
		this.name = "EnterFailed";
		if (debug) this.debug = debug;
	}
}

/** You are inside, but the space will not take a new memory. */
export class RoomFull extends Error {
	constructor(message) {
		super(message);
		this.name = "RoomFull";
	}
}
