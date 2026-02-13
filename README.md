# Financial App

A modern financial transaction tracking application built with React, TypeScript, and Vite.

## Features

- **Transaction Management**: Add, view, and track financial transactions
- **Google Sheets Import**: Import transactions directly from Google Sheets or CSV files
  - Support for both URL import and file upload
- **Weekly Summary**: View transactions grouped by Date Acquired with custom week format (e.g., "2026-Jan-1st week")
- **Monthly Summary**: Analyze transactions by month
- **Real-time Calculations**: Automatic gain/loss calculations based on proceeds and cost basis
- **Interactive Charts**: Visual representation of monthly financial data
- **Input Validation**: Real-time validation for financial amounts with error messages

## Tech Stack

- **Frontend**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Data Visualization**: Recharts
- **Local Storage**: IndexedDB via Dexie.js

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn

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

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and navigate to `http://localhost:5173`

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
│   │   ├── Modal.tsx
│   │   ├── MonthlyChart.tsx
│   │   ├── SummaryStats.tsx
│   │   ├── TransactionForm.tsx
│   │   └── TransactionTable.tsx
│   ├── hooks/             # Custom React hooks
│   │   └── useTransactions.ts
│   ├── services/          # Business logic and services
│   │   └── TransactionService.ts
│   ├── types/             # TypeScript type definitions
│   │   └── Transaction.ts
│   ├── utils/             # Utility functions
│   │   ├── calculations.ts
│   │   ├── dateHelpers.ts
│   │   └── dateUtils.ts
│   ├── App.tsx            # Main application component
│   ├── main.tsx           # Application entry point
│   └── index.css          # Global styles
├── public/                # Static assets
├── index.html             # HTML template
├── package.json           # Dependencies and scripts
├── tailwind.config.js     # Tailwind CSS configuration
├── tsconfig.json          # TypeScript configuration
└── vite.config.ts         # Vite configuration
```

## Usage

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
