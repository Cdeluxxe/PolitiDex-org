# Portrait sweep — one portrait per person, on the roster row

Written by `scripts/sweep-roster-portraits.mjs`. The roster field is `photo` on the person's
record: `CMP_DATA[pid].photo` in cmp-data.js (bundled), overlaid by the live Firestore
`PROFILES[pid].photo` where that document carries one. The card's old store was the
`BROWSE_PHOTOS` map in browse-photos.js, reached through `window._getPhotoUrl`.

## Counts

- Roster rows swept: 1120
- Card had a portrait, roster field empty — copied onto the field: 703
- Both had one and they differ — not picked, field left as it was: 0
- Roster had one, card had none — card now reads the field: 0
- Neither had one — the row's own mark stays: 417
- Map keys removed (their face now lives on a roster row): 703
- Map keys kept (no roster row can reach them): 12

## Disagreements

None in the bundled roster: no row carried a `photo` before this sweep, so no card
portrait could disagree with one. The live Firestore layer is not in this repository and
was not swept; where it carries a `photo`, that value already outranks the bundled field on
every surface, as before. A disagreement found there belongs in this list.

## Map keys kept, and why

These keys have no roster row in cmp-data.js and no alias hop to one, so there is no roster
field to move their face onto. They stay in browse-photos.js as the only copy.

- `jpike` — https://insurance.utah.gov/wp-content/uploads/2026-Pike-200x300.jpg
- `rspendlove` — https://le.utah.gov/images/legislator/SPENDLR.jpg
- `janderegg` — https://le.utah.gov/images/legislator/ANDEREJ.jpg
- `sherrod_brown` — https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Sherrod_Brown_117th_Congress_(2).jpg/500px-Sherrod_Brown_117th_Congress_(2).jpg
- `roy_cooper` — https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/Roy_Cooper_in_November_2023_(cropped2).jpg/500px-Roy_Cooper_in_November_2023_(cropped2).jpg
- `michael_whatley` — https://upload.wikimedia.org/wikipedia/commons/thumb/b/b5/Michael_Whatley_(54670563614)_(cropped).jpg/500px-Michael_Whatley_(54670563614)_(cropped).jpg
- `james_talarico` — https://upload.wikimedia.org/wikipedia/commons/thumb/7/70/James_Talarico_Press_Conference_(cropped).jpg/500px-James_Talarico_Press_Conference_(cropped).jpg
- `christina_bohannan` — https://upload.wikimedia.org/wikipedia/commons/thumb/4/45/ChristinaBohannan.jpg/500px-ChristinaBohannan.jpg
- `laurie_buckhout` — https://upload.wikimedia.org/wikipedia/commons/thumb/e/e4/Laurie_Buckhout.jpg/500px-Laurie_Buckhout.jpg
- `paige_cognetti` — https://upload.wikimedia.org/wikipedia/commons/thumb/f/fd/Paige_Cognetti_(52165104986)_(3x4a).jpg/500px-Paige_Cognetti_(52165104986)_(3x4a).jpg
- `chris_jones` — https://upload.wikimedia.org/wikipedia/commons/thumb/9/95/Chris_Jones%2C_Arkansas_gubernatorial_candidate.jpg/500px-Chris_Jones%2C_Arkansas_gubernatorial_candidate.jpg
- `graham_platner` — https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/Platner_headshot.jpg/500px-Platner_headshot.jpg
