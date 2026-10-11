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

<!-- live-sweep -->
## Second sweep — the live roster the first sweep did not open

The search dropdown's face came from `window._getPhotoUrl`, whose key hop (`_photoKeys`) walks
every alias of a pid through the live Firestore roster — the `politicians` collection,
published as `window.PROFILES`. A `photo` filed on an alias document reached search and no
other surface: `politicians/klisonbee` carries Karianne Lisonbee's portrait while her roster
row is `lisonbee_h14`, so search painted her face and `/p/lisonbee_h14` and `/district/ut-hd-14`,
which read `pdxPortrait` (no hop), painted 🏛.

Read 2026-10-04: 362 live documents (`name` and `photo` only, read-only; no image downloaded).

### Counts

- Roster rows swept: 1120
- Search had a portrait, roster field empty — copied onto the field: 22
- Both had one and they differ — not picked, field left as it was: 1
- Roster field had one, search reached nothing else: 778
- Neither had one — the row's own mark stays: 319

### Copied onto `CMP_DATA[pid].photo`

- `auxier_h4` — https://le.utah.gov/images/legislator/AUXIET.jpg
- `blouin_s13` — https://le.utah.gov/images/legislator/BLOUIN.jpg
- `bolinder_h68` — https://le.utah.gov/images/legislator/BOLINB.jpg
- `brammer_s21` — https://le.utah.gov/images/legislator/BRAMMB.jpg
- `carl_albrecht` — https://le.utah.gov/images/legislator/ALBRECR.jpg
- `cory_maloy_h52` — https://le.utah.gov/images/legislator/MALOYC.jpg
- `defay_h15` — https://le.utah.gov/images/legislator/DEFAYA.jpg
- `derek_brown_ut` — https://upload.wikimedia.org/wikipedia/commons/d/d2/Utah_Attorney_General_Derek_Brown_in_the_Gold_Room.png
- `eliason_h45` — https://le.utah.gov/images/legislator/ELIASS.jpg
- `fitisemanu_h30` — https://le.utah.gov/images/legislator/FITISJ.jpg
- `gricius_h50` — https://upload.wikimedia.org/wikipedia/commons/5/5d/Representative_Stephanie_Gricius.jpg
- `gwynn_h6` — https://le.utah.gov/images/legislator/GWYNNM.jpg
- `hall_h11` — https://le.utah.gov/images/legislator/HALLK.jpg
- `harper_s16` — https://le.utah.gov/images/legislator/HARPEWA.jpg
- `hollins_h24` — https://upload.wikimedia.org/wikipedia/commons/8/87/Sandra_Hollins%2C_2025-04-16%2C_Official_2025_Representative_Image.jpg
- `ivory_h39` — https://le.utah.gov/images/legislator/IVORYK.jpg
- `koford_h10` — https://le.utah.gov/images/legislator/KOFORJ.jpg
- `kohler_h59` — https://le.utah.gov/images/legislator/KOHLEM.jpg
- `lisonbee_h14` — https://le.utah.gov/images/legislator/LISONK.jpg
- `shelley_h66` — https://le.utah.gov/images/legislator/SHELLT.jpg
- `valpeterson_h56` — https://upload.wikimedia.org/wikipedia/commons/b/b4/Representative_Val_Peterson.jpg
- `whyte_h63` — https://upload.wikimedia.org/wikipedia/commons/7/72/Stephen_Whyte.jpg

### Disagreements

| pid | roster field (kept) | where the field answered from | search portrait (not applied) |
| --- | --- | --- | --- |
| teuscher_h44 | https://le.utah.gov/images/legislator/TEUSCHJ.jpg | cmp-data.js | https://le.utah.gov/images/legislator/TEUSCJ.jpg |

After the copy, the search row reads the roster field through `pdxPortrait` for every pid
with a roster row, the same reader the person file and the district board use, and keeps
`_getPhotoUrl` only for ids with no roster row (candidates the map still holds).
<!-- /live-sweep -->

<!-- person-photos-wave-1 -->
## Person photos, wave 1 — official .gov and .us portraits for the rows that painted the building

Searched 2026-10-10 for each of the 395 roster rows that had no portrait on either the roster field or the card map. A portrait was stored only when its image URL was seen verbatim on the person's own official page (or that page's data feed) and the image host ends in `.gov` or `.us`. A photo found only on a campaign site, a website-builder CDN (including a .gov image link that redirects to one), or an `.org` / `.net` / `.com` host was not stored, and the row keeps its building mark with the reason below. No URL was composed from a naming pattern.

### Counts

- Rows searched: 395
- Gained an official portrait: 281
- Kept the building: 114
- New trusted hosts (test-photo-coverage ALLOWED + netlify.toml remote_images): 120 (le.utah.gov was already trusted)

### Gained a portrait (`CMP_DATA[pid].photo`)

- `garlin_gilchrist` — Garlin Gilchrist, Lieutenant Governor — https://www.michigan.gov/whitmer/-/media/Project/Websites/Whitmer/Images/About/Lt-Governor-Bio/LtGovGilchrist2x.jpg?rev=6d920cba19434e53937e52e84f8f7389
- `austin_davis` — Austin Davis, Lieutenant Governor — https://www.pa.gov/content/dam/copapwp-pagov/en/ltgovernor/images/LG%20Portrait.png
- `peggy_flanagan` — Peggy Flanagan, Lieutenant Governor — https://mn.gov/governor/assets/flanagan-bio-thumbnail_tcm1055-653288.png
- `burt_jones` — Burt Jones, Lieutenant Governor — https://ltgov.georgia.gov/sites/ltgov.georgia.gov/files/styles/4_3_720px_x_540px_/public/2022-12/burt-jones.jpeg?h=62fa85c4&itok=C_OPPksG
- `delbert_hosemann` — Delbert Hosemann, Lieutenant Governor — https://ltgovhosemann.ms.gov/wp-content/uploads/2024/10/CDH-Headshot-6.20.22.jpg
- `matt_pinnell` — Matt Pinnell, Lieutenant Governor — https://oklahoma.gov/content/dam/ok/en/ltgov/images/photography/Official-LtGovMattPinnell.jpg
- `jim_tressel` — Jim Tressel, Lieutenant Governor — https://governor.ohio.gov/wps/wcm/connect/gov/4fe3a398-2d5f-44db-a595-7dd418ad975b/Jim+Tressel.jpg?MOD=AJPERES
- `marty_jackley` — Marty Jackley, State Attorney General — https://atg.sd.gov/img/AG_Marty_Jackley_0007a.jpg
- `jay_jones` — Jay Jones, State Attorney General — https://www.oag.state.va.us/images/Jones-headshot-20260320.jpg
- `wes_allen` — Wes Allen, Secretary of State — https://www.sos.alabama.gov/themes/custom/sos/images/Wes-Allen.png
- `matthew_platkin` — Matthew Platkin, State Attorney General — https://www.njoag.gov/wp-content/uploads/2024/03/Matthew-J-Platkin_8x10_2024-scaled.jpg
- `catherine_hanaway` — Catherine Hanaway, State Attorney General — https://ago.mo.gov/wp-content/uploads/Hanaway-Headshot-230x300.jpg
- `bridget_hill` — Bridget Hill, State Attorney General — https://www.wyocourts.gov/app/uploads/2025/01/Justice-Bridget-Hill-scaled-e1751407581719.jpg
- `russell_coleman` — Russell Coleman, State Attorney General — https://www.ag.ky.gov/about/SiteAssets/Pages/Attorney-General/Russell-Coleman-400x500.jpg
- `mike_hilgers` — Mike Hilgers, State Attorney General — https://ago.nebraska.gov/sites/default/files/NZ8_3491_0.jpg
- `john_formella` — John Formella, State Attorney General — https://www.doj.nh.gov/sites/g/files/ehbemt721/files/inline-images/ag-john-formella-300.jpg
- `jb_mccuskey` — JB McCuskey, State Attorney General — https://ago.wv.gov/sites/default/files/2025-09/AG%20McCuskey%20pic.jpeg
- `peter_neronha` — Peter Neronha, State Attorney General — https://riag.ri.gov/sites/g/files/xkgbur496/files/styles/max_1300x1300/public/2021-05/PFN.jpg?itok=E_Y1EHR2
- `charity_clark` — Charity Clark, State Attorney General — https://ago.vermont.gov/sites/ago/files/inline-images/Charity%20R%20Clark%20headshot.jpg
- `aaron_frey` — Aaron Frey, State Attorney General — https://www.maine.gov/ag/sites/maine.gov.ag/files/styles/max_1300x1300/public/images/frey%20for%20site%20sized.png.webp?itok=ek8FwnGn
- `anne_lopez` — Anne Lopez, State Attorney General — https://ag.hawaii.gov/wp-content/uploads/2025/08/AG-Anne-Lopez-scaled.jpg
- `steve_marshall` — Steve Marshall, State Attorney General — https://www.alabamaag.gov/wp-content/uploads/2023/04/Steve-Marshall-headshot.jpg
- `gentner_drummond` — Gentner Drummond, State Attorney General — https://oklahoma.gov/content/dam/ok/en/oag/images/staff/GD-Smile-Oct24.png
- `drew_wrigley` — Drew Wrigley, State Attorney General — https://attorneygeneral.nd.gov/wp-content/uploads/2023/02/Attorney-General-Wrigley.jpg
- `anthony_brown` — Anthony Brown, State Attorney General — https://oag.maryland.gov/our-office/PublishingImages/AttorneyGeneral.jpg
- `dan_rayfield` — Dan Rayfield, State Attorney General — https://www.doj.state.or.us/wp-content/uploads/2024/12/Rayfield_400x600x96_4-17x6-25.jpg
- `raul_torrez` — Raúl Torrez, State Attorney General — https://www.nm.gov/assets/www.nm.gov/wp-content/uploads/2023/02/Raul-Torrez.ag_.jpg
- `kathy_jennings` — Kathy Jennings, State Attorney General — https://attorneygeneral.delaware.gov/wp-content/themes/dosgic_AG_theme/img/ag-jennings-bio-photo.jpg
- `william_tong` — William Tong, State Attorney General — https://portal.ct.gov/-/media/ag/about-the-ag/agtong-headshot.png?rev=4a0632a1575241d28bb665b018292c1b&la=en&h=185&w=200&hash=967A32323799CA3E2102ABB9309E36C1
- `phil_weiser` — Phil Weiser, State Attorney General — https://coag.gov/app/uploads/2019/06/phil-weiser-pillars-copy.png
- `andrea_joy_campbell` — Andrea Joy Campbell, State Attorney General — https://www.mass.gov/files/2025-10/Shopper-AG_Campbell_157_0.jpg
- `todd_rokita` — Todd Rokita, State Attorney General — https://www.in.gov/attorneygeneral/images/ag-rokita.jpg
- `tim_griffin` — Tim Griffin, State Attorney General — https://historycms.house.gov/uploadedImages/People/Listing/G/G000567.jpg
- `austin_knudsen` — Austin Knudsen, State Attorney General — https://dojmt.gov/wp-content/uploads/2024/01/austin-knudsen.webp
- `alan_wilson` — Alan Wilson, State Attorney General — https://www.scag.gov/media/ie5nqrqm/about-meet.jpg
- `roger_armstrong_summit` — Roger Armstrong, Summit County Council — https://www.summitcountyutah.gov/ImageRepository/Document?documentId=25099
- `canice_harte_summit` — Canice Harte, Summit County Council (Chair) — https://www.summitcountyutah.gov/ImageRepository/Document?documentId=25096
- `paul_cozzens_iron` — Paul Cozzens, Iron County Commission — https://ironcountyut.gov/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Fpaul-cozzens.98ec8575.jpg&w=640&q=75
- `heidi_franco_heber` — Heidi Franco, Mayor, Heber City — https://www.heberut.gov/ImageRepository/Document?documentID=2177
- `rosie_rivera_slco` — Rosie Rivera, Salt Lake County Sheriff — https://www.saltlakecounty.gov/globalassets/1-site-files/sheriff/home/sheriff-rivera-slco2025-2140-web.jpg?&quality=90&rxy=0.5,0.5&width=160&height=175
- `karen_lang_wvc` — Karen Lang, Mayor, West Valley City — https://www.wvc-ut.gov/Images/Government/City%20Council/City%20Council%20Members/Mayor.jpg?t=202608181904420
- `lorin_palmer_herriman` — Lorin Palmer, Mayor, Herriman — https://www.herriman.gov/uploads/files/6029/large/Lorin-Palmer.jpg
- `aimee_winder_newton` — Aimee Winder Newton, Salt Lake County Council (Chair, District 3) — https://www.saltlakecounty.gov/globalassets/1-site-files/council/home/winder-newton-light-background-web-2.jpg?&quality=90&rxy=0.47%2c0.3&width=136&height=136
- `carlos_moreno` — Carlos Moreno, Salt Lake County Council (District 2) — https://www.saltlakecounty.gov/globalassets/1-site-files/council/home/moreno-light-background-web-2.jpg?&quality=90&rxy=0.48%2c0.39&width=136&height=136
- `laurie_stringham` — Laurie Stringham, Salt Lake County Council (At-Large A) — https://www.saltlakecounty.gov/globalassets/1-site-files/council/home/stringham-light-background.jpg?&quality=90&rxy=0.5%2c0.3&width=136&height=136
- `natalie_pinkney` — Natalie Pinkney, Salt Lake County Council (At-Large C) — https://www.saltlakecounty.gov/globalassets/1-site-files/council/home/pinkney-light-background.jpg?&quality=90&rxy=0.27%2c0.35&width=136&height=136
- `dramsey` — Dawn Ramsey, Mayor, South Jordan — https://www.sjc.utah.gov/ImageRepository/Document?documentID=5940
- `tamara_tran_kaysville` — Tamara Tran, Mayor, Kaysville — https://www.kaysville.gov/ImageRepository/Document?documentID=6792
- `tammy_pearson_beaver` — Tammy Pearson, Beaver County Commission — https://beaver.utah.gov/ImageRepository/Document?documentId=1532
- `scott_bartholomew_sanpete` — Scott Bartholomew, Sanpete County Commission (Chair) — https://www.sanpetecountyutah.gov/ImageRepository/Document?documentID=551
- `jim_cheney_sanpete` — Jim Cheney, Sanpete County Commission — https://www.sanpetecountyutah.gov/ImageRepository/Document?documentID=553
- `justin_seely_nephi` — Justin Seely, Mayor, Nephi — https://nephi.utah.gov/ImageRepository/Document?documentId=3890
- `gwen_brown_kane` — Gwen Brown, Kane County Commission (Chair) — https://kane.utah.gov/ImageRepository/Document?documentID=638
- `celeste_meyeres_kane` — Celeste Meyeres, Kane County Commission — https://kane.utah.gov/ImageRepository/Document?documentID=309
- `tracy_glover_kane` — Tracy Glover, Kane County Sheriff — https://kane.utah.gov/ImageRepository/Document?documentID=468
- `leland_pollock_garfield` — Leland Pollock, Garfield County Commission (Chair) — https://www.garfield.utah.gov/files/assets/garfieldcout/v/1/images/leland-f-pollock.jpg
- `david_tebbs_garfield` — David Tebbs, Garfield County Commission — https://www.garfield.utah.gov/files/assets/garfieldcout/v/1/images/david-b-tebbs.jpg
- `dale_stacey_rich` — Dale Stacey, Rich County Sheriff — https://www.richcounty.gov/wp-content/uploads/dale_stacey.jpg
- `sim_weston_rich` — Sim Weston, Rich County Commission — https://www.richcounty.gov/wp-content/uploads/sim-weston.jpg
- `bill_cox_rich` — Bill Cox, Rich County Commission — https://www.richcounty.gov/wp-content/uploads/bill_cox.jpg
- `matt_tippets_daggett` — Matt Tippets, Daggett County Commission (Chair) — https://www.daggettcounty.gov/ImageRepository/Document?documentID=10197
- `jack_lytle_daggett` — Jack Lytle, Daggett County Commission — https://www.daggettcounty.gov/ImageRepository/Document?documentID=10204
- `erik_bailey_daggett` — Erik Bailey, Daggett County Sheriff — https://www.daggettcounty.gov/ImageRepository/Document?documentID=10209
- `adam_snow_washco` — Adam Snow, Washington County Commission (Chair) — https://www.washco.utah.gov/wp-content/uploads/2021/10/adam-snow-232x300.jpg
- `victor_iverson_washco` — Victor Iverson, Washington County Commission (Seat B) — https://www.washco.utah.gov/wp-content/uploads/comm/images/hp/victor-iverson-232x300.jpg
- `gil_almquist_washco` — Gil Almquist, Washington County Commission — https://www.washco.utah.gov/wp-content/uploads/comm/images/hp/gil-almquist-232x300.jpg
- `kress_staheli_washcity` — Kress Staheli, Mayor, Washington City — https://washingtonutah.gov/council/2020photos/staheli.jpg
- `kevin_smith_ivins` — Kevin Smith, Mayor, Ivins — https://ivinsutah.gov/wp-content/uploads/2026/04/Ivinscitycouncil-3B-1-scaled.jpg
- `maresa_manzione_tooelecity` — Maresa Manzione, Mayor, Tooele City — https://www.tooelecity.gov/revize_photo_gallery/Services/Administration/Maresa%20Manzione.jpg?t=202602201024320
- `erik_rowland_wasatch` — Erik Rowland, Wasatch County Council (Chair) — https://www.wasatchcounty.gov/ImageRepository/Document?documentID=191
- `mark_nelson_wasatch` — Mark Nelson, Wasatch County Council — https://www.wasatchcounty.gov/ImageRepository/Document?documentID=193
- `luke_searle_wasatch` — Luke Searle, Wasatch County Council (Vice Chair) — https://www.wasatchcounty.gov/ImageRepository/Document?documentID=189
- `craig_simons_midway` — Craig Simons, Mayor, Midway — https://www.midwaycityut.gov/wp-content/uploads/2026/06/craig-web-3-600x600.jpg
- `dirk_burton_wjordan` — Dirk Burton, Mayor, West Jordan — https://www.westjordan.utah.gov/wp-content/uploads/2024/02/DirkBurton-2024.jpg
- `troy_walker_draper` — Troy Walker, Mayor, Draper — https://www.draperutah.gov/media/phgliv0w/mayor-walker-4.jpg?width=400&height=400&v=1dd366ab0c1b120&format=webp
- `brett_hales_murray` — Brett Hales, Mayor, Murray — https://www.murray.utah.gov/ImageRepository/Document?documentID=15236
- `sarah_reale_usbe` — Sarah Reale, Utah State Board of Education (District 5) — https://schools.utah.gov/board/_board_/SarahReale.jpg
- `molly_hart_usbe` — Molly Hart, Utah State Superintendent of Public Instruction — https://schools.utah.gov/board/_board_/MollyHart.jpg
- `vance` — J.D. Vance, Vice President — https://www.whitehouse.gov/wp-content/uploads/2026/01/Vice-President-J.D.-Vance.jpg-1.jpg
- `duffy` — Sean Duffy, U.S. Secretary of Transportation — https://www.nasa.gov/wp-content/uploads/2025/07/54687553708-c531c9c2d5-o.jpg
- `jon_patterson` — Jon Patterson, State House Speaker — https://images.house.mo.gov/graphics/PattersonNew.jpg
- `ty_masterson` — Ty Masterson, State Senate President — https://www.kslegislature.gov/static/li_pics/sen_masterson_ty_1.jpg
- `nicholas_scutari` — Nicholas Scutari, State Senate President — https://pub.njleg.gov/publications/members/scutari_nicholas_2020_250.jpg
- `julie_mccluskie` — Julie McCluskie, State House Speaker — https://leg.colorado.gov/rails/active_storage/blobs/redirect/eyJfcmFpbHMiOnsibWVzc2FnZSI6IkJBaHBBeEpUQXc9PSIsImV4cCI6bnVsbCwicHVyIjoiYmxvYl9pZCJ9fQ==--876516c8bc7b672caf43f253b83440d18b6eba1a/McCluskie,%20Julie.jpg
- `rob_mccolley` — Rob McColley, State Senate President — https://www.ohiosenate.gov/assets/people/rob-mccolley/headshots/thumbnails/medium/rob-mccolley-march-2025-headshot_medium.jpg
- `bryan_hughes` — Bryan Hughes, State Senator — https://senate.texas.gov/members/d01/img/Hughes_86-0702D-030-web.jpg
- `winnie_brinks` — Winnie Brinks, State Senate Majority Leader — https://www.senate.michigan.gov/media/5jqbbfz3/brinks.png?v=1dbd6c3cf22e920
- `zohran_mamdani` — Zohran Mamdani, Mayor of New York City — https://www.nyc.gov/adobe/dynamicmedia/deliver/dm-aid--2c8489a5-e4eb-4ff5-8c50-00507eec5fc0/zohran-mamdani.jpg?quality=85&preferwebp=true
- `karen_bass` — Karen Bass, Mayor of Los Angeles — https://mayor.lacity.gov/sites/g/files/wph2066/files/styles/default/public/2023-05/041_20230402_3Z7_9938%20%281%29WEBSITE.jpeg.webp?itok=EGVPmJ60
- `brandon_johnson` — Brandon Johnson, Mayor of Chicago — https://www.chicago.gov/content/dam/city/depts/mayor/images/Mayor-Brandon-Johnson-Official-Headshot.jpg
- `john_whitmire` — John Whitmire, Mayor of Houston — https://www.houstontx.gov/mayor/images/whitmire250.jpg
- `daniel_lurie` — Daniel Lurie, Mayor of San Francisco — https://media.api.sf.gov/images/daniel_lurie_KeVK6TD.original.jpg
- `cherelle_parker` — Cherelle Parker, Mayor of Philadelphia — https://www.phila.gov/media/20231231160357/Cherelle-Parker-headshot-2.jpg
- `kate_gallego` — Kate Gallego, Mayor of Phoenix — https://www.phoenix.gov/adobe/dynamicmedia/deliver/dm-aid--01c5576d-eebd-4094-985d-e1f258c47d54/mayor-kate-gallego-cropped.jpg?preferwebp=true&quality=85
- `mattie_parker` — Mattie Parker, Mayor of Fort Worth — https://www.fortworthtexas.gov/files/assets/public/v/1/government/images/mayor-parker/mp-headshot.jpg?dimension=pageimage&w=480
- `eric_johnson_dallas` — Eric Johnson, Mayor of Dallas — https://lrl.texas.gov/scanned/members/photos/large/J/Johnson_E_86.jpg
- `jerome_powell` — Jerome Powell, Federal Reserve Chair — https://www.federalreserve.gov/aboutthefed/images/Powell_Jerome_Aug_16_22-674_8x10_rdax_130x162s.jpg
- `kelly_loeffler` — Kelly Loeffler, SBA Administrator — https://cdn.www.sba.gov/app/uploads/2026/05/01143043/kelly_loeffler-819x1024.jpg
- `andrew_ferguson` — Andrew Ferguson, FTC Chair — https://www.ftc.gov/system/files/styles/square_sm/private/ftc_gov/images/Commissioner-Andrew-N-Ferguson-headshot.jpg?h=fa4f33d7&itok=8yGU-ymX
- `peter_navarro` — Peter Navarro, Senior Counselor for Trade & Manufacturing — https://trumpwhitehouse.archives.gov/wp-content/uploads/2018/12/Navarro_Peter-620x620.jpg
- `mehmet_oz` — Mehmet Oz, CMS Administrator — https://www.cms.gov/sites/default/files/2025-04/droz-portrait-final-w-flag.jpg
- `scott_turner` — Scott Turner, U.S. Secretary of Housing & Urban Development — https://www.whitehouse.gov/wp-content/uploads/2026/02/Scott-Turner.jpeg
- `paul_atkins` — Paul Atkins, SEC Chair — https://www.sec.gov/files/styles/person_sidebar_1x/public/images/paul-atkins_0.jpg?itok=XgGcRvTw
- `chavez_deremer` — Lori Chavez-DeRemer, U.S. Secretary of Labor — https://historycms.house.gov/uploadedImages/People/Listing/C/C001135.jpg
- `doug_collins` — Doug Collins, U.S. Secretary of Veterans Affairs — https://www.whitehouse.gov/wp-content/uploads/2026/02/Doug-Collins.jpeg
- `mcmahon` — Linda McMahon, U.S. Secretary of Education — https://www.whitehouse.gov/wp-content/uploads/2026/02/Linda-McMahon.jpg
- `greer` — Jamieson Greer, U.S. Trade Representative — https://www.whitehouse.gov/wp-content/uploads/2026/02/Jamieson-Greer.jpg
- `patel` — Kash Patel, FBI Director — https://www.fbi.gov/image-repository/fbi-director-kash-patel-022525.jpg/@@images/image
- `ratcliffe` — John Ratcliffe, CIA Director — https://www.whitehouse.gov/wp-content/uploads/2026/02/John-Ratcliffe.jpeg?w=960
- `jpetro` — Joy Petro, Mayor, Layton City — https://www.laytoncityutah.gov/images/CityGov/JPetro.jpg
- `kgrover` — Keith Grover, Utah State Senator — https://le.utah.gov/images/legislator/GROVEK.jpg
- `kstratton` — Keven Stratton, Utah State Senator — https://le.utah.gov/images/legislator/STRATKJ.jpg
- `amillner` — Ann Millner, Utah State Senator — https://le.utah.gov/images/legislator/MILLNA.jpg
- `lisa_shepherd` — Lisa Shepherd, Utah State Representative — https://le.utah.gov/images/legislator/SHEPHL.jpg
- `jake_sawyer` — Jake Sawyer, Utah State Representative — https://le.utah.gov/images/legislator/SAWYEJ.jpg
- `lorene_kamalu` — Lorene Kamalu, Davis County Commissioner — https://www.daviscountyutah.gov/images/librariesprovider24/commissioner-portfolio/lorene-kamalu-2025.jpg?sfvrsn=42fefc53_2
- `john_crofts` — John Crofts, Davis County Commissioner — https://www.daviscountyutah.gov/images/librariesprovider24/commissioner-portfolio/john-crofts-2025.jpg?sfvrsn=5ffefc53_2
- `bob_stevenson` — Bob Stevenson, Davis County Commissioner — https://www.daviscountyutah.gov/images/librariesprovider24/commissioner-portfolio/bob-stevenson-2025.jpg?sfvrsn=40fefc53_1
- `kelly_sparks` — Kelly V. Sparks, Davis County Sheriff — https://www.daviscountyutah.gov/images/librariesprovider10/team-members/sparks_kelly04c7ca60-6791-4578-b745-409230052878.jpg?sfvrsn=56783953_3
- `emendenhall` — Erin Mendenhall, Mayor, Salt Lake City — https://www.slc.gov/mayor/wp-content/uploads/sites/51/2026/05/Mayor-E.-Mendenhall-682x1024.jpg
- `jwilson` — Jenny Wilson, Salt Lake County Mayor — https://www.saltlakecounty.gov/globalassets/1-site-files/mayor/home/jenny-wilson_-headshot_.jpg?&quality=90&rxy=0.5,0.5&width=160&height=175
- `mckell_s25` — Mike McKell, Utah State Senator — https://le.utah.gov/images/legislator/MCKELMK.jpg
- `snider_h5` — Casey Snider, Utah State Representative · House Majority Leader — https://le.utah.gov/images/legislator/SNIDEC.jpg
- `biden` — Joe Biden, 46th President — https://bidenwhitehouse.archives.gov/wp-content/uploads/2025/01/biden-profile-31.png
- `obama` — Barack Obama, 44th President — https://obamawhitehouse.archives.gov/sites/whitehouse.gov/files/images/Administration/People/president_official_portrait_hires.jpg
- `gwbush` — George W. Bush, 43rd President — https://georgewbush-whitehouse.archives.gov/news/releases/2003/04/images/20030414-3_portrait-682v.jpg
- `rfkjr` — Robert F. Kennedy Jr., HHS Secretary — https://www.hhs.gov/sites/default/files/bio-robert-kennedy.png
- `jdougall` — John Dougall, Former UT State Auditor — https://attorneygeneral.utah.gov/wp-content/uploads/2026/01/8D2A3195-edited-768x1152-1.jpg
- `limon_ca` — Monique Limón, California State Senator — https://www.senate.ca.gov/sites/senate.ca.gov/files/styles/large/public/media/sd21_limon_0.jpg?itok=q8Ds_VyS
- `wiener_ca` — Scott Wiener, California State Senator — https://www.senate.ca.gov/sites/senate.ca.gov/files/styles/large/public/media/WIENER%252C%2520SCOTT%2520%2528D-11%2529_9.jpg?itok=-AtzexBQ
- `bjones_ca` — Brian Jones, California State Senator — https://www.senate.ca.gov/sites/senate.ca.gov/files/styles/large/public/media/Brian%2520Jones%2520Headshot%2520%2528Main%2529_0_3.jpg?itok=P7SsCS8_
- `bettencourt_tx` — Paul Bettencourt, Texas State Senator — https://senate.texas.gov/members/d07/img/headshot.jpg
- `paxton_tx` — Angela Paxton, Texas State Senator — https://senate.texas.gov/members/d08/img/Paxton_2026.jpg
- `gutierrez_tx` — Roland Gutiérrez, Texas State Senator — https://senate.texas.gov/members/d19/img/Gutierrez_87-0522D-016-Web.jpg
- `gianaris_ny` — Michael Gianaris, New York State Senator — https://www.nysenate.gov/sites/default/files/52168793832_6b5abcf643_o_0.jpg
- `ortt_ny` — Rob Ortt, New York State Senator — https://www.nysenate.gov/sites/default/files/58378901_2516270608600655_6597000690696978432_o_1.jpg
- `pizzo_fl` — Jason Pizzo, Florida State Senator — https://www.flsenate.gov/PublishedContent/Senators/2024-2026/Photos/s37_5345.jpg
- `passidomo_fl` — Kathleen Passidomo, Florida State Senator — https://www.flsenate.gov/PublishedContent/Senators/2024-2026/Photos/s28_5196.jpg
- `joe_pittman` — Joe Pittman, Pennsylvania State Senator — https://www.palegis.us/resources/images/members/200/1870.jpg?20261001111034
- `doug_mastriano` — Doug Mastriano, Pennsylvania State Senator — https://www.palegis.us/resources/images/members/200/1869.jpg?20261001111034
- `sharif_street` — Sharif Street, Pennsylvania State Senator — https://www.palegis.us/resources/images/members/200/1767.jpg?20261001111034
- `kimberly_lightford` — Kimberly Lightford, Illinois State Senator — https://cdn.ilga.gov/assets/img/members/%7B7FBA8DB0-281E-406F-BF9F-ABEB75B7B38E%7D.jpg
- `john_curran_il` — John Curran, Illinois State Senator — https://cdn.ilga.gov/assets/img/members/%7B7FC724D0-C297-4D20-AC25-3D879DE286B8%7D.jpg
- `robert_peters_il` — Robert Peters, Illinois State Senator — https://cdn.ilga.gov/assets/img/members/%7B05AD9CBA-EA20-489D-9C33-3F39DC1F9B0C%7D.jpg
- `theresa_gavarone` — Theresa Gavarone, Ohio State Senator — https://www.ohiosenate.gov/assets/people/theresa-gavarone/headshots/thumbnails/medium/theresa-gavarone-march-2025-headshot_medium.jpg
- `nickie_antonio` — Nickie Antonio, Ohio State Senator — https://www.ohiosenate.gov/assets/people/nickie-j-antonio/headshots/thumbnails/medium/nickie-j-antonio-march-2025-headshot_medium.jpg
- `larry_walker_ga` — Larry Walker III, Georgia State Senator — https://www.legis.ga.gov/api/images/default-source/portraits/walker--iii-larry-4878.jpg
- `jason_anavitarte` — Jason Anavitarte, Georgia State Senator — https://www.legis.ga.gov/api/images/default-source/portraits/anavitarte-jason-4980.jpg
- `harold_jones_ga` — Harold Jones II, Georgia State Senator — https://www.legis.ga.gov/api/images/default-source/portraits/jones-ii-harold-851.jpg
- `michael_lee_nc` — Michael Lee, North Carolina State Senator — https://www.ncleg.gov/Members/MemberImage/S/387/Low
- `sydney_batch` — Sydney Batch, North Carolina State Senator — https://www.ncleg.gov/Members/MemberImage/S/434/Low
- `ralph_hise` — Ralph Hise, North Carolina State Senator — https://www.ncleg.gov/Members/MemberImage/S/298/Low
- `aric_nesbitt` — Aric Nesbitt, Michigan State Senator — https://senate.michigan.gov/media/rf5fkiul/nesbitt.png
- `jeremy_moss` — Jeremy Moss, Michigan State Senator — https://senate.michigan.gov/media/g2xdobl4/moss.png
- `mallory_mcmorrow` — Mallory McMorrow, Michigan State Senator — https://senate.michigan.gov/media/eeij4q4b/mcmorrow.png
- `teresa_ruiz` — Teresa Ruiz, New Jersey State Senator — https://pub.njleg.gov/publications/members/ruiz_teresa_2021_250.jpg
- `anthony_bucco` — Anthony Bucco, New Jersey State Senator — https://pub.njleg.gov/publications/members/bucco_anthony_m_2022_250.jpg
- `louise_lucas` — Louise Lucas, Virginia State Senator — https://apps.senate.virginia.gov/Senator/images/member_photos/Lucas18
- `scott_surovell` — Scott Surovell, Virginia State Senator — https://apps.senate.virginia.gov/Senator/images/member_photos/Surovell34
- `ryan_mcdougle` — Ryan McDougle, Virginia State Senator — https://apps.senate.virginia.gov/Senator/images/member_photos/McDougle26
- `priya_sundareshan` — Priya Sundareshan, Arizona State Senator — https://www.azleg.gov/alisImages/MemberPhotos/57leg/Senate/SUNDARESHAN.jpg
- `wendy_rogers` — Wendy Rogers, Arizona State Senator — https://www.azleg.gov/alisImages/MemberPhotos/57leg/Senate/ROGERS.jpg
- `jake_hoffman` — Jake Hoffman, Arizona State Senator — https://www.azleg.gov/alisImages/MemberPhotos/57leg/Senate/HOFFMAN.jpg
- `jamie_pedersen` — Jamie Pedersen, Washington State Senator — https://leg.wa.gov/memberphoto/12002.jpg
- `john_braun` — John Braun, Washington State Senator — https://leg.wa.gov/memberphoto/17289.jpg
- `manka_dhingra` — Manka Dhingra, Washington State Senator — https://leg.wa.gov/memberphoto/28022.jpg
- `cynthia_creem` — Cynthia Creem, Massachusetts State Senator — https://malegislature.gov/Legislators/Profile/70/CSC0.jpg
- `bruce_tarr` — Bruce Tarr, Massachusetts State Senator — https://malegislature.gov/Legislators/Profile/170/BET0.jpg
- `mary_felzkowski` — Mary Felzkowski, Wisconsin State Senator — https://docs.legis.wisconsin.gov/2025/legislators/senate/2809.jpg
- `devin_lemahieu` — Devin LeMahieu, Wisconsin State Senator — https://docs.legis.wisconsin.gov/2025/legislators/senate/2820.jpg
- `dianne_hesselbein` — Dianne Hesselbein, Wisconsin State Senator — https://docs.legis.wisconsin.gov/2025/legislators/senate/2811.jpg
- `bobby_joe_champion` — Bobby Joe Champion, Minnesota State Senator — https://www.lrl.mn.gov/legdb/MemberPhotos/ls94/thumbnails/59Champion.jpg
- `mark_johnson_mn` — Mark Johnson, Minnesota State Senator — https://www.lrl.mn.gov/legdb/MemberPhotos/ls94/thumbnails/01Johnson.jpg
- `robert_rodriguez_co` — Robert Rodriguez, Colorado State Senator — https://leg.colorado.gov/rails/active_storage/representations/redirect/eyJfcmFpbHMiOnsibWVzc2FnZSI6IkJBaHBBMDJ6QlE9PSIsImV4cCI6bnVsbCwicHVyIjoiYmxvYl9pZCJ9fQ==--d60046bf23e2e38d95ebde097cc62458903a14c7/eyJfcmFpbHMiOnsibWVzc2FnZSI6IkJBaDdCem9MWm05eWJXRjBTU0lJYW5CbkJqb0dSVlE2RkhKbGMybDZaVjkwYjE5c2FXMXBkRnNIYVFIWWFRSkVBUT09IiwiZXhwIjpudWxsLCJwdXIiOiJ2YXJpYXRpb24ifX0=--afd72eecb65edd9e6ff979c9b0ff7cdd603ed9e1/Rodriguez,Robert.jpg
- `cleave_simpson` — Cleave Simpson, Colorado State Senator — https://leg.colorado.gov/rails/active_storage/representations/redirect/eyJfcmFpbHMiOnsibWVzc2FnZSI6IkJBaHBBMU9ZQXc9PSIsImV4cCI6bnVsbCwicHVyIjoiYmxvYl9pZCJ9fQ==--5e851bcb5c35b80d9e4af6c6d2b6198d4f602087/eyJfcmFpbHMiOnsibWVzc2FnZSI6IkJBaDdCem9MWm05eWJXRjBTU0lJYW5CbkJqb0dSVlE2RkhKbGMybDZaVjkwYjE5c2FXMXBkRnNIYVFIWWFRSkVBUT09IiwiZXhwIjpudWxsLCJwdXIiOiJ2YXJpYXRpb24ifX0=--afd72eecb65edd9e6ff979c9b0ff7cdd603ed9e1/Simpson,%20Cleave.jpg
- `randy_mcnally` — Randy McNally, Tennessee State Senator — https://www.capitol.tn.gov/senate/members/images/ltgovmcnally.jpg
- `jack_johnson_tn` — Jack Johnson, Tennessee State Senator — https://www.capitol.tn.gov/senate/archives/112GA/members/images/s23.jpg
- `raumesh_akbari` — Raumesh Akbari, Tennessee State Senator — https://www.capitol.tn.gov/senate/archives/112GA/members/images/s29.jpg
- `cindy_olaughlin` — Cindy O'Laughlin, Missouri State Senator — https://www.senate.mo.gov/WebPhotos/SenatorPortraits/Olaughlin18.jpg
- `tony_luetkemeyer` — Tony Luetkemeyer, Missouri State Senator — https://www.senate.mo.gov/WebPhotos/SenatorPortraits/Luetkemeyer34.jpg
- `doug_beck` — Doug Beck, Missouri State Senator — https://www.senate.mo.gov/WebPhotos/SenatorPortraits/Beck01.jpg
- `nancy_king` — Nancy King, Maryland State Senator — https://mgaleg.maryland.gov/2026RS/images/king.jpg
- `steve_hershey` — Steve Hershey, Maryland State Senator — https://mgaleg.maryland.gov/2026RS/images/hershey.jpg
- `robin_titus` — Robin Titus, Nevada State Senator — https://www.leg.state.nv.us/Session/84th2027/legislators/Senators/Images/Titus.Robin.281.Thumb.jpg
- `marilyn_dondero_loop` — Marilyn Dondero Loop, Nevada State Senator — https://www.leg.state.nv.us/Session/84th2027/legislators/Senators/Images/DonderoLoop.Marilyn.92.Thumb.jpg
- `regina_birdsell` — Regina Birdsell, New Hampshire State Senator — https://gc.nh.gov/senate/images/senators/19.jpg
- `rebecca_perkins_kwoka` — Rebecca Perkins Kwoka, New Hampshire State Senator — https://gc.nh.gov/senate/images/senators/21.jpg
- `max_wise` — Max Wise, Kentucky State Senator — https://legislature.ky.gov/Legislator%20Head%20shots/senate116.jpg
- `gerald_neal` — Gerald Neal, Kentucky State Senator — https://legislature.ky.gov/Legislator%20Head%20shots/senate133.jpg
- `cameron_henry` — Cameron Henry, Louisiana State Senator — https://senate.la.gov/SenPics/Sen9.jpg
- `jeremy_stine` — Jeremy Stine, Louisiana State Senator — https://senate.la.gov/SenPics/Sen27.jpg
- `royce_duplessis` — Royce Duplessis, Louisiana State Senator — https://senate.la.gov/SenPics/Sen5.jpg
- `rob_wagner` — Rob Wagner, Oregon State Senator — https://sos.oregon.gov/blue-book/government/PublishingImages/senate/senator-wagner.jpg
- `kayse_jama` — Kayse Jama, Oregon State Senator — https://www.oregonlegislature.gov/jama/PublishingImages/member_photo.jpg
- `bruce_starr` — Bruce Starr, Oregon State Senator — https://www.oregonlegislature.gov/starr/PublishingImages/member_photo.jpg
- `thomas_alexander` — Thomas Alexander, South Carolina State Senator — https://www.scstatehouse.gov/images/members/0013636362.jpg
- `shane_massey` — Shane Massey, South Carolina State Senator — https://www.scstatehouse.gov/images/members/1185227131.jpg
- `margie_bright_matthews` — Margie Bright Matthews, South Carolina State Senator — https://www.scstatehouse.gov/images/members/0194318159.jpg
- `garlan_gudger` — Garlan Gudger, Alabama State Senator — https://alison.legislature.state.al.us/files/pdf/senate/members/Gudger_4.png
- `steve_livingston` — Steve Livingston, Alabama State Senator — https://alison.legislature.state.al.us/files/pdf/senate/members/Livingston_8.png
- `bobby_singleton` — Bobby Singleton, Alabama State Senator — https://alison.legislature.state.al.us/files/pdf/senate/members/Singleton_24.png
- `martin_looney` — Martin Looney, Connecticut State Senator — https://www.senatedems.ct.gov/wp-content/uploads/2023/09/Looney-2024-Headshot-scaled.jpg
- `bob_duff` — Bob Duff, Connecticut State Senator — https://www.senatedems.ct.gov/wp-content/uploads/2023/09/DuffHeadshot25-e1746538988445.png
- `cwilson` — Chris Wilson, UT State Senator — https://le.utah.gov/images/legislator/WILSOCH.jpg
- `john_johnson` — John Johnson, UT State Senator — https://le.utah.gov/images/legislator/JOHNSJD.jpg
- `jennifer_plumb` — Jennifer Plumb, UT State Senator — https://le.utah.gov/images/legislator/PLUMBJ.jpg
- `lincoln_fillmore` — Lincoln Fillmore, UT State Senator — https://le.utah.gov/images/legislator/FILLML.jpg
- `dhinkins` — David Hinkins, UT State Senator — https://le.utah.gov/images/legislator/HINKIDP.jpg
- `jennifer_dailey_provost` — Jennifer Dailey-Provost, Utah State Representative — https://le.utah.gov/images/legislator/DAILEJ.jpg
- `grant_miller` — Grant Miller, Utah State Representative — https://le.utah.gov/images/legislator/MILLGR.jpg
- `nicholeen_p_peck` — Nicholeen Peck, Utah State Representative — https://le.utah.gov/images/legislator/PECKNI.jpg
- `clinton_okerlund` — Clinton Okerlund, Utah State Representative — https://le.utah.gov/images/legislator/OKERLC.jpg
- `christine_watkins` — Christine Watkins, Utah State Representative — https://le.utah.gov/images/legislator/WATKICF.jpg
- `logan_monson` — Logan Monson, Utah State Representative — https://le.utah.gov/images/legislator/MONSOL.jpg
- `colin_w_jack` — Colin W. Jack, Utah State Representative — https://le.utah.gov/images/legislator/JACKC.jpg
- `walt_brooks` — Walt Brooks, Utah State Representative — https://le.utah.gov/images/legislator/BROOKW.jpg
- `hoang_nguyen` — Hoang Nguyen, Utah State Representative — https://le.utah.gov/images/legislator/NGUYEH.jpg
- `ashlee_matthews` — Ashlee Matthews, Utah State Representative — https://le.utah.gov/images/legislator/MATTHA.jpg
- `tracy_miller` — Tracy Miller, Utah State Representative — https://le.utah.gov/images/legislator/MILLET.jpg
- `jackie_larson` — Jackie Larson, Utah State Representative — https://le.utah.gov/images/legislator/LARSOJ.jpg
- `grant_pace` — Grant Pace, Utah State Representative — https://le.utah.gov/images/legislator/PACEG.jpg
- `verona_mauga` — Verona Mauga, Utah State Representative — https://le.utah.gov/images/legislator/MAUGAV.jpg
- `doug_owens` — Doug Owens, Utah State Representative — https://le.utah.gov/images/legislator/OWENSDO.jpg
- `carol_spackman_moss` — Carol Spackman Moss, Utah State Representative — https://le.utah.gov/images/legislator/MOSSCS.jpg
- `john_arthur` — John Arthur, Utah State Representative — https://le.utah.gov/images/legislator/ARTHUJ.jpg
- `calvin_roberts` — Calvin Roberts, Utah State Representative — https://le.utah.gov/images/legislator/ROBERC.jpg
- `candice_pierucci` — Candice Pierucci, Utah State Representative — https://le.utah.gov/images/legislator/PIERUC.jpg
- `leah_hansen` — Leah Hansen, Utah State Representative — https://le.utah.gov/images/legislator/LHANSEN.jpg
- `kay_christofferson` — Kay Christofferson, Utah State Representative — https://le.utah.gov/images/legislator/CHRISKJ.jpg
- `doug_welton` — Doug Welton, Utah State Representative — https://le.utah.gov/images/legislator/WELTOD.jpg
- `cmusselman` — Calvin Musselman, Utah State Senator — https://le.utah.gov/images/legislator/MUSSECR.jpg
- `emily_buss` — Emily Buss, Utah State Senator — https://le.utah.gov/images/legislator/BUSSEM.jpg
- `stephanie_pitcher` — Stephanie Pitcher, Utah State Senator — https://le.utah.gov/images/legislator/PITCHS.jpg
- `kathleen_riebe` — Kathleen Riebe, Utah State Senator — https://le.utah.gov/images/legislator/RIEBEK.jpg
- `heidi_balderree` — Heidi Balderree, Utah State Senator — https://le.utah.gov/images/legislator/BALDEH.jpg
- `jon_hawkins` — Jon Hawkins, Utah State Representative — https://le.utah.gov/images/legislator/HAWKIJ.jpg
- `mike_smith_sheriff` — Mike Smith, Utah County Sheriff — https://sheriff.utahcounty.gov/images/People/SheriffSmithHat.jpg
- `tyler_clancy` — Tyler Clancy, Utah State Homeless Coordinator · Former UT State Representative — https://jobs.utah.gov/homelessness/images/tclancy.jpg
- `thomas_peterson` — Thomas W. Peterson, Utah State Representative — https://le.utah.gov/images/legislator/PETERT.jpg
- `mike_petersen` — Michael J. Petersen, Utah State Representative — https://le.utah.gov/images/legislator/PETERM.jpg
- `jason_thompson` — Jason E. Thompson, Utah State Representative — https://le.utah.gov/images/legislator/THOMJA.jpg
- `ryan_d_wilcox` — Ryan D. Wilcox, Utah State Representative — https://le.utah.gov/images/legislator/WILCORD.jpg
- `jason_b_kyle` — Jason B. Kyle, Utah State Representative — https://le.utah.gov/images/legislator/KYLEJB.jpg
- `karen_m_peterson` — Karen M. Peterson, Utah State Representative — https://le.utah.gov/images/legislator/PETERK.jpg
- `stewart_e_barlow` — Stewart E. Barlow, Utah State Representative — https://le.utah.gov/images/legislator/BARLOSE.jpg
- `paul_a_cutler` — Paul A. Cutler, Utah State Representative — https://le.utah.gov/images/legislator/CUTLEP.jpg
- `mballard` — Melissa G. Ballard, Utah State Representative — https://le.utah.gov/images/legislator/BALLAMG.jpg
- `matt_macpherson` — Matt MacPherson, Utah State Representative — https://le.utah.gov/images/legislator/MACPHM.jpg
- `anthony_loubet` — Anthony E. Loubet, Utah State Representative — https://le.utah.gov/images/legislator/LOUBEA.jpg
- `sahara_hayes` — Sahara Hayes, Utah State Representative — https://le.utah.gov/images/legislator/HAYESS.jpg
- `rosalba_dominguez` — Rosalba Dominguez, Utah State Representative — https://le.utah.gov/images/legislator/DOMINR.jpg
- `cheryl_acton` — Cheryl K. Acton, Utah State Representative — https://le.utah.gov/images/legislator/ACTONCK.jpg
- `andrew_stoddard` — Andrew Stoddard, Utah State Representative — https://le.utah.gov/images/legislator/STODDA.jpg
- `mark_strong` — Mark A. Strong, Utah State Representative — https://le.utah.gov/images/legislator/STRONMA.jpg
- `doug_fiefia` — Doug Fiefia, Utah State Representative — https://le.utah.gov/images/legislator/FIEFID.jpg
- `kristen_chevrier` — Kristen Chevrier, Utah State Representative — https://le.utah.gov/images/legislator/CHEVRK.jpg
- `nelson_abbott` — Nelson T. Abbott, Utah State Representative — https://le.utah.gov/images/legislator/ABBOTN.jpg
- `david_shallenberger` — David Shallenberger, Utah State Representative — https://le.utah.gov/images/legislator/SHALLD.jpg
- `nthurston` — Norman K Thurston, Utah State Representative — https://le.utah.gov/images/legislator/THURSNK.jpg
- `joseph_elison` — Joseph Elison, Utah State Representative — https://le.utah.gov/images/legislator/ELISOJ.jpg
- `r_neil_walter` — R. Neil Walter, Utah State Representative — https://le.utah.gov/images/legislator/WALTER.jpg
- `gay_lynn_bennion` — Gay Lynn Bennion, Former UT State Representative — https://le.utah.gov/images/legislator/BENNIGL.jpg
- `jefferson_moss` — Jefferson Moss, Former UT State Representative — https://le.utah.gov/images/legislator/MOSSJ.jpg
- `jefferson_burton` — Jefferson S. Burton, Former UT State Representative — https://le.utah.gov/images/legislator/BURTOJS.jpg
- `daniel_thatcher` — Daniel W. Thatcher, Former UT State Senator — https://le.utah.gov/images/legislator/THATCDW.jpg
- `kera_birkeland` — Kera Birkeland, Former UT State Representative — https://le.utah.gov/images/legislator/BIRKEK.jpg
- `david_buxton` — David G. Buxton, Former UT State Senator — https://le.utah.gov/images/legislator/BUXTODG.jpg
- `joel_briscoe` — Joel K. Briscoe, Former UT State Representative — https://le.utah.gov/images/legislator/BRISCJK.jpg
- `james_cobb` — James F. Cobb, Former UT State Representative — https://le.utah.gov/images/legislator/COBBJ.jpg
- `brett_garner` — Brett Garner, Former UT State Representative — https://le.utah.gov/images/legislator/GARNEB.jpg
- `tim_jimenez` — Tim Jimenez, Former UT State Representative — https://le.utah.gov/images/legislator/JIMENT.jpg
- `brian_king` — Brian S. King, Former UT State Representative — https://le.utah.gov/images/legislator/KINGBS.jpg
- `rosemary_lesser` — Rosemary T. Lesser, Former UT State Representative — https://le.utah.gov/images/legislator/LESSER.jpg
- `steven_lund` — Steven J. Lund, Former UT State Representative — https://le.utah.gov/images/legislator/LUNDSJ.jpg
- `susan_pulsipher` — Susan Pulsipher, Former UT State Representative — https://le.utah.gov/images/legislator/PULSIS.jpg
- `judy_weeks_rohner` — Judy Weeks Rohner, Former UT State Representative — https://le.utah.gov/images/legislator/ROHNEJ.jpg
- `robert_spendlove` — Robert M. Spendlove, Former UT State Representative — https://le.utah.gov/images/legislator/SPENDRM.jpg
- `jeffrey_stenquist` — Jeffrey D. Stenquist, Former UT State Representative — https://le.utah.gov/images/legislator/STENQJ.jpg
- `mark_wheatley` — Mark A. Wheatley, Former UT State Representative — https://le.utah.gov/images/legislator/WHEATMA.jpg
- `jacob_anderegg` — Jacob L. Anderegg, Former UT State Senator — https://le.utah.gov/images/legislator/ANDERJL.jpg
- `quinn_kotter` — Quinn Kotter, Former UT State Representative — https://le.utah.gov/images/legislator/KOTTEQ.jpg

### Kept the building, and why

- `eleni_kounalakis` — Eleni Kounalakis, Lieutenant Governor — the only .gov image on ltg.ca.gov is a bill-signing scene, not a portrait
- `treg_taylor` — Treg Taylor, State Attorney General — no official .gov portrait found (left AG office Aug 2025; law.alaska.gov blocks/press pages have no photo)
- `lynn_fitch` — Lynn Fitch, State Attorney General — official MS AG site is attorneygenerallynnfitch.com (.com host; www.ago.state.ms.us redirects there); no .gov/.us portrait found
- `nick_brown` — Nick Brown, State Attorney General — only photo on official atg.wa.gov page is hosted on Amazon S3 (agportal-s3bucket.s3.us-west-2.amazonaws.com), not a .gov/.us host
- `jimmie_hughes_stg` — Jimmie Hughes, Mayor, St. George — official city site is on .org host sgcity.org (no .gov/.us)
- `heidi_hammond_grantsville` — Heidi Hammond, Mayor, Grantsville — photo src on grantsvilleut.gov 302-redirects to website-builder CDN cms9files.revize.com
- `monica_zoltanski_sandy` — Monica Zoltanski, Mayor, Sandy — only photo on website-builder CDN content.civicplus.com (sandy.utah.gov/about-mayor-zoltanski)
- `mark_shepherd_clearfield` — Mark Shepherd, Mayor, Clearfield — official city site is on .city host clearfield.city (no .gov/.us)
- `greg_miles_duchesne` — Greg Miles, Duchesne County Commission — only a combined group image of all commissioners on duchesne.utah.gov/gov/elected-officials/commissioners/ (no individual portrait)
- `jordan_leonard_emery` — Jordan Leonard, Emery County Commission — only photo src on .com host emerycounty.com (emery.utah.gov/home/offices/commission/)
- `mary_mcgann_grand` — Mary McGann, Grand County Commission — official county site is on .net host grandcountyutah.net (no .gov/.us)
- `dean_draper_millard` — Dean Draper, Millard County Commission — not listed on current commission page millardcounty.gov/your-government/elected-officials/commission/ (members Johnson, Wright, Lyman); no official .gov portrait found
- `lori_maughan_sanjuan` — Lori Maughan, San Juan County Commission (Chair) — no individual portrait on sanjuancountyut.gov (commission page has only a generic Commission image; directory has no photo)
- `jamie_harvey_sanjuan` — Jamie Harvey, San Juan County Commission (Vice Chair) — no individual portrait on sanjuancountyut.gov (commission page has only a generic Commission image; directory has no photo)
- `trevor_olsen_blanding` — Trevor Olsen, Mayor, Blanding — resigned as mayor Aug 2026; blanding-ut.gov/mayor shows position vacant (Wix site); no .gov portrait
- `kevin_dunn_monticello` — Kevin Dunn, Mayor, Monticello — official city site is on .org host monticelloutah.org (no .gov/.us)
- `john_laursen_uintah` — John Laursen, Uintah County Commission (Chair) — photo src on co.uintah.ut.us 302-redirects to website-builder CDN cms1files.revize.com (https://co.uintah.ut.us/departments/a_-_e_departments/commissioners/index.php)
- `sonja_norton_uintah` — Sonja Norton, Uintah County Commission — photo src on co.uintah.ut.us 302-redirects to website-builder CDN cms1files.revize.com (https://co.uintah.ut.us/departments/a_-_e_departments/commissioners/index.php)
- `willis_lefevre_uintah` — Willis LeFevre, Uintah County Commission — photo src on co.uintah.ut.us 302-redirects to website-builder CDN cms1files.revize.com (https://co.uintah.ut.us/departments/a_-_e_departments/commissioners/index.php)
- `steve_labrum_uintah` — Steve Labrum, Uintah County Sheriff — photo src on co.uintah.ut.us 302-redirects to website-builder CDN cms1files.revize.com (https://co.uintah.ut.us/residents/sheriff_s_office.php)
- `terry_willis_price` — Terry Willis, Mayor, Price — no portrait on priceutah.gov/city-government.html (text-only roster)
- `lenise_peterman_helper` — Lenise Peterman, Mayor, Helper — helpercity.gov is a Wix site; any photo would be on website-builder CDN static.wixstatic.com
- `jeff_wood_carbon` — Jeff Wood, Carbon County Sheriff — no portrait on carbon.utah.gov (elected-officials and sheriff pages have text only)
- `larry_jensen_carbon` — Larry Jensen, Carbon County Commission — no portrait on carbon.utah.gov (elected-officials and commission pages have text only)
- `jared_buchanan_sanpete` — Jared Buchanan, Sanpete County Sheriff — no sheriff portrait on sanpetecountyutah.gov/177/Sheriff
- `john_scott_ephraim` — John Scott, Former Mayor, Ephraim — former mayor; current ephraim.gov council page shows Mayor Chris Larsen; no official .gov/.us portrait of John Scott found
- `greg_jensen_sevier` — Greg Jensen, Sevier County Commission — photo src on sevier.utah.gov 302-redirects to website-builder CDN cms3.revize.com (https://www.sevier.utah.gov/departments/county_officials/county_commissioners/greg_jensen.php)
- `nathan_curtis_sevier` — Nathan Curtis, Sevier County Sheriff — sheriff office site is on .com host scsoutah.com; no .gov/.us portrait found
- `bryan_burrows_richfield` — Bryan Burrows, Mayor, Richfield — no portrait of Burrows on richfieldut.gov (city-council page text only; mayors-welcome photo is former mayor D. Ogden)
- `clint_painter_juab` — Clint Painter, Juab County Commission (Chair) — only a group commissioners image served from CDN i0.wp.com (juabcounty.gov/government/commission/)
- `douglas_anderson_juab` — Douglas Anderson, Juab County Sheriff — no portrait on juabcounty.gov/departments/sheriff/; sheriff site is .org host juabsheriff.org
- `linda_hanks_juab` — Linda Hanks, Juab School District Board (President) — school district site is .org host juabsd.org; no .gov/.us portrait
- `colten_johnson_kanab` — T. Colten Johnson, Mayor, Kanab — no portrait on kanab.utah.gov/2169/City-Council (text-only roster)
- `eric_houston_garfield` — Eric Houston, Garfield County Sheriff — sheriff site is gcutsheriff.com (.com) with no portrait; garfield.utah.gov blocked 403; only photo on .org host utahsheriffs.org
- `kim_soper_panguitch` — Kim Soper, Mayor, Panguitch — panguitchutah.gov directory has no portrait; no official .gov/.us portrait found
- `matt_wilson_morgan` — Matt Wilson, Morgan County Commission (Chair) — Morgan County site (morgancountyutah.gov) serves all images from website-builder CDN irp.cdn-website.com
- `blaine_fackrell_morgan` — Blaine Fackrell, Morgan County Commission — Morgan County site (morgancountyutah.gov) serves all images from website-builder CDN irp.cdn-website.com
- `corey_stark_morgan` — Corey Stark, Morgan County Sheriff — only photo on .org host utahsheriffs.org; county site images on CDN irp.cdn-website.com
- `steve_gale_morgan` — Steve Gale, Mayor, Morgan City — morganutah.gov directory page returns 403; no verifiable .gov image URL
- `gaylene_adams_morgan` — Gaylene Adams, Morgan School District Board (President) — school district site is .org (morgansd.org); no official .gov/.us portrait found
- `pat_argyle_gardencity` — Pat Argyle, Mayor, Garden City — Garden City site (gardencityutah.gov) is Squarespace; images on images.squarespace-cdn.com
- `dennis_blackburn_wayne` — Dennis Blackburn, Wayne County Commission (Chair) — waynecountyutah.gov commission page lists names only, no portrait
- `roger_brian_wayne` — Roger Brian, Wayne County Commission — waynecountyutah.gov commission page lists names only, no portrait
- `micah_gulley_wayne` — Micah Gulley, Wayne County Sheriff — only photo on .org host utahsheriffs.org; no official .gov/.us portrait found
- `mickey_wright_torrey` — Mickey Wright, Mayor, Torrey — Torrey site (torreyutah.gov) is Webflow; images on website-builder CDN cdn.prod.website-files.com
- `marty_gleave_piute` — Marty Gleave, Piute County Sheriff — piute.gov sheriff page has no portrait; only photo on .org host utahsheriffs.org
- `barry_golding_washco` — Barry Golding, Washington County Sheriff (interim) — only photo on .net host news.washeriff.net (sheriff office site)
- `clark_fawcett_hurricane` — Clark Fawcett, Mayor, Hurricane — only photo on .com host www.cityofhurricane.com (official city site)
- `nanette_billings_hurricane` — Nanette Billings, Former Mayor, Hurricane — former mayor; city site is .com (cityofhurricane.com); no official .gov/.us portrait found
- `jarett_waite_santaclara` — Jarett Waite, Mayor, Santa Clara — Santa Clara city site is .org (sccity.org); no official .gov/.us portrait found
- `barbara_bruno_springdale` — Barbara Bruno, Mayor, Springdale — springdale.utah.gov Town Council page has only a group council photo, no individual portrait
- `jared_hamner_tooele` — Jared Hamner, Tooele County Council (Chair) — tooeleco.gov council photo URL redirects (302) to website-builder CDN cms3.revize.com
- `scott_wardle_tooele` — Scott Wardle, Tooele County Council (Vice Chair) — tooeleco.gov council photo URL redirects (302) to website-builder CDN cms3.revize.com
- `kendall_thomas_tooele` — Kendall Thomas, Tooele County Council — tooeleco.gov council photo URL redirects (302) to website-builder CDN cms3.revize.com
- `tye_hoffmann_tooele` — Tye Hoffmann, Tooele County Council — tooeleco.gov council photo URL redirects (302) to website-builder CDN cms3.revize.com
- `erik_stromberg_tooele` — Erik Stromberg, Tooele County Council — tooeleco.gov council photo URL redirects (302) to website-builder CDN cms3.revize.com
- `paul_wimmer_tooele` — Paul Wimmer, Tooele County Sheriff — only photo on .org host tooelecountysheriff.org
- `jared_rigby_wasatch` — Jared Rigby, Wasatch County Sheriff — sheriff site is Wix; images on website-builder CDN static.wixstatic.com
- `sam_steed_piute` — Sam Steed, Piute County Commission — piute.gov commissioners page has no portrait; no official .gov/.us portrait found
- `marsha_judkins_provo` — Marsha Judkins, Mayor, Provo — provo.gov Meet-the-Mayors-Office page has headshot but site returns 403; image URL could not be seen verbatim
- `paul_binns_lehi` — Paul Binns, Mayor, Lehi — only photo on CMS CDN media-002-us.cdn.govstack.com (lehi-ut.gov mayor-and-council page)
- `tish_buroker_riverton` — Tish Buroker, Mayor, Riverton — rivertonutah.gov photo URL redirects (302) to website-builder CDN cms8.revize.com
- `bryce_dunford_jordan` — Bryce Dunford, Jordan School District Board (District 5) — Jordan School District site is .org (jordandistrict.org); no official .gov/.us portrait found
- `ranjeev_puri` — Ranjeev Puri, State House Democratic Leader — only official portrait found on caucus site housedems.com (.com); house.mi.gov unreachable
- `nicole_cannizzaro` — Nicole Cannizzaro, State Senate Majority Leader — only photo found is on www.leg.state.nv.us, not a .gov/.us host
- `mike_johnston` — Mike Johnston, Mayor of Denver — official headshot only on city site host www.denvergov.org (.org, not .gov/.us)
- `dan_bongino` — Dan Bongino, FBI Deputy Director — official FBI portrait only found on .org host commons.wikimedia.org; removed from fbi.gov (left office Jan 2026)
- `tom_homan` — Tom Homan, White House Border Czar — no current .gov portrait found; only official ICE portrait copy on .org host commons.wikimedia.org
- `keith_kellogg` — Keith Kellogg, Special Envoy for Ukraine & Russia — no official .gov portrait found (state.gov blocked; left envoy post Dec 2025); photos only on .org/.com hosts
- `marty_makary` — Marty Makary, FDA Commissioner — FDA bio page removed (resigned May 2026); no official .gov portrait found
- `jay_bhattacharya` — Jay Bhattacharya, NIH Director — nih.gov blocked from sandbox, portrait URL not seen verbatim; official portrait only seen on .org host commons.wikimedia.org / flickr.com
- `brendan_carr` — Brendan Carr, FCC Chair — fcc.gov blocked from sandbox, portrait URL not seen verbatim; no other .gov/.us source found
- `witkoff` — Steve Witkoff, U.S. Special Envoy to the Middle East — no official .gov portrait found (not on whitehouse.gov cabinet page; state.gov blocked); photos only on .org/.com hosts
- `stephen_miller` — Stephen Miller, White House Deputy Chief of Staff — no official .gov portrait found (not on whitehouse.gov or WH archives)
- `bilzerian` — Dan Bilzerian, Candidate — candidate, never held office; no official .gov/.us portrait exists (photos only on campaign/news .com sites)
- `gallrein` — Ed Gallrein, Republican Nominee — nominee, never held office; no official .gov/.us portrait exists (photos only on campaign/news/.org sites)
- `susan_lee` — Susan Lee, Davis County Commission candidate — candidate; only photos on campaign site votesusanlee.com / news; no official .gov/.us portrait found
- `zach_bloxham` — Zach Bloxham, Layton City Council — Layton council page (laytoncityutah.gov/LC/Government/CouncilMembers) loads portraits dynamically; no verbatim .gov image URL found
- `clint_morris` — Clint Morris, Layton City Council — Layton council page (laytoncityutah.gov/LC/Government/CouncilMembers) loads portraits dynamically; no verbatim .gov image URL found
- `tyson_roberts` — Tyson Roberts, Layton City Council — Layton council page (laytoncityutah.gov/LC/Government/CouncilMembers) loads portraits dynamically; no verbatim .gov image URL found
- `brigit_gerrard` — Brigit Gerrard, Davis Board of Education · Precinct 4 (President) — district board page davis.k12.ut.us/o/dsd/page/school-board (Apptegy CMS) not retrievable; no verbatim .gov/.us image URL found
- `michelle_barber` — Michelle Barber, Davis Board of Education · Precinct 5 — district board page davis.k12.ut.us/o/dsd/page/school-board (Apptegy CMS) not retrievable; no verbatim .gov/.us image URL found
- `kristen_hogan` — Kristen Hogan, Davis Board of Education · Precinct 6 — district board page davis.k12.ut.us/o/dsd/page/school-board (Apptegy CMS) not retrievable; no verbatim .gov/.us image URL found
- `chad_jensen` — Chad Jensen, Cache County Sheriff — cachecounty.gov sheriff administration page returns 403 to fetch; no verbatim .gov/.us image URL could be confirmed
- `george_daines` — N. George Daines, Cache County Executive — cachecounty.gov pages return 403 to fetch; no verbatim .gov/.us image URL could be confirmed
- `mark_anderson_logan` — Mark Anderson, Mayor of Logan — loganutah.gov mayor page shows no portrait img in fetched content (Revize CMS; files typically on cms9files.revize.com); no official .gov/.us portrait found
- `sandi_goodlander` — Sandi Goodlander, Cache County Council · Chair (Logan Seat #3) — cachecounty.gov pages return 403 to fetch; no verbatim .gov/.us image URL could be confirmed
- `kathryn_beus` — Kathryn Beus, Cache County Council · Vice Chair (Southeast District) — cachecounty.gov pages return 403 to fetch; no verbatim .gov/.us image URL could be confirmed
- `david_erickson_cache` — David L. Erickson, Cache County Council · North District — cachecounty.gov pages return 403 to fetch; no verbatim .gov/.us image URL could be confirmed
- `keegan_garrity` — Keegan Garrity, Cache County Council · Logan Seat #1 — cachecounty.gov pages return 403 to fetch; no verbatim .gov/.us image URL could be confirmed
- `joann_bennett` — JoAnn Bennett, Cache County Council · Logan Seat #2 — cachecounty.gov pages return 403 to fetch; no verbatim .gov/.us image URL could be confirmed
- `mark_hurd` — Mark Hurd, Cache County Council · Northeast District — cachecounty.gov pages return 403 to fetch; no verbatim .gov/.us image URL could be confirmed
- `nolan_gunnell` — Nolan P. Gunnell, Cache County Council · South District — cachecounty.gov pages return 403 to fetch; no verbatim .gov/.us image URL could be confirmed
- `teri_rhodes` — Teri Rhodes, Cache County School Board · President (District 7) — only official photo on school district .org host ccsdut.org (board-of-education/board-members)
- `brian_chambers` — Brian Chambers, Cache County School Board · District 1 — only official photo on school district .org host ccsdut.org (board-of-education/board-members)
- `roger_pulsipher` — Roger Pulsipher, Cache County School Board · District 2 — only official photo on school district .org host ccsdut.org (board-of-education/board-members)
- `randall_bagley` — Randall Bagley, Cache County School Board · District 4 — only official photo on school district .org host ccsdut.org (board-of-education/board-members)
- `d_jeffrey_nielsen` — D. Jeffrey Nielsen, Cache County School Board · District 3 — only official photo on school district .org host ccsdut.org (board-of-education/board-members)
- `allen_grunig` — Allen Grunig, Cache County School Board · District 5 — only official photo on school district .org host ccsdut.org (board-of-education/board-members)
- `kathy_christiansen` — Kathy Christiansen, Cache County School Board · Vice President (District 6) — only official photo on school district .org host ccsdut.org (board-of-education/board-members)
- `becky_quay` — Becky Quay, Logan City School Board · President (District 4) — only official photo on school district .org host loganschools.org
- `cole_checketts` — Cole Checketts, Logan City School Board · District 5 — only official photo on school district .org host loganschools.org
- `russell_fisher` — Russell Fisher, Logan City School Board · District 3 (interim) — only official photo on school district .org host loganschools.org
- `katie_chapman` — Katie Chapman, Logan City School Board · District 1 — only official photo on school district .org host loganschools.org
- `frank_stewart` — Frank Stewart, Logan City School Board · Vice President (District 2) — only official photo on school district .org host loganschools.org
- `lyman` — Phil Lyman, U.S. House Candidate (UT-3) — former legislator; no current official .gov/.us portrait found (house.utleg.gov rep page has no photo); campaign/news only
- `nhaley` — Nikki Haley, Former UN Ambassador — the only .gov image (usun.state.gov, archived 2017 page) now returns 403, so there is no live official portrait
- `dballard` — Derek Ballard, U.S. House Candidate — candidate; could not confirm identity/role; no official .gov/.us portrait found
- `jjohnson` — Jen Johnson, U.S. House Candidate — candidate; could not confirm identity/role; no official .gov/.us portrait found
- `rodric_bray` — Rodric Bray, Indiana State Senator — iga.in.gov profile is JS app; no verbatim .gov image URL found (caucus sites are .com/.org)
- `chris_garten` — Chris Garten, Indiana State Senator — iga.in.gov profile is JS app; no verbatim .gov image URL found (caucus sites are .com/.org)
- `shelli_yoder` — Shelli Yoder, Indiana State Senator — iga.in.gov profile is JS app; no verbatim .gov image URL found (caucus sites are .com/.org)
- `stephen_harding` — Stephen Harding, Connecticut State Senator — only photo found on .com caucus site ctsenaterepublicans.com (cga.ct.gov unreachable/no portrait found)
- `michelle_kaufusi` — Michelle Kaufusi, Former Mayor, Provo · 2026 Utah County Commission Nominee (Seat A) — former mayor; current provo.gov mayor page shows successor; old bio page on .org host provo.org; no .gov/.us portrait found
<!-- /person-photos-wave-1 -->

<!-- person-photos-wave-1b -->
## Person photos, wave 1b — campaign portraits where no official portrait exists

Searched 2026-10-11 for each of the 114 roster rows still painting the building after wave 1. An official .gov / .us portrait stays preferred and none was replaced. A campaign portrait was stored only when all of these held: the page is the person's own campaign site; it names the same person and the same office or candidacy; the image is one single portrait (not a group shot, crowd, family photo, video frame or bill-signing scene); and the image is served from that campaign site's own domain, not a CDN, news site or third party. No URL was composed. Each campaign host below was added to the trusted list (`scripts/test-photo-coverage.mjs`, campaign-hosts block) and to netlify.toml `remote_images`.

### Counts

- Rows searched: 114
- Gained a campaign portrait: 8
- Kept the building: 106

### Gained a campaign portrait

- `nick_brown` — Nick Brown, State Attorney General — campaign host `nickbrownforag.com` — https://nickbrownforag.com/wp-content/uploads/2023/07/Nick-Brown-Final-1-1-scaled.jpg — own campaign site, title "Nick Brown for Attorney General" ("Nick Brown is running for Attorney General"); single portrait of Nick Brown, alt "Nick Brown for Attorney General" (verified visually); curl 200 image/jpeg (page: https://nickbrownforag.com/)
- `jamie_harvey_sanjuan` — Jamie Harvey, San Juan County Commission (Vice Chair) — campaign host `jamie4sanjuan.com` — https://jamie4sanjuan.com/_astro/hero._Kh0RpNB_qID07.jpg — own campaign site, title "Jamie Harvey for San Juan County Commission, District 3" (mentions Utah/Monument Valley); single portrait, alt "Jamie Harvey, candidate for San Juan County Commission, District 3" (relative src /_astro… (page: https://jamie4sanjuan.com/)
- `jared_rigby_wasatch` — Jared Rigby, Wasatch County Sheriff — campaign host `sheriffjaredrigby.org` — https://sheriffjaredrigby.org/wp-content/uploads/2026/02/jared-rigby-headshot-press-release-768x1024_1767472139531-BDB2V0IG-e1770900316636.avif — own campaign site, title "Sheriff Jared Rigby: Keeping Wasatch County Safe / JARED RIGBY FOR SHERIFF", page text "Jared Rigby, Wasatch County Sheriff"; single headshot, alt "Jared Rigby, wearing a sheriff's uniform with badge, … (page: https://sheriffjaredrigby.org/)
- `marsha_judkins_provo` — Marsha Judkins, Mayor, Provo — campaign host `marshajudkins.com` — https://marshajudkins.com/wp-content/uploads/2018/03/Marsha-Judkins-Utah-House-300x300.jpg — own campaign site "About Marsha Judkins / Marsha Judkins for Provo", text "That's why she's running for Mayor" / "Marsha Judkins for Provo Mayor"; single headshot of one woman (viewed; empty alt, filename Marsha-Judkins-Utah-Ho… (page: https://marshajudkins.com/about/)
- `bryce_dunford_jordan` — Bryce Dunford, Jordan School District Board (District 5) — campaign host `www.brycedunford.com` — https://www.brycedunford.com/images/bryce2.jpg — own campaign site "Bryce Dunford for JSD" / "Re-elect Bryce Dunford Jordan Board of Education"; about page img src="images/bryce2.jpg" (no alt) is a single studio headshot of him (visually verified, 390x543); curl 200 image/jpeg (page: https://www.brycedunford.com/about.html)
- `bilzerian` — Dan Bilzerian, Candidate — campaign host `www.bilzerianforcongress.com` — https://www.bilzerianforcongress.com/wp-content/uploads/2026/04/Dan-Bilzerian-cover-v2.webp — own campaign site titled "Dan Bilzerian for U.S. Congress in Florida's 6th District"; hero img alt "Dan Bilzerian for Congress in Florida's 6th Congressional District" is a single B&W profile portrait cutout of him (visually ve… (page: https://www.bilzerianforcongress.com/)
- `chris_garten` — Chris Garten, Indiana State Senator — campaign host `www.gartenforsenate.com` — https://www.gartenforsenate.com/wp-content/themes/garten-in-lp-theme/assets/garten/issues-banner.jpg — own campaign site 'Chris Garten for State Senate' (paid for by 'Friends of Chris Garten', running for Indiana State Senate); single-person portrait, alt 'Chris Garten smiling outdoors in a black polo shirt' (visually confirmed … (page: http://www.gartenforsenate.com/)
- `michelle_kaufusi` — Michelle Kaufusi, Former Mayor, Provo · 2026 Utah County Commission Nominee (Seat A) — campaign host `teamkaufusi.com` — https://teamkaufusi.com/wp-content/uploads/2026/02/Head-Shot-Red-Suit-1024x1024.jpg — own campaign site Team Kaufusi; about page says 'I'm running for Utah County Commissioner'; single headshot (red suit, flag backdrop; filename Head-Shot-Red-Suit, alt empty) on home page, src seen verbatim in HTML; curl -sIL 20… (page: https://teamkaufusi.com/)

### Kept the building, and why

- `eleni_kounalakis` — Eleni Kounalakis, Lieutenant Governor — campaign site eleniforca.com is for a different candidacy (Treasurer), and its only image of her is a frame from a campaign video, not a portrait
- `treg_taylor` — Treg Taylor, State Attorney General — own campaign site "Treg Taylor for Alaska Governor" (mentions "As Attorney General"); images of Treg are family group photo (Treg-1.jpg) and couple photo with wife (treg-2.jpg); no single portrait
- `lynn_fitch` — Lynn Fitch, State Attorney General — campaign site www.lynnfitchforms.com ("Lynn Fitch for Governor", lynnfitch.com redirects there) serves its images from CDN images.squarespace-cdn.com; also names a different candidacy (Governor) and no clear single portrait
- `jimmie_hughes_stg` — Jimmie Hughes, Mayor, St. George — campaign site www.jimmiehughes.com ("Jimmie Hughes for St. George Mayor") serves its images from CDN images.squarespace-cdn.com
- `heidi_hammond_grantsville` — Heidi Hammond, Mayor, Grantsville — no campaign site found (only news/election-results pages)
- `monica_zoltanski_sandy` — Monica Zoltanski, Mayor, Sandy — current campaign site votemonicaz.com is an expired Squarespace site; old 2021 site voteformonica.com ("I'm running for Mayor to build a stronger Sandy") has only a "MONICA Z FOR MAYOR" text banner graphic and a press-release i…
- `mark_shepherd_clearfield` — Mark Shepherd, Mayor, Clearfield — campaign sites iloveclearfield.com ("Mark for Mayor") and voteshepherd.com did not load (connection failure / Squarespace expired); no portrait verifiable
- `greg_miles_duchesne` — Greg Miles, Duchesne County Commission — no campaign site found (only county pages/news)
- `jordan_leonard_emery` — Jordan Leonard, Emery County Commission — former 2022 campaign site "Jordan Leonard For Emery County Commissioner" (jordanforemery.com) no longer resolves (NXDOMAIN); no portrait verifiable
- `mary_mcgann_grand` — Mary McGann, Grand County Commission — no campaign site found (not seeking reelection 2026; only county/news pages)
- `dean_draper_millard` — Dean Draper, Millard County Commission — no campaign site found (only county documents/news)
- `lori_maughan_sanjuan` — Lori Maughan, San Juan County Commission (Chair) — no campaign site found (only county pages/minutes and San Juan Record news)
- `trevor_olsen_blanding` — Trevor Olsen, Mayor, Blanding — no campaign site found (appointed mayor Dec 2024, resigned Aug 2026; only city/news pages)
- `kevin_dunn_monticello` — Kevin Dunn, Mayor, Monticello — no campaign site found (candidate statement only on city site monticelloutah.org and San Juan Record news)
- `john_laursen_uintah` — John Laursen, Uintah County Commission (Chair) — no campaign site found (only Ballotpedia/county/news pages)
- `sonja_norton_uintah` — Sonja Norton, Uintah County Commission — 2022 campaign site "Vote Sonja Norton" (votesonjanorton.com, WordPress.com-built) no longer resolves (ENOTFOUND); no portrait verifiable (WordPress.com sites serve images from CDN anyway)
- `willis_lefevre_uintah` — Willis LeFevre, Uintah County Commission — no campaign site found (only utgop.org party page, Ballotpedia, news)
- `steve_labrum_uintah` — Steve Labrum, Uintah County Sheriff — no campaign site found (only YouTube/Facebook videos and news)
- `terry_willis_price` — Terry Willis, Mayor, Price — no campaign site found (only news/city pages and Facebook)
- `lenise_peterman_helper` — Lenise Peterman, Mayor, Helper — campaign site "Re-Elect Mayor Lenise Peterman" (mayorlenise.com) is an expired Squarespace site (404); was Squarespace-hosted so images would be on CDN images.squarespace-cdn.com anyway
- `jeff_wood_carbon` — Jeff Wood, Carbon County Sheriff — no campaign site found (only news pages; retiring 2026)
- `larry_jensen_carbon` — Larry Jensen, Carbon County Commission — no campaign site found (only county pages, YouTube, news)
- `jared_buchanan_sanpete` — Jared Buchanan, Sanpete County Sheriff — no campaign site found (only Facebook page "Jared Buchanan for Sanpete County Sheriff" and news)
- `john_scott_ephraim` — John Scott, Former Mayor, Ephraim — no campaign site found (former mayor, appointed 2019/uncontested 2021; only city documents/news)
- `greg_jensen_sevier` — Greg Jensen, Sevier County Commission — campaign site www.greg4seviercounty.com ("Sevier County Commissioner Seat B") serves its portrait from CDN static.wixstatic.com
- `nathan_curtis_sevier` — Nathan Curtis, Sevier County Sheriff — no campaign site found (only sheriff office site scsoutah.com, Utah Sheriffs Association, X, news)
- `bryan_burrows_richfield` — Bryan Burrows, Mayor, Richfield — no campaign site found (only Facebook page facebook.com/mayorbryanburrows, social media)
- `clint_painter_juab` — Clint Painter, Juab County Commission (Chair) — no campaign site found (only SUU story, news, LinkedIn)
- `douglas_anderson_juab` — Douglas Anderson, Juab County Sheriff — no campaign site found (only Ballotpedia, juabsheriff.org office site, news); retired May 2026
- `linda_hanks_juab` — Linda Hanks, Juab School District Board (President) — campaign site www.linda4stateschoolboard.com ("Linda Hanks for State Board", a different candidacy; mentions "Juab School Board, including four terms as president") serves its images from CDN images.squarespace-cdn.com
- `colten_johnson_kanab` — T. Colten Johnson, Mayor, Kanab — no campaign site found (only kanab.utah.gov directory, minutes, sunews.net, kanabchamber.org)
- `eric_houston_garfield` — Eric Houston, Garfield County Sheriff — no campaign site found (only news coverage stgeorgeutah.com/insiderutah.com/utahbyway.com and utahsheriffs.org)
- `kim_soper_panguitch` — Kim Soper, Mayor, Panguitch — no campaign site found (only panguitchutah.gov minutes/directory)
- `matt_wilson_morgan` — Matt Wilson, Morgan County Commission (Chair) — no campaign site found (only county site, minutes, news); common name
- `blaine_fackrell_morgan` — Blaine Fackrell, Morgan County Commission — campaign site www.blaine4morgan.com ("Blaine Fackrell for Morgan County Commissioner" in search title) returns HTTP 404 (IONOS) to curl and WebFetch; no image URL could be seen verbatim
- `corey_stark_morgan` — Corey Stark, Morgan County Sheriff — no campaign site found (only Ballotpedia, utahsheriffs.org, county candidate list)
- `steve_gale_morgan` — Steve Gale, Mayor, Morgan City — no campaign site found (only morganutah.gov agendas/minutes, WFRC, Wikipedia)
- `gaylene_adams_morgan` — Gaylene Adams, Morgan School District Board (President) — no campaign site found (only morgansd.org district page, change.org, news)
- `pat_argyle_gardencity` — Pat Argyle, Mayor, Garden City — no campaign site found (appointed interim mayor May 2026; only gardencityut.us town site, abc4 news, minutes)
- `dennis_blackburn_wayne` — Dennis Blackburn, Wayne County Commission (Chair) — no campaign site found (only LinkedIn, waynecountyfire.org, news)
- `roger_brian_wayne` — Roger Brian, Wayne County Commission — no campaign site found (only utah.gov notices, insiderutah.com news)
- `micah_gulley_wayne` — Micah Gulley, Wayne County Sheriff — no campaign site found (only utahsheriffs.org, colorcountryanimalwelfare.org, sb54.info, news)
- `mickey_wright_torrey` — Mickey Wright, Mayor, Torrey — no campaign site found (only torreyutah.gov member page, news; name shared with golfer)
- `marty_gleave_piute` — Marty Gleave, Piute County Sheriff — no campaign site found (only LinkedIn, news, directories)
- `barry_golding_washco` — Barry Golding, Washington County Sheriff (interim) — no campaign site found (interim chosen by party; only wcrputah.com party page and news)
- `clark_fawcett_hurricane` — Clark Fawcett, Mayor, Hurricane — no campaign site found (only news coverage, saveutah.org questionnaire, cityofhurricane.com)
- `nanette_billings_hurricane` — Nanette Billings, Former Mayor, Hurricane — campaign site www.nanettebillings.com ("Reelect Nanette Billings", Mayor of Hurricane per search) no longer resolves (DNS ENOTFOUND via curl and WebFetch); no image URL could be seen verbatim
- `jarett_waite_santaclara` — Jarett Waite, Mayor, Santa Clara — no campaign site found (only council agendas and stgeorgeutah.com news)
- `barbara_bruno_springdale` — Barbara Bruno, Mayor, Springdale — no campaign site found (only springdale.utah.gov, news, YouTube)
- `jared_hamner_tooele` — Jared Hamner, Tooele County Council (Chair) — no campaign site found (only tooeleco.gov, BallotReady, news)
- `scott_wardle_tooele` — Scott Wardle, Tooele County Council (Vice Chair) — no campaign site found (only utgop.org party page, tooeleco.gov, Vote Smart, news)
- `kendall_thomas_tooele` — Kendall Thomas, Tooele County Council — no campaign site found (only tooeleco.gov, news)
- `tye_hoffmann_tooele` — Tye Hoffmann, Tooele County Council — no campaign site found (only Facebook page, tooeleco.gov, election archive, news)
- `erik_stromberg_tooele` — Erik Stromberg, Tooele County Council — campaign site www.erik4tooelecounty.com ("Erik Stromberg Tooele County Council District 5" in search title) does not resolve (DNS failure via curl and WebFetch); no image URL could be seen verbatim
- `paul_wimmer_tooele` — Paul Wimmer, Tooele County Sheriff — no campaign site found (only Facebook page "Re-Elect Sheriff Paul Wimmer", news)
- `sam_steed_piute` — Sam Steed, Piute County Commission — no campaign site found (only notices, minutes, news)
- `paul_binns_lehi` — Paul Binns, Mayor, Lehi — campaign site binnsformayor.com (cited in Daily Herald Q&A) now shows "Squarespace - Website Expired" (404); no portrait available
- `tish_buroker_riverton` — Tish Buroker, Mayor, Riverton — campaign site tishformayor.com (linked from her campaign Facebook) now shows "Squarespace - Website Expired" (404); no portrait available
- `ranjeev_puri` — Ranjeev Puri, State House Democratic Leader — campaign site www.voteranjeev.com ("Vote Ranjeev for State Rep") serves all photos from CDN images.squarespace-cdn.com (ranjeevpuri.com is a Squarespace "Coming Soon" page)
- `nicole_cannizzaro` — Nicole Cannizzaro, State Senate Majority Leader — campaign site names a different office ("Nicole Cannizzaro for Attorney General", not State Senate Majority Leader); also serves images from CDN static.wixstatic.com
- `mike_johnston` — Mike Johnston, Mayor of Denver — campaign site ("Re-Elect Mike Johnston as Denver's Mayor") page imgs are only a family photo (bfam-1024x616.jpg) and a crowd shot (bcol-1024x616.jpg); only single-person image is og:image share card https://mikejohnstonformayor…
- `dan_bongino` — Dan Bongino, FBI Deputy Director — appointed official (FBI Deputy Director); no own campaign site for this office (bongino.com is his media business site, not a campaign site)
- `tom_homan` — Tom Homan, White House Border Czar — appointed official (White House Border Czar); no campaign site exists for this office
- `keith_kellogg` — Keith Kellogg, Special Envoy for Ukraine & Russia — appointed official (Special Envoy for Ukraine \& Russia); no campaign site exists for this office
- `marty_makary` — Marty Makary, FDA Commissioner — appointed official (FDA Commissioner); no campaign site exists for this office
- `jay_bhattacharya` — Jay Bhattacharya, NIH Director — appointed official (NIH Director); no campaign site exists for this office
- `brendan_carr` — Brendan Carr, FCC Chair — appointed official (FCC Chair); no campaign site exists for this office
- `witkoff` — Steve Witkoff, U.S. Special Envoy to the Middle East — appointed official (Special Envoy); no campaign site exists (witkoff.com is his real-estate business site)
- `stephen_miller` — Stephen Miller, White House Deputy Chief of Staff — appointed official (White House Deputy Chief of Staff); no campaign site exists for this office
- `gallrein` — Ed Gallrein, Republican Nominee — campaign site www.edgallrein.com ("Ed Gallrein for Congress") serves its portrait (alt "a portrait of ed gallrein") from CDN cdn.prod.website-files.com
- `susan_lee` — Susan Lee, Davis County Commission candidate — campaign site www.votesusanlee.com ("for Davis County Commissioner") serves its portrait from CDN images.squarespace-cdn.com (Susan+5787.jpg)
- `zach_bloxham` — Zach Bloxham, Layton City Council — campaign/personal site "Layton City Councilman Zach Bloxham" serves its only photo from CDN img1.wsimg.com (GoDaddy builder)
- `clint_morris` — Clint Morris, Layton City Council — campaign site electclintmorris.com ("Clint Morris For Layton City Council", found via search) no longer resolves (DNS ENOTFOUND); no image URL could be seen
- `tyson_roberts` — Tyson Roberts, Layton City Council — campaign domain tysonrobertsforlayton.com (listed on his Facebook) returns Wix "ConnectYourDomain Error" 404; no campaign page with portrait
- `brigit_gerrard` — Brigit Gerrard, Davis Board of Education · Precinct 4 (President) — campaign site brigitgerrard.com ("Vote Brigit Gerrard", per search/Vote411) no longer resolves (DNS ENOTFOUND); no image URL could be seen
- `michelle_barber` — Michelle Barber, Davis Board of Education · Precinct 5 — no campaign site found for Davis School Board Precinct 5 (only official district page, LinkedIn, and old Kaysville City Council social accounts)
- `kristen_hogan` — Kristen Hogan, Davis Board of Education · Precinct 6 — own campaign site ("Kristen Hogan for the Davis School Board"); only photo is img src https://hogan4schools.com/wp-content/uploads/2026/02/IMG_2377-1024x683.jpeg (empty alt, landscape 1024x683) but host returns 429 to curl so i…
- `chad_jensen` — Chad Jensen, Cache County Sheriff — no campaign site found for Cache County Sheriff (only county site, BallotReady, Utah Sheriffs Association, cachegop.com party site, news)
- `george_daines` — N. George Daines, Cache County Executive — no campaign site found for Cache County Executive (only news coverage, cachegop.com party site, county site)
- `mark_anderson_logan` — Mark Anderson, Mayor of Logan — campaign site makeyourmarkformayor.com ("Mark Anderson for Mayor", listed on state candidate filing) no longer resolves (DNS ENOTFOUND); no image URL could be seen
- `sandi_goodlander` — Sandi Goodlander, Cache County Council · Chair (Logan Seat #3) — no campaign site found for Cache County Council Seat 3 (only county site, UPR news profile, party/news coverage)
- `kathryn_beus` — Kathryn Beus, Cache County Council · Vice Chair (Southeast District) — no campaign site found; only campaign presence is Facebook page 'Kathryn Anhder Beus for Cache County Council' (social media); otherwise news (hjnews, upr.org) and Ballotpedia
- `david_erickson_cache` — David L. Erickson, Cache County Council · North District — no campaign site found; only news coverage (hjnews.com, cachevalleydaily.com) and cachecounty.gov
- `keegan_garrity` — Keegan Garrity, Cache County Council · Logan Seat #1 — no campaign site found; campaign activity via Facebook posts and news (cachevalleydaily.com, hjnews.com)
- `joann_bennett` — JoAnn Bennett, Cache County Council · Logan Seat #2 — no campaign site found; only news (cachevalleydaily.com, upr.org) and party site cachegop.com
- `mark_hurd` — Mark Hurd, Cache County Council · Northeast District — no campaign site found; only party profile cachegop.com (party site), cachecounty.gov and news
- `nolan_gunnell` — Nolan P. Gunnell, Cache County Council · South District — no campaign site found; only Facebook page 'Nolan Gunnell for Cache County Council' (social media), BallotReady and news
- `teri_rhodes` — Teri Rhodes, Cache County School Board · President (District 7) — no campaign site found; only Ballotpedia and news (hjnews.com, cachevalleydaily.com)
- `brian_chambers` — Brian Chambers, Cache County School Board · District 1 — no campaign site found; only ccsdut.org (school district), Ballotpedia and news (hjnews.com)
- `roger_pulsipher` — Roger Pulsipher, Cache County School Board · District 2 — no campaign site found; only Ballotpedia and news (hjnews.com, cachevalleydaily.com)
- `randall_bagley` — Randall Bagley, Cache County School Board · District 4 — no campaign site found; only ccsdut.org (school district), Ballotpedia and news (cachevalleydaily.com, hjnews.com)
- `d_jeffrey_nielsen` — D. Jeffrey Nielsen, Cache County School Board · District 3 — no campaign site found; only ccsdut.org (school district), BoardDocs and news (hjnews.com)
- `allen_grunig` — Allen Grunig, Cache County School Board · District 5 — no campaign site found; only ccsdut.org (school district), Ballotpedia and news (hjnews.com)
- `kathy_christiansen` — Kathy Christiansen, Cache County School Board · Vice President (District 6) — no campaign site found; only aggregators (goodparty.org, Ballotpedia, vote411) and ccsdut.org
- `becky_quay` — Becky Quay, Logan City School Board · President (District 4) — no campaign site found; only news (hjnews.com) and loganschools.org
- `cole_checketts` — Cole Checketts, Logan City School Board · District 5 — no campaign site found; only news (hjnews.com, cachevalleydaily.com), vote411 and cachecounty.gov ballot
- `russell_fisher` — Russell Fisher, Logan City School Board · District 3 (interim) — no campaign site found; interim appointee; only news (hjnews.com), loganschools.org and loganschoolsfoundation.org
- `katie_chapman` — Katie Chapman, Logan City School Board · District 1 — no campaign site found; only news (hjnews.com) and loganschools.org
- `frank_stewart` — Frank Stewart, Logan City School Board · Vice President (District 2) — no campaign site found; ran unopposed; only news (hjnews.com, cachevalleydaily.com) and utah.gov minutes
- `lyman` — Phil Lyman, U.S. House Candidate (UT-3) — campaign site lymanforutah.com ('Phil Lyman for Congress 2026 — Utah CD3') is a JS-rendered SPA; page HTML has no img tags (only og:image on campaign-navigator-PhilLyman.replit.app); JS bundle asset filenames include no identif…
- `nhaley` — Nikki Haley, Former UN Ambassador — former campaign site nikkihaley.com now 301-redirects to standforamericapac.com (a PAC, not her own campaign site; curl gets Cloudflare 403); no active own campaign site
- `dballard` — Derek Ballard, U.S. House Candidate — cannot identify person: no 'Derek Ballard' found in UT-1 2026 field (Ballotpedia/KUER lists McAdams, Owen, West, Montgomery, Darvish); no campaign site found
- `jjohnson` — Jen Johnson, U.S. House Candidate — cannot identify person: no 'Jen Johnson' in UT-4 2026 field (Ballotpedia); only a 2014 Jennifer Johnson who withdrew; no campaign site found
- `rodric_bray` — Rodric Bray, Indiana State Senator — campaign site (paid for by 'Rodric D Bray for State Senate', 'President Pro Tempore of the Indiana State Senate') has no single portrait: same-host photos (200 image/jpeg) are family shot 1_inset15.jpg, group with sheriffs 1_in…
- `shelli_yoder` — Shelli Yoder, Indiana State Senator — campaign site www.shelliyoder.com ('Shelli Yoder for State Senate') serves its images from CDN images.squarespace-cdn.com (alt-less 2048px background photos, not verified as single portraits)
- `stephen_harding` — Stephen Harding, Connecticut State Senator — no own campaign website found; campaign presence is only Facebook page 'Harding 26' (@HardingforSenate, social media); SenatorHarding.com/ctsenaterepublicans.com are caucus/official sites
<!-- /person-photos-wave-1b -->

<!-- person-photos-wave-1c -->
## Person photos, wave 1c — a campaign page's builder-CDN portrait, and the one disclosure

Searched 2026-10-11 for the 106 roster rows still painting the building after wave 1b. The 26 rows whose wave 1b reason named a campaign site (one served by a builder CDN, expired, unreachable, or rendered by script) were re-opened; the other 80 had no campaign site of their own and keep their wave 1b reason. An official .gov / .us portrait stays preferred, an own-domain campaign portrait stays preferred over a CDN one, and no stored portrait was replaced. A portrait was stored only when all of these held: the page is the person's own campaign site; it names the same person and the same office or candidacy; the image is one single portrait; and the image is embedded on that campaign page, its file on the campaign domain or that site's builder CDN (Squarespace, Wix, GoDaddy, Webflow, Revize). Nothing came from a news site, a party page, social media or a page that is not the person's own campaign, and no URL was composed or edited.

**The disclosure.** Every face from a campaign site — the eight from wave 1b and the five below — is marked `photoSource: "campaign"` on its roster row. The person file and the share card print one line under that face: "Campaign photo · not an official portrait." An official face prints nothing, and the GitHub (unitedstates/images) and Wikimedia portraits print nothing. The line is a sentence, never a score or a confidence number; it is not drawn under a monogram.

**The proxy.** A builder CDN serves every customer's files, so each one is admitted to netlify.toml `remote_images` only at the folder of the one campaign site its face came from, never the CDN's whole host.

### Counts

- Rows searched: 106 (26 re-opened)
- Gained a campaign portrait: 5 (1 on the campaign domain, 4 on the site's builder CDN)
- Kept the building: 101
- Rows carrying the disclosure (waves 1b + 1c): 13

### Gained a campaign portrait

- `jimmie_hughes_stg` — Jimmie Hughes, Mayor, St. George — campaign page https://www.jimmiehughes.com/ — image host `images.squarespace-cdn.com` — https://images.squarespace-cdn.com/content/v1/6800129a1f658e75e6dce7f7/33ae6ca9-82fd-4678-8b5c-41f6b061f985/1000014502.jpg — Own campaign site, title "Jimmie Hughes for St. George Mayor"; URL appears verbatim in page img data-src/data-image (same file is site og:image); viewed: single head-and-shoulders portrait of smiling man in light blue shirt, tr…
- `ranjeev_puri` — Ranjeev Puri, State House Democratic Leader — campaign page https://www.voteranjeev.com/ — image host `images.squarespace-cdn.com` — https://images.squarespace-cdn.com/content/v1/5d3cf8b93d78b80001676ada/1574304638076-ACNG792CY0O672H8CX7V/_29A1989.jpg — own Squarespace campaign site 'Vote Ranjeev for State Rep', which says colleagues elected him 'the Democratic Leader for the 103rd Michigan Legislature'; img src verbatim in homepage HTML (alt '_29A1989.jpg'); viewed: single ou…
- `gallrein` — Ed Gallrein, Republican Nominee — campaign page https://www.edgallrein.com/ — image host `cdn.prod.website-files.com` — https://cdn.prod.website-files.com/687e8388e36137e01e4ad24f/68f50cbc33480946aa776f43_03adfdf55e5823f3386e146e8e0d9241_gallrein-portrait_cutout.webp — own Webflow campaign site, title 'Ed Gallrein for Congress' ('Ed Gallrein FOR CONGRESS ... Thomas Massie is ...', 'Paid for by Gallrein For Congress') = his KY-04 congressional candidacy; img src verbatim in homepage HTML, alt …
- `susan_lee` — Susan Lee, Davis County Commission candidate — campaign page https://www.votesusanlee.com/ — image host `images.squarespace-cdn.com` — https://images.squarespace-cdn.com/content/v1/68afb2778a70ca0e13b99b93/dceb7392-2e07-445c-b596-fc0c1f4db111/Susan+5787.jpg — own Squarespace campaign site; page text 'Susan Lee for Davis County Commissioner' and video 'Susan Lee for Davis County Commission'; img src verbatim in homepage HTML (alt 'Susan 5787.jpg'); viewed: single outdoor portrait of …
- `kristen_hogan` — Kristen Hogan, Davis Board of Education · Precinct 6 — campaign page https://hogan4schools.com/about-kristin/ — image host `hogan4schools.com` — https://hogan4schools.com/wp-content/uploads/2026/02/7Z6A8648-2-1-677x1024.jpg — own WordPress campaign site hogan4schools.com (homepage: 'Kristen Hogan for the Davis School Board', form 'School Board District 6'; About page: '4 years service on Davis Board of Education'); homepage IMG_2377 is a family grou…

### Kept the building, and why

- `eleni_kounalakis` — Eleni Kounalakis, Lieutenant Governor — campaign site eleniforca.com is for a different candidacy (Treasurer), and its only image of her is a frame from a campaign video, not a portrait
- `treg_taylor` — Treg Taylor, State Attorney General — own campaign site "Treg Taylor for Alaska Governor" (mentions "As Attorney General"); images of Treg are family group photo (Treg-1.jpg) and couple photo with wife (treg-2.jpg); no single portrait
- `lynn_fitch` — Lynn Fitch, State Attorney General — Own campaign site https://www.lynnfitchforms.com/ (title "Lynn Fitch for Governor"; text "As Attorney General, I:") embeds only scene photos on Squarespace CDN: podium rally at SCOTUS with "EMPOWER WOMEN" signs (SCOTUS+120121.w…
- `heidi_hammond_grantsville` — Heidi Hammond, Mayor, Grantsville — no campaign site found (only news/election-results pages)
- `monica_zoltanski_sandy` — Monica Zoltanski, Mayor, Sandy — votemonicaz.com is "Squarespace - Website Expired" (404); old site voteformonica.com (WordPress, own domain) embeds only Monica-Z_Web_Banner.png text banner, Yard-Sign_JPG.png and 39px social icons; no portrait
- `mark_shepherd_clearfield` — Mark Shepherd, Mayor, Clearfield — iloveclearfield.com / www.iloveclearfield.com and voteshepherd.com / www.voteshepherd.com fail to connect via curl (code 000 / 409); no page or image verifiable
- `greg_miles_duchesne` — Greg Miles, Duchesne County Commission — no campaign site found (only county pages/news)
- `jordan_leonard_emery` — Jordan Leonard, Emery County Commission — jordanforemery.com and www.jordanforemery.com do not resolve (DNS failure); no page or image verifiable
- `mary_mcgann_grand` — Mary McGann, Grand County Commission — no campaign site found (not seeking reelection 2026; only county/news pages)
- `dean_draper_millard` — Dean Draper, Millard County Commission — no campaign site found (only county documents/news)
- `lori_maughan_sanjuan` — Lori Maughan, San Juan County Commission (Chair) — no campaign site found (only county pages/minutes and San Juan Record news)
- `trevor_olsen_blanding` — Trevor Olsen, Mayor, Blanding — no campaign site found (appointed mayor Dec 2024, resigned Aug 2026; only city/news pages)
- `kevin_dunn_monticello` — Kevin Dunn, Mayor, Monticello — no campaign site found (candidate statement only on city site monticelloutah.org and San Juan Record news)
- `john_laursen_uintah` — John Laursen, Uintah County Commission (Chair) — no campaign site found (only Ballotpedia/county/news pages)
- `sonja_norton_uintah` — Sonja Norton, Uintah County Commission — votesonjanorton.com and www. variant do not resolve (DNS failure); no page or image verifiable
- `willis_lefevre_uintah` — Willis LeFevre, Uintah County Commission — no campaign site found (only utgop.org party page, Ballotpedia, news)
- `steve_labrum_uintah` — Steve Labrum, Uintah County Sheriff — no campaign site found (only YouTube/Facebook videos and news)
- `terry_willis_price` — Terry Willis, Mayor, Price — no campaign site found (only news/city pages and Facebook)
- `lenise_peterman_helper` — Lenise Peterman, Mayor, Helper — mayorlenise.com redirects to www.mayorlenise.com which shows "Squarespace - Website Expired" (404); no portrait verifiable
- `jeff_wood_carbon` — Jeff Wood, Carbon County Sheriff — no campaign site found (only news pages; retiring 2026)
- `larry_jensen_carbon` — Larry Jensen, Carbon County Commission — no campaign site found (only county pages, YouTube, news)
- `jared_buchanan_sanpete` — Jared Buchanan, Sanpete County Sheriff — no campaign site found (only Facebook page "Jared Buchanan for Sanpete County Sheriff" and news)
- `john_scott_ephraim` — John Scott, Former Mayor, Ephraim — no campaign site found (former mayor, appointed 2019/uncontested 2021; only city documents/news)
- `greg_jensen_sevier` — Greg Jensen, Sevier County Commission — Own Wix site (text "Greg has served as Sevier County Commissioner since January 2023") but embedded images viewed are not single portraits: man typing at office desk (IMG_9070), rider on horseback from behind (IMG_0235), man pu…
- `nathan_curtis_sevier` — Nathan Curtis, Sevier County Sheriff — no campaign site found (only sheriff office site scsoutah.com, Utah Sheriffs Association, X, news)
- `bryan_burrows_richfield` — Bryan Burrows, Mayor, Richfield — no campaign site found (only Facebook page facebook.com/mayorbryanburrows, social media)
- `clint_painter_juab` — Clint Painter, Juab County Commission (Chair) — no campaign site found (only SUU story, news, LinkedIn)
- `douglas_anderson_juab` — Douglas Anderson, Juab County Sheriff — no campaign site found (only Ballotpedia, juabsheriff.org office site, news); retired May 2026
- `linda_hanks_juab` — Linda Hanks, Juab School District Board (President) — Own site "Linda Hanks for State Board" (names "As President of the Juab School Board") but its only person photo, LindaUSBE-35_websize.jpg on Squarespace CDN, viewed: woman standing between two young men (family/group photo), n…
- `colten_johnson_kanab` — T. Colten Johnson, Mayor, Kanab — no campaign site found (only kanab.utah.gov directory, minutes, sunews.net, kanabchamber.org)
- `eric_houston_garfield` — Eric Houston, Garfield County Sheriff — no campaign site found (only news coverage stgeorgeutah.com/insiderutah.com/utahbyway.com and utahsheriffs.org)
- `kim_soper_panguitch` — Kim Soper, Mayor, Panguitch — no campaign site found (only panguitchutah.gov minutes/directory)
- `matt_wilson_morgan` — Matt Wilson, Morgan County Commission (Chair) — no campaign site found (only county site, minutes, news); common name
- `blaine_fackrell_morgan` — Blaine Fackrell, Morgan County Commission — www.blaine4morgan.com and blaine4morgan.com return HTTP 404 "Not found: www.blaine4morgan.com" to curl; no image verifiable
- `corey_stark_morgan` — Corey Stark, Morgan County Sheriff — no campaign site found (only Ballotpedia, utahsheriffs.org, county candidate list)
- `steve_gale_morgan` — Steve Gale, Mayor, Morgan City — no campaign site found (only morganutah.gov agendas/minutes, WFRC, Wikipedia)
- `gaylene_adams_morgan` — Gaylene Adams, Morgan School District Board (President) — no campaign site found (only morgansd.org district page, change.org, news)
- `pat_argyle_gardencity` — Pat Argyle, Mayor, Garden City — no campaign site found (appointed interim mayor May 2026; only gardencityut.us town site, abc4 news, minutes)
- `dennis_blackburn_wayne` — Dennis Blackburn, Wayne County Commission (Chair) — no campaign site found (only LinkedIn, waynecountyfire.org, news)
- `roger_brian_wayne` — Roger Brian, Wayne County Commission — no campaign site found (only utah.gov notices, insiderutah.com news)
- `micah_gulley_wayne` — Micah Gulley, Wayne County Sheriff — no campaign site found (only utahsheriffs.org, colorcountryanimalwelfare.org, sb54.info, news)
- `mickey_wright_torrey` — Mickey Wright, Mayor, Torrey — no campaign site found (only torreyutah.gov member page, news; name shared with golfer)
- `marty_gleave_piute` — Marty Gleave, Piute County Sheriff — no campaign site found (only LinkedIn, news, directories)
- `barry_golding_washco` — Barry Golding, Washington County Sheriff (interim) — no campaign site found (interim chosen by party; only wcrputah.com party page and news)
- `clark_fawcett_hurricane` — Clark Fawcett, Mayor, Hurricane — no campaign site found (only news coverage, saveutah.org questionnaire, cityofhurricane.com)
- `nanette_billings_hurricane` — Nanette Billings, Former Mayor, Hurricane — www.nanettebillings.com and nanettebillings.com do not resolve (DNS failure); no image verifiable
- `jarett_waite_santaclara` — Jarett Waite, Mayor, Santa Clara — no campaign site found (only council agendas and stgeorgeutah.com news)
- `barbara_bruno_springdale` — Barbara Bruno, Mayor, Springdale — no campaign site found (only springdale.utah.gov, news, YouTube)
- `jared_hamner_tooele` — Jared Hamner, Tooele County Council (Chair) — no campaign site found (only tooeleco.gov, BallotReady, news)
- `scott_wardle_tooele` — Scott Wardle, Tooele County Council (Vice Chair) — no campaign site found (only utgop.org party page, tooeleco.gov, Vote Smart, news)
- `kendall_thomas_tooele` — Kendall Thomas, Tooele County Council — no campaign site found (only tooeleco.gov, news)
- `tye_hoffmann_tooele` — Tye Hoffmann, Tooele County Council — no campaign site found (only Facebook page, tooeleco.gov, election archive, news)
- `erik_stromberg_tooele` — Erik Stromberg, Tooele County Council — www.erik4tooelecounty.com and erik4tooelecounty.com do not resolve (DNS failure); no image verifiable
- `paul_wimmer_tooele` — Paul Wimmer, Tooele County Sheriff — no campaign site found (only Facebook page "Re-Elect Sheriff Paul Wimmer", news)
- `sam_steed_piute` — Sam Steed, Piute County Commission — no campaign site found (only notices, minutes, news)
- `paul_binns_lehi` — Paul Binns, Mayor, Lehi — binnsformayor.com redirects to www.binnsformayor.com showing "Squarespace - Website Expired" (404); no portrait available
- `tish_buroker_riverton` — Tish Buroker, Mayor, Riverton — campaign site tishformayor.com redirects to www and returns 404 'Squarespace - Website Expired' (rechecked 2026-10-11); no live campaign page or embedded portrait
- `nicole_cannizzaro` — Nicole Cannizzaro, State Senate Majority Leader — campaign site nicolecannizzaro.com is for a different candidacy (Attorney General); the row office is named only on another page, and the only portrait URL in the page HTML is a blurred Wix thumbnail — the full-size file is not…
- `mike_johnston` — Mike Johnston, Mayor of Denver — campaign site ("Re-Elect Mike Johnston as Denver's Mayor") page imgs are only a family photo (bfam-1024x616.jpg) and a crowd shot (bcol-1024x616.jpg); only single-person image is og:image share card https://mikejohnstonformayor…
- `dan_bongino` — Dan Bongino, FBI Deputy Director — appointed official (FBI Deputy Director); no own campaign site for this office (bongino.com is his media business site, not a campaign site)
- `tom_homan` — Tom Homan, White House Border Czar — appointed official (White House Border Czar); no campaign site exists for this office
- `keith_kellogg` — Keith Kellogg, Special Envoy for Ukraine & Russia — appointed official (Special Envoy for Ukraine \& Russia); no campaign site exists for this office
- `marty_makary` — Marty Makary, FDA Commissioner — appointed official (FDA Commissioner); no campaign site exists for this office
- `jay_bhattacharya` — Jay Bhattacharya, NIH Director — appointed official (NIH Director); no campaign site exists for this office
- `brendan_carr` — Brendan Carr, FCC Chair — appointed official (FCC Chair); no campaign site exists for this office
- `witkoff` — Steve Witkoff, U.S. Special Envoy to the Middle East — appointed official (Special Envoy); no campaign site exists (witkoff.com is his real-estate business site)
- `stephen_miller` — Stephen Miller, White House Deputy Chief of Staff — appointed official (White House Deputy Chief of Staff); no campaign site exists for this office
- `zach_bloxham` — Zach Bloxham, Layton City Council — own GoDaddy site 'Layton City Councilman Zach Bloxham' ('an honor to represent you on the Layton City Council') matches office, but its only photo (img1.wsimg.com .../bloxham-129.jpg, verbatim in srcset) is a family group photo…
- `clint_morris` — Clint Morris, Layton City Council — campaign domain electclintmorris.com (and www.) does not resolve (curl 000, DNS failure); no live campaign page to take an embedded image from
- `tyson_roberts` — Tyson Roberts, Layton City Council — campaign domain tysonrobertsforlayton.com returns 404 Wix 'ConnectYourDomain Error'; no live campaign page with portrait
- `brigit_gerrard` — Brigit Gerrard, Davis Board of Education · Precinct 4 (President) — campaign domain brigitgerrard.com (and www.) does not resolve (curl 000, DNS failure); no live campaign page
- `michelle_barber` — Michelle Barber, Davis Board of Education · Precinct 5 — no campaign site found for Davis School Board Precinct 5 (only official district page, LinkedIn, and old Kaysville City Council social accounts)
- `chad_jensen` — Chad Jensen, Cache County Sheriff — no campaign site found for Cache County Sheriff (only county site, BallotReady, Utah Sheriffs Association, cachegop.com party site, news)
- `george_daines` — N. George Daines, Cache County Executive — no campaign site found for Cache County Executive (only news coverage, cachegop.com party site, county site)
- `mark_anderson_logan` — Mark Anderson, Mayor of Logan — campaign domain makeyourmarkformayor.com (and www.) does not resolve (curl 000, DNS failure); no live campaign page
- `sandi_goodlander` — Sandi Goodlander, Cache County Council · Chair (Logan Seat #3) — no campaign site found for Cache County Council Seat 3 (only county site, UPR news profile, party/news coverage)
- `kathryn_beus` — Kathryn Beus, Cache County Council · Vice Chair (Southeast District) — no campaign site found; only campaign presence is Facebook page 'Kathryn Anhder Beus for Cache County Council' (social media); otherwise news (hjnews, upr.org) and Ballotpedia
- `david_erickson_cache` — David L. Erickson, Cache County Council · North District — no campaign site found; only news coverage (hjnews.com, cachevalleydaily.com) and cachecounty.gov
- `keegan_garrity` — Keegan Garrity, Cache County Council · Logan Seat #1 — no campaign site found; campaign activity via Facebook posts and news (cachevalleydaily.com, hjnews.com)
- `joann_bennett` — JoAnn Bennett, Cache County Council · Logan Seat #2 — no campaign site found; only news (cachevalleydaily.com, upr.org) and party site cachegop.com
- `mark_hurd` — Mark Hurd, Cache County Council · Northeast District — no campaign site found; only party profile cachegop.com (party site), cachecounty.gov and news
- `nolan_gunnell` — Nolan P. Gunnell, Cache County Council · South District — no campaign site found; only Facebook page 'Nolan Gunnell for Cache County Council' (social media), BallotReady and news
- `teri_rhodes` — Teri Rhodes, Cache County School Board · President (District 7) — no campaign site found; only Ballotpedia and news (hjnews.com, cachevalleydaily.com)
- `brian_chambers` — Brian Chambers, Cache County School Board · District 1 — no campaign site found; only ccsdut.org (school district), Ballotpedia and news (hjnews.com)
- `roger_pulsipher` — Roger Pulsipher, Cache County School Board · District 2 — no campaign site found; only Ballotpedia and news (hjnews.com, cachevalleydaily.com)
- `randall_bagley` — Randall Bagley, Cache County School Board · District 4 — no campaign site found; only ccsdut.org (school district), Ballotpedia and news (cachevalleydaily.com, hjnews.com)
- `d_jeffrey_nielsen` — D. Jeffrey Nielsen, Cache County School Board · District 3 — no campaign site found; only ccsdut.org (school district), BoardDocs and news (hjnews.com)
- `allen_grunig` — Allen Grunig, Cache County School Board · District 5 — no campaign site found; only ccsdut.org (school district), Ballotpedia and news (hjnews.com)
- `kathy_christiansen` — Kathy Christiansen, Cache County School Board · Vice President (District 6) — no campaign site found; only aggregators (goodparty.org, Ballotpedia, vote411) and ccsdut.org
- `becky_quay` — Becky Quay, Logan City School Board · President (District 4) — no campaign site found; only news (hjnews.com) and loganschools.org
- `cole_checketts` — Cole Checketts, Logan City School Board · District 5 — no campaign site found; only news (hjnews.com, cachevalleydaily.com), vote411 and cachecounty.gov ballot
- `russell_fisher` — Russell Fisher, Logan City School Board · District 3 (interim) — no campaign site found; interim appointee; only news (hjnews.com), loganschools.org and loganschoolsfoundation.org
- `katie_chapman` — Katie Chapman, Logan City School Board · District 1 — no campaign site found; only news (hjnews.com) and loganschools.org
- `frank_stewart` — Frank Stewart, Logan City School Board · Vice President (District 2) — no campaign site found; ran unopposed; only news (hjnews.com, cachevalleydaily.com) and utah.gov minutes
- `lyman` — Phil Lyman, U.S. House Candidate (UT-3) — lymanforutah.com ('Phil Lyman for Congress 2026 — Utah CD3') is a JS SPA; fetched page HTML contains no img/background image URLs (images only referenced inside JS bundle /assets/index-CN3PmnAN.js, none verbatim in page HTML, n…
- `nhaley` — Nikki Haley, Former UN Ambassador — former campaign site nikkihaley.com now 301-redirects to standforamericapac.com (a PAC, not her own campaign site; curl gets Cloudflare 403); no active own campaign site
- `dballard` — Derek Ballard, U.S. House Candidate — cannot identify person: no 'Derek Ballard' found in UT-1 2026 field (Ballotpedia/KUER lists McAdams, Owen, West, Montgomery, Darvish); no campaign site found
- `jjohnson` — Jen Johnson, U.S. House Candidate — cannot identify person: no 'Jen Johnson' in UT-4 2026 field (Ballotpedia); only a 2014 Jennifer Johnson who withdrew; no campaign site found
- `rodric_bray` — Rodric Bray, Indiana State Senator — campaign site (paid for by 'Rodric D Bray for State Senate', 'President Pro Tempore of the Indiana State Senate') has no single portrait: same-host photos (200 image/jpeg) are family shot 1_inset15.jpg, group with sheriffs 1_in…
- `shelli_yoder` — Shelli Yoder, Indiana State Senator — own Squarespace site 'Shelli Yoder for State Senate' ('Our State Senator') matches office, but every embedded image (homepage image1/image0(1)/image4/image0(2)/4074.jpg and About page image1(1).jpeg) was viewed and is a candid …
- `stephen_harding` — Stephen Harding, Connecticut State Senator — no own campaign website found; campaign presence is only Facebook page 'Harding 26' (@HardingforSenate, social media); SenatorHarding.com/ctsenaterepublicans.com are caucus/official sites
<!-- /person-photos-wave-1c -->

<!-- person-photos-wave-1d -->
## Person photos, wave 1d — the same person whatever the office, and their own Facebook Page

Searched 2026-10-11 for the 101 roster rows still painting the building after wave 1c. No stored portrait was replaced. The order of preference held: a .gov / .us face, then an own-domain campaign face, then a builder-CDN face embedded on the campaign page, then a Facebook Page profile photo.

**Campaign sites.** A site now counts when it is the person's own and is about that same person, whatever office or candidacy it names (Nicole Cannizzaro's Attorney General site serves her State Senate row). The image is still one single portrait embedded on that page. Cannizzaro's page embeds a Wix resize of her portrait; the stored address is the bare file of that same media id on the same host, which returns the image.

**Facebook.** A Facebook Page counted only when it is the person's own Page (not a fan page, group, news post, party or government page), the Page names them as running for or holding the seat, and its profile photo is a single portrait (viewed; default silhouettes, logos, couples and groups were refused). The stored address is `https://graph.facebook.com/<page>/picture?type=large`, Facebook's endpoint for that Page's current profile photo; the fbcdn file address it redirects to is signed and expires, so it is never stored. Each Page is pinned in netlify.toml `remote_images`, never the Graph host as a whole.

**The disclosure.** A Facebook face is marked `photoSource: "facebook"` and prints "Facebook photo · not an official portrait." under it on the person file and the share card; a campaign face prints "Campaign photo · not an official portrait."; an official face prints nothing. The line is a sentence, never a score.

### Counts

- Rows searched: 101
- Gained a portrait: 25 (campaign site 4, Facebook Page 21)
- Kept the building: 76

### Gained a portrait

- `eleni_kounalakis` — Eleni Kounalakis, Lieutenant Governor — source: own Facebook Page — page https://www.facebook.com/EleniKounalakis/ — image host `graph.facebook.com` — https://graph.facebook.com/EleniKounalakis/picture?type=large — Own Facebook Page "Eleni Kounalakis" (politician page; bio "California Lieutenant Governor. Wife & Mom..."; links eleniforca.com; Wikidata FB username EleniKounalakis); graph picture 302->fbcdn 200 image/jpeg; viewed: single portrait of …
- `lynn_fitch` — Lynn Fitch, State Attorney General — source: own Facebook Page — page https://www.facebook.com/lynnfitchag/ — image host `graph.facebook.com` — https://graph.facebook.com/lynnfitchag/picture?type=large — Her own officeholder Facebook Page "Attorney General Lynn Fitch" ("the official page for the Attorney General of Mississippi", Government Official page); campaign Page LynnFitchforMS profile photo is a stage/podium scene so not used; gra…
- `monica_zoltanski_sandy` — Monica Zoltanski, Mayor, Sandy — source: own Facebook Page — page https://www.facebook.com/MayorZoltanski/ — image host `graph.facebook.com` — https://graph.facebook.com/MayorZoltanski/picture?type=large — Her own officeholder Facebook Page og:title "Sandy Mayor Monica Zoltanski" ("Official Sandy City page for Mayor Monica Zoltanski"; her campaign Page VoteMonicaZ points to it; that campaign Page profile photo is a crowd scene so not used)…
- `mark_shepherd_clearfield` — Mark Shepherd, Mayor, Clearfield — source: own Facebook Page — page https://www.facebook.com/MayorShepherd/ — image host `graph.facebook.com` — https://graph.facebook.com/MayorShepherd/picture?type=large — Own Facebook Page og:title "Mayor Mark Shepherd" ("Your place to read about and discuss city issues... talk to Mayor Shepherd"; Page contact email mark.shepherd@clearfieldcity.org and phone 801-540-0348 match Clearfield City council page…
- `jordan_leonard_emery` — Jordan Leonard, Emery County Commission — source: own Facebook Page — page https://www.facebook.com/jordanforemery/ — image host `graph.facebook.com` — https://graph.facebook.com/jordanforemery/picture?type=large — Own Facebook Page "Jordan Leonard, Emery County Commissioner" (Politician page; linked from Ballotpedia as his campaign Facebook); graph picture 302->fbcdn 200 image/jpeg; viewed: single head-and-shoulders portrait of smiling man in ligh…
- `lenise_peterman_helper` — Lenise Peterman, Mayor, Helper — source: own Facebook Page — page https://www.facebook.com/helpermayorcandidate/ — image host `graph.facebook.com` — https://graph.facebook.com/helpermayorcandidate/picture?type=large — Own Facebook Page "Lenise Peterman Helper City Mayor" (Political Candidate page; intro: candidate for Helper City Mayor; contact mayor@helpercity.net); graph picture 302->fbcdn 200 image/jpeg; viewed: single full-length portrait of short…
- `jared_buchanan_sanpete` — Jared Buchanan, Sanpete County Sheriff — source: own Facebook Page — page https://www.facebook.com/BuchananforSheriff/ — image host `graph.facebook.com` — https://graph.facebook.com/BuchananforSheriff/picture?type=large — Own Facebook Page titled "Jared Buchanan for Sanpete County Sheriff" (Political Candidate; intro "I am excited for the opportunity to serve Sanpete County as Sheriff"; linked from Sanpete GOP candidate page); graph picture 302->fbcdn 200…
- `bryan_burrows_richfield` — Bryan Burrows, Mayor, Richfield — source: own Facebook Page — page https://www.facebook.com/mayorbryanburrows — image host `graph.facebook.com` — https://graph.facebook.com/mayorbryanburrows/picture?type=large — Own Facebook Page og:title "Richfield City Mayor Bryan L. Burrows" ("Mayor of beautiful Richfield City, Utah"); graph picture 302->fbcdn 200 image/jpeg; viewed: single head-and-shoulders portrait of gray-haired mustached man with glasses…
- `linda_hanks_juab` — Linda Hanks, Juab School District Board (President) — source: own campaign site — page https://www.linda4stateschoolboard.com/ — image host `images.squarespace-cdn.com` — https://images.squarespace-cdn.com/content/v1/6955f98c1710ce7f393441a8/4034b7a9-907d-4906-9d86-1150514108e3/LindaUSBE-27.jpg — Own Squarespace campaign site "Linda Hanks for State Board" (text "As President of the Juab School Board"); URL appears verbatim in home page HTML as assetUrl in a block data-config-thumbnail attribute; curl 200 image/*; viewed: single p…
- `jarett_waite_santaclara` — Jarett Waite, Mayor, Santa Clara — source: own campaign site — page https://jarettwaite.com/ — image host `jarettwaite.com` — https://jarettwaite.com/wp-content/uploads/2025/06/PXL_20250602_214928373-scaled-e1750450530164-1024x958.jpg — own campaign site titled "Elect Jarett Waite For Santa Clara Mayor"; image is img src verbatim in page HTML, 200 image/jpeg; viewed: single man in red Santa Clara City polo smiling at camera while signing filing papers at city counter, o…
- `tye_hoffmann_tooele` — Tye Hoffmann, Tooele County Council — source: own Facebook Page — page https://www.facebook.com/Tye-Hoffmann-Tooele-County-Council-102581704931992 — image host `graph.facebook.com` — https://graph.facebook.com/102581704931992/picture?type=large — own Facebook Page "Tye Hoffmann - Tooele County Council" ("I am Tye Hoffmann, a Republican Candidate for Tooele County Council District 3"); profile photo 302->fbcdn 200 image/jpeg, viewed: single man (Hoffmann) outdoors holding his own …
- `paul_wimmer_tooele` — Paul Wimmer, Tooele County Sheriff — source: own Facebook Page — page https://www.facebook.com/Wimmerforsheriff/ — image host `graph.facebook.com` — https://graph.facebook.com/Wimmerforsheriff/picture?type=large — own Facebook Page "Re-Elect Sheriff Paul Wimmer" (Tooele County Sheriff campaign page); profile photo 302->fbcdn 200 image/jpeg, viewed: single portrait of man in Tooele County Sheriff uniform
- `tish_buroker_riverton` — Tish Buroker, Mayor, Riverton — source: own Facebook Page — page https://www.facebook.com/tishforcitycouncil/ — image host `graph.facebook.com` — https://graph.facebook.com/tishforcitycouncil/picture?type=large — own Facebook Page "Tish Buroker" (facebook.com/tishforcitycouncil, her Riverton City Council campaign Page) whose intro directs visitors "for more information about her mayoral campaign" to her profile; profile photo 302->fbcdn 200 image…
- `nicole_cannizzaro` — Nicole Cannizzaro, State Senate Majority Leader — source: own campaign site — page https://www.nicolecannizzaro.com/ — image host `static.wixstatic.com` — https://static.wixstatic.com/media/c3bab2_cc79f867712640cbbe8a14575457d6f9~mv2.png — own campaign site "Nicole Cannizzaro for Attorney General" ("Nicole Cannizzaro is a lifelong Nevadan, a prosecutor, and a State Senator"); page HTML has img src https://static.wixstatic.com/media/c3bab2_cc79f867712640cbbe8a14575457d6f9~m…
- `mike_johnston` — Mike Johnston, Mayor of Denver — source: own Facebook Page — page https://www.facebook.com/MikeJohnstonCO/ — image host `graph.facebook.com` — https://graph.facebook.com/MikeJohnstonCO/picture?type=large — campaign site mikejohnstonformayor.com page images are only a family photo and a crowd shot, so used his own Facebook Page "Mike Johnston" ("Mayor of Denver personal account. Husband & dad. Former teacher, principal & state senator."; a …
- `zach_bloxham` — Zach Bloxham, Layton City Council — source: own Facebook Page — page https://www.facebook.com/ZachForLayton/ — image host `graph.facebook.com` — https://graph.facebook.com/ZachForLayton/picture?type=large — own campaign site zachbloxham.com only has a family group photo, so used own Facebook Page "Councilman Zach Bloxham" ("Honored to serve the residents of Layton", website zachbloxham.com); profile photo 302->fbcdn 200 image/jpeg, viewed: …
- `clint_morris` — Clint Morris, Layton City Council — source: own Facebook Page — page https://www.facebook.com/morris4layton/ — image host `graph.facebook.com` — https://graph.facebook.com/morris4layton/picture?type=large — campaign domain electclintmorris.com is NXDOMAIN; own Facebook Page "Councilman Clint Morris" ("It's an honor to serve you and your families as a member of the Layton City Council"); profile photo 302->fbcdn 200 image/jpeg, viewed: singl…
- `brigit_gerrard` — Brigit Gerrard, Davis Board of Education · Precinct 4 (President) — source: own Facebook Page — page https://facebook.com/Brigit-Gerrard-for-Davis-County-School-Board-District-4-294194887622327 — image host `graph.facebook.com` — https://graph.facebook.com/294194887622327/picture?type=large — campaign domain brigitgerrard.com is NXDOMAIN; own Facebook Page "Brigit Gerrard for Davis County School Board District 4" ("Vote Brigit Gerrard - Davis County School Board District 4!"); profile photo 302->fbcdn 200 image/jpeg, viewed: …
- `sandi_goodlander` — Sandi Goodlander, Cache County Council · Chair (Logan Seat #3) — source: own campaign site — page https://www.sandi4cache.com/ — image host `images.squarespace-cdn.com` — https://images.squarespace-cdn.com/content/v1/6a42f4262a75602cd7bd12dd/4a0e7e6c-6107-4e9b-a147-fe785aa17b5b/Mike+Johnson+Photo+%2B+Video-05440+%281%29.jpg — Own Squarespace campaign site sandi4cache.com, title/og:title 'Sandi Goodlander for Cache County Council'. Image URL verbatim in page HTML (img src/data-src/data-image); curl -sIL 200 image/webp. Viewed: professional head-and-shoulders p…
- `kathryn_beus` — Kathryn Beus, Cache County Council · Vice Chair (Southeast District) — source: own Facebook Page — page https://www.facebook.com/Kathryn-Anhder-Beus-for-Cache-County-Council-495173594191744/ — image host `graph.facebook.com` — https://graph.facebook.com/495173594191744/picture?type=large — No own campaign site; own Facebook Page 'Kathryn Anhder Beus for Cache County Council' (intro: 'I love Nibley and I love that for the past 4 years I've been able to serve our community as a member...'). graph endpoint 302->fbcdn 200 imag…
- `nolan_gunnell` — Nolan P. Gunnell, Cache County Council · South District — source: own Facebook Page — page https://www.facebook.com/Nolan-Gunnell-for-Cache-County-Council-109194254128469/ — image host `graph.facebook.com` — https://graph.facebook.com/109194254128469/picture?type=large — No own campaign site; own Facebook Page 'Nolan Gunnell for Cache County Council' (intro: 'My name is Nolan Gunnell and I am running for Cache County Council - South.'). graph endpoint 302->fbcdn 200 image/jpeg; viewed: professional head-…
- `teri_rhodes` — Teri Rhodes, Cache County School Board · President (District 7) — source: own Facebook Page — page https://www.facebook.com/ccsdut.org/ — image host `graph.facebook.com` — https://graph.facebook.com/ccsdut.org/picture?type=large — No own campaign site; own Facebook Page 'Teri Rhodes Cache County School Board (@ccsdut.org)', intro: 'Teri's participation in CCSD activities' (search snippet). graph endpoint 302->fbcdn 200 image/jpeg; viewed: single head-and-shoulders…
- `rodric_bray` — Rodric Bray, Indiana State Senator — source: own Facebook Page — page https://www.facebook.com/brayforstatesenate — image host `graph.facebook.com` — https://graph.facebook.com/brayforstatesenate/picture?type=large — Own campaign site has no single portrait (family/group shots only, per earlier check). Own Facebook Page 'Bray for State Senate (@brayforstatesenate)', description 'State Senator District 37' (also linked as his campaign Facebook by Legi…
- `shelli_yoder` — Shelli Yoder, Indiana State Senator — source: own Facebook Page — page https://www.facebook.com/ShelliYoderforStateSenate/ — image host `graph.facebook.com` — https://graph.facebook.com/ShelliYoderforStateSenate/picture?type=large — Own campaign site has no single portrait (all candid/group images, per earlier check). Own Facebook Page 'Shelli Yoder for State Senate (@ShelliYoderforStateSenate)', description: 'Mom. Educator. State Senator. Personal/campaign account.…
- `stephen_harding` — Stephen Harding, Connecticut State Senator — source: own Facebook Page — page https://www.facebook.com/HardingforSenate/ — image host `graph.facebook.com` — https://graph.facebook.com/HardingforSenate/picture?type=large — No own campaign site; own Facebook Page 'Harding 26 (@HardingforSenate)', search snippet: 'Republican candidate for the CT 30th State Senate District ... Paid for by Harding 26 ... Approved by Stephen Harding'. graph endpoint 302->fbcdn …

### Kept the building, and why

- `treg_taylor` — Treg Taylor, State Attorney General — Own Facebook Page "Treg Taylor" (linked from tregforak.com; "As Attorney General I fought crime... As Governor, I will never...") but graph.facebook.com/61579342770173/picture?type=large returns the default grey silhouette; campaign site…
- `heidi_hammond_grantsville` — Heidi Hammond, Mayor, Grantsville — no own campaign site or Facebook Page found (only news/minutes/people-search pages)
- `greg_miles_duchesne` — Greg Miles, Duchesne County Commission — no own campaign site or Facebook Page found (only county documents/news)
- `mary_mcgann_grand` — Mary McGann, Grand County Commission — no own campaign site or Facebook Page found (only county pages/news; not seeking reelection)
- `dean_draper_millard` — Dean Draper, Millard County Commission — no own campaign site or Facebook Page found (only county documents/news)
- `lori_maughan_sanjuan` — Lori Maughan, San Juan County Commission (Chair) — no own campaign site or Facebook Page found (only county pages/minutes and news)
- `trevor_olsen_blanding` — Trevor Olsen, Mayor, Blanding — no own campaign site or Facebook Page found (only city/news/LinkedIn; FB result is a different Trevor Olsen personal profile)
- `kevin_dunn_monticello` — Kevin Dunn, Mayor, Monticello — no own campaign site or Facebook Page found (only city candidate page and news)
- `john_laursen_uintah` — John Laursen, Uintah County Commission (Chair) — no own campaign site or Facebook Page found (only county/news/health district pages)
- `sonja_norton_uintah` — Sonja Norton, Uintah County Commission — campaign site votesonjanorton.com does not resolve (DNS failure); its Facebook Page URL could not be identified (only FB result is her Ashley Valley Realty business page)
- `willis_lefevre_uintah` — Willis LeFevre, Uintah County Commission — no own campaign site or Facebook Page found (only utgop.org party page, Ballotpedia, news)
- `steve_labrum_uintah` — Steve Labrum, Uintah County Sheriff — no own campaign site found; 2018 campaign FB Page "Steve Labrum for Uintah County Sheriff" mentioned in news but its URL could not be found; only FB result is the Sheriff Office department page
- `terry_willis_price` — Terry Willis, Mayor, Price — no own campaign site or Facebook Page found (only city documents/news)
- `jeff_wood_carbon` — Jeff Wood, Carbon County Sheriff — no own campaign site or Facebook Page found (only Sheriff Office/county pages and news)
- `larry_jensen_carbon` — Larry Jensen, Carbon County Commission — no own campaign site or Facebook Page found (FB results are KOAL TV news videos; county pages)
- `john_scott_ephraim` — John Scott, Former Mayor, Ephraim — no own campaign site or Facebook Page found (only Ephraim City pages/newsletters and news)
- `greg_jensen_sevier` — Greg Jensen, Sevier County Commission — Own campaign site greg4seviercounty.com has no single portrait; its linked Facebook Page greg4seviercounty profile photo (graph picture, viewed) is a couple photo of him with a woman outdoors, not a single portrait
- `nathan_curtis_sevier` — Nathan Curtis, Sevier County Sheriff — no own campaign site or Facebook Page found (only sheriff office site, X, BallotReady, news; FB "Nathan Curtis" result is a different person)
- `clint_painter_juab` — Clint Painter, Juab County Commission (Chair) — no own campaign site or Facebook Page found (only SUU story, county pages, news, podcast)
- `douglas_anderson_juab` — Douglas Anderson, Juab County Sheriff — no own campaign site or Facebook Page found (only Sheriff Office department page JuabSO, LinkedIn, news); retired
- `colten_johnson_kanab` — T. Colten Johnson, Mayor, Kanab — no own campaign site or Facebook Page found (only Kanab city pages and news)
- `eric_houston_garfield` — Eric Houston, Garfield County Sheriff — no own campaign site or Facebook Page found; only FB result is unverified personal profile "Eric Houston" (100079083721499) whose graph picture is the default grey silhouette
- `kim_soper_panguitch` — Kim Soper, Mayor, Panguitch — no own campaign site or Facebook Page found (only Panguitch city minutes/Wikipedia)
- `matt_wilson_morgan` — Matt Wilson, Morgan County Commission (Chair) — no own campaign site or Facebook Page found (only county agendas/regional documents; common name)
- `blaine_fackrell_morgan` — Blaine Fackrell, Morgan County Commission — Own campaign FB Page "Blaine Fackrell for County Commissioner at Large" (Blaine4Morgan) found, but graph.facebook.com/Blaine4Morgan/picture returns HTTP 400 "Object does not exist/missing permissions"; campaign site blaine4morgan.com ret…
- `corey_stark_morgan` — Corey Stark, Morgan County Sheriff — no own campaign site or Facebook Page found (only Ballotpedia, utahsheriffs.org, county pages)
- `steve_gale_morgan` — Steve Gale, Mayor, Morgan City — no own campaign site or Facebook Page found (only Morgan City pages/minutes, WFRC)
- `gaylene_adams_morgan` — Gaylene Adams, Morgan School District Board (President) — no own campaign site or Facebook Page found (only district page, change.org, news; FB result is a different Gaylene Adams in Cape Town)
- `pat_argyle_gardencity` — Pat Argyle, Mayor, Garden City — no own campaign site or Facebook Page found (appointed interim mayor May 2026; only gardencityut.us town site, abc4 news, minutes)
- `dennis_blackburn_wayne` — Dennis Blackburn, Wayne County Commission (Chair) — no own campaign site or Facebook Page found (only LinkedIn, waynecountyfire.org board page, news)
- `roger_brian_wayne` — Roger Brian, Wayne County Commission — no own campaign site or Facebook Page found (only utah.gov notices, waynecountyutah.gov, insiderutah.com news)
- `micah_gulley_wayne` — Micah Gulley, Wayne County Sheriff — no own campaign site or Facebook Page found (only utahsheriffs.org, Ballotpedia, colorcountryanimalwelfare.org, county documents, news)
- `mickey_wright_torrey` — Mickey Wright, Mayor, Torrey — no own campaign site or Facebook Page found; only torreyutah.gov member page, news, and unrelated/unconfirmed personal Facebook profiles (name shared with golfer and others)
- `marty_gleave_piute` — Marty Gleave, Piute County Sheriff — no own campaign site or Facebook Page found (only LinkedIn, news, Piute County Sheriff's Office department page which is not his own)
- `barry_golding_washco` — Barry Golding, Washington County Sheriff (interim) — no own campaign site or Facebook Page found (interim sheriff chosen by party central committee; only washeriff.net department site, wcrputah.com party page, news)
- `clark_fawcett_hurricane` — Clark Fawcett, Mayor, Hurricane — no own campaign site or Facebook Page found; his "In The Loop" updates run on Hurricane City's official accounts (government, not his own); only news, saveutah.org questionnaire, cityofhurricane.com
- `nanette_billings_hurricane` — Nanette Billings, Former Mayor, Hurricane — campaign site nanettebillings.com does not resolve (DNS failure); her Facebook Pages "Nanette Billings for Hurricane City Mayor" (id 100075621502310) and "Nanette Billings" ("Hurricane City Mayor", id 100069071533314) both return the def…
- `barbara_bruno_springdale` — Barbara Bruno, Mayor, Springdale — no own campaign site or Facebook Page found (only springdale.utah.gov, candidate statement PDF, news, YouTube)
- `jared_hamner_tooele` — Jared Hamner, Tooele County Council (Chair) — no own campaign site found; the Facebook link BallotReady lists for him (facebook.com/profile.php?id=100064177627946) returns the default grey silhouette via graph.facebook.com (is_silhouette:true); no verifiable portrait
- `scott_wardle_tooele` — Scott Wardle, Tooele County Council (Vice Chair) — own Facebook Page "Councilman Scott Wardle Tooele County Council District 1" (facebook.com/votescottwardle) found, but its profile photo is a black-and-white photo of two people (man with a woman in a cap), not a single portrait; no own …
- `kendall_thomas_tooele` — Kendall Thomas, Tooele County Council — no own campaign site with a portrait (kendallthomas.net is a GoDaddy "Launching Soon" placeholder with no photo; /about.html 404) and no own Facebook Page found (facebook.com/kendallthomasut is a personal profile; graph returns error)
- `erik_stromberg_tooele` — Erik Stromberg, Tooele County Council — campaign domain erik4tooelecounty.com is NXDOMAIN (DNS failure, rechecked); no own Facebook Page found; no verifiable portrait
- `sam_steed_piute` — Sam Steed, Piute County Commission — no own campaign site or Facebook Page found (only notices, minutes, R6 council, news)
- `paul_binns_lehi` — Paul Binns, Mayor, Lehi — campaign site binnsformayor.com is an expired Squarespace site (404); his Facebook Page "Paul Binns (Binns For Mayor)" (facebook.com/61576867047427) returns the default grey silhouette via graph.facebook.com (is_silhouette:true); no veri…
- `dan_bongino` — Dan Bongino, FBI Deputy Director — appointed official (FBI Deputy Director); no own campaign site (bongino.com is his media business site); his Facebook Page "Dan Bongino" ("The official page of Dan Bongino") is a media/commentator page that does not name him as FBI Deput…
- `tom_homan` — Tom Homan, White House Border Czar — appointed official (White House Border Czar); no campaign site exists; his Facebook "Tom Homan" (id 100089876821784, "Verified personal profile account of Thomas D. Homan, U.S. Border Czar") is a personal profile and graph.facebook.com r…
- `keith_kellogg` — Keith Kellogg, Special Envoy for Ukraine & Russia — appointed official (Special Envoy for Ukraine & Russia); no campaign site exists and no own Facebook Page found (uses X @generalkellogg / @SPE_Kellogg)
- `marty_makary` — Marty Makary, FDA Commissioner — appointed official (FDA Commissioner); no campaign site exists and no own Facebook Page found (uses X @DrMakaryFDA)
- `jay_bhattacharya` — Jay Bhattacharya, NIH Director — appointed official (NIH Director); no campaign site exists and no own Facebook Page found (uses X @NIHDirector_Jay)
- `brendan_carr` — Brendan Carr, FCC Chair — appointed official (FCC Chair); no campaign site exists and no own Facebook Page found (only the FCC agency page facebook.com/FCC, which is a government page; he uses X @BrendanCarrFCC)
- `witkoff` — Steve Witkoff, U.S. Special Envoy to the Middle East — appointed official (Special Envoy); no campaign site exists (witkoff.com is his real-estate business site) and no own Facebook Page found
- `stephen_miller` — Stephen Miller, White House Deputy Chief of Staff — appointed official (White House Deputy Chief of Staff); no campaign site exists and no own Facebook Page found
- `tyson_roberts` — Tyson Roberts, Layton City Council — campaign domain tysonrobertsforlayton.com returns Wix 404 'ConnectYourDomain Error'; own Facebook Page "Councilman Tyson Roberts" (facebook.com/TysonRobertsforLaytonCity) exists but graph.facebook.com returns error 100/33 (object cannot …
- `michelle_barber` — Michelle Barber, Davis Board of Education · Precinct 5 — no own campaign site for Davis School Board; her Facebook Page "Michelle Barber - Kaysville City Council" (facebook.com/michellebarberforkaysville) names only her former Kaysville City Council candidacy, not the Davis Board of Education …
- `chad_jensen` — Chad Jensen, Cache County Sheriff — no own campaign site or Facebook Page found; the only Facebook BallotReady lists is the Cache County Sheriff's Office department page (facebook.com/CacheSheriff), not his own
- `george_daines` — N. George Daines, Cache County Executive — No own campaign site or Facebook Page found (only news, cachegop.com party site, cachecounty.gov; 2025 campaign used only a gmail contact).
- `mark_anderson_logan` — Mark Anderson, Mayor of Logan — Campaign site makeyourmarkformayor.com no longer resolves (DNS failure; only on web.archive.org, not usable). Its archived HTML links facebook.com/profile.php?id=61576727603984, but graph picture for that id returns the default grey silh…
- `david_erickson_cache` — David L. Erickson, Cache County Council · North District — No own campaign site or Facebook Page found (only news hjnews/cachevalleydaily and cachecounty.gov).
- `keegan_garrity` — Keegan Garrity, Cache County Council · Logan Seat #1 — No own campaign site found; his Facebook Page 'Keegan for Logan' (cited by news, from his Logan Municipal Council runs) could not be located/confirmed as naming the County Council seat; no other own Page found.
- `joann_bennett` — JoAnn Bennett, Cache County Council · Logan Seat #2 — No own campaign site or Facebook Page found (only news, UPR, cachegop.com party site, cachecounty.gov).
- `mark_hurd` — Mark Hurd, Cache County Council · Northeast District — No own campaign site or Facebook Page found (only cachegop.com party profile, cachecounty.gov and news).
- `brian_chambers` — Brian Chambers, Cache County School Board · District 1 — No own campaign site or Facebook Page found (only ccsdut.org, Ballotpedia, news).
- `roger_pulsipher` — Roger Pulsipher, Cache County School Board · District 2 — No own campaign site or Facebook Page found (only Ballotpedia, BoardDocs, county ballot notice, news).
- `randall_bagley` — Randall Bagley, Cache County School Board · District 4 — No own campaign site or Facebook Page found (only ccsdut.org, Ballotpedia, LinkedIn, news/letters).
- `d_jeffrey_nielsen` — D. Jeffrey Nielsen, Cache County School Board · District 3 — No own campaign site or Facebook Page found (only ccsdut.org, Ballotpedia, BoardDocs, news; Facebook results are unrelated same-name personal profiles).
- `allen_grunig` — Allen Grunig, Cache County School Board · District 5 — No own campaign site or Facebook Page found (only ccsdut.org, Ballotpedia, news letters).
- `kathy_christiansen` — Kathy Christiansen, Cache County School Board · Vice President (District 6) — No own campaign site or Facebook Page found (only unclaimed goodparty.org profile, Ballotpedia, ccsdut.org).
- `becky_quay` — Becky Quay, Logan City School Board · President (District 4) — Own campaign site votebeckyquay.com no longer resolves (curl 000/DNS failure); no own Facebook Page found.
- `cole_checketts` — Cole Checketts, Logan City School Board · District 5 — No own campaign site or Facebook Page found; only a personal Facebook profile (facebook.com/cole.checketts), which does not qualify.
- `russell_fisher` — Russell Fisher, Logan City School Board · District 3 (interim) — Interim appointee (Oct 2025); no own campaign site or Facebook Page found (only hjnews, loganschools.org, loganschoolsfoundation.org).
- `katie_chapman` — Katie Chapman, Logan City School Board · District 1 — No own campaign site or Facebook Page found (only news, loganschools.org, Ballotpedia).
- `frank_stewart` — Frank Stewart, Logan City School Board · Vice President (District 2) — Ran unopposed; no own campaign site or Facebook Page found (only hjnews, utah.gov minutes, ZoomInfo).
- `lyman` — Phil Lyman, U.S. House Candidate (UT-3) — Own campaign site lymanforutah.com ('Phil Lyman for Congress 2026 — Utah CD3') is a JS SPA: page HTML has no img URLs (images only inside JS bundle) and og:image is on campaign-navigator-PhilLyman.replit.app (not campaign domain/allowed …
- `nhaley` — Nikki Haley, Former UN Ambassador — her own Facebook Page (@NikkiHaley) does not name her as UN Ambassador, the seat on her row; no qualifying page
- `dballard` — Derek Ballard, U.S. House Candidate — Cannot identify person: no 'Derek Ballard' among Utah 2026 congressional candidates (only an unrelated SLC designer); no own campaign site or Facebook Page found.
- `jjohnson` — Jen Johnson, U.S. House Candidate — Cannot identify person: no 'Jen Johnson' in UT-4 2026 field (Ballotpedia/Deseret list Kennedy, Larsen, Wright, Burt and convention candidates); no own campaign site or Facebook Page found.
<!-- /person-photos-wave-1d -->
