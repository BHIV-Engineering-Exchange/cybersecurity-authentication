const Investigation = require('../models/Investigation');
const Evidence = require('../models/Evidence');
const mongoose = require('mongoose');

class CaseLinkingService {
  /**
   * Link multiple entities under a single investigation
   * @param {Array} entities - Array of entities to link
   * @param {Object} metadata - Additional investigation metadata
   * @returns {Object} Investigation object
   */
  static async linkEntities(entities, metadata = {}) {
    try {
      // Create or find existing investigation
      let investigation = await this.findExistingInvestigation(entities);
      
      if (!investigation) {
        investigation = new Investigation({
          title: metadata.title || `Investigation - ${new Date().toISOString().split('T')[0]}`,
          description: metadata.description || 'Auto-generated case linking investigation',
          entities: entities,
          status: 'active',
          priority: metadata.priority || 'medium',
          assignedTo: metadata.assignedTo,
          tags: metadata.tags || [],
          createdBy: metadata.createdBy,
          timeline: [],
          connections: [],
          riskAssessment: {
            overallRisk: 0,
            riskFactors: [],
            lastUpdated: new Date()
          },
          auditTrail: [{
            action: 'investigation_created',
            timestamp: new Date(),
            user: metadata.createdBy,
            details: 'Investigation created via case linking'
          }]
        });
      } else {
        // Merge new entities with existing ones
        const existingEntityIds = investigation.entities.map(e => e.value);
        const newEntities = entities.filter(e => !existingEntityIds.includes(e.value));
        investigation.entities.push(...newEntities);
        
        investigation.auditTrail.push({
          action: 'entities_linked',
          timestamp: new Date(),
          user: metadata.createdBy,
          details: `Added ${newEntities.length} new entities to investigation`
        });
      }
      
      // Analyze connections between entities
      await this.analyzeEntityConnections(investigation);
      
      // Update risk assessment
      await this.updateRiskAssessment(investigation);
      
      await investigation.save();
      return investigation;
    } catch (error) {
      console.error('Error linking entities:', error);
      throw error;
    }
  }

  /**
   * Find existing investigation that contains any of the provided entities
   * @param {Array} entities - Entities to search for
   * @returns {Object|null} Existing investigation or null
   */
  static async findExistingInvestigation(entities) {
    try {
      const entityValues = entities.map(e => e.value);
      
      // First, check if any of these entities are already in an active investigation
      const existingInvestigation = await Investigation.findOne({
        'entities.value': { $in: entityValues },
        status: { $in: ['active', 'under_review'] }
      });
      
      if (existingInvestigation) {
        return existingInvestigation;
      }
      
      // If no existing investigation found, check for investigations with similar entities
      // This helps group related entities under one investigation ID
      for (const entity of entities) {
        // Look for investigations with entities of the same type
        const relatedInvestigations = await Investigation.find({
          'entities.type': entity.type,
          status: { $in: ['active', 'under_review'] },
          _id: { $ne: existingInvestigation?._id }
        }).limit(5);
        
        // For IP addresses, check for geographic proximity
        if (entity.type === 'ip_address') {
          const geoip = require('geoip-lite');
          const entityGeo = geoip.lookup(entity.value);
          
          if (entityGeo) {
            for (const inv of relatedInvestigations) {
              for (const invEntity of inv.entities) {
                if (invEntity.type === 'ip_address' && invEntity.value !== entity.value) {
                  const invGeo = geoip.lookup(invEntity.value);
                  if (invGeo) {
                    const distance = this.calculateDistance(
                      entityGeo.ll[0], entityGeo.ll[1],
                      invGeo.ll[0], invGeo.ll[1]
                    );
                    
                    // If IPs are within 200km, consider them related
                    if (distance <= 200) {
                      return inv;
                    }
                  }
                }
              }
            }
          }
        }
        
        // For wallet addresses, check for transaction connections
        if (entity.type === 'wallet_address') {
          for (const inv of relatedInvestigations) {
            for (const invEntity of inv.entities) {
              if (invEntity.type === 'wallet_address' && invEntity.value !== entity.value) {
                // Check if these wallets have interacted in evidence
                const evidenceConnection = await Evidence.findOne({
                  $and: [
                    { $or: [{ walletAddress: entity.value }, { ipAddress: entity.value }] },
                    { $or: [{ walletAddress: invEntity.value }, { ipAddress: invEntity.value }] }
                  ]
                });
                
                if (evidenceConnection) {
                  return inv;
                }
              }
            }
          }
        }
      }
      
      return existingInvestigation;
    } catch (error) {
      console.error('Error finding existing investigation:', error);
      return null;
    }
  }

  /**
   * Analyze connections between entities in an investigation
   * @param {Object} investigation - Investigation object
   */
  static async analyzeEntityConnections(investigation) {
    try {
      const connections = [];
      const entities = investigation.entities;
      
      // Analyze pairwise connections
      for (let i = 0; i < entities.length; i++) {
        for (let j = i + 1; j < entities.length; j++) {
          const connection = await this.findConnection(entities[i], entities[j]);
          if (connection) {
            connections.push(connection);
          }
        }
      }
      
      // Temporal correlation analysis
      const temporalConnections = await this.analyzeTemporalCorrelations(entities);
      connections.push(...temporalConnections);
      
      // Geographic proximity analysis for IPs
      const geoConnections = await this.analyzeGeographicProximity(entities);
      connections.push(...geoConnections);
      
      // Behavioral similarity analysis for wallets
      const behaviorConnections = await this.analyzeBehavioralSimilarity(entities);
      connections.push(...behaviorConnections);
      
      investigation.connections = connections;
      
      // Update timeline with connection events
      await this.updateTimelineWithConnections(investigation, connections);
    } catch (error) {
      console.error('Error analyzing entity connections:', error);
    }
  }

  /**
   * Find direct connection between two entities
   * @param {Object} entity1 - First entity
   * @param {Object} entity2 - Second entity
   * @returns {Object|null} Connection object or null
   */
  static async findConnection(entity1, entity2) {
    try {
      // Check evidence records for connections
      const evidenceConnection = await Evidence.findOne({
        $or: [
          { 
            $and: [
              { $or: [{ walletAddress: entity1.value }, { ipAddress: entity1.value }] },
              { $or: [{ walletAddress: entity2.value }, { ipAddress: entity2.value }] }
            ]
          }
        ]
      });
      
      if (evidenceConnection) {
        return {
          type: 'evidence_link',
          entity1: entity1,
          entity2: entity2,
          strength: 0.8,
          evidence: evidenceConnection._id,
          timestamp: evidenceConnection.createdAt,
          description: `Entities connected through evidence: ${evidenceConnection.filename}`
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error finding connection:', error);
      return null;
    }
  }

  /**
   * Analyze temporal correlations between entities
   * @param {Array} entities - Array of entities
   * @returns {Array} Array of temporal connections
   */
  static async analyzeTemporalCorrelations(entities) {
    try {
      const connections = [];
      const timeWindow = 60 * 60 * 1000; // 1 hour window
      
      // Get evidence for all entities within time windows
      const entityValues = entities.map(e => e.value);
      const evidenceRecords = await Evidence.find({
        $or: [
          { walletAddress: { $in: entityValues } },
          { ipAddress: { $in: entityValues } }
        ]
      }).sort({ createdAt: 1 });
      
      // Find evidence records that occur within the time window
      for (let i = 0; i < evidenceRecords.length; i++) {
        for (let j = i + 1; j < evidenceRecords.length; j++) {
          const timeDiff = Math.abs(evidenceRecords[j].createdAt - evidenceRecords[i].createdAt);
          
          if (timeDiff <= timeWindow) {
            const entity1 = entities.find(e => 
              e.value === evidenceRecords[i].walletAddress || 
              e.value === evidenceRecords[i].ipAddress
            );
            const entity2 = entities.find(e => 
              e.value === evidenceRecords[j].walletAddress || 
              e.value === evidenceRecords[j].ipAddress
            );
            
            if (entity1 && entity2 && entity1.value !== entity2.value) {
              connections.push({
                type: 'temporal_correlation',
                entity1: entity1,
                entity2: entity2,
                strength: Math.max(0.1, 1 - (timeDiff / timeWindow)),
                timeDifference: timeDiff,
                evidence: [evidenceRecords[i]._id, evidenceRecords[j]._id],
                timestamp: new Date(),
                description: `Entities active within ${Math.round(timeDiff / 60000)} minutes of each other`
              });
            }
          }
        }
      }
      
      return connections;
    } catch (error) {
      console.error('Error analyzing temporal correlations:', error);
      return [];
    }
  }

  /**
   * Analyze geographic proximity for IP addresses
   * @param {Array} entities - Array of entities
   * @returns {Array} Array of geographic connections
   */
  static async analyzeGeographicProximity(entities) {
    try {
      const connections = [];
      const geoip = require('geoip-lite');
      
      const ipEntities = entities.filter(e => e.type === 'ip_address');
      
      for (let i = 0; i < ipEntities.length; i++) {
        for (let j = i + 1; j < ipEntities.length; j++) {
          const geo1 = geoip.lookup(ipEntities[i].value);
          const geo2 = geoip.lookup(ipEntities[j].value);
          
          if (geo1 && geo2) {
            const distance = this.calculateDistance(
              geo1.ll[0], geo1.ll[1],
              geo2.ll[0], geo2.ll[1]
            );
            
            // Consider IPs within 100km as geographically connected
            if (distance <= 100) {
              connections.push({
                type: 'geographic_proximity',
                entity1: ipEntities[i],
                entity2: ipEntities[j],
                strength: Math.max(0.1, 1 - (distance / 100)),
                distance: distance,
                locations: {
                  entity1: { country: geo1.country, city: geo1.city, coords: geo1.ll },
                  entity2: { country: geo2.country, city: geo2.city, coords: geo2.ll }
                },
                timestamp: new Date(),
                description: `IP addresses within ${distance.toFixed(2)}km of each other`
              });
            }
          }
        }
      }
      
      return connections;
    } catch (error) {
      console.error('Error analyzing geographic proximity:', error);
      return [];
    }
  }

  /**
   * Analyze behavioral similarity between wallet addresses
   * @param {Array} entities - Array of entities
   * @returns {Array} Array of behavioral connections
   */
  static async analyzeBehavioralSimilarity(entities) {
    try {
      const connections = [];
      const walletEntities = entities.filter(e => e.type === 'wallet_address');
      
      if (walletEntities.length < 2) return connections;
      
      // Get evidence for all wallet entities
      const entityValues = walletEntities.map(e => e.value);
      const evidenceRecords = await Evidence.find({
        walletAddress: { $in: entityValues }
      });
      
      // Group evidence by wallet
      const evidenceByWallet = {};
      evidenceRecords.forEach(record => {
        if (!evidenceByWallet[record.walletAddress]) {
          evidenceByWallet[record.walletAddress] = [];
        }
        evidenceByWallet[record.walletAddress].push(record);
      });
      
      // Compare behavioral patterns between wallets
      for (let i = 0; i < walletEntities.length; i++) {
        for (let j = i + 1; j < walletEntities.length; j++) {
          const wallet1 = walletEntities[i].value;
          const wallet2 = walletEntities[j].value;
          
          const evidence1 = evidenceByWallet[wallet1] || [];
          const evidence2 = evidenceByWallet[wallet2] || [];
          
          if (evidence1.length > 0 && evidence2.length > 0) {
            // Calculate similarity based on transaction patterns
            const similarity = this.calculateBehavioralSimilarity(evidence1, evidence2);
            
            if (similarity > 0.7) { // Threshold for significant similarity
              connections.push({
                type: 'behavioral_similarity',
                entity1: walletEntities[i],
                entity2: walletEntities[j],
                strength: similarity,
                evidence: [...evidence1.map(e => e._id), ...evidence2.map(e => e._id)],
                timestamp: new Date(),
                description: `Wallets show ${Math.round(similarity * 100)}% behavioral similarity`
              });
            }
          }
        }
      }
      
      return connections;
    } catch (error) {
      console.error('Error analyzing behavioral similarity:', error);
      return [];
    }
  }

  /**
   * Calculate behavioral similarity between two sets of evidence
   * @param {Array} evidence1 - Evidence records for first wallet
   * @param {Array} evidence2 - Evidence records for second wallet
   * @returns {number} Similarity score between 0 and 1
   */
  static calculateBehavioralSimilarity(evidence1, evidence2) {
    try {
      // Simple heuristic: compare transaction frequency, value patterns, and timing
      const avgValue1 = evidence1.reduce((sum, e) => sum + (e.fileSize || 0), 0) / evidence1.length;
      const avgValue2 = evidence2.reduce((sum, e) => sum + (e.fileSize || 0), 0) / evidence2.length;
      
      // Normalize the difference in average values
      const maxValue = Math.max(avgValue1, avgValue2);
      const valueSimilarity = maxValue > 0 ? 1 - (Math.abs(avgValue1 - avgValue2) / maxValue) : 1;
      
      // Compare transaction frequency (per day)
      const days1 = this.getUniqueDays(evidence1);
      const days2 = this.getUniqueDays(evidence2);
      const freq1 = evidence1.length / Math.max(days1, 1);
      const freq2 = evidence2.length / Math.max(days2, 1);
      const maxFreq = Math.max(freq1, freq2);
      const freqSimilarity = maxFreq > 0 ? 1 - (Math.abs(freq1 - freq2) / maxFreq) : 1;
      
      // Weighted average of similarities
      return (valueSimilarity * 0.6) + (freqSimilarity * 0.4);
    } catch (error) {
      console.error('Error calculating behavioral similarity:', error);
      return 0;
    }
  }

  /**
   * Get number of unique days from evidence records
   * @param {Array} evidence - Evidence records
   * @returns {number} Number of unique days
   */
  static getUniqueDays(evidence) {
    const uniqueDays = new Set();
    evidence.forEach(e => {
      if (e.createdAt) {
        const date = new Date(e.createdAt);
        uniqueDays.add(date.toDateString());
      }
    });
    return uniqueDays.size;
  }

  /**
   * Calculate distance between two coordinates using Haversine formula
   * @param {number} lat1 - Latitude 1
   * @param {number} lon1 - Longitude 1
   * @param {number} lat2 - Latitude 2
   * @param {number} lon2 - Longitude 2
   * @returns {number} Distance in kilometers
   */
  static calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  static toRadians(degrees) {
    return degrees * (Math.PI / 180);
  }

  /**
   * Update investigation timeline with connection events
   * @param {Object} investigation - Investigation object
   * @param {Array} connections - Array of connections
   */
  static async updateTimelineWithConnections(investigation, connections) {
    try {
      const connectionEvents = connections.map(conn => ({
        timestamp: conn.timestamp,
        type: 'connection_detected',
        description: `${conn.type}: ${conn.description}`,
        entities: [conn.entity1.value, conn.entity2.value],
        strength: conn.strength,
        metadata: {
          connectionType: conn.type,
          evidence: conn.evidence || null
        }
      }));
      
      investigation.timeline.push(...connectionEvents);
      investigation.timeline.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    } catch (error) {
      console.error('Error updating timeline:', error);
    }
  }

  /**
   * Update risk assessment for investigation
   * @param {Object} investigation - Investigation object
   */
  static async updateRiskAssessment(investigation) {
    try {
      let riskScore = 0;
      const riskFactors = [];
      
      // Base risk from number of entities
      const entityRisk = Math.min(investigation.entities.length * 0.1, 0.5);
      riskScore += entityRisk;
      riskFactors.push(`${investigation.entities.length} entities involved`);
      
      // Risk from connection strength
      const avgConnectionStrength = investigation.connections.length > 0 ?
        investigation.connections.reduce((sum, conn) => sum + conn.strength, 0) / investigation.connections.length : 0;
      riskScore += avgConnectionStrength * 0.3;
      if (avgConnectionStrength > 0.7) {
        riskFactors.push('Strong entity connections detected');
      }
      
      // Risk from temporal correlations
      const temporalConnections = investigation.connections.filter(c => c.type === 'temporal_correlation');
      if (temporalConnections.length > 0) {
        riskScore += temporalConnections.length * 0.1;
        riskFactors.push(`${temporalConnections.length} temporal correlations found`);
      }
      
      // Risk from geographic clustering
      const geoConnections = investigation.connections.filter(c => c.type === 'geographic_proximity');
      if (geoConnections.length > 0) {
        riskScore += geoConnections.length * 0.05;
        riskFactors.push(`${geoConnections.length} geographic proximities detected`);
      }
      
      investigation.riskAssessment = {
        overallRisk: Math.min(riskScore, 1),
        riskFactors: riskFactors,
        lastUpdated: new Date()
      };
    } catch (error) {
      console.error('Error updating risk assessment:', error);
    }
  }

  /**
   * Get all investigations with pagination
   * @param {Object} options - Query options
   * @returns {Object} Paginated investigations
   */
  static async getAllInvestigations(options = {}) {
    try {
      const { entityType, limit = 20, skip = 0, status, priority } = options;
      
      let query = {};
      if (entityType) {
        query['entities.type'] = entityType;
      }
      if (status) {
        query.status = status;
      }
      if (priority) {
        query.priority = priority;
      }
      
      const investigations = await Investigation.find(query)
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .populate('assignedTo', 'email firstName lastName');
      
      const total = await Investigation.countDocuments(query);
      
      return {
        investigations,
        pagination: {
          total,
          limit,
          skip,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('Error getting investigations:', error);
      throw error;
    }
  }

  /**
   * Get investigation by ID
   * @param {string} id - Investigation ID
   * @returns {Object|null} Investigation object
   */
  static async getInvestigationById(id) {
    try {
      return await Investigation.findById(id)
        .populate('assignedTo', 'email firstName lastName')
        .populate('createdBy', 'email firstName lastName');
    } catch (error) {
      console.error('Error getting investigation by ID:', error);
      throw error;
    }
  }

  /**
   * Update investigation
   * @param {string} id - Investigation ID
   * @param {Object} updates - Update data
   * @returns {Object|null} Updated investigation
   */
  static async updateInvestigation(id, updates) {
    try {
      const investigation = await Investigation.findByIdAndUpdate(
        id,
        { 
          ...updates,
          updatedAt: new Date()
        },
        { new: true }
      ).populate('assignedTo', 'email firstName lastName');
      
      if (investigation) {
        investigation.auditTrail.push({
          action: 'investigation_updated',
          timestamp: new Date(),
          user: updates.updatedBy,
          details: 'Investigation updated'
        });
        await investigation.save();
      }
      
      return investigation;
    } catch (error) {
      console.error('Error updating investigation:', error);
      throw error;
    }
  }

  /**
   * Analyze connections in an existing investigation
   * @param {string} investigationId - Investigation ID
   * @returns {Object} Analysis results
   */
  static async analyzeConnections(investigationId) {
    try {
      const investigation = await Investigation.findById(investigationId);
      if (!investigation) {
        throw new Error('Investigation not found');
      }
      
      // Re-analyze connections
      await this.analyzeEntityConnections(investigation);
      await this.updateRiskAssessment(investigation);
      await investigation.save();
      
      return {
        totalConnections: investigation.connections.length,
        connectionTypes: this.groupConnectionsByType(investigation.connections),
        riskAssessment: investigation.riskAssessment,
        timeline: investigation.timeline
      };
    } catch (error) {
      console.error('Error analyzing connections:', error);
      throw error;
    }
  }

  /**
   * Group connections by type for analysis
   * @param {Array} connections - Array of connections
   * @returns {Object} Grouped connections
   */
  static groupConnectionsByType(connections) {
    return connections.reduce((groups, conn) => {
      const type = conn.type;
      if (!groups[type]) {
        groups[type] = {
          count: 0,
          avgStrength: 0,
          connections: []
        };
      }
      groups[type].count++;
      groups[type].connections.push(conn);
      groups[type].avgStrength = groups[type].connections.reduce((sum, c) => sum + c.strength, 0) / groups[type].connections.length;
      return groups;
    }, {});
  }
}

module.exports = CaseLinkingService;