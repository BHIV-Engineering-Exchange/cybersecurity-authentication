const fs = require('fs');
const path = require('path');

// Analyze BHX transaction data to understand patterns
try {
  const dataPath = path.join(__dirname, '../../bhx_transactions.json');
  const rawData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  
  console.log('🔍 Analyzing BHX transaction data...\n');
  console.log(`📊 Total transactions: ${rawData.length}`);
  
  // Get unique wallet addresses
  const uniqueWallets = [...new Set(rawData.map(tx => tx.from_address))];
  console.log(`👥 Unique wallet addresses: ${uniqueWallets.length}`);
  
  // Analyze amounts
  const amounts = rawData.map(tx => tx.amount);
  const maxAmount = Math.max(...amounts);
  const minAmount = Math.min(...amounts);
  const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;
  
  console.log(`💰 Amount Analysis:`);
  console.log(`   • Max: ${maxAmount} BHX`);
  console.log(`   • Min: ${minAmount} BHX`);
  console.log(`   • Average: ${avgAmount.toFixed(2)} BHX`);
  
  // Analyze transaction types
  const txTypes = {};
  rawData.forEach(tx => {
    txTypes[tx.tx_type_name] = (txTypes[tx.tx_type_name] || 0) + 1;
  });
  
  console.log(`\n📋 Transaction Types:`);
  Object.entries(txTypes).forEach(([type, count]) => {
    console.log(`   • ${type}: ${count} transactions`);
  });
  
  // Analyze DEX trades
  const dexTrades = rawData.filter(tx => tx.is_dex_trade).length;
  console.log(`\n🔄 DEX Trades: ${dexTrades}/${rawData.length} (${(dexTrades/rawData.length*100).toFixed(1)}%)`);
  
  // Analyze gas prices
  const gasPrices = rawData.map(tx => tx.gas_price).filter(gp => gp > 0);
  if (gasPrices.length > 0) {
    const maxGas = Math.max(...gasPrices);
    const minGas = Math.min(...gasPrices);
    const avgGas = gasPrices.reduce((a, b) => a + b, 0) / gasPrices.length;
    
    console.log(`\n⛽ Gas Price Analysis:`);
    console.log(`   • Max: ${maxGas}`);
    console.log(`   • Min: ${minGas}`);
    console.log(`   • Average: ${avgGas.toFixed(2)}`);
    console.log(`   • Non-zero gas prices: ${gasPrices.length}/${rawData.length}`);
  } else {
    console.log(`\n⛽ Gas Price Analysis: All transactions have 0 gas price`);
  }
  
  // Analyze wallet activity
  const walletActivity = {};
  rawData.forEach(tx => {
    const wallet = tx.from_address;
    if (!walletActivity[wallet]) {
      walletActivity[wallet] = {
        txCount: 0,
        totalAmount: 0,
        maxAmount: 0,
        txTypes: new Set()
      };
    }
    walletActivity[wallet].txCount += 1;
    walletActivity[wallet].totalAmount += tx.amount;
    walletActivity[wallet].maxAmount = Math.max(walletActivity[wallet].maxAmount, tx.amount);
    walletActivity[wallet].txTypes.add(tx.tx_type_name);
  });
  
  // Find most active wallets
  const sortedWallets = Object.entries(walletActivity)
    .sort(([,a], [,b]) => b.txCount - a.txCount)
    .slice(0, 10);
  
  console.log(`\n🏆 Top 10 Most Active Wallets:`);
  sortedWallets.forEach(([wallet, stats], index) => {
    console.log(`${index + 1}. ${wallet.slice(0, 20)}... (${stats.txCount} txs, ${stats.totalAmount} BHX total, max: ${stats.maxAmount} BHX)`);
  });
  
  // Find high-value wallets
  const highValueWallets = Object.entries(walletActivity)
    .filter(([,stats]) => stats.totalAmount > 1000)
    .sort(([,a], [,b]) => b.totalAmount - a.totalAmount)
    .slice(0, 10);
  
  console.log(`\n💰 Top 10 High-Value Wallets (>1000 BHX):`);
  highValueWallets.forEach(([wallet, stats], index) => {
    console.log(`${index + 1}. ${wallet.slice(0, 20)}... (${stats.totalAmount} BHX total, ${stats.txCount} txs)`);
  });
  
  // Find wallets with high single transactions
  const highSingleTxWallets = Object.entries(walletActivity)
    .filter(([,stats]) => stats.maxAmount > 500)
    .sort(([,a], [,b]) => b.maxAmount - a.maxAmount)
    .slice(0, 10);
  
  console.log(`\n🚨 Top 10 Wallets with High Single Transactions (>500 BHX):`);
  highSingleTxWallets.forEach(([wallet, stats], index) => {
    console.log(`${index + 1}. ${wallet.slice(0, 20)}... (max: ${stats.maxAmount} BHX, ${stats.totalAmount} BHX total)`);
  });
  
} catch (error) {
  console.error('❌ Error analyzing BHX data:', error.message);
}
