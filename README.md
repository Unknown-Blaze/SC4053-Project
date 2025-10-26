# nGoDonate - Ethereum Edition

<h2>React + Vite + FastAPI + Ethereum Blockchain App</h2>
<p>A blockchain-based, transparent, and secure donation platform now powered by Ethereum.</p>
<ul>
  <li>🌐 <strong>React + Vite</strong> for a fast and modern frontend experience</li>
  <li>⚙️ <strong>FastAPI</strong> for a high-performance backend API in Python</li>
  <li>🔗 <strong>Ethereum Blockchain</strong> for all blockchain interactions (wallets, donations, NFTs)</li>
</ul>

<h3>Ethereum Integration</h3>
<p>The backend uses <code>web3.py</code> to interact with the Ethereum blockchain.</p>
<table>
  <thead>
    <tr>
      <th>Feature</th>
      <th>Purpose</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>Create Wallet</strong></td>
      <td>Generates a new Ethereum account (address and private key).</td>
    </tr>
    <tr>
      <td><strong>Create Multi-Milestone Projects</strong></td>
      <td>Deploys a MultiMilestoneEscrow smart contract for charity projects with multiple funding milestones.</td>
    </tr>
    <tr>
      <td><strong>Milestone Management</strong></td>
      <td>Allows NGOs to complete milestones and verifiers to approve them for fund release.</td>
    </tr>
    <tr>
      <td><strong>Mint NFTs</strong></td>
      <td>Mints a new ERC-721 NFT to a specified address via a deployed smart contract.</td>
    </tr>
    <tr>
      <td><strong>Fetch NFTs</strong></td>
      <td>Retrieves all NFTs from our collection contract associated with a specified Ethereum account.</td>
    </tr>
  </tbody>
</table>

<h2>Quick Start</h2>

<h3>1. Clone the Repository</h3>
<pre>git clone https://github.com/Unknown-Blaze/easya-hackathon.git
cd easya-hackathon/backend</pre>

<h3>2. Backend Setup (FastAPI)</h3>

<h4>Install Dependencies</h4>
<pre>
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
</pre>

<h4>Install Solidity Compiler</h4>
<p>The backend compiles Solidity smart contracts on the fly. You'll need the `solc` compiler installed.</p>
<pre>
# On macOS
brew install solidity

# On Ubuntu
sudo add-apt-repository ppa:ethereum/ethereum
sudo apt-get update
sudo apt-get install solc
</pre>

<h4>Set Up Environment Variables</h4>
<p>Create a <code>.env</code> file in the <code>backend</code> directory and add your Ethereum node URL and your organization's wallet private key.</p>
<pre>
ETHEREUM_NODE_URL="https://sepolia.infura.io/v3/YOUR_INFURA_PROJECT_ID"
NGO_PRIVATE_KEY="YOUR_NGO_WALLET_PRIVATE_KEY"
</pre>

<h4>Deploy the NFT Contract</h4>
<p>You need to deploy the `NFT.sol` contract once. You can do this using tools like Remix, Hardhat, or a simple Python script. Once deployed, paste its address into `routers/nft.py` at the `NFT_CONTRACT_ADDRESS` variable.</p>

<h4>Run the API</h4>
<pre>uvicorn main:app --reload</pre>
<p>Default API URL: <code>http://localhost:8000</code></p>

<h3>3. Frontend Setup (React + Vite)</h3>
<pre>
cd ../frontend
npm install
npm run dev
</pre>
<p>Frontend runs on: <code>http://localhost:5173</code></p>

<h3>API Endpoints</h3>
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
      <td><code>/wallet/create</code></td>
      <td><strong>POST</strong></td>
      <td>Create a new Ethereum wallet.</td>
    </tr>
    <tr>
      <td><code>/projects/create-project</code></td>
      <td><strong>POST</strong></td>
      <td>Create a new charity project and deploy MultiMilestoneEscrow contract.</td>
    </tr>
    <tr>
      <td><code>/nft/mint</code></td>
      <td><strong>POST</strong></td>
      <td>Mint an NFT to a recipient's address.</td>
    </tr>
    <tr>
      <td><code>/nft/tokens</code></td>
      <td><strong>GET</strong></td>
      <td>Retrieve NFTs for a given account address.</td>
    </tr>
    <tr>
      <td><code>/transaction/latest-transactions</code></td>
      <td><strong>GET</strong></td>
      <td>Get the latest transactions for a given address.</td>
    </tr>
  </tbody>
</table>