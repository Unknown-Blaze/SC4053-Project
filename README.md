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
<pre>git clone https://github.com/Unknown-Blaze/SC4053-Project.git
cd SC4053-Project/backend</pre>

<h3>2. Backend Setup (FastAPI)</h3>

<h4>Install Dependencies</h4>
<pre>
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
</pre>

<h4>Hardhat Setup</h4>
<pre>
npm install
npx hardhat compile
</pre>

<h4>Set Up Environment Variables</h4>
<p>Create a <code>.env</code> file in the <code>backend</code> directory and add your Ethereum node URL and your organization's wallet private key.</p>
<pre>
ETHEREUM_NODE_URL="https://sepolia.infura.io/v3/YOUR_INFURA_PROJECT_ID"
NGO_PRIVATE_KEY="YOUR_NGO_WALLET_PRIVATE_KEY"
</pre>

<h4>Deploy the NFT Contract</h4>
<p>You need to deploy the <code>NFT.sol</code> contract once using the <code>backend\deploy_contract.py</code> script. Once deployed, paste its address into <code>.env</code> file at the <code>NFT_CONTRACT_ADDRESS</code> variable.</p>

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

<h3>API Endpoints</h3> <table> <thead> <tr> <th>Endpoint</th> <th>Method</th> <th>Description</th> </tr> </thead> <tbody>
<!-- Projects -->
<tr>
  <td><code>/projects/create-project</code></td>
  <td><strong>POST</strong></td>
  <td>Create a new project and deploy its smart contract.</td>
</tr>
<tr>
  <td><code>/projects/all</code></td>
  <td><strong>GET</strong></td>
  <td>Fetch a list of all registered projects.</td>
</tr>
<tr>
  <td><code>/projects/project/:contractAddress/details</code></td>
  <td><strong>GET</strong></td>
  <td>Fetch project details using its contract address.</td>
</tr>
<tr>
  <td><code>/projects/project/:contractAddress/mint-certificate</code></td>
  <td><strong>POST</strong></td>
  <td>Mint a donation certificate (NFT) for a specific project.</td>
</tr>
<tr>
  <td><code>/projects/project/:contractAddress/verify-milestone/:milestoneIndex</code></td>
  <td><strong>PATCH</strong></td>
  <td>Verify a milestone for the given project and milestone index.</td>
</tr>

<!-- NFT -->
<tr>
  <td><code>/nft/gallery/:walletAddress</code></td>
  <td><strong>GET</strong></td>
  <td>Retrieve all NFTs owned by a given wallet address.</td>
</tr>

<!-- Transactions -->
<tr>
  <td><code>/transaction/latest-transactions?address=:address</code></td>
  <td><strong>GET</strong></td>
  <td>Fetch the latest blockchain transactions performed by a specific address.</td>
</tr>

</tbody> </table>