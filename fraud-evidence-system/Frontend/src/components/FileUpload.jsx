import React, { useState, useRef } from 'react';
import axios from 'axios';
import { config } from '../utils/config';

const FileUpload = ({ caseId, entity, onUploadSuccess, onUploadError }) => {
  const [file, setFile] = useState(null);
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [riskLevel, setRiskLevel] = useState('medium');
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  const allowedFileTypes = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp',
    'application/pdf', 'text/plain', 'text/csv',
    'application/json', 'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/zip', 'application/x-zip-compressed',
    'application/x-rar-compressed', 'application/x-7z-compressed',
    'video/mp4', 'video/avi', 'video/quicktime',
    'audio/mp3', 'audio/wav', 'audio/mpeg',
    // Accept any file type
    '*/*'
  ];

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const validateFile = (file) => {
    if (!file) return { valid: false, error: 'No file selected' };
    
    if (file.size > 50 * 1024 * 1024) { // Increased to 50MB for ZIP files
      return { valid: false, error: 'File size must be less than 50MB' };
    }
    
    // Accept any file type
    return { valid: true };
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      const validation = validateFile(droppedFile);
      
      if (validation.valid) {
        setFile(droppedFile);
        setUploadResult(null);
      } else {
        onUploadError?.(validation.error);
      }
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      const validation = validateFile(selectedFile);
      
      if (validation.valid) {
        setFile(selectedFile);
        setUploadResult(null);
      } else {
        onUploadError?.(validation.error);
      }
    }
  };

  const handleUpload = async () => {
    if (!file) {
      onUploadError?.('Please select a file');
      return;
    }

    if (!caseId || !entity) {
      onUploadError?.('Case ID and entity are required');
      return;
    }

    setUploading(true);
    setUploadResult(null);

    try {
      const formData = new FormData();
      formData.append('evidenceFile', file);
      formData.append('caseId', caseId);
      formData.append('entity', entity);
      formData.append('description', description);
      formData.append('tags', tags);
      formData.append('riskLevel', riskLevel);

      const backendUrl = config.backendUrl;
      const token = localStorage.getItem('authToken');

      const response = await axios.post(
        `${backendUrl}/api/evidence/upload`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            'Authorization': `Bearer ${token}`
          }
        }
      );

      setUploadResult(response.data);
      onUploadSuccess?.(response.data);
      
      // Reset form
      setFile(null);
      setDescription('');
      setTags('');
      setRiskLevel('medium');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

    } catch (error) {
      console.error('Error uploading evidence:', error);
      const errorMessage = error.response?.data?.error || 'Failed to upload evidence';
      onUploadError?.(errorMessage);
    } finally {
      setUploading(false);
    }
  };

  const removeFile = () => {
    setFile(null);
    setUploadResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const dropZoneClass = `border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
    dragActive
      ? 'border-blue-400 bg-blue-50'
      : file
      ? 'border-green-400 bg-green-50'
      : 'border-gray-300 bg-gray-50 hover:border-gray-400'
  }`;

  const buttonClass = `w-full py-2 px-4 rounded-md text-white font-medium transition-colors ${
    !file || uploading
      ? 'bg-gray-400 cursor-not-allowed'
      : 'bg-blue-600 hover:bg-blue-700'
  }`;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
      <h3 className="text-lg font-semibold mb-4 text-gray-800">📎 Upload Evidence</h3>
      
      {/* File Drop Zone */}
      <div
        className={dropZoneClass}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        {file ? (
          <div className="space-y-2">
            <div className="text-green-600 text-lg">✅</div>
            <p className="text-sm font-medium text-gray-700">{file.name}</p>
            <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
            <button
              onClick={removeFile}
              className="text-red-600 hover:text-red-800 text-sm underline"
            >
              Remove file
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="text-gray-400 text-3xl">📁</div>
            <p className="text-gray-600">
              Drag and drop your evidence file here, or{' '}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="text-blue-600 hover:text-blue-800 underline"
              >
                browse
              </button>
            </p>
            <p className="text-xs text-gray-500">
              Supported: Any file type including ZIP, PDF, Images, Documents, Videos, Audio (Max 50MB)
            </p>
          </div>
        )}
        
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileSelect}
          accept="*/*"
          className="hidden"
        />
      </div>

      {/* Evidence Details */}
      <div className="mt-4 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md text-sm"
            placeholder="Describe this evidence..."
            rows="2"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tags (comma-separated)
            </label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md text-sm"
              placeholder="invoice, suspicious, transaction"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Risk Level
            </label>
            <select
              value={riskLevel}
              onChange={(e) => setRiskLevel(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="low">Low Risk</option>
              <option value="medium">Medium Risk</option>
              <option value="high">High Risk</option>
            </select>
          </div>
        </div>

        <button
          onClick={handleUpload}
          disabled={!file || uploading}
          className={buttonClass}
        >
          {uploading ? '🔄 Uploading...' : '📤 Upload Evidence'}
        </button>
      </div>

      {/* Upload Result */}
      {uploadResult && (
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-md">
          <h4 className="text-green-800 font-medium mb-2">✅ Evidence Uploaded Successfully!</h4>
          <div className="text-sm text-green-700 space-y-1">
            <p><strong>File Hash:</strong> {uploadResult.evidence.fileHash.substring(0, 16)}...</p>
            <p><strong>IPFS Hash:</strong> {uploadResult.evidence.ipfsHash}</p>
            <p><strong>Blockchain Tx:</strong> {uploadResult.blockchain.txHash.substring(0, 16)}...</p>
            <p><strong>Block Number:</strong> {uploadResult.blockchain.blockNumber}</p>
            <p><strong>Timestamp:</strong> {new Date(uploadResult.evidence.uploadedAt).toLocaleString()}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default FileUpload;