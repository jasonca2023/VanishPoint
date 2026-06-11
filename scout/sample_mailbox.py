"""Bundled sample mailbox used when no IMAP credentials are configured.

Raw, unlabeled headers — they go through the real classifier exactly like
live mail, so the demo exercises the whole pipeline (and its phrasing is
deliberately different from the training templates).
"""

SAMPLE_MAILBOX = [
    # Photobucket — dormant, clear account
    {"sender": "Photobucket <noreply@photobucket.com>", "subject": "One click left — confirm your email to start uploading", "date": "2017-08-21T15:11:00+00:00"},
    {"sender": "Photobucket <billing@photobucket.com>", "subject": "Heads up, your storage plan renews next week", "date": "2022-11-19T12:40:00+00:00"},
    {"sender": "Photobucket <hello@photobucket.com>", "subject": "Your memories from 2018 are waiting", "date": "2023-05-30T08:15:00+00:00"},
    # Vimeo — dormant
    {"sender": "Vimeo <welcome@vimeo.com>", "subject": "You're all set — start uploading in glorious HD", "date": "2019-03-12T10:04:00+00:00"},
    {"sender": "Vimeo <no-reply@vimeo.com>", "subject": "Your upload finished transcoding and is live", "date": "2021-06-02T18:22:00+00:00"},
    {"sender": "Vimeo <staff@vimeo.com>", "subject": "Creators like you are loving these new tools", "date": "2022-10-08T09:00:00+00:00"},
    # Quora — dormant
    {"sender": "Quora <verify@quora.com>", "subject": "Tap here to confirm your new Quora profile", "date": "2018-04-14T20:02:00+00:00"},
    {"sender": "Quora <notifications@quora.com>", "subject": "Your answer just passed 1,200 upvotes", "date": "2022-12-03T16:45:00+00:00"},
    {"sender": "Quora Digest <digest@quora.com>", "subject": "Why do cats knead? Plus 9 more answers for you", "date": "2023-08-22T11:30:00+00:00"},
    # MyFitnessPal — dormant
    {"sender": "MyFitnessPal <activation@myfitnesspal.com>", "subject": "Activate your profile and log your first meal", "date": "2020-01-02T07:30:00+00:00"},
    {"sender": "MyFitnessPal <reports@myfitnesspal.com>", "subject": "Here's how your week of logging went", "date": "2023-11-06T06:00:00+00:00"},
    {"sender": "MyFitnessPal <team@myfitnesspal.com>", "subject": "New year, stronger you — premium is 40% off", "date": "2024-02-01T06:00:00+00:00"},
    # Tumblr — dormant, security-heavy
    {"sender": "Tumblr <no-reply@tumblr.com>", "subject": "Someone logged into your account from a new phone", "date": "2021-09-14T03:12:00+00:00"},
    {"sender": "Tumblr <hey@tumblr.com>", "subject": "your 2019 year in review is here, come look back", "date": "2020-01-05T17:00:00+00:00"},
    # Dropbox — ACTIVE (must not be flagged)
    {"sender": "Dropbox <no-reply@dropbox.com>", "subject": "We noticed a sign-in from a device you don't usually use", "date": "2026-04-15T19:25:00+00:00"},
    {"sender": "Dropbox <no-reply@dropbox.com>", "subject": "Maria added 12 files to the shared folder", "date": "2026-05-28T14:02:00+00:00"},
    # Spotify — ACTIVE
    {"sender": "Spotify <receipts@spotify.com>", "subject": "Thanks — your June payment went through", "date": "2026-06-03T03:14:00+00:00"},
    {"sender": "Spotify <no-reply@spotify.com>", "subject": "Your premium plan renewed for another month", "date": "2026-05-03T03:14:00+00:00"},
    # The Hustle — newsletter only, never an account (must not be flagged)
    {"sender": "The Hustle <crew@thehustle.co>", "subject": "Tuesday: the strange economics of airport lounges", "date": "2023-01-10T11:00:00+00:00"},
    {"sender": "The Hustle <crew@thehustle.co>", "subject": "Why vending machines are having a moment", "date": "2022-12-02T11:00:00+00:00"},
    # Personal mail (must never count)
    {"sender": "maria <maria.g.77@gmail.com>", "subject": "leftover lasagna in the fridge for you", "date": "2021-03-02T22:10:00+00:00"},
    {"sender": "dad <rwalker1958@aol.com>", "subject": "Fwd: cabin booking for july", "date": "2020-07-19T15:45:00+00:00"},
    {"sender": "Sam Chen <samchen.dev@gmail.com>", "subject": "Re: ride to the airport thursday?", "date": "2022-05-30T09:05:00+00:00"},
    # Steam — dormant with security + receipt mix
    {"sender": "Steam <noreply@steampowered.com>", "subject": "Your Steam Guard code: 7H2KQ", "date": "2021-12-25T20:30:00+00:00"},
    {"sender": "Steam <noreply@steampowered.com>", "subject": "Thank you for your purchase — Stardew Valley", "date": "2021-12-25T20:45:00+00:00"},
]
