# PolitiDex Evidence Strength

The Evidence Locker grades every item with a **strength** badge — **Strong**,
**Moderate**, or **Limited**. The badge measures *how verifiable* a piece of
evidence is, not whether we agree with its content. The grade is computed live
in `_strength()` in `index.html`, and every badge lists the plain-language
reasons behind it so it never reads as a black box.

## The base score

`_strength()` starts at 0 and adds points:

| Signal | Points |
|---|---|
| Official government record — floor video, committee video, or a bill record | +2 |
| **High-quality direct interview on YouTube** (see below) | +2 |
| On-the-record statement or audio | +1 |
| Generic YouTube clip / social-media post | +0 |
| Direct source link (`url`) | +1 |
| Pinpoint timestamp | +1 |
| Tied to a tracked issue (`issueKey`) | +1 |

Levels: **Strong** at 4+, **Moderate** at 2–3, **Limited** below 2.

## The YouTube interview exception

Most YouTube items are a social/video source and top out at **Moderate** — a
short clip, a cut-down segment, a montage, or a host summarising someone's
views. That ceiling is intentional: a clip is easy to take out of context.

But a **direct, on-the-record interview** where the politician speaks at length
in their own words is often the *clearest* statement of where they actually
stand — frequently clearer and more useful than a short official floor clip. So
a qualifying interview is lifted above the generic ceiling and graded like a
first-person record (+2 base), which lets a long-form interview with a direct
link and a tracked issue read **Strong**.

### What qualifies as a high-quality interview

This is an **explicit, author-set** classification, not an automatic guess. An
item is marked with an `interview` field **only** when **all four** hold:

1. **Direct** — the politician personally speaks. Not a clip *about* them, not a
   montage, not a host paraphrasing their position.
2. **Attributable** — the video is clearly and verifiably the named politician:
   their own channel, or a reputable interviewer/outlet whose title names them.
   Existence and attribution are confirmed live via YouTube's oEmbed endpoint
   (the real title + channel are returned by YouTube itself).
3. **Substantive** — it is a genuine policy discussion (positions, reasoning,
   record), not a soundbite, an ad, or a ceremonial appearance.
4. **Long-form** — a town hall, podcast, news interview, debate, or extended
   sit-down, not a short cut-down clip.

A short, heavily edited, or low-substance clip does **not** qualify and stays at
Moderate, even if it is on YouTube.

### How to mark an item

Add an `interview` field to the evidence item. Two forms are accepted:

```js
// Minimal — the author asserts the four criteria above hold.
interview: true

// Documented — records the basis, and lets the badge show the run length.
interview: { minutes: 42, outlet: 'Iowa PBS — Iowa Press', format: 'news interview' }
```

When `minutes` is present it must clear the long-form bar (**≥ 8 minutes**) —
the flag can never promote a clip that is itself declared short. The badge's
reason line reads *"In-depth direct interview (~42 min, in their own words)"* so
the upgrade explains itself.

## Writing standard

Interview evidence follows [`CONTENT_STYLE.md`](./CONTENT_STYLE.md): every item
describes what *this* individual said in *their own words*, never their party.
Keep the `headline`/`facts` neutral and record-based, attach an `issueKey` that
matches one of the member's tracked stances or promises, and prefer longer,
substantive discussions over short clips. Federal evidence work should
prioritise the [Core National Issues](./CORE_NATIONAL_ISSUES.md).
