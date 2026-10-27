const fs = require('fs');
const path = require('path');
const { IsolationForest } = require('ml-isolation-forest');

class FraudDetectionService {
  constructor() {
    this.models = {
      isolationForest: null
    };
    this.scaler = null;
    this.featureColumns = [
      'amount', 'fee', 'gas_limit', 'gas_price', 
      'block_number', 'timestamp', 'is_dex_trade', 'status'
    ];
    this.categoricalColumns = ['tx_type_name'];
    this.isTrained = false;
  }

  // Load and preprocess the transactions dataset
  async loadAndPreprocessData() {
    try {
      const dataPath = path.join(__dirname, '../../Frontend/transactions_dataset.json');
      
      // Check if file exists, if not create sample data
      if (!fs.existsSync(dataPath)) {
        console.log('transactions_dataset.json not found, creating sample data...');
        await this.createSampleData(dataPath);
      }

      const rawData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
      console.log(`Loaded ${rawData.length} transactions`);

      // Convert to DataFrame-like structure
      const processedData = this.preprocessTransactions(rawData);
      
      return {
        features: processedData.features,
        metadata: processedData.metadata,
        rawData: rawData
      };
    } catch (error) {
      console.error('Error loading data:', error);
      throw error;
    }
  }

  // Create sample transaction data for testing
  async createSampleData(filePath) {
    const sampleData = [];
    const txTypes = ['transfer', 'swap', 'mint', 'burn', 'approve'];
    const statuses = ['confirmed', 'pending'];
    
    for (let i = 0; i < 1000; i++) {
      const isFraud = Math.random() < 0.1; // 10% fraud rate
      const amount = isFraud ? 
        Math.random() * 1000000 + 500000 : // Higher amounts for fraud
        Math.random() * 100000;
      
      sampleData.push({
        tx_hash: `0x${Math.random().toString(16).substr(2, 64)}`,
        from_address: `0x${Math.random().toString(16).substr(2, 40)}`,
        to_address: `0x${Math.random().toString(16).substr(2, 40)}`,
        amount: amount,
        fee: Math.random() * 1000,
        gas_limit: Math.floor(Math.random() * 100000) + 21000,
        gas_price: Math.random() * 100,
        block_number: 18000000 + i,
        timestamp: Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000,
        is_dex_trade: Math.random() > 0.7,
        status: statuses[Math.floor(Math.random() * statuses.length)],
        tx_type_name: txTypes[Math.floor(Math.random() * txTypes.length)],
        block_hash: `0x${Math.random().toString(16).substr(2, 64)}`,
        is_fraud: isFraud,
        fraud_reason: isFraud ? 'Suspicious transaction pattern' : null
      });
    }
    
    fs.writeFileSync(filePath, JSON.stringify(sampleData, null, 2));
    console.log('Sample data created successfully');
  }

  // Preprocess transaction data
  preprocessTransactions(transactions) {
    const features = [];
    const metadata = [];

    transactions.forEach((tx, index) => {
      // Extract numerical features
      const numericalFeatures = {
        amount: parseFloat(tx.amount) || 0,
        fee: parseFloat(tx.fee) || 0,
        gas_limit: parseInt(tx.gas_limit) || 0,
        gas_price: parseFloat(tx.gas_price) || 0,
        block_number: parseInt(tx.block_number) || 0,
        timestamp: parseInt(tx.timestamp) || 0,
        is_dex_trade: tx.is_dex_trade ? 1 : 0,
        status: tx.status === 'confirmed' ? 1 : 0
      };

      // One-hot encode tx_type_name
      const txTypes = ['transfer', 'swap', 'mint', 'burn', 'approve'];
      const oneHotTxType = {};
      txTypes.forEach(type => {
        oneHotTxType[`tx_type_${type}`] = tx.tx_type_name === type ? 1 : 0;
      });

      // Combine all features
      const featureVector = {
        ...numericalFeatures,
        ...oneHotTxType
      };

      features.push(featureVector);
      metadata.push({
        tx_hash: tx.tx_hash,
        from_address: tx.from_address,
        to_address: tx.to_address,
        originalIndex: index
      });
    });

    return { features, metadata };
  }

  // Normalize features
  normalizeFeatures(features) {
    const normalized = [];
    const featureNames = Object.keys(features[0]);
    
    // Calculate min/max for each feature
    const minMax = {};
    featureNames.forEach(feature => {
      const values = features.map(f => f[feature]);
      minMax[feature] = {
        min: Math.min(...values),
        max: Math.max(...values)
      };
    });

    // Normalize each feature
    features.forEach(featureVector => {
      const normalizedVector = {};
      featureNames.forEach(feature => {
        const { min, max } = minMax[feature];
        normalizedVector[feature] = max === min ? 0 : (featureVector[feature] - min) / (max - min);
      });
      normalized.push(normalizedVector);
    });

    this.scaler = minMax;
    return normalized;
  }

  // Train anomaly detection models
  async trainModels() {
    try {
      const { features, metadata } = await this.loadAndPreprocessData();
      const normalizedFeatures = this.normalizeFeatures(features);
      
      // Convert to array format for ML models
      const featureMatrix = normalizedFeatures.map(f => Object.values(f));
      
      console.log('Training anomaly detection models...');

      // Train Isolation Forest
      this.models.isolationForest = new IsolationForest({
        contamination: 0.1, // 10% contamination
        randomState: 42
      });
      this.models.isolationForest.fit(featureMatrix);

      this.isTrained = true;
      console.log('Models trained successfully');

      // Calculate anomaly scores for training data
      const results = this.calculateAnomalyScores(normalizedFeatures, metadata);
      
      return {
        success: true,
        message: 'Models trained successfully',
        trainingResults: results
      };
    } catch (error) {
      console.error('Error training models:', error);
      throw error;
    }
  }

  // Calculate anomaly scores for transactions
  calculateAnomalyScores(features, metadata) {
    if (!this.isTrained) {
      throw new Error('Models not trained yet');
    }

    const featureMatrix = features.map(f => Object.values(f));
    const results = [];

    // Get predictions from Isolation Forest
    const ifScores = this.models.isolationForest.decisionFunction(featureMatrix);

    // Process results
    metadata.forEach((meta, index) => {
      const anomalyScore = ifScores[index];
      const isSuspicious = anomalyScore < -0.5; // Threshold for suspicious

      results.push({
        tx_hash: meta.tx_hash,
        from_address: meta.from_address,
        to_address: meta.to_address,
        anomaly_score: anomalyScore,
        is_suspicious: isSuspicious,
        individual_scores: {
          isolation_forest: anomalyScore
        }
      });
    });

    return results;
  }

  // Predict fraud for new transaction
  async predictFraud(transaction) {
    if (!this.isTrained) {
      await this.trainModels();
    }

    try {
      // Preprocess the single transaction
      const { features } = this.preprocessTransactions([transaction]);
      const normalizedFeatures = this.normalizeFeatures(features);
      const featureMatrix = normalizedFeatures.map(f => Object.values(f));

      // Get predictions from Isolation Forest
      const ifScore = this.models.isolationForest.decisionFunction(featureMatrix)[0];

      const isSuspicious = ifScore < -0.5;

      return {
        tx_hash: transaction.tx_hash,
        from_address: transaction.from_address,
        to_address: transaction.to_address,
        anomaly_score: ifScore,
        is_suspicious: isSuspicious,
        fraud_probability: Math.max(0, Math.min(1, (0.5 - ifScore) * 2)), // Convert to 0-1 probability
        individual_scores: {
          isolation_forest: ifScore
        }
      };
    } catch (error) {
      console.error('Error predicting fraud:', error);
      throw error;
    }
  }

  // Get fraud statistics
  getFraudStatistics(results) {
    const total = results.length;
    const suspicious = results.filter(r => r.is_suspicious).length;
    const suspiciousAddresses = [...new Set(results.filter(r => r.is_suspicious).map(r => r.from_address))];
    
    return {
      total_transactions: total,
      suspicious_transactions: suspicious,
      suspicious_percentage: (suspicious / total * 100).toFixed(2),
      unique_suspicious_addresses: suspiciousAddresses.length,
      suspicious_addresses: suspiciousAddresses
    };
  }

  // Analyze wallet for fraud patterns
  async analyzeWallet(walletAddress) {
    try {
      const { features, metadata, rawData } = await this.loadAndPreprocessData();
      
      // Filter transactions for this wallet
      const walletTransactions = rawData.filter(tx => 
        tx.from_address.toLowerCase() === walletAddress.toLowerCase() ||
        tx.to_address.toLowerCase() === walletAddress.toLowerCase()
      );

      if (walletTransactions.length === 0) {
        return {
          wallet_address: walletAddress,
          message: 'No transactions found for this wallet',
          transaction_count: 0
        };
      }

      // Analyze each transaction
      const analysisResults = [];
      for (const tx of walletTransactions) {
        const result = await this.predictFraud(tx);
        analysisResults.push(result);
      }

      const statistics = this.getFraudStatistics(analysisResults);
      
      return {
        wallet_address: walletAddress,
        transaction_count: walletTransactions.length,
        analysis_results: analysisResults,
        statistics: statistics,
        risk_level: statistics.suspicious_percentage > 20 ? 'HIGH' : 
                   statistics.suspicious_percentage > 10 ? 'MEDIUM' : 'LOW'
      };
    } catch (error) {
      console.error('Error analyzing wallet:', error);
      throw error;
    }
  }
}

module.exports = new FraudDetectionService();
