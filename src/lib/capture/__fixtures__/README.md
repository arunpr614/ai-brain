# YouTube capture test fixtures

Real responses captured 2026-05-11 for the video `jNQXAC9IVRw` ("Me at the
zoo" — first YouTube video, 19 s, permanently public). Used by
`src/lib/capture/youtube.test.ts` to run the extractor without network.

## Files

- `youtube-player-response.json` — InnerTube `/youtubei/v1/player` POST
  response. Contains `videoDetails.title/author/lengthSeconds` and
  `captions.playerCaptionsTracklistRenderer.captionTracks[].baseUrl`.
- `youtube-timedtext.xml` — timed-text XML fetched from `captionTracks[0].baseUrl`.
  Uses the current `<timedtext format="3">` shape with `<p t="ms" d="ms">`
  elements, NOT the legacy `<transcript><text start="s" dur="s">` shape.
  Milliseconds throughout.

## Regenerating the fixtures

If YouTube changes the response shape and unit tests need updating:

```bash
# 1. Capture fresh InnerTube player response
curl -s -X POST 'https://www.youtube.com/youtubei/v1/player' \
  -H 'content-type: application/json' \
  -d '{"videoId":"jNQXAC9IVRw","context":{"client":{"clientName":"ANDROID","clientVersion":"20.10.38","hl":"en","gl":"US"}}}' \
  > src/lib/capture/__fixtures__/youtube-player-response.json

# 2. Extract the first caption track's baseUrl and fetch the timedtext XML
node -e '
  const j = JSON.parse(require("fs").readFileSync("src/lib/capture/__fixtures__/youtube-player-response.json","utf8"));
  const url = j.captions.playerCaptionsTracklistRenderer.captionTracks[0].baseUrl;
  require("https").get(url, r => {
    let x = ""; r.on("data", c => x += c);
    r.on("end", () => {
      require("fs").writeFileSync("src/lib/capture/__fixtures__/youtube-timedtext.xml", x);
      console.log("saved", x.length, "bytes");
    });
  });
'
```

## Why this video

- **Short** (19 s, 6 caption segments) — fixtures stay small (~165 KB JSON, ~470 B XML)
- **Stable** — first YouTube video; unlikely to be deleted or go private
- **Has auto-captions** — exercises the happy path
- **English** — no language-negotiation edge cases

## Client context pin

The `ANDROID / 20.10.38` client context is the current workaround that keeps
public-video transcript access working from residential IPs. If YouTube starts
rejecting it, bump to a newer `clientVersion` (check any recent
`youtube-transcript` commit on GitHub for the current pin).
