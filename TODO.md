# TODO

_Created: 2026-02-11_

The following items are planned future work for the project. If you like, I can add priorities, break items down into detailed tasks, or implement any of them directly.

- [ ] Add "Day of Bible Verse" below the Element Screenshot (show Korean label first, then English)
- [x] Add a realtime stock tracker and allows to add symbol tracked
- [x] Allow to add options with strike price and expiration date and compare them with tracking symbols
  - **Completed: 2026-02-16**
  - Added comprehensive option trading tracker with real-time pricing
  - Features: Sell Put, Buy Call, Buy Put support
  - Real-time pricing: 30-second polling for option prices
  - Daily closing prices from Yahoo Finance API
  - Expandable rows in transaction table to show options grouped by symbol
  - Today's and Total gain/loss calculations with percentages
  - Integration with watchlist for symbol dropdown selection
- [ ] Host website, hyukkim.com/financial/options and add this web into it 
- [ ] Add github workflow to deploy when pull request is merged into main branch
- [x] Remove symbol duplicate check when entering transactions or importing files
- [x] Set default transaction sort order to Date Acquired (descending)
- [x] Add sort arrows (▲/▼) to each transaction column header
- [x] Add Total Quantity to the Total Summary
- [x] Add year/month filters to the Transaction history
- [x] Add login (authentication) functionality
- [x] Replace LocalStorage with Firebase for data persistence


Additional suggestion:
- Assign an estimated effort (e.g., 1–3h) and a priority (High/Medium/Low) to each item to help plan