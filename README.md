# Financial App

A modern financial transaction tracking application built with React, TypeScript, and Vite.

## Features

- **Transaction Management**: Add, view, and track financial transactions
- **Real-time Stock Watch List**: Monitor multiple stock symbols with live price updates
  - Add/remove symbols from your watch list
  - Real-time price updates via WebSocket (updates every second)
  - View current price, change, percentage change, high, and low
  - Data synced across devices via Firebase
- **Google Sheets Import**: Import transactions directly from Google Sheets or CSV files
  - Support for both URL import and file upload
- **Weekly Summary**: View transactions grouped by Date Acquired with custom week format (e.g., "2026-Jan-1st week")
- **Monthly Summary**: Analyze transactions by month
- **Real-time Calculations**: Automatic gain/loss calculations based on proceeds and cost basis
- **Interactive Charts**: Visual representation of monthly financial data
- **Input Validation**: Real-time validation for financial amounts with error messages
- **Firebase Authentication**: Secure user authentication with 7-day session persistence
- **Cloud Storage**: All data stored in Firebase Firestore for multi-device access

## Tech Stack

- **Frontend**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Authentication**: Firebase Authentication
- **Database**: Firebase Firestore
- **Real-time Data**: Finnhub WebSocket API
- **Data Visualization**: Recharts

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Firebase account (for authentication and database)
- Finnhub API key (free tier available at [finnhub.io](https://finnhub.io))

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/Financial-app.git
cd Financial-app
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
   - Copy `.env.example` to `.env`:
     ```bash
     cp .env.example .env
     ```
   - Get a free Finnhub API key:
     1. Visit [https://finnhub.io/register](https://finnhub.io/register)
     2. Sign up for a free account
     3. Copy your API key from the dashboard
   - Edit `.env` and add your Finnhub API key:
     ```
     VITE_FINNHUB_API_KEY=your_api_key_here
     ```

4. Start the development server:
```bash
npm run dev
```

5. Open your browser and navigate to `http://localhost:5173`

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Project Structure

```
Financial-app/
├── src/
│   ├── components/         # React components
│   │   ├── Dashboard.tsx
│   │   ├── Login.tsx
│   │   ├── Modal.tsx
│   │   ├── MonthlyChart.tsx
│   │   ├── ProtectedRoute.tsx
│   │   ├── SummaryStats.tsx
│   │   ├── TransactionForm.tsx
│   │   ├── TransactionTable.tsx
│   │   ├── ImportFromSheets.tsx
│   │   └── WatchList.tsx
│   ├── config/            # Configuration files
│   │   └── firebase.ts
│   ├── contexts/          # React contexts
│   │   └── AuthContext.tsx
│   ├── hooks/             # Custom React hooks
│   │   ├── useAuth.ts
│   │   ├── useTransactions.ts
│   │   └── useWatchList.ts
│   ├── services/          # Business logic and services
│   │   ├── TransactionService.ts
│   │   ├── FirestoreTransactionService.ts
│   │   ├── FinnhubService.ts
│   │   └── WatchListService.ts
│   ├── types/             # TypeScript type definitions
│   │   ├── Transaction.ts
│   │   └── WatchList.ts
│   ├── utils/             # Utility functions
│   │   ├── authHelpers.ts
│   │   ├── calculations.ts
│   │   ├── dataMigration.ts
│   │   ├── dateHelpers.ts
│   │   └── dateUtils.ts
│   ├── App.tsx            # Main application component
│   ├── main.tsx           # Application entry point
│   ├── index.css          # Global styles
│   └── vite-env.d.ts      # Vite environment type definitions
├── public/                # Static assets
├── index.html             # HTML template
├── package.json           # Dependencies and scripts
├── tailwind.config.js     # Tailwind CSS configuration
├── tsconfig.json          # TypeScript configuration
└── vite.config.ts         # Vite configuration
```

## Usage

### Watch List

The Watch List allows you to monitor real-time stock prices:

1. **Add a Symbol**:
   - Enter a stock symbol (e.g., AAPL, GOOGL, MSFT) in the input field
   - Click "Add" to add it to your watch list
   - The symbol will be saved to your Firebase account

2. **View Real-time Prices**:
   - Stock prices update automatically via WebSocket connection
   - View current price, change (dollar and percentage), daily high, and daily low
   - Green indicates positive change, red indicates negative change

3. **Remove a Symbol**:
   - Click "Remove" next to any symbol to remove it from your watch list

**Note**: Make sure you have set up your Finnhub API key in the `.env` file for the Watch List to work.

### Importing from Google Sheets

1. **Prepare your Google Sheet**:
   - Ensure your sheet has the following columns (in order):
     ```
     Symbol, Security Description, Quantity, Date Acquired, Date Sold, Proceeds, Cost Basis
     ```
   - Make the sheet publicly accessible: Share → "Anyone with the link can view"

2. **Import via URL**:
   - Click the "Import from Sheets" button
   - Select "Import from URL"
   - Paste your Google Sheets URL
   - Click "Import Transactions"

3. **Import via CSV File**:
   - Download your Google Sheet as CSV (File → Download → CSV)
   - Click the "Import from Sheets" button
   - Select "Upload CSV File"
   - Choose your downloaded CSV file

### Adding a Transaction

1. Click the "Add Transaction" button
2. Fill in the transaction details:
   - Symbol (CUSIP)
   - Security Description
   - Quantity
   - Date Acquired
   - Date Sold
   - Proceeds (validated for valid amounts)
   - Cost Basis (validated for valid amounts)
3. View the calculated gain/loss in real-time
4. Click "Add Transaction" to save

### Viewing Summaries

- **Weekly Summary**: Transactions grouped by acquisition date in "YYYY-MMM-NNth week" format
- **Monthly Summary**: Monthly financial overview
- **Total Summary**: Overall statistics and gain/loss

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
