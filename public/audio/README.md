# Cosmos Atlas — ambient audio tracks

All tracks in this folder are sourced from **Pixabay Music**
(https://pixabay.com/music/) and are released under Pixabay's free-to-use
license: free for commercial use, no attribution required, no royalty.

License summary: https://pixabay.com/service/license-summary/

## Track list (current shipping bundle)

| File | Original Pixabay slug |
|---|---|
| `serenity-celestial-soundscapes.mp3` | lilliben — Cosmic Serenity (365183) |
| `tranquility.mp3`                    | metriko — Cosmic Tranquility (364767) |
| `study.mp3`                          | the_mountain — Cosmic Study (143288) |
| `voyage.mp3`                         | valentinalopezz — Cosmic Voyage (294451) |
| `dream.mp3`                          | avisionfx — Cosmic Dream (227578) |
| `journey.mp3`                        | breakzstudios — Cosmic Journey (165859) |
| `connection.mp3`                     | emand_edroff — Cosmic Connection (471909) |
| `unity.mp3`                          | christianbodhi — Cosmic Unity (1030) |
| `universe-cosmic-planet-galaxy-music.mp3` | starostin — Universe (258633) |
| `heart-activation-nebula-burst.mp3`  | templeoffrequencies — Cosmic Heart Activation (450591) |
| `chant-om-chanting.mp3`              | ribhavagrawal — Cosmic Chant Om Chanting (268329, transcoded to 96k stereo to fit CF Pages 25 MB per-file ceiling) |

## Adding a new track

1. Download from https://pixabay.com/music/ (verify license at the top of the page — should say *"Free for use under the Pixabay Content License"*).
2. Drop the MP3 in this folder. If the file is > 25 MB, re-encode at a lower bitrate (Cloudflare Pages caps single files at 25 MiB):
   ```sh
   ffmpeg -i input.mp3 -b:a 96k -ac 2 -ar 44100 output.mp3
   ```
3. Add the track to the `TRACKS` array in `src/scripts/cosmos.ts` (search for `Track manifest`).
4. Bump `<span id="ambient-track-count">11</span>` in `src/pages/index.astro` to match the new count.
5. Run `npm run deploy` and verify in the live audit that the player still loads.

## Licensing notes

- ✓ Free for commercial use
- ✓ No attribution required
- ✓ Modifications allowed (re-encoding, looping, trimming)
- ✗ Cannot resell the raw track files as standalone music
- ✗ Cannot use to train ML models without separate consent

If a track ever gets removed from Pixabay, the local file remains valid under
the license at the time of download — but new downloads of the same upload may
not be available. Keep the file slugs and dates in this README current.
