import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { config } from '../utils/config';
import { toast } from 'react-toastify';
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge
} from 'reactflow';
import 'reactflow/dist/style.css';

const CaseCorrelationVisualization = ({ caseId, onClose }) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [loading, setLoading] = useState(false);
  const [investigationData, setInvestigationData] = useState(null);

  const fetchCaseCorrelations = async () => {
    if (!caseId) return;

    setLoading(true);
    try {
      const backendUrl = config.backendUrl;
      const token = localStorage.getItem('authToken');

      // Fetch investigation data
      const investigationResponse = await axios.get(
        `${backendUrl}/api/investigations/${caseId}/correlation-data`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (investigationResponse.data) {
        setInvestigationData(investigationResponse.data);
        generateGraphData(investigationResponse.data);
      }
    } catch (error) {
      console.error('Error fetching case correlations:', error);
      toast.error('❌ Failed to fetch case correlations');
    } finally {
      setLoading(false);
    }
  };

  const generateGraphData = (data) => {
    if (!data) return;

    const newNodes = [];
    const newEdges = [];
    const nodePositions = {};

    // Add case node
    const caseNode = {
      id: `case-${data._id}`,
      type: 'input',
      data: { 
        label: `📋 Case ${data.investigationId || data._id}`,
        type: 'case',
        details: {
          title: data.title,
          status: data.status,
          priority: data.priority,
          riskScore: data.riskAssessment?.overallRisk || 0
        }
      },
      position: { x: 0, y: 0 },
      style: {
        background: '#6366f1',
        color: 'white',
        border: '2px solid #4f46e5',
        width: 150
      }
    };
    newNodes.push(caseNode);
    nodePositions[`case-${data._id}`] = { x: 0, y: 0 };

    // Add entity nodes
    data.entities?.forEach((entity, index) => {
      const nodeId = `entity-${entity.value}`;
      const x = (index % 3) * 300 - 300;
      const y = Math.floor(index / 3) * 200 + 100;
      
      const node = {
        id: nodeId,
        data: { 
          label: `${getEntityIcon(entity.type)} ${entity.value.substring(0, 12)}${entity.value.length > 12 ? '...' : ''}`,
          type: 'entity',
          details: {
            type: entity.type,
            value: entity.value,
            verified: entity.verified
          }
        },
        position: { x, y },
        style: {
          background: getEntityColor(entity.type),
          color: 'white',
          border: '2px solid #4b5563',
          width: 180
        }
      };
      newNodes.push(node);
      nodePositions[nodeId] = { x, y };

      // Add edge from case to entity
      newEdges.push({
        id: `e-case-${data._id}-entity-${entity.value}`,
        source: `case-${data._id}`,
        target: nodeId,
        animated: true,
        style: { stroke: '#94a3b8', strokeWidth: 2 },
        label: 'contains',
        labelStyle: { fill: '#64748b', fontWeight: 500 }
      });
    });

    // Add connection edges
    data.connections?.forEach((connection, index) => {
      const sourceId = `entity-${connection.entity1.value}`;
      const targetId = `entity-${connection.entity2.value}`;
      
      // Only add edge if both nodes exist
      if (nodePositions[sourceId] && nodePositions[targetId]) {
        newEdges.push({
          id: `e-${sourceId}-${targetId}-${index}`,
          source: sourceId,
          target: targetId,
          animated: connection.strength > 0.7,
          style: { 
            stroke: getConnectionColor(connection.type), 
            strokeWidth: Math.max(1, connection.strength * 3) 
          },
          label: getConnectionLabel(connection.type),
          labelStyle: { fill: '#64748b', fontWeight: 500 },
          labelBgStyle: { fill: '#f1f5f9' }
        });
      }
    });

    // Add evidence nodes if available
    if (data.relatedEvidenceDetails && data.relatedEvidenceDetails.length > 0) {
      data.relatedEvidenceDetails.forEach((evidence, index) => {
        const nodeId = `evidence-${evidence._id}`;
        const parentEntity = data.entities?.[index % data.entities.length];
        const parentPos = parentEntity ? nodePositions[`entity-${parentEntity.value}`] : { x: 0, y: 0 };
        
        const node = {
          id: nodeId,
          data: { 
            label: `📎 ${evidence.filename?.substring(0, 15) || 'Evidence'}`,
            type: 'evidence',
            details: {
              id: evidence._id,
              filename: evidence.filename,
              fileType: evidence.fileType,
              fileSize: evidence.fileSize,
              riskLevel: evidence.riskLevel,
              uploadedAt: evidence.uploadedAt
            }
          },
          position: { 
            x: parentPos.x + 200 + (index % 2) * 200, 
            y: parentPos.y + 150 + Math.floor(index / 2) * 100 
          },
          style: {
            background: getEvidenceColor(evidence.riskLevel),
            color: 'white',
            border: '2px solid #92400e',
            width: 150
          }
        };
        newNodes.push(node);

        // Connect to parent entity
        if (parentEntity) {
          newEdges.push({
            id: `e-entity-${parentEntity.value}-evidence-${evidence._id}`,
            source: `entity-${parentEntity.value}`,
            target: nodeId,
            style: { stroke: '#f59e0b', strokeWidth: 1.5 },
            label: 'has evidence',
            labelStyle: { fill: '#92400e', fontWeight: 500 }
          });
        }
      });
    }

    setNodes(newNodes);
    setEdges(newEdges);
  };

  const getEntityIcon = (type) => {
    switch (type) {
      case 'wallet_address': return '💼';
      case 'ip_address': return '🌐';
      case 'domain': return '🔗';
      case 'email': return '📧';
      case 'phone': return '📱';
      case 'device_id': return '📱';
      case 'transaction_hash': return '🔗';
      default: return '❓';
    }
  };

  const getEntityColor = (type) => {
    switch (type) {
      case 'wallet_address': return '#10b981'; // green
      case 'ip_address': return '#3b82f6'; // blue
      case 'domain': return '#8b5cf6'; // purple
      case 'email': return '#ec4899'; // pink
      case 'phone': return '#f59e0b'; // amber
      case 'device_id': return '#ef4444'; // red
      case 'transaction_hash': return '#06b6d4'; // cyan
      default: return '#64748b'; // gray
    }
  };

  const getConnectionColor = (type) => {
    switch (type) {
      case 'direct_link': return '#10b981'; // green
      case 'temporal_correlation': return '#f59e0b'; // amber
      case 'geographic_proximity': return '#3b82f6'; // blue
      case 'behavioral_similarity': return '#8b5cf6'; // purple
      case 'evidence_link': return '#ec4899'; // pink
      default: return '#94a3b8'; // slate
    }
  };

  const getConnectionLabel = (type) => {
    switch (type) {
      case 'direct_link': return '🔗 Direct';
      case 'temporal_correlation': return '🕐 Temporal';
      case 'geographic_proximity': return '📍 Geo';
      case 'behavioral_similarity': return '🧠 Behavioral';
      case 'evidence_link': return '📎 Evidence';
      default: return '🔗 Connected';
    }
  };

  const getEvidenceColor = (riskLevel) => {
    switch (riskLevel) {
      case 'high': return '#ef4444'; // red
      case 'medium': return '#f59e0b'; // amber
      case 'low': return '#10b981'; // green
      default: return '#64748b'; // gray
    }
  };

  const onConnect = (params) => setEdges((eds) => addEdge(params, eds));

  useEffect(() => {
    fetchCaseCorrelations();
  }, [caseId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading case correlations...</span>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm h-full flex flex-col">
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">
            🌐 Case Correlation Visualization
          </h3>
          {investigationData && (
            <p className="text-sm text-gray-600 mt-1">
              Case: {investigationData.investigationId || investigationData._id} • 
              Risk: {(investigationData.riskAssessment?.overallRisk * 100).toFixed(0)}% •
              Entities: {investigationData.entities?.length || 0}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchCaseCorrelations}
            className="text-blue-600 hover:text-blue-800 text-sm underline"
          >
            Refresh
          </button>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>
      </div>

      <div className="flex-1 relative">
        {nodes.length > 0 ? (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            fitView
            attributionPosition="bottom-left"
          >
            <Controls />
            <MiniMap />
            <Background variant="dots" gap={12} size={1} />
          </ReactFlow>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <div className="text-4xl mb-2">🌐</div>
              <p>No correlation data available for this case.</p>
              <button
                onClick={fetchCaseCorrelations}
                className="mt-2 text-blue-600 hover:text-blue-800 underline"
              >
                Refresh
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <h4 className="font-medium text-gray-800 mb-2">Legend</h4>
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#6366f1' }}></div>
            <span>Case</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#10b981' }}></div>
            <span>Wallet</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#3b82f6' }}></div>
            <span>IP Address</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#8b5cf6' }}></div>
            <span>Domain</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#ec4899' }}></div>
            <span>Email</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#ef4444' }}></div>
            <span>High Risk Evidence</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#f59e0b' }}></div>
            <span>Medium Risk Evidence</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CaseCorrelationVisualization;