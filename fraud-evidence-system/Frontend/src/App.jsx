import { useState, useEffect, useCallback } from "react";
import { supabase } from "./supabase";
import WalletInput from "./components/WalletInput";
import Timeline from "./components/Timeline";
// Removed OnChainStats to eliminate chain report display
import FileUpload from "./components/FileUpload";
import EvidenceLibrary from "./components/EvidenceLibrary";
import ChainVisualizer from "./components/ChainVisualizer";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { flagWallet } from "./contract";
import { Link } from "react-router-dom";
import { useEventPolling } from "./hooks/useEventPolling";
import "./styles/Button.css";
import "./index.css";
import AlertLog from "./components/AlertLog";
import AdminDownloadTable from "./components/AdminDownloadTable";
import "leaflet/dist/leaflet.css";

function HomePage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [user, setUser] = useState(null);
  const [wallet, setWallet] = useState("");
  const [reason, setReason] = useState("");
  const [transactionHash, setTransactionHash] = useState("");
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [evidenceWallet, setEvidenceWallet] = useState("");
  const [caseId, setCaseId] = useState("");
  const [showEvidenceUpload, setShowEvidenceUpload] = useState(false);
  const [showEvidenceLibrary, setShowEvidenceLibrary] = useState(false);
  const [showChainVisualizer, setShowChainVisualizer] = useState(false);
  const [mongoConnectionStatus, setMongoConnectionStatus] = useState("Checking...");
  const [reportSubmitted, setReportSubmitted] = useState(false);
  const [submittedWallet, setSubmittedWallet] = useState("");
  const [mlAnalysis, setMlAnalysis] = useState(null);
  const [mlLoading, setMlLoading] = useState(false);
  const [showMlAnalysis, setShowMlAnalysis] = useState(false);
  const [activeSection, setActiveSection] = useState('incident-report');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  // Incident Report History state
  const [incidentHistory, setIncidentHistory] = useState([]);
  const [incidentHistoryLoading, setIncidentHistoryLoading] = useState(false);
  const [fraudAnalysisResult, setFraudAnalysisResult] = useState(null);
  const [submittingReport, setSubmittingReport] = useState(false);
  
  // ML Analysis state
  const [mlAnalysisHistory, setMlAnalysisHistory] = useState([]);
  const [mlAnalysisLoading, setMlAnalysisLoading] = useState(false);
  
  // Evidence Upload state
  const [evidenceFiles, setEvidenceFiles] = useState([]);
  const [evidenceDescription, setEvidenceDescription] = useState('');
  const [evidenceTags, setEvidenceTags] = useState('');
  const [evidenceRiskLevel, setEvidenceRiskLevel] = useState('medium');
  const [evidenceUploading, setEvidenceUploading] = useState(false);
  const [evidenceUploadResult, setEvidenceUploadResult] = useState(null);
  const [evidenceLibraryRefreshTrigger, setEvidenceLibraryRefreshTrigger] = useState(0);
  
  // Contact Police state
  const [contactPoliceStep, setContactPoliceStep] = useState(1);
  const [contactPoliceWalletId, setContactPoliceWalletId] = useState('');
  const [contactPoliceCaseDetails, setContactPoliceCaseDetails] = useState(null);
  const [contactPoliceSelectedStation, setContactPoliceSelectedStation] = useState('');
  const [contactPoliceDescription, setContactPoliceDescription] = useState('');
  const [contactPoliceNotes, setContactPoliceNotes] = useState('');
  const [contactPoliceLoading, setContactPoliceLoading] = useState(false);
  const [contactPoliceSending, setContactPoliceSending] = useState(false);
  const [contactPoliceReportHistory, setContactPoliceReportHistory] = useState([]);
  const [contactPoliceEvidence, setContactPoliceEvidence] = useState([]);
  
  const [contactPoliceStations, setContactPoliceStations] = useState([
    {
      id: '1',
      name: 'Agra Range',
      address: 'Agra, Uttar Pradesh',
      phone: '0562-2463, 0562-2263',
      email: 'digraga@n',
      region: 'Uttar Pradesh',
      specialization: 'General Law Enforcement',
      priority: 'high',
      designation: 'DIG',
      mobile: '945440019'
    },
    {
      id: '2',
      name: 'Aligarh Range',
      address: 'Aligarh, Uttar Pradesh',
      phone: '0571-2400, 0571-2400',
      email: 'digraih@u',
      region: 'Uttar Pradesh',
      specialization: 'General Law Enforcement',
      priority: 'high',
      designation: 'DIG',
      mobile: '945440039'
    },
    {
      id: '3',
      name: 'Allahabad Range',
      address: 'Allahabad, Uttar Pradesh',
      phone: '0532-2260, 0532-2260',
      email: 'digrald@n',
      region: 'Uttar Pradesh',
      specialization: 'General Law Enforcement',
      priority: 'high',
      designation: 'DIG',
      mobile: '945440019'
    },
    {
      id: '4',
      name: 'Chitrakoot Dham Range',
      address: 'Chitrakoot, Uttar Pradesh',
      phone: '0519-2220, 0519-2220',
      email: 'digrckd@g',
      region: 'Uttar Pradesh',
      specialization: 'General Law Enforcement',
      priority: 'medium',
      designation: 'DIG',
      mobile: '94544002('
    },
    {
      id: '5',
      name: 'Moradabad Range',
      address: 'Moradabad, Uttar Pradesh',
      phone: '0591-2435, 0591-2435',
      email: 'digrmdd@',
      region: 'Uttar Pradesh',
      specialization: 'General Law Enforcement',
      priority: 'high',
      designation: 'DIG',
      mobile: '945440021'
    },
    {
      id: '6',
      name: 'Basti Range',
      address: 'Basti, Uttar Pradesh',
      phone: '05542-246, 05542-246',
      email: 'digrbas@n',
      region: 'Uttar Pradesh',
      specialization: 'General Law Enforcement',
      priority: 'medium',
      designation: 'DIG',
      mobile: '94544002('
    },
    {
      id: '7',
      name: 'Sant Kabir Nagar',
      address: 'Sant Kabir Nagar, Uttar Pradesh',
      phone: '05547-222, 05547-226',
      email: 'spkbn-up@',
      region: 'Uttar Pradesh',
      specialization: 'General Law Enforcement',
      priority: 'medium',
      designation: 'SP',
      mobile: '945440028'
    },
    {
      id: '8',
      name: 'Sidhar th Nagar',
      address: 'Sidhar th Nagar, Uttar Pradesh',
      phone: '05544-222, 05544-222',
      email: 'spsdr-up@',
      region: 'Uttar Pradesh',
      specialization: 'General Law Enforcement',
      priority: 'medium',
      designation: 'SP',
      mobile: '945440030'
    },
    {
      id: '9',
      name: 'Devipatan Range',
      address: 'Devipatan, Uttar Pradesh',
      phone: '05262-230, 05262-230',
      email: 'digrgon@m',
      region: 'Uttar Pradesh',
      specialization: 'General Law Enforcement',
      priority: 'medium',
      designation: 'DIG',
      mobile: '94544002('
    },
    {
      id: '10',
      name: 'Gorakhpur Range',
      address: 'Gorakhpur, Uttar Pradesh',
      phone: '0551-2201, 0551-2200',
      email: 'digrgkr@u',
      region: 'Uttar Pradesh',
      specialization: 'General Law Enforcement',
      priority: 'high',
      designation: 'DIG',
      mobile: '94544002('
    },
    {
      id: '11',
      name: 'Kushi Nagar',
      address: 'Kushi Nagar, Uttar Pradesh',
      phone: '556424-24-, 0510-2333',
      email: 'spksn-up@',
      region: 'Uttar Pradesh',
      specialization: 'General Law Enforcement',
      priority: 'medium',
      designation: 'SP',
      mobile: '945440028'
    },
    {
      id: '12',
      name: 'Jhansi Range',
      address: 'Jhansi, Uttar Pradesh',
      phone: '-, 0510-2333',
      email: 'digrjsi@up',
      region: 'Uttar Pradesh',
      specialization: 'General Law Enforcement',
      priority: 'high',
      designation: 'DIG',
      mobile: '945440021'
    },
    {
      id: '13',
      name: 'Kanpur Range',
      address: 'Kanpur, Uttar Pradesh',
      phone: '0512-2536, 0512-2530',
      email: 'digrknr@up',
      region: 'Uttar Pradesh',
      specialization: 'General Law Enforcement',
      priority: 'high',
      designation: 'DIG',
      mobile: '945440021'
    },
    {
      id: '14',
      name: 'Kanpur Nagar',
      address: 'Kanpur Nagar, Uttar Pradesh',
      phone: '0512-2304, 0512-2530',
      email: 'sspknr-up@',
      region: 'Uttar Pradesh',
      specialization: 'General Law Enforcement',
      priority: 'high',
      designation: 'SSP',
      mobile: '945440028'
    },
    {
      id: '15',
      name: 'Faizabad Range',
      address: 'Faizabad, Uttar Pradesh',
      phone: '05278-224, 05278-224',
      email: 'digrfzd@n',
      region: 'Uttar Pradesh',
      specialization: 'General Law Enforcement',
      priority: 'medium',
      designation: 'DIG',
      mobile: '94544002('
    },
    {
      id: '16',
      name: 'Ambedkar Nagar',
      address: 'Ambedkar Nagar, Uttar Pradesh',
      phone: '05271-244-, -',
      email: 'spabr-up@',
      region: 'Uttar Pradesh',
      specialization: 'General Law Enforcement',
      priority: 'medium',
      designation: 'SP',
      mobile: '945440024'
    },
    {
      id: '17',
      name: 'Lucknow Range',
      address: 'Lucknow, Uttar Pradesh',
      phone: '0522-2393, 0522-2719',
      email: 'digrlkw@g',
      region: 'Uttar Pradesh',
      specialization: 'General Law Enforcement',
      priority: 'high',
      designation: 'DIG',
      mobile: '94544002:'
    },
    {
      id: '18',
      name: 'Gautam Budh Nagar',
      address: 'Gautam Budh Nagar, Uttar Pradesh',
      phone: '0120-2514, 0120-2549',
      email: 'sspgbn-upc',
      region: 'Uttar Pradesh',
      specialization: 'General Law Enforcement',
      priority: 'high',
      designation: 'SSP',
      mobile: '945440027'
    },
    {
      id: '19',
      name: 'Saharanpur Range',
      address: 'Saharanpur, Uttar Pradesh',
      phone: '0132-2761, 0132-2761',
      email: 'digrsah@u',
      region: 'Uttar Pradesh',
      specialization: 'General Law Enforcement',
      priority: 'high',
      designation: 'DIG',
      mobile: '94544002:'
    },
    {
      id: '20',
      name: 'Muzaffar Nagar',
      address: 'Muzaffar Nagar, Uttar Pradesh',
      phone: '0131-2436, 0131-2437',
      email: 'sspzuf-up@',
      region: 'Uttar Pradesh',
      specialization: 'General Law Enforcement',
      priority: 'high',
      designation: 'SSP',
      mobile: '945440031'
    },
    {
      id: '21',
      name: 'Azamgarh Range',
      address: 'Azamgarh, Uttar Pradesh',
      phone: '05462-260, 05462-260',
      email: 'digrazh@u',
      region: 'Uttar Pradesh',
      specialization: 'General Law Enforcement',
      priority: 'medium',
      designation: 'DIG',
      mobile: '94544002('
    },
    {
      id: '22',
      name: 'Mirzapur Range',
      address: 'Mirzapur, Uttar Pradesh',
      phone: '05442-256, 05442-257',
      email: 'digrmir@n',
      region: 'Uttar Pradesh',
      specialization: 'General Law Enforcement',
      priority: 'medium',
      designation: 'DIG',
      mobile: '945440021'
    },
    {
      id: '23',
      name: 'Sant Ra vidas Nagar',
      address: 'Sant Ra vidas Nagar, Uttar Pradesh',
      phone: '05414-250, 05414-250',
      email: 'spsrn-up@',
      region: 'Uttar Pradesh',
      specialization: 'General Law Enforcement',
      priority: 'medium',
      designation: 'SP',
      mobile: '94544003('
    },
    {
      id: '24',
      name: 'Varanasi Range',
      address: 'Varanasi, Uttar Pradesh',
      phone: '0542-2502, 0542-2509',
      email: 'digrvns@n',
      region: 'Uttar Pradesh',
      specialization: 'General Law Enforcement',
      priority: 'high',
      designation: 'DIG',
      mobile: '945440019'
    }
  ]);

  const { events, loading: eventsLoading } = useEventPolling(5050);

  // Initialize ML Analysis History with mock data
  useEffect(() => {
    const mockMlAnalysisHistory = [
      {
        id: '1',
        walletId: '0x742d35Cc6634C0532925a3b8D',
        caseId: 'CASE-001',
        riskScore: 85,
        mlTags: ['High Volume', 'Suspicious Pattern', 'Cross-chain Activity'],
        status: 'Completed',
        investigator: user?.name || 'Current Investigator',
        region: 'New York',
        analyzedAt: '2024-01-20T14:30:00Z',
        analysisDetails: {
          transaction_count: 1247,
          total_volume: '$2.3M',
          suspicious_indicators: 8,
          phishing_indicators: { detected: true, confidence: 0.92 }
        }
      },
      {
        id: '2',
        walletId: '0x8ba1f109551bD432803012645H',
        caseId: 'CASE-002',
        riskScore: 67,
        mlTags: ['Medium Volume', 'Exchange Activity'],
        status: 'Completed',
        investigator: user?.name || 'Current Investigator',
        region: 'California',
        analyzedAt: '2024-01-19T17:00:00Z',
        analysisDetails: {
          transaction_count: 456,
          total_volume: '$890K',
          suspicious_indicators: 3,
          phishing_indicators: { detected: false, confidence: 0.15 }
        }
      },
      {
        id: '3',
        walletId: '0x3f4e5d6c7b8a9e0f1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v3w4x5y6z7',
        caseId: 'CASE-003',
        riskScore: 92,
        mlTags: ['Very High Volume', 'Money Laundering', 'Flash Loan Activity'],
        status: 'Completed',
        investigator: user?.name || 'Current Investigator',
        region: 'Illinois',
        analyzedAt: '2024-01-18T09:15:00Z',
        analysisDetails: {
          transaction_count: 2156,
          total_volume: '$5.7M',
          suspicious_indicators: 15,
          phishing_indicators: { detected: true, confidence: 0.98 }
        }
      }
    ];
    
    setMlAnalysisHistory(mockMlAnalysisHistory);
  }, [user]);

  // Check MongoDB connection
  const checkMongoConnection = useCallback(async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/health`);
      if (response.ok) {
        setMongoConnectionStatus("✅ Connected");
      } else {
        setMongoConnectionStatus("❌ Backend Error");
      }
    } catch (error) {
      setMongoConnectionStatus("❌ Connection Failed");
    }
  }, []);

  // Handle evidence upload success
  const handleEvidenceUploadSuccess = (uploadResult) => {
    toast.success(`✅ Evidence uploaded! Hash: ${uploadResult.evidence.fileHash.substring(0, 16)}...`);
  };

  // Handle evidence upload error
  const handleEvidenceUploadError = (error) => {
    toast.error(`❌ Evidence upload failed: ${error}`);
  };

  // Generate case ID for evidence
  const generateCaseId = () => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return `CASE_${timestamp}_${random}`;
  };

  // ML Analysis function
  const performMLAnalysis = async (wallet, reason) => {
    if (!wallet || !reason.trim()) {
      toast.error("Wallet and reason are required for ML analysis");
      return;
    }

    setMlLoading(true);
    setShowMlAnalysis(true);
    
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(
        `${process.env.REACT_APP_BACKEND_URL}/api/ml/analyze`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            address: wallet,
            reason: reason
          })
        }
      );

      if (response.ok) {
        const data = await response.json();
        setMlAnalysis(data.analysis);
        toast.success("⚙️ ML Analysis completed!");
      } else {
        const errorData = await response.json();
        toast.error(`ML Analysis failed: ${errorData.error}`);
      }
    } catch (error) {
      console.error('ML Analysis error:', error);
      toast.error('❌ ML Analysis failed: Network error');
    } finally {
      setMlLoading(false);
    }
  };

  // Restore session from localStorage
  useEffect(() => {
    const restoreSession = async () => {
      // Try to restore session from our custom auth token first
      const token = localStorage.getItem("authToken");
      if (token) {
        try {
          const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5050';
          const response = await fetch(`${backendUrl}/api/auth/verify`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (response.ok) {
            const userData = await response.json();
            setUser({
              id: userData.id,
              email: userData.email,
              role: userData.role
            });
            setLoading(false);
            return;
          }
        } catch (error) {
          console.error("Error verifying custom auth token:", error);
        }
      }
      
      // Fallback to Supabase session
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        localStorage.setItem("authToken", session.access_token);
        localStorage.setItem("userInfo", JSON.stringify(session.user));
        setUser(session.user);
      }
      setLoading(false);
    };
    
    restoreSession();
    checkMongoConnection();
  }, [checkMongoConnection]);

  const fetchReports = useCallback(async () => {
    const token = localStorage.getItem("authToken");
    if (!token || !user?.email) return;

    try {
      const res = await fetch(
        `${process.env.REACT_APP_BACKEND_URL}/api/reports?user_email=${user.email}`,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await res.json();
      if (data?.results) {
        setReports(data.results);
        const latest = data.results[0];
        if (latest?.risk === "high") {
          toast.warn(`🔴 High-risk report: ${latest.wallet}`);
        }
      }
    } catch (err) {
      console.error("❌ Failed to fetch reports:", err.message);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchReports();
      fetchIncidentHistory();
      fetchMlAnalysisHistory();
      
      // Also populate ML analysis history with mock data immediately
      const mockMlAnalysis = [
        {
          _id: 'mock-incident-1',
          walletAddress: 'b71643...11a2',
          userEmail: user.email || 'investigator1@example.com',
          analysisResults: {
            riskLevel: 'LOW',
            fraudProbability: 0.25,
            isSuspicious: false,
            anomalyScore: 0.15,
            suspiciousTransactions: [],
            suspiciousAddresses: []
          },
          modelInfo: {
            modelType: 'IsolationForest',
            version: '1.0',
            accuracy: 0.92
          },
          incidentReportId: {
            reason: 'fraud'
          },
          createdAt: new Date().toISOString()
        },
        {
          _id: 'mock-incident-2',
          walletAddress: '030c12...f0de',
          userEmail: user.email || 'investigator1@example.com',
          analysisResults: {
            riskLevel: 'LOW',
            fraudProbability: 0.25,
            isSuspicious: false,
            anomalyScore: 0.15,
            suspiciousTransactions: [],
            suspiciousAddresses: []
          },
          modelInfo: {
            modelType: 'IsolationForest',
            version: '1.0',
            accuracy: 0.92
          },
          incidentReportId: {
            reason: 'spam'
          },
          createdAt: new Date().toISOString()
        },
        {
          _id: 'mock-incident-3',
          walletAddress: '0x9876...',
          userEmail: user.email || 'investigator1@example.com',
          analysisResults: {
            riskLevel: 'LOW',
            fraudProbability: 0.25,
            isSuspicious: false,
            anomalyScore: 0.15,
            suspiciousTransactions: [],
            suspiciousAddresses: []
          },
          modelInfo: {
            modelType: 'IsolationForest',
            version: '1.0',
            accuracy: 0.92
          },
          incidentReportId: {
            reason: 'spam activity'
          },
          createdAt: new Date().toISOString()
        }
      ];
      
      setMlAnalysisHistory(mockMlAnalysis);
    }
  }, [user, fetchReports]);


  const signUp = async () => {
    if (!email || !password) {
      alert("Please enter both email and password.");
      return;
    }

    if (password.length < 6) {
      alert("Password must be at least 6 characters long.");
      return;
    }

    try {
      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5050';
      const response = await fetch(`${backendUrl}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email,
          password,
          name: email.split('@')[0] // Use email prefix as default name
        })
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem("authToken", data.token);
        localStorage.setItem("userInfo", JSON.stringify(data.user));
        setUser(data.user);
        alert("Account created successfully! Redirecting to home page...");
        window.location.href = '/';
      } else {
        const errorData = await response.json();
        alert(errorData.error || "Registration failed. Please try again.");
      }
    } catch (error) {
      console.error('Registration error:', error);
      alert("Network error. Please check your connection and try again.");
    }
  };

  const signIn = async (overrideEmail, overridePassword) => {
    const loginEmail = (typeof overrideEmail === 'string' && overrideEmail) ? overrideEmail : email;
    const loginPassword = (typeof overridePassword === 'string' && overridePassword) ? overridePassword : password;
    // Try backend authentication first
    try {
      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5050';
      const response = await fetch(`${backendUrl}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: loginEmail,
          password: loginPassword
        })
      });

      const data = await response.json();
      
      if (response.ok && data.token) {
        // Store the backend JWT token
        localStorage.setItem("authToken", data.token);
        
        // Get user info
        const userResponse = await fetch(`${backendUrl}/api/auth/verify`, {
          headers: {
            'Authorization': `Bearer ${data.token}`
          }
        });
        
        if (userResponse.ok) {
          const userData = await userResponse.json();
          console.log('User data received:', userData); // Debug log
          localStorage.setItem("userInfo", JSON.stringify(userData));
          setUser({
            id: userData.id,
            email: userData.email,
            role: userData.role
          });
          
      // Redirect users based on role
      console.log('Checking user redirect:', {
        role: userData.role,
        email: userData.email,
        isAdmin: userData.role === 'admin',
        isAdminEmail: userData.email === 'admin123@fraud.com'
      }); // Debug log
      
      if (userData.role === 'admin' || userData.email === 'admin123@fraud.com') {
        console.log('Redirecting to admin dashboard...'); // Debug log
        window.location.href = '/admin';
      } else {
        console.log('Redirecting to home page...'); // Debug log
        window.location.href = '/';
      }
        } else {
          alert("Login successful, but failed to get user info");
        }
      } else {
        // Fallback to Supabase authentication
        const { data: loginData, error } = await supabase.auth.signInWithPassword({
          email: loginEmail,
          password: loginPassword,
        });

        if (error) {
          alert(error.message);
          return;
        }

        const { session, user } = loginData;
        localStorage.setItem("authToken", session.access_token);
        localStorage.setItem("userInfo", JSON.stringify(user));
        setUser(user);
        
    // Redirect users based on role
    if (user.user_metadata?.role === 'admin' || user.email === 'admin123@fraud.com') {
      window.location.href = '/admin';
    } else {
      window.location.href = '/';
    }
      }
    } catch (error) {
      console.error("Login error:", error);
      alert("Login failed: " + error.message);
    }
  };

  const signOut = async () => {
    // Clear both Supabase and backend auth
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Supabase sign out error:", error);
    }
    
    localStorage.removeItem("authToken");
    localStorage.removeItem("userInfo");
    setUser(null);
    setReports([]);
    setWallet("");
    setReason("");
    setTransactionHash("");
    alert("Logged out successfully!");
  };

  // Contact Police handlers
  const handleContactPoliceWalletLookup = async () => {
    if (!contactPoliceWalletId.trim()) {
      toast.error('Please enter a wallet ID.');
      return;
    }

    setContactPoliceLoading(true);
    
    // Simulate API call to fetch case details and evidence
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Mock case details based on wallet ID
    const mockCaseDetails = {
      walletId: contactPoliceWalletId,
      caseId: 'CASE-' + Math.floor(Math.random() * 1000),
      riskScore: Math.floor(Math.random() * 100),
      mlTags: ['High Volume', 'Suspicious Pattern', 'Cross-chain Activity'],
      status: 'Active',
      investigator: user?.name || 'Current Investigator',
      region: 'New York',
      createdAt: '2024-01-20T10:30:00Z'
    };

    // Mock evidence for this wallet
    const mockEvidence = [
      {
        id: '1',
        fileName: 'transaction_log_analysis.pdf',
        fileType: 'pdf',
        fileSize: '2.3 MB',
        hash: 'sha256:a1b2c3d4e5f6...',
        uploadedAt: '2024-01-20T11:00:00Z',
        uploadedBy: user?.name || 'Current Investigator',
        isReadOnly: true
      },
      {
        id: '2',
        fileName: 'wallet_activity_export.csv',
        fileType: 'csv',
        fileSize: '1.8 MB',
        hash: 'sha256:f6e5d4c3b2a1...',
        uploadedAt: '2024-01-20T11:15:00Z',
        uploadedBy: user?.name || 'Current Investigator',
        isReadOnly: true
      }
    ];

    setContactPoliceCaseDetails(mockCaseDetails);
    setContactPoliceEvidence(mockEvidence);
    setContactPoliceStep(3);
    setContactPoliceLoading(false);
    toast.success('Case details and evidence loaded successfully!');
  };

  const handleContactPoliceSendReport = async () => {
    if (!contactPoliceWalletId || !contactPoliceSelectedStation || !contactPoliceDescription.trim()) {
      toast.error('Please complete all required fields.');
      return;
    }

    setContactPoliceSending(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const selectedStationData = contactPoliceStations.find(s => s.id === contactPoliceSelectedStation);
    
    const newReport = {
      id: Date.now().toString(),
      walletId: contactPoliceWalletId,
      caseId: contactPoliceCaseDetails.caseId,
      stationName: selectedStationData.name,
      evidenceCount: contactPoliceEvidence.length,
      description: contactPoliceDescription,
      notes: contactPoliceNotes,
      timestamp: new Date().toISOString(),
      status: 'Delivered'
    };

    setContactPoliceReportHistory(prev => [newReport, ...prev]);
    setContactPoliceSending(false);
    
    // Reset form
    setContactPoliceWalletId('');
    setContactPoliceCaseDetails(null);
    setContactPoliceEvidence([]);
    setContactPoliceDescription('');
    setContactPoliceNotes('');
    setContactPoliceSelectedStation('');
    setContactPoliceStep(1);
    
    toast.success('Report sent successfully to law enforcement!');
  };

  const submitReport = async () => {
    if (!wallet) return alert("Please enter a valid wallet.");
    if (!reason.trim()) return alert("Please enter a reason for reporting.");

    setSubmittingReport(true);
    try {
      // Submit incident report to backend with fraud detection
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/incident-reports/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletAddress: wallet,
          reason: reason,
          description: reason,
          reporterName: user?.name || 'Anonymous',
          reporterEmail: user?.email || '',
          reporterPhone: ''
        })
      });

      if (!response.ok) {
        throw new Error('Failed to submit incident report');
      }

      const result = await response.json();
      
      if (result.success) {
        setFraudAnalysisResult(result.data.fraudAnalysis);
        setReportSubmitted(true);
        setSubmittedWallet(wallet);
        setShowMlAnalysis(true);
        
        // Refresh incident history and ML analysis history
        await fetchIncidentHistory();
        await fetchMlAnalysisHistory();
        
        toast.success("✅ Report submitted and analyzed successfully!");
      } else {
        throw new Error(result.error || 'Failed to submit report');
      }
    } catch (error) {
      console.error('Error submitting report:', error);
      toast.error("❌ Failed to submit report: " + error.message);
    } finally {
      setSubmittingReport(false);
    }
  };

  // Fetch incident report history
  const fetchIncidentHistory = async () => {
    setIncidentHistoryLoading(true);
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/incident-reports/recent/list?limit=10`);
      
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setIncidentHistory(result.data);
          
          // Convert ALL incident reports to ML analysis history format
          const mlAnalysisFromIncidents = result.data.map((incident, index) => ({
            _id: `incident-${incident._id || Date.now()}-${index}`,
            walletAddress: incident.walletAddress,
            userEmail: incident.reporterEmail || 'investigator1@example.com',
            analysisResults: {
              riskLevel: incident.fraudAnalysis?.riskLevel || 'LOW',
              fraudProbability: incident.fraudAnalysis?.fraudProbability || 0.25,
              isSuspicious: incident.fraudAnalysis?.isSuspicious || false,
              anomalyScore: incident.fraudAnalysis?.anomalyScore || 0.15,
              suspiciousTransactions: incident.fraudAnalysis?.suspiciousTransactions || [],
              suspiciousAddresses: incident.fraudAnalysis?.suspiciousAddresses || []
            },
            modelInfo: {
              modelType: incident.fraudAnalysis?.modelInfo?.modelType || 'IsolationForest',
              version: incident.fraudAnalysis?.modelInfo?.version || '1.0',
              accuracy: incident.fraudAnalysis?.modelInfo?.accuracy || 0.92
            },
            incidentReportId: {
              reason: incident.reason || 'Incident report analysis'
            },
            createdAt: incident.createdAt || new Date().toISOString()
          }));
          
          // Set ML analysis history with incident-based analysis
          setMlAnalysisHistory(mlAnalysisFromIncidents);
        }
      } else {
        // If API fails, create ML analysis from mock incident data
        const mockIncidents = [
          { walletAddress: 'b71643...11a2', reason: 'fraud', createdAt: new Date().toISOString() },
          { walletAddress: '030c12...f0de', reason: 'spam', createdAt: new Date().toISOString() },
          { walletAddress: '0x9876...', reason: 'spam activity', createdAt: new Date().toISOString() }
        ];
        
        const mlAnalysisFromMockIncidents = mockIncidents.map((incident, index) => ({
          _id: `mock-incident-${Date.now()}-${index}`,
          walletAddress: incident.walletAddress,
          userEmail: 'investigator1@example.com',
          analysisResults: {
            riskLevel: 'LOW',
            fraudProbability: 0.25,
            isSuspicious: false,
            anomalyScore: 0.15,
            suspiciousTransactions: [],
            suspiciousAddresses: []
          },
          modelInfo: {
            modelType: 'IsolationForest',
            version: '1.0',
            accuracy: 0.92
          },
          incidentReportId: {
            reason: incident.reason
          },
          createdAt: incident.createdAt
        }));
        
        setMlAnalysisHistory(mlAnalysisFromMockIncidents);
      }
    } catch (error) {
      console.error('Error fetching incident history:', error);
      
      // Create ML analysis from mock incident data as fallback
      const mockIncidents = [
        { walletAddress: 'b71643...11a2', reason: 'fraud', createdAt: new Date().toISOString() },
        { walletAddress: '030c12...f0de', reason: 'spam', createdAt: new Date().toISOString() },
        { walletAddress: '0x9876...', reason: 'spam activity', createdAt: new Date().toISOString() }
      ];
      
      const mlAnalysisFromMockIncidents = mockIncidents.map((incident, index) => ({
        _id: `mock-incident-${Date.now()}-${index}`,
        walletAddress: incident.walletAddress,
        userEmail: 'investigator1@example.com',
        analysisResults: {
          riskLevel: 'LOW',
          fraudProbability: 0.25,
          isSuspicious: false,
          anomalyScore: 0.15,
          suspiciousTransactions: [],
          suspiciousAddresses: []
        },
        modelInfo: {
          modelType: 'IsolationForest',
          version: '1.0',
          accuracy: 0.92
        },
        incidentReportId: {
          reason: incident.reason
        },
        createdAt: incident.createdAt
      }));
      
      setMlAnalysisHistory(mlAnalysisFromMockIncidents);
    } finally {
      setIncidentHistoryLoading(false);
    }
  };

  // Fetch ML analysis history
  const fetchMlAnalysisHistory = async () => {
    setMlAnalysisLoading(true);
    try {
      // Always use mock data based on incident reports
      const mockIncidents = [
        { walletAddress: 'b71643...11a2', reason: 'fraud', createdAt: new Date().toISOString() },
        { walletAddress: '030c12...f0de', reason: 'spam', createdAt: new Date().toISOString() },
        { walletAddress: '0x9876...', reason: 'spam activity', createdAt: new Date().toISOString() }
      ];
      
      const mlAnalysisFromIncidents = mockIncidents.map((incident, index) => ({
        _id: `incident-${Date.now()}-${index}`,
        walletAddress: incident.walletAddress,
        userEmail: 'investigator1@example.com',
        analysisResults: {
          riskLevel: 'LOW',
          fraudProbability: 0.25,
          isSuspicious: false,
          anomalyScore: 0.15,
          suspiciousTransactions: [],
          suspiciousAddresses: []
        },
        modelInfo: {
          modelType: 'IsolationForest',
          version: '1.0',
          accuracy: 0.92
        },
        incidentReportId: {
          reason: incident.reason
        },
        createdAt: incident.createdAt
      }));
      
      setMlAnalysisHistory(mlAnalysisFromIncidents);
    } catch (error) {
      console.error('Error fetching ML analysis history:', error);
    } finally {
      setMlAnalysisLoading(false);
    }
  };

  // Handle evidence file selection
  const handleEvidenceFileSelect = (event) => {
    const files = Array.from(event.target.files);
    if (files.length > 0) {
      setEvidenceFiles(prev => [...prev, ...files]);
      setEvidenceUploadResult(null);
    }
  };

  // Handle evidence file drop
  const handleEvidenceFileDrop = (event) => {
    event.preventDefault();
    const files = Array.from(event.dataTransfer.files);
    if (files.length > 0) {
      setEvidenceFiles(prev => [...prev, ...files]);
      setEvidenceUploadResult(null);
    }
  };

  // Handle evidence file drag over
  const handleEvidenceFileDragOver = (event) => {
    event.preventDefault();
  };

  // Remove a specific file
  const removeEvidenceFile = (index) => {
    setEvidenceFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Clear all files
  const clearAllEvidenceFiles = () => {
    setEvidenceFiles([]);
  };

  // Upload evidence
  const uploadEvidence = async () => {
    if (evidenceFiles.length === 0) {
      alert('Please select at least one file to upload');
      return;
    }

    if (!evidenceWallet) {
      alert('Please enter a wallet address');
      return;
    }

    setEvidenceUploading(true);
    setEvidenceUploadResult(null);

    try {
      const uploadPromises = evidenceFiles.map(async (file, index) => {
        const formData = new FormData();
        formData.append('evidenceFile', file);
        formData.append('caseId', `evidence_${Date.now()}_${index}`); // Generate unique case ID
        formData.append('entity', evidenceWallet);
        formData.append('description', `${evidenceDescription} (File ${index + 1}: ${file.name})`);
        formData.append('tags', evidenceTags);
        formData.append('riskLevel', evidenceRiskLevel);

        const token = localStorage.getItem('authToken');
        const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/evidence/upload`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        });

      if (response.ok) {
          return await response.json();
      } else {
          const error = await response.json();
          throw new Error(`Failed to upload ${file.name}: ${error.error || 'Unknown error'}`);
        }
      });

      const results = await Promise.all(uploadPromises);
      setEvidenceUploadResult({
        success: true,
        message: `Successfully uploaded ${results.length} file(s)`,
        results: results
      });
      
      toast.success(`✅ Successfully uploaded ${results.length} file(s)!`);
      
      // Refresh evidence library to show new files
      setEvidenceLibraryRefreshTrigger(prev => prev + 1);
      
      // Reset form
      setEvidenceFiles([]);
      setEvidenceDescription('');
      setEvidenceTags('');
      setEvidenceRiskLevel('medium');
      setEvidenceWallet('');
    } catch (error) {
      console.error('Error uploading evidence:', error);
      toast.error('❌ Failed to upload evidence: ' + error.message);
    } finally {
      setEvidenceUploading(false);
    }
  };

  const isAdmin = user?.user_metadata?.role === "admin";

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">

      {/* Main Content */}
      <div>
        {loading ? (
          <div className="flex flex-col items-center justify-center h-96 space-y-6">
            <div className="relative">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200"></div>
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent absolute top-0 left-0"></div>
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold text-gray-700">Loading session...</p>
              <p className="text-sm text-gray-500 mt-1">Please wait while we verify your credentials</p>
            </div>
          </div>
        ) : !user ? (
          <div className="max-w-lg mx-auto p-12">
            <div className="text-center mb-12">
              <div className="relative mx-auto mb-8">
                <div className="w-24 h-24 bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 rounded-3xl flex items-center justify-center mx-auto shadow-2xl transform hover:scale-105 transition-all duration-300">
                  <span className="text-white text-4xl">🛡️</span>
                </div>
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-400 rounded-full animate-pulse shadow-lg"></div>
              </div>
              <h2 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-3">
                Welcome to ChainSafeGuard
              </h2>
              <p className="text-gray-600 text-lg font-medium">Advanced fraud detection and evidence management platform</p>
            </div>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">Email Address</label>
                <div className="relative">
                  <input
                    type="email"
                    placeholder="Enter your email address"
                    className="w-full px-6 py-4 border-2 border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-300 bg-white/80 backdrop-blur-sm text-gray-900 placeholder-gray-500 font-medium"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
                    <span className="text-gray-400 text-xl">📧</span>
                  </div>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">Password</label>
                <div className="relative">
                  <input
                    type="password"
                    placeholder="Enter your password"
                    className="w-full px-6 py-4 border-2 border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-300 bg-white/80 backdrop-blur-sm text-gray-900 placeholder-gray-500 font-medium"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
                    <span className="text-gray-400 text-xl">🔒</span>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col space-y-4 pt-6">
                <button 
                  onClick={signIn} 
                  className="w-full bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 hover:from-blue-700 hover:via-purple-700 hover:to-indigo-700 text-white font-bold py-4 px-8 rounded-2xl transition-all duration-300 transform hover:scale-105 hover:shadow-xl shadow-lg"
                >
                  <span className="flex items-center justify-center space-x-2">
                    <span>🚀</span>
                    <span>Sign In</span>
                  </span>
                </button>
                
                {/* Quick Login for Testing */}
                <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800 mb-2">Quick Login for Testing:</p>
                  <div className="space-y-2">
                    <button 
                      type="button"
                      onClick={() => {
                        setEmail('investigator1@example.com');
                        setPassword('SecureInv2024!');
                        signIn('investigator1@example.com', 'SecureInv2024!');
                      }}
                      className="w-full bg-green-600 hover:bg-green-700 text-white text-sm py-2 px-4 rounded-lg transition-colors cursor-pointer"
                    >
                      🔍 Login as Investigator
                    </button>
                    <button 
                      type="button"
                      onClick={() => {
                        setEmail('aryangupta3103@gmail.com');
                        setPassword('Aryan&Keval');
                        signIn('aryangupta3103@gmail.com', 'Aryan&Keval');
                      }}
                      className="w-full bg-purple-600 hover:bg-purple-700 text-white text-sm py-2 px-4 rounded-lg transition-colors cursor-pointer"
                    >
                      👑 Login as Admin
                    </button>
                  </div>
                </div>
                <button 
                  onClick={signUp} 
                  className="w-full border-2 border-gray-300 hover:border-blue-500 text-gray-700 hover:text-blue-600 font-semibold py-4 px-8 rounded-2xl transition-all duration-300 transform hover:scale-105 bg-white/60 backdrop-blur-sm hover:bg-blue-50"
                >
                  <span className="flex items-center justify-center space-x-2">
                    <span>✨</span>
                    <span>Create New Account</span>
                  </span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex min-h-screen">
            {/* Sidebar */}
            <div className={`${sidebarCollapsed ? 'w-16' : 'w-64'} fixed left-0 top-0 h-full bg-gray-900 shadow-2xl border-r-4 border-gray-800 flex flex-col transition-all duration-300 z-50`}>
              {/* Sidebar Header */}
              <div className="p-6 border-b border-gray-800">
                <div className="flex items-center justify-between">
                  {!sidebarCollapsed && (
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center shadow-lg">
                        <span className="text-white text-xl font-bold">🛡️</span>
                  </div>
                  <div>
                        <h1 className="text-lg font-bold text-gray-100">
                          Cybercrime Dashboard
                        </h1>
                        <p className="text-xs text-gray-400">v0.2</p>
                  </div>
                </div>
                  )}
                  <button
                    onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                    className="p-2 text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition-all duration-200"
                  >
                    {sidebarCollapsed ? '→' : '←'}
                  </button>
                </div>
              </div>

              {/* Sidebar Navigation */}
              <nav className="flex-1 p-4 space-y-1">
                <button
                  onClick={() => setActiveSection('incident-report')}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-300 text-left ${
                    activeSection === 'incident-report'
                      ? 'bg-red-600 text-white shadow-lg'
                      : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                  }`}
                >
                  <span className="text-lg">📑</span>
                  {!sidebarCollapsed && (
                    <span className="font-medium">Incident Report</span>
                  )}
                </button>

                <button
                  onClick={() => setActiveSection('evidence-upload')}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-300 text-left ${
                    activeSection === 'evidence-upload'
                      ? 'bg-red-600 text-white shadow-lg'
                      : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                  }`}
                >
                  <span className="text-lg">📎</span>
                  {!sidebarCollapsed && (
                    <span className="font-medium">Evidence Upload</span>
                  )}
                </button>

                <button
                  onClick={() => setActiveSection('evidence-library')}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-300 text-left ${
                    activeSection === 'evidence-library'
                      ? 'bg-red-600 text-white shadow-lg'
                      : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                  }`}
                >
                  <span className="text-lg">📁</span>
                  {!sidebarCollapsed && (
                    <span className="font-medium">Evidence Library</span>
                  )}
                </button>
                <button
                  onClick={() => setActiveSection('ml-analysis-history')}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-300 text-left ${
                    activeSection === 'ml-analysis-history'
                      ? 'bg-red-600 text-white shadow-lg'
                      : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                  }`}
                >
                  <span className="text-lg">🤖</span>
                  {!sidebarCollapsed && (
                    <span className="font-medium">AI Analysis History</span>
                  )}
                </button>

                <button
                  onClick={() => setActiveSection('contact-police')}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-300 text-left ${
                    activeSection === 'contact-police'
                      ? 'bg-red-600 text-white shadow-lg'
                      : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                  }`}
                >
                  <span className="text-lg">👮</span>
                  {!sidebarCollapsed && (
                    <span className="font-medium">Contact Police</span>
                  )}
                </button>
              </nav>

              {/* Sidebar Footer */}
              <div className="p-4 border-t border-gray-800 space-y-3">
                {!sidebarCollapsed && (
                  <div className="text-center">
                    <p className="text-sm text-gray-400">Investigator Control Panel v0.2</p>
                    <p className="text-xs text-gray-500">Secure Access</p>
                  </div>
                )}
                <button 
                  onClick={signOut}
                  className="w-full flex items-center space-x-3 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all duration-300 shadow-sm hover:shadow-md font-medium"
                >
                  <span className="text-lg">🚪</span>
                  {!sidebarCollapsed && <span>Logout</span>}
                </button>
              </div>
            </div>

            {/* Main Content */}
            <div className={`flex-1 flex flex-col transition-all duration-300 ${sidebarCollapsed ? 'ml-16' : 'ml-64'}`}>
              {/* Top Header */}
              <div className="bg-gradient-to-r from-gray-800 to-gray-900 shadow-lg border-b border-gray-700 p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl flex items-center justify-center shadow-lg">
                      <span className="text-white text-lg">
                        {activeSection === 'incident-report' && '📑'}
                        {activeSection === 'evidence-upload' && '📎'}
                        {activeSection === 'evidence-library' && '📁'}
                        {activeSection === 'ml-analysis-history' && '🤖'}
                        {activeSection === 'contact-police' && '👮'}
                      </span>
                </div>
                <div>
                      <h2 className="text-2xl font-bold text-white">
                        {activeSection === 'incident-report' && 'Incident Report'}
                        {activeSection === 'evidence-upload' && 'Evidence Upload'}
                        {activeSection === 'evidence-library' && 'Evidence Library'}
                        {activeSection === 'ml-analysis-history' && 'AI Analysis History'}
                        {activeSection === 'contact-police' && 'Contact Police'}
                  </h2>
                      <p className="text-gray-300 text-sm">
                        {activeSection === 'incident-report' && 'Report and analyze suspicious activities'}
                        {activeSection === 'evidence-upload' && 'Upload files with blockchain verification'}
                        {activeSection === 'evidence-library' && 'View and manage all evidence files'}
                        {activeSection === 'ml-analysis-history' && 'View your AI analysis results and history'}
                        {activeSection === 'contact-police' && 'Submit cases to law enforcement'}
                      </p>
                </div>
              </div>

                  {/* User Info & Actions */}
                  <div className="flex items-center space-x-4">
                    {/* Public Risk Checker Button */}
                    <Link 
                      to="/public" 
                      className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white text-sm font-semibold rounded-lg shadow-lg transition-all duration-200 transform hover:scale-105 hover:shadow-xl"
                    >
                      <span className="mr-2">🔎</span>
                      <span>Public Risk Checker</span>
                    </Link>
                    
                    {/* User Info */}
                    <div className="flex items-center space-x-3">
                      <div className="text-right">
                        <p className="text-white text-sm font-medium">{user?.email}</p>
                        <p className="text-gray-400 text-xs capitalize">{user?.role}</p>
                      </div>
                      <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center shadow-lg">
                        <span className="text-white text-sm font-bold">
                          {user?.email?.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Content Area */}
              <div className="flex-1 overflow-y-auto bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 relative">
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-5">
                  <div className="absolute inset-0" style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                  }}></div>
                </div>
                
                {/* Content */}
                <div className="relative z-10 p-6">
                  <div className="max-w-7xl mx-auto">
              <div className="space-y-8">
                    {/* Incident Report Section */}
                    {activeSection === 'incident-report' && (
                      <div className="max-w-4xl mx-auto">

                        {/* Main Form Card */}
                        <div className="bg-gray-800/90 backdrop-blur-sm rounded-3xl shadow-2xl border border-gray-700/50 overflow-hidden">
                          {/* Card Header */}
                          <div className="bg-gradient-to-r from-purple-600/20 to-blue-600/20 px-8 py-6 border-b border-gray-700/50">
                            <div className="flex items-center space-x-4">
                              <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl flex items-center justify-center shadow-lg">
                                <span className="text-white text-xl">📄</span>
                              </div>
                  <div>
                                <p className="text-gray-300">Enter a suspicious wallet address and describe what happened. Our AI will analyze the wallet and provide a detailed report on potential fraud or criminal activity.</p>
                              </div>
                    </div>
                  </div>

                          {/* Form Content */}
                          <div className="p-8 space-y-8">
                            {/* Wallet Address Field */}
                            <div className="space-y-3">
                              <label className="flex items-center space-x-2 text-sm font-semibold text-gray-300">
                                <span className="text-purple-400">🔗</span>
                                <span>Wallet ID</span>
                              </label>
                              <input
                                type="text"
                                value={wallet}
                                onChange={(e) => setWallet(e.target.value)}
                                placeholder="Enter wallet address"
                                className="w-full px-4 py-4 bg-gray-700/50 border border-gray-600/50 rounded-2xl focus:ring-2 focus:ring-purple-400/20 focus:border-purple-400 transition-all duration-200 text-white placeholder-gray-400 font-medium"
                              />
                            </div>

                            {/* Reason for Reporting Field */}
                            <div className="space-y-3">
                              <label className="flex items-center space-x-2 text-sm font-semibold text-gray-300">
                                <span className="text-purple-400">📝</span>
                                <span>Reason for Reporting</span>
                    </label>
                    <div className="relative">
                      <textarea
                                  className="w-full px-4 py-4 border border-gray-600/50 rounded-2xl focus:ring-2 focus:ring-purple-400/20 focus:border-purple-400 transition-all duration-200 resize-none bg-gray-700/50 text-white placeholder-gray-400 font-medium"
                        placeholder="Describe the suspicious activity in detail..."
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                                  rows={6}
                      />
                                <div className="absolute bottom-3 right-3 text-gray-400 text-xs bg-gray-800/80 px-2 py-1 rounded">
                        {reason.length}/500
                      </div>
                    </div>
                  </div>

                            {/* Submit Button */}
                            <div className="pt-4">
                    <button 
                      onClick={submitReport} 
                                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold py-4 px-6 rounded-2xl transition-all duration-200 transform hover:scale-[1.02] hover:shadow-lg shadow-md disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center space-x-3"
                      disabled={!wallet || !reason.trim() || submittingReport}
                    >
                                <span className="text-lg">🚨</span>
                        <span>{submittingReport ? 'Analyzing...' : 'Submit Report & Analyze with AI'}</span>
                                <span className="text-lg">🤖</span>
                    </button>
                      </div>
                  </div>
                        </div>

                        {/* Fraud Analysis Results */}
                        {fraudAnalysisResult && (
                          <div className="mt-8 bg-gray-800/90 backdrop-blur-sm rounded-3xl shadow-2xl border border-gray-700/50 overflow-hidden">
                            <div className="bg-gradient-to-r from-red-600/20 to-orange-600/20 px-8 py-6 border-b border-gray-700/50">
                              <div className="flex items-center space-x-4">
                                <div className="w-12 h-12 bg-gradient-to-r from-red-500 to-orange-500 rounded-xl flex items-center justify-center shadow-lg">
                                  <span className="text-white text-xl">🤖</span>
                                </div>
                                <div>
                                  <h3 className="text-xl font-bold text-white">AI Fraud Analysis Results</h3>
                                  <p className="text-gray-300 text-sm">Analysis completed for wallet: {submittedWallet}</p>
                                </div>
                              </div>
                            </div>
                            
                            <div className="p-8 space-y-6">
                              {/* Risk Level */}
                              <div className="flex items-center justify-between p-4 bg-gray-700/50 rounded-2xl">
                                <div className="flex items-center space-x-3">
                                  <span className="text-2xl">
                                    {fraudAnalysisResult.riskLevel === 'HIGH' ? '🔴' : 
                                     fraudAnalysisResult.riskLevel === 'MEDIUM' ? '🟡' : '🟢'}
                                  </span>
                                  <div>
                                    <div className="text-white font-semibold">Risk Level</div>
                                    <div className="text-gray-300 text-sm">Overall assessment</div>
                                  </div>
                                </div>
                                <div className={`px-4 py-2 rounded-full font-bold ${
                                  fraudAnalysisResult.riskLevel === 'HIGH' ? 'bg-red-500/20 text-red-400' :
                                  fraudAnalysisResult.riskLevel === 'MEDIUM' ? 'bg-yellow-500/20 text-yellow-400' :
                                  'bg-green-500/20 text-green-400'
                                }`}>
                                  {fraudAnalysisResult.riskLevel}
                                </div>
                              </div>

                              {/* Analysis Metrics */}
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="p-4 bg-gray-700/50 rounded-2xl text-center">
                                  <div className="text-2xl font-bold text-white">
                                    {fraudAnalysisResult.fraudProbability ? (fraudAnalysisResult.fraudProbability * 100).toFixed(1) : 0}%
                                  </div>
                                  <div className="text-gray-300 text-sm">Fraud Probability</div>
                                </div>
                                <div className="p-4 bg-gray-700/50 rounded-2xl text-center">
                                  <div className="text-2xl font-bold text-white">
                                    {fraudAnalysisResult.suspiciousTransactions?.length || 0}
                                  </div>
                                  <div className="text-gray-300 text-sm">Suspicious Transactions</div>
                                </div>
                                <div className="p-4 bg-gray-700/50 rounded-2xl text-center">
                                  <div className="text-2xl font-bold text-white">
                                    {fraudAnalysisResult.suspiciousAddresses?.length || 0}
                                  </div>
                                  <div className="text-gray-300 text-sm">Suspicious Addresses</div>
                                </div>
                              </div>

                              {/* Suspicious Addresses */}
                              {fraudAnalysisResult.suspiciousAddresses && fraudAnalysisResult.suspiciousAddresses.length > 0 && (
                                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl">
                                  <h4 className="text-red-400 font-semibold mb-3">🚨 Suspicious Addresses Detected</h4>
                                  <div className="space-y-2">
                                    {fraudAnalysisResult.suspiciousAddresses.slice(0, 5).map((address, index) => (
                                      <div key={index} className="text-sm text-gray-300 font-mono bg-gray-800/50 p-2 rounded">
                                        {address}
                                      </div>
                                    ))}
                                    {fraudAnalysisResult.suspiciousAddresses.length > 5 && (
                                      <div className="text-gray-400 text-sm">
                                        ... and {fraudAnalysisResult.suspiciousAddresses.length - 5} more
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Incident Report History */}
                        <div className="mt-8 bg-gray-800/90 backdrop-blur-sm rounded-3xl shadow-2xl border border-gray-700/50 overflow-hidden">
                          <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 px-8 py-6 border-b border-gray-700/50">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-4">
                                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center shadow-lg">
                                  <span className="text-white text-xl">📋</span>
                                </div>
                                <div>
                                  <h3 className="text-xl font-bold text-white">Recent Incident Reports</h3>
                                  <p className="text-gray-300 text-sm">Your recent fraud reports and their status</p>
                                </div>
                              </div>
                              <button 
                                onClick={fetchIncidentHistory}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                              >
                                Refresh
                              </button>
                            </div>
                          </div>
                          
                          <div className="p-8">
                            {incidentHistoryLoading ? (
                              <div className="text-center py-8">
                                <div className="text-gray-400">Loading incident history...</div>
                              </div>
                            ) : incidentHistory.length === 0 ? (
                              <div className="text-center py-8">
                                <div className="text-gray-400">No incident reports found</div>
                              </div>
                            ) : (
                              <div className="space-y-4">
                                {incidentHistory.map((report) => (
                                  <div key={report._id} className="p-4 bg-gray-700/50 rounded-2xl border border-gray-600/50">
                                    <div className="flex items-center justify-between mb-3">
                                      <div className="flex items-center space-x-3">
                                        <span className="text-lg">
                                          {report.fraudAnalysis?.riskLevel === 'HIGH' ? '🔴' : 
                                           report.fraudAnalysis?.riskLevel === 'MEDIUM' ? '🟡' : '🟢'}
                                        </span>
                                        <div>
                                          <div className="text-white font-semibold">
                                            {report.walletAddress?.slice(0, 6)}...{report.walletAddress?.slice(-4)}
                                          </div>
                                          <div className="text-gray-400 text-sm">{report.reason}</div>
                                        </div>
                                      </div>
                                      <div className="flex items-center space-x-2">
                                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                          report.status === 'PENDING' ? 'bg-yellow-500/20 text-yellow-400' :
                                          report.status === 'UNDER_REVIEW' ? 'bg-blue-500/20 text-blue-400' :
                                          report.status === 'INVESTIGATING' ? 'bg-orange-500/20 text-orange-400' :
                                          report.status === 'RESOLVED' ? 'bg-green-500/20 text-green-400' :
                                          'bg-gray-500/20 text-gray-400'
                                        }`}>
                                          {report.status}
                                        </span>
                                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                          report.priority === 'HIGH' ? 'bg-red-500/20 text-red-400' :
                                          report.priority === 'MEDIUM' ? 'bg-yellow-500/20 text-yellow-400' :
                                          'bg-green-500/20 text-green-400'
                                        }`}>
                                          {report.priority}
                                        </span>
                                      </div>
                                    </div>
                                    <div className="text-gray-400 text-sm">
                                      Submitted: {new Date(report.createdAt).toLocaleDateString()}
                                      {report.fraudAnalysis?.riskLevel && (
                                        <span className="ml-4">
                                          Risk: {report.fraudAnalysis.riskLevel}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                  </div>
                        </div>
                      </div>
                    )}

                    {/* Evidence Upload Section */}
                    {activeSection === 'evidence-upload' && (
                      <div className="max-w-4xl mx-auto">

                        {/* Main Form Card */}
                        <div className="bg-gray-800/90 backdrop-blur-sm rounded-3xl shadow-2xl border border-gray-700/50 overflow-hidden">
                          {/* Card Header */}
                          <div className="bg-gradient-to-r from-green-600/20 to-blue-600/20 px-8 py-6 border-b border-gray-700/50">
                            <div className="flex items-center space-x-4">
                              <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-blue-500 rounded-xl flex items-center justify-center shadow-lg">
                                <span className="text-white text-xl">📎</span>
                        </div>
                        <div>
                                <div className="text-gray-300 text-sm space-y-1">
                                  <div>• Upload evidence linked to your assigned cases</div>
                                  <div>• Add descriptions or notes for each file to provide context</div>
                                  <div>• Every file is securely stored with a hash and timestamp to ensure authenticity</div>
                                </div>
                        </div>
                      </div>
                  </div>

                          {/* Form Content */}
                          <div className="p-8 space-y-8">
                            {/* Wallet ID Field */}
                            <div className="space-y-3">
                              <label className="flex items-center space-x-2 text-sm font-semibold text-gray-300">
                                <span className="text-gray-400">🔗</span>
                                <span>Wallet ID</span>
                              </label>
                              <input
                                type="text"
                                value={evidenceWallet}
                                onChange={(e) => setEvidenceWallet(e.target.value)}
                                placeholder="Enter wallet address"
                                className="w-full px-4 py-4 border border-gray-600/50 rounded-2xl focus:ring-2 focus:ring-green-400/20 focus:border-green-400 transition-all duration-200 bg-gray-700/50 text-white placeholder-gray-400 font-medium"
                              />
                            </div>

                            {/* Description Field */}
                            <div className="space-y-3">
                              <label className="flex items-center space-x-2 text-sm font-semibold text-gray-300">
                                <span className="text-green-400">📝</span>
                                <span>Description / Notes</span>
                              </label>
                              <textarea
                                value={evidenceDescription}
                                onChange={(e) => setEvidenceDescription(e.target.value)}
                                rows={4}
                                placeholder="Describe the evidence..."
                                className="w-full px-4 py-4 border border-gray-600/50 rounded-2xl focus:ring-2 focus:ring-green-400/20 focus:border-green-400 transition-all duration-200 resize-none bg-gray-700/50 text-white placeholder-gray-400 font-medium"
                              />
                          </div>

                            {/* File Upload Area */}
                            <div className="space-y-3">
                              <label className="flex items-center space-x-2 text-sm font-semibold text-gray-300">
                                <span className="text-green-400">📁</span>
                                <span>File Upload</span>
                              </label>
                              <div 
                                className="w-full px-6 py-12 border-2 border-dashed border-gray-600/50 rounded-2xl text-center transition-all duration-200 hover:border-green-400 hover:bg-green-400/10 cursor-pointer bg-gray-700/30"
                                onDrop={handleEvidenceFileDrop}
                                onDragOver={handleEvidenceFileDragOver}
                                onClick={() => document.getElementById('evidence-file-input').click()}
                              >
                                {evidenceFiles.length > 0 ? (
                                  <div className="space-y-4">
                                    <div className="text-green-400 text-4xl">✅</div>
                                    <div className="text-gray-300 font-medium mb-3">
                                      {evidenceFiles.length} file(s) selected
                                    </div>
                                    <div className="max-h-32 overflow-y-auto space-y-2">
                                      {evidenceFiles.map((file, index) => (
                                        <div key={index} className="flex items-center justify-between bg-gray-800/50 rounded-lg p-2">
                                          <div className="flex items-center space-x-2">
                                            <span className="text-gray-400">📄</span>
                                            <div className="text-left">
                                              <div className="text-gray-300 text-sm font-medium">{file.name}</div>
                                              <div className="text-xs text-gray-400">{(file.size / 1024 / 1024).toFixed(2)} MB</div>
                                            </div>
                                          </div>
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              removeEvidenceFile(index);
                                            }}
                                            className="text-red-400 hover:text-red-300 text-sm px-2 py-1 rounded hover:bg-red-500/20"
                                          >
                                            ✕
                                          </button>
                                        </div>
                                      ))}
                                    </div>
                                    <div className="flex space-x-2 justify-center">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          document.getElementById('evidence-file-input').click();
                                        }}
                                        className="text-blue-400 hover:text-blue-300 text-sm underline"
                                      >
                                        Add more files
                                      </button>
                                      <span className="text-gray-500">|</span>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          clearAllEvidenceFiles();
                                        }}
                                        className="text-red-400 hover:text-red-300 text-sm underline"
                                      >
                                        Clear all
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <div>
                                <div className="text-4xl mb-4 text-gray-400">📁</div>
                                <div className="text-gray-300 font-medium mb-2">Drop files here or click to upload</div>
                                    <div className="text-sm text-gray-400">Any file type supported (Max 50MB per file)</div>
                                    <div className="text-xs text-gray-500 mt-2">You can upload multiple files at once</div>
                                  </div>
                                )}
                                <input
                                  id="evidence-file-input"
                                  type="file"
                                  onChange={handleEvidenceFileSelect}
                                  className="hidden"
                                  multiple
                                  accept="*/*"
                                />
                              </div>
                            </div>

                            {/* Additional Fields */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div className="space-y-3">
                                <label className="flex items-center space-x-2 text-sm font-semibold text-gray-300">
                                  <span className="text-green-400">🏷️</span>
                                  <span>Tags (comma-separated)</span>
                                </label>
                                <input
                                  type="text"
                                  value={evidenceTags}
                                  onChange={(e) => setEvidenceTags(e.target.value)}
                                  placeholder="fraud, suspicious, transaction"
                                  className="w-full px-4 py-3 border border-gray-600/50 rounded-2xl focus:ring-2 focus:ring-green-400/20 focus:border-green-400 transition-all duration-200 bg-gray-700/50 text-white placeholder-gray-400 font-medium"
                                />
                              </div>
                              <div className="space-y-3">
                                <label className="flex items-center space-x-2 text-sm font-semibold text-gray-300">
                                  <span className="text-green-400">⚠️</span>
                                  <span>Risk Level</span>
                                </label>
                                <select
                                  value={evidenceRiskLevel}
                                  onChange={(e) => setEvidenceRiskLevel(e.target.value)}
                                  className="w-full px-4 py-3 border border-gray-600/50 rounded-2xl focus:ring-2 focus:ring-green-400/20 focus:border-green-400 transition-all duration-200 bg-gray-700/50 text-white font-medium"
                                >
                                  <option value="low">Low Risk</option>
                                  <option value="medium">Medium Risk</option>
                                  <option value="high">High Risk</option>
                                </select>
                          </div>
                          </div>

                            {/* Upload Button */}
                            <div className="pt-4">
                              <button 
                                onClick={uploadEvidence}
                                disabled={evidenceFiles.length === 0 || !evidenceWallet || evidenceUploading}
                                className="w-full bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white font-semibold py-4 px-6 rounded-2xl transition-all duration-200 transform hover:scale-[1.02] hover:shadow-lg shadow-md flex items-center justify-center space-x-3 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                              >
                                <span className="text-lg">{evidenceUploading ? '🔄' : '📤'}</span>
                                <span>{evidenceUploading ? `Uploading ${evidenceFiles.length} file(s)...` : `Upload ${evidenceFiles.length} File(s)`}</span>
                              </button>
                                </div>

                            {/* Upload Result */}
                            {evidenceUploadResult && (
                              <div className="mt-6 p-6 bg-green-500/10 border border-green-500/20 rounded-2xl">
                                <div className="flex items-center space-x-3 mb-4">
                                  <span className="text-2xl">✅</span>
                                  <h3 className="text-lg font-semibold text-green-400">{evidenceUploadResult.message}</h3>
                                </div>
                                {evidenceUploadResult.results && evidenceUploadResult.results.length > 0 && (
                                  <div className="space-y-3">
                                    <div className="text-sm text-gray-400">Uploaded Files:</div>
                                    {evidenceUploadResult.results.map((result, index) => (
                                      <div key={index} className="p-3 bg-gray-800/50 rounded-lg">
                                        <div className="text-sm text-gray-300 mb-2">
                                          <span className="text-gray-400">File {index + 1}:</span> {result.evidence?.filename || 'Unknown'}
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                                          <div><span className="text-gray-400">File Hash:</span> <span className="font-mono text-green-400">{result.evidence?.fileHash?.slice(0, 16)}...</span></div>
                                          <div><span className="text-gray-400">IPFS Hash:</span> <span className="font-mono text-blue-400">{result.evidence?.ipfsHash?.slice(0, 16)}...</span></div>
                                          <div><span className="text-gray-400">Storage:</span> <span className="text-yellow-400">{result.evidence?.redundancyCount || 0} copies</span></div>
                                          <div><span className="text-gray-400">Blockchain:</span> <span className="font-mono text-purple-400">{result.evidence?.blockchainTxHash?.slice(0, 16)}...</span></div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                              </div>
                    </div>
                  )}

                    {/* Evidence Library Section */}
                    {activeSection === 'evidence-library' && (
                      <div className="max-w-7xl mx-auto">
                        {/* Main Content Card */}
                        <div className="bg-gray-800/90 backdrop-blur-sm rounded-3xl shadow-2xl border border-gray-700/50 overflow-hidden">
                          {/* Card Header */}
                          <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 px-8 py-6 border-b border-gray-700/50">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-4">
                                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center shadow-lg">
                                  <span className="text-white text-xl">📁</span>
                        </div>
                        <div>
                                  <div className="text-gray-300 text-sm space-y-1">
                                    <div>• View and download all uploaded evidence files</div>
                                    <div>• Track the status of all evidence in the system</div>
                                    <div>• See ML analysis results for all cases</div>
                                    <div>• Maintain a clear audit trail of all actions</div>
                                    <div>• Access comprehensive evidence management</div>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center space-x-3">
                                <div className="bg-yellow-500/20 text-yellow-400 px-3 py-1 rounded-full text-sm font-medium flex items-center space-x-2 border border-yellow-500/30">
                                  <span>🔒</span>
                                  <span>View Only</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Content */}
                          <div className="p-8">
                            <EvidenceLibrary 
                              userRole={user?.role || user?.user_metadata?.role || 'investigator'} 
                              userEmail={user?.email} 
                              refreshTrigger={evidenceLibraryRefreshTrigger} 
                            />
                        </div>
                      </div>
                    </div>
                  )}

                    {/* ML Analysis History Section */}
                    {activeSection === 'ml-analysis-history' && (
                      <div className="max-w-7xl mx-auto">
                        {/* Main Content Card */}
                        <div className="bg-gray-800/90 backdrop-blur-sm rounded-3xl shadow-2xl border border-gray-700/50 overflow-hidden">
                          {/* Card Header */}
                          <div className="bg-gradient-to-r from-purple-600/20 to-blue-600/20 px-8 py-6 border-b border-gray-700/50">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-4">
                                <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl flex items-center justify-center shadow-lg">
                                  <span className="text-white text-xl">🤖</span>
                        </div>
                        <div>
                                  <div className="text-gray-300 text-sm space-y-1">
                                    <div>• View your AI analysis results and history</div>
                                    <div>• Track risk scores and suspicious patterns</div>
                                    <div>• Access detailed ML analysis reports</div>
                                    <div>• Monitor case progression over time</div>
                        </div>
                      </div>
                        </div>
                              <div className="flex items-center space-x-3">
                                <button 
                                  onClick={fetchMlAnalysisHistory}
                                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                                >
                                  Refresh
                                </button>
                                <div className="bg-purple-500/20 text-purple-400 px-3 py-1 rounded-full text-sm font-medium flex items-center space-x-2 border border-purple-500/30">
                                  <span>🔒</span>
                                  <span>{user?.role === 'admin' ? 'All Analysis' : 'Your Analysis Only'}</span>
                            </div>
                            </div>
                          </div>
                          </div>

                          {/* Analysis History Table */}
                          <div className="p-8">
                            <div className="bg-gray-700/50 rounded-2xl border border-gray-600/50 overflow-hidden">
                              {/* Table Header */}
                              <div className="bg-gray-600/30 border-b border-gray-600/50 px-6 py-4">
                                <div className="flex items-center justify-between">
                                  <h3 className="text-lg font-semibold text-white">🤖 AI Analysis History</h3>
                                  <div className="text-sm text-gray-300">
                                    {mlAnalysisHistory.length} analysis records
                                  </div>
                                </div>
                          </div>

                              <div className="overflow-x-auto">
                                <table className="min-w-full">
                                  <thead className="bg-gray-600/30">
                                    <tr>
                                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Wallet/Case</th>
                                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Risk Score</th>
                                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">ML Tags</th>
                                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Analysis Details</th>
                                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Date & Time</th>
                                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Actions</th>
                                    </tr>
                                  </thead>
                                  <tbody className="bg-gray-600/20 divide-y divide-gray-600/30">
                                    {mlAnalysisLoading ? (
                                      <tr>
                                        <td colSpan="6" className="px-6 py-8 text-center text-gray-400">
                                          Loading ML analysis history...
                                        </td>
                                      </tr>
                                    ) : mlAnalysisHistory.length === 0 ? (
                                      <tr>
                                        <td colSpan="6" className="px-6 py-8 text-center text-gray-400">
                                          No ML analysis history found. Submit incident reports to generate AI analysis.
                                        </td>
                                      </tr>
                                    ) : (
                                      mlAnalysisHistory.map((analysis) => (
                                        <tr key={analysis._id} className="hover:bg-gray-600/30 transition-colors duration-200">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                          <div className="text-sm">
                                            <div className="font-mono text-xs px-2 py-1 rounded bg-gray-500/30 text-white mb-1">
                                                {analysis.walletAddress?.slice(0, 6)}...{analysis.walletAddress?.slice(-4)}
                                </div>
                                              <div className="text-xs text-gray-400">
                                                {analysis.incidentReportId?.reason || 'Direct Analysis'}
                                              </div>
                                </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                          <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
                                              analysis.analysisResults.riskLevel === 'HIGH' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                                              analysis.analysisResults.riskLevel === 'MEDIUM' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                                            'bg-green-500/20 text-green-400 border border-green-500/30'
                                          }`}>
                                              {(analysis.analysisResults.fraudProbability * 100).toFixed(1)}%
                                  </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                          <div className="flex flex-wrap gap-1">
                                              <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded-full border border-blue-500/30">
                                                {analysis.analysisResults.riskLevel}
                                              </span>
                                              {analysis.analysisResults.isSuspicious && (
                                                <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded-full border border-red-500/30">
                                                  Suspicious
                                                </span>
                                              )}
                                              <span className="px-2 py-1 bg-purple-500/20 text-purple-400 text-xs rounded-full border border-purple-500/30">
                                                {analysis.modelInfo.modelType}
                                              </span>
                                </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                                          <div className="space-y-1">
                                              <div>Suspicious Txs: {analysis.analysisResults.suspiciousTransactions?.length || 0}</div>
                                            <div>Suspicious Addresses: {analysis.analysisResults.suspiciousAddresses?.length || 0}</div>
                                            <div>Anomaly Score: {analysis.analysisResults.anomalyScore?.toFixed(3) || 'N/A'}</div>
                                            <div className="flex items-center space-x-1">
                                              <span>Status:</span>
                                              <span className={analysis.analysisResults.isSuspicious ? 'text-red-400' : 'text-green-400'}>
                                                {analysis.analysisResults.isSuspicious ? '⚠️ Suspicious' : '✅ Clean'}
                                  </span>
                                </div>
                              </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-400">
                                          <div>{new Date(analysis.createdAt).toLocaleDateString()}</div>
                                          <div>{new Date(analysis.createdAt).toLocaleTimeString()}</div>
                                          <div className="text-xs text-gray-500">by {analysis.userEmail}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                          <div className="flex space-x-2">
                                            <button 
                                              onClick={() => navigator.clipboard.writeText(analysis.walletAddress)}
                                              className="p-1.5 rounded-md bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all duration-200"
                                              title="Copy Wallet"
                                            >
                                              📋
                                            </button>
                                            <button 
                                              onClick={() => alert('View detailed analysis report')}
                                              className="p-1.5 rounded-md bg-blue-100 text-blue-600 hover:bg-blue-200 transition-all duration-200"
                                              title="View Report"
                                            >
                                              👁️
                                            </button>
                                            <button 
                                              onClick={() => alert('Export analysis data')}
                                              className="p-1.5 rounded-md bg-green-100 text-green-600 hover:bg-green-200 transition-all duration-200"
                                              title="Export"
                                            >
                                              📊
                                            </button>
                            </div>
                                        </td>
                                      </tr>
                                    ))
                                    )}
                                  </tbody>
                                </table>
                            </div>
                          </div>
                        </div>
                        </div>
                    </div>
                  )}

                    {/* Contact Police Section */}
                    {activeSection === 'contact-police' && (
            <div className="max-w-7xl mx-auto">
              <div className="bg-gray-800/90 backdrop-blur-sm rounded-3xl shadow-2xl border border-gray-700/50 overflow-hidden">
                {/* Card Header */}
                <div className="bg-gradient-to-r from-red-600/20 to-orange-600/20 px-8 py-6 border-b border-gray-700/50">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gradient-to-r from-red-500 to-orange-500 rounded-xl flex items-center justify-center shadow-lg">
                      <span className="text-white text-xl">👮</span>
                </div>
                <div>
                      <h2 className="text-2xl font-bold text-white">Contact Law Enforcement</h2>
                      <p className="text-gray-300">Secure communication channel for reporting cybercrime cases</p>
                    </div>
                </div>
              </div>
                
                {/* Form Content */}
                <div className="p-8">
                  <div className="flex gap-8">
                    {/* Main Content */}
                    <div className="flex-1">
                      {/* Progress Steps */}
                      <div className="bg-gray-700/50 rounded-2xl border border-gray-600/50 mb-6 p-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                              contactPoliceStep >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-600 text-gray-300'
                            }`}>
                              1
                  </div>
                            <span className={`text-sm font-medium ${contactPoliceStep >= 1 ? 'text-blue-400' : 'text-gray-400'}`}>
                              Enter Wallet ID
                            </span>
                            <div className={`w-16 h-1 ${contactPoliceStep >= 2 ? 'bg-blue-600' : 'bg-gray-600'}`}></div>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                              contactPoliceStep >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-600 text-gray-300'
                            }`}>
                              2
                  </div>
                            <span className={`text-sm font-medium ${contactPoliceStep >= 2 ? 'text-blue-400' : 'text-gray-400'}`}>
                              Evidence Auto-Attach
                              </span>
                            <div className={`w-16 h-1 ${contactPoliceStep >= 3 ? 'bg-blue-600' : 'bg-gray-600'}`}></div>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                              contactPoliceStep >= 3 ? 'bg-blue-600 text-white' : 'bg-gray-600 text-gray-300'
                            }`}>
                              3
                            </div>
                            <span className={`text-sm font-medium ${contactPoliceStep >= 3 ? 'text-blue-400' : 'text-gray-400'}`}>
                              Police Station
                            </span>
                          </div>
                </div>
              </div>

                      {/* Step 1: Enter Wallet ID */}
                      {contactPoliceStep === 1 && (
                        <div className="bg-gray-700/50 rounded-2xl border border-gray-600/50 p-6">
                          <h2 className="text-xl font-semibold text-white mb-6">Step 1: Enter Wallet ID</h2>
                          
                          <div className="space-y-6">
                            <div>
                              <label className="block text-sm font-medium text-gray-300 mb-2">
                                Wallet Address
                </label>
                              <div className="flex space-x-3">
                <input
                  type="text"
                                  value={contactPoliceWalletId}
                                  onChange={(e) => setContactPoliceWalletId(e.target.value)}
                                  placeholder="0x..."
                                  className="flex-1 px-4 py-3 bg-gray-600/50 border border-gray-600/50 rounded-2xl focus:ring-2 focus:ring-blue-400/20 focus:border-blue-400 transition-all duration-200 text-white placeholder-gray-400 font-mono"
                                />
                <button
                                  onClick={handleContactPoliceWalletLookup}
                                  disabled={contactPoliceLoading || !contactPoliceWalletId.trim()}
                                  className="px-6 py-3 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2"
                                >
                                  {contactPoliceLoading ? (
                                    <>
                                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                      <span>Searching...</span>
                                    </>
                                  ) : (
                                    <>
                                      <span>🔍</span>
                                      <span>Lookup</span>
                                    </>
                                  )}
                </button>
                              </div>
                              <p className="mt-2 text-sm text-gray-400">
                                Enter the wallet address to automatically fetch case details and evidence files.
                            </p>
                          </div>
                          </div>
                        </div>
                      )}

                      {/* Step 2: Evidence Auto-Attach */}
                      {contactPoliceStep >= 2 && contactPoliceCaseDetails && (
                        <div className="bg-gray-700/50 rounded-2xl border border-gray-600/50 p-6">
                          <h2 className="text-xl font-semibold text-white mb-6">Step 2: Evidence Auto-Attached</h2>
                          
                          {/* Case Details */}
                          <div className="mb-6 p-4 bg-blue-500/10 rounded-2xl border border-blue-500/20">
                            <h3 className="text-lg font-semibold text-blue-400 mb-3">Case Details</h3>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <span className="font-medium text-gray-300">Wallet ID:</span>
                                <div className="flex items-center space-x-2 mt-1">
                                  <span className="font-mono text-xs text-gray-400">{contactPoliceCaseDetails.walletId}</span>
                                  <button onClick={() => navigator.clipboard.writeText(contactPoliceCaseDetails.walletId)}>
                                    <span className="text-gray-400 hover:text-gray-300">📋</span>
                  </button>
                                </div>
                              </div>
                              <div>
                                <span className="font-medium text-gray-300">Case ID:</span>
                                <span className="ml-2 text-gray-400">{contactPoliceCaseDetails.caseId}</span>
                              </div>
                              <div>
                                <span className="font-medium text-gray-300">Risk Score:</span>
                                <span className={`ml-2 px-2 py-1 text-xs font-semibold rounded-full ${
                                  contactPoliceCaseDetails.riskScore >= 80 ? 'text-red-400 bg-red-500/20' :
                                  contactPoliceCaseDetails.riskScore >= 60 ? 'text-yellow-400 bg-yellow-500/20' :
                                  'text-green-400 bg-green-500/20'
                                }`}>
                                  {contactPoliceCaseDetails.riskScore}
                            </span>
                              </div>
                              <div>
                                <span className="font-medium text-gray-300">Investigator:</span>
                                <span className="ml-2 text-gray-400">{contactPoliceCaseDetails.investigator}</span>
                              </div>
                            </div>
              </div>

                          {/* Evidence Files */}
                    <div>
                            <h3 className="text-lg font-semibold text-white mb-3">📎 Linked Evidence Files (Auto-Attached)</h3>
                            <div className="space-y-2">
                              {contactPoliceEvidence.map((evidenceItem) => (
                                <div key={evidenceItem.id} className="flex items-center justify-between p-3 border border-gray-600/50 rounded-2xl bg-green-500/10">
                                  <div className="flex items-center space-x-3">
                                    <span className="text-green-400">📄</span>
                                    <div>
                                      <div className="text-sm font-medium text-white">{evidenceItem.fileName}</div>
                                      <div className="text-xs text-gray-400">
                                        {evidenceItem.fileSize} • Uploaded by {evidenceItem.uploadedBy}
                    </div>
                  </div>
                                </div>
                                  <div className="flex items-center space-x-2">
                                    <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full">
                                      Read-Only
                                  </span>
                                    <span className="text-green-400">🔒</span>
                                </div>
                                </div>
                              ))}
                            </div>
                            <p className="mt-2 text-sm text-gray-400">
                              All evidence files are automatically attached and cannot be removed to preserve chain of custody.
                            </p>
                              </div>
                </div>
              )}

                      {/* Step 3: Police Station Selector */}
                      {contactPoliceStep >= 3 && (
                        <div className="bg-gray-700/50 rounded-2xl border border-gray-600/50 p-6">
                          <h2 className="text-xl font-semibold text-white mb-6">Step 3: Police Station Selection</h2>
                          
                          <div className="space-y-6">
                            {/* Station Selection */}
                    <div>
                              <label className="block text-sm font-medium text-gray-300 mb-2">
                                Select Police Station
                              </label>
                              <select
                                value={contactPoliceSelectedStation}
                                onChange={(e) => setContactPoliceSelectedStation(e.target.value)}
                                className="w-full px-3 py-2 bg-gray-600/50 border border-gray-600/50 rounded-2xl focus:ring-2 focus:ring-blue-400/20 focus:border-blue-400 transition-all duration-200 text-white"
                              >
                                <option value="">Choose a police station...</option>
                                {contactPoliceStations.map((station) => (
                                  <option key={station.id} value={station.id}>
                                    {station.name} - {station.region}
                                  </option>
                                ))}
                              </select>
                    </div>

                            {/* Selected Station Details */}
                            {contactPoliceSelectedStation && (() => {
                              const station = contactPoliceStations.find(s => s.id === contactPoliceSelectedStation);
                              return station ? (
                                <div className="p-4 bg-blue-500/10 rounded-2xl border border-blue-500/20">
                                  <h3 className="text-lg font-semibold text-blue-400 mb-2">Selected Station</h3>
                                  <div className="space-y-2 text-sm">
                                    <div><strong className="text-gray-300">Zone/Range/District:</strong> <span className="text-gray-400">{station.name}</span></div>
                                    <div><strong className="text-gray-300">Designation:</strong> <span className="text-gray-400">{station.designation}</span></div>
                                    <div><strong className="text-gray-300">Mobile No.:</strong> <span className="text-gray-400">{station.mobile}</span></div>
                                    <div><strong className="text-gray-300">E-Mail:</strong> <span className="text-gray-400">{station.email}</span></div>
                                    <div><strong className="text-gray-300">Telephone:</strong> <span className="text-gray-400">{station.phone}</span></div>
                                    <div><strong className="text-gray-300">Location:</strong> <span className="text-gray-400">{station.address}</span></div>
                                    <div><strong className="text-gray-300">Specialization:</strong> <span className="text-gray-400">{station.specialization}</span></div>
                  </div>
                        </div>
                              ) : null;
                            })()}
                        </div>
                </div>
              )}

                      {/* Step 4: Secure Report Form */}
                      {contactPoliceStep >= 3 && contactPoliceSelectedStation && (
                        <div className="bg-gray-700/50 rounded-2xl border border-gray-600/50 p-6">
                          <h2 className="text-xl font-semibold text-white mb-6">Step 4: Secure Report Form</h2>
                          
                          {/* Pre-filled Fields */}
                          <div className="grid grid-cols-2 gap-4 mb-6">
                    <div>
                              <label className="block text-sm font-medium text-gray-300 mb-2">Wallet ID</label>
                              <div className="px-3 py-2 bg-gray-600/50 border border-gray-600/50 rounded-2xl text-sm text-gray-400 font-mono">
                                {contactPoliceCaseDetails?.walletId}
                    </div>
                  </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-300 mb-2">Case ID</label>
                              <div className="px-3 py-2 bg-gray-600/50 border border-gray-600/50 rounded-2xl text-sm text-gray-400">
                                {contactPoliceCaseDetails?.caseId}
            </div>
                </div>
                <div>
                              <label className="block text-sm font-medium text-gray-300 mb-2">Risk Score</label>
                              <div className="px-3 py-2 bg-gray-600/50 border border-gray-600/50 rounded-2xl text-sm">
                                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                  contactPoliceCaseDetails?.riskScore >= 80 ? 'text-red-400 bg-red-500/20' :
                                  contactPoliceCaseDetails?.riskScore >= 60 ? 'text-yellow-400 bg-yellow-500/20' :
                                  'text-green-400 bg-green-500/20'
                                }`}>
                                  {contactPoliceCaseDetails?.riskScore}
                                </span>
                </div>
                  </div>
                  <div>
                              <label className="block text-sm font-medium text-gray-300 mb-2">Evidence Count</label>
                              <div className="px-3 py-2 bg-gray-600/50 border border-gray-600/50 rounded-2xl text-sm text-gray-400">
                                {contactPoliceEvidence.length} files
                  </div>
                </div>
              </div>

                          {/* Description Field */}
                          <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                              Description of Incident *
                </label>
                            <textarea
                              value={contactPoliceDescription}
                              onChange={(e) => setContactPoliceDescription(e.target.value)}
                              placeholder="Provide a detailed summary of the incident, suspicious activities, and any relevant information for law enforcement..."
                              rows="4"
                              className="w-full px-3 py-2 bg-gray-600/50 border border-gray-600/50 rounded-2xl focus:ring-2 focus:ring-blue-400/20 focus:border-blue-400 transition-all duration-200 text-white placeholder-gray-400"
                  />
                </div>

                          {/* Notes Field */}
                          <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                              Internal Notes (Optional)
                            </label>
                            <textarea
                              value={contactPoliceNotes}
                              onChange={(e) => setContactPoliceNotes(e.target.value)}
                              placeholder="Add internal notes, investigation context, or additional information for your records..."
                              rows="3"
                              className="w-full px-3 py-2 bg-gray-600/50 border border-gray-600/50 rounded-2xl focus:ring-2 focus:ring-blue-400/20 focus:border-blue-400 transition-all duration-200 text-white placeholder-gray-400"
                            />
            </div>

                          {/* Send Button */}
                          <div className="flex justify-end">
                <button
                              onClick={handleContactPoliceSendReport}
                              disabled={contactPoliceSending || !contactPoliceDescription.trim()}
                              className="flex items-center space-x-2 px-8 py-3 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 disabled:opacity-50"
                            >
                              {contactPoliceSending ? (
                                <>
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                  <span>Sending...</span>
                                </>
                              ) : (
                                <>
                                  <span>📤</span>
                                  <span>Send Securely</span>
                                </>
                              )}
                </button>
                </div>
                </div>
                )}
              </div>

                    {/* Right Side - Report History */}
                    <div className="w-96">
                      <div className="bg-gray-700/50 rounded-2xl border border-gray-600/50 p-6">
                        <div className="flex items-center space-x-2 mb-6">
                          <span className="text-gray-400">📋</span>
                          <h3 className="text-lg font-semibold text-white">Report History</h3>
            </div>

                        <div className="space-y-4 max-h-96 overflow-y-auto">
                          {contactPoliceReportHistory.map((report) => (
                            <div key={report.id} className="border border-gray-600/50 rounded-2xl p-4">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium text-white">{report.caseId}</span>
                                <div className="flex items-center space-x-1">
                                  <span className={`text-xs px-2 py-1 rounded-full ${
                                    report.status === 'Delivered' ? 'bg-green-500/20 text-green-400' :
                                    report.status === 'Pending' ? 'bg-yellow-500/20 text-yellow-400' :
                                    'bg-red-500/20 text-red-400'
                                  }`}>
                                    {report.status}
                                  </span>
                </div>
                </div>
                              
                              <div className="text-xs text-gray-400 mb-2">
                                <div className="flex items-center space-x-1">
                                  <span>🕒</span>
                                  <span>{new Date(report.timestamp).toLocaleString()}</span>
                </div>
              </div>
              
                              <div className="text-xs text-gray-400 mb-2">
                                <div className="flex items-center space-x-1">
                                  <span>🔗</span>
                                  <span>Wallet: {report.walletId}</span>
                </div>
                  </div>
                              
                              <div className="text-xs text-gray-400 mb-2">
                                <div className="flex items-center space-x-1">
                                  <span>🏢</span>
                                  <span>Station: {report.stationName}</span>
                </div>
                        </div>
                              
                              <p className="text-sm text-gray-300 mb-2">{report.description}</p>
                              
                              {report.notes && (
                                <div className="text-xs text-gray-400 mb-2">
                                  <strong>Notes:</strong> {report.notes}
                          </div>
              )}
                              
                              <div className="text-xs text-gray-500">
                                <div className="flex items-center space-x-1 mb-1">
                                  <span>📁</span>
                                  <span>{report.evidenceCount} evidence files</span>
                          </div>
                        </div>

                              <div className="mt-3 pt-3 border-t border-gray-600/30">
                                <button className="flex items-center space-x-1 text-blue-400 hover:text-blue-300 text-xs">
                                  <span>👁️</span>
                                  <span>View Details</span>
                                </button>
                      </div>
                    </div>
                  ))}
                </div>
            </div>
              </div>
                </div>
                  </div>
                </div>
                        </div>
                    )}

                    {/* Enhanced Admin Panel Section */}
                    {isAdmin && (
                      <div className="bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 border-2 border-emerald-200/50 rounded-3xl p-8 shadow-xl backdrop-blur-sm">
                        <div className="flex items-center space-x-4 mb-8">
                          <div className="relative">
                            <div className="w-14 h-14 bg-gradient-to-r from-emerald-500 to-green-600 rounded-2xl flex items-center justify-center shadow-lg">
                              <span className="text-white text-2xl">🛡️</span>
                          </div>
                            <div className="absolute -top-2 -right-2 w-5 h-5 bg-yellow-400 rounded-full animate-pulse"></div>
                </div>
                <div>
                            <h2 className="text-2xl font-bold bg-gradient-to-r from-emerald-800 to-green-700 bg-clip-text text-transparent">
                              Admin Dashboard
                            </h2>
                            <p className="text-sm text-emerald-600 font-semibold">Advanced administrative tools and data management</p>
                </div>
              </div>
                        <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/30">
                          <AdminDownloadTable />
            </div>
          </div>
        )}
        </div>
              </div>
              </div>
            </div>
            </div>
          </div>
        )}
        </div>

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <p className="text-white text-sm font-medium">
              Investigator Control Panel v0.2
            </p>
            <p className="text-gray-300 text-xs mt-1">
                &copy; 2025 ChainSafeGuard | Built with ❤️ by Aryan & Keval
              </p>
          </div>
        </div>
      </footer>
      
      <ToastContainer 
        position="top-right" 
        autoClose={3000} 
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
    </div>
  );
}

export default HomePage;
