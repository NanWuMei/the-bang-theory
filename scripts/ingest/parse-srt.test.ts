import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseSrt, parseSrtTimestamp } from "./parse-srt";

describe("parseSrtTimestamp", () => {
  it("parses standard SRT timestamp", () => {
    assert.equal(parseSrtTimestamp("00:01:02,500"), 62_500);
  });
});

describe("parseSrt", () => {
  it("parses a minimal SRT block", () => {
    const srt = `1
00:00:01,300 --> 00:00:05,290
Hello world

2
00:00:05,470 --> 00:00:07,990
Second line
`;
    const cues = parseSrt(srt);
    assert.equal(cues.length, 2);
    assert.equal(cues[0].text, "Hello world");
    assert.equal(cues[0].startMs, 1_300);
    assert.equal(cues[1].endMs, 7_990);
  });

  it("strips HTML tags", () => {
    const srt = `1
00:00:01,000 --> 00:00:02,000
<i>Italic</i> text
`;
    assert.equal(parseSrt(srt)[0].text, "Italic text");
  });
});
