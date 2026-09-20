# HATZI Bingo Mini App

English and Simplified Chinese Telegram Mini App. Open https://hatzi.shop for the clearly labelled local demo, or use @HatziBingoBot / @HatziBingoZhBot for authenticated play.

Static frontend only. No bot tokens or database credentials are shipped to clients. Signed Telegram initData is validated by the separate HATZI Supabase backend. The server draws one ball every ten seconds; clients display public results and only the current user's cards. Pro hosts create private rooms and guests join free. Billing and cash/material prizes are disabled.

Deploy the repository root as a static site using vercel.json. The existing Vercel project owns hatzi.shop. Backend source and migrations are maintained separately.
