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
