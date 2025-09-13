let lastTxHash = null;

async function pollNewTransactions() {
  const url = new URL('https://127.0.0.1:8000/transaction/latest-transactions');
  if (lastTxHash) url.searchParams.append('last_tx_hash', lastTxHash);

  const res = await fetch(url);
  const data = await res.json();

  if (data.transactions.length > 0) {
    // Update UI with new txs
    // Update lastTxHash to the newest transaction's hash
    lastTxHash = data.transactions[0].hash;  // Assuming newest first
  }
}

// Poll every 5 seconds
setInterval(pollNewTransactions, 5000);
