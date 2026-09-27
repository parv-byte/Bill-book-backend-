# Bill-book-backend-

REST API backend and PDF invoice generation engine for **BP Consultant (HR and Compliance)** Bill Book application.

## Tech Stack
- **Node.js & Express.js**
- **MongoDB & Mongoose** (MongoDB Atlas cloud)
- **PDFKit** (High-precision B&W printable invoice generation)
- **Cors & Dotenv**

## Setup & Running
1. Clone repository:
   ```bash
   git clone https://github.com/parv-byte/Bill-book-backend-.git
   cd Bill-book-backend-
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create `.env` based on `.env.example`:
   ```env
   PORT=5000
   MONGODB_URI=your_mongodb_atlas_uri
   ```
4. Start the server:
   ```bash
   npm start
   # or development mode:
   npm run dev
   ```
