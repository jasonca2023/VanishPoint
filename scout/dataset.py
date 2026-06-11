"""Synthetic training data for the footprint-signal classifier.

Each example is an email header rendered as `from: <sender> | subject: <text>`,
labeled with the account-relationship signal it carries. The classes drive
ghost detection: a SIGNUP proves an account exists, SECURITY/TRANSACTIONAL
prove it was alive at that date, MARKETING is the noise dormant accounts keep
emitting, PERSONAL is human mail that must never count as an account signal.
"""

import random

LABELS = ["signup", "security", "transactional", "marketing", "personal"]

BRANDS = [
    "Vimeo", "Photobucket", "Quora", "MyFitnessPal", "Dropbox", "Spotify",
    "Strava", "Duolingo", "Pinterest", "Tumblr", "SoundCloud", "Goodreads",
    "Etsy", "eBay", "Reddit", "Twitch", "Canva", "Notion", "Figma", "Slack",
    "Coursera", "Udemy", "Skillshare", "Medium", "Substack", "Patreon",
    "DoorDash", "Uber", "Lyft", "Airbnb", "Booking.com", "Expedia",
    "Steam", "Epic Games", "PlayStation", "Nintendo", "Discord", "Zoom",
    "LastPass", "Evernote", "Trello", "Asana", "GitHub", "GitLab",
    "Robinhood", "Venmo", "PayPal", "Cash App", "Chime", "Wealthfront",
]

FIRST = ["sam", "alex", "jordan", "taylor", "casey", "riley", "maria",
         "james", "priya", "wei", "diego", "amara", "kenji", "fatima",
         "lucas", "emma", "noah", "olivia", "mom", "dad", "grandma"]

SIGNUP_SUBJECTS = [
    "Welcome to {b}!",
    "Welcome to {b} — let's get started",
    "Confirm your email address",
    "Confirm your {b} account",
    "Verify your email for {b}",
    "Please verify your email address",
    "Your {b} account has been created",
    "Activate your {b} account",
    "Thanks for signing up for {b}",
    "Thanks for joining {b}",
    "You're in! Welcome to {b}",
    "Complete your {b} registration",
    "Getting started with {b}",
    "Your {b} membership is active",
    "Finish setting up your {b} profile",
    "Welcome aboard, {name}!",
    "Confirm your subscription to {b}",
    "One more step to activate your account",
    "Email verification required",
    "Your new {b} account",
    "Activate your profile and get started",
    "You're almost in — activate your account now",
    "Set up your {b} profile to get started",
    "Get started by confirming your account",
    "One click left — confirm your email",
    "Your {b} journey starts here",
    "Let's set up your account",
]

SECURITY_SUBJECTS = [
    "New sign-in to your {b} account",
    "New login from {city}",
    "Security alert: new device signed in",
    "Your {b} password was changed",
    "Reset your {b} password",
    "Password reset requested",
    "Your verification code is {code}",
    "{code} is your {b} code",
    "Two-factor authentication enabled",
    "Suspicious activity on your {b} account",
    "Was this you? Sign-in attempt blocked",
    "Your {b} security settings were updated",
    "Confirm this login attempt",
    "Action required: unusual activity detected",
    "Your account was accessed from a new browser",
    "Security notice for your account",
    "Your recovery email was changed",
    "Sign-in verification needed",
    "Someone logged into your {b} account",
    "Someone signed in to your account from a new device",
    "A new device logged in to your account",
    "Did you just sign in from {city}?",
    "We noticed a login from a device you don't usually use",
    "Here is the sign-in code you requested: {code}",
]

TRANSACTIONAL_SUBJECTS = [
    "Your {b} receipt for {month}",
    "Receipt for your payment to {b}",
    "Your invoice from {b}",
    "Payment received — thank you",
    "Your order has shipped",
    "Your order #{num} is confirmed",
    "Your {b} subscription has renewed",
    "Your subscription payment failed",
    "Your storage is almost full",
    "Your monthly statement is ready",
    "Your {b} report for {month}",
    "Your weekly progress report",
    "Your video finished processing",
    "Your export is ready to download",
    "Your booking is confirmed",
    "Your ride receipt from {b}",
    "Delivery update: package arriving {day}",
    "Your {b} trial ends in 3 days",
    "Your plan has been upgraded",
    "Refund processed for order #{num}",
    "Your shared folder was updated",
    "Your account balance summary",
]

MARKETING_SUBJECTS = [
    "We miss you, {name}! Come back to {b}",
    "We miss you! See what's new on {b}",
    "It's been a while — here's what you missed",
    "{pct}% off everything this weekend",
    "Last chance: {pct}% off ends tonight",
    "New features for creators",
    "Introducing the new {b}",
    "Don't miss out on our biggest sale",
    "Top stories for you",
    "Your weekly digest",
    "Recommended for you this week",
    "{name}, your friends are waiting on {b}",
    "New year, new goals",
    "Unlock premium for free this month",
    "See what's trending on {b}",
    "5 tips to get more from {b}",
    "A special offer just for you",
    "Your {month} newsletter",
    "Black Friday starts now",
    "Come see your memories from {year}",
    "You have unread notifications",
    "People are talking about your post",
    "{day}: the strange economics of airport lounges",
    "{day}: what nobody tells you about remote work",
    "The {month} issue: our favorite reads",
    "Why vending machines are having a moment",
    "Inside the rise of tiny homes",
    "5 stories worth your time this week",
    "The one chart that explains this economy",
]

PERSONAL_SUBJECTS = [
    "Lunch tomorrow?",
    "Re: lunch tomorrow?",
    "dinner on saturday",
    "Quick question",
    "Re: quick question about the project",
    "photos from the weekend",
    "Fwd: flight details",
    "happy birthday!!",
    "Can you call me when you get this?",
    "notes from today's meeting",
    "Re: notes from today's meeting",
    "the recipe you asked for",
    "moving day plans",
    "Are you free thursday?",
    "Thank you for yesterday",
    "Re: Re: that thing we talked about",
    "kids soccer schedule",
    "book club next week",
    "Did you see this?",
    "checking in",
    "miss you, let's catch up soon",
    "garage door code",
]

CITIES = ["Austin", "Berlin", "Tokyo", "Toronto", "Lagos", "Sydney", "Denver"]
MONTHS = ["January", "February", "March", "April", "May", "June", "July",
          "August", "September", "October", "November", "December"]
DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]


def _fill(template: str, rng: random.Random) -> str:
    return (
        template.replace("{b}", rng.choice(BRANDS))
        .replace("{name}", rng.choice(FIRST))
        .replace("{city}", rng.choice(CITIES))
        .replace("{month}", rng.choice(MONTHS))
        .replace("{day}", rng.choice(DAYS))
        .replace("{code}", str(rng.randint(100000, 999999)))
        .replace("{num}", str(rng.randint(1000, 99999)))
        .replace("{pct}", str(rng.choice([10, 15, 20, 25, 30, 40, 50, 70])))
        .replace("{year}", str(rng.randint(2015, 2024)))
    )


def _sender(label: str, rng: random.Random) -> str:
    brand = rng.choice(BRANDS)
    slug = brand.lower().replace(" ", "").replace(".com", "")
    if label == "personal":
        person = rng.choice(FIRST)
        host = rng.choice(["gmail.com", "yahoo.com", "icloud.com", "outlook.com"])
        return f"{person} <{person}{rng.randint(1, 99)}@{host}>"
    box = {
        "signup": ["no-reply", "welcome", "accounts", "hello"],
        "security": ["security", "no-reply", "account-security", "alerts"],
        "transactional": ["no-reply", "billing", "receipts", "orders", "support"],
        "marketing": ["news", "hello", "updates", "newsletter", "offers"],
    }[label]
    return f"{brand} <{rng.choice(box)}@{slug}.com>"


def render(sender: str, subject: str) -> str:
    """The exact input format used at inference time too."""
    return f"from: {sender} | subject: {subject}"


def build(per_class: int = 900, seed: int = 7):
    rng = random.Random(seed)
    pools = {
        "signup": SIGNUP_SUBJECTS,
        "security": SECURITY_SUBJECTS,
        "transactional": TRANSACTIONAL_SUBJECTS,
        "marketing": MARKETING_SUBJECTS,
        "personal": PERSONAL_SUBJECTS,
    }
    texts, labels, seen = [], [], set()
    for label, pool in pools.items():
        count = 0
        while count < per_class:
            text = render(_sender(label, rng), _fill(rng.choice(pool), rng))
            if text in seen:
                continue
            seen.add(text)
            texts.append(text)
            labels.append(LABELS.index(label))
            count += 1
    order = list(range(len(texts)))
    rng.shuffle(order)
    return [texts[i] for i in order], [labels[i] for i in order]
