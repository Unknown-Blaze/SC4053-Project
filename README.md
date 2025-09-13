
<h1>nGoDonate</h1>
  <h2>Demo Video</h2>
  https://drive.google.com/drive/folders/1AhDhGtqxIBAe7raqtm7aah3fBNZaKPHf?usp=sharing 
  - Kindly access this via normal tab (not incognito)
  <h2>React + Vite + FastAPI + XRP Blockchain App</h2>
  <p>Blockchain based, near transparent, trustworthy and secure donation platform</p>
  <ul>
    <li>🌐 <strong>React + Vite</strong> for a fast and modern frontend experience</li>
    <li>⚙️ <strong>FastAPI</strong> for a high-performance backend API in Python</li>
    <li>🔗 <strong>XRP Ledger (XRPL)</strong> for blockchain interactions (sending transactions, checking balances, etc.)</li>
  </ul>
  
 <h3> XRP Ledger Integration</h3>
  <p>The backend uses <code>xrpl-py</code> to interact with the XRP Ledger.</p>
  <table>
    <thead>
      <tr>
        <th>Feature</th>
        <th>Purpose</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Mint NFTs</strong></td>
        <td>Mints a new NFT on the XRP Ledger using the provided metadata and wallet seed.</td>
      </tr>
      <tr>
        <td><strong>Fetch NFTs</strong></td>
        <td>Retrieves all NFTs associated with a specified XRP Ledger account.</td>
      </tr>
      <tr>
        <td><strong>Create Escrow Donations</strong></td>
        <td>Creates time-locked escrow payments linked to milestone deadlines for secure, conditional donations.</td>
      </tr>
      <tr>
        <td><strong>Verify Milestones</strong></td>
        <td>Verifies milestone completion and either releases or cancels escrowed funds accordingly.</td>
      </tr>
    </tbody>
  </table>


  <h2>Quick Start</h2>
  <h3>1. Clone the Repository</h3>
  <pre>git clone https://github.com/Unknown-Blaze/easya-hackathon.git
cd easya-hackathon</pre>

  <h3>2. Backend Setup (FastAPI)</h3>
  <pre>
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
  </pre>

  <h4><code>requirements.txt</code></h4>
  <pre>
fastapi
uvicorn
xrpl-py
python-dotenv
firebase-admin
pydantic
email-validator
web3
  </pre>

  <h4>Run the API</h4>
  <pre>uvicorn app.main:app --reload</pre>
  <p>Default API URL: <code>http://localhost:8000</code></p>

  <h3>3. Frontend Setup (React + Vite)</h3>
  <pre>
cd frontend
npm install
npm run dev
  </pre>
  <p>Frontend runs on: <code>http://localhost:5173</code></p>

  <h3> XRP Donation API Endpoints</h3>
    <table>
      <thead>
        <tr>
          <th>Endpoint</th>
          <th>Method</th>
          <th>Description</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><code>/donate</code></td>
          <td><strong>POST</strong></td>
          <td>Accept a donation transaction (via XRP payment)</td>
        </tr>
        <tr>
          <td><code>/verify</code></td>
          <td><strong>POST</strong></td>
          <td>Verify the authenticity of a donation or wallet</td>
        </tr>
        <tr>
          <td><code>/mint</code></td>
          <td><strong>POST</strong></td>
          <td>Mint a token (e.g., NFT) after successful verification</td>
        </tr>
        <tr>
          <td><code>/token</code></td>
          <td><strong>GET</strong></td>
          <td>Retrieve information about a specific token</td>
        </tr>
        <tr>
          <td><code>/latest-transactions</code></td>
          <td><strong>GET</strong></td>
          <td>Get a list of the latest donation transactions</td>
        </tr>
      </tbody>
    </table>

Block explorer link - https://testnet.xrpl.org/accounts/r4sXNGwP85VZ4PQbceXD66Xp8cJHL6mT9B

## Screenshots
![Screenshot 1](screenshots/Screenshot%202025-06-08%20120215.png)
![Screenshot 2](screenshots/Screenshot%202025-06-08%20120224.png)
![Screenshot 3](screenshots/Screenshot%202025-06-08%20120434.png)
![Screenshot 4](screenshots/Screenshot%202025-06-08%20120458.png)
