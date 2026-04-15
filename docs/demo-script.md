# Tell-Show-Tell Demo Script

## Short Version

### Tell
Travel reviews are often too short to be useful. Guests mention one or two things, but future travelers need the missing detail: was the room clean, were the amenities working, was the property still in good condition? Our prototype uses Expedia's property and review data to detect what information is missing or stale for a specific hotel, then asks one smart follow-up question in a low-friction way.

### Show
Here I’m using our demo property in Broomfield, Colorado. I start with a short review:

`Great location and friendly staff, but the room felt a little dated.`

When I click `Generate Follow-Up`, the Gap Analysis Agent checks historical reviews and the property description, picks the most useful missing or outdated topic, and explains why it chose it.

Then the Question Agent turns that topic into one short follow-up question. If OpenAI is configured, it also plays the question as audio.

I can answer by typing or by voice. Once I save the answer, the Integration Agent summarizes what we learned and stores the enriched detail in the saved answer history.

### Tell
The value is simple: instead of asking every traveler the same static questions, we ask the one question that is most useful for that property right now. That improves review quality for future travelers while keeping the review experience lightweight.

## 60-Second Closing

We’re not trying to collect more text for the sake of it. We’re using the provided Expedia data to identify what’s missing, ask one targeted question, and capture new property detail with minimal effort from the guest.

## Good Demo Inputs

### Starter review
`Great location and friendly staff, but the room felt a little dated.`

### Typed or spoken answer
`The bathroom was clean, but the carpet looked worn and the AC was noisy.`
