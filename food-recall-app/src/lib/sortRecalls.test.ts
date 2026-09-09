import { describe, expect, it } from "vitest";
import { sortRecallsByDate } from "./sortRecalls";

const item = (id: string, recallInitiationDate: string) => ({ id, recallInitiationDate });

describe("sortRecallsByDate", () => {
  const unsorted = [item("mid", "20230115"), item("old", "20200101"), item("new", "20260320")];

  it("defaults to newest-first", () => {
    expect(sortRecallsByDate(unsorted).map((r) => r.id)).toEqual(["new", "mid", "old"]);
  });

  it("sorts newest-first when direction is newest", () => {
    expect(sortRecallsByDate(unsorted, "newest").map((r) => r.id)).toEqual(["new", "mid", "old"]);
  });

  it("sorts oldest-first when direction is oldest", () => {
    expect(sortRecallsByDate(unsorted, "oldest").map((r) => r.id)).toEqual(["old", "mid", "new"]);
  });

  it("does not mutate the input array", () => {
    const copy = [...unsorted];
    sortRecallsByDate(unsorted, "oldest");
    expect(unsorted).toEqual(copy);
  });

  it("keeps equal dates in original order", () => {
    const tied = [item("a", "20260101"), item("b", "20260101")];
    expect(sortRecallsByDate(tied, "newest").map((r) => r.id)).toEqual(["a", "b"]);
    expect(sortRecallsByDate(tied, "oldest").map((r) => r.id)).toEqual(["a", "b"]);
  });

  it("places empty dates first when oldest, last when newest", () => {
    const withEmpty = [item("dated", "20260101"), item("empty", "")];
    expect(sortRecallsByDate(withEmpty, "newest").map((r) => r.id)).toEqual(["dated", "empty"]);
    expect(sortRecallsByDate(withEmpty, "oldest").map((r) => r.id)).toEqual(["empty", "dated"]);
  });
});
