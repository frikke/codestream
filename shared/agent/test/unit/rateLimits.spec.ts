import { getKeyDatePart } from "../../src/rateLimits";

describe("getKeyDatePart", () => {
	it("should return correct time buckets with 5 seconds intervals", () => {
		const dateKey1 = getKeyDatePart(new Date("2023-01-21T01:00:02"), 5);
		expect(dateKey1).toBe("20230121T010000");
		const dateKey2 = getKeyDatePart(new Date("2023-01-21T01:00:04"), 5);
		expect(dateKey2).toBe("20230121T010000");
		const dateKey3 = getKeyDatePart(new Date("2023-01-21T01:00:05"), 5);
		expect(dateKey3).toBe("20230121T010005");
		const dateKey4 = getKeyDatePart(new Date("2023-01-21T01:00:08"), 5);
		expect(dateKey4).toBe("20230121T010005");
	});

	it("should return correct time buckets with 15 seconds intervals", () => {
		const dateKey1 = getKeyDatePart(new Date("2023-01-21T01:00:02"), 15);
		expect(dateKey1).toBe("20230121T010000");
		const dateKey2 = getKeyDatePart(new Date("2023-01-21T01:00:13"), 15);
		expect(dateKey2).toBe("20230121T010000");
		const dateKey3 = getKeyDatePart(new Date("2023-01-21T01:00:16"), 15);
		expect(dateKey3).toBe("20230121T010015");
		const dateKey4 = getKeyDatePart(new Date("2023-01-21T01:00:29"), 15);
		expect(dateKey4).toBe("20230121T010015");
	});
});
